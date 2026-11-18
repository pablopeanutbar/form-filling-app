import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from '../../server/node_modules/jsdom/lib/api.js';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

test('profile feedback waits for success, replays, dismisses and cleans up', async (t) => {
  const { outputFiles } = await build({
    stdin: { contents: `
      export { SaveSuccessFeedback } from './src/components/profile/SaveSuccessFeedback.jsx';
      export { EditForm } from './src/components/profile/EditForm.jsx';
      export { UnsavedProvider } from './src/context/UnsavedContext.jsx';
    `, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
    bundle: true, packages: 'external', jsx: 'automatic', format: 'cjs', write: false, loader: { '.css': 'empty' }
  });
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
  const { SaveSuccessFeedback, EditForm, UnsavedProvider } = compiled.exports;
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
  const canvasModes = [];
  dom.window.HTMLCanvasElement.prototype.getContext = (mode) => {
    canvasModes.push(mode);
    return null;
  };
  const timers = new Map();
  let reducedMotion = false;
  let pending;
  const globals = {
    window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    setTimeout(callback, delay, ...args) {
      if (![1950, 2200].includes(delay)) return originalSetTimeout(callback, delay, ...args);
      const token = Symbol();
      timers.set(token, { callback, delay });
      return token;
    },
    clearTimeout(token) {
      if (typeof token === 'symbol') timers.delete(token);
      else originalClearTimeout(token);
    }
  };
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const previous = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  dom.window.matchMedia = () => ({ matches: reducedMotion });
  const root = createRoot(document.querySelector('#root'));
  let mounted = true;
  t.after(async () => {
    if (mounted) await act(() => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  function Form() {
    const [saveCount, setSaveCount] = useState(0);
    return React.createElement(UnsavedProvider, null,
      React.createElement(EditForm, {
        fields: [{ name: 'postalCode', label: 'Postal code' }], value: { postalCode: '654321' },
        addressCopy: { value: { postalCode: '012345' } }, title: 'Correspondence address',
        onSave: (body) => new Promise((resolve, reject) => { pending = { resolve, reject, body }; }),
        onSaved: () => setSaveCount((count) => count + 1)
      }),
      React.createElement(SaveSuccessFeedback, { saveCount }));
  }
  const router = createMemoryRouter([{ path: '/', element: React.createElement(Form) }]);
  await act(() => root.render(React.createElement(RouterProvider, { router, future: { v7_startTransition: true } })));
  const card = () => document.querySelector('.save-success-card');
  const submit = () => act(() => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  const fire = (delay) => act(() => {
    const [token, timer] = [...timers].find(([, entry]) => entry.delay === delay);
    timers.delete(token);
    timer.callback();
  });

  const checkbox = document.querySelector('input[type="checkbox"]');
  const postalCode = document.querySelector('input[name="postalCode"]');
  assert.equal(document.querySelector('.save-bar [role="status"]').textContent, '');
  await act(() => { checkbox.click(); });
  assert.equal(postalCode.value, '012345');
  assert.equal(postalCode.disabled, true);
  await act(() => { checkbox.click(); });
  assert.equal(postalCode.value, '654321');
  assert.equal(postalCode.disabled, false);
  await act(() => { checkbox.click(); });
  await submit();
  assert.equal(pending.body.postalCode, '012345');
  assert.equal(card(), null);
  assert.match(document.querySelector('button[type="submit"]').textContent, /Saving/);
  await act(async () => { pending.reject(new Error('Offline')); });
  assert.ok(document.querySelector('[role="alert"]'));
  assert.equal(card(), null);
  await submit();
  await act(async () => { pending.resolve(pending.body); });
  const first = card();
  assert.match(first.textContent, /Details saved successfully/);
  assert.equal(first.querySelector('[data-mode="flap"]').style.opacity, '0');
  assert.match(document.querySelector('.sr-only[role="status"]').textContent, /Details saved successfully/);
  const oldTimers = [...timers.keys()];
  reducedMotion = true;
  await submit();
  await act(async () => { pending.resolve(pending.body); });
  assert.notEqual(card(), first);
  assert.notEqual(card().querySelector('[data-mode="flap"]').style.opacity, '0');
  assert.ok(oldTimers.every((timer) => !timers.has(timer)));
  await fire(1950);
  assert.ok(card().hasAttribute('data-exiting'));
  await fire(2200);
  assert.equal(card(), null);
  await submit();
  await act(async () => { pending.resolve(pending.body); });
  assert.equal(timers.size, 2);
  await act(() => root.unmount());
  mounted = false;
  assert.equal(timers.size, 0);
  assert.ok(canvasModes.every((mode) => mode === '2d'));
});
