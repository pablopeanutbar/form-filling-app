// Local browser-test fixture only. No fixture data is imported by the application.
// Uses the existing backend Zod contracts; does not connect to any database.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateProfileSchema, educationSchema, updateEducationSchema } from '../../../server/src/validators/profile.validator.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
let profile;
let failures = {};
let delay = 0;
let signedIn = true;
let counter = 0;
const requests = [];
const reset = () => { profile = { id: 'synthetic-profile', personal: {}, contact: {}, addresses: { permanent: {}, correspondence: {} }, education: [], professional: { skills: [], profileLinks: {}, workExperience: [] } }; failures = {}; signedIn = true; delay = 0; requests.length = 0; };
reset();
const user = { id: 'synthetic-user', email: 'ui-test@example.com', status: 'active', createdAt: '2026-01-01T00:00:00Z' };
const merge = (target, source) => {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) merge(target[key] ||= {}, value);
    else target[key] = value;
  }
};
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const send = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  try {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    if (url.pathname === '/__test/reset') { reset(); return send({ ok: true }); }
    if (url.pathname === '/__test/state') return send({ profile, signedIn, requests });
    if (url.pathname === '/__test/config') { failures = body.failures || {}; delay = body.delay || 0; if (body.profile) merge(profile, body.profile); if (typeof body.signedIn === 'boolean') signedIn = body.signedIn; return send({ ok: true }); }
    if (url.pathname.startsWith('/api/')) {
      requests.push({ path: url.pathname, method: req.method, body });
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      const failure = failures[`${req.method} ${url.pathname}`];
      if (failure) return send({ success: false, error: { code: 'TEST_FAILURE', message: 'Synthetic test failure' } }, failure);
      if (url.pathname.endsWith('/csrf-token')) return send({ success: true, data: { csrfToken: 'fixture-token' } });
      if (url.pathname.endsWith('/login')) { signedIn = true; return send({ success: true, data: { user } }); }
      if (url.pathname.endsWith('/register')) return send({ success: true, data: { user } });
      if (!signedIn) return send({ success: false, error: { code: 'UNAUTHORIZED' } }, 401);
      if (url.pathname.endsWith('/auth/me')) return send({ success: true, data: { user } });
      if (url.pathname.endsWith('/logout')) { signedIn = false; return send({ success: true }); }
      if (req.method !== 'GET' && req.headers['x-csrf-token'] !== 'fixture-token') return send({ error: { code: 'CSRF_INVALID' } }, 403);
      if (url.pathname === '/api/v1/profile/me') {
        if (req.method === 'PATCH') merge(profile, updateProfileSchema.parse(body));
        return send({ success: true, data: { profile } });
      }
      if (url.pathname.includes('/profile/me/education')) {
        const id = url.pathname.split('/')[6];
        if (req.method === 'POST') { const qualification = { ...educationSchema.parse(body), id: `synthetic-education-${++counter}` }; profile.education.push(qualification); return send({ success: true, data: { qualification } }, 201); }
        const qualification = profile.education.find((item) => item.id === id);
        if (!qualification) return send({ success: false }, 404);
        if (req.method === 'PATCH') Object.assign(qualification, updateEducationSchema.parse(body));
        if (req.method === 'DELETE') profile.education = profile.education.filter((item) => item.id !== id);
        return send({ success: true, data: { qualification } });
      }
      return send({ success: false }, 404);
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let file = path.resolve(root, relative || 'index.html');
    if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) return send({}, 403);
    let content;
    try { content = await fs.readFile(file); } catch { file = path.join(root, 'index.html'); content = await fs.readFile(file); }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(content);
  } catch (error) { send({ success: false, error: { message: error.name === 'ZodError' ? 'Fixture contract validation failed' : 'Fixture request failed' } }, 400); }
});
server.listen(Number(process.env.UI_TEST_PORT || 5188), '127.0.0.1', () => console.log('Synthetic UI test server: http://127.0.0.1:5188'));
