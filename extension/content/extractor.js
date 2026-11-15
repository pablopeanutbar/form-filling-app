import { isSensitiveOrExcluded, resolveLabel, resolveSection, cleanText } from './domUtils.js';

/**
 * Normalizes input element type into standard categorization
 */
const normalizeInputType = (el) => {
  const tagName = el.tagName.toLowerCase();
  if (tagName === 'textarea') return 'textarea';
  if (tagName === 'select') return 'select';

  const rawType = (el.getAttribute('type') || el.type || 'text').toLowerCase().trim();
  const standardTypes = ['text', 'email', 'tel', 'number', 'date', 'url', 'radio', 'checkbox'];

  if (standardTypes.includes(rawType)) {
    return rawType;
  }
  // Date-related subtypes
  if (['datetime-local', 'month', 'week', 'time'].includes(rawType)) {
    return 'date';
  }

  return 'text';
};

/**
 * Extracts options from a <select> element
 */
const extractSelectOptions = (selectEl) => {
  const options = [];
  const optionEls = selectEl.querySelectorAll('option');

  for (const opt of optionEls) {
    const text = cleanText(opt.textContent || opt.text);
    const val = opt.value !== undefined ? String(opt.value).trim() : '';

    // Skip empty or generic placeholders like "-- Select State --" or "Choose..."
    if (!text && !val) continue;
    if (val === '' && (/select|choose|pick|placeholder/i.test(text) || text.startsWith('-') || text.startsWith('—'))) {
      continue;
    }

    options.push(text || val);
  }

  return options;
};

/**
 * Form Field Extractor for formER
 * Traverses the DOM, filters sensitive fields, groups radio buttons, and produces
 * structured field metadata matching the backend autofill contract.
 *
 * @param {Document|Element} root Document or root element to extract from
 * @returns {Object} Extraction payload with fields and diagnostics
 */
export const extractFormFields = (root = document) => {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return {
      success: false,
      error: 'Invalid document or root container for form field extraction',
      fields: [],
      stats: { supportedCount: 0, excludedCount: 0, totalEvaluated: 0 }
    };
  }

  const rawControls = Array.from(root.querySelectorAll('input, select, textarea'));
  const totalEvaluated = rawControls.length;

  const validControls = [];
  let excludedCount = 0;

  // 1. Initial filter pass for sensitive, hidden, and unsupported elements
  for (const el of rawControls) {
    const check = isSensitiveOrExcluded(el);
    if (check.excluded) {
      excludedCount++;
      continue;
    }
    validControls.push(el);
  }

  // 2. Group radio buttons by name / fieldset
  const radioGroups = new Map();
  const processedRadios = new Set();
  const individualControls = [];

  for (const el of validControls) {
    const type = normalizeInputType(el);

    if (type === 'radio') {
      const radioName = (el.name || el.getAttribute('name') || 'unnamed_radio').trim();
      const groupKey = radioName !== 'unnamed_radio' ? radioName : `radio_fieldset_${radioGroups.size}`;

      if (!radioGroups.has(groupKey)) {
        radioGroups.set(groupKey, []);
      }
      radioGroups.get(groupKey).push(el);
      processedRadios.add(el);
    } else {
      individualControls.push(el);
    }
  }

  const fields = [];
  let sessionIndex = 0;

  // 3. Process individual fields (text, number, email, date, select, textarea, checkbox)
  for (const el of individualControls) {
    const type = normalizeInputType(el);
    const fieldId = `field_${sessionIndex++}`;
    const id = cleanText(el.id || el.getAttribute('id') || '', 100);
    const name = cleanText(el.name || el.getAttribute('name') || '', 100);
    const label = resolveLabel(el);
    const placeholder = cleanText(el.getAttribute('placeholder') || '', 200);
    const section = resolveSection(el);
    const required = el.required || el.getAttribute('aria-required') === 'true';

    // Extract options for select elements
    let options = undefined;
    if (type === 'select') {
      const opts = extractSelectOptions(el);
      if (opts.length > 0) {
        options = opts.slice(0, 50); // Cap at top 50 options to adhere to validation bounds
      }
    }

    // Extract relevant constraints
    const constraints = {};
    if (el.hasAttribute('maxlength')) {
      const ml = parseInt(el.getAttribute('maxlength'), 10);
      if (!isNaN(ml)) constraints.maxlength = ml;
    }
    if (el.hasAttribute('min')) constraints.min = el.getAttribute('min');
    if (el.hasAttribute('max')) constraints.max = el.getAttribute('max');
    if (el.hasAttribute('step')) constraints.step = el.getAttribute('step');
    if (el.hasAttribute('pattern')) constraints.pattern = el.getAttribute('pattern');

    fields.push({
      fieldId,
      id,
      name,
      type,
      label,
      placeholder,
      section,
      options,
      required,
      constraints: Object.keys(constraints).length > 0 ? constraints : undefined
    });
  }

  // 4. Process radio groups into unified logical fields
  for (const [groupName, radioElements] of radioGroups.entries()) {
    const firstRadio = radioElements[0];
    const fieldId = `field_${sessionIndex++}`;
    const name = cleanText(firstRadio.name || groupName, 100);
    const id = cleanText(firstRadio.id || name, 100);

    // Group label: from fieldset legend or common question label
    const fieldset = firstRadio.closest ? firstRadio.closest('fieldset') : null;
    let groupLabel = '';
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend && legend.textContent.trim()) {
        groupLabel = cleanText(legend.textContent);
      }
    }
    if (!groupLabel) {
      // Look for heading or label preceding the first radio
      groupLabel = resolveLabel(firstRadio);
    }

    // Section heading
    const section = resolveSection(firstRadio);

    // Collect individual radio option labels
    const options = radioElements.map((radio) => {
      const optLabel = resolveLabel(radio);
      const val = radio.value !== undefined ? String(radio.value).trim() : '';
      return optLabel || val || 'Option';
    });

    const isRequired = radioElements.some((r) => r.required || r.getAttribute('aria-required') === 'true');

    fields.push({
      fieldId,
      id,
      name,
      type: 'radio',
      label: groupLabel || name,
      placeholder: '',
      section,
      options,
      required: isRequired
    });
  }

  return {
    success: true,
    url: typeof window !== 'undefined' && window.location ? window.location.href : '',
    title: typeof document !== 'undefined' ? cleanText(document.title) : '',
    fields,
    stats: {
      supportedCount: fields.length,
      excludedCount,
      totalEvaluated
    }
  };
};
