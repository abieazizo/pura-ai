/**
 * RevealMode (Mode A) — the morph. The magic moment.
 *
 * The screen-2 move CARDS exist at frame zero — real card chrome (surface,
 * hairline, the move's `why` line) drawn as a negative-inset layer so the
 * morph never animates layout. They settle into a stack (0–400ms, scale
 * 1.0 → 0.96), then each unfolds 160ms apart:
 *   • the card chrome dissolves and the `why` line hands off
 *   • the TITLE rises (+6→0) and lightens, scaling 22→24 into a section header
 *   • its steps cascade beneath — each row opacity 0→1, y +10→0 over 360ms,
 *     90ms apart, each on the arrival curve cubic-bezier(0.22, 1, 0.36, 1)
 *   • each throughline fades in 200ms AFTER its row lands
 * The orb's gaze steps DOWN the list as headers lock (a light haptic when each
 * finishes rising), its glow temperature warming move by move; one fuller beat
 * marks assembly; the "Start" CTA fades up LAST — and is untouchable +
 * invisible to screen readers until it does.
 *
 * The CTA is the ONE loud filled control in the whole experience.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { blue, neutral } from '@/theme/ds';
import { ORB_RITUAL_SPRING, routineTiming, type PeriodAtmosphere } from '@/theme/routineAtmosphere';
import { useOrb } from '@/screens/onboarding/orb/OrbHost';
import type { MoveVM, StepVM, YourRoutineModel } from '../model';
import { rType } from '../tokens';
import { ProductPick } from '../components/ProductPick';
import { Packshot } from '../components/Packshot';
import { ritualHaptics, beginHapticLog } from '../ritualHaptics';

const ARRIVE = Easing.bezier(0.22, 1, 0.36, 1);
/** One move's unfold (card chrome dissolve + title rise) — the header-lock
 *  haptic is scheduled to land exactly as this completes. */
const UNFOLD_MS = 300;

interface RevealModeProps {
  model: YourRoutineModel;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  onStart: () => void;
  onOpenBundle: () => void;
}

interface Section {
  move: MoveVM;
  /** When this move's unfold begins (card dissolves, title rises). */
  headerAt: number;
  rowStarts: number[];
}

function buildTimeline(moves: MoveVM[]): { sections: Section[]; assemblyAt: number; ctaAt: number } {
  let header: number = routineTiming.morphSettle; // unfolds begin at 400ms
  let lastQuiet = header;
  const sections = moves.map((move) => {
    const rowStarts = move.steps.map((_, j) => header + 120 + j * routineTiming.morphRowStagger);
    const lastRow = rowStarts[rowStarts.length - 1] ?? header;
    // A row LANDS at +morphRow; its throughline starts 200ms later and fades
    // for 200ms — assembly is when the last visible motion actually finishes.
    lastQuiet = Math.max(lastQuiet, lastRow + routineTiming.morphRow + routineTiming.morphThroughlineLag + 200);
    const section: Section = { move, headerAt: header, rowStarts };
    header += routineTiming.morphUnfoldGap; // next move unfolds 160ms later
    return section;
  });
  return { sections, assemblyAt: lastQuiet, ctaAt: lastQuiet + 120 };
}

