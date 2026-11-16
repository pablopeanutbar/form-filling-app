import { normalizeIdentityText } from './fieldIdentity.js';
import { extractProfileValue } from './validationEngine.js';

// Never emit arbitrary webpage prose: it can contain personal data or credentials.
const safeWords = new Set('first given middle initial last family surname full complete name applicant father fathers mother mothers parent guardian email e mail mobile telephone phone cell permanent correspondence current mailing address line 1 2 city state province country zip postal code class 10 12 10th 12th undergraduate degree university institution percentage cgpa sgpa marks obtained maximum gender sex date of birth'.split(' '));
export function matchingDiagnostic(field, decision, profile, candidate) {
  const label = normalizeIdentityText(field.label);
  const canonicalKey = candidate?.canonicalKey || decision.canonicalKey;
  const raw = extractProfileValue(profile, canonicalKey, field).value;
  return {
    label: label && label.split(' ').every((word) => safeWords.has(word)) ? label : '[redacted label]',
    canonicalKey,
    method: decision.method,
    status: decision.status,
    reason: decision.reason,
    profileValueExists: raw !== null && raw !== undefined && String(raw).trim() !== ''
  };
}
