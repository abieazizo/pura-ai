/**
 * RitualMode (Mode C) — the guided ritual. Orb-led, present-tense, one step at
 * a time, large and calm.
 *
 * Per step: the orb's line fades in word-by-word (55ms/word). If the product
 * needs to settle, a thin breathing ring fills (NOT a countdown) while the card
 * breathes. Advance (tap Done): the step settles (scale→0.98, opacity→0.5), a
 * checkmark DRAWS itself (320ms, a single light haptic at 180ms — the soft
 * double-tick), holds 200ms, then the next step cross-fades up as the orb's next
 * line begins. Never a hard cut.
 *
 * Completion-as-care: on meaningful steps the orb turns its gaze fully to the
 * viewer, its glow shifts cool→warm over 500ms, a benefit line fades up, then it
 * HOLDS STILL — the stillness is the reward. No confetti, points, or numbers.
 *
 * Done landing: the gradient softens, the orb gives its slowest bloom, the done
 * line fades up, ONE medium warm haptic — the only fuller beat in the ritual —
 * then a gentle cross-dissolve home as the orb shrinks to its home position.
 *
 * Flexibility: skip (the orb is unbothered), pause, end early — all graceful and
 * guilt-free. Optional voice guidance, invisible until invited.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
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
import type { VoiceGuide } from '../voiceGuidance';

type Phase = 'active' | 'completing' | 'care' | 'done';

interface RitualModeProps {
  model: YourRoutineModel;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  voice: VoiceGuide;
  /** Host shared value: 0→1 makes the gradient intensify on enter / soften on done. */
  intensify: SharedValue<number>;
  onToggleVoice: () => void;
  onFinish: () => void;
}

