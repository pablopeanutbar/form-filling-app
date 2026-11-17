// Exact identities constrain both deterministic and semantic candidates.
export const normalizeIdentityText = (text = '') => String(text)
  .replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  .replace(/[_\W]+/g, ' ').replace(/\s+/g, ' ').trim();

const qualificationLevels = [
  ['10th', /\b(10th|class 10|class x|matric|matriculation|ssc)\b/],
  ['12th', /\b(12th|class 12|class xii|intermediate|hsc|higher secondary)\b/],
  ['undergraduate', /\b(undergraduate|graduation|bachelor|ug|b tech|b sc)\b/],
  ['postgraduate', /\b(postgraduate|post graduation|master|masters|pg|m tech|m sc)\b/]
];
const qualifyingField = /\bqualifying (?:exam(?:ination)?|degree|qualification)\b/;
const familyHeading = /(?:^|\s|\d)parents? and guardians?\b/;

function qualifyingRule(field) {
  // Only instructions explicitly attached to this field may define which
  // qualification is eligible. Page titles describe the programme, not the source.
  const clauses = String(field.context?.instructions || '').split(/[.;\n]/);
  const levels = new Set();
  let completed = false;
  for (const clause of clauses) {
    if (/\b(?:ignore|disregard|override|or|unless|except)\b/i.test(clause)) continue;
    const definition = /\bqualifying\s+(?:exam(?:ination)?|degree|qualification)\s*(?:=|:|is\b|means\b|must be\b)\s*(.*)/i.exec(clause);
    if (!definition) continue;
    const target = normalizeIdentityText(definition[1]);
    if (/\b(?:not|ongoing|appearing)\b/.test(target)) continue;
    for (const [level, pattern] of qualificationLevels) if (pattern.test(target)) levels.add(level);
    if (/\b(?:completed|passed)\b/.test(target)) completed = true;
  }
  return levels.size === 1 ? { level: [...levels][0], completed } : null;
}

