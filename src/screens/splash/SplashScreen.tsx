import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
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
 * Three acts over 3000ms on one unbroken Porcelain (#FCFDFF) canvas:
 *   ACT 1 (0–1100ms)   ASSEMBLY. Each letter of "Pura" arrives from depth —
 *                      from below, tilted back, behind the screen plane — and
 *                      settles on Apple's decelerate curve. Letters stagger
 *                      60ms apart, so the word feels assembled, not faded. A
 *                      single Light haptic fires the instant the word lands.
 *   ACT 2 (1100–2200)  HOLD. The wordmark breathes — a 1.5% scale pulse with a
 *                      synced ambient-shadow shift — so it reads as a material
 *                      object, not a frozen frame. A slow `systemReady` simply
 *                      extends this breathing hold; nothing ever spins.
 *   ACT 3 (2200–3000)  EXIT. The word drifts up 12px, scales up 2%, and fades
 *                      to zero. onReady() fires on the clean Porcelain frame, so
 *                      Home (the same canvas) takes over on an invisible seam.
 *
 * Depth is faked, not rendered (no Three.js). Per-letter `perspective` +
 * `rotateX` sell the 3D tilt. React Native's transform array has no
 * `translateZ`, so the "behind the plane" recession is carried by scale
 * (0.90 → 1.0) — the apparent size change a true z-translation would produce
 * under perspective:1200.
 *
 * Each glyph is an SVG <Text> with a vertical Ink→warm gradient fill and a 1px
 * Porcelain top-edge highlight (the "glass" tell), wrapped in two shadow Views:
 * a tight contact shadow and a wide ambient one. Layered, not a single drop.
 *
 * Reduce Motion: assembly becomes a staggered opacity fade (no perspective, no
 * tilt, no recession); the hold sits perfectly still; exit is a plain fade; no
 * haptic.
 *
 * Contract (unchanged): mounts at app root; calls onReady() exactly once when
 * the ceremony has played its minimum AND `systemReady` is true.
 */

export interface SplashScreenProps {
  onReady: () => void;
  systemReady?: boolean;
}

const PORCELAIN = palette.bg; // #FCFDFF — identical to Home's canvas
const INK_TOP = '#080A0F'; // gradient head (Ink)
const INK_BOTTOM = '#1A1417'; // gradient foot (warmer near-black)
const LETTERS = ['P', 'u', 'r', 'a'] as const;
const FONT = 'InstrumentSerif-Regular';

// Timeline (ms) — full-motion path.
const STAGGER = 60;
const LETTER_DUR = 900;
const ASSEMBLE_END = 1100;
const HOLD_END = 2200;
const HOLD_DUR = HOLD_END - ASSEMBLE_END;
const EXIT_DUR = 800;

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
const ENTER_TY = 24; // px below final
const ENTER_RX = 20; // deg tilted forward
const ENTER_SCALE = 0.9; // ≈ translateZ -120 under perspective:1200

// Approx glyph advance (em) so each SVG box can paint on frame 1, before the
// transparent sizer's onLayout reports the exact advance width.
const ADVANCE: Record<string, number> = { P: 0.56, u: 0.5, r: 0.4, a: 0.5 };

// Tight contact shadow — letters resting on a surface.
const CONTACT = {
  shadowColor: '#000000',
  shadowOpacity: 0.08,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
} as const;

function Letter({
  char,
  index,
  fontSize,
  boxH,
  track,
  reduceMotion,
  breath,
}: {
  char: string;
  index: number;
  fontSize: number;
  boxH: number;
  track: number;
  reduceMotion: boolean;
  breath: SharedValue<number>;
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
    shadowOpacity: 0.04,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 + 2 * breath.value },
  }));

  const baseline = fontSize; // centers cap-height glyph within boxH (= 1.3·fontSize)
  const gid = `puraGlyph-${char}-${index}`;

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
                  <Stop offset="1" stopColor={INK_BOTTOM} />
                </SvgLinearGradient>
              </Defs>
              {/* 1px Porcelain top-edge highlight — sits behind, peeks above. */}
              <SvgText
                x={w / 2}
                y={baseline - 1}
                fontFamily={FONT}
                fontSize={fontSize}
                textAnchor="middle"
                fill={PORCELAIN}
                fillOpacity={0.08}
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

  const fontSize = Math.round(Math.min(width / 390, 1.1) * 88);
  const boxH = Math.round(fontSize * 1.3);
  const track = -Math.round(fontSize * 0.012); // hair-tight wordmark tracking
  const wordTop = Math.round(height * 0.44 - boxH / 2);

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

  // ACT 1 → ACT 2 — assembly plays, then the word lands and begins to breathe.
  useEffect(() => {
    if (!fontReady) return;
    earliestExitRef.current =
      Date.now() + (reduceMotion ? R_HOLD_END : HOLD_END);

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
      }
      setPhase('hold');
    }, landAt);

    return () => clearTimeout(toHold);
  }, [fontReady, reduceMotion, breath]);

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
        { translateY: -12 * e },
        { scale: (1 + 0.015 * breath.value) * (1 + 0.02 * e) },
      ],
    };
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
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
