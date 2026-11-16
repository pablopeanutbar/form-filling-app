import { connectionActions, withConnectionLock, analyzeFields } from './connection.js';

// The native toolbar toggle skips Chrome's activeTab grant. The action event
// grants access first and supplies the user gesture needed to open the panel.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error('Could not configure the review panel', error));
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId })
    .catch((error) => console.error('Could not open the review panel', error));
});

/**
 * formER Background Service Worker
 * Manages tab communication, scripts execution, and coordinates future backend API calls.
 */

const RESTRICTED_SCHEMES = [
  'chrome:',
  'chrome-extension:',
  'edge:',
  'about:',
  'devtools:',
  'view-source:',
  'data:'
];

/**
 * Check if a URL is restricted from content script injection
 */
const isRestrictedUrl = (url) => {
  if (!url || typeof url !== 'string') return true;
  return RESTRICTED_SCHEMES.some((scheme) => url.startsWith(scheme));
};

/**
 * Ensure content script is injected in the target tab
 */
const ensureContentScriptInjected = async (tabId) => {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/fill.js', 'content/content.js']
  });
  if (!injection?.documentId) throw new Error('The current form could not be opened.');
  return injection.documentId;
};

/**
 * Handle field extraction request for a specific tab
 */
const handleDetectFields = async (tabId, analysisId) => {
  // 1. Retrieve tab information
  const tab = await chrome.tabs.get(tabId);
  if (!tab || !tab.url) {
    return {
      success: false,
      error: 'PAGE_ACCESS_REQUIRED',
      message: 'Click the formER toolbar icon on this webpage to give formER access.'
    };
  }

  // 2. Check for restricted browser pages
  if (isRestrictedUrl(tab.url)) {
    return {
      success: false,
      error: 'RESTRICTED_PAGE',
      message: 'formER cannot access internal or restricted browser pages (chrome://, about:, extensions).'
    };
  }

  // 3. Ensure content script is available
  const documentId = await ensureContentScriptInjected(tabId);

  // 4. Send EXTRACT_FIELDS message to content script
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_FIELDS', analysisId }, { documentId }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: 'COMMUNICATION_ERROR',
          message: chrome.runtime.lastError.message
        });
        return;
      }
      resolve(response ? { ...response, documentId } : { success: false, error: 'EMPTY_RESPONSE', message: 'No response from content script.' });
    });
  });
};

// Keep only review identity and eligible field IDs across worker suspension.
const reviewPrefix = 'former-review:';
const reviewKey = (tabId) => reviewPrefix + tabId;
chrome.tabs.onRemoved.addListener((tabId) => {
  withConnectionLock(() => chrome.storage.session.remove(reviewKey(tabId))).catch(() => {});
});

async function clearReviews() {
  const entries = await chrome.storage.session.get(null);
  const keys = Object.keys(entries).filter((key) => key.startsWith(reviewPrefix));
  if (keys.length) await chrome.storage.session.remove(keys);
  chrome.runtime.sendMessage({ type: 'FORMER_CLEAR_REVIEW' }).catch(() => {});
}

async function fillReview(tab, message, sender) {
  const key = reviewKey(tab.id);
  const review = (await chrome.storage.session.get(key))[key];
  const stale = () => new Error('This review is stale. Analyze the current form again.');
  if (!review?.allowed || review.id !== message.analysisId || review.panelId !== sender.documentId
      || review.windowId !== tab.windowId || review.url !== tab.url || Date.now() >= review.expiresAt) throw stale();
  const { proposals } = message;
  const ids = new Set();
  const allowed = new Map(review.allowed);
  if (!Array.isArray(proposals) || !proposals.length || proposals.length > 100) throw new Error('Select the answers you want to fill.');
  for (const { fieldId, value, overwrite, approved } of proposals) {
    if (!allowed.has(fieldId) || (message.mode === 'matched' && allowed.get(fieldId) !== 'matched') || ids.has(fieldId) || approved !== true || typeof overwrite !== 'boolean'
        || typeof value !== 'string' || !value.trim() || value.length > 2000) throw new Error('Check the selected answers and try again.');
    ids.add(fieldId);
  }
  const status = await connectionActions.CONNECTION_STATUS();
  if (status.state !== 'connected') {
    await clearReviews();
    throw new Error('Reconnect your account before filling.');
  }
  const current = await chrome.tabs.get(tab.id);
  if (!current.active || current.windowId !== tab.windowId
      || current.url !== review.url || Date.now() >= review.expiresAt) throw stale();
  let response;
  try {
    response = await chrome.tabs.sendMessage(tab.id, { type: 'FILL_FIELDS', analysisId: review.id, proposals }, { documentId: review.documentId });
  } catch {
    throw stale();
  }
  if (!response?.success) throw new Error(response?.message || 'Check the page before trying again.');
  return response.results;
}

