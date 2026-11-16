import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = (name) => readFileSync(new URL('../../extension/content/' + name, import.meta.url), 'utf8');
const extensionOrigin = 'chrome-extension://former-test/';
const worker = { id: 'former-test', url: extensionOrigin + 'background/service-worker.js' };

async function withForm(html, action) {
  const dom = new JSDOM('<form>' + html + '</form>', {
    url: 'https://test.example/form', runScripts: 'outside-only', pretendToBeVisual: true
  });
  let listener;
  dom.window.chrome = { runtime: {
    id: worker.id, getURL: (path) => extensionOrigin + path,
    onMessage: { addListener: (fn) => { listener = fn; } }
  } };
  dom.window.eval(source('fill.js'));
  dom.window.eval(source('content.js'));
  const send = (request, sender = worker) => new Promise((resolve) => {
    const pending = listener(request, sender, resolve);
    if (pending === false) resolve(undefined);
  });
  const analysis = await send({ type: 'EXTRACT_FIELDS', analysisId: 'review-a' });
  const fill = (values, options = {}) => send({
    type: 'FILL_FIELDS', analysisId: options.id || 'review-a',
    proposals: Object.entries(values).map(([id, value]) => ({
      fieldId: analysis.fields.find((field) => field.id === id).fieldId, value, overwrite: options.overwrite === true
    }))
  });
  try { await action(dom.window, fill, send); } finally { dom.window.close(); }
}

test('writes native text, number, email, telephone, date and textarea values without submitting', async () => {
  await withForm('<input id="t"><input id="n" type="number" min="2" step="2"><input id="e" type="email"><input id="p" type="tel"><input id="d" type="date"><textarea id="a"></textarea><button>Submit</button>', async (window, fill) => {
    const doc = window.document;
    const events = [];
    doc.querySelector('form').addEventListener('submit', () => events.push('submit'));
    doc.querySelector('button').addEventListener('click', () => events.push('click'));
    const input = doc.getElementById('t');
    const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    let tracked = '';
    Object.defineProperty(input, 'value', {
      get: () => native.get.call(input),
      set(value) { tracked = value; native.set.call(input, value); }
    });
    input.addEventListener('input', () => {
      if (tracked !== input.value) events.push('observed controlled input');
    });
    input.addEventListener('change', () => events.push('change'));
    const values = { t: 'Example', n: '4', e: 'fake@example.test', p: '+15550001234', d: '2001-05-23', a: 'Some notes' };
    const response = await fill(values);
    assert.ok(response.results.every(({ status }) => status === 'filled'));
    for (const [id, value] of Object.entries(values)) assert.equal(doc.getElementById(id).value, value);
    assert.deepEqual(events, ['observed controlled input', 'change']);
  });
});

test('validates select options, radio groups, number ranges and overwrite approval', async () => {
  await withForm('<input id="n" type="number" min="2" max="8" step="2"><input id="t" value="Existing"><select id="s"><option value="">Choose</option><option value="A">Alpha</option><option value="B" disabled>Beta</option></select><fieldset><legend>Choice</legend><input id="r" name="group" value="X" type="radio"><input id="r2" name="group" value="Y" type="radio"></fieldset>', async (window, fill) => {
    const doc = window.document;
    assert.ok((await fill({ n: '3', t: 'New', s: 'B' })).results.every(({ status }) => status === 'skipped'));
    assert.equal(doc.getElementById('t').value, 'Existing');
    assert.ok((await fill({ t: 'New', s: 'A', r: 'Y' }, { overwrite: true })).results.every(({ status }) => status === 'filled'));
    assert.equal(doc.getElementById('s').value, 'A');
    assert.equal(doc.getElementById('r2').checked, true);
    assert.equal((await fill({ r: 'X' })).results[0].status, 'skipped');
  });
});

test('uses element identity across inserted fields and rejects replacements, type changes and stale reviews', async () => {
  await withForm('<label for="a">Name</label><input id="a" name="same"><label for="b">Name</label><input id="b" name="same"><input id="c" aria-label="Third">', async (window, fill, send) => {
    const doc = window.document;
    doc.querySelector('form').insertAdjacentHTML('afterbegin', '<input id="new" aria-label="Inserted">');
    const original = doc.getElementById('b');
    original.replaceWith(original.cloneNode());
    doc.getElementById('c').type = 'email';
    assert.equal((await fill({ a: 'Old' }, { id: 'stale' })).success, false);
    await send({ type: 'EXTRACT_FIELDS' });
    const response = await fill({ a: 'Right', b: 'Wrong', c: 'Changed' });
    assert.deepEqual(Array.from(response.results, ({ status }) => status), ['filled', 'skipped', 'skipped']);
    assert.equal(doc.getElementById('a').value, 'Right');
    assert.equal(doc.getElementById('new').value, '');
    assert.equal(doc.getElementById('b').value, '');
    window.history.pushState({}, '', '/other');
    assert.equal((await fill({ a: 'Other' })).success, false);
  });
});

