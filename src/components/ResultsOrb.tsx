import React, { forwardRef, Suspense } from 'react';
import { useSkiaReady } from '@/skia/useSkiaReady';
import {
  AssistantAuroraOrb,
  type AssistantOrbState,
  type AssistantScanTone,
} from '@/screens/assistant/AssistantAuroraOrb';
import type { AuroraOrbSkiaHandle } from '@/screens/scan/yourSkin/skia/AuroraOrbSkia';
import type { OrbEmotion } from '@/screens/scan/yourSkin/skia/orbShaders';

/**
 * ResultsOrb — the canonical, alive companion orb for the post-scan results
 * surfaces. ONE component, two render paths, chosen by GPU readiness:
 *
 *   • Skia GPU (AuroraOrbSkia)      — real SkSL aurora sphere + additive
 *     BlendMode.Plus cast-light halo. Used on native always, and on web once
 *     CanvasKit has loaded (production web, or dev with `?skia=1`).
 *   • RN/SVG (AssistantAuroraOrb)   — the already-shipping high-quality orb
 *     (layered glow, drifting wisps, breathing, the minimal face). Renders
 *     instantly as the first-paint fallback while CanvasKit loads, and is the
 *     introspectable path the dev preview verifies against.
 *
 * ⚠️ WEB LOAD-ORDER CONTRACT (the bug this file's shape exists to prevent):
 * `@shopify/react-native-skia`'s web entry runs
 * `export const Skia = JsiSkApi(global.CanvasKit)` AT MODULE-EVALUATION TIME.
 * A static import anywhere in the boot graph evaluates it before LoadSkiaWeb
 * resolves, snapshotting `undefined` — every Skia call is then dead forever
 * (shaders fail, nothing draws) even after CanvasKit loads. So AuroraOrbSkia
 * (the only RNSkia importer on this path) is loaded via React.lazy and ONLY
 * rendered once `useSkiaReady()` is true. Type-only imports above are erased
 * at compile time and never evaluate the module.
 *
 * Both paths are the SAME character (aurora glow · drifting wisps · breathing ·
 * two eyes + soft brows + short nose line, no mouth) — never a flat circle,
 * gradient, or placeholder. The footprint is `size` on both, so the upgrade
 * swap is layout-stable.
 *
 * The imperative handle (stepDone/stepSkip warm-beat) is only meaningful on the
 * GPU path; on the SVG fallback the ref resolves to null and callers no-op,
 * which is correct — the earned-beat choreography is a GPU-only flourish.
 */
const AuroraOrbSkiaLazy = React.lazy(() =>
  import('@/screens/scan/yourSkin/skia/AuroraOrbSkia').then((m) => ({
    default: m.AuroraOrbSkia,
  })),
);

export type ResultsOrbHandle = AuroraOrbSkiaHandle;

export interface ResultsOrbProps {
  state: AssistantOrbState;
  /** Footprint in px. Default 92. */
  size?: number;
  scanTone?: AssistantScanTone;
  /** Initial steady emotion (GPU path only). */
  emotion?: OrbEmotion;
  /** Force-disable motion (tests / dev gallery / Reduce Motion). */
  forceReduceMotion?: boolean;
}

export const ResultsOrb = forwardRef<ResultsOrbHandle, ResultsOrbProps>(
  function ResultsOrb(
    { state, size = 92, scanTone = 'balanced', emotion, forceReduceMotion },
    ref,
  ) {
    const skiaReady = useSkiaReady();

    // The alive SVG orb — first paint on web, and the Suspense fallback while
    // the lazy GPU chunk streams in (so there is never a blank frame).
    const svgOrb = (
      <AssistantAuroraOrb state={state} size={size} scanTone={scanTone} />
    );

    if (!skiaReady) return svgOrb;

    return (
      <Suspense fallback={svgOrb}>
        <AuroraOrbSkiaLazy
          ref={ref}
          state={state}
          size={size}
          scanTone={scanTone}
          emotion={emotion}
          forceReduceMotion={forceReduceMotion}
        />
      </Suspense>
    );
  },
);
