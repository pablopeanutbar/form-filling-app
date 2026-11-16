import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { createExtensionService } from '../src/services/extension.service.js';
import { createExtensionRouter } from '../src/routes/extension.routes.js';
import { generateCsrfToken, csrfErrorHandler } from '../src/middleware/csrf.middleware.js';
import { ExtensionPairing, ExtensionGrant } from '../src/models/extension.model.js';

// Isolated atomic in-memory repository: exercises service logic and HTTP boundaries,
// without connecting to or modifying a developer's configured MongoDB database.
function model() {
  const rows = [];
  const matches = (row, query) => Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$gt' in value) return row[key] > value.$gt;
    if (value && typeof value === 'object' && '$in' in value) return value.$in.includes(row[key]);
    return String(row[key]) === String(value);
  });
  return {
    rows,
    async create(value) { const row = { ...value, _id: String(rows.length + 1).padStart(24, '0'), createdAt: new Date() }; rows.push(row); return { ...row }; },
    async findOne(query) { const row = rows.find((r) => matches(r, query)); return row ? { ...row } : null; },
    async findOneAndUpdate(query, update) { const row = rows.find((r) => matches(r, query)); if (!row) return null; Object.assign(row, update.$set); return { ...row }; },
    find(query) { return { select: () => ({ lean: async () => rows.filter((r) => matches(r, query)).map((r) => ({ ...r })) }) }; }
  };
}
const extensionId = 'a'.repeat(32);
function setup() {
  const Pairing = model(); const Grant = model();
  let time = Date.now();
  const service = createExtensionService({ Pairing, Grant, now: () => time, getUser: async (id) => ['alice', 'bob'].includes(id) ? { id, email: `${id}@example.test`, status: 'active' } : null });
  const approve = async (user = 'alice') => {
    const pair = await service.start(extensionId);
    await service.decide(pair.pairingId, pair.verificationCode, true, user);
    return { pair, token: await service.exchange(extensionId, pair.deviceCode) };
  };
  return { service, Pairing, Grant, approve, advance: (ms) => { time += ms; } };
}

test('Pairing is pending until explicit approval; secrets never appear in website inspection or database plaintext', async () => {
  const { service, Pairing, Grant } = setup();
  const pair = await service.start(extensionId);
  assert.deepEqual(await service.exchange(extensionId, pair.deviceCode), { pending: true });
  const info = await service.inspect(pair.pairingId);
  assert.equal(info.deviceCode, undefined);
  await assert.rejects(service.decide(pair.pairingId, '00000000', true, 'alice'));
  await service.decide(pair.pairingId, pair.verificationCode, true, 'alice');
  const token = await service.exchange(extensionId, pair.deviceCode);
  assert.equal(token.account.id, 'alice'); assert.equal(token.scope, 'match:read');
  const stored = JSON.stringify([...Pairing.rows, ...Grant.rows]);
  for (const value of [pair.deviceCode, token.accessToken, token.refreshToken, token.revocationToken]) assert.ok(!stored.includes(value));
  await assert.rejects(service.exchange(extensionId, pair.deviceCode));
});

