/**
 * RitualMode (Mode C) — the guided ritual. Orb-led, present-tense, one step at
 * a time, large and calm.
 *
 * Per step: the orb's line fades in word-by-word (55ms/word, each word a real
 * 150ms fade on the UI thread — pausable). If the product needs to settle, a
 * thin breathing ring fills (NOT a countdown) while the step itself breathes
 * (scale 1.0→1.012→1.0 over 4s). Advance (tap Done): the first light tick
 * fires, the step settles (scale→0.98, opacity→0.5), a checkmark DRAWS itself
 * (320ms) with the double-tick's second light landing mid-draw (~180ms), holds
 * 200ms, then the outgoing step cross-fades down as the next fades up — never
 * a hard cut.
 *
 * Completion-as-care plays on MEANINGFUL steps only (the SPF, the last step,
 * the step carrying the primary finding): the orb turns its gaze fully to the
 * viewer, its glow temperature shifts cool→warm over 500ms, one benefit line
 * fades up, then it HOLDS STILL — the stillness is the reward. No confetti,
 * points, or numbers. The glow re-cools as each next step begins, so every
 * care beat has somewhere to come from.
 *
 * Done landing: the gradient softens, the orb gives its slowest true glow
 * bloom (1.0→1.15→1.0 over 1.2s), the done line fades up, ONE medium warm
 * haptic — the only fuller beat in the ritual — then a gentle cross-dissolve
 * home as the orb shrinks to its home position.
 *
 * Flexibility, all in the orb's voice: skip ("I'm not your mother"), pause
 * ("No rush - I'll wait", the orb waiting WITH you), end early ("What you did
 * still counts" — and ONLY what was done counts as done). Optional voice
 * guidance, invisible until invited.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ORB_RITUAL_SPRING, routineTiming, type PeriodAtmosphere } from '@/theme/routineAtmosphere';
import { useOrb } from '@/screens/onboarding/orb/OrbHost';
import type { StepVM, YourRoutineModel } from '../model';
import { rType } from '../tokens';
import { ritualHaptics } from '../ritualHaptics';
import { BreathingRing, CardBreath } from '../components/BreathingRing';
import { DrawCheck } from '../components/DrawCheck';
import { Packshot } from '../components/Packshot';
import { VOICE } from '../voice';
import type { VoiceGuide } from '../voiceGuidance';

const ARRIVE = Easing.bezier(0.22, 1, 0.36, 1);

type Phase = 'active' | 'completing' | 'care' | 'skipping' | 'ending' | 'done';

interface RitualModeProps {
  model: YourRoutineModel;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  voice: VoiceGuide;
  /** Host shared value: 0→1 makes the gradient intensify on enter / soften on done. */
  intensify: SharedValue<number>;
  /** The orb's resting size in the mode we entered from (home 60 / reveal 74) —
   *  the ritual grows it ~10% from THERE, per the frame spec. */
  orbBaseSize: number;
  onToggleVoice: () => void;
  /** Ritual over — `completedStepIds` holds ONLY the steps actually marked
   *  done (skips and early-end leftovers are not claimed). */
  onFinish: (completedStepIds: string[]) => void;
}

