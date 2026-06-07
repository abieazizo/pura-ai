/**
 * OrbHost — the persistent home of the companion orb across onboarding.
 *
 * THE CONTINUITY MECHANISM. React Navigation would re-mount a per-screen orb on
 * every transition, resetting its breath phase / wisp rotation / blink schedule
 * — a visible hitch, and a hard fade is forbidden. So the orb is mounted ONCE
 * here, in an overlay that floats ABOVE the onboarding stack and never
 * unmounts. Screens don't render the orb; they drive this one through the
 * `useOrb()` controller: they set its target position/size and its
 * expression/gaze/reaction. The orb springs between targets while the screens'
 * own content cross-fades — so it reads as ONE element flowing S1 → S2 → name
 * → S3 with zero hitch.
 *
 * Everything the host animates (position, scale, opacity) is a UI-thread
 * transform on shared values; the orb itself is never re-rendered to move.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';
import {
  AuroraOrb,
  type AuroraOrbHandle,
  type OrbExpression,
  type OrbGaze,
  type OrbReaction,
} from '@/components/AuroraOrb';
import { useAppStore } from '@/store/useAppStore';
import { ORB_ANCHORS, ORB_BASE_SIZE, ORB_SIZES, ORB_SPRING, type OrbTarget } from './orbLayout';

export interface OrbMoveOpts {
  /** Spring config for the glide (defaults to the spec's arrival spring). */
  spring?: WithSpringConfig;
  /** If set, glide with a timing curve of this duration instead of a spring. */
  duration?: number;
}

/**
 * The controller screens use to drive the one shared orb. Stable for the life
 * of the provider — safe to read once and call from timeouts / gestures.
 */
export interface OrbController {
  /** Glide the orb to a target position + visual size. */
  moveTo(target: OrbTarget, opts?: OrbMoveOpts): void;
  /** Change only the visual size, keeping position (e.g. the reaction lift). */
  setSize(size: number, opts?: OrbMoveOpts): void;
  /** Fade the orb in / out (used when handing off out of the orb chain). */
  show(opts?: { duration?: number }): void;
  hide(opts?: { duration?: number }): void;
  setGaze(dir: OrbGaze): void;
  setExpression(expr: OrbExpression): void;
  emphasisPulse(): void;
  react(key: OrbReaction): void;
  shimmer(): void;
  blinkNow(): void;
  /** Animate orb-as-progress warmth to v (0→1); also persists to the store so
   *  downstream surfaces and the reduce-motion static state stay in sync. */
  setFamiliarity(v: number): void;
}

const OrbControllerCtx = createContext<OrbController | null>(null);
const OrbAwokenCtx = createContext<boolean>(false);

/** The orb controller. Throws if used outside an OrbProvider. */
export function useOrb(): OrbController {
  const ctx = useContext(OrbControllerCtx);
  if (!ctx) throw new Error('useOrb must be used within an OrbProvider');
  return ctx;
}

/** Whether the orb's birth has completed (eyes open + first blink). */
export function useOrbAwoken(): boolean {
  return useContext(OrbAwokenCtx);
}

export interface OrbProviderProps {
  children: React.ReactNode;
  /** OS / user reduce-motion. Disables springs + birth; orb renders static. */
  reduceMotion: boolean;
  /** Play the birth on mount (new-user cold open). Default true. */
  birth?: boolean;
  /**
   * Where the orb starts. For the interview we pass the EXACT spot Screen 1's
   * orb exits to, so the orb appears to continue from the cold open with no
   * jump (then the first step springs it to its settle).
   */
  initialTarget?: OrbTarget;
}

export function OrbProvider({
  children,
  reduceMotion,
  birth = true,
  initialTarget,
}: OrbProviderProps) {
  const orbRef = useRef<AuroraOrbHandle>(null);
  const rmRef = useRef(reduceMotion);
  rmRef.current = reduceMotion;

  // Initial position — the handoff spot if given, else the birth beat, so the
  // orb is placed correctly on the very first frame (no jump).
  const win = Dimensions.get('window');
  const cx = useSharedValue(initialTarget?.cx ?? win.width / 2);
  const cy = useSharedValue(initialTarget?.cy ?? win.height * ORB_ANCHORS.birth);
  const scale = useSharedValue(
    (initialTarget?.size ?? ORB_SIZES.birth) / ORB_BASE_SIZE,
  );
  const visible = useSharedValue(1);

  const [awoken, setAwoken] = useState(reduceMotion);

  const familiarity = useAppStore((s) => s.familiarity);
  const setStoreFamiliarity = useAppStore((s) => s.setFamiliarity);
  const setStoreFamiliarityRef = useRef(setStoreFamiliarity);
  setStoreFamiliarityRef.current = setStoreFamiliarity;

  // Controller — stable. Reads reduce-motion from a ref so springs/instant is
  // always current. Shared values + orbRef are stable across renders.
  const controller = useMemo<OrbController>(() => {
    const glide = (sv: typeof cx, to: number, opts?: OrbMoveOpts) => {
      if (rmRef.current) {
        sv.value = to;
        return;
      }
      sv.value = opts?.duration
        ? withTiming(to, { duration: opts.duration })
        : withSpring(to, opts?.spring ?? ORB_SPRING);
    };
    return {
      moveTo(target, opts) {
        glide(cx, target.cx, opts);
        glide(cy, target.cy, opts);
        glide(scale, target.size / ORB_BASE_SIZE, opts);
      },
      setSize(size, opts) {
        glide(scale, size / ORB_BASE_SIZE, opts);
      },
      show(opts) {
        visible.value = rmRef.current
          ? 1
          : withTiming(1, { duration: opts?.duration ?? 320 });
      },
      hide(opts) {
        visible.value = rmRef.current
          ? 0
          : withTiming(0, { duration: opts?.duration ?? 320 });
      },
      setGaze: (dir) => orbRef.current?.setGaze(dir),
      setExpression: (expr) => orbRef.current?.setExpression(expr),
      emphasisPulse: () => orbRef.current?.emphasisPulse(),
      react: (key) => orbRef.current?.react(key),
      shimmer: () => orbRef.current?.shimmer(),
      blinkNow: () => orbRef.current?.blinkNow(),
      setFamiliarity: (v) => {
        const t = Math.max(0, Math.min(1, v));
        // Persist (downstream + reduce-motion static correctness). The store
        // change re-renders the host, flowing the new `familiarity` prop into
        // the orb, whose own effect animates the warmth on the UI thread.
        setStoreFamiliarityRef.current(t);
        orbRef.current?.setFamiliarity(t);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carrierStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [
      { translateX: cx.value - ORB_BASE_SIZE / 2 },
      { translateY: cy.value - ORB_BASE_SIZE / 2 },
      { scale: scale.value },
    ],
  }));

  return (
    <OrbControllerCtx.Provider value={controller}>
      <OrbAwokenCtx.Provider value={awoken}>
        <View style={styles.root}>
          {children}

          {/* Overlay — above the stack, lets touches fall through to screens. */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View style={[styles.carrier, carrierStyle]} pointerEvents="none">
              <AuroraOrb
                ref={orbRef}
                size={ORB_BASE_SIZE}
                state={birth ? 'awakening' : 'idle'}
                familiarity={familiarity}
                reduceMotion={reduceMotion}
                onAwake={() => setAwoken(true)}
              />
            </Animated.View>
          </View>
        </View>
      </OrbAwokenCtx.Provider>
    </OrbControllerCtx.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  carrier: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ORB_BASE_SIZE,
    height: ORB_BASE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
