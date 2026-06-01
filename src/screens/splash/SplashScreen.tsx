import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Font from 'expo-font';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * SplashScreen — "Cast in Glass".
 *
 * A big, grounded serif wordmark on one unbroken Porcelain (#FCFDFF) canvas —
 * an object made of dark glass resting on a lit surface, not text in a void.
 *
 *   ACT 1 (0–1100ms)   ASSEMBLY. Each letter of "Pura" arrives from depth —
 *                      from below, tilted back, behind the screen plane — and
 *                      settles on Apple's decelerate curve, staggered 60ms
 *                      apart. A soft contact shadow grows underneath as the
 *                      letters land. A single Light haptic fires on the land.
 *   ACT 2 (1100–2200)  HOLD. One specular highlight rakes left→right across the
 *                      letterforms (the "cast in glass" tell — light travelling
 *                      over the surface), while the word breathes a 1% pulse. A
 *                      slow `systemReady` simply extends the breathing hold.
 *   ACT 3 (2200–3000)  EXIT. The word drifts up, scales 2%, and fades to zero;
 *                      the floor shadow fades with it. onReady() fires on the
 *                      clean Porcelain frame so Home takes over on an invisible
 *                      seam.
 *
 * Depth is faked, not rendered (no Three.js). Per-letter `perspective` +
 * `rotateX` sell the tilt; the "behind the plane" recession is carried by scale
 * (0.88 → 1.0). Each glyph is an SVG <Text> with a vertical Ink→warm gradient
 * fill and a porcelain top-edge rim. The light-sweep is a second, sheen-filled
 * SVG glyph whose OPACITY is pulsed, staggered letter-to-letter — a glint that
 * crosses the word using only opacity animation (no animated SVG fills), so it
 * renders identically and reliably on device.
 *
 * Reduce Motion: assembly becomes a staggered opacity fade (no tilt, no
 * recession); the hold sits still with no sweep; exit is a plain fade; no haptic.
 *
 * Contract (unchanged): mounts at app root; calls onReady() exactly once when
 * the ceremony has played its minimum AND `systemReady` is true.
 */

export interface SplashScreenProps {
  onReady: () => void;
  systemReady?: boolean;
}

const PORCELAIN = palette.bg; // #FCFDFF — identical to Home's canvas
const INK_TOP = '#070910'; // gradient head (cool near-black)
const INK_MID = '#161019'; // gradient body
const INK_BOTTOM = '#2E2330'; // gradient foot (warmer, lifted)
const SHEEN = '#FFFFFF'; // specular highlight colour
const FLOOR = '#0A0B10'; // grounding contact-shadow colour
const LETTERS = ['P', 'u', 'r', 'a'] as const;
const FONT = 'InstrumentSerif-Regular';

// Timeline (ms) — full-motion path.
const STAGGER = 60;
const LETTER_DUR = 900;
const ASSEMBLE_END = 1100;
const HOLD_END = 2200;
const HOLD_DUR = HOLD_END - ASSEMBLE_END;
const EXIT_DUR = 800;
const SWEEP_DELAY = 140; // after the land, before the glint starts
const SWEEP_DUR = 920; // one pass across the word

// Timeline (ms) — reduce-motion path.
const R_ASSEMBLE_DUR = 400;
const R_ASSEMBLE_END = (LETTERS.length - 1) * STAGGER + R_ASSEMBLE_DUR; // 580
const R_HOLD_END = 1500;
const R_EXIT_DUR = 600;

// Eases.
const ENTER = Easing.bezier(0.16, 1, 0.3, 1); // Apple's decelerate curve
const EXIT = Easing.bezier(0.4, 0, 0.2, 1);
const BREATHE = Easing.inOut(Easing.ease);

// Depth / entrance.
const PERSPECTIVE = 1200;
const ENTER_TY = 30; // px below final
const ENTER_RX = 22; // deg tilted forward
const ENTER_SCALE = 0.88; // ≈ translateZ recession under perspective:1200

// Approx glyph advance (em) so each SVG box can paint on frame 1, before the
// transparent sizer's onLayout reports the exact advance width.
const ADVANCE: Record<string, number> = { P: 0.56, u: 0.5, r: 0.4, a: 0.5 };

// Tight contact shadow — letters resting on a surface.
const CONTACT = {
  shadowColor: '#000000',
  shadowOpacity: 0.1,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 3 },
} as const;

// Per-letter glint envelope — peaks when the travelling sweep reaches letter i.
// Worklet: runs on the UI thread inside useAnimatedStyle.
function glintAt(s: number, index: number, count: number): number {
  'worklet';
  if (s <= 0 || s >= 1) return 0;
  const center = (index + 0.5) / count;
  const half = 0.34;
  const g = 1 - Math.abs(s - center) / half;
  if (g <= 0) return 0;
  return Math.sin(Math.min(g, 1) * (Math.PI / 2)) * 0.92;
}

