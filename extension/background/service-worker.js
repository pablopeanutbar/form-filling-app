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
  try {
    // Attempt pinging content script
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    if (response && response.status === 'PONG') {
      return true;
    }
  } catch {
    // Script not present; inject it via chrome.scripting
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
    return true;
  } catch (err) {
    throw new Error(`Failed to inject content script: ${err.message}`);
  }
};

/**
 * Handle field extraction request for a specific tab
 */
const handleDetectFields = async (tabId) => {
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
  await ensureContentScriptInjected(tabId);

  // 4. Send EXTRACT_FIELDS message to content script
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_FIELDS' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: 'COMMUNICATION_ERROR',
          message: chrome.runtime.lastError.message
        });
        return;
      }
      resolve(response || { success: false, error: 'EMPTY_RESPONSE', message: 'No response from content script.' });
    });
  });
};

function clearReviews() {
  chrome.runtime.sendMessage({ type: 'FORMER_CLEAR_REVIEW' }).catch(() => {});
}

/**
 * Main Extension Message Listener
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || sender.tab || sender.id !== chrome.runtime.id
      || sender.url !== chrome.runtime.getURL('sidepanel/review.html')) return false;
  const accountAction = Object.hasOwn(connectionActions, message.type) ? connectionActions[message.type] : null;
  if (accountAction || message.type === 'ANALYZE_FORM') {
    withConnectionLock(async () => {
      if (accountAction) {
        const status = await accountAction();
        if (status.state !== 'connected') clearReviews();
        return status;
      }
      const tab = await chrome.tabs.get(message.tabId);
      if (!tab.active || tab.windowId !== message.windowId) throw new Error('Switch back to the page you want to analyze.');
      const extracted = await handleDetectFields(message.tabId);
      if (!extracted?.success) throw new Error(extracted?.message || 'This page could not be checked. Try another webpage with a form.');
      if (!extracted.fields?.length) return { ...extracted, results: [] };
      if (extracted.fields.length > 100) throw new Error('This form has more than 100 fields. Please use a smaller form or a single step.');
      return { ...extracted, ...await analyzeFields(extracted.fields) };
    }).then((data) => sendResponse({ success: true, data }))
      .catch((error) => {
        if (error.code === 'CONNECTION_EXPIRED') clearReviews();
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

    chrome.tabs.get(tabId)
      .then((tab) => {
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
