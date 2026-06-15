/**
 * flow/motion — the ONE shared motion + haptics module for the two-act routine.
 *
 * Every aspect team's MOTION role imports from here so the choreography is
 * identical across the flow and lives in a single source of truth:
 *   • the overview SET-DOWN (header + step rows arrive staggered)
 *   • the OVERVIEW→RITUAL DESCENT (light→dark; the orb carries as a shared
 *     element; the tab bar fades — owned by the host)
 *   • the STEP ADVANCE (current fades/slides out, next rises in)
 *   • the DONE gold-bloom (orb warms gold + one Medium haptic)
 *   • the SKIP muted-dim (a brief quiet dim, no haptic, no scold)
 *   • the COMPLETION bloom + the calm care beat
 *
 * RULES (per the brief):
 *   • Reanimated worklets / UI-thread shared values ONLY — NEVER setTimeout for
 *     animation or sequencing. `useUiDelay` gives a sanctioned, setTimeout-free
 *     "after(ms)" built on a withTiming completion callback (runOnJS).
 *   • Reduced motion: set-down / parallax / descent transforms are stilled; the
 *     acts present cleanly and the descent becomes a clean cross-fade.
 *
 * No hex lives here — colors come from `@/theme/routineFlow`.
 */

import { useEffect, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ORB_RITUAL_SPRING } from '@/theme/routineAtmosphere';
import { flowSpring, flowTiming, orbTemp } from '@/theme/routineFlow';
import { ritualHaptics } from '../ritualHaptics';
import type { OrbController } from '@/screens/onboarding/orb/OrbHost';
import type { OrbTargetXY } from './contracts';

/** The arrival curve — used for the descent + step rise (cubic-bezier). */
export const ARRIVE = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.quad);

/** Re-export the no-bounce orb glide spring so the carry-over uses one config. */
export const ORB_CARRY_SPRING = ORB_RITUAL_SPRING;

// ---------------------------------------------------------------------------
// ENTRANCE — the overview set-down (header + each step row)
// ---------------------------------------------------------------------------

/**
 * The set-down: an element arrives translateY 16→0 + opacity 0→1 on the brief's
 * spring (damping 18 / stiffness 140), staggered by `index × 70ms`. Reduced
 * motion: present instantly (no transform). Returns an animated style to spread
 * onto the element's wrapper.
 */
export function useSetDown(index: number, reduceMotion: boolean) {
  const t = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      t.value = 1;
      return;
    }
    t.value = 0;
    t.value = withDelay(
      index * flowTiming.setDownStaggerMs,
      withSpring(1, flowSpring.setDown),
    );
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, index]);

  return useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 16 }],
  }));
}

/**
 * A slight front-plane parallax for product images on scroll (±frontPlanePx).
 * Pass the ScrollView's scroll-Y shared value + the row's resting offset; the
 * image drifts a few px against scroll so it reads as a near object. Reduced
 * motion / no scroll value → identity.
 */
export function useFrontPlane(
  scrollY: SharedValue<number> | null,
  rowOffset: number,
  reduceMotion: boolean,
) {
  return useAnimatedStyle(() => {
    if (reduceMotion || !scrollY) return { transform: [{ translateY: 0 }] };
    const d = (scrollY.value - rowOffset) / 600; // normalized
    const clamped = Math.max(-1, Math.min(1, d));
    return { transform: [{ translateY: clamped * flowTiming.frontPlanePx }] };
  });
}

// ---------------------------------------------------------------------------
// DESCENT — OVERVIEW → RITUAL (light dissolves to dark; orb carries over)
// ---------------------------------------------------------------------------

/**
 * The signature transition driver. `p` runs 0 (overview) → 1 (ritual) over
 * ~600ms; `light`/`dark` styles cross-fade the two acts on top of each other
 * while the host carries the orb (see `carryOrbToRitual`) and the tab bar fades.
 * Reduced motion → a clean, quick cross-fade (no transforms). The reverse drives
 * the return on finish.
 */
