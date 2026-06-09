/**
 * Playwright screenshot script — Pura Shop design verification.
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE     = 'http://localhost:4173';
const OUT      = path.join(__dirname);
const VIEWPORT = { width: 390, height: 844 };

const PRE_SCAN = {
  state: {
    user: { id: 'seed', name: 'Preview', initials: 'P', avatarColor: '#B5BDC8', joinedAt: '2026-01-01T00:00:00.000Z' },
    onboardingComplete: true, scans: [], name: 'Preview',
    concerns: [], skinType: null, sensitivity: null,
    sunExposure: null, effort: null, goal: null, routineTiming: null,
    userRoutineMorning: [], userRoutineEvening: [], wishlist: [], messages: [],
    hasSeenScanTutorial: true, hasPromptedNotifications: false,
  },
  version: 0,
};

const POST_SCAN = {
  state: {
    user: { id: 'seed', name: 'Preview', initials: 'P', avatarColor: '#B5BDC8', joinedAt: '2026-01-01T00:00:00.000Z' },
    onboardingComplete: true,
    scans: [{ id: 'seed-scan-1', capturedAt: '2026-05-30T20:00:00.000Z', dayNumber: 1 }],
    name: 'Preview', concerns: ['Breakouts', 'Redness'], skinType: 'combination',
    sensitivity: 'somewhat', goal: 'clear', routineTiming: 'evening',
    sunExposure: 'sometimes', effort: 'moderate',
    userRoutineMorning: [], userRoutineEvening: [], wishlist: [], messages: [],
    hasSeenScanTutorial: true, hasPromptedNotifications: false,
  },
  version: 0,
};

async function loadPage(page, stateObj) {
  // First navigation to seed localStorage
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((s) => {
    localStorage.setItem('pura-app-state-v1', JSON.stringify(s));
  }, stateObj);

  // Reload so React boots with the seeded state
  await page.reload({ waitUntil: 'load', timeout: 60000 });

  // Wait up to 30s for React to mount (rootChildren > 0)
  await page.waitForFunction(
    () => (document.getElementById('root')?.children?.length ?? 0) > 0,
    { timeout: 30000, polling: 500 }
  );

  // Diagnostics
  const diag = await page.evaluate(() => ({
    title: document.title,
    rootChildren: document.getElementById('root')?.children?.length ?? -1,
    bodyText: document.body?.innerText?.slice(0, 300) ?? '',
  }));
  console.log('  Diag:', JSON.stringify(diag));

  // Extra settle time for Reanimated + image loads
  await page.waitForTimeout(3000);
}

async function goToShop(page) {
  // Try aria-label first
  try {
    await page.click('[aria-label="Shop tab"]', { timeout: 6000 });
    await page.waitForTimeout(1500);
    console.log('  → Shop tab clicked');
    return;
  } catch (_) {}

  // Try role=button containing "Shop"
  try {
    const btns = await page.$$('[role="button"]');
    for (const btn of btns) {
      const txt = await btn.textContent().catch(() => '');
      if (txt && txt.toLowerCase().includes('shop')) {
        await btn.click();
        await page.waitForTimeout(1500);
        console.log('  → Shop button found by text');
        return;
      }
    }
  } catch (_) {}

  // Dump all interactive elements for debugging
  const els = await page.evaluate(() => {
    const tags = ['a','button','[role="button"]','[role="tab"]'];
    return tags.flatMap(sel =>
      [...document.querySelectorAll(sel)].map(el => ({
        tag: el.tagName,
        role: el.getAttribute('role'),
        aria: el.getAttribute('aria-label'),
        text: el.innerText?.slice(0, 40),
      }))
    ).slice(0, 30);
  });
  console.warn('  Shop tab not found. Interactive elements:', JSON.stringify(els, null, 2));
}

async function clickBrowseByConcern(page) {
  // aria-label approach
  try {
    await page.click('[aria-label="Browse the catalog by concern"]', { timeout: 6000 });
    await page.waitForTimeout(1500);
    console.log('  → Browse by concern clicked (aria-label)');
    return;
  } catch (_) {}

  // text content approach
  try {
    await page.click('text=Browse by concern', { timeout: 5000 });
    await page.waitForTimeout(1500);
    console.log('  → Browse by concern clicked (text)');
    return;
  } catch (_) {}

  console.warn('  Browse by concern not found, screenshotting current state');
}

async function shot(page, name) {
  const outPath = path.join(OUT, name);
  await page.screenshot({ path: outPath, animations: 'disabled', fullPage: false });
  console.log('  Saved:', outPath);
  return outPath;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  // Forward ALL console messages so we can see JS errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('  [PAGE ERROR]', msg.text());
  });
  page.on('pageerror', err => console.error('  [PAGE CRASH]', err.message));

  // ── 1. PRE-SCAN ──────────────────────────────────────────────────────────
  console.log('\nShot 1: pre-scan shop…');
  await loadPage(page, PRE_SCAN);
  await goToShop(page);
  await shot(page, 'shop-prescan.png');

  // ── 2. POST-SCAN ─────────────────────────────────────────────────────────
  console.log('\nShot 2: post-scan shop…');
  await loadPage(page, POST_SCAN);
  await goToShop(page);
  await shot(page, 'shop-postscan.png');

  // ── 3. CONCERN INDEX ─────────────────────────────────────────────────────
  console.log('\nShot 3: concern index…');
  await clickBrowseByConcern(page);
  await shot(page, 'shop-concern-index.png');

  await browser.close();
  console.log('\nDone.');
})().catch(err => { console.error(err); process.exit(1); });
