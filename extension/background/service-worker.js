import { connectionActions, withConnectionLock, analyzeFields } from './connection.js';

// The toolbar uses the manifest popup. The panel remains available separately.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error('Could not configure the review panel', error));
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

// Session storage is memory-only and restricted to trusted extension contexts.
const reviewPrefix = 'former-review:';
const reviewKey = (tabId) => reviewPrefix + tabId;
const operations = new Map();
let accountCache;

// The first status request after a worker restart still checks the server.
async function getConnectionStatus() {
  if (accountCache && Date.now() < accountCache.until) return accountCache.status;
  const status = await connectionActions.CONNECTION_STATUS();
  if (status.state !== 'connected') await clearReviews();
  else accountCache = { status, until: Date.now() + 30000 };
  return status;
}

async function readReview(tabId) {
  const key = reviewKey(tabId);
  const review = (await chrome.storage.session.get(key))[key];
  if (review && Date.now() >= review.expiresAt) {
    await chrome.storage.session.remove(key);
    return null;
  }
  return review;
}

async function pruneReviews() {
  const entries = await chrome.storage.session.get(null);
  const expired = Object.entries(entries).filter(([key, review]) =>
    key.startsWith(reviewPrefix) && Date.now() >= review.expiresAt).map(([key]) => key);
  if (expired.length) await chrome.storage.session.remove(expired);
}

withConnectionLock(pruneReviews).catch(() => {});

chrome.tabs.onRemoved.addListener((tabId) => {
  withConnectionLock(() => chrome.storage.session.remove(reviewKey(tabId))).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.url === undefined) return;
  withConnectionLock(async () => {
    // Ignore queued URL updates that have already been superseded.
    const tab = await chrome.tabs.get(tabId);
    const review = await readReview(tabId);
    if (review && review.url !== tab.url) await chrome.storage.session.remove(reviewKey(tabId));
  }).catch(() => {});
});

async function clearReviews() {
  accountCache = undefined;
  const entries = await chrome.storage.session.get(null);
  const keys = Object.keys(entries).filter((key) => key.startsWith(reviewPrefix));
  if (keys.length) await chrome.storage.session.remove(keys);
  chrome.runtime.sendMessage({ type: 'FORMER_CLEAR_REVIEW' }).catch(() => {});
}

async function restoreReview(tab, reviewDocumentId) {
  const review = await readReview(tab.id);
  if (!review?.view || review.windowId !== tab.windowId || review.url !== tab.url) return null;
  if ((await getConnectionStatus()).state !== 'connected') return null;
  const active = await chrome.tabs.get(tab.id);
  if (!active.active || active.windowId !== review.windowId || active.url !== review.url || Date.now() >= review.expiresAt) return null;
  const live = await chrome.tabs.sendMessage(tab.id, { type: 'CHECK_REVIEW', analysisId: review.id }, { documentId: review.documentId })
    .catch(() => null);
  if (!live?.success) {
    await chrome.storage.session.remove(reviewKey(tab.id));
    return null;
  }
  review.panelId = reviewDocumentId;
  await chrome.storage.session.set({ [reviewKey(tab.id)]: review });
  return { view: review.view, fill: review.fill, completed: review.completed, fillUnconfirmed: review.fillUnconfirmed };
}