test('skips sensitive, disabled, readonly and consent controls and detects a reverted answer', async () => {
  await withForm('<label for="b">Bank account</label><input id="b"><input id="d" disabled><input id="r" readonly><label for="c">Accept consent</label><input id="c" type="checkbox"><input id="t" aria-label="Name">', async (window, fill, send) => {
    const doc = window.document;
    doc.getElementById('t').addEventListener('input', (event) => { event.target.value = ''; });
    assert.equal(await send({ type: 'EXTRACT_FIELDS' }, { ...worker, tab: { id: 1 } }), undefined);
    const response = await fill({ b: 'Sensitive', d: 'Disabled', r: 'Readonly', c: 'true', t: 'Reverted' });
    assert.deepEqual(Array.from(response.results, ({ status }) => status), ['skipped', 'skipped', 'skipped', 'skipped', 'failed']);
    assert.equal(doc.getElementById('b').value, '');
    assert.equal(doc.getElementById('c').checked, false);
  });
});
test('worker binds fill to the active tab, panel document, analysis, and original webpage document', async () => {
  const { runInNewContext } = await import('node:vm');
  const { webcrypto } = await import('node:crypto');
  const source = readFileSync(new URL('../../extension/background/service-worker.js', import.meta.url), 'utf8');
  const listeners = {};
  const event = (name) => ({ addListener: (callback) => { listeners[name] = callback; } });
  const tab = { id: 9, active: true, windowId: 3, url: 'https://test.example/form' };
  const panel = { id: 'former-test', url: extensionOrigin + 'sidepanel/review.html', documentId: 'panel-a' };
  let connected = true;
  let fills = 0;
  let pageDocument = 'page-a';
  const stored = new Map();
  const storage = {
    get: async (key) => key === null ? Object.fromEntries(stored) : { [key]: stored.get(key) },
    set: async (values) => Object.entries(values).forEach(([key, value]) => stored.set(key, structuredClone(value))),
    remove: async (keys) => [].concat(keys).forEach((key) => stored.delete(key))
  };
  const chrome = {
    runtime: { id: panel.id, getURL: (p) => extensionOrigin + p, onInstalled: event('install'),
      onMessage: event('message'), sendMessage: async () => {} },
    storage: { session: storage },
    action: { onClicked: event('click') },
    scripting: { executeScript: async () => [{ documentId: 'page-a' }] },
    tabs: {
      onRemoved: event('remove'), onUpdated: event('update'), get: async (id) => ({ ...tab, id }),
      sendMessage(tabId, message, options, callback) {
        assert.equal(tabId, tab.id);
        if (options.documentId !== pageDocument) return Promise.reject(new Error('Document replaced'));
        if (message.type === 'CHECK_REVIEW') return Promise.resolve({ success: true });
        if (message.type === 'EXTRACT_FIELDS') {
          callback({ success: true, fields: [{ fieldId: 'field_0' }, { fieldId: 'field_1' }, { fieldId: 'field_2' }] });
        } else {
          fills++;
          return Promise.resolve({ success: true, results: [{ status: 'filled' }] });
        }
      }
    }
  };
  const startWorker = () => runInNewContext(source.replace(/^import .*\r?\n/, ''), {
    chrome, crypto: webcrypto,
    connectionActions: { CONNECTION_STATUS: async () => ({ state: connected ? 'connected' : 'disconnected' }) },
    withConnectionLock: (action) => Promise.resolve().then(action),
    analyzeFields: async () => ({ results: [
      { fieldId: 'field_0', status: 'matched', value: 'Example' },
      { fieldId: 'field_1', status: 'unmatched', value: null },
      { fieldId: 'field_2', status: 'needs_review', value: 'Review me' }
    ] })
  });
  startWorker();
  const send = (request, sender = panel) => new Promise((resolve) => listeners.message({
    tabId: tab.id, windowId: tab.windowId, ...request
  }, sender, resolve));
  const analyze = async () => (await send({ type: 'ANALYZE_FORM' })).data.analysisId;
  const fill = (analysisId, overrides, sender) => send({
    type: 'FILL_FORM', analysisId,
    proposals: [{ fieldId: 'field_0', value: 'Example', overwrite: false, approved: true }],
    ...overrides
  }, sender);

  const first = await analyze();
  startWorker();
  assert.equal((await send({ type: 'CONNECTION_STATUS' })).success, true);
  assert.equal((await send({ type: 'DETECT_FIELDS' })).success, true);
  assert.equal((await fill(first, { mode: 'matched' })).success, true);
  const old = first;
  const current = await analyze();
  assert.equal((await fill(old)).success, false);
  assert.equal((await fill(current, { tabId: 10 })).success, false);
  assert.equal((await fill(current, {}, { ...panel, documentId: 'panel-b' })).success, false);
  assert.equal((await fill(current, { proposals: [{ fieldId: 'field_1', value: 'wrong', approved: true, overwrite: false }] })).success, false);
  tab.active = false;
  assert.equal((await fill(current)).success, false);
  tab.active = true;
  assert.equal((await fill(current)).success, true);
  const reviewProposal = { fieldId: 'field_2', value: 'Review me', approved: true, overwrite: false };
  assert.equal((await fill(current, { mode: 'matched', proposals: [reviewProposal] })).success, false);
  pageDocument = 'page-b';
  assert.equal((await fill(current)).success, false);
  pageDocument = 'page-a';
  stored.get('former-review:9').expiresAt = Date.now() - 1;
  assert.equal((await fill(current)).success, false);
  const next = await analyze();
  connected = false;
  assert.equal((await fill(next)).success, false);
  assert.equal(fills, 2);
});
test('React controlled text input commits the approved value to component state', async () => {
  await withForm('<div id="root"></div>', async (window, _fill, send) => {
    const load = (name) => readFileSync(new URL('../../client/node_modules/' + name, import.meta.url), 'utf8');
    window.eval(load('react/umd/react.development.js'));
    window.eval(load('react-dom/umd/react-dom.development.js'));
    const { React, ReactDOM } = window;
    function ControlledField() {
      const [value, setValue] = React.useState('');
      return React.createElement(React.Fragment, null,
        React.createElement('input', { id: 'controlled', value, onChange: (event) => setValue(event.target.value) }),
        React.createElement('output', null, value));
    }
    const root = ReactDOM.createRoot(window.document.getElementById('root'));
    ReactDOM.flushSync(() => root.render(React.createElement(ControlledField)));
    const review = await send({ type: 'EXTRACT_FIELDS', analysisId: 'react-review' });
    const response = await send({
      type: 'FILL_FIELDS', analysisId: 'react-review',
      proposals: [{ fieldId: review.fields[0].fieldId, value: 'Approved answer', overwrite: false }]
    });
    assert.equal(response.results[0].status, 'filled');
    assert.equal(window.document.querySelector('output').textContent, 'Approved answer');
    root.unmount();
  });
});
test('panel selects matched fields in bulk and sends review entries only through manual approval', async () => {
  const readPanel = (name) => readFileSync(new URL('../../extension/sidepanel/' + name, import.meta.url), 'utf8');
  const dom = new JSDOM(readPanel('review.html'), { runScripts: 'outside-only' });
  const { window } = dom;
  const doc = window.document;
  const $ = (id) => doc.getElementById(id);
  const event = { addListener() {} };
  const requests = [];
  const entries = [['a', 'matched', 'text'], ['b', 'matched', 'text'], ['c', 'needs_review', 'text'], ['d', 'matched', 'checkbox']];
  window.chrome = {
    windows: { getCurrent: async () => ({ id: 3 }) },
    tabs: { query: async () => [{ id: 9 }], onActivated: event, onUpdated: event, onRemoved: event },
    runtime: {
      onMessage: event,
      async sendMessage(message) {
        if (message.type === 'CONNECTION_STATUS') return { success: true, data: { state: 'connected', account: { email: 'example@example.test' } } };
        if (message.type === 'ANALYZE_FORM') return { success: true, data: {
          analysisId: 'first', expiresAt: Date.now() + 60000,
          fields: entries.map(([fieldId, , type]) => ({ fieldId, type, label: fieldId })),
          results: entries.map(([fieldId, status]) => ({ fieldId, status, value: 'Example' }))
        } };
        requests.push(message);
        return { success: true, data: message.proposals.map(({ fieldId }) => ({
          fieldId, status: message.mode === 'matched' ? 'filled' : 'skipped', reason: 'Existing answer'
        })) };
      }
    }
  };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  try {
    window.eval(readPanel('review.js'));
    await settle();
    $('analyze').click();
    await settle();
    assert.equal(requests.length, 0);
    $('select-all').click();
    assert.equal($('selection').textContent, '2 fields selected');
    doc.querySelector('[aria-label="Select suggestion for a"]').click();
    assert.equal($('select-all').indeterminate, true);
    $('clear-selection').click();
    assert.equal($('selection').textContent, '0 fields selected');
    doc.querySelector('[aria-label="Select suggestion for c"]').click();
    $('fill-all').click();
    await settle();
    assert.deepEqual(Array.from(requests[0].proposals, (proposal) => proposal.fieldId), ['a', 'b']);
    assert.equal(requests[0].mode, 'matched');
    assert.match($('fill-results').textContent, /2 filled/);
    assert.equal($('selection').textContent, '1 field selected');
    $('fill').click();
    await settle();
    assert.deepEqual(Array.from(requests[1].proposals, (proposal) => proposal.fieldId), ['c']);
    assert.match($('fill-results').textContent, /1 skipped/);
  } finally { window.close(); }
});
