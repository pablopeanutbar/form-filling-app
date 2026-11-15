import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app, { closeApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/user.model.js';

describe('Milestone 2: User Authentication API Tests', () => {
  let server;
  let baseUrl;
  const testEmail = `auth_test_${Date.now()}@example.com`;
  const testPassword = 'SecurePass123!@#';

  let currentCsrfToken = null;
  const cookieJar = new Map();

  const updateCookieJar = (res) => {
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

  before(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /^auth_test_/ } });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await User.deleteMany({ email: { $regex: /^auth_test_/ } });
    await new Promise((resolve) => server.close(resolve));
    await closeApp();
    await disconnectDB();
  });

  const getCsrfToken = async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/csrf-token`, {
      headers: {
        Cookie: getCookieHeader()
      }
    });
    assert.equal(res.status, 200);
    updateCookieJar(res);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.csrfToken);
    currentCsrfToken = body.data.csrfToken;
    return currentCsrfToken;
  };

  test('1. Successful registration', async () => {
    await getCsrfToken();

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': currentCsrfToken,
        Cookie: getCookieHeader()
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.equal(res.status, 201);
    updateCookieJar(res);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testEmail.toLowerCase());
    assert.equal(body.data.user.status, 'active');
    assert.equal(body.data.user.passwordHash, undefined); // Never return password hashes
    assert.ok(body.data.user.id);
  });

  test('2. Invalid registration inputs (weak password & malformed email)', async () => {
    await getCsrfToken();

    // Weak password test
    const weakRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': currentCsrfToken,
        Cookie: getCookieHeader()
      },
      body: JSON.stringify({
        email: 'valid_user@example.com',
        password: 'weak'
      })
    });

    assert.equal(weakRes.status, 400);
    const weakBody = await weakRes.json();
    assert.equal(weakBody.success, false);
    assert.equal(weakBody.error.code, 'VALIDATION_ERROR');

    // Invalid email test
    const invalidEmailRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': currentCsrfToken,
        Cookie: getCookieHeader()
      },
      body: JSON.stringify({
        email: 'not-an-email',
        password: testPassword
      })
    });

    assert.equal(invalidEmailRes.status, 400);
    const invalidEmailBody = await invalidEmailRes.json();
    assert.equal(invalidEmailBody.success, false);
    assert.equal(invalidEmailBody.error.code, 'VALIDATION_ERROR');
  });

  test('3. Duplicate email registration rejected with 409', async () => {
    await getCsrfToken();

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': currentCsrfToken,
        Cookie: getCookieHeader()
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'EMAIL_ALREADY_EXISTS');
  });

  test('4. Successful login establishes authenticated session', async () => {
    await getCsrfToken();

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': currentCsrfToken,
        Cookie: getCookieHeader()
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.equal(res.status, 200);
    updateCookieJar(res);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testEmail.toLowerCase());

    assert.ok(cookieJar.has('former.sid'), 'Session cookie former.sid must be present');
  });

  test('5. Incorrect password rejected with generic 401 error', async () => {
    await getCsrfToken();

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': currentCsrfToken,
        Cookie: getCookieHeader()
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'IncorrectPassword999!'
      })
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_CREDENTIALS');
    assert.equal(body.error.message, 'Invalid email or password');
  });

  test('6. Accessing protected endpoint without authentication returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    assert.equal(res.status, 401);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  test('7. Accessing current-user endpoint with valid session returns user profile', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        Cookie: getCookieHeader()
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testEmail.toLowerCase());
    assert.equal(body.data.user.status, 'active');
  });

  test('8. Session invalidation after logout', async () => {
    await getCsrfToken();

    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'x-csrf-token': currentCsrfToken,
        Cookie: getCookieHeader()
      }
    });

    assert.equal(logoutRes.status, 200);
    const savedCookie = getCookieHeader();
    updateCookieJar(logoutRes);

    const logoutBody = await logoutRes.json();
    assert.equal(logoutBody.success, true);

    // Requesting /me with invalidated session cookie must return 401
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        Cookie: savedCookie
      }
    });
    assert.equal(meRes.status, 401);
  });

  test('9. Expired or forged session cookie rejected with 401', async () => {
    const fakeExpiredCookie = 'former.sid=s%3Afake_expired_session_identifier.abc123xyz';
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        Cookie: fakeExpiredCookie
      }
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  test('10. CSRF protection rejects state-changing requests without valid token', async () => {
    // Attempt without CSRF header
    const noTokenRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: getCookieHeader()
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.equal(noTokenRes.status, 403);
    const noTokenBody = await noTokenRes.json();
    assert.equal(noTokenBody.success, false);
    assert.equal(noTokenBody.error.code, 'CSRF_INVALID');

    // Attempt with forged CSRF token
    const badTokenRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'forged_fake_csrf_token_value',
        Cookie: getCookieHeader()
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.equal(badTokenRes.status, 403);
    const badTokenBody = await badTokenRes.json();
    assert.equal(badTokenBody.success, false);
    assert.equal(badTokenBody.error.code, 'CSRF_INVALID');
  });

  test('11. Authentication rate limiter throttles excessive attempts with 429', async () => {
    await getCsrfToken();

    let throttled = false;
    for (let i = 0; i < 22; i++) {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': currentCsrfToken,
          Cookie: getCookieHeader()
        },
        body: JSON.stringify({
          email: 'rate_limit_test@example.com',
          password: 'wrong_password'
        })
      });

      if (res.status === 429) {
        throttled = true;
        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.error.code, 'TOO_MANY_REQUESTS');
        break;
      }
    }

    assert.ok(throttled, 'Expected 429 Too Many Requests after exceeding threshold');
  });
});
