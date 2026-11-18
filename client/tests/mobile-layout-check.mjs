// Focused Chrome layout check with synthetic API responses. No account is used.
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = await mkdtemp(path.join(tmpdir(), 'former-mobile-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9447', '--user-data-dir=' + directory, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 40; i++) {
    try { target = (await (await fetch('http://127.0.0.1:9447/json')).json()).find(item => item.type === 'page'); } catch {}
    if (target) break;
    await sleep(100);
  }
  if (!target) throw new Error('Chrome debugging endpoint unavailable');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  let authenticated = false;
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.addEventListener('message', async ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry?.reject(new Error(message.error.message));
      else entry?.resolve(message.result);
    }
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      const isMe = request.url.endsWith('/auth/me');
      const body = isMe
        ? { success: authenticated, data: { user: authenticated ? { id: 'fixture', email: 'fixture@example.test' } : null } }
        : { success: true, data: { profile: { personal: {}, contact: {}, addresses: { permanent: {}, correspondence: {} }, education: [] } } };
      await call('Fetch.fulfillRequest', { requestId, responseCode: isMe && !authenticated ? 401 : 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') })
        .catch(() => {}); // Navigation can cancel a paused request.
    }
  });
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Fetch.enable', { patterns: [{ urlPattern: '*localhost:5173/api/*' }] });
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  let failures = 0;
  for (const width of [320, 375, 390, 768, 1440]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: false });
    for (const route of ['/login', '/register', '/', '/app']) {
      authenticated = route === '/app';
      await call('Page.navigate', { url: 'http://localhost:5173' + route });
      for (let wait = 0; wait < 50; wait++) {
        await sleep(100);
        const ready = await evaluate(`!!document.querySelector('${route === '/app' ? '.readiness-row' : route === '/' ? '.ac-hero' : '.auth-form'}')`);
        if (ready) break;
      }
      await sleep(500);
      const result = await evaluate(`(() => {
        const controls = [...document.querySelectorAll('button,a,input,select')].filter(el => {
          const r=el.getBoundingClientRect(); const css=getComputedStyle(el);
          return r.width>0 && r.height>0 && css.visibility!=='hidden' && !el.closest('[hidden],[inert]') && r.bottom>0 && r.top<innerHeight;
        });
        return {width:innerWidth, route:location.pathname, overflow:document.documentElement.scrollWidth>innerWidth+1,
          small:controls.filter(el=>el.getBoundingClientRect().height<43.5).map(el=>({text:(el.textContent||el.getAttribute('aria-label')||el.name).slice(0,40),height:el.getBoundingClientRect().height})),
          clipped:[...document.querySelectorAll('.interactive-hover-button,.auth-form input,.ac-demo-stage')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)}).map(el=>el.className)};
      })()`);
      console.log(JSON.stringify(result));
      if (result.overflow || result.clipped.length || result.small.length) failures++;

    }
  }
  process.exitCode = failures ? 1 : 0;
} finally {
  socket?.close();
  chrome.kill();
  await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  const temporaryRoot = path.resolve(tmpdir()) + path.sep;
  if (path.resolve(directory).startsWith(temporaryRoot) && path.basename(directory).startsWith('former-mobile-')) {
    await rm(directory, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
}
