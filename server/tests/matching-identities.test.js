import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { extractFormFields } from '../../extension/content/extractor.js';
import { matchFieldDeterministically as match } from '../src/services/matching/deterministicMatcher.js';
import { validateCandidate, extractProfileValue } from '../src/services/matching/validationEngine.js';
import { matchFormFields } from '../src/services/matching/matching.service.js';
import { personalSchema } from '../src/validators/profile.validator.js';
import { Profile } from '../src/models/profile.model.js';
import { matchingDiagnostic } from '../src/services/matching/diagnostics.js';

const profile = {
  personal: { firstName: 'Ada', middleName: 'Marie', lastName: 'Lovelace', fullName: 'Ada Marie Lovelace', fatherName: 'Test Father', motherName: 'Test Mother', guardianName: 'Test Guardian', gender: 'female', dateOfBirth: '1990-04-02' },
  contact: { contactEmail: 'ada@example.test', primaryPhone: '+15551234567' },
  addresses: { permanent: { addressLine1: '12 Test Road', addressLine2: 'Unit 3', city: 'Test City', state: 'Test State', country: 'Test Country', postalCode: '00123' } },
  education: ['10th', '12th', 'undergraduate'].map((qualificationLevel, i) => ({ id: String(i), qualificationLevel, degreeName: 'Synthetic Degree', institution: 'Test College', boardOrUniversity: 'Test Board', marksObtained: 400 + i, maxMarks: 500, percentage: 80 + i, cgpa: 8 + i / 10, sgpa: 7 + i / 10 }))
};
const decide = (field, data = profile) => validateCandidate(field, match(field), data);
const semantic = (field, canonicalKey) => validateCandidate(field, { canonicalKey, method: 'semantic_embedding', score: .99 }, profile);

test('explicit name components persist through API validation and Mongoose without splitting full names', () => {
  const personal = personalSchema.parse(profile.personal);
  const model = new Profile({ personal });
  for (const key of ['firstName', 'middleName', 'lastName']) assert.equal(model.personal[key], profile.personal[key]);
  for (const [label, value] of [['First Name', 'Ada'], ['Given Name', 'Ada'], ['Middle Name', 'Marie'], ['Middle Initial', 'M'], ['Last Name', 'Lovelace'], ['Family Name', 'Lovelace'], ['Surname', 'Lovelace'], ['Complete Name', 'Ada Marie Lovelace']]) {
    assert.equal(decide({ label }).status, 'matched', label);
    assert.equal(decide({ label }).value, value, label);
  }
  assert.equal(decide({ name: 'first_name' }).value, 'Ada');
  assert.equal(decide({ name: 'lastName' }).value, 'Lovelace');
  const onlyFull = { personal: { fullName: 'Do Not Split' } };
  assert.equal(decide({ label: 'First Name' }, onlyFull).value, null);
  assert.equal(decide({ label: 'First Name' }, onlyFull).status, 'needs_review');
  assert.equal(semantic({ label: 'First Name' }, 'personal.fullName').value, null);
  assert.equal(extractProfileValue({ personal: { firstName: 'Ada', lastName: 'Lovelace' } }, 'personal.fullName').value, 'Ada Lovelace');
});

test('person identity, conflicting metadata and multiple middle names abstain safely', () => {
  for (const [label, value] of [["Father's Name", 'Test Father'], ["Mother's Name", 'Test Mother'], ['Guardian Name', 'Test Guardian']]) assert.equal(decide({ label }).value, value);
  for (const label of ['Parent Name', 'Father / Mother Name', 'Parent / Guardian Name', 'Father First Name', 'Guardian Email', 'Parent Phone']) assert.equal(decide({ label }).value, null, label);
  assert.equal(decide({ label: 'First Name', name: 'lastName' }).value, null);
  assert.equal(decide({ label: 'Middle Initial' }, { personal: { middleName: 'Mary Jane' } }).value, null);
  assert.equal(semantic({ label: 'First Name', section: 'Father' }, 'personal.firstName').value, null);
});

