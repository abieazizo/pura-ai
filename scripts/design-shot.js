/* eslint-disable */
// Standalone screenshot via Chrome DevTools Protocol.
// Usage:  node scripts/design-shot.js <url> <out.png> [w] [h] [waitMs] [--init="..." | --setup="..." | --click="selector" | --localStorage="key=val;key=val"]
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const chromeLauncher = require('chrome-launcher');

const args = process.argv.slice(2);
const [url, out, wArg, hArg, waitArg] = args.filter((a) => !a.startsWith('--'));
const opts = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const eq = a.indexOf('=');
      return eq === -1 ? [a.slice(2), true] : [a.slice(2, eq), a.slice(eq + 1)];
    })
);
if (!url || !out) {
  console.error('usage: node design-shot.js <url> <out.png> [w] [h] [waitMs] [--init=...] [--setup=...] [--click=sel] [--localStorage="k=v;k=v"]');
  process.exit(2);
}
const width  = parseInt(wArg || '390', 10);
const height = parseInt(hArg || '844', 10);
const waitMs = parseInt(waitArg || '2500', 10);

(async () => {
  const userDataDir = path.join(__dirname, '..', '.tmp-design-chrome', `u-${process.pid}-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });
  const chrome = await chromeLauncher.launch({
    userDataDir,
    chromeFlags: [
      '--headless=new',
      `--window-size=${width},${height}`,
      '--hide-scrollbars',
      '--no-sandbox',
      '--disable-gpu',
      '--no-proxy-server',
      '--proxy-bypass-list=*',
    ],
  });

  let id = 0;
  const tabs = await new Promise((resolve, reject) => {
    const http = require('http');
    const req = http.get(`http://127.0.0.1:${chrome.port}/json`, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
  });
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const myId = ++id;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === myId) {
          ws.off('message', handler);
          if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
          else resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });

  await new Promise((r) => ws.once('open', r));
  await send('Emulation.setDeviceMetricsOverride', {
    width, height,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send('Page.enable');
  await send('Runtime.enable');

  // Optional pre-navigation localStorage seeding (web persist key for zustand)
  if (opts.localStorage) {
    // Navigate to the origin first so we can write to its localStorage.
    await send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 600));
    const kvs = String(opts.localStorage)
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const kv of kvs) {
      const eq = kv.indexOf('=');
      if (eq === -1) continue;
      const k = kv.slice(0, eq);
      const v = kv.slice(eq + 1);
      await send('Runtime.evaluate', {
        expression: `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`,
      });
    }
  }

  await send('Page.navigate', { url });

  // Wait until the page has visible non-trivial text content stable for two ticks.
  const waitForBody = async (maxMs = 90000, checkEvery = 400) => {
    const t0 = Date.now();
    let lastLen = 0;
    while (Date.now() - t0 < maxMs) {
      const r = await send('Runtime.evaluate', {
        expression: 'document.body && document.body.innerText && document.body.innerText.replace(/\\s+/g,"").length',
        returnByValue: true,
      });
      const len = (r.result && r.result.value) || 0;
      if (len > 12 && len === lastLen) return true;
      lastLen = len;
      await new Promise((res) => setTimeout(res, checkEvery));
    }
    return false;
  };
  await waitForBody();

  // Run setup JS (e.g. pura.populate()) AFTER hydration.
  if (opts.setup) {
    await send('Runtime.evaluate', { expression: String(opts.setup) });
    // wait for re-render
    await new Promise((res) => setTimeout(res, 1200));
    await waitForBody(15000);
  }

  // Optional click after setup
  if (opts.click) {
    await send('Runtime.evaluate', {
      expression: `(function(){const el=document.querySelector(${JSON.stringify(opts.click)}); if(!el) return false; el.click(); return true;})()`,
    });
    await new Promise((res) => setTimeout(res, 800));
    await waitForBody(15000);
  }

  // Run an init expression right before screenshot
  if (opts.init) {
    await send('Runtime.evaluate', { expression: String(opts.init) });
    await new Promise((res) => setTimeout(res, 600));
  }

  // animation/font settle
  await new Promise((r) => setTimeout(r, waitMs));

  const result = await send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(result.data, 'base64'));

  ws.close();
  await chrome.kill();
  console.log('OK', out);
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