/**
 * Main Extension Message Listener
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || sender.tab || sender.id !== chrome.runtime.id
      || sender.url !== chrome.runtime.getURL('sidepanel/review.html')) return false;
  const accountAction = Object.hasOwn(connectionActions, message.type) ? connectionActions[message.type] : null;
  if (accountAction || ['ANALYZE_FORM', 'FILL_FORM'].includes(message.type)) {
    withConnectionLock(async () => {
      if (accountAction) {
        const status = await accountAction();
        if (status.state !== 'connected') await clearReviews();
        return status;
      }
      const tab = await chrome.tabs.get(message.tabId);
      if (!tab.active || tab.windowId !== message.windowId) throw new Error('Switch back to the page you want to analyze.');
      if (message.type === 'FILL_FORM') return fillReview(tab, message, sender);
      const review = {
        id: crypto.randomUUID(), panelId: sender.documentId, windowId: tab.windowId,
        url: tab.url, expiresAt: Date.now() + 5 * 60 * 1000
      };
      await chrome.storage.session.remove(reviewKey(tab.id));
      const extracted = await handleDetectFields(tab.id, review.id);
      if (!extracted?.success) throw new Error(extracted?.message || 'This page could not be checked. Try another webpage with a form.');
      if (!extracted.fields?.length) return { ...extracted, results: [] };
      if (extracted.fields.length > 100) throw new Error('This form has more than 100 fields. Please use a smaller form or a single step.');
      const matched = await analyzeFields(extracted.fields).catch(async (error) => {
        if (error.code === 'CONNECTION_EXPIRED') await clearReviews();
        throw error;
      });
      const current = await chrome.tabs.get(tab.id);
      if (!current.active || current.url !== review.url) throw new Error('The page changed. Analyze the form again.');
      review.documentId = extracted.documentId;
      review.allowed = matched.results.filter((result) =>
        ['matched', 'needs_review'].includes(result.status) && result.value != null)
        .map(({ fieldId, status }) => [fieldId, status]);
      const live = await chrome.tabs.sendMessage(tab.id, { type: 'CHECK_REVIEW', analysisId: review.id }, { documentId: review.documentId });
      if (!live?.success) throw new Error('The page changed. Analyze the form again.');
      await chrome.storage.session.set({ [reviewKey(tab.id)]: review });
      return { fields: extracted.fields, ...matched, analysisId: review.id, expiresAt: review.expiresAt };
    }).then((data) => sendResponse({ success: true, data }))
      .catch((error) => {
        sendResponse({ success: false, error: error.code || 'REQUEST_FAILED', message: error.message || 'Please try again.' });
      });
    return true;
  }
  if (message.type === 'DETECT_FIELDS') {
    const tabId = message.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: 'MISSING_TAB_ID', message: 'No tabId provided.' });
      return true;
    }

    withConnectionLock(async () => {
        const tab = await chrome.tabs.get(tabId);
        if (!tab.active || tab.windowId !== message.windowId) throw new Error('Switch back to the page you want to check.');
        return handleDetectFields(tabId);
      })
      .then((result) => sendResponse(result))
      .catch((err) => {
        sendResponse({
          success: false,
          error: 'EXECUTION_ERROR',
          message: err.message
        });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'PING') {
    sendResponse({ status: 'PONG' });
    return false;
  }
});
