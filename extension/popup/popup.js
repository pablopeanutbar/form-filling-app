import { WEBSITE_URL } from '../config.js';

// Presentation only: detection still uses the existing service-worker contract.
document.addEventListener('DOMContentLoaded', () => {
  const elements = Object.fromEntries([
    'pageStatusBadge', 'pageTitle', 'pageDomain', 'introTitle', 'introDescription',
    'detectBtn', 'btnText', 'btnSpinner', 'buttonIcon', 'announcement', 'loadingPanel',
    'noticePanel', 'noticeTitle', 'noticeMessage', 'errorContainer', 'errorMessage',
    'resultsContainer', 'resultsTitle', 'excludedNote', 'connectionTitle', 'connectionDescription',
    'pairingCode', 'connectionError', 'connectBtn', 'disconnectBtn'
  ].map((id) => [id, document.getElementById(id)]));
  let busy = false;
  let reviewTabId;
  let connection = { state: 'disconnected' };
  let accountBusy = false;
  let pollTimer;
  const connected = () => connection.state === 'connected';

  function renderConnection(status) {
    const changed = connection.state !== status.state || connection.account?.id !== status.account?.id;
    connection = status;
    clearTimeout(pollTimer);
    elements.connectionTitle.textContent = connected() ? 'Account connected' : status.state === 'pending' ? 'Waiting for your approval' : 'Account not connected';
    elements.connectionDescription.textContent = connected() ? status.account.email : status.state === 'pending'
      ? 'Check that this code matches the website, then approve. Return here to finish connecting.'
      : status.message || 'Connect to get suggestions from your saved information. Nothing will be filled in automatically.';
    elements.pairingCode.hidden = status.state !== 'pending';
    elements.pairingCode.textContent = status.verificationCode || '';
    elements.connectBtn.hidden = connected();
    elements.connectBtn.textContent = status.state === 'pending' ? 'Open approval page' : 'Connect account';
    elements.connectBtn.disabled = false;
    elements.disconnectBtn.hidden = !connected() && status.state !== 'pending';
    elements.disconnectBtn.textContent = status.state === 'pending' ? 'Cancel connection' : 'Disconnect';
    if (changed) {
      elements.resultsContainer.hidden = true;
      if (!['unsupported', 'checking'].includes(document.body.dataset.state)) setState('ready', 'Ready to check');
    }
    if (!busy) elements.btnText.textContent = connected() ? 'Review form' : 'Detect fields';
    if (status.state === 'pending') pollTimer = setTimeout(() => accountAction('CONNECTION_STATUS'), 3200);
  }

  async function accountAction(type) {
    if (accountBusy || busy) { pollTimer = setTimeout(() => accountAction('CONNECTION_STATUS'), 3200); return; }
    accountBusy = true;
    elements.connectBtn.disabled = true; elements.disconnectBtn.disabled = true;
    elements.connectionError.hidden = true;
    try {
      const result = await chrome.runtime.sendMessage({ type });
      if (!result?.success) throw new Error(result?.message || 'The connection could not be checked. Please try again.');
      renderConnection(result.data);
    } catch (error) {
      elements.connectionError.textContent = error.message || 'Please try connecting again.';
      elements.connectionError.hidden = false;
      if (connection.state === 'pending') pollTimer = setTimeout(() => accountAction('CONNECTION_STATUS'), 5000);
    } finally { accountBusy = false; elements.connectBtn.disabled = false; elements.disconnectBtn.disabled = false; }
  }
  elements.connectBtn.addEventListener('click', () => accountAction('CONNECT_ACCOUNT'));
  elements.disconnectBtn.addEventListener('click', () => accountAction('DISCONNECT_ACCOUNT'));
  window.addEventListener('pagehide', () => clearTimeout(pollTimer));

  document.querySelectorAll('[data-website-path]').forEach((link) => {
    link.href = new URL(link.dataset.websitePath, WEBSITE_URL).href;
  });

  const text = (value) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
  const node = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
  };

  function setState(state, status, buttonLabel = 'Detect fields') {
    document.body.dataset.state = state;
    elements.pageStatusBadge.textContent = status;
    elements.btnText.textContent = connected() ? 'Review form' : buttonLabel;
    elements.btnSpinner.hidden = state !== 'scanning';
    elements.buttonIcon.toggleAttribute('hidden', state === 'scanning');
    elements.detectBtn.disabled = ['checking', 'scanning', 'unsupported'].includes(state);
    elements.detectBtn.setAttribute('aria-busy', String(state === 'scanning'));
    elements.loadingPanel.hidden = state !== 'scanning';
    elements.noticePanel.hidden = !['empty', 'unsupported'].includes(state);
    elements.errorContainer.hidden = state !== 'error';
    elements.resultsContainer.hidden = state !== 'results';
    if (!['results', 'empty'].includes(state)) elements.excludedNote.hidden = true;
  }

  function showUnavailable(title, message) {
    elements.noticeTitle.textContent = title;
    elements.noticeMessage.textContent = message;
    elements.introTitle.textContent = 'Let’s find a form.';
    elements.introDescription.textContent = 'Open a webpage with a form, then open formER to check its fields.';
    setState('unsupported', 'Unavailable on this page');
    elements.announcement.textContent = `${title} ${message}`;
  }

  function showError(message) {
    elements.errorMessage.textContent = message;
    setState('error', 'Detection unavailable', 'Try again');
    elements.announcement.textContent = '';
  }

  function describePage(tab) {
    let url;
    try { url = new URL(tab?.url); } catch { return false; }
    elements.pageDomain.textContent = url.protocol === 'file:' ? 'Local file' : url.hostname || 'Browser page';
    elements.pageTitle.textContent = text(tab.title) || 'Current page';
    elements.pageTitle.title = text(tab.title);
    // Known browser-protected destinations; other access failures are handled by detection.
    const storePage = url.hostname === 'chromewebstore.google.com'
      || (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))
      || (url.hostname === 'microsoftedge.microsoft.com' && url.pathname.startsWith('/addons'));
    if (!['http:', 'https:', 'file:'].includes(url.protocol) || storePage) {
      showUnavailable('This page can’t be checked', 'Browser settings, extension stores, and other protected pages don’t allow field detection. Try a regular webpage instead.');
      return false;
    }
    elements.introTitle.textContent = 'Start with the fields.';
    elements.introDescription.textContent = 'Find the form fields on this page. Nothing will be filled in or submitted.';
    return true;
  }

  async function currentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !Number.isInteger(tab.id) || !tab.url) {
      elements.pageDomain.textContent = 'Current page';
      elements.pageTitle.textContent = 'Page unavailable';
      showError('We couldn’t find your active page. Open a webpage and try again.');
      return null;
    }
    if (!describePage(tab)) {
      if (document.body.dataset.state !== 'unsupported') showError('This page couldn’t be identified. Open a webpage and try again.');
      return null;
    }
    return tab;
  }

  function requestDetection(tabId) {
    return new Promise((resolve) => {
      // Bound the pending UI if a tab navigates or the message channel stops responding.
      let finished = false;
      const finish = (result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => finish({ success: false, error: 'TIMEOUT' }), connected() ? 60000 : 15000);
      try {
        chrome.runtime.sendMessage({ type: 'DETECT_FIELDS', tabId }, (response) => {
          const failed = chrome.runtime.lastError;
          finish(failed ? { success: false, error: 'COMMUNICATION_ERROR' } : response?.success && response.data ? { ...response.data, success: true } : response);
        });
      } catch { finish({ success: false, error: 'COMMUNICATION_ERROR' }); }
    });
  }

  function renderResults(data) {
    const fields = data.fields;
    const countLabel = `${fields.length} ${fields.length === 1 ? 'field' : 'fields'} found`;
    elements.resultsTitle.textContent = countLabel;
    const excluded = data.stats?.excludedCount;
    elements.excludedNote.textContent = Number.isInteger(excluded) && excluded > 0
      ? `${excluded} ${excluded === 1 ? 'control was' : 'controls were'} skipped. Hidden, sensitive, or unsupported controls aren’t listed.` : '';
    elements.excludedNote.hidden = !elements.excludedNote.textContent;
    if (fields.length) {
      setState('results', 'Page checked', 'Check again');
    } else {
      elements.noticeTitle.textContent = 'No supported fields found';
      elements.noticeMessage.textContent = 'If the form hasn’t loaded yet, wait a moment and check again. Some forms and embedded fields aren’t supported.';
      setState('empty', 'Page checked', 'Check again');
    }
    elements.announcement.textContent = `${countLabel}. Nothing was filled in or submitted.`;
  }

  elements.detectBtn.addEventListener('click', async () => {
    if (busy || accountBusy) return;
    if (connected()) {
      if (!Number.isInteger(reviewTabId)) return;
      // Call open directly in the click handler to keep Chrome's user activation.
      chrome.sidePanel.open({ tabId: reviewTabId })
        .then(() => window.close())
        .catch(() => showError('The review panel could not open. Reopen formER on the page and try again.'));
      return;
    }
    busy = true;
    elements.connectBtn.disabled = true;
    elements.disconnectBtn.disabled = true;
    setState('scanning', 'Checking fields…', 'Detecting fields…');
    elements.announcement.textContent = 'Looking for form fields.';
    try {
      // Refresh the active tab so another attempt never uses a stale page reference.
      const tab = await currentPage();
      if (!tab) return;
      const response = await requestDetection(tab.id);
      if (response?.error === 'RESTRICTED_PAGE') {
        showUnavailable('This page can’t be checked', 'Open a regular webpage with a form, then try formER there.');
      } else if (!response?.success || !Array.isArray(response.fields) || response.fields.some((field) => !field || typeof field !== 'object')) {
        if (response?.error === 'CONNECTION_EXPIRED') renderConnection({ state: 'disconnected', message: 'Your connection expired. Please connect again.' });
        const message = response?.message || (response?.error === 'TIMEOUT'
          ? 'This is taking longer than expected. Wait for the page to finish loading, then try again.'
          : tab.url.startsWith('file:')
            ? 'Chrome may need permission to read this file. Enable “Allow access to file URLs” in formER’s extension settings, then try again.'
            : 'This page may not allow detection. Wait for it to finish loading and try again, or open another page with a form.');
        showError(message);
      } else {
        renderResults(response);
      }
    } catch { showError('We couldn’t reach this page. Check that it’s still open, then try again.'); }
    finally { busy = false; elements.connectBtn.disabled = false; elements.disconnectBtn.disabled = false; }
  });

  async function initialize() {
    try {
      const tab = await currentPage();
      if (tab) {
        await chrome.sidePanel.setOptions({ tabId: tab.id, path: `sidepanel/review.html?tab=${tab.id}`, enabled: true });
        reviewTabId = tab.id;
        setState('ready', connected() ? 'Ready to review' : 'Ready to detect');
      }
    } catch { showError('We couldn’t find your active page. Open a webpage and try again.'); }
  }
  initialize();
  accountAction('CONNECTION_STATUS');
});
