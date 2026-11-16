/**
 * formER Content Script
 * Executes in the context of the active webpage to extract form field metadata
 * and communicate with the extension service worker and popup.
 */

(() => {
  // Prevent duplicate listener registration if injected multiple times
  if (window.__formER_content_injected) {
    return;
  }
  window.__formER_content_injected = true;

  // ==========================================
  // DOM Utilities
  // ==========================================
  const cleanText = (str, maxLength = 500) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  };

  const isElementVisible = (el) => {
    if (!el || typeof el.nodeType !== 'number' || el.nodeType !== 1) return false;

    if (el.hasAttribute && el.hasAttribute('hidden')) return false;
    if (el.getAttribute && el.getAttribute('type') === 'hidden') return false;
    if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;

    const style = el.style || {};
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    const win = el.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
    if (win && typeof win.getComputedStyle === 'function') {
      try {
        const computed = win.getComputedStyle(el);
        if (computed.display === 'none' || computed.visibility === 'hidden' || computed.opacity === '0') {
          return false;
        }
      } catch {
        // Fallback
      }
    }

    // Geometry dimensions (honeypot 0x0 inputs)
    if (style.width === '0px' || style.height === '0px') {
      return false;
    }
    const hasLayoutEngine = el.ownerDocument?.body && el.ownerDocument.body.offsetWidth > 0;
    if (hasLayoutEngine && typeof el.getBoundingClientRect === 'function') {
      try {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0 && el.offsetWidth === 0 && el.offsetHeight === 0) {
          return false;
        }
      } catch {
        // Ignored
      }
    }

    let parent = el.parentElement;
    const docBody = el.ownerDocument?.body;
    while (parent && parent !== docBody) {
      if (parent.hasAttribute && parent.hasAttribute('hidden')) return false;
      if (parent.getAttribute && parent.getAttribute('aria-hidden') === 'true') return false;
      const pStyle = parent.style || {};
      if (pStyle.display === 'none' || pStyle.visibility === 'hidden') {
        return false;
      }
      parent = parent.parentElement;
    }

    return true;
  };

  const SENSITIVE_PATTERNS = {
    types: ['password', 'file', 'hidden', 'submit', 'reset', 'button', 'image'],
    paymentTerms: [
      'creditcard', 'credit card', 'debit card', 'card number', 'cardnumber', 'card_number',
      'cc number', 'cc-number', 'cvv', 'cvc', 'security code', 'card code', 'cid',
      'cardholder', 'name on card', 'card holder', 'exp month', 'exp year', 'expiry date', 'expiration'
    ],
    authTerms: [
      'otp', 'one time password', 'onetimepassword', 'one-time-code', 'verification code',
      'verification_code', 'security token', 'passcode', '2fa', 'mfa', 'authenticator code'
    ],
    captchaTerms: [
      'captcha', 'recaptcha', 'hcaptcha', 'cf-turnstile', 'turnstile', 'bot-detect',
      'security challenge', 'verify you are human'
    ],
    tokenTerms: [
      'csrf', 'xsrf', '_token', 'csrf_token', 'authenticity_token', 'honeypot', '__requestverificationtoken'
    ]
  };

  const isSensitiveOrExcluded = (el) => {
    if (!el) return { excluded: true, reason: 'Invalid element' };

    const rawType = (el.getAttribute('type') || el.type || '').toLowerCase().trim();
    const tagName = el.tagName.toLowerCase();

    if (SENSITIVE_PATTERNS.types.includes(rawType)) {
      return { excluded: true, reason: `Unsupported element type: "${rawType}"` };
    }

    if (!['input', 'select', 'textarea'].includes(tagName)) {
      return { excluded: true, reason: `Unsupported element tag: <${tagName}>` };
    }

    if (!isElementVisible(el)) {
      return { excluded: true, reason: 'Element is hidden or invisible' };
    }

    const name = (el.name || el.getAttribute('name') || '').toLowerCase();
    const id = (el.id || el.getAttribute('id') || '').toLowerCase();
    const className = (el.className && typeof el.className === 'string' ? el.className : '').toLowerCase();
    const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

    const combinedAttributes = `${name} ${id} ${className} ${autocomplete} ${placeholder} ${ariaLabel}`;

    if (autocomplete.startsWith('cc-') || SENSITIVE_PATTERNS.paymentTerms.some((t) => combinedAttributes.includes(t))) {
      return { excluded: true, reason: 'Payment or card credential field' };
    }

    if (autocomplete === 'one-time-code' || SENSITIVE_PATTERNS.authTerms.some((t) => combinedAttributes.includes(t))) {
      return { excluded: true, reason: 'One-time verification / passcode field' };
    }

    if (SENSITIVE_PATTERNS.captchaTerms.some((t) => combinedAttributes.includes(t))) {
      return { excluded: true, reason: 'CAPTCHA / bot challenge field' };
    }

    if (SENSITIVE_PATTERNS.tokenTerms.some((t) => combinedAttributes.includes(t))) {
      return { excluded: true, reason: 'Security token or honeypot control' };
    }

    return { excluded: false };
  };

  const findNearbyLabelText = (el) => {
    let prev = el.previousElementSibling;
    while (prev && (prev.tagName.toLowerCase() === 'br' || !prev.textContent.trim())) {
      prev = prev.previousElementSibling;
    }

    if (prev && ['label', 'span', 'p', 'div', 'b', 'strong'].includes(prev.tagName.toLowerCase())) {
      const text = prev.textContent.trim();
      if (text.length > 0 && text.length <= 150) {
        return cleanText(text);
      }
    }

    const parent = el.parentElement;
    const docBody = el.ownerDocument?.body;
    if (parent && parent !== docBody) {
      let parentPrev = parent.previousElementSibling;
      if (parentPrev && ['label', 'span', 'p', 'div', 'b', 'strong', 'dt'].includes(parentPrev.tagName.toLowerCase())) {
        const text = parentPrev.textContent.trim();
        if (text.length > 0 && text.length <= 150) {
          return cleanText(text);
        }
      }
    }

    return '';
  };

  const resolveLabel = (el) => {
    if (!el) return '';
    const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return '';

    // 1. ARIA labelledby
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ids = labelledBy.split(/\s+/);
      const texts = ids
        .map((id) => {
          const refEl = doc.getElementById(id);
          return refEl ? refEl.textContent : '';
        })
        .filter(Boolean);
      if (texts.length > 0) return cleanText(texts.join(' '));
    }

    // 2. ARIA label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return cleanText(ariaLabel);

    // 3. Explicit label for="id"
    if (el.id) {
      try {
        const explicitLabel = doc.querySelector(`label[for="${el.id}"]`);
        if (explicitLabel && explicitLabel.textContent.trim()) {
          return cleanText(explicitLabel.textContent);
        }
      } catch {
        // Fallback
      }
    }

    // 4. Wrapping label
    const wrappingLabel = el.closest ? el.closest('label') : null;
    if (wrappingLabel) {
      const clone = wrappingLabel.cloneNode(true);
      const childInputs = clone.querySelectorAll('input, select, textarea, button');
      childInputs.forEach((ci) => ci.remove());
      const labelText = cleanText(clone.textContent);
      if (labelText) return labelText;
    }

    // 5. Fieldset legend
    const fieldset = el.closest ? el.closest('fieldset') : null;
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend && legend.textContent.trim()) {
        if (el.type === 'radio' || el.type === 'checkbox') {
          const directLabel = findNearbyLabelText(el);
          if (directLabel) return `${cleanText(legend.textContent)} - ${directLabel}`;
          return cleanText(legend.textContent);
        }
      }
    }

    // 6. Preceding sibling
    const nearby = findNearbyLabelText(el);
    if (nearby) return nearby;

    // 7. Table header
    const tableCell = el.closest ? el.closest('td') : null;
    if (tableCell) {
      const prevCell = tableCell.previousElementSibling;
      if (prevCell && prevCell.textContent.trim() && prevCell.textContent.trim().length < 100) {
        return cleanText(prevCell.textContent);
      }
    }

    // 8. Placeholder fallback
    const placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) return cleanText(placeholder);

    // 9. Name/ID fallback
    const nameOrId = el.name || el.id;
    if (nameOrId) {
      return cleanText(nameOrId.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'));
    }

    return '';
  };

  const resolveSection = (el) => {
    if (!el) return '';
    const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
    const docBody = doc?.body;
    const docEl = doc?.documentElement;

    const fieldset = el.closest ? el.closest('fieldset') : null;
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend && legend.textContent.trim()) {
        return cleanText(legend.textContent);
      }
    }

    let container = el.parentElement;
    while (container && container !== docBody && container !== docEl) {
      if (['section', 'article', 'form', 'div'].includes(container.tagName.toLowerCase())) {
        const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading && heading.textContent.trim() && heading !== el) {
          if (container.contains(heading) && (el.compareDocumentPosition(heading) & 2)) {
            return cleanText(heading.textContent);
          }
        }
      }
      container = container.parentElement;
    }

    let node = el;
    while (node) {
      let sibling = node.previousElementSibling;
      while (sibling) {
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(sibling.tagName.toLowerCase())) {
          return cleanText(sibling.textContent);
        }
        const nestedHeading = sibling.querySelector ? sibling.querySelector('h1, h2, h3, h4, h5, h6') : null;
        if (nestedHeading && nestedHeading.textContent.trim()) {
          return cleanText(nestedHeading.textContent);
        }
        sibling = sibling.previousElementSibling;
      }
      node = node.parentElement;
    }

    return '';
  };

  // ==========================================
  // Field Extractor
  // ==========================================
  const normalizeInputType = (el) => {
    const tagName = el.tagName.toLowerCase();
    if (tagName === 'textarea') return 'textarea';
    if (tagName === 'select') return 'select';

    const rawType = (el.getAttribute('type') || el.type || 'text').toLowerCase().trim();
    const standardTypes = ['text', 'email', 'tel', 'number', 'date', 'url', 'radio', 'checkbox'];

    if (standardTypes.includes(rawType)) return rawType;
    if (['datetime-local', 'month', 'week', 'time'].includes(rawType)) return 'date';

    return 'text';
  };

  const extractSelectOptions = (selectEl) => {
    const options = [];
    const optionEls = selectEl.querySelectorAll('option');

    for (const opt of optionEls) {
      const text = cleanText(opt.textContent || opt.text);
      const val = opt.value !== undefined ? String(opt.value).trim() : '';

      if (!text && !val) continue;
      if (val === '' && (/select|choose|pick|placeholder/i.test(text) || text.startsWith('-') || text.startsWith('—'))) {
        continue;
      }

      options.push({ label: text || val, value: val, disabled: Boolean(opt.disabled || opt.parentElement?.disabled) });
    }

    return options;
  };

  const extractFormFields = (root = document, targets) => {
    const rawControls = Array.from(root.querySelectorAll('input, select, textarea'));
    const totalEvaluated = rawControls.length;

    const validControls = [];
    let excludedCount = 0;

    for (const el of rawControls) {
      const check = isSensitiveOrExcluded(el);
      if (check.excluded) {
        excludedCount++;
        continue;
      }
      validControls.push(el);
    }

    const radioGroups = new Map();
    const individualControls = [];

    for (const el of validControls) {
      const type = normalizeInputType(el);
      if (type === 'radio') {
        const radioName = (el.name || el.getAttribute('name') || 'unnamed_radio').trim();
        const formIndex = Array.from(root.querySelectorAll('form')).indexOf(el.form);
      const groupKey = radioName !== 'unnamed_radio' ? `${formIndex}:${radioName}` : `radio_fieldset_${radioGroups.size}`;

        if (!radioGroups.has(groupKey)) {
          radioGroups.set(groupKey, []);
        }
        radioGroups.get(groupKey).push(el);
      } else {
        individualControls.push(el);
      }
    }

    const fields = [];
    let sessionIndex = 0;

    for (const el of individualControls) {
      const type = normalizeInputType(el);
      const fieldId = `field_${sessionIndex++}`;
      const id = cleanText(el.id || el.getAttribute('id') || '', 100);
      const name = cleanText(el.name || el.getAttribute('name') || '', 100);
      const label = resolveLabel(el);
      const placeholder = cleanText(el.getAttribute('placeholder') || '', 200);
      const section = resolveSection(el);
      const required = el.required || el.getAttribute('aria-required') === 'true';

      let options = undefined;
      let optionsTruncated = false;
      if (type === 'select') {
        const opts = extractSelectOptions(el);
        optionsTruncated = opts.length > 50;
        if (opts.length > 0) options = opts.slice(0, 50);
      }

      const constraints = { inputType: (el.getAttribute('type') || type).toLowerCase(), multiple: Boolean(el.multiple) };
      if (el.hasAttribute('minlength')) {
        const length = Number(el.getAttribute('minlength'));
        if (Number.isInteger(length) && length >= 0) constraints.minlength = length;
      }
      if (el.hasAttribute('maxlength')) {
        const ml = parseInt(el.getAttribute('maxlength'), 10);
        if (!isNaN(ml)) constraints.maxlength = ml;
      }
      if (el.hasAttribute('min')) constraints.min = el.getAttribute('min');
      if (el.hasAttribute('max')) constraints.max = el.getAttribute('max');
      if (el.hasAttribute('step')) constraints.step = el.getAttribute('step');
      if (el.hasAttribute('pattern')) constraints.pattern = el.getAttribute('pattern');

      if (targets) targets.set(fieldId, { elements: [el] });
      fields.push({
        fieldId,
        id,
        name,
        type,
        label,
        placeholder,
        section,
        options,
        optionsTruncated,
        required,
        constraints: Object.keys(constraints).length > 0 ? constraints : undefined
      });
    }

    for (const [groupName, radioElements] of radioGroups.entries()) {
      const firstRadio = radioElements[0];
      const fieldId = `field_${sessionIndex++}`;
      const name = cleanText(firstRadio.name || groupName, 100);
      const id = cleanText(firstRadio.id || name, 100);

      const fieldset = firstRadio.closest ? firstRadio.closest('fieldset') : null;
      let groupLabel = '';
      if (fieldset) {
        const legend = fieldset.querySelector('legend');
        if (legend && legend.textContent.trim()) {
          groupLabel = cleanText(legend.textContent);
        }
      }
      if (!groupLabel) {
        groupLabel = resolveLabel(firstRadio);
      }

      const section = resolveSection(firstRadio);

      const options = radioElements.map((radio) => {
        const optLabel = resolveLabel(radio);
        const val = radio.value !== undefined ? String(radio.value).trim() : '';
        return { label: optLabel || val || 'Option', value: val, disabled: Boolean(radio.disabled) };
      });

      const isRequired = radioElements.some((r) => r.required || r.getAttribute('aria-required') === 'true');

      if (targets) targets.set(fieldId, { elements: radioElements });
      fields.push({
        fieldId,
        id,
        name,
        type: 'radio',
        label: groupLabel || name,
        placeholder: '',
        section,
        options: options.slice(0, 50),
        optionsTruncated: options.length > 50,
        required: isRequired
      });
    }

    if (targets) {
      for (const field of fields) targets.get(field.fieldId).field = field;
    }
    return {
      success: true,
      url: window.location.href,
      title: cleanText(document.title),
      fields,
      stats: {
        supportedCount: fields.length,
        excludedCount,
        totalEvaluated
      }
    };
  };

  // ==========================================
  // Message Listener
  // ==========================================
  let analysis;
  function invalidateAnalysis() { analysis = undefined; }
  window.addEventListener('pagehide', invalidateAnalysis);
  window.addEventListener('popstate', invalidateAnalysis);
  window.addEventListener('hashchange', invalidateAnalysis);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || sender.tab || sender.url !== chrome.runtime.getURL('background/service-worker.js')) return false;
    if (request.type === 'FILL_FIELDS' || request.type === 'CHECK_REVIEW') {
      const snapshot = analysis;
      if (!snapshot || snapshot.id !== request.analysisId || snapshot.url !== location.href
          || Date.now() >= snapshot.expiresAt || snapshot.filling || document.visibilityState !== 'visible') {
        sendResponse({ success: false, message: 'This review is stale. Analyze the current form again.' });
        return false;
      }
      if (request.type === 'CHECK_REVIEW') {
        sendResponse({ success: true });
        return false;
      }
      snapshot.filling = true;
      const run = async () => {
        const current = new Map();
        extractFormFields(document, current);
        const results = await globalThis.formERWriter.apply(snapshot.targets, current, request.proposals, {
          labelFor: (el) => [resolveLabel(el), resolveSection(el)].join(' | '),
          excluded: isSensitiveOrExcluded,
          stillCurrent: () => analysis === snapshot && location.href === snapshot.url && document.visibilityState === 'visible'
        });
        return { success: true, results };
      };
      run().finally(() => { snapshot.filling = false; }).then(sendResponse)
        .catch(() => sendResponse({ success: false, message: 'Filling could not be completed. Check the page before trying again.' }));
      return true;
    }
    if (request.type === 'EXTRACT_FIELDS') {
      try {
        const targets = request.analysisId ? new Map() : undefined;
        if (targets) invalidateAnalysis();
        const result = extractFormFields(document, targets);
        if (targets) {
          for (const target of targets.values()) {
            target.forms = target.elements.map((el) => el.form);
            target.signature = globalThis.formERWriter.signature(target.elements, (el) => [resolveLabel(el), resolveSection(el)].join(' | '));
          }
          analysis = { id: request.analysisId, targets, url: location.href, expiresAt: Date.now() + 5 * 60 * 1000 };
        }
        sendResponse(result);
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message,
          fields: [],
          stats: { supportedCount: 0, excludedCount: 0, totalEvaluated: 0 }
        });
      }
      return true;
    }
  });
})();