test('Pairing expiry, cancellation, denial and concurrent replay fail closed', async () => {
  const { service, advance } = setup();
  const expired = await service.start(extensionId); advance(300001);
  await assert.rejects(service.exchange(extensionId, expired.deviceCode));
  await assert.rejects(service.decide(expired.pairingId, expired.verificationCode, true, 'alice'));
  const cancelled = await service.start(extensionId); await service.cancel(extensionId, cancelled.deviceCode);
  await assert.rejects(service.exchange(extensionId, cancelled.deviceCode));
  const denied = await service.start(extensionId); await service.decide(denied.pairingId, denied.verificationCode, false, 'alice');
  await assert.rejects(service.exchange(extensionId, denied.deviceCode));
  const pair = await service.start(extensionId); await service.decide(pair.pairingId, pair.verificationCode, true, 'alice');
  const results = await Promise.allSettled([service.exchange(extensionId, pair.deviceCode), service.exchange(extensionId, pair.deviceCode)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
});

test('Access expiry, rotating renewal, extension binding and revocation are enforced', async () => {
  const { service, approve, advance } = setup();
  const { token } = await approve();
  await assert.rejects(service.authenticate('b'.repeat(32), token.accessToken));
  advance(300001);
  await assert.rejects(service.authenticate(extensionId, token.accessToken));
  const refreshed = await service.refresh(extensionId, token.refreshToken);
  await assert.rejects(service.refresh(extensionId, token.refreshToken));
  assert.equal((await service.authenticate(extensionId, refreshed.accessToken)).account.id, 'alice');
  await service.revoke(extensionId, token.revocationToken);
  await assert.rejects(service.authenticate(extensionId, refreshed.accessToken));
  await assert.rejects(service.refresh(extensionId, refreshed.refreshToken));
  const another = await approve(); advance(7 * 86400000 + 1);
  await assert.rejects(service.refresh(extensionId, another.token.refreshToken));
});

test('Website listing and revocation isolate users; concurrent refresh and revocation cannot restore a grant', async () => {
  const { service, approve } = setup();
  const { token } = await approve('alice');
  await approve('bob');
  const alice = await service.list('alice'); const bob = await service.list('bob');
  assert.equal(alice.length, 1); assert.equal(bob.length, 1); assert.notEqual(alice[0].id, bob[0].id);
  assert.equal(alice[0].accessHash, undefined);
  await assert.rejects(service.revokeOwned('bob', alice[0].id));
  const rotations = await Promise.allSettled([service.refresh(extensionId, token.refreshToken), service.refresh(extensionId, token.refreshToken)]);
  assert.equal(rotations.filter((r) => r.status === 'fulfilled').length, 1);
  await service.revokeOwned('alice', alice[0].id);
  await assert.rejects(service.authenticate(extensionId, rotations.find((r) => r.status === 'fulfilled').value.accessToken));
});

test('Mongo models define unique token hashes and TTL indexes; lifetime checks do not depend on cleanup', () => {
  assert.ok(ExtensionPairing.schema.indexes().some(([keys, options]) => keys.deviceHash && options.unique));
  assert.ok(ExtensionGrant.schema.indexes().some(([keys, options]) => keys.refreshHash && options.unique));
  assert.ok(ExtensionGrant.schema.indexes().some(([keys, options]) => keys.expiresAt && options.expireAfterSeconds === 0));
});

test('Real HTTP boundary requires session/CSRF approval, rejects cookies for matching, binds identity and rate limits pairing', async () => {
  const { service, approve } = setup();
  const app = express(); app.use(express.json()); app.use(cookieParser());
  app.use(session({ secret: 'isolated-test-session-secret-long-enough', resave: false, saveUninitialized: false }));
  // Test-only login fixture; production uses the existing authentication routes.
  app.post('/login-fixture', (req, res) => { req.session.userId = 'alice'; res.json({ csrf: generateCsrfToken(req, res, true) }); });
  const sessionAuth = (req, res, next) => { if (!req.session.userId) return res.sendStatus(401); req.user = { id: req.session.userId }; next(); };
  app.use('/extension', createExtensionRouter({ service, ids: [extensionId], sessionAuth,
    match: (req, res) => res.json({ success: true, userId: req.user.id, fields: req.validatedBody.fields }) }));
  app.use(csrfErrorHandler);
  app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ error: error.code }));
  const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const clientHeaders = { 'Content-Type': 'application/json', 'X-Extension-Id': extensionId, Origin: `chrome-extension://${extensionId}` };
  try {
    const pair = await service.start(extensionId);
    assert.equal((await fetch(`${base}/extension/pairing/${pair.pairingId}`)).status, 401);
    const login = await fetch(`${base}/login-fixture`, { method: 'POST' });
    const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    const { csrf } = await login.json();
    const decision = { verificationCode: pair.verificationCode, approved: true };
    const post = (url, body, headers = {}) => fetch(`${base}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    assert.equal((await post(`/extension/pairing/${pair.pairingId}/decision`, decision, { Cookie: cookie })).status, 403);
    assert.equal((await post(`/extension/pairing/${pair.pairingId}/decision`, decision, { Cookie: cookie, 'x-csrf-token': csrf })).status, 200);
    assert.equal((await post('/extension/match', { fields: [{ label: 'Name' }] }, { ...clientHeaders, Cookie: cookie })).status, 401);
    const { token } = await approve('bob');
    const match = await post('/extension/match', { fields: [{ label: 'Name' }] }, { ...clientHeaders, Authorization: `Bearer ${token.accessToken}` });
    assert.equal(match.status, 200); assert.equal((await match.json()).userId, 'bob');
    assert.equal((await post('/extension/match', { userId: 'alice', fields: [{ label: 'Name' }] }, { ...clientHeaders, Authorization: `Bearer ${token.accessToken}` })).status, 400);
    assert.equal((await post('/extension/pairing', {}, { ...clientHeaders, Origin: 'http://localhost:5173' })).status, 403);
    await service.revoke(extensionId, token.revocationToken);
    assert.equal((await post('/extension/match', { fields: [{ label: 'Name' }] }, { ...clientHeaders, Authorization: `Bearer ${token.accessToken}` })).status, 401);
    for (let i = 0; i < 10; i++) assert.equal((await post('/extension/pairing', {}, clientHeaders)).status, 200);
    assert.equal((await post('/extension/pairing', {}, clientHeaders)).status, 429);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
