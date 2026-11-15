/**
 * DOM Utility functions for formER form field extraction
 * Provides robust visibility checking, sensitive field filtering, label discovery, and section detection.
 */

/**
 * Clean, sanitize, and limit untrusted text strings from web pages
 */
export const cleanText = (str, maxLength = 500) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

/**
 * Check if a DOM element is visible and interactive
 */
export const isElementVisible = (el) => {
  if (!el || typeof el.nodeType !== 'number' || el.nodeType !== 1) return false;

  // 1. Explicit hidden attribute or type
  if (el.hasAttribute && el.hasAttribute('hidden')) return false;
  if (el.getAttribute && el.getAttribute('type') === 'hidden') return false;
  if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;

  // 2. Inline styles
  const style = el.style || {};
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  // 3. Computed styles (if available in browser environment)
  const win = el.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
  if (win && typeof win.getComputedStyle === 'function') {
    try {
      const computed = win.getComputedStyle(el);
      if (computed.display === 'none' || computed.visibility === 'hidden' || computed.opacity === '0') {
        return false;
      }
    } catch {
      // Ignored if detached element in test
    }
  }

  // 4. Geometry dimensions (honeypot 0x0 inputs)
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

  // 5. Parent container visibility check
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

/**
 * Sensitive field patterns to exclude strictly for security and privacy
 */
const SENSITIVE_PATTERNS = {
  // Passwords & credentials
  types: ['password', 'file', 'hidden', 'submit', 'reset', 'button', 'image'],

  // Credit card & payment fields
  paymentTerms: [
    'creditcard', 'credit card', 'debit card', 'card number', 'cardnumber', 'card_number',
    'cc number', 'cc-number', 'cvv', 'cvc', 'security code', 'card code', 'cid',
    'cardholder', 'name on card', 'card holder', 'exp month', 'exp year', 'expiry date', 'expiration'
  ],

  // 2FA, OTP & Verification codes
  authTerms: [
    'otp', 'one time password', 'onetimepassword', 'one-time-code', 'verification code',
    'verification_code', 'security token', 'passcode', '2fa', 'mfa', 'authenticator code'
  ],

  // CAPTCHAs & bot challenges
  captchaTerms: [
    'captcha', 'recaptcha', 'hcaptcha', 'cf-turnstile', 'turnstile', 'bot-detect',
    'security challenge', 'verify you are human'
  ],

  // CSRF tokens & internal framework honeypots
  tokenTerms: [
    'csrf', 'xsrf', '_token', 'csrf_token', 'authenticity_token', 'honeypot', '__requestverificationtoken'
  ]
};

/**
 * Determine if an element is a sensitive, payment, security, or unsupported field
 */
export const isSensitiveOrExcluded = (el) => {
  if (!el) return { excluded: true, reason: 'Invalid element' };

  const rawType = (el.getAttribute('type') || el.type || '').toLowerCase().trim();
  const tagName = el.tagName.toLowerCase();

  // 1. Check excluded input types
  if (SENSITIVE_PATTERNS.types.includes(rawType)) {
    return {
      excluded: true,
      reason: `Unsupported element type: "${rawType}"`
    };
  }

  // 2. Non-interactive tags
  if (!['input', 'select', 'textarea'].includes(tagName)) {
    return {
      excluded: true,
      reason: `Unsupported element tag: <${tagName}>`
    };
  }

  // 3. Visibility check
  if (!isElementVisible(el)) {
    return {
      excluded: true,
      reason: 'Element is hidden or invisible'
    };
  }

  // 4. Inspect attributes: name, id, class, autocomplete, placeholder, aria-label
  const name = (el.name || el.getAttribute('name') || '').toLowerCase();
  const id = (el.id || el.getAttribute('id') || '').toLowerCase();
  const className = (el.className && typeof el.className === 'string' ? el.className : '').toLowerCase();
  const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
  const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

  const combinedAttributes = `${name} ${id} ${className} ${autocomplete} ${placeholder} ${ariaLabel}`;

  // Check payment
  if (autocomplete.startsWith('cc-') || SENSITIVE_PATTERNS.paymentTerms.some((term) => combinedAttributes.includes(term))) {
    return {
      excluded: true,
      reason: 'Payment or card credential field'
    };
  }

  // Check OTP / 2FA
  if (autocomplete === 'one-time-code' || SENSITIVE_PATTERNS.authTerms.some((term) => combinedAttributes.includes(term))) {
    return {
      excluded: true,
      reason: 'One-time verification / authentication passcode field'
    };
  }

  // Check CAPTCHAs
  if (SENSITIVE_PATTERNS.captchaTerms.some((term) => combinedAttributes.includes(term))) {
    return {
      excluded: true,
      reason: 'CAPTCHA / bot challenge field'
    };
  }

  // Check security tokens / honeypots
  if (SENSITIVE_PATTERNS.tokenTerms.some((term) => combinedAttributes.includes(term))) {
    return {
      excluded: true,
      reason: 'Security token or honeypot control'
    };
  }

  return { excluded: false };
};

/**
 * Discover and resolve associated label text for an element using multiple heuristics
 */
export const resolveLabel = (el) => {
  if (!el) return '';
  const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc) return '';

  // Strategy 1: ARIA labelledby (ID reference)
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/);
    const texts = ids
      .map((id) => {
        const refEl = doc.getElementById(id);
        return refEl ? refEl.textContent : '';
      })
      .filter(Boolean);
    if (texts.length > 0) {
      return cleanText(texts.join(' '));
    }
  }

  // Strategy 2: ARIA label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return cleanText(ariaLabel);
  }

  // Strategy 3: Explicit <label for="elementId">
  if (el.id) {
    try {
      const explicitLabel = doc.querySelector(`label[for="${el.id}"]`);
      if (explicitLabel && explicitLabel.textContent.trim()) {
        return cleanText(explicitLabel.textContent);
      }
    } catch {
      // Fallback if CSS selector fails
    }
  }

  // Strategy 4: Ancestor/wrapping <label>
  const wrappingLabel = el.closest ? el.closest('label') : null;
  if (wrappingLabel) {
    // Clone label to extract text without input element values/options
    const clone = wrappingLabel.cloneNode(true);
    // Remove input, select, textarea from clone so we only read label prose
    const childInputs = clone.querySelectorAll('input, select, textarea, button');
    childInputs.forEach((ci) => ci.remove());
    const labelText = cleanText(clone.textContent);
    if (labelText) return labelText;
  }

  // Strategy 5: Fieldset <legend> (useful for radios/checkbox groups or single fieldset items)
  const fieldset = el.closest ? el.closest('fieldset') : null;
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend && legend.textContent.trim()) {
      // For radio/checkbox, the legend is typically the group label
      if (el.type === 'radio' || el.type === 'checkbox') {
        const directLabel = findNearbyLabelText(el);
        if (directLabel) {
          return `${cleanText(legend.textContent)} - ${directLabel}`;
        }
        return cleanText(legend.textContent);
      }
    }
  }

  // Strategy 6: Preceding sibling or nearby label-like container
  const nearbyText = findNearbyLabelText(el);
  if (nearbyText) {
    return nearbyText;
  }

  // Strategy 7: Table cell association (<th> or preceding <td>)
  const tableCell = el.closest ? el.closest('td') : null;
  if (tableCell) {
    // Check preceding td in same row
    const prevCell = tableCell.previousElementSibling;
    if (prevCell && prevCell.textContent.trim() && prevCell.textContent.trim().length < 100) {
      return cleanText(prevCell.textContent);
    }
    // Check corresponding th in header
    const row = tableCell.parentElement;
    const table = row ? row.closest('table') : null;
    if (table) {
      const cellIndex = Array.prototype.indexOf.call(row.children, tableCell);
      const th = table.querySelector(`thead tr th:nth-child(${cellIndex + 1})`);
      if (th && th.textContent.trim()) {
        return cleanText(th.textContent);
      }
    }
  }

  // Strategy 8: Placeholder fallback
  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) {
    return cleanText(placeholder);
  }

  // Strategy 9: Title attribute
  const title = el.getAttribute('title');
  if (title && title.trim()) {
    return cleanText(title);
  }

  // Strategy 10: Formatted name or ID
  const nameOrId = el.name || el.id;
  if (nameOrId) {
    return cleanText(
      nameOrId
        .replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
    );
  }

  return '';
};