export function useDescent(reduceMotion: boolean) {
  const p = useSharedValue(0);

  const start = (onArrived?: () => void) => {
    const ms = reduceMotion ? flowTiming.descentReducedMs : flowTiming.descentMs;
    p.value = withTiming(1, { duration: ms, easing: ARRIVE }, (fin) => {
      if (fin && onArrived) runOnJS(onArrived)();
    });
  };
  const reverse = (onHome?: () => void) => {
    const ms = reduceMotion ? flowTiming.descentReducedMs : flowTiming.descentMs;
    p.value = withTiming(0, { duration: ms, easing: ARRIVE }, (fin) => {
      if (fin && onHome) runOnJS(onHome)();
    });
  };

  // Light recedes first; dark rises slightly behind it (a descent, not a swap).
  const lightStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, p.value * 1.3),
    transform: reduceMotion ? [] : [{ translateY: p.value * -10 }],
  }));
  const darkStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (p.value - 0.15) / 0.85),
    transform: reduceMotion ? [] : [{ translateY: (1 - p.value) * 16 }],
  }));

  return { p, start, reverse, lightStyle, darkStyle };
}

// ---------------------------------------------------------------------------
// STEP ADVANCE — current fades/slides out, next rises in (~400ms spring)
// ---------------------------------------------------------------------------

/**
 * Drives one step view's enter/exit. `style` spreads onto the step content.
 * `enter()` rises the incoming step (translateY +18→0 on the advance spring);
 * `exit(cb)` fades + slides the outgoing step down over ~180ms, then runs `cb`
 * (on the JS thread) to swap the index — never a hard cut, never a setTimeout.
 */
export function useStepTransition(reduceMotion: boolean) {
  const io = useSharedValue(1); // 1 = present, 0 = gone

  const enter = () => {
    if (reduceMotion) {
      io.value = 1;
      return;
    }
    io.value = 0;
    io.value = withSpring(1, flowSpring.advance);
  };
  const exit = (cb?: () => void) => {
    if (reduceMotion) {
      cb?.();
      return;
    }
    io.value = withTiming(
      0,
      { duration: flowTiming.stepOutMs, easing: EASE_IN },
      (fin) => {
        if (fin && cb) runOnJS(cb)();
      },
    );
  };

  const style = useAnimatedStyle(() => ({
    opacity: io.value,
    transform: [{ translateY: (1 - io.value) * 18 }],
  }));

  return { enter, exit, style, io };
}

// ---------------------------------------------------------------------------
// A sanctioned, setTimeout-FREE delay (for holds: settle, care).
// ---------------------------------------------------------------------------

/**
 * `after(ms, cb)` runs `cb` after `ms`, driven by a Reanimated timing whose
 * completion callback fires on the JS thread — so holds never use setTimeout.
 * Round-robins a small fixed pool of shared values; `cancelAll()` stops pending
 * holds (call on unmount / end-early). Under reduce-motion callers may pass
 * ms=0; the callback then fires on the next frame.
 */
export function useUiDelay() {
  // Fixed pool (stable hook count). Six concurrent holds is ample for one step.
  const pool = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];
  const idx = useRef(0);

  const after = (ms: number, cb: () => void) => {
    const sv = pool[idx.current % pool.length];
    idx.current += 1;
    cancelAnimation(sv);
    sv.value = 0;
    sv.value = withTiming(1, { duration: Math.max(0, ms) }, (fin) => {
      if (fin) runOnJS(cb)();
    });
  };
  const cancelAll = () => pool.forEach(cancelAnimation);

  useEffect(() => cancelAll, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { after, cancelAll };
}

// ---------------------------------------------------------------------------
// ORB CHOREOGRAPHY — the single source of the calm / gold / muted emotion.
// Plain functions (called from JS handlers); the orb sequences on the UI thread.
// ---------------------------------------------------------------------------