export function RevealMode({ model, atmo, reduceMotion, onStart, onOpenBundle }: RevealModeProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const orb = useOrb();

  const { sections, assemblyAt, ctaAt } = useMemo(() => buildTimeline(model.moves), [model.moves]);

  const settle = useSharedValue(0); // 0→1 stack settle (scale 1→0.96)
  const ctaT = useSharedValue(0);
  // Assembly gate: rows' product invites + the CTA only become interactive
  // (and screen-reader visible) once they have actually faded up.
  const [assembled, setAssembled] = useState(reduceMotion);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    beginHapticLog();

    // The orb arrives at the reveal beat (top-center) and looks at the top of
    // the stack — its gaze will step down the list as the moves unfold.
    orb.moveTo({ cx: width / 2, cy: insets.top + 84, size: 74 }, { spring: ORB_RITUAL_SPRING });
    orb.setExpression('warm');
    orb.gazeTo(0, 0.3);
    orb.setGlowTemperature(0.15, 400);
    ritualHaptics.revealEnter();

    if (reduceMotion) {
      settle.value = 1;
      ctaT.value = 1;
      // Content snaps complete; the haptic story is logged, but only the one
      // fuller assembly beat fires physically — never a machine-gun burst.
      sections.forEach((s) => ritualHaptics.headerLock(s.move.title, { physical: false }));
      ritualHaptics.assemblyDone();
      orb.gazeTo(0, 0);
      orb.setExpression('validating');
      orb.setGlowTemperature(0.85, 0);
      return;
    }

    settle.value = withTiming(1, { duration: routineTiming.morphSettle, easing: ARRIVE });
    ctaT.value = withDelay(ctaAt, withTiming(1, { duration: routineTiming.morphCtaFade, easing: ARRIVE }));

    const timers: ReturnType<typeof setTimeout>[] = [];
    // Header locks — the light haptic lands exactly when the title FINISHES
    // rising (the unfold runs UNFOLD_MS); the orb's gaze steps further down
    // the list and its glow warms a notch.
    sections.forEach((s, i) => {
      timers.push(
        setTimeout(() => {
          ritualHaptics.headerLock(s.move.title);
          orb.gazeTo(0, 0.35 + (0.65 * (i + 1)) / sections.length);
          orb.blinkNow();
          orb.setGlowTemperature(0.15 + (0.6 * (i + 1)) / sections.length, 360);
        }, s.headerAt + UNFOLD_MS),
      );
    });
    // Assembly — the fuller beat; the orb lifts its gaze to the viewer, warm.
    timers.push(
      setTimeout(() => {
        ritualHaptics.assemblyDone();
        orb.gazeTo(0, 0);
        orb.setExpression('validating');
        orb.setGlowTemperature(0.85, 600);
        orb.emphasisPulse();
      }, assemblyAt),
    );
    // Interactivity opens only once the CTA has actually FADED UP — an
    // invisible-but-tappable control is a lie to both fingers and VoiceOver.
    timers.push(setTimeout(() => setAssembled(true), ctaAt + routineTiming.morphCtaFade));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stackStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(settle.value, [0, 1], [1, 0.96]) }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaT.value,
    transform: [{ translateY: interpolate(ctaT.value, [0, 1], [10, 0]) }],
  }));

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 150 }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* The first-reveal line — the opening of the letter. */}
        <Text style={[rType.letter, { color: atmo.ink }]} maxFontSizeMultiplier={1.3}>
          {model.firstReveal}
        </Text>
        <Text style={[rType.throughline, { color: atmo.muted, marginTop: 12 }]} maxFontSizeMultiplier={1.3}>
          {model.productFree}
        </Text>

        <Animated.View style={[{ marginTop: 30 }, stackStyle]}>
          {sections.map((s, i) => (
            <MoveSection
              key={s.move.id}
              section={s}
              atmo={atmo}
              reduceMotion={reduceMotion}
              assembled={assembled}
              last={i === sections.length - 1}
            />
          ))}
        </Animated.View>
      </ScrollView>

      {/* Footer: the one loud control + the honest bundle invite. Untouchable
          and hidden from assistive tech until it has faded up. */}
      <Animated.View
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }, ctaStyle]}
        pointerEvents={assembled ? 'box-none' : 'none'}
        accessibilityElementsHidden={!assembled}
        importantForAccessibility={assembled ? 'auto' : 'no-hide-descendants'}
      >
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={model.focus.ctaLabel}
          style={({ pressed }) => [styles.cta, { backgroundColor: blue[500], opacity: pressed ? 0.9 : 1 }]}
        >
          <Text style={[rType.button, { color: neutral[0] }]} maxFontSizeMultiplier={1.1}>
            {model.focus.ctaLabel}
          </Text>
        </Pressable>
        {model.commerce.anyPicks && (
          <Pressable onPress={onOpenBundle} hitSlop={8} accessibilityRole="button" style={styles.bundleLink}>
            <Text style={[rType.bodySm, { color: atmo.muted, textDecorationLine: 'underline' }]} maxFontSizeMultiplier={1.3}>
              Here's everything for your routine
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * One move: a real card at frame zero, a section header after. The chrome is a
 * negative-inset absolute layer, so its dissolve costs zero layout — the title
 * never moves horizontally, it only rises and grows into the header.
 */
function MoveSection({
  section,
  atmo,
  reduceMotion,
  assembled,
  last,
}: {
  section: Section;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  assembled: boolean;
  last: boolean;
}) {
  const unfold = useSharedValue(reduceMotion ? 1 : 0); // 0 = card, 1 = header

  useEffect(() => {
    if (reduceMotion) return;
    unfold.value = withDelay(
      section.headerAt,
      withTiming(1, { duration: UNFOLD_MS, easing: ARRIVE }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Card chrome — present, then gone.
  const chromeStyle = useAnimatedStyle(() => ({ opacity: 1 - unfold.value }));
  // The why line hands off to the real steps.
  const whyStyle = useAnimatedStyle(() => ({ opacity: 1 - unfold.value }));
  // Title rises + lightens + grows (22 → 24 via transform; no layout change).
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(unfold.value, [0, 1], [1, 0.88]),
    transform: [
      { translateY: interpolate(unfold.value, [0, 1], [6, 0]) },
      { scale: interpolate(unfold.value, [0, 1], [1, 24 / 22]) },
    ],
  }));

  return (
    <View style={{ marginBottom: last ? 8 : 30 }}>
      <View>
        {/* The screen-2 card surface, drawn outside the text's layout box. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cardChrome,
            { backgroundColor: atmo.card, borderColor: atmo.hairline },
            chromeStyle,
          ]}
        />
        <Animated.Text
          style={[rType.moveTitle, { color: atmo.ink, transformOrigin: 'left center' }, titleStyle]}
          maxFontSizeMultiplier={1.3}
        >
          {section.move.title}
        </Animated.Text>
        <Animated.Text
          style={[rType.body, { color: atmo.muted, marginTop: 4 }, whyStyle]}
          maxFontSizeMultiplier={1.3}
        >
          {section.move.why}
        </Animated.Text>
      </View>

      <View style={{ marginTop: 10 }}>
        {section.move.steps.map((step, j) => (
          <CascadeRow
            key={step.id}
            step={step}
            startAt={section.rowStarts[j]}
            atmo={atmo}
            reduceMotion={reduceMotion}
            assembled={assembled}
          />
        ))}
      </View>
    </View>
  );
}

/** One step row cascading in: action + AM/PM tag, then its throughline 200ms
 *  after the row lands, then (quietly) the optional product invite. */
function CascadeRow({
  step,
  startAt,
  atmo,
  reduceMotion,
  assembled,
}: {
  step: StepVM;
  startAt: number;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  assembled: boolean;
}) {
  const row = useSharedValue(reduceMotion ? 1 : 0);
  const tl = useSharedValue(reduceMotion ? 1 : 0);
  const [revealPick, setRevealPick] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    row.value = withDelay(startAt, withTiming(1, { duration: routineTiming.morphRow, easing: ARRIVE }));
    tl.value = withDelay(
      startAt + routineTiming.morphRow + routineTiming.morphThroughlineLag,
      withTiming(1, { duration: 200, easing: ARRIVE }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: row.value,
    transform: [{ translateY: interpolate(row.value, [0, 1], [10, 0]) }],
  }));
  const tlStyle = useAnimatedStyle(() => ({ opacity: tl.value }));

  const pick = step.product.pick;
  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={styles.rowHead}>
        <View style={{ flex: 1 }}>
          <Text style={[rType.body, { color: atmo.ink }]} maxFontSizeMultiplier={1.3}>
            {step.action}
          </Text>
          <Animated.View style={tlStyle}>
            <Text style={[rType.throughline, { color: atmo.muted, marginTop: 6 }]} maxFontSizeMultiplier={1.3}>
              {step.throughline}
            </Text>
          </Animated.View>
        </View>
        <View style={styles.rowSide}>
          <Text style={[rType.labelSm, { color: atmo.faint }]} maxFontSizeMultiplier={1.2}>
            {step.timeOfDay === 'morning' ? 'AM' : 'PM'}
          </Text>
          {/* The actual product, arriving with its throughline. */}
          {pick && !revealPick && (
            <Animated.View style={[tlStyle, { marginTop: 8 }]}>
              <Pressable
                onPress={() => setRevealPick(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`See my pick for this step: ${pick.name}`}
                disabled={!assembled}
                accessibilityElementsHidden={!assembled}
                importantForAccessibility={assembled ? 'auto' : 'no-hide-descendants'}
              >
                <Packshot pick={pick} size={44} atmo={atmo} radius={10} />
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>
      <Animated.View style={tlStyle}>
        {/* Commerce as care — invited, never pushed, and only once assembled. */}
        {pick && !revealPick && (
          <Pressable
            onPress={() => setRevealPick(true)}
            hitSlop={8}
            accessibilityRole="button"
            disabled={!assembled}
            accessibilityElementsHidden={!assembled}
            importantForAccessibility={assembled ? 'auto' : 'no-hide-descendants'}
            style={styles.askPick}
          >
            <Text style={[rType.bodySm, { color: atmo.muted, textDecorationLine: 'underline' }]} maxFontSizeMultiplier={1.3}>
              Want my pick for this?
            </Text>
          </Pressable>
        )}
        {pick && revealPick && (
          <View style={{ marginTop: 12 }}>
            <ProductPick pick={pick} atmo={atmo} />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cardChrome: {
    position: 'absolute',
    left: -20,
    right: -20,
    top: -16,
    bottom: -14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { paddingVertical: 12 },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start' },
  rowSide: { marginLeft: 12, alignItems: 'flex-end' },
  askPick: { marginTop: 10, alignSelf: 'flex-start' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0, alignItems: 'center' },
  cta: {
    minHeight: 56,
    paddingVertical: 16,
    alignSelf: 'stretch',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bundleLink: { marginTop: 16, paddingVertical: 6 },
});