test('RoboForm relevant-field fixture traverses table extraction and final response', async () => {
  // Representative labels from https://www.roboform.com/filling-test-all-fields;
  // synthetic markup/profile, not a claim of live browser acceptance.
  const expected = [['First Name', 'Ada'], ['Middle Initial', 'M'], ['Last Name', 'Lovelace'], ['Full Name', 'Ada Marie Lovelace'], ['Address Line 1', '12 Test Road'], ['Address Line 2', 'Unit 3'], ['City', 'Test City'], ['State / Province', 'Test State'], ['Country', 'Test Country'], ['Zip', '00123'], ['Cell Phone', '+15551234567'], ['E-mail', 'ada@example.test'], ['Sex', 'female']];
  const dom = new JSDOM(`<table>${expected.map(([label], i) => `<tr><td>${label}</td><td><input id="f${i}"></td></tr>`).join('')}</table>`);
  const extracted = extractFormFields(dom.window.document);
  const fields = Array.isArray(extracted) ? extracted : extracted.fields;
  assert.deepEqual(fields.map((f) => f.label), expected.map(([label]) => label));
  const result = await matchFormFields(fields, profile);
  assert.deepEqual(result.results.map((r) => r.value), expected.map(([, value]) => value));
  assert.ok(result.results.every((r) => r.status === 'matched'));
  dom.window.close();
});

test('addresses resolve only a unique saved value and preserve line identities', () => {
  const data = { ...profile, addresses: { ...profile.addresses, correspondence: { city: 'Other City', addressLine2: 'Unit 8' } } };
  assert.equal(decide({ label: 'City' }, data).value, null);
  assert.equal(decide({ label: 'City', section: 'Permanent address' }, data).value, 'Test City');
  assert.equal(decide({ label: 'Address Line 2', section: 'Mailing address' }, data).value, 'Unit 8');
  assert.equal(semantic({ label: 'Mailing City' }, 'addresses.permanent.city').value, null);
});

test('education metrics, institution and qualification records stay separate', () => {
  for (const [level, i] of [['Class 10', 0], ['Class 12', 1], ['Undergraduate', 2]]) {
    for (const [label, prop] of [['Marks obtained', 'marksObtained'], ['Maximum marks', 'maxMarks'], ['Percentage', 'percentage'], ['CGPA', 'cgpa'], ['SGPA', 'sgpa'], ['University', 'boardOrUniversity'], ['Institution', 'institution']]) {
      const result = decide({ label, section: level });
      assert.equal(result.value, profile.education[i][prop], `${level} ${label}`);
      assert.equal(result.status, 'matched');
      assert.equal(result.educationRecordId, String(i));
    }
  }
  assert.equal(decide({ label: 'Degree university' }).value, 'Test Board');
  assert.equal(semantic({ label: 'Undergraduate SGPA' }, 'education.undergraduate.cgpa').value, null);
  assert.equal(decide({ label: 'Class 10 / Class 12 percentage' }).value, null);
  assert.equal(decide({ label: 'Undergraduate percentage' }, { ...profile, education: [...profile.education, { ...profile.education[2], id: 'duplicate' }] }).value, null);
});

test('destination compatibility and missing values gate success', () => {
  assert.equal(decide({ label: 'First Name', type: 'number' }).value, null);
  assert.equal(decide({ label: 'First Name', constraints: { maxlength: 2 } }).value, null);
  assert.equal(decide({ label: 'Gender', type: 'select', options: [{ label: 'Female', value: 'F' }] }).value, 'F');
  assert.equal(decide({ label: 'Gender', type: 'select', options: [{ label: 'Male', value: 'M' }] }).value, null);
  assert.equal(decide({ label: 'Date of Birth', type: 'date' }).value, '1990-04-02');
  for (const label of ['Home Phone', 'Work Telephone', 'Fax']) assert.equal(decide({ label }).value, null);
});

test('diagnostics explain decisions without profile values or arbitrary labels', () => {
  const decision = decide({ label: 'First Name' });
  const diagnostic = matchingDiagnostic({ label: 'First Name' }, decision, profile);
  assert.equal(diagnostic.label, 'first name');
  assert.equal(diagnostic.profileValueExists, true);
  assert.ok(!JSON.stringify(diagnostic).includes('Ada'));
  assert.equal(matchingDiagnostic({ label: 'secret@example.test' }, decision, profile).label, '[redacted label]');
});