function Letter({
  char,
  index,
  fontSize,
  boxH,
  track,
  reduceMotion,
  breath,
  sweep,
}: {
  char: string;
  index: number;
  fontSize: number;
  boxH: number;
  track: number;
  reduceMotion: boolean;
  breath: SharedValue<number>;
  sweep: SharedValue<number>;
}) {
  const enter = useSharedValue(0);
  const [w, setW] = useState(() =>
    Math.ceil((ADVANCE[char] ?? 0.5) * fontSize)
  );

  useEffect(() => {
    enter.value = withDelay(
      index * STAGGER,
      withTiming(1, {
        duration: reduceMotion ? R_ASSEMBLE_DUR : LETTER_DUR,
        easing: reduceMotion ? BREATHE : ENTER,
      })
    );
  }, [enter, index, reduceMotion]);

  const stageStyle = useAnimatedStyle(() => {
    const e = enter.value;
    if (reduceMotion) return { opacity: e };
    return {
      opacity: e,
      transform: [
        { perspective: PERSPECTIVE },
        { translateY: (1 - e) * ENTER_TY },
        { rotateX: `${-(1 - e) * ENTER_RX}deg` },
        { scale: ENTER_SCALE + (1 - ENTER_SCALE) * e },
      ],
    };
  });

  // Wide ambient shadow — atmospheric depth; its offset breathes with the word.
  const ambientStyle = useAnimatedStyle(() => ({
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 + 2 * breath.value },
  }));

  // Specular glint — the sheen glyph fades in then out as the sweep crosses.
  const sheenStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 0 };
    return { opacity: glintAt(sweep.value, index, LETTERS.length) };
  });

  const baseline = fontSize; // centers cap-height glyph within boxH (= 1.3·fontSize)
  const gid = `puraGlyph-${char}-${index}`;
  const sid = `puraSheen-${char}-${index}`;

  return (
    <Animated.View
      style={[styles.stage, { marginLeft: index === 0 ? 0 : track }, stageStyle]}
    >
      <Animated.View style={ambientStyle}>
        <View style={CONTACT}>
          <View style={styles.glyphBox}>
            {/* Invisible sizer — gives the box the glyph's exact advance width. */}
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              onLayout={(ev) => {
                const m = ev.nativeEvent.layout.width;
                if (m > 0 && Math.abs(m - w) > 0.5) setW(Math.ceil(m));
              }}
              style={[styles.sizer, { fontSize, lineHeight: boxH }]}
            >
              {char}
            </Text>
            <Svg
              style={styles.glyphSvg}
              width={w}
              height={boxH}
              pointerEvents="none"
            >
              <Defs>
                <SvgLinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={INK_TOP} />
                  <Stop offset="0.56" stopColor={INK_MID} />
                  <Stop offset="1" stopColor={INK_BOTTOM} />
                </SvgLinearGradient>
              </Defs>
              {/* Porcelain top-edge rim — sits behind, peeks above the glyph. */}
              <SvgText
                x={w / 2}
                y={baseline - 1.5}
                fontFamily={FONT}
                fontSize={fontSize}
                textAnchor="middle"
                fill={PORCELAIN}
                fillOpacity={0.5}
              >
                {char}
              </SvgText>
              <SvgText
                x={w / 2}
                y={baseline}
                fontFamily={FONT}
                fontSize={fontSize}
                textAnchor="middle"
                fill={`url(#${gid})`}
              >
                {char}
              </SvgText>
            </Svg>
            {/* Specular sheen overlay — a diagonal highlight band clipped to the
                glyph; its opacity is pulsed (see sheenStyle) to cross the word. */}
            <Animated.View
              style={[styles.glyphSvg, sheenStyle]}
              pointerEvents="none"
            >
              <Svg width={w} height={boxH}>
                <Defs>
                  <SvgLinearGradient id={sid} x1="0" y1="0" x2="1" y2="0.55">
                    <Stop offset="0.30" stopColor={SHEEN} stopOpacity={0} />
                    <Stop offset="0.50" stopColor={SHEEN} stopOpacity={0.95} />
                    <Stop offset="0.70" stopColor={SHEEN} stopOpacity={0} />
                  </SvgLinearGradient>
                </Defs>
                <SvgText
                  x={w / 2}
                  y={baseline}
                  fontFamily={FONT}
                  fontSize={fontSize}
                  textAnchor="middle"
                  fill={`url(#${sid})`}
                >
                  {char}
                </SvgText>
              </Svg>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function SplashScreen({ onReady, systemReady = true }: SplashScreenProps) {
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();

  const [phase, setPhase] = useState<'assemble' | 'hold' | 'exit'>('assemble');
  // The app mounts this splash before fonts finish loading on a cold start, and
  // react-native-svg <Text> does not reflow when a font arrives mid-render — so
  // we hold the (invisible Porcelain) frame until the serif is confirmed loaded,
  // then begin the assembly. Guarantees glyphs are never cast in fallback Times.
  const [fontReady, setFontReady] = useState(() => Font.isLoaded(FONT));
  const earliestExitRef = useRef(Date.now() + HOLD_END);
  const firedRef = useRef(false);

  const breath = useSharedValue(0);
  const exit = useSharedValue(0);
  const sweep = useSharedValue(0); // 0→1 once, drives the specular glint
  const assembled = useSharedValue(0); // 0→1 over Act 1, grounds the floor shadow

  // Bold, confident scale — the wordmark fills the frame instead of hiding in it.
  const fontSize = Math.round(Math.min(width / 390, 1) * 150);
  const boxH = Math.round(fontSize * 1.3);
  const track = -Math.round(fontSize * 0.012); // hair-tight wordmark tracking
  const wordTop = Math.round(height * 0.44 - boxH / 2);

  // Grounding contact shadow geometry.
  const floorW = Math.round(fontSize * 1.5);
  const floorH = Math.round(fontSize * 0.32);
  const floorTop = Math.round(height * 0.44 + fontSize * 0.2);

  const fire = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onReady();
  }, [onReady]);

  // Wait for the serif, but never hang on a blank frame (fonts always resolve —
  // systemReady itself depends on them; the cap is a last-resort safety net).
  useEffect(() => {
    if (fontReady) return;
    let alive = true;
    const id = setInterval(() => {
      if (alive && Font.isLoaded(FONT)) setFontReady(true);
    }, 30);
    const cap = setTimeout(() => alive && setFontReady(true), 2500);
    return () => {
      alive = false;
      clearInterval(id);
      clearTimeout(cap);
    };
  }, [fontReady]);

  // ACT 1 → ACT 2 — assembly plays, the floor grounds, then the word lands,
  // breathes, and the specular glint sweeps across once.
  useEffect(() => {
    if (!fontReady) return;
    earliestExitRef.current =
      Date.now() + (reduceMotion ? R_HOLD_END : HOLD_END);

    assembled.value = withTiming(1, {
      duration: reduceMotion ? R_ASSEMBLE_END : ASSEMBLE_END,
      easing: reduceMotion ? BREATHE : ENTER,
    });

    const landAt = reduceMotion ? R_ASSEMBLE_END : ASSEMBLE_END;
    const toHold = setTimeout(() => {
      if (!reduceMotion) {
        try {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        breath.value = withRepeat(
          withSequence(
            withTiming(1, { duration: HOLD_DUR / 2, easing: BREATHE }),
            withTiming(0, { duration: HOLD_DUR / 2, easing: BREATHE })
          ),
          -1,
          false
        );
        sweep.value = withDelay(
          SWEEP_DELAY,
          withTiming(1, { duration: SWEEP_DUR, easing: BREATHE })
        );
      }
      setPhase('hold');
    }, landAt);

    return () => clearTimeout(toHold);
  }, [fontReady, reduceMotion, breath, sweep, assembled]);

  // ACT 3 — exit once the hold has played its minimum AND the app is ready.
  useEffect(() => {
    if (phase !== 'hold' || !systemReady) return;

    const remaining = Math.max(0, earliestExitRef.current - Date.now());
    const t = setTimeout(() => {
      setPhase('exit');
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: 180, easing: BREATHE });
      exit.value = withTiming(
        1,
        {
          duration: reduceMotion ? R_EXIT_DUR : EXIT_DUR,
          easing: reduceMotion ? BREATHE : EXIT,
        },
        (done) => {
          if (done) runOnJS(fire)();
        }
      );
    }, remaining);

    return () => clearTimeout(t);
  }, [phase, systemReady, reduceMotion, breath, exit, fire]);

  const wordStyle = useAnimatedStyle(() => {
    const e = exit.value;
    if (reduceMotion) return { opacity: 1 - e };
    return {
      opacity: 1 - e,
      transform: [
        { translateY: -14 * e },
        { scale: (1 + 0.01 * breath.value) * (1 + 0.02 * e) },
      ],
    };
  });

  // Floor lands with the letters and fades out on exit.
  const floorStyle = useAnimatedStyle(() => ({
    opacity: assembled.value * (1 - exit.value),
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Animated.View
        style={[
          styles.floor,
          { top: floorTop, width: floorW, height: floorH, marginLeft: -floorW / 2 },
          floorStyle,
        ]}
        pointerEvents="none"
      >
        <Svg width={floorW} height={floorH}>
          <Defs>
            <SvgRadialGradient id="puraFloor" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={FLOOR} stopOpacity={0.22} />
              <Stop offset="0.7" stopColor={FLOOR} stopOpacity={0} />
            </SvgRadialGradient>
          </Defs>
          <Ellipse
            cx={floorW / 2}
            cy={floorH / 2}
            rx={floorW / 2}
            ry={floorH / 2}
            fill="url(#puraFloor)"
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[styles.word, { top: wordTop, height: boxH }, wordStyle]}
        pointerEvents="none"
      >
        {fontReady &&
          LETTERS.map((c, i) => (
            <Letter
              key={`${c}-${i}`}
              char={c}
              index={i}
              fontSize={fontSize}
              boxH={boxH}
              track={track}
              reduceMotion={reduceMotion}
              breath={breath}
              sweep={sweep}
            />
          ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PORCELAIN, // Porcelain from frame 0, all the way into Home
  },
  floor: {
    position: 'absolute',
    left: '50%',
  },
  word: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizer: {
    fontFamily: FONT,
    color: 'transparent',
    textAlign: 'center',
    includeFontPadding: false,
  },
  glyphSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
