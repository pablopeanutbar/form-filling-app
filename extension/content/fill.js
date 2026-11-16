(() => {
  const textTypes = new Set(['text', 'email', 'tel', 'number', 'date', 'url', 'textarea']);
  const sensitive = /password|passcode|\botp\b|captcha|one.?time|verification|security code|card|cvv|cvc|bank|routing|iban|social security|\bssn\b|passport|driver.?s? licen[cs]e|driv lic|tax id|national id|aadhaar|consent|declaration|\bagree\b|\buser id\b|\b\d*cc(?:number|exp|issuer|cstsvc|\s+(?:type|uname))\b/i;
  const normalized = (text) => String(text).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');

  function writable(el, label, excluded) {
    return el.isConnected && !el.matches(':disabled,[readonly],[aria-disabled="true"],[aria-readonly="true"]')
      && !el.closest('[inert],[hidden],[aria-hidden="true"]') && !excluded(el).excluded
      && !sensitive.test(normalized([label, el.name, el.id, el.autocomplete, el.placeholder].join(' ')))
      && !/\bcc-/i.test(el.autocomplete || '');
  }

  function signature(elements, labelFor) {
    return JSON.stringify(elements.map((el) => [
      el.tagName, el.type, el.id, el.name, labelFor(el),
      ...['autocomplete', 'placeholder', 'required', 'pattern', 'min', 'max', 'step', 'minlength', 'maxlength', 'multiple', 'disabled', 'readonly']
        .map((attribute) => el.getAttribute(attribute)),
      el.options && Array.from(el.options, (option) => [option.value, option.label, option.matches(':disabled')]),
      el.type === 'radio' ? el.value : null
    ]));
  }

  function replacement(elements, field, value) {
    const [el] = elements;
    if (field.type === 'radio') {
      const matches = elements.filter((radio) => radio.value === value);
      return matches.length === 1 && el.name ? { target: matches[0], property: 'checked', value: true } : null;
    }
    if (el.tagName === 'SELECT') {
      const matches = Array.from(el.options).filter((option) => option.value === value && !option.matches(':disabled'));
      return !el.multiple && matches.length === 1 ? { target: el, property: 'value', value } : null;
    }
    const type = el.tagName === 'TEXTAREA' ? 'textarea' : el.type;
    if (!textTypes.has(type) || el.multiple || !value.trim()) return null;
    if (type === 'url' || /^(web ?site|personal website|portfolio(?: website| url)?)$/i.test(field.label)) {
      try { if (!['https:', 'http:'].includes(new URL(value).protocol)) return null; }
      catch { return null; }
    }
    const probe = el.cloneNode(false);
    probe.value = value;
    if (probe.value !== value || !probe.validity.valid
        || (probe.maxLength >= 0 && value.length > probe.maxLength)
        || (probe.minLength >= 0 && value.length < probe.minLength)) return null;
    return { target: el, property: 'value', value };
  }

  function containsAnswer({ target, property, value }, field) {
    const actual = target[property];
    if (actual === value) return true;
    if (property !== 'value' || target.tagName === 'SELECT' || !actual.trim()) return false;
    if (target.type === 'number') return Number(actual) === Number(value);
    const phone = target.type === 'tel' || /^(?:(?:cell|mobile|primary|alternate) )?(?:phone|telephone)(?: number)?$/i.test(field.label);
    if (phone && [actual, value].every((v) => /^\+?[\d\s().-]+$/.test(v))) {
      return actual.replace(/[\s().-]/g, '') === value.replace(/[\s().-]/g, '');
    }
    if (target.type === 'email') {
      const [actualUser, actualDomain] = actual.split('@');
      const [user, domain] = value.split('@');
      return actualUser === user && !!domain && actualDomain?.toLowerCase() === domain.toLowerCase();
    }
    return false;
  }

  function hasExistingAnswer(target, field, elements) {
    if (field.type === 'radio') return elements.some((el) => el.checked);
    if (target.value === '') return false;
    // Some DOB menus use a nonempty zero for the first, explicitly labeled prompt.
    if (target.tagName === 'SELECT' && target.selectedIndex === 0 && target.value === '0'
        && /\b(date of birth|birth date|dob)\b/i.test([field.label, field.section].join(' '))
        && /^(month|day|year)$/i.test(target.options[0]?.label.trim() || '')) return false;
    return true;
  }

  async function apply(snapshot, current, proposals, { labelFor, excluded, stillCurrent }) {
    const byElement = new Map([...current.values()].map((entry) => [entry.elements[0], entry]));
    const writes = [];
    const results = [];
    for (const proposal of proposals) {
      const result = { fieldId: proposal.fieldId, status: 'skipped' };
      results.push(result);
      const saved = snapshot.get(proposal.fieldId);
      const now = saved && byElement.get(saved.elements[0]);
      if (!stillCurrent() || !now || now.elements.length !== saved.elements.length
          || now.elements.some((el, index) => el !== saved.elements[index] || el.form !== saved.forms[index])
          || JSON.stringify({ ...now.field, fieldId: null }) !== JSON.stringify({ ...saved.field, fieldId: null })
          || signature(saved.elements, labelFor) !== saved.signature) {
        result.reason = 'This field changed. Analyze the form again.';
        continue;
      }
      if (!saved.elements.every((el) => writable(el, saved.field.label, excluded))) {
        result.reason = 'This field is protected or cannot be edited.';
        continue;
      }
      if (saved.field.type === 'radio') {
        const first = saved.elements[0];
        const group = first.form?.elements || first.ownerDocument.querySelectorAll('input[type="radio"]');
        const others = Array.from(group).some((el) => el.type === 'radio' && el.name === first.name
          && el.form === first.form && !saved.elements.includes(el));
        if (others) {
          result.reason = 'The radio group contains an unreviewed choice.';
          continue;
        }
      }
      const change = replacement(saved.elements, saved.field, proposal.value);
      if (!change) {
        result.reason = 'The selected answer does not fit this field.';
        continue;
      }
      const existing = hasExistingAnswer(change.target, saved.field, saved.elements);
      if (containsAnswer(change, saved.field) && change.target.validity.valid) {
        writes.push({ change, result, saved, outcome: 'already_correct' });
        continue;
      }
      if (existing && !proposal.overwrite) {
        result.status = 'conflict';
        result.reason = 'The field already has an answer. Approve replacement to change it.';
        continue;
      }
      try {
        const { target, property, value } = change;
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), property)?.set;
        setter.call(target, value);
        const EventClass = target.ownerDocument.defaultView.Event;
        target.dispatchEvent(new EventClass('input', { bubbles: true, composed: true }));
        if (target.isConnected) target.dispatchEvent(new EventClass('change', { bubbles: true }));
        writes.push({ change, result, saved, outcome: 'filled' });
      } catch {
        result.status = 'failed';
        result.reason = 'The answer could not be applied.';
      }
    }
    // Allow framework updates to settle before reading back the applied values.
    if (writes.length) await new Promise((resolve) => setTimeout(resolve, 0));
    for (const { change, result, saved, outcome } of writes) {
      const { target } = change;
      if (stillCurrent() && target.isConnected && containsAnswer(change, saved.field) && target.validity.valid
          && signature(saved.elements, labelFor) === saved.signature) {
        result.status = outcome;
      } else {
        result.status = 'failed';
        result.reason = 'The answer could not be verified in the field.';
      }
    }
    return results;
  }

  globalThis.formERWriter = Object.freeze({ signature, apply });
})();