/** Idle: the cool/violet calm register, attentive and present. */
export function orbToCalm(orb: OrbController, ms = 500): void {
  orb.setGlowTemperature(orbTemp.calm, ms);
  orb.setExpression('attentive');
}

/** Entering the ritual: a faintly-warm "present" baseline, gaze to the viewer. */
export function orbEnterRitual(orb: OrbController): void {
  orb.setGlowTemperature(orbTemp.present, 600);
  orb.setExpression('attentive');
  orb.setGaze('forward');
}

/** The orb takes the next step: gaze drops to it, a small blink, re-cools so the
 *  next care/gold beat has a cool baseline to warm from. */
export function orbTakeStep(orb: OrbController): void {
  orb.setGaze('down');
  orb.blinkNow();
  orb.setGlowTemperature(orbTemp.present, 400);
  orb.setExpression('attentive');
}

/**
 * THE GOLD BEAT — fires on the Done tap, EVERY step: the orb floods warm gold,
 * the halo blooms, the eyes curve happy (warm archetype), and ONE Medium haptic
 * lands with it. ~1s later a normal advance re-cools (orbTakeStep); a meaningful
 * step HOLDS the warmth via `orbCareBeat`. Completion is care, never points.
 */
export function playGoldBloom(orb: OrbController): void {
  ritualHaptics.goldBloom();
  orb.setGlowTemperature(orbTemp.gold, 240);
  orb.reactArchetype('warm', { warmth: 'high', lineMs: 600 });
  orb.bloomOnce({ peak: 1.12, ms: flowTiming.goldBloomMs });
}

/** A meaningful step's completion-as-care: the orb turns fully to the viewer,
 *  holds the warm gold, and goes STILL — the stillness is the reward. */
export function orbCareBeat(orb: OrbController): void {
  orb.setGaze('forward');
  orb.setExpression('warm');
  orb.setGlowTemperature(orbTemp.gold, 500);
}

/**
 * THE MUTED BEAT — the Skip: the orb goes quiet grey (temperature toward cool,
 * halo dimmer + slightly smaller via muteOnce), then settles back. NO haptic —
 * the absence of the gold beat IS the feedback. Never a scold.
 */
export function playMuteDim(orb: OrbController): void {
  orb.setExpression('neutral');
  orb.setGlowTemperature(orbTemp.mute, 300);
  orb.muteOnce(flowTiming.muteMs);
}

/** Glow brightens as the user progresses (a subtle held brighten, never gamey). */
export function orbProgress(orb: OrbController, frac: number): void {
  orb.brightenOnce(0.05 + Math.max(0, Math.min(1, frac)) * 0.06, 900);
}

/** THE DONE LANDING — the ritual's slowest, fully-warm bloom + the one closing
 *  Medium warm haptic. Framed as rest, not celebration. */
export function playDoneLanding(orb: OrbController): void {
  ritualHaptics.doneLanding();
  orb.setGaze('forward');
  orb.setExpression('validating');
  orb.setGlowTemperature(orbTemp.gold, 600);
  orb.bloomOnce({ peak: 1.15, ms: flowTiming.doneBloomMs });
}

/** Ending early — a reassuring half-warm settle, no celebration. */
export function orbEndedEarly(orb: OrbController): void {
  orb.setGaze('forward');
  orb.setExpression('reassuring');
  orb.setGlowTemperature(0.5, 400);
}

/** Carry the shared orb from its overview rest to the ritual's large top-center
 *  presence (the shared element of the descent). One no-bounce glide. */
export function carryOrbToRitual(orb: OrbController, target: OrbTargetXY): void {
  orb.moveTo(target, { spring: ORB_CARRY_SPRING });
  orbEnterRitual(orb);
}

/** Carry the orb home (shrinks back to its overview anchor on finish). */
export function carryOrbHome(orb: OrbController, target: OrbTargetXY): void {
  orb.moveTo(target, { spring: ORB_CARRY_SPRING });
  orbToCalm(orb, 600);
}
