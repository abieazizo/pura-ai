/**
 * Onboarding screenshot capture for the surgical-correction verification.
 *
 * Uses playwright-core driving the locally-cached Chromium (no 5s MCP cap,
 * supports animations:'disabled' to freeze Reanimated's rAF loop).
 *
 * Fresh load (no localStorage seed) → production web export shows onboarding
 * because __DEV__ is false, so RootNavigator's dev auto-skip effect never fires.
 *
 * Walks: Welcome → Begin → Name → Skip → Camera Primer → Continue → (camera
 * denied by default in headless Chromium) → Camera Denied fallback.
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'screenshots-onboarding');
// The full chrome.exe build in this cache is missing its side-by-side
// runtime DLLs (fails to spawn); the self-contained chrome-headless-shell
// launches cleanly, so drive that instead.
const EXE =
  'C:\\Users\\abiea\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1223\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const BASE = 'http://localhost:4173';
const VIEWPORT = { width: 390, height: 844 };
const CLIP = { x: 0, y: 0, width: 390, height: 844 };

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await page.screenshot({
    path: path.join(OUT, name),
    animations: 'disabled',
    clip: CLIP,
  });
  // eslint-disable-next-line no-console
  console.log('  saved', name);
}

async function clickText(page, text) {
  // react-native-web renders pressables as role=button with accessible text,
  // but text can be split across spans — try button-by-name first, then text.
  const byRole = page.getByRole('button', { name: text, exact: false }).first();
  if (await byRole.count().catch(() => 0)) {
    await byRole.click({ timeout: 4000 });
    return true;
  }
  const byText = page.getByText(text, { exact: false }).first();
  if (await byText.count().catch(() => 0)) {
    await byText.click({ timeout: 4000 });
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: EXE,
    headless: true,
    channel: 'chromium-headless-shell',
  });
  // Deny camera explicitly so the Primer → Continue path lands on the
  // calm CameraDenied fallback rather than a browser permission dialog.
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    permissions: [],
  });
  const page = await context.newPage();

  try {
    console.log('1. Welcome');
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await sleep(6500);
    await shot(page, '01-welcome.png');

    console.log('2. Name (after Begin)');
    if (await clickText(page, 'Begin')) {
      await sleep(2500);
      await shot(page, '02-name.png');
    } else {
      console.log('  ! could not find Begin');
    }

    console.log('3. Camera Primer (after Skip)');
    if (await clickText(page, 'Skip')) {
      await sleep(2500);
      await shot(page, '03-camera-primer.png');
    } else {
      console.log('  ! could not find Skip');
    }

    console.log('4. Camera Denied (after Continue → denied)');
    if (await clickText(page, 'Continue')) {
      await sleep(4000);
      await shot(page, '04-camera-denied.png');
    } else {
      console.log('  ! could not find Continue');
    }

    // Capture the SignIn screen too (returning-user surface) for droplet audit.
    console.log('5. SignIn (returning user)');
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await sleep(5000);
    if (await clickText(page, 'Sign in')) {
      await sleep(2500);
      await shot(page, '05-signin.png');
    } else {
      console.log('  ! could not find Sign in');
    }
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await browser.close();
  }
  console.log('done →', OUT);
})();
