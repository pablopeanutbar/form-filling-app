import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app, { closeApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Backend Foundation & Liveness/Readiness API Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await connectDB();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeApp();
    await disconnectDB();
  });

  test('GET /api/v1/health returns 200 and liveness payload', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.service, 'formER Backend API');
    assert.equal(body.data.status, 'alive');
    assert.ok(typeof body.data.uptime === 'number');
    assert.ok(typeof body.data.timestamp === 'string');
    assert.ok(body.data.database && typeof body.data.database.status === 'string');
  });

  test('GET /api/v1/ready returns 200 when database is connected', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ready`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ready');
    assert.equal(body.data.database, 'connected');
  });

  test('GET unmatched route returns 404 with structured JSON error', async () => {
    const res = await fetch(`${baseUrl}/api/v1/nonexistent-endpoint`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.error.message.includes('/api/v1/nonexistent-endpoint'));
  });

  test('Security headers (Helmet) are present on responses', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });
});
