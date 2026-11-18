import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from '../../server/node_modules/jsdom/lib/api.js';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

test('hover buttons preserve navigation, disabled behavior and click handlers', async () => {
  const { outputFiles } = await build({
    entryPoints: [fileURLToPath(new URL('../src/components/ui/interactive-hover-button.jsx', import.meta.url))],
    bundle: true, write: false, format: 'cjs', packages: 'external', loader: { '.css': 'empty' }
  });
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
  const { InteractiveHoverButton } = compiled.exports;
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const keys = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'];
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true }
  });
  const root = createRoot(document.querySelector('#root'));
  let clicks = 0;
  try {
    await act(async () => root.render(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
      React.createElement(InteractiveHoverButton, { to: '/extension' }, 'Download extension'),
      React.createElement(InteractiveHoverButton, { onClick: () => clicks++ }, 'Action'),
      React.createElement(InteractiveHoverButton, { to: '/blocked', disabled: true, onClick: () => clicks++ }, 'Disabled link'),
      React.createElement(InteractiveHoverButton, { disabled: true, onClick: () => clicks++ }, 'Disabled button')
    )));
    assert.equal(document.querySelector('a').getAttribute('href'), '/extension');
    assert.ok(document.querySelector('a .ihb-touch-arrow'));
    await act(async () => document.querySelector('button').click());
    assert.equal(clicks, 1);
    const disabled = document.querySelector('[aria-disabled="true"]');
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    await act(async () => disabled.dispatchEvent(event));
    assert.equal(event.defaultPrevented, true);
    assert.equal(disabled.tabIndex, -1);
    document.querySelector('button:disabled').click();
    assert.equal(clicks, 1);
    const modified = new window.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    document.querySelector('a').dispatchEvent(modified);
    assert.equal(modified.defaultPrevented, false);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    keys.forEach((key, index) => previous[index]
      ? Object.defineProperty(globalThis, key, previous[index]) : delete globalThis[key]);
  }
});
