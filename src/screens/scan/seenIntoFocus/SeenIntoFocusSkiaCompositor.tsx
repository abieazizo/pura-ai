// @ts-nocheck
/* eslint-disable */
/**
 * SeenIntoFocusSkiaCompositor — the FULL-FIDELITY face composition.
 *
 * ⚠️ ORPHAN BY DESIGN. Nothing imports this file by default, so Metro never
 * bundles it and the (currently uninstalled) Skia package cannot break the
 * build. The `// @ts-nocheck` above keeps the project typecheck green until the
 * dependency exists.
 *
 * TO ENABLE FULL FIDELITY:
 *   1) npx expo install @shopify/react-native-skia   (requires a dev build,
 *      NOT Expo Go)
 *   2) remove the `// @ts-nocheck` line above
 *   3) in SeenIntoFocusScreen.tsx, swap the FaceCompositor import to:
 *        import { SeenIntoFocusSkiaCompositor as FaceCompositor }
 *          from './seenIntoFocus/SeenIntoFocusSkiaCompositor';
 *
 * WHY SKIA (and why the fallback can't fully do this): only the GPU can animate
 * a blur RADIUS while a moving radial "clarity pool" mask reveals the sharp
 * layer and a warm key blends in SOFT-LIGHT — all at 60fps. This is the look.
 *
 * Web → Skia mapping (verbatim from the brief):
 *   • base, CSS blur(gblur)        → <Image> in a layer whose Paint has <Blur/>
 *   • moving clarity pool          → sharp <Image> in a <Mask> = <Rect> filled
 *                                    with a <RadialGradient> at animated center
 *   • global resolve               → blurR → 0 AND focusR grows huge at release
 *   • warm key, CSS soft-light     → warm <RadialGradient> circle, BlendMode
 *                                    SoftLight, centered ~14% above focus
 *   • vignette                     → linear-gradient rect (dark top + bottom)
 *   • film grain                   → Turbulence shader, BlendMode Overlay ~0.05
 *
 * Driven by the same derived values as the fallback (see ./types). The photo is
 * NEVER retouched — only blurred then revealed.
 */

import React from 'react';
import {
  Blur,
  Canvas,
  ColorMatrix,
  Fill,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Mask,
  Paint,
  RadialGradient,
  Rect,
  Turbulence,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { COMPANION, KEY_LIGHT, TOK } from './motion';
import type { FaceCompositorProps } from './types';

export function SeenIntoFocusSkiaCompositor({
  photoUri,
  frameW,
  frameH,
  focusCenter,
  keyCenter,
  blurR,
  focusRpx,
  baseBright,
  sharpBright,
  keyOpacity,
}: FaceCompositorProps) {
  const image = useImage(photoUri);

  const keyR = KEY_LIGHT.radiusMult * frameW;

  // Brightness as a color matrix (scales RGB, leaves alpha).
  const baseMatrix = useDerivedValue(() => {
    'worklet';
    const b = baseBright.value;
    return [b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0];
  });
  const sharpMatrix = useDerivedValue(() => {
    'worklet';
    const b = sharpBright.value;
    return [b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0];
  });

  // Clarity-pool mask vector (Skia consumes the SharedValue<{x,y}> directly).
  const poolCenter = useDerivedValue(() => {
    'worklet';
    return vec(focusCenter.value.x, focusCenter.value.y);
  });
  const keyVec = useDerivedValue(() => {
    'worklet';
    return vec(keyCenter.value.x, keyCenter.value.y);
  });

  if (!image) {
    // Photo still decoding — hold on the warm-dark frame, no flash of content.
    return (
      <Canvas style={{ width: frameW, height: frameH }}>
        <Fill color="#0A0B0F" />
      </Canvas>
    );
  }

  return (
    <Canvas style={{ width: frameW, height: frameH }}>
      {/* 1 · Blurred base layer (brightened, then blurred in its own layer). */}
      <Group layer={<Paint><Blur blur={blurR} /></Paint>}>
        <Group layer={<Paint><ColorMatrix matrix={baseMatrix} /></Paint>}>
          <SkiaImage image={image} x={0} y={0} width={frameW} height={frameH} fit="cover" />
        </Group>
      </Group>

      {/* 2 · Sharp clarity pool — the in-focus original revealed through a
             moving radial mask. focusR grows huge at release → whole face crisp. */}
      <Mask
        mode="alpha"
        mask={
          <Rect x={0} y={0} width={frameW} height={frameH}>
            <RadialGradient
              c={poolCenter}
              r={focusRpx}
              colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
            />
          </Rect>
        }
      >
        <Group layer={<Paint><ColorMatrix matrix={sharpMatrix} /></Paint>}>
          <SkiaImage image={image} x={0} y={0} width={frameW} height={frameH} fit="cover" />
        </Group>
      </Mask>

      {/* 3 · Warm directional key — soft-light, tracks ~14% above the gaze. */}
      <Group layer blendMode="softLight" opacity={keyOpacity}>
        <Rect x={0} y={0} width={frameW} height={frameH}>
          <RadialGradient
            c={keyVec}
            r={keyR}
            colors={[KEY_LIGHT.core, KEY_LIGHT.mid, KEY_LIGHT.edge]}
            positions={[0, 0.45, 1]}
          />
        </Rect>
      </Group>

      {/* 4 · Vignette — dark top + bottom for depth. */}
      <Rect x={0} y={0} width={frameW} height={frameH}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, frameH)}
          colors={[TOK.vignetteTop, 'transparent', 'transparent', TOK.vignetteBottom]}
          positions={[0, 0.3, 0.62, 1]}
        />
      </Rect>

      {/* 5 · Film grain — subtle, overlay-blended. */}
      <Group opacity={TOK.grainOpacity} blendMode="overlay">
        <Fill>
          <Turbulence freqX={0.85} freqY={0.85} octaves={3} seed={7} />
        </Fill>
      </Group>
    </Canvas>
  );
}
