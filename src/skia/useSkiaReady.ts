import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Is the Skia GPU path available to render RIGHT NOW?
 *
 * - Native (iOS/Android): Skia autolinks under the New Architecture, so the GPU
 *   path is ready from the first frame — always true.
 * - Web: CanvasKit (WASM) is loaded asynchronously after first paint (see
 *   index.ts). Rendering a Skia <Canvas> before it resolves throws, so web
 *   surfaces must hold their RN/SVG fallback until this flips true.
 */
export function isSkiaReady(): boolean {
  if (Platform.OS !== 'web') return true;
  return !!(globalThis as { __SKIA_READY__?: boolean }).__SKIA_READY__;
}

/**
 * Reactive form of {@link isSkiaReady}. Re-renders the caller once CanvasKit
 * finishes loading on web (via the `skia-ready` event index.ts dispatches), with
 * a low-frequency poll as a belt-and-braces fallback in case the event fired
 * between the initial render and effect subscription.
 */
export function useSkiaReady(): boolean {
  const [ready, setReady] = useState<boolean>(isSkiaReady());

  useEffect(() => {
    if (ready || Platform.OS !== 'web') {
      if (!ready) setReady(true);
      return;
    }
    const g = globalThis as unknown as {
      __SKIA_READY__?: boolean;
      addEventListener?: (t: string, cb: () => void) => void;
      removeEventListener?: (t: string, cb: () => void) => void;
    };
    if (g.__SKIA_READY__) {
      setReady(true);
      return;
    }
    const onReady = () => setReady(true);
    g.addEventListener?.('skia-ready', onReady);
    const poll = setInterval(() => {
      if (g.__SKIA_READY__) {
        setReady(true);
        clearInterval(poll);
      }
    }, 150);
    return () => {
      g.removeEventListener?.('skia-ready', onReady);
      clearInterval(poll);
    };
  }, [ready]);

  return ready;
}
