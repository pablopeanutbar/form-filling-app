import { test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../node_modules/esbuild/lib/main.js';
import { JSDOM } from '../../server/node_modules/jsdom/lib/api.js';
import { updateProfileSchema, educationSchema, updateEducationSchema } from '../../server/src/validators/profile.validator.js';

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let source, dom, window, harness, profile, writes, failure, sidebarMotion;
const initialProfile = () => ({ personal: {}, contact: {}, addresses: { permanent: { city: 'Existing city' }, correspondence: {} }, education: [], professional: { skills: [], workExperience: [], profileLinks: {} } });
before(async () => {
  const result = await build({ absWorkingDir: clientRoot, stdin: { contents: `
    import React, { act } from 'react';
    import { createRoot } from 'react-dom/client';
    import { createMemoryRouter, RouterProvider, Outlet } from 'react-router-dom';
    import { AuthProvider, useAuth } from './src/context/AuthContext.jsx';
    import { ProfileProvider, useProfile } from './src/context/ProfileContext.jsx';
    import { UnsavedProvider } from './src/context/UnsavedContext.jsx';
    import { AppShell } from './src/components/layout/AppShell.jsx';
    import { MyInformation } from './src/pages/MyInformation.jsx';
    import { Home } from './src/pages/Home.jsx';
    const root = createRoot(document.getElementById('root'));
    function Probe() { window.harness.auth = useAuth(); window.harness.profile = useProfile(); return null; }
    const router = createMemoryRouter([{ element:<AuthProvider><ProfileProvider><Probe/><UnsavedProvider><AppShell/></UnsavedProvider></ProfileProvider></AuthProvider>, children:[
      {path:'/app',element:<Home/>}, {path:'/app/profile/:section?',element:<MyInformation/>},
      {path:'/app/history',element:<h1>History</h1>}, {path:'/app/settings',element:<h1>Account Settings</h1>},
      {path:'/app/report',element:<h1>Report</h1>}
    ]}], {initialEntries:['/app/profile/personal']});
    window.harness = { act, root, router, start:()=>root.render(<RouterProvider router={router}/>) };
  `, resolveDir: clientRoot, loader: 'jsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"development"', 'import.meta': '{}' } });
  source = result.outputFiles[0].text;
});
beforeEach(async () => {
  profile = initialProfile(); writes = []; failure = null;
  dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/app/profile/personal', runScripts: 'outside-only', pretendToBeVisual: true });
  window = dom.window;
  window.IS_REACT_ACT_ENVIRONMENT = true;
  window.Request = Request;
  window.Response = Response;
  window.Headers = Headers;
  window.AbortController = AbortController;
  window.MessageChannel = class {
    constructor() { this.port1 = { onmessage: null }; this.port2 = { postMessage: () => setImmediate(() => this.port1.onmessage?.()) }; }
  };
  window.scrollTo = () => {};
  sidebarMotion = Object.assign(new window.EventTarget(), { matches: false });
  window.matchMedia = (query) => query.includes('(pointer: fine)')
    ? sidebarMotion : Object.assign(new window.EventTarget(), { matches: false });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    if (failure && method === failure) return Response.json({ error: { message: 'Synthetic failure' } }, { status: 500 });
    if (url.endsWith('/csrf-token')) return Response.json({ success: true, data: { csrfToken: 'test' } });
    if (url.endsWith('/auth/me')) return Response.json({ success: true, data: { user: { id: 'test', email: 'synthetic@example.com' } } });
    if (url.endsWith('/logout')) return Response.json({ success: true });
    if (method !== 'GET') writes.push({ url, method, body: options.body ? JSON.parse(options.body) : null });
    if (url.includes('/education')) {
      const id = url.split('/').at(-1);
      if (method === 'POST') { const qualification = { ...educationSchema.parse(JSON.parse(options.body)), id: `record-${profile.education.length + 1}` }; profile.education.push(qualification); return Response.json({ success: true, data: { qualification } }); }
      if (method === 'PATCH') { const qualification = profile.education.find((q) => q.id === id); Object.assign(qualification, updateEducationSchema.parse(JSON.parse(options.body))); return Response.json({ success: true, data: { qualification } }); }
      if (method === 'DELETE') { profile.education = profile.education.filter((q) => q.id !== id); return Response.json({ success: true }); }
    }
    if (method === 'PATCH') {
      const body = updateProfileSchema.parse(JSON.parse(options.body));
      for (const [key, value] of Object.entries(body)) {
        if (key === 'addresses') for (const [kind, address] of Object.entries(value)) Object.assign(profile.addresses[kind], address);
        else profile[key] = { ...profile[key], ...value };
      }
    }
    return Response.json({ success: true, data: { profile } });
  };
  window.eval(source);
  harness = window.harness;
  await harness.act(async () => { harness.start(); });
});
afterEach(async () => { if (harness) await harness.act(() => harness.root.unmount()); dom?.window.close(); });
const text = () => window.document.body.textContent;
const button = (label) => Array.from(window.document.querySelectorAll('button')).find((el) => el.textContent.trim() === label || el.getAttribute('aria-label') === label);
async function click(label) { const element = button(label); assert.ok(element, `Button exists: ${label}`); await harness.act(async () => element.click()); }
async function fill(name, value) {
  const element = window.document.querySelector(`[name="${name}"]`);
  assert.ok(element, `Field exists: ${name}`);
  await harness.act(async () => {
    const prototype = element.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new window.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function navigate(url) { await harness.act(async () => harness.router.navigate(url)); }
test('Desktop and mobile links track direct routes and browser history', async () => {
  const paths = ['/app', '/app/profile', '/app/history', '/app/settings', '/app/report'];
  const sidebar = window.document.querySelector('.line-sidebar');
  const active = () => sidebar.querySelector('[aria-current="page"]')?.getAttribute('href');
  assert.equal(active(), '/app/profile');
  assert.deepEqual([...sidebar.querySelectorAll('a')].map((link) => link.getAttribute('href')), paths);
  for (const path of paths) {
    const link = sidebar.querySelector(`[href="${path}"]`);
    link.focus();
    assert.equal(window.document.activeElement, link);
    await harness.act(async () => link.click());
    assert.equal(harness.router.state.location.pathname, path);
    assert.equal(active(), path);
  }
  await navigate(-1);
  assert.equal(active(), '/app/settings');
  await navigate(1);
  assert.equal(active(), '/app/report');
  await click('Open navigation');
  const mobile = window.document.querySelector('dialog nav');
  assert.deepEqual([...mobile.querySelectorAll('a')].map((link) => link.getAttribute('href')), paths);
  await harness.act(async () => mobile.querySelector('[href="/app/history"]').click());
  assert.equal(active(), '/app/history');
  assert.equal(window.document.querySelector('dialog'), null);
});

test('The proximity loop eases nearby rows, resets on exit and respects reduced motion', () => {
  const list = window.document.querySelector('.line-sidebar');
  const rows = [...list.children];
  rows.forEach((row, i) => Object.defineProperties(row, { offsetTop: { value: i * 50 }, offsetHeight: { value: 45 } }));
  const frames = new Map();
  let id = 0;
  window.requestAnimationFrame = (callback) => { frames.set(++id, callback); return id; };
  window.cancelAnimationFrame = (frame) => { frames.delete(frame); };
  const changeMotion = (matches) => {
    sidebarMotion.matches = matches;
    sidebarMotion.dispatchEvent(new window.Event('change'));
  };
  const move = () => list.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientY: 72 }));
  const effect = (index) => Number(rows[index].style.getPropertyValue('--effect'));
  const advance = () => {
    const start = window.performance.now();
    for (let i = 1; i <= 40 && frames.size; i++) {
      const [frame, callback] = frames.entries().next().value;
      frames.delete(frame);
      callback(start + i * 50);
    }
  };
  move();
  assert.equal(frames.size, 0);
  changeMotion(true);
  move();
  advance();
  assert.ok(effect(1) > effect(0) && effect(0) > effect(4));
  list.dispatchEvent(new window.MouseEvent('pointerout', { bubbles: true }));
  advance();
  assert.equal(effect(1), 0);
  assert.equal(frames.size, 0);
  move();
  changeMotion(false);
  assert.equal(frames.size, 0);
  assert.equal(rows[1].style.getPropertyValue('--effect'), '');
  assert.equal(rows[1].querySelector('a').getAttribute('aria-current'), 'page');
});
test('Section saves persist editable values and preserve other sections', async () => {
  await fill('fullName', 'Synthetic Applicant');
  await click('Save changes');
  assert.equal(profile.personal.fullName, 'Synthetic Applicant');
  assert.match(text(), /Changes saved/);
  assert.equal(profile.addresses.permanent.city, 'Existing city');
  assert.deepEqual(Object.keys(writes[0].body), ['personal']);
});
test('Navigation and browser Back prompt for unsaved edits; cancel retains them', async () => {
  await navigate('/app/profile/contact');
  await fill('contactEmail', 'synthetic@example.com');
  await harness.act(async () => harness.router.navigate(-1));
  assert.match(text(), /Leave without saving/);
  await click('Keep editing');
  assert.equal(window.document.querySelector('[name="contactEmail"]').value, 'synthetic@example.com');
  await navigate('/app');
  await click('Discard changes');
  assert.match(text(), /Your details all at one place/);
  assert.equal(writes.length, 0);
});
test('Save failures retain edits and permit retry without false success', async () => {
  await fill('fullName', 'Unsaved Applicant'); failure = 'PATCH';
  await click('Save changes');
  assert.match(text(), /couldn’t save/);
  assert.equal(window.document.querySelector('[name="fullName"]').value, 'Unsaved Applicant');
  assert.doesNotMatch(text(), /Changes saved/);
  failure = null;
  await click('Save changes');
  assert.equal(profile.personal.fullName, 'Unsaved Applicant');
});
test('Education supports independent create, edit and confirmed deletion', async () => {
  await navigate('/app/profile/education');
  for (const degree of ['Synthetic degree A', 'Synthetic degree B']) {
    await click('Add a qualification');
    await fill('qualificationLevel', 'undergraduate'); await fill('degreeName', degree); await fill('resultStatus', 'passed');
    await click('Save changes');
  }
  assert.equal(profile.education.length, 2);
  await click('Edit Synthetic degree A'); await fill('institution', 'Synthetic College'); await click('Save changes');
  assert.equal(profile.education[0].institution, 'Synthetic College');
  assert.equal(profile.education[1].institution, null);
  await click('Remove Synthetic degree A'); await click('Keep qualification'); assert.equal(profile.education.length, 2);
  await click('Remove Synthetic degree A'); await click('Remove qualification'); assert.equal(profile.education.length, 1);
  assert.equal(profile.education[0].degreeName, 'Synthetic degree B');
});
test('Invalid education is blocked inline before any write', async () => {
  await navigate('/app/profile/education'); await click('Add a qualification');
  await fill('degreeName', 'Synthetic degree'); await click('Save changes');
  assert.equal(writes.length, 0);
  assert.equal(window.document.querySelector('[name="qualificationLevel"]').getAttribute('aria-invalid'), 'true');
});
test('Correspondence edits cannot replace the permanent address', async () => {
  await navigate('/app/profile/correspondence'); await fill('city', 'Mailing city'); await click('Save changes');
  assert.equal(profile.addresses.permanent.city, 'Existing city'); assert.equal(profile.addresses.correspondence.city, 'Mailing city');
});
test('Professional edits serialize skills and roles without record metadata', async () => {
  await navigate('/app/profile/professional'); await fill('skills', 'Writing, Research'); await click('Add a role');
  await fill('jobTitle', 'Synthetic role'); await fill('company', 'Synthetic organization'); await click('Save changes');
  assert.deepEqual(profile.professional.skills, ['Writing', 'Research']);
  assert.equal(profile.professional.workExperience[0].jobTitle, 'Synthetic role');
  assert.ok(!('_id' in profile.professional.workExperience[0]));
});
test('Failed logout keeps the workspace and offers a retry', async () => {
  await click('Account menu'); failure = 'POST'; await click('Sign out');
  assert.match(text(), /couldn’t sign you out/);
  assert.ok(window.document.querySelector('[name="fullName"]'));
});
test('A failed logout after discard confirmation does not disable the unsaved-edit guard', async () => {
  await fill('fullName', 'Still unsaved'); await click('Account menu'); failure = 'POST'; await click('Sign out');
  await click('Discard changes'); assert.match(text(), /couldn’t sign you out/);
  await navigate('/app'); assert.match(text(), /Leave without saving/);
  await click('Keep editing'); assert.equal(window.document.querySelector('[name="fullName"]').value, 'Still unsaved');
});
test('Deleting a qualification preserves it on API failure', async () => {
  profile.education = [{ id: 'record-1', qualificationLevel: 'undergraduate', degreeName: 'Synthetic degree' }];
  // Refresh the component tree through the fixture response, as a new session would.
  await harness.act(async () => { harness.root.unmount(); });
  window.document.body.innerHTML = '<div id="root"></div>';
  window.eval(source); harness = window.harness;
  await harness.act(async () => harness.start());
  await navigate('/app/profile/education'); await click('Remove Synthetic degree'); failure = 'DELETE'; await click('Remove qualification');
  assert.match(text(), /couldn’t remove/); assert.equal(profile.education.length, 1);
});
test('Successful logout clears authenticated state only after server acknowledgement', async () => {
  assert.equal(harness.auth.isAuthenticated, true);
  await click('Account menu'); await click('Sign out');
  assert.equal(harness.auth.isAuthenticated, false);
});
test('Profile load errors show an actionable retry and recover', async () => {
  failure = 'GET'; await harness.act(async () => harness.profile.reload());
  assert.match(text(), /couldn’t load your information/);
  failure = null; await click('Try again');
  assert.ok(window.document.querySelector('[name="fullName"]'));
});
test('Reload protection is registered only while edits are unsaved', async () => {
  await fill('fullName', 'Unsaved Applicant');
  const before = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(before);
  assert.equal(before.defaultPrevented, true);
  await click('Save changes');
  const after = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(after);
  assert.equal(after.defaultPrevented, false);
});
