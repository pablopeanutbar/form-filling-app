import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app, { closeApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/user.model.js';
import { Profile } from '../src/models/profile.model.js';
import { CANONICAL_FIELDS, getFieldByKey } from '../src/services/matching/fieldRegistry.js';
import { matchFieldDeterministically } from '../src/services/matching/deterministicMatcher.js';
import { rankCandidates, initCanonicalEmbeddings } from '../src/services/matching/semanticMatcher.js';
import { validateCandidate, isUnsupportedField } from '../src/services/matching/validationEngine.js';
import { matchFormFields } from '../src/services/matching/matching.service.js';

describe('Milestone 4: Intelligent Field Matching Engine Tests', () => {
  let server;
  let baseUrl;

  const testUser = {
    email: `matching_test_${Date.now()}@example.com`,
    password: 'Password123!@#'
  };

  // Helper to maintain cookies per user session
  const createClient = () => {
    const cookieJar = new Map();
    let currentCsrf = null;

    const updateCookies = (res) => {
      const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      for (const cookieStr of rawCookies) {
        const [nameVal] = cookieStr.split(';');
        const idx = nameVal.indexOf('=');
        if (idx !== -1) {
          const name = nameVal.slice(0, idx).trim();
          const val = nameVal.slice(idx + 1).trim();
          if (val === '') {
            cookieJar.delete(name);
          } else {
            cookieJar.set(name, val);
          }
        }
      }
    };

    const getCookieHeader = () => {
      return Array.from(cookieJar.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    };

    const fetchCsrf = async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/csrf-token`, {
        headers: { Cookie: getCookieHeader() }
      });
      assert.equal(res.status, 200);
      updateCookies(res);
      const data = await res.json();
      currentCsrf = data.data.csrfToken;
      return currentCsrf;
    };

    const request = async (endpoint, options = {}) => {
      const headers = { ...options.headers };
      const cookieStr = getCookieHeader();
      if (cookieStr) headers['Cookie'] = cookieStr;

      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method)) {
        if (!currentCsrf) {
          await fetchCsrf();
        }
        headers['x-csrf-token'] = currentCsrf;
      }

      if (options.body && typeof options.body === 'object') {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }

      const res = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers
      });
      updateCookies(res);
      return res;
    };

    return { request, fetchCsrf };
  };

  const client = createClient();
  let createdProfile;

  before(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /^matching_test_/ } });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Register & Login user
    await client.fetchCsrf();
    const regRes = await client.request('/api/v1/auth/register', {
      method: 'POST',
      body: testUser
    });
    assert.equal(regRes.status, 201);

    const loginRes = await client.request('/api/v1/auth/login', {
      method: 'POST',
      body: testUser
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    const userId = loginData.data.user.id;
    await client.fetchCsrf();

    // Seed test profile with comprehensive data
    await Profile.deleteOne({ userId });
    createdProfile = await Profile.create({
      userId,
      personal: {
        fullName: 'Jane Samantha Doe',
        dateOfBirth: '2001-08-15',
        gender: 'female',
        fatherName: 'Robert Doe',
        motherName: 'Mary Doe',
        guardianName: null
      },
      contact: {
        primaryPhone: '+1-555-0199',
        alternatePhone: null, // intentionally missing to test safe abstention
        contactEmail: 'jane.doe@example.org'
      },
      addresses: {
        permanent: {
          addressLine1: '100 Maple Avenue',
          city: 'Springfield',
          district: 'Sangamon',
          state: 'Illinois',
          country: 'USA',
          postalCode: '62701'
        },
        correspondence: {
          addressLine1: '450 Campus Way Apt 3B',
          city: 'Urbana',
          district: 'Champaign',
          state: 'Illinois',
          country: 'USA',
          postalCode: '61801'
        }
      },
      education: [
        {
          qualificationLevel: '10th',
          degreeName: 'Secondary School Certificate',
          institution: 'Springfield High School',
          boardOrUniversity: 'State Board',
          percentage: 91.5,
          passingYear: 2017
        },
        {
          qualificationLevel: '12th',
          degreeName: 'Higher Secondary Certificate',
          institution: 'Springfield Senior Secondary',
          boardOrUniversity: 'State Board',
          percentage: 88.0,
          passingYear: 2019
        },
        {
          qualificationLevel: 'undergraduate',
          degreeName: 'Bachelor of Science in Computer Science',
          institution: 'University of Illinois',
          boardOrUniversity: 'State University',
          specialization: 'Software Engineering',
          percentage: null, // intentionally null
          cgpa: 3.85,
          cgpaScale: 4.0,
          passingYear: 2023
        }
      ],
      professional: {
        skills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
        profileLinks: {
          linkedin: 'https://linkedin.com/in/janedoe',
          github: 'https://github.com/janedoe',
          portfolio: 'https://janedoe.dev'
        }
      }
    });

    // Warm MiniLM embeddings model
    await initCanonicalEmbeddings();
  });

  after(async () => {
    await User.deleteMany({ email: { $regex: /^matching_test_/ } });
    if (createdProfile) {
      await Profile.deleteOne({ _id: createdProfile._id });
    }
    await new Promise((resolve) => server.close(resolve));
    await closeApp();
    await disconnectDB();
  });

  // ========================================================
  // Unit Test 1: Canonical Field Registry
  // ========================================================
  test('1. Canonical registry contains well-formed definitions with all required metadata', () => {
    assert.ok(CANONICAL_FIELDS.length >= 35, 'Registry must have at least 35 canonical fields');

    for (const field of CANONICAL_FIELDS) {
      assert.ok(field.key, 'Field must have a key');
      assert.ok(field.label, `Field ${field.key} must have a label`);
      assert.ok(field.category, `Field ${field.key} must have a category`);
      assert.ok(field.dataType, `Field ${field.key} must have a dataType`);
      assert.ok(field.description, `Field ${field.key} must have a description`);
      assert.ok(Array.isArray(field.aliases), `Field ${field.key} must have aliases array`);
      assert.ok(field.aliases.length > 0, `Field ${field.key} aliases cannot be empty`);
    }

    const nameDef = getFieldByKey('personal.fullName');
    assert.equal(nameDef.label, 'Applicant Full Name');
    assert.equal(nameDef.dataType, 'string');
  });

  // ========================================================
  // Unit Test 2: Deterministic Matching & Negative Guards
  // ========================================================
  test('2. Deterministic matching resolves applicant name and isolates from parents and institutions', () => {
    // 2a. Applicant name
    const applicantMatch = matchFieldDeterministically({
      label: 'Candidate Full Name',
      name: 'applicant_name'
    });
    assert.equal(applicantMatch.matched, true);
    assert.equal(applicantMatch.canonicalKey, 'personal.fullName');

    // 2b. Father name
    const fatherMatch = matchFieldDeterministically({
      label: "Father's Full Name",
      name: 'father_name'
    });
    assert.equal(fatherMatch.matched, true);
    assert.equal(fatherMatch.canonicalKey, 'personal.fatherName');

    // 2c. Mother name
    const motherMatch = matchFieldDeterministically({
      label: "Mother's Name",
      name: 'mother_name'
    });
    assert.equal(motherMatch.matched, true);
    assert.equal(motherMatch.canonicalKey, 'personal.motherName');

    // 2d. Institution name must NOT match personal.fullName
    const institutionMatch = matchFieldDeterministically({
      label: 'Name of School / College / Institution',
      name: 'institution_name'
    });
    assert.notEqual(institutionMatch.canonicalKey, 'personal.fullName');
    assert.notEqual(institutionMatch.canonicalKey, 'personal.fatherName');
    assert.notEqual(institutionMatch.canonicalKey, 'personal.motherName');
  });

  test('3. Deterministic matching distinguishes permanent vs correspondence address fields', () => {
    const permPin = matchFieldDeterministically({
      label: 'Permanent Address PIN Code',
      name: 'perm_pincode'
    });
    assert.equal(permPin.matched, true);
    assert.equal(permPin.canonicalKey, 'addresses.permanent.postalCode');

    const corrPin = matchFieldDeterministically({
      label: 'Present / Mailing Address Postal Code',
      name: 'mailing_zip'
    });
    assert.equal(corrPin.matched, true);
    assert.equal(corrPin.canonicalKey, 'addresses.correspondence.postalCode');

    const permCity = matchFieldDeterministically({
      label: 'Permanent City',
      section: 'Permanent Address'
    });
    assert.equal(permCity.matched, true);
    assert.equal(permCity.canonicalKey, 'addresses.permanent.city');

    const corrCity = matchFieldDeterministically({
      label: 'Current Residence City',
      section: 'Current Address'
    });
    assert.equal(corrCity.matched, true);
    assert.equal(corrCity.canonicalKey, 'addresses.correspondence.city');
  });

  test('4. Deterministic matching distinguishes 10th vs 12th vs Graduation vs CGPA', () => {
    const match10thPct = matchFieldDeterministically({
      label: 'Class 10th Percentage of Marks',
      name: 'tenth_marks_pct'
    });
    assert.equal(match10thPct.matched, true);
    assert.equal(match10thPct.canonicalKey, 'education.10th.percentage');

    const match12thPct = matchFieldDeterministically({
      label: 'Class 12th / Intermediate Percentage',
      name: 'twelfth_percentage'
    });
    assert.equal(match12thPct.matched, true);
    assert.equal(match12thPct.canonicalKey, 'education.12th.percentage');

    const matchGradCgpa = matchFieldDeterministically({
      label: 'Undergraduate CGPA / Grade Point Average',
      name: 'ug_cgpa'
    });
    assert.equal(matchGradCgpa.matched, true);
    assert.equal(matchGradCgpa.canonicalKey, 'education.undergraduate.cgpa');

    const matchGradDegree = matchFieldDeterministically({
      label: 'Degree / Course of Study',
      section: 'Graduation Details'
    });
    assert.equal(matchGradDegree.matched, true);
    assert.equal(matchGradDegree.canonicalKey, 'education.undergraduate.degreeName');
  });

  // ========================================================
  // Unit Test 3: Local MiniLM Inference
  // ========================================================
  test('5. Real MiniLM local inference embeds text and ranks semantically similar candidates', async () => {
    const candidates = await rankCandidates({
      label: 'Cellular Telephone Number',
      placeholder: 'Enter 10-digit mobile number'
    });

    assert.ok(Array.isArray(candidates));
    assert.ok(candidates.length > 0);

    // Top candidate should be contact.primaryPhone
    const top = candidates[0];
    assert.equal(top.canonicalKey, 'contact.primaryPhone');
    assert.ok(top.score >= 0.40, `Expected similarity >= 0.40, got ${top.score}`);
    assert.equal(top.method, 'semantic_embedding');

    // Test GitHub profile link semantic match
    const ghCandidates = await rankCandidates({
      label: 'Source Code Repository Link (GitHub URL)'
    });
    assert.ok(ghCandidates.length > 0);
    assert.equal(ghCandidates[0].canonicalKey, 'professional.profileLinks.github');
  });

  // ========================================================
  // Unit Test 4: Validation Engine & Safe Abstention
  // ========================================================
  test('6. Validation engine produces MATCHED when deterministic rule matches and profile data exists', () => {
    const field = { fieldId: 'f1', label: 'Candidate Full Name', name: 'fullname' };
    const candidate = {
      matched: true,
      canonicalKey: 'personal.fullName',
      confidence: 1.0,
      method: 'deterministic_rule'
    };

    const decision = validateCandidate(field, candidate, createdProfile);
    assert.equal(decision.status, 'matched');
    assert.equal(decision.value, 'Jane Samantha Doe');
    assert.equal(decision.needsReview, false);
    assert.equal(decision.confidence, 1.0);
  });

  test('7. Safe Abstention: missing profile values result in NEEDS_REVIEW with explanation', () => {
    const field = { fieldId: 'f_alt', label: 'Alternate Mobile Contact', name: 'alt_phone' };
    const candidate = {
      matched: true,
      canonicalKey: 'contact.alternatePhone',
      confidence: 1.0,
      method: 'deterministic_rule'
    };

    // User profile has alternatePhone: null
    const decision = validateCandidate(field, candidate, createdProfile);
    assert.equal(decision.status, 'needs_review');
    assert.equal(decision.value, null);
    assert.equal(decision.needsReview, true);
    assert.ok(decision.reason.includes('empty') || decision.reason.includes('not set'));
  });

  test('8. Safe Abstention: No automatic percentage derivation from CGPA without formula', () => {
    const field = {
      fieldId: 'f_ug_pct',
      label: 'Graduation Aggregate Percentage',
      section: 'Undergraduate Details'
    };
    const candidate = {
      matched: true,
      canonicalKey: 'education.undergraduate.percentage',
      confidence: 1.0,
      method: 'deterministic_rule'
    };

    // In profile, undergraduate percentage is null, only CGPA is 3.85
    const decision = validateCandidate(field, candidate, createdProfile);
    assert.equal(decision.status, 'needs_review');
    assert.equal(decision.value, null);
    assert.equal(decision.needsReview, true);
  });

  test('9. Unsupported field detection flags file uploads, passwords, and security challenges', () => {
    const fileField = { fieldId: 'f_resume', label: 'Upload Resume PDF', type: 'file' };
    const check1 = isUnsupportedField(fileField);
    assert.equal(check1.unsupported, true);

    const captchaField = { fieldId: 'f_captcha', label: 'Enter Captcha Code', type: 'text' };
    const check2 = isUnsupportedField(captchaField);
    assert.equal(check2.unsupported, true);

    const decision = validateCandidate(fileField, null, createdProfile);
    assert.equal(decision.status, 'unsupported');
    assert.equal(decision.value, null);
  });

  // ========================================================
  // Unit Test 5: Complete Pipeline Orchestrator
  // ========================================================
  test('10. Pipeline orchestrator processes heterogeneous form fields with diagnostic summary', async () => {
    const fields = [
      { fieldId: '1', label: 'Full Name', name: 'fullname' },
      { fieldId: '2', label: 'Permanent PIN Code', name: 'pin' },
      { fieldId: '3', label: 'Class 10th Marks (%)', name: 'marks10' },
      { fieldId: '4', label: 'Upload Passport Photo', type: 'file' },
      { fieldId: '5', label: 'Unknown Custom Question XYZ', name: 'xyz_field' }
    ];

    const { results, summary } = await matchFormFields(fields, createdProfile);

    assert.equal(results.length, 5);
    assert.equal(summary.totalFields, 5);
    assert.ok(summary.matched >= 3, `Expected at least 3 matches, got ${summary.matched}`);
    assert.equal(summary.unsupported, 1);
    assert.ok(summary.unmatched >= 1);

    // Verify 10th percentage preserves education record ID
    const eduDecision = results.find((r) => r.canonicalKey === 'education.10th.percentage');
    assert.ok(eduDecision);
    assert.equal(eduDecision.status, 'matched');
    assert.equal(eduDecision.value, 91.5);
    assert.ok(eduDecision.educationRecordId, 'Must include education qualification record ID');
  });

  // ========================================================
  // Integration Test: POST /api/v1/autofill/match
  // ========================================================
  test('11. Unauthenticated request to POST /api/v1/autofill/match is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/autofill/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: [{ label: 'Name' }] })
    });
    assert.equal(res.status, 401);
  });

  test('12. Authenticated user calls POST /api/v1/autofill/match with full autofill payload', async () => {
    const testFields = [
      {
        fieldId: 'input_name',
        label: 'Candidate Full Name',
        name: 'applicant_name',
        type: 'text'
      },
      {
        fieldId: 'input_dob',
        label: 'Date of Birth',
        name: 'dob',
        type: 'date'
      },
      {
        fieldId: 'input_perm_addr',
        label: 'Permanent Street Address',
        name: 'perm_addr1',
        type: 'text'
      },
      {
        fieldId: 'input_10th_pct',
        label: 'Class 10 Percentage',
        name: 'tenth_percentage',
        type: 'number'
      },
      {
        fieldId: 'input_ug_cgpa',
        label: 'Graduation CGPA',
        name: 'degree_cgpa',
        type: 'number'
      },
      {
        fieldId: 'input_linkedin',
        label: 'LinkedIn Profile URL',
        name: 'linkedin_url',
        type: 'url'
      },
      {
        fieldId: 'input_signature',
        label: 'Upload Digital Signature',
        name: 'signature_file',
        type: 'file'
      }
    ];

    const res = await client.request('/api/v1/autofill/match', {
      method: 'POST',
      body: { fields: testFields }
    });

    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.success, true);
    assert.ok(body.data);
    assert.ok(Array.isArray(body.data.results));
    assert.equal(body.data.results.length, 7);

    const results = body.data.results;

    // Check Candidate Full Name
    const nameMatch = results.find((r) => r.fieldId === 'input_name');
    assert.ok(nameMatch);
    assert.equal(nameMatch.status, 'matched');
    assert.equal(nameMatch.canonicalKey, 'personal.fullName');
    assert.equal(nameMatch.value, 'Jane Samantha Doe');

    // Check Date of Birth
    const dobMatch = results.find((r) => r.fieldId === 'input_dob');
    assert.ok(dobMatch);
    assert.equal(dobMatch.status, 'matched');
    assert.equal(dobMatch.canonicalKey, 'personal.dateOfBirth');
    assert.equal(dobMatch.value, '2001-08-15');

    // Check Permanent Street Address
    const addrMatch = results.find((r) => r.fieldId === 'input_perm_addr');
    assert.ok(addrMatch);
    assert.equal(addrMatch.status, 'matched');
    assert.equal(addrMatch.canonicalKey, 'addresses.permanent.addressLine1');
    assert.equal(addrMatch.value, '100 Maple Avenue');

    // Check Class 10 Percentage
    const pct10Match = results.find((r) => r.fieldId === 'input_10th_pct');
    assert.ok(pct10Match);
    assert.equal(pct10Match.status, 'matched');
    assert.equal(pct10Match.canonicalKey, 'education.10th.percentage');
    assert.equal(pct10Match.value, 91.5);
    assert.ok(pct10Match.educationRecordId);

    // Check Graduation CGPA
    const cgpaMatch = results.find((r) => r.fieldId === 'input_ug_cgpa');
    assert.ok(cgpaMatch);
    assert.equal(cgpaMatch.status, 'matched');
    assert.equal(cgpaMatch.canonicalKey, 'education.undergraduate.cgpa');
    assert.equal(cgpaMatch.value, 3.85);

    // Check LinkedIn URL
    const liMatch = results.find((r) => r.fieldId === 'input_linkedin');
    assert.ok(liMatch);
    assert.equal(liMatch.status, 'matched');
    assert.equal(liMatch.canonicalKey, 'professional.profileLinks.linkedin');
    assert.equal(liMatch.value, 'https://linkedin.com/in/janedoe');

    // Check Upload Digital Signature -> unsupported
    const sigMatch = results.find((r) => r.fieldId === 'input_signature');
    assert.ok(sigMatch);
    assert.equal(sigMatch.status, 'unsupported');
    assert.equal(sigMatch.value, null);

    // Verify summary metrics
    const summary = body.data.summary;
    assert.equal(summary.totalFields, 7);
    assert.equal(summary.matched, 6);
    assert.equal(summary.unsupported, 1);
    assert.equal(summary.needsReview, 0);
    assert.equal(summary.unmatched, 0);
  });
});

