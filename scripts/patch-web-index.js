/**
 * Post-export patch for the Expo Web HTML + PWA configuration.
 *
 * Two responsibilities, run as one step after `expo export -p web` so the
 * production deploy ships a coherent web app:
 *
 *   1. `import.meta` fix. The Metro web bundle ships at least one
 *      transitive dependency that uses `import.meta` (Vite-style env
 *      detection inside a third-party lib). Expo's default
 *      `dist/index.html` references the bundle as a classic
 *      `<script src=...>` tag, so the browser parses the bundle with
 *      classic-script semantics and throws
 *      `Cannot use 'import.meta' outside a module` — white-screening
 *      the entire app. Fix: add `type="module"` to the bundle script
 *      tag. The bundle is a self-contained IIFE that runs fine under
 *      module semantics — modules are deferred by default (matches the
 *      existing `defer` attribute) and `import.meta` resolves correctly
 *      inside one.
 *
 *   2. PWA configuration. When a user adds the deployed site to their
 *      iOS home screen and launches it, iOS reads PWA meta tags out of
 *      the served HTML to decide how the standalone shell behaves. The
 *      Expo template doesn't emit any of those, which is why the iOS
 *      status bar renders as a solid black void instead of merging with
 *      the Porcelain (#FCFDFF) background. This script injects:
 *        • apple-mobile-web-app-status-bar-style="default" — light bar
 *          with dark text, blends with Porcelain
 *        • theme-color="#FCFDFF" — Android Chrome PWA bar tint
 *        • apple-mobile-web-app-capable="yes" — standalone shell on iOS
 *        • mobile-web-app-capable="yes" — standalone shell on Android
 *        • apple-mobile-web-app-title="Pura" — home-screen label
 *        • viewport-fit=cover added to the existing viewport meta
 *        • <link rel="manifest" href="/manifest.json">
 *        • <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
 *        • <link rel="icon" sizes="192x192" href="/icon-192.png">
 *        • <link rel="icon" sizes="512x512" href="/icon-512.png">
 *      It also writes /manifest.json and copies the three icon PNGs
 *      from assets/web-icons/ into dist/ so they're served at the
 *      paths the meta tags point at.
 *
 * Run after `npx expo export -p web`. Idempotent — safe to re-run.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = path.join(process.cwd(), 'dist');
const HTML_PATH = path.join(DIST_DIR, 'index.html');
const ICONS_SRC = path.join(process.cwd(), 'assets', 'web-icons');

if (!fs.existsSync(HTML_PATH)) {
  console.error(
    '[patch-web-index] dist/index.html not found. Did `expo export -p web` run first?'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. import.meta fix — add type="module" to the Expo bundle script tag.
// ---------------------------------------------------------------------------

let html = fs.readFileSync(HTML_PATH, 'utf8');

const NEEDS_MODULE =
  /<script(\s+[^>]*\bsrc=["']\/_expo\/static\/js\/web\/[^"']+["'][^>]*)>/i;

const ALREADY_MODULE =
  /<script[^>]+type=["']module["'][^>]*\bsrc=["']\/_expo\/static\/js\/web\//i;

if (NEEDS_MODULE.test(html) && !ALREADY_MODULE.test(html)) {
  html = html.replace(
    NEEDS_MODULE,
    (_m, attrs) => `<script type="module"${attrs}>`
  );
  console.log('[patch-web-index] Added type="module" to bundle script tag.');
} else if (ALREADY_MODULE.test(html)) {
  console.log('[patch-web-index] Bundle script tag already has type="module".');
} else {
  console.log(
    '[patch-web-index] No matching bundle <script> tag found — leaving as-is.'
  );
}

// ---------------------------------------------------------------------------
// 2. viewport-fit=cover — extend the existing viewport meta so safe-area-inset
//    CSS works correctly on notched devices.
// ---------------------------------------------------------------------------

const VIEWPORT_RE =
  /<meta\s+name=["']viewport["']\s+content=["']([^"']*)["']\s*\/?>/i;
const viewportMatch = html.match(VIEWPORT_RE);
if (viewportMatch) {
  const content = viewportMatch[1];
  if (!/viewport-fit\s*=\s*cover/i.test(content)) {
    const next = content.replace(/\s*$/, '') + ', viewport-fit=cover';
    html = html.replace(
      VIEWPORT_RE,
      `<meta name="viewport" content="${next}" />`
    );
    console.log('[patch-web-index] Added viewport-fit=cover to viewport meta.');
  } else {
    console.log('[patch-web-index] viewport-fit=cover already present.');
  }
}

// ---------------------------------------------------------------------------
// 3. Inject PWA meta tags + manifest/icon links into <head>. Idempotent —
//    we skip any tag whose name/rel is already present.
// ---------------------------------------------------------------------------

const HEAD_INSERTS = [
  {
    id: 'apple-status-bar-style',
    matcher:
      /<meta\s+name=["']apple-mobile-web-app-status-bar-style["'][^>]*\/?>/i,
    tag: '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  },
  {
    id: 'theme-color',
    matcher: /<meta\s+name=["']theme-color["'][^>]*\/?>/i,
    tag: '<meta name="theme-color" content="#FCFDFF" />',
  },
  {
    id: 'apple-web-app-capable',
    matcher: /<meta\s+name=["']apple-mobile-web-app-capable["'][^>]*\/?>/i,
    tag: '<meta name="apple-mobile-web-app-capable" content="yes" />',
  },
  {
    id: 'mobile-web-app-capable',
    matcher: /<meta\s+name=["']mobile-web-app-capable["'][^>]*\/?>/i,
    tag: '<meta name="mobile-web-app-capable" content="yes" />',
  },
  {
    id: 'apple-web-app-title',
    matcher: /<meta\s+name=["']apple-mobile-web-app-title["'][^>]*\/?>/i,
    tag: '<meta name="apple-mobile-web-app-title" content="Pura" />',
  },
  {
    id: 'manifest-link',
    matcher: /<link\s+[^>]*\brel=["']manifest["'][^>]*\/?>/i,
    tag: '<link rel="manifest" href="/manifest.json" />',
  },
  {
    id: 'apple-touch-icon',
    matcher: /<link\s+[^>]*\brel=["']apple-touch-icon["'][^>]*\/?>/i,
    tag: '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
  },
  {
    id: 'icon-192',
    matcher:
      /<link\s+[^>]*\brel=["']icon["'][^>]*\bsizes=["']192x192["'][^>]*\/?>/i,
    tag: '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />',
  },
  {
    id: 'icon-512',
    matcher:
      /<link\s+[^>]*\brel=["']icon["'][^>]*\bsizes=["']512x512["'][^>]*\/?>/i,
    tag: '<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />',
  },
];

const toInsert = HEAD_INSERTS.filter((entry) => !entry.matcher.test(html));
if (toInsert.length > 0) {
  const block = toInsert.map((e) => '    ' + e.tag).join('\n');
  // Inject just before </head> so we sit alongside the existing meta block.
  html = html.replace(/<\/head>/i, `${block}\n  </head>`);
  console.log(
    `[patch-web-index] Injected ${toInsert.length} PWA tag(s): ${toInsert
      .map((e) => e.id)
      .join(', ')}.`
  );
} else {
  console.log('[patch-web-index] All PWA tags already present.');
}

fs.writeFileSync(HTML_PATH, html);

// ---------------------------------------------------------------------------
// 4. manifest.json — Porcelain background + theme, Pura name, standalone
//    display, three icon paths.
// ---------------------------------------------------------------------------

const MANIFEST_PATH = path.join(DIST_DIR, 'manifest.json');
const manifest = {
  name: 'Pura',
  short_name: 'Pura',
  description: 'Pura — your skin coach.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#FCFDFF',
  theme_color: '#FCFDFF',
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log('[patch-web-index] Wrote dist/manifest.json.');

// ---------------------------------------------------------------------------
// 5. Copy the three icon PNGs from assets/web-icons/ into dist/ root so they
//    resolve at the paths the meta tags + manifest point to.
// ---------------------------------------------------------------------------

if (!fs.existsSync(ICONS_SRC)) {
  console.warn(
    `[patch-web-index] assets/web-icons/ not found at ${ICONS_SRC} — icons NOT copied. The PWA will fall back to a generic browser icon.`
  );
} else {
  for (const name of [
    'icon-192.png',
    'icon-512.png',
    'apple-touch-icon.png',
  ]) {
    const src = path.join(ICONS_SRC, name);
    const dst = path.join(DIST_DIR, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      const bytes = fs.statSync(dst).size;
      console.log(`[patch-web-index] Copied ${name} (${bytes} B).`);
    } else {
      console.warn(`[patch-web-index] Missing icon source: ${src}`);
    }
  }
}

console.log('[patch-web-index] Done.');
