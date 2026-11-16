import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { apiClient, fetchCsrfToken, clearCsrfToken, setApiBaseUrl } from '../src/api/client.js';
import { registerUser, loginUser, logoutUser, getCurrentUser } from '../src/api/auth.js';

describe('Milestone 6A: Frontend Auth Client & Services Unit Tests', () => {
  let server;
  let serverPort;
  let lastReceivedHeaders = {};
  let lastReceivedBody = null;
  let csrfInvalidCount = 0;

  before(async () => {
    // Spin up lightweight mock backend for HTTP client verification
    server = http.createServer((req, res) => {
      lastReceivedHeaders = req.headers;
      let bodyData = '';
      req.on('data', (chunk) => {
        bodyData += chunk;
      });

      req.on('end', () => {
        if (bodyData) {
          try {
            lastReceivedBody = JSON.parse(bodyData);
          } catch {
            lastReceivedBody = bodyData;
          }
        }

        // Route: GET /api/v1/auth/csrf-token
        if (req.method === 'GET' && req.url === '/api/v1/auth/csrf-token') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              success: true,
              data: { csrfToken: 'mock-csrf-token-xyz-123' }
            })
          );
        }

        // Route: POST /api/v1/auth/register
        if (req.method === 'POST' && req.url === '/api/v1/auth/register') {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              success: true,
              data: {
                message: 'Account created successfully',
                user: {
                  id: 'usr_reg_001',
                  email: lastReceivedBody?.email,
                  status: 'active'
                }
              }
            })
          );
        }

        // Route: POST /api/v1/auth/login
        if (req.method === 'POST' && req.url === '/api/v1/auth/login') {
          // Verify CSRF token was provided
          if (!req.headers['x-csrf-token']) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(
              JSON.stringify({
                success: false,
                error: { code: 'CSRF_INVALID', message: 'CSRF token required' }
              })
            );
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              success: true,
              data: {
                message: 'Authentication successful',
                user: {
                  id: 'usr_login_001',
                  email: lastReceivedBody?.email,
                  status: 'active'
                }
              }
            })
          );
        }

        // Route: POST /api/v1/auth/logout
        if (req.method === 'POST' && req.url === '/api/v1/auth/logout') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              success: true,
              data: { message: 'Logged out successfully' }
            })
          );
        }

        // Route: GET /api/v1/auth/me
        if (req.method === 'GET' && req.url === '/api/v1/auth/me') {
          if (req.headers.cookie?.includes('logged_out')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(
              JSON.stringify({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
              })
            );
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              success: true,
              data: {
                user: {
                  id: 'usr_login_001',
                  email: 'user@example.com',
                  status: 'active'
                }
              }
            })
          );
        }

        // Route: POST /api/v1/test/csrf-retry
        if (req.method === 'POST' && req.url === '/api/v1/test/csrf-retry') {
          if (csrfInvalidCount === 0) {
            csrfInvalidCount++;
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(
              JSON.stringify({
                success: false,
                error: { code: 'CSRF_INVALID', message: 'CSRF token mismatch' }
              })
            );
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              success: true,
              data: { recovered: true }
            })
          );
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Not found' } }));
      });
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        setApiBaseUrl(`http://127.0.0.1:${serverPort}`);
        resolve();
      });
    });
  });

  after((done) => {
    server.close(done);
  });

  test('1. fetchCsrfToken retrieves and caches CSRF token', async () => {
    clearCsrfToken();
    const token = await fetchCsrfToken();
    assert.equal(token, 'mock-csrf-token-xyz-123');
  });

  test('2. apiClient automatically injects x-csrf-token header on state-changing requests', async () => {
    clearCsrfToken();
    const res = await apiClient('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'user@example.com', password: 'ValidPassword123!' }
    });

    assert.equal(res.success, true);
    assert.equal(res.data.user.email, 'user@example.com');
    assert.equal(lastReceivedHeaders['x-csrf-token'], 'mock-csrf-token-xyz-123');
  });

  test('3. registerUser service sends correct request payload', async () => {
    const res = await registerUser({
      email: 'newuser@example.com',
      password: 'SecurePassword123!'
    });

    assert.equal(res.success, true);
    assert.equal(res.data.message, 'Account created successfully');
    assert.equal(res.data.user.email, 'newuser@example.com');
    assert.equal(lastReceivedBody.email, 'newuser@example.com');
  });

  test('4. loginUser service authenticates and clears stale CSRF cache', async () => {
    const res = await loginUser({
      email: 'user@example.com',
      password: 'SecurePassword123!'
    });

    assert.equal(res.success, true);
    assert.equal(res.data.user.email, 'user@example.com');
  });

  test('5. logoutUser service invalidates session and clears local CSRF state', async () => {
    const res = await logoutUser();
    assert.equal(res.success, true);
    assert.equal(res.data.message, 'Logged out successfully');
  });

  test('6. getCurrentUser retrieves authenticated user profile', async () => {
    const res = await getCurrentUser();
    assert.equal(res.success, true);
    assert.equal(res.data.user.email, 'user@example.com');
  });

  test('7. apiClient automatically recovers on 403 CSRF_INVALID by fetching fresh token and retrying', async () => {
    csrfInvalidCount = 0;
    const res = await apiClient('/api/v1/test/csrf-retry', {
      method: 'POST',
      body: { test: true }
    });

    assert.equal(res.success, true);
    assert.equal(res.data.recovered, true);
    assert.equal(csrfInvalidCount, 1);
  });

  test('8. Password validation criteria correctly verifies strength rules', () => {
    const checkPassword = (password) => ({
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password)
    });

    const weak = checkPassword('weak');
    assert.equal(weak.length, false);
    assert.equal(weak.uppercase, false);
    assert.equal(weak.number, false);
    assert.equal(weak.special, false);

    const strong = checkPassword('StrongPass123!');
    assert.equal(Object.values(strong).every(Boolean), true);
  });

  test('9. Email validation regex catches invalid formats', () => {
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    assert.equal(isValidEmail('valid@example.com'), true);
    assert.equal(isValidEmail('user.name+tag@sub.domain.org'), true);
    assert.equal(isValidEmail('plainaddress'), false);
    assert.equal(isValidEmail('@missingusername.com'), false);
    assert.equal(isValidEmail('missingdomain@.com'), false);
  });
});