async function fillReview(tab, message, reviewDocumentId) {
  const review = await readReview(tab.id);
  const stale = () => new Error('This review is stale. Analyze the current form again.');
  if (!review?.allowed || review.id !== message.analysisId || review.panelId !== reviewDocumentId
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
  // Discard the prior report before starting a new fill. An interrupted
  // request must never look like the previous successful operation.
  delete review.fill;
  review.fillUnconfirmed = true;
  await chrome.storage.session.set({ [reviewKey(tab.id)]: review });
  const status = await connectionActions.CONNECTION_STATUS();
  if (status.state !== 'connected') {
    await clearReviews();
    throw new Error('Reconnect your account before filling.');
  }
  accountCache = { status, until: Date.now() + 30000 };
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
  if (Date.now() < review.expiresAt) {
    delete review.fillUnconfirmed;
    review.fill = response.results;
    const completed = new Map(review.completed || []);
    for (const { fieldId, status: outcome } of response.results) {
      if (outcome === 'filled' || outcome === 'already_correct') completed.set(fieldId, outcome);
      else completed.delete(fieldId);
    }
    review.completed = [...completed];
    await chrome.storage.session.set({ [reviewKey(tab.id)]: review }).catch(() => {});
  }
  return response.results;
}

const reviewContexts = new Map([
  [chrome.runtime.getURL('popup/review.html'), 'POPUP'],
  [chrome.runtime.getURL('sidepanel/review.html'), 'SIDE_PANEL']
]);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || sender.tab || sender.id !== chrome.runtime.id) return false;
  const contextType = reviewContexts.get(sender.url);
  if (!contextType) return false;
  if (sender.documentId) return handleReviewMessage(message, sender.documentId, sendResponse);

  // Chrome can omit sender.documentId for extension views outside a tab.
  // Resolve it from a unique browser-reported review context, never the request.
  chrome.runtime.getContexts({ contextTypes: [contextType], documentUrls: [sender.url] })
    .then((contexts) => {
      const documentId = contexts.length === 1 && contexts[0].documentId;
      if (!documentId) throw new Error('Review context unavailable');
      handleReviewMessage(message, documentId, sendResponse);
    })
    .catch(() => sendResponse({ success: false, message: 'Close and reopen formER, then try again.' }));
  return true;
});

function handleReviewMessage(message, reviewDocumentId, sendResponse) {
  const accountAction = Object.hasOwn(connectionActions, message.type) ? connectionActions[message.type] : null;
  if (message.type === 'RESTORE_REVIEW') {
    chrome.tabs.get(message.tabId).then((tab) => {
      if (!tab.active || tab.windowId !== message.windowId) return null;
      const pending = operations.get(tab.id);
      if (pending?.windowId === tab.windowId && (!pending.url || pending.url === tab.url)) return { operation: pending.type };
      return withConnectionLock(() => restoreReview(tab, reviewDocumentId));
    }).then((data) => sendResponse({ success: true, data }), () => sendResponse({ success: false }));
    return true;
  }
  if (accountAction || ['ANALYZE_FORM', 'FILL_FORM'].includes(message.type)) {
    const tabId = message.tabId;
    if (!accountAction && operations.has(tabId)) {
      sendResponse({ success: false, message: 'An action is already in progress on this page.' });
      return false;
    }
    if (!accountAction) operations.set(tabId, { type: message.type, windowId: message.windowId });
    // A popup may disappear while this job is still completing. Keep the
    // worker active only during an accepted operation.
    const heartbeat = !accountAction && setInterval(() => {
      chrome.runtime.getPlatformInfo().catch(() => {});
    }, 20000);
    withConnectionLock(async () => {
      if (accountAction) {
        if (message.type === 'CONNECTION_STATUS') return getConnectionStatus();
        accountCache = undefined;
        const status = await accountAction();
        if (status.state !== 'connected') await clearReviews();
        else accountCache = { status, until: Date.now() + 30000 };
        return status;
      }
      const tab = await chrome.tabs.get(message.tabId);
      if (!tab.active || tab.windowId !== message.windowId) throw new Error('Switch back to the page you want to analyze.');
      operations.get(tab.id).url = tab.url;
      if (message.type === 'FILL_FORM') return fillReview(tab, message, reviewDocumentId);
      const review = {
        id: crypto.randomUUID(), panelId: reviewDocumentId, windowId: tab.windowId,
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
      review.view = {
        fields: extracted.fields.map(({ fieldId, type, label, options, optionsTruncated, constraints }) =>
          ({ fieldId, type, label, options, optionsTruncated, constraints: { multiple: Boolean(constraints?.multiple) } })),
        results: matched.results.map(({ fieldId, status, value, displayValue, reason, source, method }) =>
          ({ fieldId, status, value, displayValue, reason, source, derived: method === 'derived' })),
        analysisId: review.id,
        expiresAt: review.expiresAt
      };
      await chrome.storage.session.set({ [reviewKey(tab.id)]: review });
      setTimeout(() => withConnectionLock(pruneReviews).catch(() => {}), Math.max(0, review.expiresAt - Date.now()))?.unref?.();
      return review.view;
    }).finally(() => {
      if (!accountAction) operations.delete(tabId);
      if (heartbeat) clearInterval(heartbeat);
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
}
