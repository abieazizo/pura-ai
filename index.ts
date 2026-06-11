import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

// Register the app IMMEDIATELY — first paint must never wait on the 8 MB
// CanvasKit (WASM) download. Skia surfaces render their RN/SVG fallback until
// CanvasKit is ready, then upgrade to the GPU path (progressive enhancement).
//
// Native (iOS/Android) autolinks Skia's native code under the New Architecture,
// so the GPU path is available from the first frame and this web branch is a
// no-op there (useSkiaReady() returns true immediately on native).
registerRootComponent(App);

// Should web boot the CanvasKit (Skia GPU) path on this load?
//
//   • PRODUCTION web (Vercel build, __DEV__ === false): YES by default — the
//     deployed app renders real Skia everywhere, matching native.
//   • DEV web (expo start, this sandbox): NO by default — a live CanvasKit page
//     pins the browser frame loop, which hangs headless eval/screenshot tooling.
//     Staying on the RN/SVG fallback keeps the page idle so every screen's
//     layout/copy/contract can be machine-verified. Opt into the real GPU render
//     with `?skia=1`.
//   • `?svg=1` always forces the SVG path (overrides everything) — an explicit
//     escape hatch for any environment where CanvasKit can't load.
function webShouldBootSkia(): boolean {
  try {
    const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
    const p = new URLSearchParams(search);
    if (p.get('svg') === '1') return false;
    if (p.get('skia') === '1') return true;
    // Default: on in production, off in the dev preview.
    return typeof __DEV__ === 'undefined' || __DEV__ === false;
  } catch {
    return false;
  }
}

declare const __DEV__: boolean | undefined;

if (Platform.OS === 'web' && webShouldBootSkia()) {
  const g = globalThis as unknown as {
    __SKIA_READY__?: boolean;
    dispatchEvent?: (e: Event) => boolean;
  };
  g.__SKIA_READY__ = false;
  // Pin the wasm to the exact installed canvaskit-wasm@0.40.0 so the wasm can
  // never drift from the JS glue. Cached by the browser after first load.
  const CDN = 'https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/';
  import('@shopify/react-native-skia/lib/commonjs/web')
    .then(({ LoadSkiaWeb }) => LoadSkiaWeb({ locateFile: (file: string) => CDN + file }))
    .then(() => {
      g.__SKIA_READY__ = true;
      // Wake any mounted useSkiaReady() subscribers so they swap SVG -> Skia.
      try {
        g.dispatchEvent?.(new Event('skia-ready'));
      } catch {
        /* dispatchEvent unavailable — the hook's poll fallback covers this */
      }
    })
    .catch((err) => {
      // CanvasKit genuinely failed — stay on the SVG fallback (still beautiful)
      // and surface the failure LOUDLY rather than a silent blank canvas.
      // eslint-disable-next-line no-console
      console.error('[skia-web] CanvasKit failed to load — staying on SVG fallback', err);
    });
}
