import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

describe('formER Landing Page: Real Chrome E2E & Visual Verification', () => {
  let staticServer = null;
  let serverPort = 0;
  let chromeProcess = null;
  const debugPort = 9444;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const clientDist = path.resolve('client/dist');
  const artifactDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\5a59b3ef-37e1-430d-bc99-633d16d072b7';
  const screenshotDir = path.join(artifactDir, 'screenshots');

  // Simple static file server serving Vite dist files
  before(async () => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // MIME types helper
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.json': 'application/json'
    };

    staticServer = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/' || !path.extname(reqPath)) {
        reqPath = '/index.html';
      }
      const filePath = path.join(clientDist, reqPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // SPA Fallback
        const fallback = path.join(clientDist, 'index.html');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(fallback).pipe(res);
      }
    });

    await new Promise((resolve) => {
      staticServer.listen(0, '127.0.0.1', () => {
        serverPort = staticServer.address().port;
        resolve();
      });
    });

    // Launch Chrome in headless mode
    if (fs.existsSync(chromePath)) {
      const args = [
        '--headless=new',
        `--remote-debugging-port=${debugPort}`,
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1440,900',
        `http://127.0.0.1:${serverPort}/`
      ];
      chromeProcess = spawn(chromePath, args, { stdio: 'ignore' });

      // Wait for Chrome DevTools endpoint
      let ready = false;
      for (let i = 0; i < 25; i++) {
        try {
          const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
          if (res.ok) {
            ready = true;
            break;
          }
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      assert.ok(ready, 'Chrome failed to initialize CDP on port ' + debugPort);
    }
  });

  after(() => {
    if (chromeProcess) {
      try {
        chromeProcess.kill('SIGKILL');
      } catch {}
    }
    if (staticServer) {
      staticServer.close();
    }
  });

  // CDP helper client
  async function withCDP(callback) {
    const targetsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page');
    assert.ok(pageTarget, 'Page target must exist in Chrome');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });

    await new Promise((r) => {
      ws.onopen = r;
    });

    try {
      await send('Page.enable');
      await send('DOM.enable');
      return await callback(send);
    } finally {
      ws.close();
    }
  }

  test('1. Desktop 1440x900: Renders Hero & Feature Sections with zero horizontal overflow', async () => {
    if (!fs.existsSync(chromePath)) return;

    await withCDP(async (send) => {
      // Set desktop metrics
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
      });

      // Wait for rendering
      await new Promise((r) => setTimeout(r, 1200));

      // Capture desktop hero screenshot
      const heroShot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(
        path.join(screenshotDir, 'hero-desktop-1440x900.png'),
        Buffer.from(heroShot.data, 'base64')
      );

      // Verify no horizontal overflow
      const overflowEval = await send('Runtime.evaluate', {
        expression: 'document.documentElement.scrollWidth <= window.innerWidth',
        returnByValue: true
      });
      assert.equal(overflowEval.result.value, true, 'Desktop page must not have horizontal scrollbar');

      // Scroll to feature section and capture
      await send('Runtime.evaluate', {
        expression: 'window.scrollTo({ top: 900, behavior: "instant" })'
      });
      await new Promise((r) => setTimeout(r, 600));

      const featureShot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(
        path.join(screenshotDir, 'feature-desktop-1440x900.png'),
        Buffer.from(featureShot.data, 'base64')
      );
    });
  });

  test('2. Interactive Simulated Autofill Section: populates fields upon user trigger', async () => {
    if (!fs.existsSync(chromePath)) return;

    await withCDP(async (send) => {
      // Scroll to demo section
      await send('Runtime.evaluate', {
        expression: `
          const demo = document.querySelector('[data-sec="demo"]');
          if (demo) demo.scrollIntoView({ behavior: 'instant' });
        `
      });
      await new Promise((r) => setTimeout(r, 600));

      // Pre-fill screenshot
      const demoShot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(
        path.join(screenshotDir, 'demo-interactive-prefill.png'),
        Buffer.from(demoShot.data, 'base64')
      );

      // Click "Autofill with formER" button
      await send('Runtime.evaluate', {
        expression: `
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Autofill with formER'));
          if (btn) btn.click();
        `
      });

      // Wait for simulated autofill animation
      await new Promise((r) => setTimeout(r, 1000));

      // Post-fill screenshot
      const filledShot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(
        path.join(screenshotDir, 'demo-interactive-filled.png'),
        Buffer.from(filledShot.data, 'base64')
      );

      // Verify fields were populated
      const checkEval = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const inputs = Array.from(document.querySelectorAll('.ac-demo-form-card input'));
            return inputs.some(i => i.value.length > 0);
          })()
        `,
        returnByValue: true
      });
      assert.equal(checkEval.result.value, true, 'Autofill button must populate demo form fields');
    });
  });

  test('3. Tablet 768x1024: Verifies responsive layout and zero horizontal overflow', async () => {
    if (!fs.existsSync(chromePath)) return;

    await withCDP(async (send) => {
      await send('Emulation.setDeviceMetricsOverride', {
        width: 768,
        height: 1024,
        deviceScaleFactor: 1,
        mobile: false
      });

      await send('Runtime.evaluate', {
        expression: 'window.scrollTo({ top: 0, behavior: "instant" })'
      });
      await new Promise((r) => setTimeout(r, 800));

      const tabletShot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(
        path.join(screenshotDir, 'tablet-768x1024.png'),
        Buffer.from(tabletShot.data, 'base64')
      );

      const overflowEval = await send('Runtime.evaluate', {
        expression: 'document.documentElement.scrollWidth <= 768',
        returnByValue: true
      });
      assert.equal(overflowEval.result.value, true, 'Tablet page must not have horizontal overflow');
    });
  });

  test('4. Mobile 390x844: Verifies mobile burger menu toggle and clean layout', async () => {
    if (!fs.existsSync(chromePath)) return;

    await withCDP(async (send) => {
      await send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true
      });

      await send('Runtime.evaluate', {
        expression: 'window.scrollTo({ top: 0, behavior: "instant" })'
      });
      await new Promise((r) => setTimeout(r, 800));

      // Mobile screenshot
      const mobileShot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(
        path.join(screenshotDir, 'mobile-390x844.png'),
        Buffer.from(mobileShot.data, 'base64')
      );

      const overflowEval = await send('Runtime.evaluate', {
        expression: 'document.documentElement.scrollWidth <= 390',
        returnByValue: true
      });
      assert.equal(overflowEval.result.value, true, 'Mobile page must not have horizontal overflow');

      // Test mobile burger menu click
      await send('Runtime.evaluate', {
        expression: `
          const burger = document.querySelector('.ac-burger');
          if (burger) burger.click();
        `
      });
      await new Promise((r) => setTimeout(r, 400));

      const menuShot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(
        path.join(screenshotDir, 'mobile-menu-390x844.png'),
        Buffer.from(menuShot.data, 'base64')
      );

      const menuEval = await send('Runtime.evaluate', {
        expression: 'document.querySelector(".ac-menu.is-open") !== null',
        returnByValue: true
      });
      assert.equal(menuEval.result.value, true, 'Mobile burger must open navigation drawer');
    });
  });

  test('5. Router Transitions: "Get started" and "Log in" navigate to real working routes', async () => {
    if (!fs.existsSync(chromePath)) return;

    await withCDP(async (send) => {
      // Reset to desktop viewport
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
      });

      // Navigate to /
      await send('Page.navigate', { url: `http://127.0.0.1:${serverPort}/` });
      await new Promise((r) => setTimeout(r, 600));

      // Click "Get started" in header
      await send('Runtime.evaluate', {
        expression: `
          const getStarted = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Get started'));
          if (getStarted) getStarted.click();
        `
      });
      await new Promise((r) => setTimeout(r, 400));

      const regEval = await send('Runtime.evaluate', {
        expression: 'window.location.pathname',
        returnByValue: true
      });
      assert.equal(regEval.result.value, '/register', 'Get started must navigate to /register');

      // Verify register form rendered
      const formEval = await send('Runtime.evaluate', {
        expression: 'document.querySelector("form") !== null',
        returnByValue: true
      });
      assert.equal(formEval.result.value, true, 'Register page form must mount cleanly');

      // Navigate back and click "Log in"
      await send('Page.navigate', { url: `http://127.0.0.1:${serverPort}/` });
      await new Promise((r) => setTimeout(r, 600));

      await send('Runtime.evaluate', {
        expression: `
          const loginBtn = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Log in'));
          if (loginBtn) loginBtn.click();
        `
      });
      await new Promise((r) => setTimeout(r, 400));

      const loginEval = await send('Runtime.evaluate', {
        expression: 'window.location.pathname',
        returnByValue: true
      });
      assert.equal(loginEval.result.value, '/login', 'Log in must navigate to /login');
    });
  });
});
