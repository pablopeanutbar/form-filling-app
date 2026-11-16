import http from 'node:http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import assert from 'node:assert/strict';

const debugPort = 9466;
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const clientDist = path.resolve('client/dist');
const artifactDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\5a59b3ef-37e1-430d-bc99-633d16d072b7';
const screenshotDir = path.join(artifactDir, 'screenshots', 'typography');

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

const staticServer = http.createServer((req, res) => {
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
    const fallback = path.join(clientDist, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(fallback).pipe(res);
  }
});

await new Promise((resolve) => staticServer.listen(0, '127.0.0.1', resolve));
const serverPort = staticServer.address().port;

const chromeProcess = spawn(
  chromePath,
  [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080'
  ],
  { stdio: 'ignore' }
);

for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
    if (res.ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const listRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
const targets = await listRes.json();
const wsUrl = targets[0]?.webSocketDebuggerUrl;

class CdpSession {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 1;
    this.callbacks = new Map();
  }
  async connect() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((res, rej) => {
      this.ws.onopen = res;
      this.ws.onerror = rej;
    });
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
  }
  send(method, params = {}) {
    const msgId = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  }
}

const cdp = new CdpSession(wsUrl);
await cdp.connect();
await cdp.send('Page.enable');
await cdp.send('Page.navigate', { url: `http://127.0.0.1:${serverPort}/` });
await new Promise((r) => setTimeout(r, 1500));

const viewports = [
  { w: 1920, h: 1080, name: '1920-desktop' },
  { w: 1600, h: 1000, name: '1600-desktop' },
  { w: 1366, h: 768, name: '1366-laptop' },
  { w: 768, h: 1024, name: '768-tablet' },
  { w: 390, h: 844, name: '390-mobile' }
];

const headingsToTest = [
  {
    name: 'crop-title',
    title: 'ONCE SAVED. READY TO FILL.',
    selector: '.ac-crop-title',
    scrollTarget: '.ac-crop'
  },
  {
    name: 'display-info',
    title: 'YOUR INFO. STORED ONCE.',
    selector: '.ac-bean .ac-display',
    scrollTarget: '.ac-bean .ac-show'
  },
  {
    name: 'display-demo',
    title: 'WATCH IT ASSIST YOU.',
    selector: '.ac-stick .ac-display',
    scrollTarget: '.ac-stick .ac-show'
  }
];

const reportData = [];

for (const vp of viewports) {
  console.log(`\nTesting viewport: ${vp.name} (${vp.w}x${vp.h})`);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: vp.w,
    height: vp.h,
    deviceScaleFactor: 1,
    mobile: vp.w <= 768
  });
  await new Promise((r) => setTimeout(r, 300));

  for (const h of headingsToTest) {
    // Scroll element into view and wait for GSAP animation to complete
    await cdp.eval(`(() => {
      const sec = document.querySelector('${h.scrollTarget}');
      if (sec) {
        sec.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      // Jump GSAP tweens on this element to completion if needed
      if (window.gsap) {
        const chars = document.querySelectorAll('${h.selector} .ac-crop-char, ${h.selector} .ac-display-char');
        chars.forEach(c => {
          const t = gsap.getTweensOf(c);
          t.forEach(tween => tween.progress(1));
        });
      }
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    // Get measurements and verification metrics
    const res = await cdp.eval(`(() => {
      const el = document.querySelector('${h.selector}');
      if (!el) return { error: 'not found' };
      const elRect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const lines = Array.from(el.querySelectorAll('.ac-line')).map((l, lIdx) => {
        const lRect = l.getBoundingClientRect();
        const words = Array.from(l.querySelectorAll('.ac-word')).map(w => ({
          text: w.textContent.trim(),
          top: Math.round(w.getBoundingClientRect().top),
          left: Math.round(w.getBoundingClientRect().left),
          width: Math.round(w.getBoundingClientRect().width)
        }));
        // Check offsetTop of words (layout position, unaffected by in-flight GSAP transform)
        const wordRows = new Map();
        words.forEach(w => {
          const wEl = Array.from(l.querySelectorAll('.ac-word')).find(el => el.textContent.trim() === w.text);
          const topKey = wEl ? wEl.offsetTop : w.top;
          if (!wordRows.has(topKey)) wordRows.set(topKey, []);
          wordRows.get(topKey).push(w.text);
        });
        const distinctRows = Array.from(wordRows.values()).map(r => r.join(' '));
        return {
          lineIndex: lIdx + 1,
          lineText: l.textContent,
          width: Math.round(lRect.width),
          height: Math.round(lRect.height),
          distinctRowsCount: distinctRows.length,
          rows: distinctRows,
          words: words.map(w => w.text)
        };
      });

      return {
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        totalWidth: Math.round(elRect.width),
        totalHeight: Math.round(elRect.height),
        lines
      };
    })()`);

    console.log(`  [${h.name}] font: ${res.fontSize}`);
    res.lines.forEach((l) => {
      console.log(`    Line ${l.lineIndex}: "${l.lineText}" -> ${l.distinctRowsCount} row(s): ${JSON.stringify(l.rows)}`);
      assert.equal(l.distinctRowsCount, 1, `Line ${l.lineIndex} should be on 1 row, got ${l.distinctRowsCount}`);
    });

    // Capture screenshot of the heading in context
    const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const filename = `${vp.name}-${h.name}.png`;
    const ssPath = path.join(screenshotDir, filename);
    fs.writeFileSync(ssPath, Buffer.from(ss.data, 'base64'));

    reportData.push({
      viewport: vp.name,
      heading: h.name,
      fontSize: res.fontSize,
      lines: res.lines,
      screenshot: ssPath
    });
  }
}

try { chromeProcess.kill('SIGKILL'); } catch {}
staticServer.close();

console.log('\nAll 15 viewport/heading combinations verified successfully: 100% 1-row layout per phrase, 0 word/char splits.');