export function RitualMode({
  model,
  atmo,
  reduceMotion,
  voice,
  intensify,
  orbBaseSize,
  onToggleVoice,
  onFinish,
}: RitualModeProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const orb = useOrb();

  const steps = model.ritualSteps;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('active');
  const [drawing, setDrawing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showBenefit, setShowBenefit] = useState(false);
  const [skipLine, setSkipLine] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(voice.isEnabled());
  const step: StepVM | undefined = steps[index];
  const isLast = index === steps.length - 1;
  const guard = useRef(false);
  const doneIds = useRef<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);
  // Once the user ends early, no in-flight advance/care/landing may clobber
  // the ended-early beat (a check-draw completion arrives via runOnJS, not a
  // timer, so clearing timers alone is not enough).
  const ended = useRef(false);

  const contentT = useSharedValue(0); // incoming fade
  const outT = useSharedValue(1); // outgoing cross-fade (whole step block)
  const settleScale = useSharedValue(1);
  const settleOpacity = useSharedValue(1);
  const benefitT = useSharedValue(0);
  const doneT = useSharedValue(0);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      if (alive.current) fn();
    }, ms);
    timers.current.push(t);
  };

  // --- Enter: orb drifts top-center and grows ~10% from its prior resting
  //     size; the gradient intensifies slightly; glow starts cool.
  useEffect(() => {
    orb.moveTo(
      { cx: width / 2, cy: insets.top + 88, size: Math.round(orbBaseSize * 1.1) },
      { spring: ORB_RITUAL_SPRING },
    );
    orb.setExpression('attentive');
    orb.setGlowTemperature(0.3, 600);
    ritualHaptics.ritualEnter();
    if (!reduceMotion) intensify.value = withTiming(1, { duration: routineTiming.ritualEnter });
    enterStep(0, true);
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
      voice.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enterStep(i: number, first = false) {
    setIndex(i);
    setPhase('active');
    setShowBenefit(false);
    setDrawing(false);
    setSkipLine(null);
    benefitT.value = 0;
    settleScale.value = 1;
    settleOpacity.value = 1;
    outT.value = 1;
    contentT.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) contentT.value = withTiming(1, { duration: 320, easing: ARRIVE });

    const s = steps[i];
    if (!s) return;
    // The orb takes the step: gaze drops to it, a small blink, glow re-cools so
    // the next care beat has a cool baseline to warm from.
    orb.setGaze('down');
    orb.setExpression('attentive');
    orb.blinkNow();
    orb.setGlowTemperature(0.3, 400);
    if (!first) ritualHaptics.stepStart(s.type);
    if (s.absorbSeconds > 0) ritualHaptics.silence('absorb-wait');
    if (voice.isEnabled()) voice.speakLine(s.ritualLead);
    AccessibilityInfo.announceForAccessibility(
      `Step ${i + 1} of ${steps.length}. ${s.action}`,
    );
  }

  /** Fade the whole outgoing step block, then hand over. Never a hard cut. */
  function crossFadeThen(next: () => void) {
    if (reduceMotion) {
      next();
      return;
    }
    outT.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) });
    later(next, 190);
  }

  function advance() {
    if (ended.current) return;
    guard.current = false;
    if (isLast) doneLanding();
    else crossFadeThen(() => enterStep(index + 1));
  }

  // --- Advance: first tick on the tap, settle, the check draws (second tick
  //     mid-draw), hold, then care (meaningful) or straight on.
  function onDone() {
    if (phase !== 'active' || guard.current || !step) return;
    guard.current = true;
    doneIds.current.push(step.id);
    ritualHaptics.stepComplete(step.type); // double-tick, first light
    setPhase('completing');
    setDrawing(true);
    if (!reduceMotion) {
      settleScale.value = withTiming(0.98, { duration: routineTiming.checkDraw });
      settleOpacity.value = withTiming(0.5, { duration: routineTiming.checkDraw });
    } else {
      settleScale.value = 0.98;
      settleOpacity.value = 0.5;
    }
  }

  function onCheckDrawn() {
    if (ended.current) return;
    // Hold 200ms after the checkmark lands, then care — or straight on.
    later(() => {
      if (!step || ended.current) return;
      const meaningful = step.meaningful || isLast;
      if (meaningful) playCare();
      else advance();
    }, routineTiming.stepSettleHold);
  }

  function playCare() {
    if (!step) return;
    setPhase('care');
    setShowBenefit(true);
    benefitT.value = reduceMotion ? 1 : withTiming(1, { duration: 300, easing: ARRIVE });
    // The orb turns its gaze fully to the viewer; glow cool→warm over 500ms.
    orb.setGaze('forward');
    orb.setExpression('warm');
    orb.setGlowTemperature(1, routineTiming.careGlow);
    if (voice.isEnabled()) voice.speakLine(step.benefit);
    // The benefit lands (300ms), then the orb HOLDS STILL — the reward.
    later(advance, 300 + routineTiming.careHold);
  }

  function doneLanding() {
    if (ended.current) return;
    setPhase('done');
    // Gradient softens; the orb gives its slowest true glow bloom, fully warm.
    if (!reduceMotion) intensify.value = withTiming(0, { duration: routineTiming.doneBloomMs });
    orb.bloomOnce({ peak: 1.15, ms: routineTiming.doneBloomMs });
    orb.setGaze('forward');
    orb.setExpression('validating');
    orb.setGlowTemperature(1, 600);
    doneT.value = reduceMotion ? 1 : withTiming(1, { duration: 500, easing: ARRIVE });
    ritualHaptics.doneLanding(); // the one medium warm beat
    if (voice.isEnabled()) voice.speakLine(model.doneLandingLine);
    AccessibilityInfo.announceForAccessibility(model.doneLandingLine);
    later(() => onFinish(doneIds.current.slice()), reduceMotion ? 700 : routineTiming.doneBloomMs + 900);
  }

  function onSkip() {
    if (phase !== 'active' || guard.current || !step) return;
    guard.current = true;
    setPhase('skipping');
    // The orb is unbothered — and says so, in its own voice.
    const line = step.type === 'protect' ? VOICE.skipSpf : VOICE.skipGeneric;
    setSkipLine(line);
    if (voice.isEnabled()) voice.speakLine(line);
    AccessibilityInfo.announceForAccessibility(line);
    orb.encourage();
    later(advance, reduceMotion ? 900 : 1400);
  }

  function togglePause() {
    const next = !paused;
    setPaused(next);
    if (next) {
      // The orb waits WITH you; speech stops; the wait is silent by design.
      orb.setPatient(true);
      voice.stop();
      ritualHaptics.silence('paused');
    } else {
      orb.setPatient(false);
      orb.setGaze('down');
    }
  }

  function onEndEarly() {
    if (phase === 'done' || phase === 'ending') return;
    // Cancel everything in flight — the ended-early beat must not be clobbered
    // by a pending advance, care hold, or landing.
    ended.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    voice.stop();
    setPhase('ending');
    orb.setGaze('forward');
    orb.setExpression('reassuring');
    orb.setGlowTemperature(0.5, 400);
    if (!reduceMotion) intensify.value = withTiming(0, { duration: routineTiming.homeDissolve });
    doneT.value = reduceMotion ? 1 : withTiming(1, { duration: 400, easing: ARRIVE });
    AccessibilityInfo.announceForAccessibility(VOICE.endedEarly);
    later(() => onFinish(doneIds.current.slice()), reduceMotion ? 700 : 1100);
  }

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    voice.setEnabled(next);
    onToggleVoice();
    if (next && step) voice.speakLine(step.ritualLead);
  }

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentT.value * settleOpacity.value * outT.value,
    transform: [{ translateY: (1 - contentT.value) * 12 }, { scale: settleScale.value }],
  }));
  const blockOutStyle = useAnimatedStyle(() => ({ opacity: outT.value }));
  const benefitStyle = useAnimatedStyle(() => ({ opacity: benefitT.value }));
  const doneStyle = useAnimatedStyle(() => ({ opacity: doneT.value }));

  // --- Landings (done / ended-early) — one quiet line, nothing else.
  if (phase === 'done' || phase === 'ending') {
    return (
      <View style={[styles.fill, styles.center, { paddingTop: insets.top + 180 }]}>
        <Animated.Text
          style={[rType.hero, { color: atmo.ink, textAlign: 'center', paddingHorizontal: 36 }, doneStyle]}
          maxFontSizeMultiplier={1.3}
        >
          {phase === 'done' ? model.doneLandingLine : VOICE.endedEarly}
        </Animated.Text>
      </View>
    );
  }

  if (!step) return <View style={styles.fill} />;

  const absorbing = step.absorbSeconds > 0 && phase === 'active';

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 168 }]}>
      {/* Quiet controls — pause / voice / end. Invisible until you look. */}
      <View style={[styles.controls, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={togglePause}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ selected: paused }}
        >
          <Text style={[rType.bodySm, { color: atmo.faint }]} maxFontSizeMultiplier={1.3}>
            {paused ? 'Resume' : 'Pause'}
          </Text>
        </Pressable>
        <View style={styles.controlsRight}>
          <Pressable
            onPress={toggleVoice}
            hitSlop={8}
            accessibilityRole="switch"
            accessibilityLabel="Voice guidance"
            accessibilityState={{ checked: voiceOn }}
          >
            <Text style={[rType.bodySm, { color: voiceOn ? atmo.ink : atmo.faint }]} maxFontSizeMultiplier={1.3}>
              Voice
            </Text>
          </Pressable>
          <Pressable
            onPress={onEndEarly}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="End the ritual early"
            style={{ marginLeft: 18 }}
          >
            <Text style={[rType.bodySm, { color: atmo.faint }]} maxFontSizeMultiplier={1.3}>
              End
            </Text>
          </Pressable>
        </View>
      </View>

      <Animated.View style={[styles.body, blockOutStyle]}>
        <Text style={[rType.label, { color: atmo.faint }]} maxFontSizeMultiplier={1.2}>
          STEP {index + 1} OF {steps.length}
        </Text>

        {/* While the product settles, the whole step breathes (1.0→1.012/4s). */}
        <CardBreath reduceMotion={reduceMotion || !absorbing} style={{ marginTop: 18 }}>
          <Animated.View style={contentStyle}>
            <Text style={[rType.hero, { color: atmo.ink }]} maxFontSizeMultiplier={1.3}>
              {step.action}
            </Text>
            <WordReveal
              key={`line-${index}`}
              text={step.ritualLead}
              color={atmo.muted}
              reduceMotion={reduceMotion}
              paused={paused}
            />
            {paused && (
              <Text style={[rType.throughline, { color: atmo.faint, marginTop: 10 }]} maxFontSizeMultiplier={1.3}>
                {VOICE.paused}
              </Text>
            )}

            {/* The actual bottle for this step — in hand, no guessing. */}
            {step.product.pick && (
              <View style={styles.productRow}>
                <Packshot pick={step.product.pick} size={56} atmo={atmo} />
                <View style={styles.productText}>
                  <Text style={[rType.labelSm, { color: atmo.faint }]} maxFontSizeMultiplier={1.2}>
                    {step.product.pick.brand}
                  </Text>
                  <Text style={[rType.bodySm, { color: atmo.muted, marginTop: 2 }]} maxFontSizeMultiplier={1.3}>
                    {step.product.pick.name}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Absorb — a breathing ring, never a countdown. */}
          {absorbing && (
            <View
              style={styles.ringWrap}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Letting it settle — about ${step.absorbSeconds} seconds`}
            >
              <BreathingRing
                size={64}
                absorbSeconds={step.absorbSeconds}
                color={atmo.ink}
                trackColor={atmo.hairline}
                running={!paused}
                reduceMotion={reduceMotion}
              />
            </View>
          )}
        </CardBreath>

        {/* The skip beat — the orb, unbothered. */}
        {phase === 'skipping' && skipLine && (
          <Text
            style={[rType.throughline, { color: atmo.muted, marginTop: 28 }]}
            maxFontSizeMultiplier={1.3}
            accessibilityLiveRegion="polite"
          >
            {skipLine}
          </Text>
        )}

        {/* The drawing checkmark + the completion-as-care benefit line. */}
        {(phase === 'completing' || phase === 'care') && (
          <View style={styles.checkWrap}>
            <DrawCheck
              size={40}
              color={atmo.ink}
              drawing={drawing}
              reduceMotion={reduceMotion}
              // Under reduce-motion the draw is instant — both ticks would land
              // in the same frame, so the second stays silent (one clean tap).
              onMidDraw={() => {
                if (!reduceMotion) ritualHaptics.stepCompleteMidDraw();
              }}
              onDone={onCheckDrawn}
            />
            {showBenefit && (
              <Animated.Text
                style={[rType.throughline, { color: atmo.muted, marginTop: 16, textAlign: 'center', paddingHorizontal: 24 }, benefitStyle]}
                maxFontSizeMultiplier={1.3}
                accessibilityLiveRegion="polite"
              >
                {step.benefit}
              </Animated.Text>
            )}
          </View>
        )}
      </Animated.View>

      {/* Done / Skip — large, calm. */}
      {phase === 'active' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Mark this step done"
            style={({ pressed }) => [styles.done, { borderColor: atmo.hairline, backgroundColor: atmo.card, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[rType.button, { color: atmo.ink }]} maxFontSizeMultiplier={1.1}>
              Done
            </Text>
          </Pressable>
          <Pressable
            onPress={onSkip}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Skip this step"
            style={styles.skip}
          >
            <Text style={[rType.bodyMed, { color: atmo.faint }]} maxFontSizeMultiplier={1.3}>
              Skip
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * The orb's line, fading in word-by-word: each word STARTS 55ms after the
 * previous and FADES over 150ms — all on the UI thread via one progress shared
 * value, so Pause genuinely freezes it mid-word and Resume continues. Reduced
 * motion shows the line whole. The full text reads as one accessible label.
 */
function WordReveal({
  text,
  color,
  reduceMotion,
  paused,
}: {
  text: string;
  color: string;
  reduceMotion: boolean;
  paused: boolean;
}) {
  const words = text.split(' ');
  const totalMs = words.length * routineTiming.wordReveal + 150;
  const p = useSharedValue(reduceMotion ? 1 : 0); // 0→1 across totalMs, linear

  useEffect(() => {
    if (reduceMotion) {
      p.value = 1;
      return;
    }
    p.value = 0;
    p.value = withTiming(1, { duration: totalMs, easing: Easing.linear });
    return () => cancelAnimation(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (paused) {
      cancelAnimation(p);
    } else if (p.value < 1) {
      p.value = withTiming(1, { duration: Math.max(60, (1 - p.value) * totalMs), easing: Easing.linear });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <Text
      style={[rType.throughline, { color, marginTop: 14 }]}
      accessible
      accessibilityLabel={text}
      maxFontSizeMultiplier={1.3}
    >
      {words.map((w, i) => (
        <Word key={i} p={p} index={i} totalMs={totalMs} last={i === words.length - 1}>
          {w}
        </Word>
      ))}
    </Text>
  );
}

function Word({
  p,
  index,
  totalMs,
  last,
  children,
}: {
  p: SharedValue<number>;
  index: number;
  totalMs: number;
  last: boolean;
  children: string;
}) {
  const style = useAnimatedStyle(() => {
    const elapsed = p.value * totalMs;
    const local = (elapsed - index * routineTiming.wordReveal) / 150;
    return { opacity: Math.max(0, Math.min(1, local)) };
  });
  return (
    <Animated.Text style={style} importantForAccessibility="no">
      {children}
      {last ? '' : ' '}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center' },
  controls: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlsRight: { flexDirection: 'row', alignItems: 'center' },
  body: { paddingHorizontal: 28, flex: 1 },
  productRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },
  productText: { flex: 1 },
  ringWrap: { marginTop: 40, alignSelf: 'flex-start' },
  checkWrap: { marginTop: 36, alignItems: 'center', alignSelf: 'stretch' },
  footer: { position: 'absolute', left: 28, right: 28, bottom: 0, alignItems: 'center' },
  done: {
    minHeight: 56,
    paddingVertical: 16,
    alignSelf: 'stretch',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { marginTop: 16, paddingVertical: 8 },
});
