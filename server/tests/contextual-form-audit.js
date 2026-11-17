// Run from the repository root with the path to the synthetic admissions HTML.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { matchFormFields } from '../src/services/matching/matching.service.js';
import { matchFieldDeterministically } from '../src/services/matching/deterministicMatcher.js';
import { matchRequestSchema } from '../src/validators/autofill.validator.js';
import { Profile } from '../src/models/profile.model.js';
import { buildCloudBatch } from '../src/services/matching/geminiMatcher.js';

const source = (path) => readFileSync(new URL('../../extension/' + path, import.meta.url), 'utf8');
const age = new Date().getUTCFullYear() - 2000;
const fixture = {
  personal: { firstName: 'Avery', middleName: 'Dale', lastName: 'Example', dateOfBirth: '2000-01-01', fatherName: 'Morgan Example', motherName: 'Robin Example' },
  education: [
    { qualificationLevel: 'Class XII', degreeName: 'Higher Secondary', boardOrUniversity: 'Synthetic Board', percentage: 84.25, passingYear: 2018, resultStatus: 'passed' },
    { qualificationLevel: 'Bachelor', degreeName: 'B.Sc.', boardOrUniversity: 'Example University', percentage: 91.5, passingYear: 2022, resultStatus: 'passed' },
    { qualificationLevel: 'Postgraduate', degreeName: 'M.Sc.', percentage: 99, resultStatus: 'appearing' }
  ],
  addresses: { permanent: { addressLine1: '1 Example Lane', city: 'Example City', postalCode: '012345' },
    correspondence: { addressLine1: '2 Sample Road', city: 'Sample City', postalCode: '654321' } }
};

const expected = {
  'app-given': ['personal.firstName', 'Avery'], 'app-family': ['personal.lastName', 'Example'],
  'app-full': ['personal.fullName', 'Avery Dale Example'], 'app-middleinitial': ['middle_initial', 'D'],
  'app-dob': ['personal.dateOfBirth', '2000-01-01'], 'app-birthyear': ['birth_year', '2000'],
  'app-age': ['age_from_dob', String(age)], 'app-age-cutoff': ['age_from_dob', '26'],
  'father-full': ['personal.fatherName', 'Morgan Example'], 'father-age': ['father age', null],
  'mother-full': ['personal.motherName', 'Robin Example'], 'mother-phone': ['mother phone', null],
  'hsc-score': ['education.12th.percentage', '84.25'], 'hsc-passing': ['education.12th.passingYear', '2018'],
  'hsc-board': ['education.12th.boardOrUniversity', 'Synthetic Board'], 'hsc-roll': ['exam roll number', null],
  'ug-score': ['education.undergraduate.percentage', '91.5'], 'ug-passing': ['education.undergraduate.passingYear', '2022'],
  'ug-degree': ['education.undergraduate.degreeName', 'B.Sc.'], 'ug-university': ['education.undergraduate.boardOrUniversity', 'Example University'],
  'qualifying-degree': ['education.undergraduate.degreeName', 'B.Sc.'], 'qualifying-percentage': ['education.undergraduate.percentage', '91.5'],
  'permanent-line': ['addresses.permanent.addressLine1', '1 Example Lane'], 'permanent-city': ['addresses.permanent.city', 'Example City'],
  'permanent-pin': ['addresses.permanent.postalCode', '012345'], 'postal-line': ['addresses.correspondence.addressLine1', '2 Sample Road'],
  'postal-city': ['addresses.correspondence.city', 'Sample City'], 'postal-pin': ['addresses.correspondence.postalCode', '654321'],
  'barred-exam': ['disciplinary declaration', null], 'application-number': ['official application number', null], 'family-income': ['verified family income', null]
};

