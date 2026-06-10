/**
 * TEMP capture harness for the "Your Skin" (scan-results screen 2) dev gallery.
 * Drives the locally-cached chrome-headless-shell via playwright-core (its own
 * browser instance — no MCP profile lock), against the DEV web server (8103),
 * which is where the dev routes + window.__pura_nav__ exist.
 *
 * Why this works where the MCP preview tools hang: page.screenshot() captures
 * IMMEDIATELY (no wait-for-idle), and the gallery boots reduce-motion under the
 * static-preview flag, so the persistent AuroraOrb is settled.
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'screenshots', 'yourskin');
const EXE =
  'C:\\Users\\abiea\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1223\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const BASE = process.env.PURA_WEB ?? 'http://localhost:8103';
const VIEWPORT = { width: 390, height: 844 };

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), animations: 'disabled' });
  console.log('  saved', name);
}
async function clickChip(page, text) {
  const el = page.getByText(text, { exact: false }).first();
  if (await el.count().catch(() => 0)) {
    await el.click({ timeout: 5000 }).catch((e) => console.log('  click fail', text, e.message));
    return true;
  }
  console.log('  ! chip not found:', text);
  return false;
}
async function scrollInner(page, frac) {
  await page.evaluate((f) => {
    let best = null, bestH = 0;
    for (const e of Array.prototype.slice.call(document.querySelectorAll('*'))) {
      const cs = getComputedStyle(e);
      if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight - e.clientHeight > 80 && e.scrollHeight > bestH) {
        best = e; bestH = e.scrollHeight;
      }
    }
    if (best) best.scrollTop = (best.scrollHeight - best.clientHeight) * f;
  }, frac);
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true, channel: 'chromium-headless-shell' });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  await context.addInitScript(() => { try { localStorage.setItem('__pura_static_preview__', '1'); } catch {} });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [page-error]', m.text().slice(0, 160)); });

  try {
    console.log('goto', BASE);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });

    // Wait for the RN app + the dev nav ref to mount.
    try {
      await page.waitForFunction(
        () => !!(window.__pura_nav__ && window.__pura_nav__.navigate),
        { timeout: 60000 },
      );
      console.log('  __pura_nav__ ready');
    } catch {
      const diag = await page.evaluate(() => ({
        keys: Object.keys(window).filter((k) => /pura|nav/i.test(k)),
        text: (document.body.innerText || '').slice(0, 200),
      }));
      console.log('  NO __pura_nav__. diag:', JSON.stringify(diag));
      throw new Error('dev nav ref never appeared');
    }

    await page.evaluate(() => window.__pura_nav__.navigate('YourSkinDev'));
    await page
      .waitForFunction(() => (document.body.innerText || '').toLowerCase().includes('starting point'), { timeout: 30000 })
      .catch(() => console.log('  (no "starting point" text yet — capturing anyway)'));
    await sleep(1400);

    // 1) the SERENE default (redness, dark) — top, then scrolled to plan+CTA.
    await shot(page, '01-default-redness-dark-top.png');
    await scrollInner(page, 1); await sleep(700);
    await shot(page, '02-default-redness-dark-plan.png');
    await scrollInner(page, 0); await sleep(500);

    // 2) five/six-finding case — must feel calm.
    await clickChip(page, 'Six findings'); await sleep(1500);
    await shot(page, '03-six-findings-dark-top.png');
    await scrollInner(page, 1); await sleep(700);
    await shot(page, '04-six-findings-dark-plan.png');
    await scrollInner(page, 0); await sleep(400);

    // 3) deep-skin multi-finding — the visible Skan-beater.
    await clickChip(page, 'Deep skin'); await sleep(1500);
    await shot(page, '05-deep-skin-dark-top.png');
    await scrollInner(page, 0.55); await sleep(700);
    await shot(page, '06-deep-skin-dark-mid.png');
    await scrollInner(page, 0); await sleep(400);

    // 4) bad-photo carry-over banner.
    await clickChip(page, 'Bad photo'); await sleep(1500);
    await shot(page, '07-bad-photo-dark.png');

    // 5) great skin (leads with a strength).
    await clickChip(page, 'Great skin'); await sleep(1500);
    await shot(page, '08-great-skin-dark.png');

    // 6) coverage-cap wash → guarded (no whole-face wash renders).
    await clickChip(page, 'Wash'); await sleep(1500);
    await shot(page, '09-wash-guarded-dark.png');

    // 7) light mode (bonus) — back to redness, toggle theme.
    await clickChip(page, 'Redness'); await sleep(900);
    await clickChip(page, 'dark'); await sleep(1300); // theme chip shows current theme → toggles to light
    await shot(page, '10-default-redness-light.png');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
  console.log('done →', OUT);
})();
