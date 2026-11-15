/**
 * formER Popup Script
 * Coordinates user actions, communicates with background service worker, and presents extraction diagnostics.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const pageStatusBadge = document.getElementById('pageStatusBadge');
  const pageTitle = document.getElementById('pageTitle');
  const detectBtn = document.getElementById('detectBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  const errorContainer = document.getElementById('errorContainer');
  const errorMessage = document.getElementById('errorMessage');
  const resultsContainer = document.getElementById('resultsContainer');
  const supportedCount = document.getElementById('supportedCount');
  const excludedCount = document.getElementById('excludedCount');
  const fieldsList = document.getElementById('fieldsList');
  const toggleJsonBtn = document.getElementById('toggleJsonBtn');
  const jsonViewer = document.getElementById('jsonViewer');
  const jsonCode = document.getElementById('jsonCode');

  let activeTab = null;
  let isJsonVisible = false;

  const RESTRICTED_SCHEMES = [
    'chrome:',
    'chrome-extension:',
    'edge:',
    'about:',
    'devtools:',
    'view-source:',
    'data:'
  ];

  const isRestrictedUrl = (url) => {
    if (!url || typeof url !== 'string') return true;
    return RESTRICTED_SCHEMES.some((scheme) => url.startsWith(scheme));
  };

  const showError = (msg) => {
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = msg;
    resultsContainer.classList.add('hidden');
  };

  const hideError = () => {
    errorContainer.classList.add('hidden');
    errorMessage.textContent = '';
  };

  const setLoading = (loading) => {
    if (loading) {
      detectBtn.disabled = true;
      btnSpinner.classList.remove('hidden');
      btnText.textContent = 'Detecting Fields...';
    } else {
      detectBtn.disabled = false;
      btnSpinner.classList.add('hidden');
      btnText.textContent = 'Detect Form Fields';
    }
  };

  // 1. Initialize Active Tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs && tabs.length > 0 ? tabs[0] : null;

    if (!activeTab || !activeTab.url) {
      pageStatusBadge.textContent = 'Unavailable';
      pageStatusBadge.className = 'status-badge restricted';
      pageTitle.textContent = 'No active tab detected';
      detectBtn.disabled = true;
      showError('Unable to detect an active browser tab.');
      return;
    }

    pageTitle.textContent = activeTab.title || activeTab.url;

    if (isRestrictedUrl(activeTab.url)) {
      pageStatusBadge.textContent = 'Restricted';
      pageStatusBadge.className = 'status-badge restricted';
      detectBtn.disabled = true;
      showError('formER cannot run on internal or restricted browser pages (chrome://, about:, extensions). Navigate to a web form to detect fields.');
    } else {
      pageStatusBadge.textContent = 'Supported';
      pageStatusBadge.className = 'status-badge supported';
      detectBtn.disabled = false;
    }
  } catch (err) {
    pageStatusBadge.textContent = 'Error';
    pageStatusBadge.className = 'status-badge restricted';
    showError(`Error initializing active tab: ${err.message}`);
  }

  // 2. Handle Detect Fields Click
  detectBtn.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return;

    hideError();
    setLoading(true);

    try {
      chrome.runtime.sendMessage(
        { type: 'DETECT_FIELDS', tabId: activeTab.id },
        (response) => {
          setLoading(false);

          if (chrome.runtime.lastError) {
            showError(`Communication failure: ${chrome.runtime.lastError.message}`);
            return;
          }

          if (!response || !response.success) {
            const errDetail = response?.message || response?.error || 'Field detection returned an empty or invalid response.';
            showError(errDetail);
            return;
          }

          renderResults(response);
        }
      );
    } catch (err) {
      setLoading(false);
      showError(`Unexpected error during detection: ${err.message}`);
    }
  });

  // 3. Render Field Extraction Results
  const renderResults = (data) => {
    const fields = data.fields || [];
    const stats = data.stats || { supportedCount: fields.length, excludedCount: 0 };

    supportedCount.textContent = stats.supportedCount;
    excludedCount.textContent = stats.excludedCount;

    fieldsList.innerHTML = '';

    if (fields.length === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.className = 'field-item';
      emptyNote.innerHTML = '<span class="field-label" style="color: #64748b;">No interactive form fields found on this page.</span>';
      fieldsList.appendChild(emptyNote);
    } else {
      for (const field of fields) {
        const item = document.createElement('div');
        item.className = 'field-item';

        const meta = document.createElement('div');
        meta.className = 'field-meta';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'field-label';
        labelSpan.textContent = field.label || field.name || field.id || '(Unlabeled Field)';

        const subSpan = document.createElement('span');
        subSpan.className = 'field-sub truncate';
        const subParts = [];
        if (field.section) subParts.push(field.section);
        if (field.name) subParts.push(`name: ${field.name}`);
        if (field.id && field.id !== field.name) subParts.push(`id: ${field.id}`);
        if (field.options && field.options.length > 0) subParts.push(`${field.options.length} options`);
        subSpan.textContent = subParts.join(' • ') || 'No extra metadata';

        meta.appendChild(labelSpan);
        meta.appendChild(subSpan);

        const badge = document.createElement('span');
        badge.className = 'field-badge';
        badge.textContent = field.type;

        item.appendChild(meta);
        item.appendChild(badge);
        fieldsList.appendChild(item);
      }
    }

    // Format backend-contract compatible payload for diagnostics
    const contractPayload = {
      fields: fields.map((f) => ({
        fieldId: f.fieldId,
        label: f.label || '',
        name: f.name || '',
        type: f.type || 'text',
        id: f.id || '',
        placeholder: f.placeholder || '',
        section: f.section || '',
        options: f.options,
        required: f.required || false
      }))
    };

    jsonCode.textContent = JSON.stringify(contractPayload, null, 2);
    resultsContainer.classList.remove('hidden');
  };

  // 4. Toggle JSON Viewer
  toggleJsonBtn.addEventListener('click', () => {
    isJsonVisible = !isJsonVisible;
    if (isJsonVisible) {
      jsonViewer.classList.remove('hidden');
      toggleJsonBtn.textContent = 'Hide JSON';
    } else {
      jsonViewer.classList.add('hidden');
      toggleJsonBtn.textContent = 'Show JSON';
    }
  });
});