export function identifyField(field) {
  const text = normalizeIdentityText([field.label, field.name, field.id, field.placeholder].filter(Boolean).join(' '));
  const headings = [field.section, ...(field.context?.headings || [])].filter(Boolean).map(normalizeIdentityText);
  const context = `${headings.join(' ')} ${text}`;
  const has = (pattern) => pattern.test(context);
  const identity = (key) => ({ key });
  const blocked = (reason) => ({ blocked: true, reason });
  const roleContext = [text, ...headings.filter((heading) => !familyHeading.test(heading))].join(' ');
  const roles = ['father', 'mother', 'guardian'].filter((role) => new RegExp(`\\b${role}(?:s)?\\b`).test(roleContext));
  const otherPerson = /\b(parent|parents|spouse|emergency|referee|reference)\b/.test(roleContext)
    || (!roles.length && headings.some((heading) => familyHeading.test(heading)));
  const label = normalizeIdentityText(field.label);
  if (/\bage\b/.test(label)) return blocked('Age requires a valid date of birth and reference date.');
  if (/\b(?:declaration|declare|certify|consent|attest|legally authorized|criminal conviction|disability status|debarred|debarment|roll number|application number|family income|household income)\b/.test(text)) {
    return blocked('Complete this declaration yourself.');
  }
  const birthContext = /\b(date of birth|birth date|birthdate|dob|d o b)\b/.test(context);
  if (birthContext && (roles.length || otherPerson)) return blocked('A separate date of birth is not saved for this person.');
  const birthParts = Object.entries({ Month: /^(?:mm|month)$/, Day: /^(?:dd|day)$/, Year: /^(?:yy|yyyy|year)$/ })
    .filter(([part, shorthand]) => {
      const word = part.toLowerCase();
      return new RegExp(`\\b(?:(?:birth|dob) ?${word}|${word} of birth)\\b`).test(text) || (birthContext &&
        (new RegExp(`\\b${word}\\b`).test(text) || [field.name, field.id].some((value) =>
          shorthand.test(normalizeIdentityText(value).replace(/^\d+\s*/, '')))));
    });
  if (birthParts.length || (['select', 'radio'].includes(field.type) && birthContext)) {
    if (roles.length || otherPerson || birthParts.length !== 1) return blocked('The date of birth component is unclear.');
    return identity('personal.birth' + birthParts[0][0]);
  }
  if (/^(title|honorific|age|birth place|place of birth|income|custom message|comments?)$/.test(label)) {
    return blocked('There is no explicit saved answer for this field.');
  }
  if (!roles.length && !otherPerson && !has(/\b(previous|former|desired|applied|target|prospective)\b/)) {
    if (/^(company|company name|employer|employer name|current employer|current company)$/.test(label)) return identity('professional.currentWork.company');
    if (/^(position|job title|current position|current job title)$/.test(label)) return identity('professional.currentWork.jobTitle');
    if (/^(website|web site|personal website|portfolio website|portfolio url)$/.test(label)) return identity('professional.profileLinks.portfolio');
  }
  const nameParts = [
    ['firstName', /\b(first name|firstname|given name|forename)\b/],
    ['middleInitial', /\b(middle initial|middle i)\b/],
    ['middleName', /\bmiddle name\b/],
    ['lastName', /\b(last name|lastname|family name|surname)\b/],
    ['fullName', /\b(full name|fullname|complete name|name in full)\b/]
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
      if (label === 'name') return has(/\b(applicant|candidate|student|personal)\b/)
        ? identity('personal.fullName') : blocked('The form does not identify whose name it asks for.');
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
    ['addressLine2', /\b(address line 2|address 2|address2)\b/],
    ['addressLine1', /\b(address line 1|address 1|address1|street address)\b/]
  ].filter(([, pattern]) => pattern.test(text));
  if (addressParts.length) {
    const permanent = has(/\bpermanent\b/);
    const correspondence = has(/\b(correspondence|current|present|mailing|communication)\b/);
    if (permanent && correspondence || addressParts.length > 1) return blocked('Conflicting address identities.');
    return identity(`addresses.${permanent ? 'permanent' : correspondence ? 'correspondence' : 'unspecified'}.${addressParts[0][0]}`);
  }
  const explicitLevels = qualificationLevels.filter(([, pattern]) => pattern.test(text));
  const qualifying = qualifyingField.test(text) || (/\beligibility\b/.test(context) && qualifyingField.test(normalizeIdentityText(field.context?.instructions)));
  const rule = qualifying ? qualifyingRule(field) : null;
  if (qualifying && (!rule || explicitLevels.some(([level]) => level !== rule.level))) {
    return blocked('The qualifying examination is unclear.');
  }
  const levels = rule ? [[rule.level]] : qualificationLevels.filter(([, pattern]) => pattern.test(context));
  if (!levels.length && label === 'degree university') return identity('education.undergraduate.boardOrUniversity');
  const metrics = [
    ['percentage', /\b(percentage|percent|pct)\b/], ['sgpa', /\b(sgpa|semester grade point)\b/],
    ['cgpa', /\b(cgpa|gpa|cumulative grade point)\b/],
    ['maxMarks', /\b(maximum marks|max marks|marks out of|total marks)\b/],
    ['marksObtained', /\b(marks obtained|obtained marks|marks scored|marks secured)\b/]
  ].filter(([, pattern]) => pattern.test(text));
  if (/%/.test(field.label || '') && !metrics.some(([prop]) => prop === 'percentage')) metrics.push(['percentage']);
  if (metrics.length || levels.length) {
    if (levels.length !== 1) return blocked('Qualification identity is missing or ambiguous.');
    if (metrics.length > 1) return blocked('Conflicting education score identities.');
    let prop = metrics[0]?.[0];
    if (prop === 'cgpa' && /\b(scale|out of|max)\b/.test(text)) prop = 'cgpaScale';
    if (!prop) {
      if (/\b(university|board)\b/.test(text)) prop = 'boardOrUniversity';
      else if (/\b(institution|institute|college|school)\b/.test(text)) prop = 'institution';
      else if (/\b(specialization|branch|major|discipline|stream)\b/.test(text)) prop = 'specialization';
      else if (/\b(passing year|year of passing|graduation year)\b/.test(text)) prop = 'passingYear';
      else if (qualifying || /\b(degree name|name of degree|course name|degree awarded)\b/.test(text) || text === 'degree') prop = 'degreeName';
    }
    if (prop) return { ...identity(`education.${levels[0][0]}.${prop}`), ...(rule?.completed ? { completedQualification: true } : {}) };
  }
  return null;
}
