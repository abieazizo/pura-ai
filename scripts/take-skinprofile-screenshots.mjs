/**
 * Screenshots the Me → Skin profile settings screen to evidence that the
 * deferred onboarding questions (skin type, concerns, sensitivity, goal, sun,
 * effort, age range, hormonal context) now live there as optional editable
 * fields — NOT in the pre-scan onboarding flow.
 *
 * Seeds onboardingComplete:true so the app boots past onboarding into Tabs,
 * navigates Me tab → Skin profile, and captures top + bottom (the age and
 * hormone sections are below the fold).
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'screenshots-onboarding');
const EXE =
  'C:\\Users\\abiea\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1223\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const BASE = 'http://localhost:4173';
const VIEWPORT = { width: 390, height: 844 };
const CLIP = { x: 0, y: 0, width: 390, height: 844 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// onboardingComplete:true + the deferred fields pre-filled with values that
// match the SkinProfileScreen option sets, so the chips render selected.
const SEED = {
  state: {
    user: {
      id: 'seed',
      name: 'Preview',
      initials: 'P',
      avatarColor: '#B5BDC8',
      joinedAt: '2026-01-01T00:00:00.000Z',
    },
    onboardingComplete: true,
    name: 'Preview',
    scans: [],
    skinType: 'combination',
    concerns: [],
    sensitivity: 'somewhat',
    goal: 'clear',
    sunExposure: 'sometimes',
    effort: 'moderate',
    ageRange: '25-34',
    agePreferNotToSay: false,
    hormoneContext: 'cycle',
    userRoutineMorning: [],
    userRoutineEvening: [],
    wishlist: [],
    messages: [],
    hasSeenScanTutorial: true,
    hasPromptedNotifications: false,
  },
  version: 0,
};

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), animations: 'disabled', clip: CLIP });
  console.log('  saved', name);
}

async function clickByLabelOrText(page, label, text) {
  const byLabel = page.locator(`[aria-label="${label}"]`).first();
  if (await byLabel.count().catch(() => 0)) {
    await byLabel.click({ timeout: 4000 }).catch(() => {});
    return true;
  }
  const byText = page.getByText(text, { exact: false }).first();
  if (await byText.count().catch(() => 0)) {
    await byText.click({ timeout: 4000 }).catch(() => {});
    return true;
  }
  return false;
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: EXE,
    headless: true,
    channel: 'chromium-headless-shell',
  });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate((s) => localStorage.setItem('pura-app-state-v1', JSON.stringify(s)), SEED);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(6500);

    console.log('Me tab');
    await clickByLabelOrText(page, 'Me tab', 'Me');
    await sleep(2000);
    await shot(page, '06-me.png');

    console.log('Skin profile row');
    await clickByLabelOrText(page, 'Skin profile', 'Skin profile');
    await sleep(2500);
    await shot(page, '07-skinprofile-top.png');

    // Age + hormones sit below the fold — scroll to the bottom and capture.
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 1600);
    await sleep(1200);
    await shot(page, '08-skinprofile-bottom.png');
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await browser.close();
  }
  console.log('done →', OUT);
})();
