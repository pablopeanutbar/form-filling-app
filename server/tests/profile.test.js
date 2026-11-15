import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app, { closeApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/user.model.js';
import { Profile } from '../src/models/profile.model.js';

describe('Milestone 3: User Profile Management API Tests', () => {
  let server;
  let baseUrl;

  // Test accounts
  const userA = {
    email: `profile_test_a_${Date.now()}@example.com`,
    password: 'Password123!@#'
  };
  const userB = {
    email: `profile_test_b_${Date.now()}@example.com`,
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

  const clientA = createClient();
  const clientB = createClient();
  let qualificationAId = null;

  before(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /^profile_test_/ } });
    await Profile.deleteMany({});

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Register and login User A
    await clientA.fetchCsrf();
    const regA = await clientA.request('/api/v1/auth/register', {
      method: 'POST',
      body: userA
    });
    assert.equal(regA.status, 201);
    const loginA = await clientA.request('/api/v1/auth/login', {
      method: 'POST',
      body: userA
    });
    assert.equal(loginA.status, 200);
    // Refresh CSRF after login so it's keyed to User A's session
    await clientA.fetchCsrf();

    // Register and login User B
    await clientB.fetchCsrf();
    const regB = await clientB.request('/api/v1/auth/register', {
      method: 'POST',
      body: userB
    });
    assert.equal(regB.status, 201);
    const loginB = await clientB.request('/api/v1/auth/login', {
      method: 'POST',
      body: userB
    });
    assert.equal(loginB.status, 200);
    // Refresh CSRF after login so it's keyed to User B's session
    await clientB.fetchCsrf();
  });

  after(async () => {
    await User.deleteMany({ email: { $regex: /^profile_test_/ } });
    await Profile.deleteMany({});
    await new Promise((resolve) => server.close(resolve));
    await closeApp();
    await disconnectDB();
  });

  test('1. Unauthorized access to /api/v1/profile/me is rejected with 401', async () => {
    const unauthedRes = await fetch(`${baseUrl}/api/v1/profile/me`);
    assert.equal(unauthedRes.status, 401);
    const body = await unauthedRes.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  test('2. Profile initialization on first retrieval (GET /api/v1/profile/me)', async () => {
    const res = await clientA.request('/api/v1/profile/me');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.profile.id);
    assert.deepEqual(body.data.profile.education, []);
    assert.ok(body.data.profile.personal);
    assert.ok(body.data.profile.contact);
    assert.ok(body.data.profile.addresses);
  });

  test('3. Personal information partial update (PATCH /api/v1/profile/me)', async () => {
    const res = await clientA.request('/api/v1/profile/me', {
      method: 'PATCH',
      body: {
        personal: {
          fullName: 'John Doe',
          dateOfBirth: '1998-05-15',
          gender: 'male',
          fatherName: 'Robert Doe',
          motherName: 'Mary Doe'
        }
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.profile.personal.fullName, 'John Doe');
    assert.equal(body.data.profile.personal.dateOfBirth, '1998-05-15');
    assert.equal(body.data.profile.personal.gender, 'male');
    assert.equal(body.data.profile.personal.fatherName, 'Robert Doe');
    assert.equal(body.data.profile.personal.motherName, 'Mary Doe');
  });

  test('4. Contact information update (PATCH /api/v1/profile/me)', async () => {
    const res = await clientA.request('/api/v1/profile/me', {
      method: 'PATCH',
      body: {
        contact: {
          primaryPhone: '+1-555-0199',
          alternatePhone: '+1-555-0188',
          contactEmail: 'contact.johndoe@example.com'
        }
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.profile.contact.primaryPhone, '+1-555-0199');
    assert.equal(body.data.profile.contact.contactEmail, 'contact.johndoe@example.com');
    // Ensure personal details were preserved
    assert.equal(body.data.profile.personal.fullName, 'John Doe');
  });

  test('5. Address updates (permanent and correspondence distinguishable)', async () => {
    const res = await clientA.request('/api/v1/profile/me', {
      method: 'PATCH',
      body: {
        addresses: {
          permanent: {
            addressLine1: '123 Main Street',
            city: 'Springfield',
            district: 'Sangamon',
            state: 'Illinois',
            country: 'USA',
            postalCode: '62701'
          },
          correspondence: {
            addressLine1: '456 College Ave Apt 4B',
            city: 'Urbana',
            state: 'Illinois',
            country: 'USA',
            postalCode: '61801'
          }
        }
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.profile.addresses.permanent.postalCode, '62701');
    assert.equal(body.data.profile.addresses.correspondence.postalCode, '61801');
    assert.notEqual(
      body.data.profile.addresses.permanent.addressLine1,
      body.data.profile.addresses.correspondence.addressLine1
    );
  });

  test('6. Adding multiple independent educational records (POST /api/v1/profile/me/education)', async () => {
    // Add 10th Standard Record
    const edu1Res = await clientA.request('/api/v1/profile/me/education', {
      method: 'POST',
      body: {
        qualificationLevel: '10th',
        degreeName: 'Secondary School Certificate',
        institution: 'Springfield High School',
        boardOrUniversity: 'State Board',
        passingYear: 2014,
        marksObtained: 450,
        maxMarks: 500,
        percentage: 90.0,
        resultStatus: 'passed'
      }
    });

    assert.equal(edu1Res.status, 201);
    const edu1Body = await edu1Res.json();
    assert.equal(edu1Body.success, true);
    assert.ok(edu1Body.data.qualification.id);
    assert.equal(edu1Body.data.qualification.qualificationLevel, '10th');
    assert.equal(edu1Body.data.qualification.percentage, 90.0);

    // Add Undergraduate Record
    const edu2Res = await clientA.request('/api/v1/profile/me/education', {
      method: 'POST',
      body: {
        qualificationLevel: 'undergraduate',
        degreeName: 'Bachelor of Science in Computer Science',
        institution: 'University of Illinois',
        boardOrUniversity: 'UIUC',
        specialization: 'Software Engineering',
        passingYear: 2020,
        cgpa: 3.85,
        cgpaScale: 4.0,
        resultStatus: 'passed'
      }
    });

    assert.equal(edu2Res.status, 201);
    const edu2Body = await edu2Res.json();
    assert.equal(edu2Body.success, true);
    assert.ok(edu2Body.data.qualification.id);
    qualificationAId = edu2Body.data.qualification.id;

    // Verify both records exist in profile
    const profileRes = await clientA.request('/api/v1/profile/me');
    const profileBody = await profileRes.json();
    assert.equal(profileBody.data.profile.education.length, 2);
  });

  test('7. Updating a specific educational record (PATCH /api/v1/profile/me/education/:id)', async () => {
    assert.ok(qualificationAId);
    const res = await clientA.request(`/api/v1/profile/me/education/${qualificationAId}`, {
      method: 'PATCH',
      body: {
        cgpa: 3.92,
        specialization: 'Artificial Intelligence & Systems'
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.qualification.cgpa, 3.92);
    assert.equal(body.data.qualification.specialization, 'Artificial Intelligence & Systems');
    assert.equal(body.data.qualification.degreeName, 'Bachelor of Science in Computer Science');
  });

  test('8. Deleting an educational record (DELETE /api/v1/profile/me/education/:id)', async () => {
    assert.ok(qualificationAId);
    const res = await clientA.request(`/api/v1/profile/me/education/${qualificationAId}`, {
      method: 'DELETE'
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify record is gone from profile
    const profileRes = await clientA.request('/api/v1/profile/me');
    const profileBody = await profileRes.json();
    assert.equal(profileBody.data.profile.education.length, 1);

    // Subsequent deletion should return 404
    const notFoundRes = await clientA.request(
      `/api/v1/profile/me/education/${qualificationAId}`,
      { method: 'DELETE' }
    );
    assert.equal(notFoundRes.status, 404);
  });

  test('9. Missing or invalid educational inputs rejected with 400', async () => {
    // Missing required qualificationLevel & degreeName
    const missingRes = await clientA.request('/api/v1/profile/me/education', {
      method: 'POST',
      body: {
        institution: 'Some University'
      }
    });
    assert.equal(missingRes.status, 400);
    const missingBody = await missingRes.json();
    assert.equal(missingBody.success, false);
    assert.equal(missingBody.error.code, 'VALIDATION_ERROR');

    // Invalid percentage (> 100)
    const invalidPercentRes = await clientA.request('/api/v1/profile/me/education', {
      method: 'POST',
      body: {
        qualificationLevel: '12th',
        degreeName: 'High School',
        percentage: 105.5
      }
    });
    assert.equal(invalidPercentRes.status, 400);
  });

  test('10. Cross-user data isolation strictly enforced', async () => {
    // User B retrieves their own profile - must be empty and have User B ID
    const resB = await clientB.request('/api/v1/profile/me');
    assert.equal(resB.status, 200);
    const bodyB = await resB.json();
    assert.deepEqual(bodyB.data.profile.education, []);
    assert.equal(bodyB.data.profile.personal.fullName, null);

    // User B attempts to update User A's qualification ID -> 404
    const crossUpdateRes = await clientB.request(
      `/api/v1/profile/me/education/${qualificationAId}`,
      {
        method: 'PATCH',
        body: { cgpa: 4.0 }
      }
    );
    assert.equal(crossUpdateRes.status, 404);

    // User B updates their own profile
    const crossProfileRes = await clientB.request('/api/v1/profile/me', {
      method: 'PATCH',
      body: { personal: { fullName: 'Jane Smith' } }
    });
    assert.equal(crossProfileRes.status, 200);
    const updatedBodyB = await crossProfileRes.json();
    assert.equal(updatedBodyB.data.profile.personal.fullName, 'Jane Smith');

    // User A's profile must remain untouched
    const verifyA = await clientA.request('/api/v1/profile/me');
    const verifyABody = await verifyA.json();
    assert.equal(verifyABody.data.profile.personal.fullName, 'John Doe');
  });

  test('11. Protection against unauthorized fields and MongoDB operator injection', async () => {
    // Attempting MongoDB operator injection ($set)
    const mongoOpRes = await clientA.request('/api/v1/profile/me', {
      method: 'PATCH',
      body: {
        $set: { 'personal.fullName': 'Injected Name' }
      }
    });
    assert.equal(mongoOpRes.status, 400);
    const mongoOpBody = await mongoOpRes.json();
    assert.equal(mongoOpBody.success, false);
    assert.equal(mongoOpBody.error.code, 'INVALID_REQUEST');

    // Attempting unauthorized top-level field
    const unknownFieldRes = await clientA.request('/api/v1/profile/me', {
      method: 'PATCH',
      body: {
        unauthorizedField: 'malicious_value'
      }
    });
    assert.equal(unknownFieldRes.status, 400);
    const unknownFieldBody = await unknownFieldRes.json();
    assert.equal(unknownFieldBody.success, false);
    assert.equal(unknownFieldBody.error.code, 'VALIDATION_ERROR');
  });

  test('12. Explicit clearing of optional fields (setting to null)', async () => {
    const clearRes = await clientA.request('/api/v1/profile/me', {
      method: 'PATCH',
      body: {
        personal: {
          fatherName: null
        }
      }
    });

    assert.equal(clearRes.status, 200);
    const body = await clearRes.json();
    assert.equal(body.data.profile.personal.fatherName, null);
    assert.equal(body.data.profile.personal.motherName, 'Mary Doe'); // Sibling preserved
  });
});
