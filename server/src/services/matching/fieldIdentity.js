// Exact identities constrain both deterministic and semantic candidates.
export const normalizeIdentityText = (text = '') => String(text)
  .replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  .replace(/[_\W]+/g, ' ').replace(/\s+/g, ' ').trim();

export function identifyField(field) {
  const text = normalizeIdentityText([field.label, field.name, field.id, field.placeholder].filter(Boolean).join(' '));
  const context = `${normalizeIdentityText(field.section)} ${text}`;
  const has = (pattern) => pattern.test(context);
  const identity = (key) => ({ key });
  const blocked = (reason) => ({ blocked: true, reason });
  const roles = ['father', 'mother', 'guardian'].filter((role) => new RegExp(`\\b${role}(?:s)?\\b`).test(context));
  const otherPerson = has(/\b(parent|spouse|emergency|referee|reference)\b/);
  const nameParts = [
    ['firstName', /\b(first name|given name|forename)\b/],
    ['middleInitial', /\bmiddle initial\b/],
    ['middleName', /\bmiddle name\b/],
    ['lastName', /\b(last name|family name|surname)\b/],
    ['fullName', /\b(full name|complete name|name in full)\b/]
  ].filter(([, pattern]) => pattern.test(text));
  if (nameParts.length || /\bname\b/.test(text)) {
    if (roles.length > 1 || otherPerson) return blocked('The person requested is ambiguous or unsupported.');
    if (roles.length) {
      if (nameParts.some(([key]) => key !== 'fullName')) return blocked('Separate parent name components are not saved.');
      return identity(`personal.${roles[0]}Name`);
    }
    if (!has(/\b(school|college|university|institution|company|degree|course|bank)\b/)) {
      if (nameParts.length > 1) return blocked('Conflicting name component identities.');
      if (nameParts.length) return identity(`personal.${nameParts[0][0]}`);
    }
  }
  if (has(/\b(e mail|email|phone|telephone|mobile|cell|fax)\b/) || ['email', 'tel'].includes(field.type)) {
    if (roles.length || otherPerson) return blocked('Separate parent or other-person contact details are not saved.');
    if (has(/\b(fax|work|office|business|home)\b/)) return blocked('A separately identified home, work or fax number is not saved.');
    if (has(/\b(e mail|email)\b/) || field.type === 'email') return identity('contact.contactEmail');
    return identity(has(/\b(alternate|alternative|secondary)\b/) ? 'contact.alternatePhone' : 'contact.primaryPhone');
  }
  const addressParts = [
    ['postalCode', /\b(zip|postal code|postcode|pin code|pincode)\b/],
    ['city', /\b(city|town)\b/], ['state', /\b(state|province)\b/],
    ['country', /\bcountry\b/], ['district', /\bdistrict\b/],
    ['addressLine2', /\baddress line 2\b/],
    ['addressLine1', /\b(address line 1|street address)\b/]
  ].filter(([, pattern]) => pattern.test(text));
  if (addressParts.length) {
    const permanent = has(/\bpermanent\b/);
    const correspondence = has(/\b(correspondence|current|present|mailing|communication)\b/);
    if (permanent && correspondence || addressParts.length > 1) return blocked('Conflicting address identities.');
    return identity(`addresses.${permanent ? 'permanent' : correspondence ? 'correspondence' : 'unspecified'}.${addressParts[0][0]}`);
  }
  const levels = [
    ['10th', /\b(10th|class 10|class x|matric|matriculation|ssc)\b/],
    ['12th', /\b(12th|class 12|class xii|intermediate|hsc|higher secondary)\b/],
    ['undergraduate', /\b(undergraduate|graduation|bachelor|ug|degree|b tech|b sc)\b/]
  ].filter(([, pattern]) => pattern.test(context));
  const metrics = [
    ['percentage', /\b(percentage|percent|pct)\b/], ['sgpa', /\b(sgpa|semester grade point)\b/],
    ['cgpa', /\b(cgpa|gpa|cumulative grade point)\b/],
    ['maxMarks', /\b(maximum marks|max marks|marks out of|total marks)\b/],
    ['marksObtained', /\b(marks obtained|obtained marks|marks scored|marks secured)\b/]
  ].filter(([, pattern]) => pattern.test(text));
  if (metrics.length || levels.length) {
    if (levels.length !== 1 || has(/\b(postgraduate|master|pg)\b/)) return blocked('Qualification identity is missing or ambiguous.');
    if (metrics.length > 1) return blocked('Conflicting education score identities.');
    let prop = metrics[0]?.[0];
    if (prop === 'cgpa' && /\b(scale|out of|max)\b/.test(text)) prop = 'cgpaScale';
    if (!prop) {
      if (/\b(university|board)\b/.test(text)) prop = 'boardOrUniversity';
      else if (/\b(institution|institute|college|school)\b/.test(text)) prop = 'institution';
      else if (/\b(specialization|branch|major|discipline|stream)\b/.test(text)) prop = 'specialization';
      else if (/\b(passing year|year of passing|graduation year)\b/.test(text)) prop = 'passingYear';
      else if (/\b(degree name|name of degree|course name)\b/.test(text) || text === 'degree') prop = 'degreeName';
    }
    if (prop) return identity(`education.${levels[0][0]}.${prop}`);
  }
  return null;
}