export function RitualMode({
  model,
  atmo,
  reduceMotion,
  voice,
  intensify,
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
  const [voiceOn, setVoiceOn] = useState(voice.isEnabled());
  const step: StepVM | undefined = steps[index];
  const isLast = index === steps.length - 1;
  const guard = useRef(false);

  const contentT = useSharedValue(0);
  const settleScale = useSharedValue(1);
  const settleOpacity = useSharedValue(1);
  const benefitT = useSharedValue(0);
  const doneT = useSharedValue(0);

  // --- Enter the ritual: orb drifts top-center + grows; gradient intensifies.
  useEffect(() => {
    orb.moveTo({ cx: width / 2, cy: insets.top + 88, size: 80 }, { spring: ORB_RITUAL_SPRING });
    orb.setExpression('attentive');
    orb.setGaze('down');
    orb.setFamiliarity(0.5);
    ritualHaptics.ritualEnter();
    if (!reduceMotion) intensify.value = withTiming(1, { duration: routineTiming.ritualEnter });
    enterStep(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enterStep(i: number, first = false) {
    setIndex(i);
    setPhase('active');
    setShowBenefit(false);
    setDrawing(false);
    benefitT.value = 0;
    settleScale.value = 1;
    settleOpacity.value = 1;
    contentT.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) contentT.value = withTiming(1, { duration: 320, easing: Easing.bezier(0.22, 1, 0.36, 1) });

    const s = steps[i];
    if (!s) return;
    orb.setGaze('down');
    orb.setExpression('attentive');
    if (!first) ritualHaptics.stepStart(s.type);
    if (s.absorbSeconds > 0) ritualHaptics.silence('absorb-wait');
    if (voice.isEnabled()) voice.speakLine(s.ritualLead);
  }

  // --- Advance: checkmark draws, step settles, then care, then next/done.
  function onDone() {
    if (phase !== 'active' || guard.current || !step) return;
    guard.current = true;
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
    // Hold 200ms after the checkmark lands, then the care beat.
    setTimeout(() => playCare(), routineTiming.stepSettleHold);
  }

  function playCare() {
    if (!step) return;
    setPhase('care');
    setShowBenefit(true);
    benefitT.value = reduceMotion ? 1 : withTiming(1, { duration: 300 });
    // Glow shifts cool→warm; the orb turns its gaze fully to the viewer.
    const meaningful = step.type === 'protect' || isLast;
    orb.setGaze('forward');
    orb.setExpression('warm');
    orb.setFamiliarity(0.9);
    const hold = meaningful ? routineTiming.careHold : 360;
    setTimeout(() => {
      guard.current = false;
      if (isLast) doneLanding();
      else enterStep(index + 1);
    }, hold);
  }

  function doneLanding() {
    setPhase('done');
    // Gradient softens; the orb gives its slowest bloom.
    if (!reduceMotion) {
      intensify.value = withTiming(0, { duration: routineTiming.doneBloomMs });
      orb.setSize(92, { duration: routineTiming.doneBloomMs / 2 });
      setTimeout(() => orb.setSize(80, { duration: routineTiming.doneBloomMs / 2 }), routineTiming.doneBloomMs / 2);
    }
    orb.setGaze('forward');
    orb.setExpression('validating');
    orb.setFamiliarity(1);
    doneT.value = reduceMotion ? 1 : withTiming(1, { duration: 500 });
    ritualHaptics.doneLanding(); // the one medium warm beat
    setTimeout(() => onFinish(), routineTiming.doneBloomMs + 200);
  }

  function onSkip() {
    if (phase !== 'active' || guard.current || !step) return;
    guard.current = true;
    // Orb is unbothered — a calm beat, no celebration.
    orb.encourage();
    setTimeout(() => {
      guard.current = false;
      if (isLast) doneLanding();
      else enterStep(index + 1);
    }, 220);
  }

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    voice.setEnabled(next);
    onToggleVoice();
    if (next && step) voice.speakLine(step.ritualLead);
  }

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentT.value * settleOpacity.value,
    transform: [{ translateY: (1 - contentT.value) * 12 }, { scale: settleScale.value }],
  }));
  const benefitStyle = useAnimatedStyle(() => ({ opacity: benefitT.value }));
  const doneStyle = useAnimatedStyle(() => ({ opacity: doneT.value }));

  if (phase === 'done') {
    return (
      <View style={[styles.fill, styles.center, { paddingTop: insets.top + 180 }]}>
        <Animated.Text style={[rType.hero, { color: atmo.ink, textAlign: 'center', paddingHorizontal: 36 }, doneStyle]}>
          {model.doneLandingLine}
        </Animated.Text>
      </View>
    );
  }

  if (!step) return <View style={styles.fill} />;

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 168 }]}>
      {/* Quiet controls — pause / skip / end / voice. Invisible until you look. */}
      <View style={[styles.controls, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => setPaused((p) => !p)} hitSlop={8} accessibilityRole="button">
          <Text style={[rType.bodySm, { color: atmo.faint }]}>{paused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
        <View style={styles.controlsRight}>
          <Pressable onPress={toggleVoice} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voice guidance">
            <Text style={[rType.bodySm, { color: voiceOn ? atmo.ink : atmo.faint }]}>Voice</Text>
          </Pressable>
          <Pressable onPress={onFinish} hitSlop={8} accessibilityRole="button" style={{ marginLeft: 18 }}>
            <Text style={[rType.bodySm, { color: atmo.faint }]}>End</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[rType.label, { color: atmo.faint }]}>
          STEP {index + 1} OF {steps.length}
        </Text>

        <Animated.View style={[{ marginTop: 18 }, contentStyle]}>
          <Text style={[rType.hero, { color: atmo.ink }]}>{step.action}</Text>
          <WordReveal
            key={`line-${index}`}
            text={step.ritualLead}
            color={atmo.muted}
            reduceMotion={reduceMotion}
            paused={paused}
          />
        </Animated.View>

        {/* Absorb — a breathing ring, never a countdown. */}
        {step.absorbSeconds > 0 && phase === 'active' && (
          <CardBreath reduceMotion={reduceMotion} style={styles.ringWrap}>
            <BreathingRing
              size={64}
              absorbSeconds={step.absorbSeconds}
              color={atmo.ink}
              trackColor={atmo.hairline}
              running={!paused}
              reduceMotion={reduceMotion}
            />
          </CardBreath>
        )}

        {/* The drawing checkmark + the completion-as-care benefit line. */}
        {(phase === 'completing' || phase === 'care') && (
          <View style={styles.checkWrap}>
            <DrawCheck
              size={40}
              color={atmo.ink}
              drawing={drawing}
              reduceMotion={reduceMotion}
              onMidDraw={() => ritualHaptics.stepComplete(step.type)}
              onDone={onCheckDrawn}
            />
            {showBenefit && (
              <Animated.Text style={[rType.throughline, { color: atmo.muted, marginTop: 16, textAlign: 'center', paddingHorizontal: 24 }, benefitStyle]}>
                {step.benefit}
              </Animated.Text>
            )}
          </View>
        )}
      </View>

      {/* Done / Skip — large, calm. */}
      {phase === 'active' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Mark this step done"
            style={({ pressed }) => [styles.done, { borderColor: atmo.hairline, backgroundColor: atmo.card, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[rType.button, { color: atmo.ink }]}>Done</Text>
          </Pressable>
          <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button" style={styles.skip}>
            <Text style={[rType.bodyMed, { color: atmo.faint }]}>Skip</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Reveals a line word-by-word at 55ms/word. Reduced motion shows it at once. */
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
  const [shown, setShown] = useState(reduceMotion ? words.length : 0);

  useEffect(() => {
    if (reduceMotion) {
      setShown(words.length);
      return;
    }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      if (paused) return;
      i += 1;
      setShown(i);
      if (i >= words.length) clearInterval(id);
    }, routineTiming.wordReveal);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reduceMotion]);

  return (
    <Text style={[rType.throughline, { color, marginTop: 14 }]}>
      {words.map((w, i) => (
        <Text key={i} style={{ opacity: i < shown ? 1 : 0 }}>
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </Text>
      ))}
    </Text>
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
  ringWrap: { marginTop: 40, alignSelf: 'flex-start' },
  checkWrap: { marginTop: 36, alignItems: 'center', alignSelf: 'stretch' },
  footer: { position: 'absolute', left: 28, right: 28, bottom: 0, alignItems: 'center' },
  done: {
    height: 56,
    alignSelf: 'stretch',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { marginTop: 16, paddingVertical: 8 },
});
