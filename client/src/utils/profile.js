// Only editable API fields are serialized; record IDs and timestamps stay out of PATCH bodies.
const field = (name, label, maxLength, extra = {}) => ({ name, label, maxLength, ...extra });
export const personalFields = [
  field('fullName', 'Full legal name', 120, { autoComplete: 'name', wide: true, hint: 'Use the name shown on your official documents.' }),
  field('dateOfBirth', 'Date of birth', 30, { type: 'date', autoComplete: 'bday' }),
  field('gender', 'Gender', null, { options: [['male', 'Male'], ['female', 'Female'], ['other', 'Other'], ['prefer_not_to_say', 'Prefer not to say']] }),
  field('fatherName', 'Father’s name', 120), field('motherName', 'Mother’s name', 120),
  field('guardianName', 'Guardian’s name', 120), field('guardianRelation', 'Relationship to guardian', 60)
];
export const contactFields = [
  field('contactEmail', 'Contact email', 255, { type: 'email', autoComplete: 'email', wide: true, hint: 'The email you want to use on applications. This won’t change your sign-in email.' }),
  field('primaryPhone', 'Phone number', 25, { type: 'tel', autoComplete: 'tel', hint: 'Include a country code when needed.' }),
  field('alternatePhone', 'Alternate phone number', 25, { type: 'tel' })
];
export const addressFields = [
  field('addressLine1', 'Address line 1', 200, { wide: true, autoComplete: 'address-line1' }),
  field('addressLine2', 'Address line 2', 200, { wide: true, autoComplete: 'address-line2', hint: 'Apartment, floor, building, or other details.' }),
  field('city', 'City or town', 100, { autoComplete: 'address-level2' }), field('district', 'District', 100),
  field('state', 'State or province', 100, { autoComplete: 'address-level1' }), field('postalCode', 'Postal code', 20, { autoComplete: 'postal-code' }),
  field('country', 'Country', 100, { autoComplete: 'country-name' })
];
export const educationFields = [
  field('qualificationLevel', 'Qualification level', 100, { required: true, hint: 'For example: 10th, 12th, undergraduate, or postgraduate.' }),
  field('degreeName', 'Degree or examination', 150, { required: true, hint: 'For example: Bachelor of Science.' }),
  field('institution', 'School or institution', 200), field('boardOrUniversity', 'Board or university', 200),
  field('specialization', 'Specialization', 150), field('subjects', 'Subjects', null, { list: true, maxItems: 30, itemLength: 100, hint: 'Separate subjects with commas.' }),
  field('startDate', 'Start date', 30, { type: 'date' }), field('completionDate', 'Completion date', 30, { type: 'date' }),
  field('passingYear', 'Passing year', null, { type: 'number', min: 1900, max: 2100, step: 1 }),
  field('resultStatus', 'Result status', null, { required: true, options: [['passed', 'Passed'], ['appearing', 'Appearing'], ['awaited', 'Result awaited'], ['failed', 'Failed'], ['other', 'Other']] }),
  field('marksObtained', 'Marks obtained', null, { type: 'number', min: 0 }),
  field('maxMarks', 'Maximum marks', null, { type: 'number', min: 0, positive: true }),
  field('percentage', 'Percentage', null, { type: 'number', min: 0, max: 100 }),
  field('cgpa', 'CGPA', null, { type: 'number', min: 0 }),
  field('cgpaScale', 'CGPA scale', null, { type: 'number', min: 0, positive: true, hint: 'For example: 10 or 4.' }),
  field('sgpa', 'SGPA', null, { type: 'number', min: 0 })
];
export const linkFields = ['linkedin', 'github', 'portfolio', 'other'].map((name) => field(name,
  ({ linkedin: 'LinkedIn', github: 'GitHub', portfolio: 'Portfolio or website', other: 'Other profile' })[name], 300, { type: 'url', placeholder: 'https://' }));
export const workFields = [field('jobTitle', 'Job title', 120, { required: true }), field('company', 'Organization', 120, { required: true }),
  field('location', 'Location', 100), field('startDate', 'Start date', 30, { type: 'date' }), field('endDate', 'End date', 30, { type: 'date' }),
  field('description', 'Description', 1000, { textarea: true, wide: true })];

