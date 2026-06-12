/**
 * TEMP — verify the LIVE Vercel read path end-to-end.
 *  (1) FAITHFUL NETWORK TEST: from the deployed page's own origin, POST a real
 *      image to /__pura_ai__/readSkin (the EXACT call the app's gateway makes)
 *      and confirm a valid structured read comes back.
 *  (2) Best-effort UI walk: fake camera, click "Let's look", advance onboarding,
 *      screenshot each screen, and detect whether the analyzing screen completes
 *      the read or still errors.
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'screenshots', 'live-test');
const EXE = 'C:\\Users\\abiea\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1223\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const BASE = 'https://pura-ai-ebon.vercel.app/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IMG = fs.readFileSync(path.join(__dirname, '..', 'assets', 'products', 'cerave-hydrating-cleanser.jpg')).toString('base64');

const ADVANCE = /(let.?s look|let.?s go|begin|^continue|get started|next|allow|enable|take a scan|new scan|start scan|capture|^scan$|see your|got it|^ok$|use this photo|use photo|retake|continue without)/i;

(async () => {
  const browser = await chromium.launch({
    executablePath: EXE, headless: true, channel: 'chromium-headless-shell',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['camera'] });
  const page = await context.newPage();
  const proxyCalls = [];
  page.on('response', (r) => { const u = r.url(); if (u.includes('__pura_ai__') || u.includes('/api/proxy')) proxyCalls.push(`${r.status()} ${r.request().method()} ${u.replace(BASE, '/').split('?')[0]}`); });

  const shot = async (n) => { try { await page.screenshot({ path: path.join(OUT, n), animations: 'disabled' }); } catch {} };
  const txt = async () => { try { return (await page.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ').trim(); } catch { return ''; } };

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    // ── (1) FAITHFUL NETWORK TEST from the live origin ───────────────────────
    console.log('=== (1) In-page POST /__pura_ai__/readSkin from the deployed origin ===');
    const apiResult = await page.evaluate(async (b64) => {
      try {
        const res = await fetch('/__pura_ai__/readSkin', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: b64, mediaType: 'image/jpeg' }),
        });
        const text = await res.text();
        let fields = [];
        try { const j = JSON.parse(text); fields = ['opening_line','findings','skin_summary_line','horizon_line','routine_focus','photo_check','sure_level'].filter((k) => k in j); } catch {}
        return { status: res.status, fieldsPresent: fields, snippet: text.slice(0, 240) };
      } catch (e) { return { error: String(e) }; }
    }, IMG);
    console.log('   status:', apiResult.status, '| schema fields:', (apiResult.fieldsPresent || []).join(', '));
    console.log('   snippet:', apiResult.snippet || apiResult.error);
    const apiOk = apiResult.status === 200 && (apiResult.fieldsPresent || []).length >= 6;
    console.log('   => DEPLOYED READ PATH:', apiOk ? 'WORKS ✓' : 'FAILED ✗');

    // ── (2) Best-effort UI walk ──────────────────────────────────────────────
    console.log('\n=== (2) UI walk: onboarding -> scan -> analyzing ===');
    let reached = '';
    for (let step = 1; step <= 22; step++) {
      const t = await txt(); const low = t.toLowerCase();
      await shot(`step-${String(step).padStart(2, '0')}.png`);
      console.log(`[${step}] "${t.slice(0, 110)}"`);
      if (/couldn.?t (quite )?finish|can.?t finish the read|couldn.?t read that photo/.test(low)) { reached = 'READ_FAILED ✗'; break; }
      if (/starting point|here.?s what i.?d focus|the main thing to look at|a clearer photo in better light|put your face|looking at your skin|checking for|your skin looks/.test(low)) { reached = 'READ/ANALYZE REACHED ✓'; }
      // type a name if asked
      const filled = await page.evaluate(() => { const i = document.querySelector('input,textarea'); if (i && i.offsetParent) { i.focus(); i.value = 'Alex'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return true; } return false; });
      if (filled) await sleep(500);
      // click the best advance affordance
      const clicked = await page.evaluate((rxSrc) => {
        const rx = new RegExp(rxSrc, 'i');
        const els = Array.from(document.querySelectorAll('div,button,[role="button"],a,span'));
        const cands = [];
        for (const el of els) {
          const tx = (el.innerText || el.getAttribute?.('aria-label') || '').trim();
          if (!tx || tx.length > 40) continue;
          if (rx.test(tx)) { const r = el.getBoundingClientRect(); if (r.width > 10 && r.height > 10 && r.top < 844) cands.push({ el, tx, area: r.width * r.height }); }
        }
        cands.sort((a, b) => a.area - b.area); // smallest matching = the button, not a container
        if (cands[0]) { cands[0].el.click(); return cands[0].tx; }
        return null;
      }, ADVANCE.source);
      console.log(clicked ? `   clicked: "${clicked}"` : '   (no advance button; tapping center)');
      if (!clicked) await page.mouse.click(195, 720).catch(() => {});
      await sleep(3200);
    }
    await shot('final.png');
    console.log('\n=== UI RESULT:', reached || 'did not reach analyzing in 22 steps');
    console.log('=== proxy calls seen ==='); for (const c of proxyCalls.slice(-15)) console.log('   ', c);
    console.log('=== FINAL SUMMARY: deployed-read-path =', apiOk ? 'WORKS' : 'FAILED', '| ui-reached =', reached || 'no');
  } catch (e) { console.error('ERROR', e.message); }
  finally { await browser.close(); }
})();
