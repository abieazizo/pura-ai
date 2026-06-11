import React, { forwardRef } from 'react';
import { useSkiaReady } from '@/skia/useSkiaReady';
import {
  AssistantAuroraOrb,
  type AssistantOrbState,
  type AssistantScanTone,
} from '@/screens/assistant/AssistantAuroraOrb';
import {
  AuroraOrbSkia,
  type AuroraOrbSkiaHandle,
} from '@/screens/scan/yourSkin/skia/AuroraOrbSkia';
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
 * Both paths are the SAME character (aurora glow · drifting wisps · breathing ·
 * two eyes + soft brows + short nose line, no mouth) — never a flat circle,
 * gradient, or placeholder. The swap is seamless and layout-stable because the
 * footprint is `size` on both.
 *
 * The imperative handle (stepDone/stepSkip warm-beat) is only meaningful on the
 * GPU path; on the SVG fallback the ref resolves to null and callers no-op,
 * which is correct — the earned-beat choreography is a GPU-only flourish.
 */
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

    if (skiaReady) {
      return (
        <AuroraOrbSkia
          ref={ref}
          state={state}
          size={size}
          scanTone={scanTone}
          emotion={emotion}
          forceReduceMotion={forceReduceMotion}
        />
      );
    }

    // First-paint / introspectable fallback — the alive SVG orb.
    return <AssistantAuroraOrb state={state} size={size} scanTone={scanTone} />;
  },
);
