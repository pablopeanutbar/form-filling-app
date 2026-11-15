import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { extractFormFields } from '../../extension/content/extractor.js';
import { isSensitiveOrExcluded, resolveLabel, resolveSection } from '../../extension/content/domUtils.js';
import { matchRequestSchema } from '../src/validators/autofill.validator.js';

describe('Milestone 5: Chrome Extension Form Extraction Tests', () => {

  // ========================================================
  // Scenario 1: Standard labels with for/id association
  // ========================================================
  test('1. Labels associated through for/id are correctly resolved', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form>
            <label for="applicant_first_name">First Name</label>
            <input type="text" id="applicant_first_name" name="firstName" />

            <label for="applicant_email">Email Address</label>
            <input type="email" id="applicant_email" name="email" required />
          </form>
        </body>
      </html>
    `);

    const { fields } = extractFormFields(dom.window.document);
    assert.equal(fields.length, 2);

    assert.equal(fields[0].id, 'applicant_first_name');
    assert.equal(fields[0].name, 'firstName');
    assert.equal(fields[0].label, 'First Name');
    assert.equal(fields[0].type, 'text');
    assert.equal(fields[0].required, false);

    assert.equal(fields[1].id, 'applicant_email');
    assert.equal(fields[1].name, 'email');
    assert.equal(fields[1].label, 'Email Address');
    assert.equal(fields[1].type, 'email');
    assert.equal(fields[1].required, true);
  });

  // ========================================================
  // Scenario 2: Nested / wrapping labels
  // ========================================================
  test('2. Nested wrapping labels extract text without input contents', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form>
            <label>
              Date of Birth:
              <input type="date" name="dob" id="dob_input" />
            </label>
            <label>
              Phone Number
              <input type="tel" name="phone" placeholder="555-0199" />
            </label>
          </form>
        </body>
      </html>
    `);

    const { fields } = extractFormFields(dom.window.document);
    assert.equal(fields.length, 2);

    assert.equal(fields[0].label, 'Date of Birth:');
    assert.equal(fields[0].type, 'date');
    assert.equal(fields[1].label, 'Phone Number');
    assert.equal(fields[1].type, 'tel');
    assert.equal(fields[1].placeholder, '555-0199');
  });

  // ========================================================
  // Scenario 3: ARIA labels and aria-labelledby
  // ========================================================
  test('3. ARIA labels (aria-label and aria-labelledby) are correctly prioritized', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <span id="label_composite_1">Permanent</span>
          <span id="label_composite_2">Postal Code</span>
          <input type="text" id="pin_input" aria-labelledby="label_composite_1 label_composite_2" />

          <input type="text" name="city_input" aria-label="Current Residence City" />
        </body>
      </html>
    `);

    const { fields } = extractFormFields(dom.window.document);
    assert.equal(fields.length, 2);

    assert.equal(fields[0].label, 'Permanent Postal Code');
    assert.equal(fields[1].label, 'Current Residence City');
  });

  // ========================================================
  // Scenario 4: Placeholder-only inputs
  // ========================================================
  test('4. Inputs with only placeholders fall back cleanly to placeholder text', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <input type="text" name="search_q" placeholder="Enter keywords to search" />
        </body>
      </html>
    `);

    const { fields } = extractFormFields(dom.window.document);
    assert.equal(fields.length, 1);
    assert.equal(fields[0].label, 'Enter keywords to search');
    assert.equal(fields[0].placeholder, 'Enter keywords to search');
  });

  // ========================================================
  // Scenario 5: Dropdown (<select>) option extraction
  // ========================================================
  test('5. Dropdown options are extracted, ignoring empty placeholder selections', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <label for="state_select">Select State</label>
          <select id="state_select" name="state">
            <option value="">-- Select State --</option>
            <option value="IL">Illinois</option>
            <option value="CA">California</option>
            <option value="NY">New York</option>
          </select>
        </body>
      </html>
    `);

    const { fields } = extractFormFields(dom.window.document);
    assert.equal(fields.length, 1);
    assert.equal(fields[0].type, 'select');
    assert.equal(fields[0].label, 'Select State');
    assert.deepEqual(fields[0].options, ['Illinois', 'California', 'New York']);
  });

  // ========================================================
  // Scenario 6: Radio button groups
  // ========================================================
  test('6. Radio button groups are unified into a single logical field with option labels', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <fieldset>
            <legend>Gender</legend>
            <label><input type="radio" name="gender" value="male" /> Male</label>
            <label><input type="radio" name="gender" value="female" /> Female</label>
            <label><input type="radio" name="gender" value="other" /> Other</label>
          </fieldset>
        </body>
      </html>
    `);

    const { fields } = extractFormFields(dom.window.document);
    // Should be exactly 1 field for the entire radio group, NOT 3 separate fields
    assert.equal(fields.length, 1);
    assert.equal(fields[0].type, 'radio');
    assert.equal(fields[0].name, 'gender');
    assert.equal(fields[0].label, 'Gender');
    assert.deepEqual(fields[0].options, ['Male', 'Female', 'Other']);
  });

  // ========================================================
  // Scenario 7: Section context resolution
  // ========================================================
  test('7. Section context is resolved from fieldset legend and preceding headings', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Educational Qualifications</h2>
          <fieldset>
            <legend>Class 10th Details</legend>
            <label for="ten_marks">Percentage</label>
            <input type="number" id="ten_marks" name="tenth_percentage" />
          </fieldset>

          <h2>Work Experience</h2>
          <label for="job_company">Company Name</label>
          <input type="text" id="job_company" name="company" />
        </body>
      </html>
    `);

    const { fields } = extractFormFields(dom.window.document);
    assert.equal(fields.length, 2);

    assert.equal(fields[0].section, 'Class 10th Details');
    assert.equal(fields[1].section, 'Work Experience');
  });

  // ========================================================
  // Scenario 8: Sensitive & unsupported field exclusion
  // ========================================================
  test('8. Sensitive fields (passwords, card data, OTP, CAPTCHAs, files, hidden inputs) are excluded', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form>
            <!-- Supported -->
            <label for="legal_name">Full Name</label>
            <input type="text" id="legal_name" name="name" />

            <!-- Excluded: Password -->
            <input type="password" name="user_password" />

            <!-- Excluded: File upload -->
            <input type="file" name="resume_file" />

            <!-- Excluded: Hidden tokens -->
            <input type="hidden" name="csrf_token" value="abc123token" />
            <input type="text" name="_honeypot" style="display: none;" />

            <!-- Excluded: Credit card -->
            <input type="text" name="cc_num" autocomplete="cc-number" placeholder="Card number" />
            <input type="text" name="card_cvv" placeholder="CVV" />

            <!-- Excluded: OTP / 2FA -->
            <input type="text" name="two_factor_code" autocomplete="one-time-code" />

            <!-- Excluded: CAPTCHA -->
            <input type="text" name="g_recaptcha_response" class="captcha-input" />

            <!-- Excluded: Buttons -->
            <input type="submit" value="Submit Form" />
            <button type="button">Cancel</button>
          </form>
        </body>
      </html>
    `);

    const { fields, stats } = extractFormFields(dom.window.document);

    // Only "Full Name" should be extracted
    assert.equal(fields.length, 1);
    assert.equal(fields[0].label, 'Full Name');
    assert.equal(fields[0].type, 'text');

    // Stats should record excluded elements
    assert.equal(stats.supportedCount, 1);
    assert.ok(stats.excludedCount >= 8, `Expected at least 8 excluded fields, got ${stats.excludedCount}`);
  });

  // ========================================================
  // Scenario 9: Privacy Protection — No Value Collection
  // ========================================================
  test('9. Privacy guarantee: User-entered values are NEVER collected or transmitted', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <input type="text" id="username" name="username" value="user_secret_data" />
          <textarea name="bio">My private biography information</textarea>
        </body>
      </html>
    `);

    const { fields } = extractFormFields(dom.window.document);

    for (const field of fields) {
      assert.equal(field.value, undefined, 'Field object must NEVER contain a value property');
      assert.ok(!JSON.stringify(field).includes('user_secret_data'));
      assert.ok(!JSON.stringify(field).includes('private biography'));
    }
  });

  // ========================================================
  // Scenario 10: Dynamic Form Elements
  // ========================================================
  test('10. Dynamically appended form elements are extracted correctly', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body><form id="dynamic_form"></form></body></html>`);
    const form = dom.window.document.getElementById('dynamic_form');

    // Simulate dynamic addition
    const label = dom.window.document.createElement('label');
    label.htmlFor = 'dyn_field';
    label.textContent = 'Dynamic Institution Name';
    const input = dom.window.document.createElement('input');
    input.id = 'dyn_field';
    input.type = 'text';

    form.appendChild(label);
    form.appendChild(input);

    const { fields } = extractFormFields(dom.window.document);
    assert.equal(fields.length, 1);
    assert.equal(fields[0].label, 'Dynamic Institution Name');
    assert.equal(fields[0].id, 'dyn_field');
  });

  // ========================================================
  // Scenario 11: Invalid or missing form structures
  // ========================================================
  test('11. Gracefully handles pages with no forms or invalid root containers', () => {
    // Empty page
    const emptyDom = new JSDOM(`<!DOCTYPE html><html><body><h1>Welcome</h1><p>No forms here</p></body></html>`);
    const result1 = extractFormFields(emptyDom.window.document);
    assert.equal(result1.success, true);
    assert.equal(result1.fields.length, 0);
    assert.equal(result1.stats.supportedCount, 0);

    // Null root
    const result2 = extractFormFields(null);
    assert.equal(result2.success, false);
    assert.equal(result2.fields.length, 0);
  });

  // ========================================================
  // Scenario 12: Backend Request Contract Compatibility
  // ========================================================
  test('12. Extracted output strictly validates against backend POST /api/v1/autofill/match schema', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form>
            <label for="fullName">Candidate Name</label>
            <input type="text" id="fullName" name="fullName" placeholder="Full name" required />

            <label for="contactEmail">Contact Email</label>
            <input type="email" id="contactEmail" name="email" required />

            <fieldset>
              <legend>Gender</legend>
              <label><input type="radio" name="gender" value="male" /> Male</label>
              <label><input type="radio" name="gender" value="female" /> Female</label>
            </fieldset>

            <label for="state">State</label>
            <select id="state" name="state">
              <option value="IL">Illinois</option>
              <option value="CA">California</option>
            </select>
          </form>
        </body>
      </html>
    `);

    const extraction = extractFormFields(dom.window.document);
    assert.equal(extraction.success, true);
    assert.ok(extraction.fields.length >= 4);

    // Validate payload with backend Zod schema
    const backendPayload = {
      fields: extraction.fields.map((f) => ({
        fieldId: f.fieldId,
        label: f.label,
        name: f.name,
        type: f.type,
        id: f.id,
        placeholder: f.placeholder,
        section: f.section,
        options: f.options,
        required: f.required
      }))
    };

    const parseResult = matchRequestSchema.safeParse(backendPayload);
    assert.equal(parseResult.success, true, 'Extracted fields must strictly conform to backend matchRequestSchema');
  });
});