/**
 * Helper to locate label-like text immediately preceding an element
 */
const findNearbyLabelText = (el) => {
  // Check previous element sibling
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

  // Check parent's previous element sibling (e.g. <div><label>Name</label></div><div><input /></div>)
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

/**
 * Resolve the surrounding section heading or category for an element
 */
export const resolveSection = (el) => {
  if (!el) return '';
  const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
  const docBody = doc?.body;
  const docEl = doc?.documentElement;

  // 1. Closest fieldset legend
  const fieldset = el.closest ? el.closest('fieldset') : null;
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend && legend.textContent.trim()) {
      return cleanText(legend.textContent);
    }
  }

  // 2. Closest section or article with a heading
  let container = el.parentElement;
  while (container && container !== docBody && container !== docEl) {
    if (['section', 'article', 'form', 'div'].includes(container.tagName.toLowerCase())) {
      const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading && heading.textContent.trim() && heading !== el) {
        // Ensure heading is rendered before this element in DOM order (position 2 = DOCUMENT_POSITION_PRECEDING)
        if (container.contains(heading) && (el.compareDocumentPosition(heading) & 2)) {
          return cleanText(heading.textContent);
        }
      }
    }
    container = container.parentElement;
  }

  // 3. Nearest preceding heading in the document
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
