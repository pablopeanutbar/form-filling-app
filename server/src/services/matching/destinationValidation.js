// Destination checks are independent of the canonical field's data type.
// Unsupported custom patterns are not evaluated as untrusted regular expressions.
export function validateDestination(value, field) {
  const invalid = (message) => ({ formattedValue: null, isValid: false, message });
  const type = (field.type || 'text').toLowerCase();
  const constraints = field.constraints || {};
  let formattedValue = value;
  const string = String(value).trim();
  if (constraints.multiple) return invalid('This field accepts multiple answers and needs manual review.');
  if (constraints.pattern) return invalid('This field has a custom format. Please check it yourself.');
  if (constraints.inputType && ['month', 'week', 'time', 'datetime-local'].includes(constraints.inputType)) return invalid('This date or time format needs manual review.');
  if (type === 'number') {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(string) || !Number.isFinite(Number(string))) return invalid('The saved answer is not a valid number.');
    formattedValue = Number(string);
    for (const [key, compare] of [['min', (n) => formattedValue < n], ['max', (n) => formattedValue > n]]) {
      if (constraints[key] !== undefined && (!Number.isFinite(Number(constraints[key])) || compare(Number(constraints[key])))) return invalid('The saved number is outside the limits of this field.');
    }
    const step = constraints.step === 'any' ? null : Number(constraints.step ?? 1);
    if (step !== null) {
      if (!Number.isFinite(step) || step <= 0) return invalid('This field has an unsupported number interval.');
      const ratio = (formattedValue - Number(constraints.min ?? 0)) / step;
      if (Math.abs(ratio - Math.round(ratio)) > 1e-8) return invalid('The saved number does not fit the interval required by this field.');
    }
  }
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string)) return invalid('The saved answer is not an email address.');
  if (type === 'url') {
    try { if (!['https:', 'http:'].includes(new URL(string).protocol)) return invalid('The saved answer is not a supported website address.'); }
    catch { return invalid('The saved answer is not a website address.'); }
  }
  if (type === 'date') {
    const parsed = new Date(string);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(string) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== string) return invalid('The saved date does not fit this field.');
    if ((constraints.min && string < constraints.min) || (constraints.max && string > constraints.max) || (constraints.step && constraints.step !== '1' && constraints.step !== 'any')) return invalid('The saved date needs checking against this field’s limits.');
  }
  if (constraints.maxlength !== undefined && string.length > constraints.maxlength) return invalid('The saved answer is too long for this field.');
  if (constraints.minlength !== undefined && string.length < constraints.minlength) return invalid('The saved answer is too short for this field.');
  if (['select', 'radio'].includes(type)) {
    if (!Array.isArray(field.options) || !field.options.length || field.optionsTruncated) return invalid('The available choices could not all be checked.');
    const normalize = (v) => String(v).trim().toLowerCase();
    const options = field.options.map((o) => typeof o === 'string' ? { label: o, value: o } : o);
    const matches = options.filter((o) => !o.disabled && (normalize(o.label) === normalize(string) || normalize(o.value) === normalize(string)));
    if (matches.length !== 1 || matches[0].value === '') return invalid('The saved answer does not identify one available choice.');
    formattedValue = matches[0].value;
    return { formattedValue, displayValue: matches[0].label, isValid: true };
  }
  return { formattedValue, isValid: true };
}
