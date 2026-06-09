/**
 * Playwright screenshot script for the Pura Shop design verification.
 * Takes 3 screenshots: pre-scan landing, post-scan landing, ConcernIndex.
 *
 * Runs against the static export at http://localhost:4173
 * Uses waitUntil:'domcontentloaded' + explicit wait to avoid the
 * Reanimated rAF "never idle" issue.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import path from 'path';

const BASE = 'http://localhost:4173';
const OUT  = 'C:/Users/abiea/Downloads/pura-ai/scripts';
const VIEWPORT = { width: 390, height: 844 }; // iPhone 14 Pro

/** Minimal pre-scan store blob — onboardingComplete:true, scans:[] */
const PRE_SCAN_STATE = {
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

/** Post-scan: same but with scans + profile filled in for status sentence */
const POST_SCAN_STATE = {
  state: {
    ...PRE_SCAN_STATE.state,
    scans: [{ id: 'seed-scan-1', capturedAt: '2026-05-30T20:00:00.000Z', dayNumber: 1 }],
    concerns: ['Breakouts', 'Redness'],
    skinType: 'combination',
    sensitivity: 'somewhat',
    goal: 'clear',
    routineTiming: 'evening',
  },
  version: 0,
};

async function seedState(page, stateObj) {
  await page.evaluate((s) => {
    localStorage.setItem('pura-app-state-v1', JSON.stringify(s));
  }, stateObj);
}

async function navigateToShop(page) {
  // Click the Shop tab via aria-label
  try {
    await page.click('[aria-label="Shop tab"]', { timeout: 8000 });
    await page.waitForTimeout(1200);
  } catch (e) {
    // fallback: try by text content
    const tabs = await page.$$('[role="button"]');
    for (const tab of tabs) {
      const text = await tab.textContent();
      if (text?.includes('Shop')) { await tab.click(); break; }
    }
    await page.waitForTimeout(1200);
  }
}

async function shootScreen(page, filename) {
  const outPath = path.join(OUT, filename);
  await page.screenshot({
    path: outPath,
    animations: 'disabled',
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
  });
  console.log(`✓ Saved: ${outPath}`);
  return outPath;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // ─── PRE-SCAN ───────────────────────────────────────────────────────────
  console.log('Loading pre-scan state…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await seedState(page, PRE_SCAN_STATE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000); // allow React + fonts
  await navigateToShop(page);
  await page.waitForTimeout(800);
  await shootScreen(page, 'shop-prescan.png');

  // ─── POST-SCAN ──────────────────────────────────────────────────────────
  console.log('Loading post-scan state…');
  await seedState(page, POST_SCAN_STATE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await navigateToShop(page);
  await page.waitForTimeout(800);
  await shootScreen(page, 'shop-postscan.png');

  // ─── CONCERN INDEX ──────────────────────────────────────────────────────
  console.log('Navigating to ConcernIndex…');
  // Click "Browse by concern →" row
  try {
    await page.click('[aria-label="Browse the catalog by concern"]', { timeout: 6000 });
  } catch (e) {
    // fallback: find by text
    const els = await page.$$('*');
    for (const el of els) {
      const t = await el.textContent().catch(() => '');
      if (t?.trim().startsWith('Browse by concern')) { await el.click(); break; }
    }
  }
  await page.waitForTimeout(1500);
  await shootScreen(page, 'shop-concern-index.png');

  await browser.close();
  console.log('\nAll 3 screenshots captured.');
})();
