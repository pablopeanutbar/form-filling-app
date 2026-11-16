import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { extractFormFields } from '../../extension/content/extractor.js';
import { matchRequestSchema } from '../src/validators/autofill.validator.js';
import { matchFieldDeterministically as match } from '../src/services/matching/deterministicMatcher.js';
import { validateCandidate } from '../src/services/matching/validationEngine.js';

const profile = {
  personal: { firstName: 'Alex', middleName: 'Jordan', lastName: 'Example', dateOfBirth: '1984-02-29', gender: 'female' },
  contact: { primaryPhone: '+15550001234', contactEmail: 'alex@example.test' },
  addresses: { permanent: { addressLine1: '12 Example Street', city: 'Test City', state: 'Test State', country: 'Test Country', postalCode: '01234' } },
  professional: { workExperience: [{ isCurrent: true, company: 'Example Studio', jobTitle: 'Designer' }], profileLinks: { portfolio: 'https://example.test/' } }
};
const decide = (field, saved = profile) => validateCandidate(field, match(field), saved);

test('RoboForm inventory follows extraction and validation with a synthetic profile', () => {
  const rows = [
    ['Title', '01___title', 'unmatched'], ['First Name', '02frstname', 'Alex'],
    ['Middle Initial', '03middle_i', 'J'], ['Last Name', '04lastname', 'Example'],
    ['Full Name', '04fullname', 'Alex Jordan Example'], ['Company', '05_company', 'Example Studio'],
    ['Position', '06position', 'Designer'], ['Address Line 1', '10address1', '12 Example Street'],
    ['Address Line 2', '11address2', 'needs_review'], ['City', '13adr_city', 'Test City'],
    ['State / Province', '14adrstate', 'Test State'], ['Country', '15_country', 'Test Country'],
    ['Zip', '16addr_zip', '01234'], ['Home Phone', '20homephon', 'unmatched'],
    ['Work Telephone', '21workphon', 'unmatched'], ['Fax', '22faxphone', 'excluded'],
    ['Cell Phone', '23cellphon', '+15550001234'], ['E-mail', '24emailadr', 'alex@example.test'],
    ['Web Site', '25web_site', 'https://example.test/'], ['User ID', '30_user_id', 'unsupported'],
    ['Password', '31password', 'excluded', 'password'], ['Credit Card Type', '40cc__type', 'unsupported', 'select'],
    ['Credit Card Number', '41ccnumber', 'protected'], ['Card Verification Code', '43cvc', 'protected'],
    ['Card Expiration Date', '42ccexp_mm', 'protected', 'select'], ['Card Expiration Date', '43ccexp_yy', 'protected', 'select'],
    ['Card User Name', '44cc_uname', 'unsupported'], ['Card Issuing Bank', '45ccissuer', 'unsupported'],
    ['Card Customer Service Phone', '46cccstsvc', 'unsupported'], ['Sex', '60pers_sex', 'female'],
    ['Social Security Number', '61pers_ssn', 'unsupported'], ['Driver License Number', '62driv_lic', 'unsupported'],
    ['Age', '66pers_age', 'unmatched'], ['Birth Place', '67birth_pl', 'unmatched'],
    ['Income', '68__income', 'unmatched'], ['Custom Message', '71__custom', 'unmatched'],
    ['Comments', '72__commnt', 'unmatched']
  ];
  const row = (label, control) => '<div><div>' + label + '</div><div>' + control + '</div></div>';
  const yearOptions = Array.from({ length: 111 }, (_, i) => '<option>' + (1920 + i) + '</option>').join('');
  const select = (name, options) => '<select name="' + name + '">' + options + '</select>';
  const date = row('Date Of Birth', select('66mm', '<option value="0">Month</option><option value="2">Feb</option>')
    + select('67dd', '<option value="0">Day</option><option value="29">29</option>')
    + select('68yy', '<option value="0">Year</option>' + yearOptions));
  const markup = rows.map(([label, name, , type]) => row(label, type === 'select' ? select(name, '<option>Choose</option>') : '<input type="' + (type || 'text') + '" name="' + name + '">')).join('');
  const dom = new JSDOM('<form>' + markup + date + '<input type="hidden" name="_form_type"><input type="reset"></form>', { runScripts: 'outside-only' });
  try {
    const { fields, stats } = extractFormFields(dom.window.document);
    let listener;
    const prefix = 'chrome-extension://former-test/';
    dom.window.chrome = { runtime: { id: 'former-test', getURL: (path) => prefix + path, onMessage: { addListener: (callback) => { listener = callback; } } } };
    dom.window.eval(readFileSync(new URL('../../extension/content/content.js', import.meta.url), 'utf8'));
    let live;
    listener({ type: 'EXTRACT_FIELDS' }, { id: 'former-test', url: prefix + 'background/service-worker.js' }, (value) => { live = value; });
    assert.equal(stats.totalEvaluated, rows.length + 5);
    assert.equal(live.stats.totalEvaluated, stats.totalEvaluated);
    assert.deepEqual(Array.from(live.fields, (field) => field.name), fields.map((field) => field.name));
    const checked = matchRequestSchema.parse({ fields }).fields;
    const lookup = new Map(checked.map((field) => [field.name, field]));
    for (const [label, name, expected] of rows) {
      const field = lookup.get(name);
      if (expected === 'excluded' || (expected === 'protected' && !field)) assert.equal(field, undefined, label);
      else {
        assert.ok(field, label);
        const result = decide(field);
        if (['protected', 'unsupported', 'unmatched', 'needs_review'].includes(expected)) {
          assert.equal(result.status, expected === 'protected' ? 'unsupported' : expected, label);
          assert.equal(result.value, null, label);
        } else {
          assert.equal(result.status, 'matched', label);
          assert.equal(result.value, expected, label);
        }
      }
    }
    for (const [name, expected] of [['66mm', '2'], ['67dd', '29'], ['68yy', '1984']]) {
      const field = lookup.get(name);
      assert.equal(field.label, 'Date Of Birth');
      assert.equal(field.optionsTruncated, false);
      assert.equal(decide(field).value, expected);
    }
  } finally { dom.window.close(); }
});

test('DOB and dropdown matching use unique enabled visible choices and valid saved data', () => {
  const field = { label: 'Birth month', type: 'select', options: [
    { label: 'Jan', value: '0' }, { label: 'Feb', value: '1' }, { label: 'Mar', value: '2' }
  ] };
  assert.equal(decide(field).value, '1');
  assert.equal(decide({ ...field, options: [...field.options, { label: 'February', value: 'feb' }] }).value, null);
  assert.equal(decide(field, { personal: { dateOfBirth: '1983-02-29' } }).value, null);
  assert.equal(decide({ ...field, label: 'Month' }).canonicalKey, null);
  assert.equal(decide({ label: 'Gender', type: 'radio', options: [{ label: 'F', value: 'option-3' }] }).value, 'option-3');
  assert.equal(decide({ label: 'Company' }, { professional: { workExperience: [{ company: 'Past' }] } }).value, null);
  assert.equal(decide({ label: 'Company' }, { professional: { workExperience: [{ isCurrent: true }, { isCurrent: true }] } }).status, 'needs_review');
});
