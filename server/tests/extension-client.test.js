import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('Service worker restricts callers, keeps credentials trusted, sends metadata only, and preserves failed-disconnect retry', async () => {
  const oldChrome = globalThis.chrome; const oldFetch = globalThis.fetch;
  const storage = {}; const requests = []; const opened = []; let listener; let access;
  const id = 'a'.repeat(32);
  const tokens = { accessToken: 'a'.repeat(43), refreshToken: 'b'.repeat(43), revocationToken: 'c'.repeat(43), accessExpiresAt: new Date(Date.now() + 300000).toISOString(), refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(), account: { id: 'alice', email: 'alice@example.test' } };
  const pair = { pairingId: 'request-id', deviceCode: 'd'.repeat(43), verificationCode: '1234ABCD', expiresAt: new Date(Date.now() + 300000).toISOString() };
  let approved = false; let disconnectFails = false;
  globalThis.chrome = {
    storage: { local: {
      setAccessLevel: async (options) => { access = options.accessLevel; },
      get: async () => { assert.equal(access, 'TRUSTED_CONTEXTS'); return structuredClone(storage); },
      set: async (data) => { assert.equal(access, 'TRUSTED_CONTEXTS'); Object.assign(storage, structuredClone(data)); },
      remove: async (keys) => { for (const key of Array.isArray(keys) ? keys : [keys]) delete storage[key]; }
    } },
    runtime: { id, getURL: (path) => `chrome-extension://${id}/${path}`, onMessage: { addListener: (fn) => { listener = fn; } } },
    tabs: { create: async (options) => { opened.push(options.url); }, get: async () => ({ url: 'https://example.test/apply' }),
      sendMessage: async (tab, message, callback) => {
        if (message.type === 'PING') return { status: 'PONG' };
        callback({ success: true, url: 'https://example.test/private', title: 'Private title', fields: [{ fieldId: 'f1', label: 'Name', type: 'text', value: 'never send', constraints: { maxlength: 50 } }], stats: { excludedCount: 0 } });
      }
    }
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    const path = new URL(url).pathname;
    let data;
    if (path.endsWith('/pairing')) data = pair;
    else if (path.endsWith('/exchange')) data = approved ? tokens : { pending: true };
    else if (path.endsWith('/me')) data = { account: tokens.account };
    else if (path.endsWith('/match')) {
      assert.equal(options.headers.Authorization, `Bearer ${tokens.accessToken}`);
      const body = JSON.parse(options.body);
      assert.deepEqual(Object.keys(body), ['fields']);
      assert.equal(body.fields[0].value, undefined);
      assert.equal(body.fields[0].constraints.maxlength, 50);
      assert.doesNotMatch(options.body, /never send|Private title|example.test\/private/);
      data = { results: [{ fieldId: 'f1', status: 'matched', value: 'Alice', source: { label: 'Applicant name' } }], summary: { matched: 1 } };
    } else if (path.endsWith('/disconnect')) {
      assert.deepEqual(JSON.parse(options.body), { revocationToken: tokens.revocationToken });
      if (disconnectFails) throw new Error('Offline');
      data = { disconnected: true };
    } else throw new Error('Unexpected request');
    return Response.json({ success: true, data });
  };
  try {
    await import('../../extension/background/service-worker.js');
    const sender = { id, url: `chrome-extension://${id}/popup/popup.html` };
    const send = (message) => new Promise((resolve) => { assert.equal(listener(message, sender, resolve), true); });
    assert.equal(listener({ type: 'CONNECT_ACCOUNT' }, { id, url: 'https://example.test', tab: { id: 1 } }, () => assert.fail('Untrusted caller got a response')), false);
    const pending = await send({ type: 'CONNECT_ACCOUNT' });
    assert.equal(pending.data.state, 'pending');
    assert.equal(pending.data.deviceCode, undefined);
    assert.equal(opened[0], 'http://localhost:5173/extension/connect/request-id');
    assert.ok(!opened[0].includes(pair.deviceCode));
    approved = true;
    const connected = await send({ type: 'CONNECTION_STATUS' });
    assert.equal(connected.data.state, 'connected');
    assert.equal(connected.data.accessToken, undefined);
    assert.equal(storage.authorization.accessToken, tokens.accessToken);
    const analyzed = await send({ type: 'ANALYZE_FORM', tabId: 7 });
    assert.equal(analyzed.data.results[0].value, 'Alice');
    assert.ok(!JSON.stringify(analyzed).includes(tokens.accessToken));
    disconnectFails = true;
    assert.equal((await send({ type: 'DISCONNECT_ACCOUNT' })).success, false);
    assert.ok(storage.authorization);
    disconnectFails = false;
    assert.equal((await send({ type: 'DISCONNECT_ACCOUNT' })).data.state, 'disconnected');
    assert.equal(storage.authorization, undefined);
  } finally { globalThis.chrome = oldChrome; globalThis.fetch = oldFetch; }
});

test('Popup renders real account/suggestions safely and clears results on disconnect', async () => {
  const dom = new JSDOM(readFileSync(new URL('../../extension/popup/popup.html', import.meta.url), 'utf8'), { url: 'https://popup.test', runScripts: 'outside-only' });
  let isConnected = true;
  const account = { id: 'alice', email: 'alice@example.test' };
  dom.window.chrome = { tabs: { query: async () => [{ id: 1, url: 'https://example.test', title: 'Form' }] }, runtime: { sendMessage: async (message, callback) => {
    if (message.type === 'DISCONNECT_ACCOUNT') { isConnected = false; return { success: true, data: { state: 'disconnected' } }; }
    if (message.type === 'CONNECTION_STATUS') return { success: true, data: isConnected ? { state: 'connected', account } : { state: 'disconnected' } };
    assert.equal(message.type, 'ANALYZE_FORM');
    callback({ success: true, data: { fields: [{ fieldId: '1', label: 'Name', type: 'text' }], results: [{ fieldId: '1', status: 'needs_review', value: '<img src=x>', source: { label: 'Applicant name' } }] } });
  } } };
  try {
    const script = readFileSync(new URL('../../extension/popup/popup.js', import.meta.url), 'utf8').replace(/^import[^\n]+\n/, "const WEBSITE_URL = 'http://localhost:5173';\n");
    dom.window.eval(script); await new Promise(setImmediate);
    const doc = dom.window.document;
    assert.equal(doc.getElementById('connectionTitle').textContent, 'Account connected');
    assert.equal(doc.getElementById('btnText').textContent, 'Analyze form');
    doc.getElementById('detectBtn').click(); await new Promise(setImmediate);
    assert.equal(doc.querySelector('.suggestion-value').textContent, '<img src=x>');
    assert.equal(doc.querySelectorAll('img').length, 0);
    assert.equal(doc.querySelector('.review-status').textContent, 'Review needed');
    doc.getElementById('disconnectBtn').click(); await new Promise(setImmediate);
    assert.equal(doc.querySelectorAll('.suggestion').length, 0);
    assert.equal(doc.getElementById('btnText').textContent, 'Detect fields');
  } finally { dom.window.close(); }
});
