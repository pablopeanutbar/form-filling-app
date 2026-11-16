import { WEBSITE_URL } from '../config.js';

// Presentation only: detection still uses the existing service-worker contract.
document.addEventListener('DOMContentLoaded', () => {
  const elements = Object.fromEntries([
    'pageStatusBadge', 'pageTitle', 'pageDomain', 'introTitle', 'introDescription',
    'detectBtn', 'btnText', 'btnSpinner', 'buttonIcon', 'announcement', 'loadingPanel',
    'noticePanel', 'noticeTitle', 'noticeMessage', 'errorContainer', 'errorMessage',
    'resultsContainer', 'resultsTitle', 'fieldsList', 'excludedNote'
  ].map((id) => [id, document.getElementById(id)]));
  let busy = false;

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
    elements.btnText.textContent = buttonLabel;
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
      const timer = setTimeout(() => finish({ success: false, error: 'TIMEOUT' }), 15000);
      try {
        chrome.runtime.sendMessage({ type: 'DETECT_FIELDS', tabId }, (response) => {
          const failed = chrome.runtime.lastError;
          finish(failed ? { success: false, error: 'COMMUNICATION_ERROR' } : response);
        });
      } catch { finish({ success: false, error: 'COMMUNICATION_ERROR' }); }
    });
  }

  const fieldTypes = {
    text: 'Text', email: 'Email', tel: 'Phone', number: 'Number', date: 'Date', url: 'Website',
    textarea: 'Long answer', select: 'Dropdown', radio: 'Choice', checkbox: 'Checkbox'
  };

  function fieldLabel(field) {
    const label = text(field.label) || text(field.placeholder);
    // Avoid displaying raw identifiers supplied as a label fallback by a webpage.
    const isIdentifier = [field.id, field.name, field.fieldId].some((value) => value && value === label)
      && /[_\[\]{}.$]|\d{3,}/.test(label);
    return label && !isIdentifier ? label : 'Field without a label';
  }

  function renderField(field, index) {
    const label = fieldLabel(field);
    const hint = text(field.placeholder);
    const options = Array.isArray(field.options) ? field.options.map(text).filter(Boolean).slice(0, 50) : [];
    const hasHint = hint && hint !== label;
    const expandable = hasHint || options.length > 0 || label.length > 80;
    const item = node('li', 'field-item');
    const content = expandable ? node('details') : item;
    const row = node(expandable ? 'summary' : 'div', 'field-row');
    const copy = node('span', 'field-copy');
    copy.append(node('span', 'field-label', label));
    copy.append(node('span', 'field-meta', [fieldTypes[field.type] || 'Form field', field.required ? 'Required' : ''].filter(Boolean).join(' · ')));
    const position = node('span', 'field-index', String(index + 1).padStart(2, '0'));
    position.setAttribute('aria-hidden', 'true');
    row.append(position, copy);
    content.append(row);
    if (expandable) {
      const details = node('div', 'field-details');
      if (hasHint) details.append(node('h4', '', 'Hint on the page'), node('p', '', hint));
      if (options.length) {
        details.append(node('h4', '', 'Choices shown on the page'));
        const list = node('ul', 'field-options');
        options.forEach((option) => list.append(node('li', '', option)));
        details.append(list);
      }
      if (!hasHint && !options.length) details.append(node('p', '', 'Full field label shown above.'));
      content.append(details);
      item.append(content);
    }
    return item;
  }

  function renderResults(data) {
    const fields = data.fields;
    elements.fieldsList.replaceChildren();
    const groups = new Map();
    fields.forEach((field, index) => {
      const section = text(field.section) || 'Form fields';
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push({ field, index });
    });
    groups.forEach((entries, label) => {
      const group = node('section', 'field-group');
      group.append(node('h3', '', label));
      const list = node('ul');
      entries.forEach(({ field, index }) => list.append(renderField(field, index)));
      group.append(list);
      elements.fieldsList.append(group);
    });
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
    elements.fieldsList.scrollTop = 0;
    elements.announcement.textContent = `${countLabel}. Nothing was filled in or submitted.`;
  }

  elements.detectBtn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
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
        const message = response?.error === 'TIMEOUT'
          ? 'This is taking longer than expected. Wait for the page to finish loading, then try again.'
          : tab.url.startsWith('file:')
            ? 'Chrome may need permission to read this file. Enable “Allow access to file URLs” in formER’s extension settings, then try again.'
            : 'This page may not allow detection. Wait for it to finish loading and try again, or open another page with a form.';
        showError(message);
      } else {
        renderResults(response);
      }
    } catch { showError('We couldn’t reach this page. Check that it’s still open, then try again.'); }
    finally { busy = false; }
  });

  async function initialize() {
    try {
      const tab = await currentPage();
      if (tab) setState('ready', 'Ready to detect');
    } catch { showError('We couldn’t find your active page. Open a webpage and try again.'); }
  }
  initialize();
});