const html = readFileSync(process.argv[2], 'utf8');
for (const complete of [true, false]) {
  const page = new JSDOM(html, { url: 'http://localhost/form', runScripts: 'outside-only', pretendToBeVisual: true });
  const popup = new JSDOM(source('sidepanel/review.html'), { runScripts: 'outside-only' });
  const sender = { id: 'audit', url: 'chrome-extension://audit/background/service-worker.js' };
  const event = { addListener() {} };
  const profile = new Profile(complete ? fixture : {
    personal: { firstName: 'Avery', dateOfBirth: '2000-01-01' }, addresses: { permanent: fixture.addresses.permanent }
  });
  const absent = new Set(['app-family', 'app-full', 'app-middleinitial', 'father-full', 'mother-full', 'hsc-score', 'hsc-passing', 'hsc-board',
    'ug-score', 'ug-passing', 'ug-degree', 'ug-university', 'qualifying-degree', 'qualifying-percentage', 'postal-line', 'postal-city', 'postal-pin']);
  let listener;
  page.window.chrome = { runtime: { id: sender.id, getURL: (path) => 'chrome-extension://audit/' + path,
    onMessage: { addListener(fn) { listener = fn; } } } };
  page.window.eval(source('content/fill.js'));
  page.window.eval(source('content/content.js'));
  const send = (message) => new Promise((resolve) => listener(message, sender, resolve));
  const extracted = await send({ type: 'EXTRACT_FIELDS', analysisId: 'fixture' });
  if (extracted.fields.length !== 31 || extracted.fields.some(({ id }) => !Object.hasOwn(expected, id))) throw new Error('Unexpected fixture fields');
  const { fields } = matchRequestSchema.parse({ fields: extracted.fields });
  const traces = new Map();
  const { results } = await matchFormFields(fields, profile, { trace: (id, entry) => traces.set(id, entry) });
  const selected = new Set();
  const writes = new Map();
  const events = new Map();
  for (const type of ['input', 'change']) {
    page.window.document.addEventListener(type, ({ target }) => {
      if (!events.has(target.id)) events.set(target.id, new Set());
      events.get(target.id).add(type);
    });
  }
  let fillDone;
  popup.window.chrome = {
    windows: { getCurrent: async () => ({ id: 1 }) },
    tabs: { query: async () => [{ id: 1, url: 'http://localhost/form' }], onActivated: event, onUpdated: event, onRemoved: event },
    runtime: { onMessage: event, async sendMessage(message) {
      if (message.type === 'CONNECTION_STATUS') return { success: true, data: { state: 'connected', account: { email: 'audit@example.test' } } };
      if (message.type === 'RESTORE_REVIEW') return { success: true, data: null };
      if (message.type === 'ANALYZE_FORM') return { success: true, data: {
        fields, results, analysisId: 'fixture', expiresAt: Date.now() + 60000
      } };
      for (const proposal of message.proposals) selected.add(proposal.fieldId);
      fillDone = send({ type: 'FILL_FIELDS', analysisId: message.analysisId, proposals: message.proposals });
      const response = await fillDone;
      for (const result of response.results) writes.set(result.fieldId, result.status);
      return { success: true, data: response.results };
    } }
  };
  const settle = () => new Promise(setImmediate);
  popup.window.eval(source('sidepanel/review.js'));
  await settle();
  popup.window.document.getElementById('analyze').click();
  await settle();
  popup.window.document.getElementById('fill-all').click();
  await fillDone;
  await settle();
  const cloudEligible = new Set(buildCloudBatch(fields, profile, results).map(({ index }) => index));
  const rows = fields.map((field, index) => {
    const [identity, fullValue] = expected[field.id];
    const wanted = !complete && absent.has(field.id) ? null : fullValue;
    const actual = page.window.document.getElementById(field.id).value;
    const result = results[index];
    const det = matchFieldDeterministically(field);
    return {
      id: field.id, label: field.label, section: field.context?.headings?.join(' / ') || field.section,
      expected: identity, sourceExists: wanted != null, deterministic: det?.canonicalKey || (det?.blocked ? 'blocked' : null),
      ...traces.get(field.fieldId), status: result.status, key: result.canonicalKey, method: result.method, reason: result.reason,
      cloudEligible: cloudEligible.has(index), geminiInvoked: false, geminiProposal: null,
      selected: selected.has(field.fieldId), write: writes.get(field.fieldId) || 'not attempted',
      events: [...events.get(field.id) || []],
      outcome: actual ? (actual === wanted ? 'correct fill' : 'incorrect fill') : wanted == null ? 'correct abstention' : 'miss'
    };
  });
  const totals = {};
  for (const row of rows) totals[row.outcome] = (totals[row.outcome] || 0) + 1;
  console.log(JSON.stringify({ complete, totals, rows }));
  if (process.env.FORMER_AUDIT_ASSERT === 'true' && rows.some((row) => row.sourceExists
    ? row.outcome !== 'correct fill' || !row.selected || row.write !== 'filled' || row.events.join(',') !== 'input,change'
    : row.outcome !== 'correct abstention' || row.selected || row.write !== 'not attempted' || row.events.length)) {
    process.exitCode = 1;
  }
  popup.window.close();
  page.window.close();
}
