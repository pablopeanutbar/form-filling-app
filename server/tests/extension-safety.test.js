import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { extractFormFields } from '../../extension/content/extractor.js';
import { matchRequestSchema } from '../src/validators/autofill.validator.js';
import { matchFieldDeterministically } from '../src/services/matching/deterministicMatcher.js';
import { validateCandidate, isUnsupportedField } from '../src/services/matching/validationEngine.js';
import { matchFormFields } from '../src/services/matching/matching.service.js';

const profile = { personal: { fullName: 'Test Applicant', gender: 'female' }, contact: { contactEmail: 'applicant@example.test' }, education: [
  { id: 'school-1', qualificationLevel: '10th', institution: 'Test School', marksObtained: 420, maxMarks: 500, percentage: 84 }
] };
const decide = (field, data = profile) => validateCandidate({ fieldId: 'field', ...field }, matchFieldDeterministically(field), data);

test('Parent/father/guardian email never suggests the applicant email, including semantic candidates', () => {
  for (const field of [{ label: 'Parent email', type: 'email' }, { label: 'Email', section: 'Guardian information' }, { label: 'Email', name: 'fatherEmail' }]) {
    assert.notEqual(decide(field).status, 'matched');
    const decision = validateCandidate(field, { canonicalKey: 'contact.contactEmail', method: 'semantic_embedding', score: .99 }, profile);
    assert.equal(decision.value, null);
    assert.equal(decision.status, 'unmatched');
  }
  assert.equal(decide({ label: 'Applicant email', type: 'email' }).value, 'applicant@example.test');
});

test('Class 10 marks, maximum marks and percentage remain distinct in the actual pipeline', async () => {
  const fields = ['Class 10 marks obtained', 'Class 10 maximum marks', 'Class 10 percentage'].map((label, i) => ({ fieldId: String(i), label, type: 'number' }));
  const result = await matchFormFields(fields, profile);
  assert.deepEqual(result.results.map((r) => r.value), [420, 500, 84]);
  assert.ok(result.results.every((r) => r.status === 'matched' && r.educationRecordId === 'school-1'));
  const badCandidate = validateCandidate(fields[0], { canonicalKey: 'education.10th.percentage', method: 'semantic_embedding', score: .99 }, profile);
  assert.equal(badCandidate.value, null);
});

test('Missing marks are not replaced with percentages; duplicate records do not choose a first record', () => {
  const field = { label: 'Class 10 marks obtained', type: 'number' };
  const missing = decide(field, { ...profile, education: [{ ...profile.education[0], marksObtained: null }] });
  assert.equal(missing.status, 'needs_review'); assert.equal(missing.value, null);
  const duplicate = decide(field, { ...profile, education: [...profile.education, { ...profile.education[0], id: 'school-2' }] });
  assert.equal(duplicate.status, 'needs_review'); assert.equal(duplicate.value, null); assert.equal(duplicate.educationRecordId, undefined);
});

test('Destination numeric validation blocks text, infinities, bounds, and step violations', () => {
  assert.equal(decide({ label: 'Applicant name', type: 'number' }).value, null);
  for (const constraints of [{ max: '400' }, { min: '430' }, { step: '13' }, { pattern: '(a+)+$' }]) {
    assert.equal(decide({ label: 'Class 10 marks obtained', type: 'number', constraints }).status, 'needs_review');
  }
  assert.equal(decide({ label: 'Class 10 marks obtained', type: 'number' }, { ...profile, education: [{ ...profile.education[0], marksObtained: Infinity }] }).value, null);
});

test('Dropdowns require one enabled compatible option and preserve its actual value', () => {
  const field = { label: 'Gender', type: 'select' };
  for (const options of [[], [{ label: 'Male', value: 'M' }], [{ label: 'Female', value: 'F', disabled: true }], [{ label: 'Female', value: 'F' }, { label: 'Female', value: '2' }]]) {
    const result = decide({ ...field, options }); assert.equal(result.status, 'needs_review'); assert.equal(result.value, null);
  }
  const result = decide({ ...field, options: [{ label: 'Female', value: 'F' }] });
  assert.equal(result.value, 'F'); assert.equal(result.displayValue, 'Female');
  assert.equal(decide({ ...field, options: ['Female'], optionsTruncated: true }).value, null);
});

test('Backend independently rejects sensitive and unsupported fields', () => {
  for (const field of [{ type: 'password' }, { label: 'Credit card number' }, { name: 'cc_number' }, { label: 'One time password' }, { label: 'CVV' }, { label: 'CAPTCHA' }, { type: 'checkbox' }]) {
    assert.equal(isUnsupportedField({ type: 'text', ...field }).unsupported, true);
  }
});

test('High semantic similarity still requires review, and incompatible semantic values are withheld', () => {
  const candidate = { canonicalKey: 'personal.fullName', method: 'semantic_embedding', score: .99 };
  assert.equal(validateCandidate({ label: 'Name', type: 'text' }, candidate, profile).status, 'needs_review');
  assert.equal(validateCandidate({ label: 'Name', type: 'number' }, candidate, profile).value, null);
});

test('Both extraction implementations preserve constraints and choices without entered values', async () => {
  const html = '<form><label for="n">Class 10 marks obtained</label><input id="n" type="number" min="0" max="500" step="1" value="secret-entered-answer"><label for="g">Gender</label><select id="g"><option value="">Choose</option><option value="F">Female</option><option value="M" disabled>Male</option></select><input type="password" value="private-password"><input name="otp"><label for="t">Name</label><input id="t" minlength="2" maxlength="50" pattern="[A-Z]+"></form>';
  const dom = new JSDOM(html, { url: 'https://example.test', runScripts: 'outside-only' });
  try {
    const moduleResult = extractFormFields(dom.window.document);
    let listener;
    dom.window.chrome = { runtime: { id: 'former-test', getURL: (path) => 'chrome-extension://former-test/' + path, onMessage: { addListener: (fn) => { listener = fn; } } } };
    dom.window.eval(readFileSync(new URL('../../extension/content/content.js', import.meta.url), 'utf8'));
    let injected;
    listener({ type: 'EXTRACT_FIELDS' }, { id: 'former-test', url: 'chrome-extension://former-test/background/service-worker.js' }, (data) => { injected = JSON.parse(JSON.stringify(data)); });
    for (const result of [moduleResult, injected]) {
      assert.equal(result.fields.length, 3);
      const parsed = matchRequestSchema.parse({ fields: result.fields });
      assert.equal(parsed.fields[0].constraints.max, '500');
      assert.equal(parsed.fields[0].constraints.step, '1');
      assert.deepEqual(parsed.fields[1].options, [{ label: 'Female', value: 'F', disabled: false }, { label: 'Male', value: 'M', disabled: true }]);
      assert.equal(parsed.fields[2].constraints.minlength, 2);
      assert.equal(parsed.fields[2].constraints.pattern, '[A-Z]+');
      assert.doesNotMatch(JSON.stringify(result), /secret-entered-answer|private-password/);
    }
    assert.equal(matchRequestSchema.safeParse({ fields: [{ label: 'Name', value: 'do not send' }] }).success, false);
    assert.equal(matchRequestSchema.safeParse({ fields: [{ fieldId: 'same' }, { fieldId: 'same' }] }).success, false);
  } finally { dom.window.close(); }
});
