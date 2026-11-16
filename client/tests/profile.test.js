import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { personalFields, contactFields, educationFields, addressFields, workFields, draftFrom, payloadFrom, validateFields, profileReadiness } from '../src/utils/profile.js';
import { updateProfileSchema, educationSchema } from '../../server/src/validators/profile.validator.js';
import { setApiBaseUrl, clearCsrfToken } from '../src/api/client.js';
import { getProfile, saveProfile, saveQualification, removeQualification } from '../src/api/profile.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; clearCsrfToken(); });
test('Readiness uses saved essentials, not account existence or invented percentages', () => {
  assert.equal(profileReadiness({}).filter((x) => x.ready).length, 0);
  assert.equal(profileReadiness({ personal: { fullName: 'Synthetic Applicant', dateOfBirth: '2000-01-01' }, contact: { contactEmail: 'synthetic@example.com', primaryPhone: '+91 9000000000' }, addresses: { permanent: { addressLine1: 'Test road', city: 'Test city', country: 'India', postalCode: '000000' } }, education: [{ id: 'one' }] }).filter((x) => x.ready).length, 4);
});
test('Optional clearing and numeric zero preserve the API contract', () => {
  const personal = payloadFrom(personalFields, draftFrom(personalFields, { fullName: '   ', id: 'private' }));
  assert.equal(personal.fullName, null);
  assert.ok(!('id' in personal));
  assert.equal(updateProfileSchema.safeParse({ personal }).success, true);
  const draft = { ...draftFrom(educationFields), qualificationLevel: '10th', degreeName: 'School examination', resultStatus: 'awaited', percentage: '0', subjects: 'Math, English' };
  const payload = payloadFrom(educationFields, draft);
  assert.equal(payload.percentage, 0);
  assert.deepEqual(payload.subjects, ['Math', 'English']);
  assert.equal(educationSchema.safeParse(payload).success, true);
});
test('Client validation rejects impossible dates, contradictory grades and invalid URLs without conversions', () => {
  assert.ok(validateFields(personalFields, { dateOfBirth: '2001-02-30' }).dateOfBirth);
  const draft = { ...draftFrom(educationFields), qualificationLevel: 'undergraduate', degreeName: 'Science', resultStatus: 'passed', marksObtained: '500', maxMarks: '100', cgpa: '12', cgpaScale: '10', passingYear: '2020.5', startDate: '2024-01-01', completionDate: '2023-01-01' };
  const errors = validateFields(educationFields, draft);
  for (const key of ['marksObtained', 'cgpa', 'passingYear', 'completionDate']) assert.ok(errors[key]);
  assert.equal(payloadFrom(educationFields, draft).percentage, null);
  assert.ok(validateFields(contactFields, { contactEmail: 'invalid' }).contactEmail);
  assert.ok(validateFields(workFields, { jobTitle: ' ', company: ' ' }).jobTitle);
});
test('Address payloads contain only the intended editable address', () => {
  const value = payloadFrom(addressFields, draftFrom(addressFields, { addressLine1: 'Synthetic road', _id: 'private' }));
  const patch = { addresses: { correspondence: value } };
  assert.equal(updateProfileSchema.safeParse(patch).success, true);
  assert.ok(!('permanent' in patch.addresses));
});
test('Profile services use existing endpoints, preserve IDs, and recover JSON writes after CSRF expiry', async () => {
  setApiBaseUrl('http://fixture.invalid');
  const calls = [];
  let expired = true;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, ...options });
    if (url.endsWith('/csrf-token')) return Response.json({ success: true, data: { csrfToken: 'test-token' } });
    if (options.method === 'PATCH' && expired) { expired = false; return Response.json({ error: { code: 'CSRF_INVALID' } }, { status: 403 }); }
    const data = url.includes('/education') ? { qualification: { id: 'record-2', degreeName: 'Synthetic degree' } } : { profile: { id: 'profile-1', personal: { fullName: 'Synthetic Applicant' } } };
    return Response.json({ success: true, data });
  };
  await getProfile();
  await saveProfile({ personal: { fullName: 'Synthetic Applicant' } });
  await saveQualification({ degreeName: 'Synthetic degree' }, 'record-2');
  await removeQualification('record-2');
  const writes = calls.filter((call) => ['PATCH', 'DELETE'].includes(call.method));
  assert.equal(writes[1].headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(writes[1].body), { personal: { fullName: 'Synthetic Applicant' } });
  assert.ok(writes[2].url.endsWith('/education/record-2'));
  assert.ok(writes[3].url.endsWith('/education/record-2'));
  assert.equal(writes[3].method, 'DELETE');
  assert.ok(writes.every((call) => call.credentials === 'include'));
});
test('Unconfirmed saves are errors and never reported as successful', async () => {
  globalThis.fetch = async (url) => Response.json(url.endsWith('/csrf-token') ? { success: true, data: { csrfToken: 'test-token' } } : { success: true, data: {} });
  await assert.rejects(() => saveProfile({ personal: {} }), /not confirmed/);
  await assert.rejects(() => saveQualification({}), /not confirmed/);
});
