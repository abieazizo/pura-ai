/**
 * Post-export patch for the Expo Web HTML.
 *
 * The Metro web bundle ships at least one transitive dependency that
 * uses `import.meta` (Vite-style env detection inside a third-party
 * lib). Expo's default `dist/index.html` references the bundle as a
 * classic `<script src=...>` tag, so the browser parses the bundle
 * with classic-script semantics and throws:
 *
 *     Cannot use 'import.meta' outside a module
 *
 * …which white-screens the entire app.
 *
 * Fix: add `type="module"` to the bundle script tag. The bundle is a
 * self-contained IIFE that runs fine under module semantics — modules
 * are deferred by default (which matches the existing `defer`
 * attribute) and `import.meta` resolves correctly inside one.
 *
 * Run after `npx expo export -p web`. Idempotent — safe to re-run.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HTML_PATH = path.join(process.cwd(), 'dist', 'index.html');

if (!fs.existsSync(HTML_PATH)) {
  console.error(
    '[patch-web-index] dist/index.html not found. Did `expo export -p web` run first?'
  );
  process.exit(1);
}

const original = fs.readFileSync(HTML_PATH, 'utf8');

// Match an Expo bundle script tag that does NOT already have type=module.
// The Expo template currently emits:
//   <script src="/_expo/static/js/web/index-<hash>.js" defer></script>
const NEEDS_PATCH =
  /<script(\s+[^>]*\bsrc=["']\/_expo\/static\/js\/web\/[^"']+["'][^>]*)>/i;

if (!NEEDS_PATCH.test(original)) {
  console.log(
    '[patch-web-index] No matching <script> tag found — nothing to patch.'
  );
  process.exit(0);
}

if (/<script[^>]+type=["']module["']/.test(original)) {
  console.log('[patch-web-index] Already patched (type="module" present).');
  process.exit(0);
}

const patched = original.replace(
  NEEDS_PATCH,
  (_match, attrs) => `<script type="module"${attrs}>`
);

fs.writeFileSync(HTML_PATH, patched);
console.log('[patch-web-index] Added type="module" to dist/index.html.');