export const draftFrom = (fields, data = {}) => Object.fromEntries(fields.map((f) => [f.name,
  f.list ? (data[f.name] || []).join(', ') : data[f.name] == null ? '' : String(data[f.name])]));
export const payloadFrom = (fields, draft) => Object.fromEntries(fields.map((f) => {
  const value = String(draft[f.name] ?? '').trim();
  return [f.name, f.list ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : value === '' ? null : f.type === 'number' ? Number(value) : value];
}));
export function validateFields(fields, draft) {
  const errors = {};
  for (const f of fields) {
    const value = String(draft[f.name] ?? '').trim();
    if (!value) { if (f.required) errors[f.name] = 'Please fill in this field.'; continue; }
    if (f.maxLength && value.length > f.maxLength) errors[f.name] = `Use ${f.maxLength} characters or fewer.`;
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[f.name] = 'Enter a valid email address.';
    if (f.type === 'tel' && (!/^[+\d\s().-]+$/.test(value) || value.replace(/\D/g, '').length < 5)) errors[f.name] = 'Enter a phone number with at least 5 digits.';
    if (f.type === 'url') {
      try { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); }
      catch { errors[f.name] = 'Enter a full website address starting with https:// or http://.'; }
    }
    if (f.type === 'date') {
      const date = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) errors[f.name] = 'Enter a valid date.';
      else if (f.name === 'dateOfBirth' && date > new Date()) errors[f.name] = 'Date of birth cannot be in the future.';
    }
    if (f.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max) || (f.positive && n <= 0) || (f.step === 1 && !Number.isInteger(n))) {
        errors[f.name] = f.name === 'passingYear' ? 'Enter a whole year from 1900 to 2100.' : f.positive ? 'Enter a number greater than zero.' : `Enter a number ${f.max != null ? `from ${f.min} to ${f.max}` : 'zero or greater'}.`;
      }
    }
    if (f.options && !f.options.some(([key]) => key === value)) errors[f.name] = 'Choose an available option.';
    if (f.list) {
      const items = value.split(',').map((s) => s.trim()).filter(Boolean);
      if (items.length > f.maxItems || items.some((s) => s.length > f.itemLength)) errors[f.name] = `Use up to ${f.maxItems} entries, each ${f.itemLength} characters or fewer.`;
    }
  }
  for (const [low, high, message] of [
    ['marksObtained', 'maxMarks', 'Marks obtained cannot exceed maximum marks.'],
    ['cgpa', 'cgpaScale', 'CGPA cannot exceed its scale.']
  ]) if (draft[low] !== '' && draft[low] != null && draft[high] !== '' && draft[high] != null && Number(draft[low]) > Number(draft[high])) errors[low] = message;
  const end = draft.completionDate || draft.endDate;
  if (draft.startDate && end && end < draft.startDate) errors[draft.completionDate ? 'completionDate' : 'endDate'] = 'Choose a date on or after the start date.';
  return errors;
}
export function profileReadiness(profile) {
  const p = profile || {};
  const addressReady = (value) => ['addressLine1', 'city', 'country', 'postalCode'].every((key) => Boolean(value?.[key]?.trim()));
  return [
    { key: 'personal', label: 'Personal details', ready: Boolean(p.personal?.fullName && p.personal?.dateOfBirth), detail: 'Full name and date of birth' },
    { key: 'contact', label: 'Contact information', ready: Boolean(p.contact?.contactEmail && p.contact?.primaryPhone), detail: 'Contact email and phone number' },
    { key: 'permanent', label: 'Permanent address', ready: addressReady(p.addresses?.permanent), detail: 'Address, city, country, and postal code' },
    { key: 'education', label: 'Education', ready: Boolean(p.education?.length), detail: 'At least one saved qualification' }
  ];
}
export const friendlyError = (error, action = 'save your changes') => error?.status === 401
  ? 'Your sign-in has expired. Keep a copy of your changes and sign in again.'
  : error?.status === 429 ? 'There have been too many requests. Please wait a moment and try again.'
  : `We couldn’t ${action}. Your changes are still here. Please try again.`;
