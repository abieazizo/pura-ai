/**
 * AssistantConsultation — v29 private-consultation rebuild.
 *
 * Replaces the v26.4 chat-feed AI Assist. Per the v29 spec, AI Assist
 * is "a private consultation where the answer becomes the screen" and
 * MUST NOT look like a chat feed.
 *
 * States:
 *   landing   → consultation marker + editorial question rows +
 *               observation contour + composer
 *   reviewing → "YOU ASKED" record + reviewing scan stroke on contour
 *   verdict   → unboxed "Not tonight." verdict + reasoning trace +
 *               minimal ritual path + primary CTA
 *   plan      → "Treat one area. Leave the rest calm." + observation
 *               contour + numbered ritual steps with FOCUS STEP
 *   change    → routine-change explanation with before/tonight paths
 *   noscan    → "Start with tonight's check-in." entry
 *
 * All copy is exact per the spec. No suggestion-chip carousel above
 * the composer during an active answer. No giant default bordered
 * card. The verdict sits directly on the canvas.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { ArrowUp, CaretLeft, CaretRight } from 'phosphor-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import { puraColors, puraSpace, puraType } from '@/design/puraTokens';
import { hapt } from '@/utils/haptics';
import { useTonightObservation } from '@/state/tonightObservation';
import { ScanConcernContour } from '@/components/observation/ScanConcernContour';

type ConsultationView =
  | { kind: 'landing' }
  | { kind: 'reviewing'; question: string; intent: ConsultationIntent }
  | { kind: 'verdict-serum'; question: string }
  | { kind: 'plan-breakout'; question: string }
  | { kind: 'change-routine'; question: string }
  | { kind: 'no-scan' };

type ConsultationIntent = 'serum_verdict' | 'breakout_plan' | 'routine_reason';

export function AssistantConsultation() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NavigationProp<any>>();
  const observation = useTonightObservation();

  const initialView: ConsultationView = observation.scanCompleted
    ? { kind: 'landing' }
    : { kind: 'no-scan' };
  const [view, setView] = useState<ConsultationView>(initialView);
  const [history, setHistory] = useState<
    Array<{ question: string; summary: string; intent: ConsultationIntent }>
  >([]);

  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // If the user's scan state changes (e.g. a scan completes while we're
  // here), keep the screen consistent.
  useEffect(() => {
    if (!observation.scanCompleted && view.kind !== 'no-scan') {
      setView({ kind: 'no-scan' });
    }
    if (observation.scanCompleted && view.kind === 'no-scan') {
      setView({ kind: 'landing' });
    }
  }, [observation.scanCompleted, view.kind]);

  const beginConsultation = useCallback((intent: ConsultationIntent) => {
    hapt.select();
    const question =
      intent === 'serum_verdict'
        ? 'Can I use my serum tonight?'
        : intent === 'breakout_plan'
        ? 'What should I do about this breakout?'
        : 'Why did my routine change?';
    setView({ kind: 'reviewing', question, intent });
    // Brief reviewing transition before swapping to the resolved view.
    setTimeout(() => {
      if (intent === 'serum_verdict') setView({ kind: 'verdict-serum', question });
      else if (intent === 'breakout_plan') setView({ kind: 'plan-breakout', question });
      else setView({ kind: 'change-routine', question });
    }, 900);
  }, []);

  const resetToLanding = useCallback(() => {
    // Push current view to history if it's a resolved answer.
    if (view.kind === 'verdict-serum') {
      setHistory((h) => [
        { question: view.question, summary: 'Skip tonight', intent: 'serum_verdict' },
        ...h,
      ]);
    } else if (view.kind === 'plan-breakout') {
      setHistory((h) => [
        { question: view.question, summary: 'Treat chin only', intent: 'breakout_plan' },
        ...h,
      ]);
    } else if (view.kind === 'change-routine') {
      setHistory((h) => [
        { question: view.question, summary: 'Less activity tonight', intent: 'routine_reason' },
        ...h,
      ]);
    }
    setView({ kind: 'landing' });
  }, [view]);

  const setRoutineAndNavigate = useCallback(() => {
    hapt.tap();
    // Add to history before navigating away.
    if (view.kind === 'verdict-serum') {
      setHistory((h) => [
        { question: view.question, summary: 'Routine set for tonight', intent: 'serum_verdict' },
        ...h,
      ]);
    }
    (nav as unknown as { navigate: (route: string, params?: object) => void }).navigate(
      'Tabs',
      { screen: 'RoutineTab' }
    );
  }, [nav, view]);

  const goToProducts = useCallback(() => {
    hapt.select();
    (nav as unknown as { navigate: (route: string, params?: object) => void }).navigate(
      'Tabs',
      { screen: 'ProductsTab' }
    );
  }, [nav]);

  const goToScan = useCallback(() => {
    hapt.select();
    (nav as unknown as { navigate: (route: string) => void }).navigate('ScanModal');
  }, [nav]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.flex}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.scroll,
                { paddingBottom: insets.bottom + 200 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderView({
                view,
                observation,
                onBeginConsultation: beginConsultation,
                onResetToLanding: resetToLanding,
                onSetRoutine: setRoutineAndNavigate,
                onGoProducts: goToProducts,
                onGoScan: goToScan,
                historyCount: history.length,
              })}
            </ScrollView>

            <Composer
              text={text}
              setText={setText}
              ref={inputRef}
              placeholder={
                view.kind === 'landing' || view.kind === 'no-scan'
                  ? 'Ask about a product or tonight’s skin'
                  : 'Ask a follow-up'
              }
              bottomInset={insets.bottom}
            />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// View renderer
// ============================================================================

interface RenderArgs {
  view: ConsultationView;
  observation: ReturnType<typeof useTonightObservation>;
  onBeginConsultation: (intent: ConsultationIntent) => void;
  onResetToLanding: () => void;
  onSetRoutine: () => void;
  onGoProducts: () => void;
  onGoScan: () => void;
  historyCount: number;
}

function renderView(args: RenderArgs) {
  const { view } = args;
  if (view.kind === 'no-scan') return <NoScanView {...args} />;
  if (view.kind === 'landing') return <LandingView {...args} />;
  if (view.kind === 'reviewing') return <ReviewingView {...args} view={view} />;
  if (view.kind === 'verdict-serum')
    return <SerumVerdictView {...args} question={view.question} />;
  if (view.kind === 'plan-breakout')
    return <BreakoutPlanView {...args} question={view.question} />;
  if (view.kind === 'change-routine')
    return <RoutineChangeView {...args} question={view.question} />;
  return null;
}

// ============================================================================
// Landing
// ============================================================================

function LandingView({ observation, onBeginConsultation, historyCount }: RenderArgs) {
  return (
    <View>
      <TopMarker text="TONIGHT’S CONSULTATION" right={historyCount > 0 ? `Earlier tonight · ${historyCount}` : null} />
      <Animated.View entering={FadeInDown.duration(360).delay(60).easing(Easing.out(Easing.cubic))}>
        <Text style={[puraType.answerHero, styles.editorialHero]} maxFontSizeMultiplier={1.15}>
          What are you unsure{'\n'}about tonight?
        </Text>
        <Text style={[puraType.bodyLarge, styles.support]} maxFontSizeMultiplier={1.2}>
          Your scan noticed activity on your {observation.zone === 'full_face' ? 'face' : observation.zone}.
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(420).delay(180)}
        style={styles.contourCenter}
      >
        <ScanConcernContour
          zone={observation.zone}
          size="medium"
          mode="observation"
          showLabel
          label={observation.observationLabel}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(420).delay(280)} style={styles.questionMenu}>
        <EditorialQuestionRow
          title="Can I use my serum tonight?"
          subtitle="Check a product against your scan"
          onPress={() => onBeginConsultation('serum_verdict')}
        />
        <EditorialQuestionRow
          title="What should I do about this breakout?"
          subtitle="Build tonight’s simplest plan"
          onPress={() => onBeginConsultation('breakout_plan')}
        />
        <EditorialQuestionRow
          title="Why did my routine change?"
          subtitle="Understand Pura’s decision"
          onPress={() => onBeginConsultation('routine_reason')}
          isLast
        />
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Reviewing
// ============================================================================

function ReviewingView({
  view,
  onResetToLanding,
}: RenderArgs & {
  view: Extract<ConsultationView, { kind: 'reviewing' }>;
}) {
  return (
    <View>
      <BackHeader onBack={onResetToLanding} />
      <Animated.View entering={FadeIn.duration(220)}>
        <Text style={puraType.consultationMarker} maxFontSizeMultiplier={1.2}>
          YOU ASKED
        </Text>
        <Text style={[puraType.questionText, styles.consultationQuestion]} maxFontSizeMultiplier={1.2}>
          {view.question}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(280).delay(120)}
        style={[styles.contourCenter, { marginTop: puraSpace.heroGap }]}
      >
        <ScanConcernContour
          zone={'chin'}
          size="hero"
          mode="reviewing"
          showLabel
          label="Reviewing tonight’s scan and routine"
        />
      </Animated.View>

      <Text style={[puraType.body, styles.reviewingLine]} maxFontSizeMultiplier={1.2}>
        Reviewing tonight’s scan and routine
      </Text>
    </View>
  );
}

// ============================================================================
// Serum verdict — the defining screen
// ============================================================================

function SerumVerdictView({
  question,
  observation,
  onResetToLanding,
  onSetRoutine,
  onGoProducts,
}: RenderArgs & { question: string }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleSetRoutine = useCallback(() => {
    setConfirmed(true);
    setTimeout(() => onSetRoutine(), 900);
  }, [onSetRoutine]);

  return (
    <View>
      <BackHeader onBack={onResetToLanding} />
      <Animated.View entering={FadeIn.duration(220)}>
        <Text style={puraType.consultationMarker} maxFontSizeMultiplier={1.2}>
          YOU ASKED
        </Text>
        <Text style={[puraType.questionText, styles.consultationQuestion]} maxFontSizeMultiplier={1.2}>
          {question}
        </Text>
      </Animated.View>

      {/* Verdict — sits directly on canvas, unboxed. */}
      <Animated.View
        entering={FadeInDown.duration(420).delay(140).easing(Easing.out(Easing.cubic))}
        style={styles.verdictBlock}
      >
        <Text style={puraType.verdictHero} maxFontSizeMultiplier={1.1}>
          Not tonight.
        </Text>
        <Text style={[puraType.bodyLarge, styles.verdictSupport]} maxFontSizeMultiplier={1.2}>
          Keep tonight focused on the {observation.zone === 'full_face' ? 'focus area' : observation.zone}. Your serum adds more activity than your skin needs right now.
        </Text>
      </Animated.View>

      {/* Reasoning trace */}
      <Animated.View entering={FadeInDown.duration(380).delay(280)} style={styles.reasoningBlock}>
        <Text style={puraType.consultationMarker} maxFontSizeMultiplier={1.2}>
          WHAT PURA NOTICED
        </Text>
        <ReasoningTrace
          nodes={[
            {
              key: 'chin',
              title: observation.zone === 'full_face' ? 'FOCUS' : observation.zone.toUpperCase(),
              observation: 'Active areas',
              action: 'Treat only',
              tone: 'active',
            },
            {
              key: 'rest',
              title: 'REST',
              observation: 'Relatively calm',
              action: 'Leave calm',
              tone: 'quiet',
            },
            {
              key: 'serum',
              title: 'SERUM',
              observation: 'Extra active step',
              action: 'Skip',
              tone: 'skip',
            },
          ]}
        />
      </Animated.View>

      {/* Replacement ritual */}
      <Animated.View entering={FadeInDown.duration(380).delay(380)} style={styles.replacementBlock}>
        <Text style={puraType.consultationMarker} maxFontSizeMultiplier={1.2}>
          TONIGHT, USE THIS INSTEAD
        </Text>
        <MinimalRitualPath steps={['Cleanse', 'Spot treat', 'Moisturize']} />
      </Animated.View>

      {/* CTAs */}
      <Animated.View entering={FadeIn.duration(360).delay(480)} style={styles.ctaStack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Set a simplified routine for tonight without the serum"
          onPress={handleSetRoutine}
          disabled={confirmed}
          style={({ pressed }) => [
            styles.primaryAction,
            confirmed && styles.primaryActionConfirmed,
            pressed && styles.primaryActionPressed,
          ]}
        >
          <Text style={puraType.buttonPrimary} maxFontSizeMultiplier={1.2}>
            {confirmed ? 'Routine set for tonight' : 'Set this as tonight’s routine'}
          </Text>
        </Pressable>
        <QuietAction
          label={whyOpen ? 'Hide explanation' : 'Why skip my serum?'}
          onPress={() => setWhyOpen((v) => !v)}
        />
        {whyOpen ? (
          <Animated.View entering={FadeInDown.duration(280)}>
            <Text style={[puraType.body, styles.expansionText]} maxFontSizeMultiplier={1.2}>
              Tonight’s visible activity is concentrated on the {observation.zone}. Since your serum adds another active step, leaving it out keeps the rest of your skin undisturbed.
            </Text>
            <Text style={[puraType.itemMeta, styles.disclosureText]} maxFontSizeMultiplier={1.2}>
              Pura guides routine choices from visible observations. It does not diagnose skin conditions.
            </Text>
          </Animated.View>
        ) : null}
        <QuietAction label="See my products" onPress={onGoProducts} />
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Breakout plan
// ============================================================================

function BreakoutPlanView({
  question,
  observation,
  onResetToLanding,
  onSetRoutine,
}: RenderArgs & { question: string }) {
  const [whyOpen, setWhyOpen] = useState(false);
  return (
    <View>
      <BackHeader onBack={onResetToLanding} />
      <Text style={puraType.consultationMarker} maxFontSizeMultiplier={1.2}>
        YOU ASKED
      </Text>
      <Text style={[puraType.questionText, styles.consultationQuestion]} maxFontSizeMultiplier={1.2}>
        {question}
      </Text>

      <Animated.View entering={FadeInDown.duration(420).delay(140)} style={styles.verdictBlock}>
        <Text style={puraType.answerHero} maxFontSizeMultiplier={1.1}>
          Treat one area.{'\n'}Leave the rest calm.
        </Text>
        <Text style={[puraType.bodyLarge, styles.verdictSupport]} maxFontSizeMultiplier={1.2}>
          Activity appears concentrated on your {observation.zone} tonight.
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(380).delay(260)}
        style={styles.contourCenter}
      >
        <ScanConcernContour
          zone={observation.zone}
          size="hero"
          mode="observation"
          showLabel
          label="Active area noticed"
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(380).delay(380)} style={styles.replacementBlock}>
        <Text style={puraType.consultationMarker} maxFontSizeMultiplier={1.2}>
          TONIGHT’S PLAN
        </Text>
        <View style={styles.planSteps}>
          <PlanStep number="01" title="Cleanse gently" product="Vanicream Cleanser" />
          <PlanStep
            number="02"
            title={observation.zone === 'full_face' ? 'Treat the focus area' : `Treat the ${observation.zone} only`}
            product="Salicylic Spot Treatment"
            focus
          />
          <PlanStep number="03" title="Moisturize" product="CeraVe Cream" isLast />
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(360).delay(480)} style={styles.ctaStack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Begin tonight's routine"
          onPress={onSetRoutine}
          style={({ pressed }) => [
            styles.primaryAction,
            pressed && styles.primaryActionPressed,
          ]}
        >
          <Text style={puraType.buttonPrimary} maxFontSizeMultiplier={1.2}>
            Begin tonight’s routine
          </Text>
        </Pressable>
        <QuietAction
          label={whyOpen ? 'Hide explanation' : `Why only the ${observation.zone === 'full_face' ? 'focus area' : observation.zone}?`}
          onPress={() => setWhyOpen((v) => !v)}
        />
        {whyOpen ? (
          <Animated.View entering={FadeInDown.duration(280)}>
            <Text style={[puraType.body, styles.expansionText]} maxFontSizeMultiplier={1.2}>
              Pura noticed visible activity concentrated in one area. Keeping treatment localized helps avoid adding unnecessary stress elsewhere.
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Routine change explanation
// ============================================================================

function RoutineChangeView({
  question,
  observation,
  onResetToLanding,
  onSetRoutine,
}: RenderArgs & { question: string }) {
  return (
    <View>
      <BackHeader onBack={onResetToLanding} />
      <Text style={puraType.consultationMarker} maxFontSizeMultiplier={1.2}>
        YOU ASKED
      </Text>
      <Text style={[puraType.questionText, styles.consultationQuestion]} maxFontSizeMultiplier={1.2}>
        {question}
      </Text>

      <Animated.View entering={FadeInDown.duration(420).delay(140)} style={styles.verdictBlock}>
        <Text style={puraType.answerHero} maxFontSizeMultiplier={1.1}>
          One step became more{'\n'}important tonight.
        </Text>
        <Text style={[puraType.bodyLarge, styles.verdictSupport]} maxFontSizeMultiplier={1.2}>
          Your scan suggests localized {observation.zone} activity, so moisture now matters more after treatment.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(380).delay(280)} style={styles.replacementBlock}>
        <Text style={puraType.consultationMarker} maxFontSizeMultiplier={1.2}>
          YOUR USUAL PLAN
        </Text>
        <Text style={[puraType.body, styles.changeUsual]} maxFontSizeMultiplier={1.2}>
          Cleanse → Treat → <Text style={styles.changeStrike}>Serum</Text> → Moisturize
        </Text>
        <Text style={[puraType.consultationMarker, { marginTop: puraSpace.lg }]} maxFontSizeMultiplier={1.2}>
          TONIGHT
        </Text>
        <Text style={[puraType.body, styles.changeTonight]} maxFontSizeMultiplier={1.2}>
          Cleanse → Treat {observation.zone === 'full_face' ? 'focus' : observation.zone} only → <Text style={styles.changeEmphasis}>Moisturize</Text>
        </Text>
        <Text style={[puraType.sectionSerif, styles.changeConclusion]} maxFontSizeMultiplier={1.15}>
          Less activity. More comfort.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(360).delay(440)} style={styles.ctaStack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keep tonight's routine"
          onPress={onSetRoutine}
          style={({ pressed }) => [
            styles.primaryAction,
            pressed && styles.primaryActionPressed,
          ]}
        >
          <Text style={puraType.buttonPrimary} maxFontSizeMultiplier={1.2}>
            Keep tonight’s routine
          </Text>
        </Pressable>
        <QuietAction label="Ask about my serum" onPress={onResetToLanding} />
      </Animated.View>
    </View>
  );
}

// ============================================================================
// No-scan
// ============================================================================

function NoScanView({ onGoScan }: RenderArgs) {
  return (
    <View>
      <TopMarker text="PRIVATE CONSULTATION" />
      <Animated.View entering={FadeInDown.duration(360).delay(60)}>
        <Text style={[puraType.answerHero, styles.editorialHero]} maxFontSizeMultiplier={1.15}>
          Start with tonight’s{'\n'}check-in.
        </Text>
        <Text style={[puraType.bodyLarge, styles.support]} maxFontSizeMultiplier={1.2}>
          Pura can guide tonight more clearly after seeing what your skin shows now.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(420).delay(220)} style={{ marginTop: puraSpace.heroGap }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start tonight's check-in"
          onPress={onGoScan}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
        >
          <Text style={puraType.buttonPrimary} maxFontSizeMultiplier={1.2}>
            Start check-in
          </Text>
        </Pressable>

        <Text style={[puraType.consultationMarker, { marginTop: puraSpace.section }]} maxFontSizeMultiplier={1.2}>
          WITHOUT A SCAN, YOU CAN STILL ASK
        </Text>
        <View style={[styles.questionMenu, { marginTop: puraSpace.md }]}>
          <EditorialQuestionRow
            title="How should I layer my products?"
            subtitle="General ingredient order"
            onPress={() => {
              hapt.tap();
            }}
          />
          <EditorialQuestionRow
            title="Can I combine these two products?"
            subtitle="Quick ingredient pairing check"
            onPress={() => {
              hapt.tap();
            }}
            isLast
          />
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function TopMarker({ text, right }: { text: string; right?: string | null }) {
  return (
    <View style={styles.topMarkerRow}>
      <Text style={puraType.consultationMarker} maxFontSizeMultiplier={1.2}>
        {text}
      </Text>
      {right ? (
        <Pressable hitSlop={6} accessibilityRole="button" accessibilityLabel={`Open ${right}`}>
          <Text style={styles.topMarkerRight} maxFontSizeMultiplier={1.15}>
            {right}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BackHeader({ onBack }: { onBack: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to AI Assist"
      onPress={onBack}
      hitSlop={10}
      style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.65 }]}
    >
      <CaretLeft size={14} color={puraColors.inkSecondary} weight="bold" />
      <Text style={styles.backLabel} maxFontSizeMultiplier={1.15}>
        AI Assist
      </Text>
    </Pressable>
  );
}

function EditorialQuestionRow({
  title,
  subtitle,
  onPress,
  isLast,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.questionRow,
        !isLast && styles.questionRowDivider,
        pressed && styles.questionRowPressed,
      ]}
    >
      <View style={styles.questionCopy}>
        <Text style={puraType.questionText} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        <Text style={[puraType.itemMeta, { marginTop: 2 }]} maxFontSizeMultiplier={1.2}>
          {subtitle}
        </Text>
      </View>
      <CaretRight size={14} color={puraColors.faint} weight="bold" />
    </Pressable>
  );
}

function QuietAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.quietAction, pressed && { opacity: 0.6 }]}
    >
      <Text style={puraType.buttonQuiet} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

// ----------------------------------------------------------------------------
// Reasoning trace
// ----------------------------------------------------------------------------

interface ReasoningNode {
  key: string;
  title: string;
  observation: string;
  action: string;
  tone: 'active' | 'quiet' | 'skip';
}

function ReasoningTrace({ nodes }: { nodes: ReasoningNode[] }) {
  return (
    <View style={styles.reasoningRow}>
      <View style={styles.reasoningLine} />
      {nodes.map((n) => (
        <View key={n.key} style={styles.reasoningNode}>
          <View
            style={[
              styles.reasoningDot,
              n.tone === 'active' && styles.reasoningDotActive,
              n.tone === 'skip' && styles.reasoningDotSkip,
            ]}
          />
          <Text
            style={[
              styles.reasoningTitle,
              n.tone === 'active' && { color: puraColors.clayDeep },
              n.tone === 'skip' && { color: puraColors.skipText },
            ]}
            maxFontSizeMultiplier={1.15}
          >
            {n.title}
          </Text>
          <Text style={styles.reasoningObs} maxFontSizeMultiplier={1.2}>
            {n.observation}
          </Text>
          <Text
            style={[
              styles.reasoningAction,
              n.tone === 'active' && { color: puraColors.clayDeep },
              n.tone === 'skip' && { color: puraColors.skipText },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            {n.action}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Minimal ritual path
// ----------------------------------------------------------------------------

function MinimalRitualPath({ steps }: { steps: string[] }) {
  return (
    <View style={styles.ritualPathRow}>
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <View style={styles.ritualPathCapsule}>
            <Text style={puraType.bodyStrong} maxFontSizeMultiplier={1.15}>
              {step}
            </Text>
          </View>
          {i < steps.length - 1 ? (
            <Text style={styles.ritualPathArrow} maxFontSizeMultiplier={1.15}>
              →
            </Text>
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Plan step (Breakout plan)
// ----------------------------------------------------------------------------

function PlanStep({
  number,
  title,
  product,
  focus,
  isLast,
}: {
  number: string;
  title: string;
  product: string;
  focus?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.planStep, !isLast && styles.planStepDivider]}>
      <View style={styles.planStepIndex}>
        <Text
          style={[styles.planStepNumber, focus && { color: puraColors.clayDeep }]}
          maxFontSizeMultiplier={1.15}
        >
          {number}
        </Text>
        {focus ? (
          <Text style={styles.planFocusBadge} maxFontSizeMultiplier={1.15}>
            FOCUS STEP
          </Text>
        ) : null}
      </View>
      <View style={styles.planStepCopy}>
        <Text
          style={[styles.planStepTitle, focus && { color: puraColors.inkSecondary }]}
          maxFontSizeMultiplier={1.2}
        >
          {title}
        </Text>
        <Text style={styles.planStepProduct} maxFontSizeMultiplier={1.2}>
          {product}
        </Text>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Composer
// ----------------------------------------------------------------------------

const Composer = React.forwardRef<
  TextInput,
  {
    text: string;
    setText: (s: string) => void;
    placeholder: string;
    bottomInset: number;
  }
>(({ text, setText, placeholder, bottomInset }, ref) => {
  const hasContent = text.trim().length > 0;
  return (
    <View style={[styles.composerWrap, { paddingBottom: Math.max(bottomInset, 10) + 84 }]}>
      <View style={styles.composer}>
        <TextInput
          ref={ref}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={puraColors.faint}
          style={styles.composerInput}
          multiline
          returnKeyType="send"
          accessibilityLabel="Ask Pura"
          maxFontSizeMultiplier={1.2}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send question"
          disabled={!hasContent}
          style={({ pressed }) => [
            styles.composerSend,
            !hasContent && { opacity: 0.4 },
            pressed && { opacity: 0.86 },
          ]}
        >
          <ArrowUp size={16} color={puraColors.inverse} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
});
Composer.displayName = 'Composer';

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: puraColors.canvas },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: puraSpace.screenX,
    paddingTop: puraSpace.screenTop,
  },

  topMarkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: puraSpace.xxl,
  },
  topMarkerRight: {
    ...puraType.micro,
    color: puraColors.clayDeep,
    fontFamily: 'Inter-SemiBold',
  },

  editorialHero: {
    marginBottom: 0,
  },
  support: {
    marginTop: puraSpace.md,
  },

  contourCenter: {
    alignItems: 'center',
    marginTop: puraSpace.xxl,
    marginBottom: puraSpace.xxl,
  },

  questionMenu: {
    marginTop: puraSpace.section,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: puraSpace.md,
    paddingVertical: puraSpace.lg,
  },
  questionRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraColors.line,
  },
  questionRowPressed: {
    backgroundColor: puraColors.clayMist,
  },
  questionCopy: {
    flex: 1,
  },

  // Reviewing / verdict / plan / change shared
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    marginBottom: puraSpace.lg,
  },
  backLabel: {
    ...puraType.buttonQuiet,
    color: puraColors.inkSecondary,
  },
  consultationQuestion: {
    marginTop: puraSpace.xs,
  },
  reviewingLine: {
    textAlign: 'center',
    color: puraColors.muted,
    marginTop: puraSpace.lg,
  },

  verdictBlock: {
    marginTop: puraSpace.section,
  },
  verdictSupport: {
    marginTop: puraSpace.md,
    maxWidth: 340,
  },

  reasoningBlock: {
    marginTop: puraSpace.section,
  },
  reasoningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: puraSpace.lg,
    paddingHorizontal: puraSpace.xs,
    position: 'relative',
  },
  reasoningLine: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: 7,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraColors.line,
  },
  reasoningNode: {
    alignItems: 'center',
    flex: 1,
  },
  reasoningDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: puraColors.surfaceQuiet,
    borderWidth: 1.2,
    borderColor: puraColors.lineStrong,
    marginBottom: puraSpace.xs,
  },
  reasoningDotActive: {
    backgroundColor: puraColors.claySoft,
    borderColor: puraColors.clay,
  },
  reasoningDotSkip: {
    backgroundColor: puraColors.skipBg,
    borderColor: puraColors.skipText,
  },
  reasoningTitle: {
    ...puraType.eyebrow,
    color: puraColors.inkSecondary,
    fontSize: 10.5,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  reasoningObs: {
    ...puraType.itemMeta,
    textAlign: 'center',
    color: puraColors.muted,
  },
  reasoningAction: {
    ...puraType.bodyStrong,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    color: puraColors.inkSecondary,
  },

  replacementBlock: {
    marginTop: puraSpace.section,
  },
  ritualPathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: puraSpace.lg,
    gap: puraSpace.sm,
  },
  ritualPathCapsule: {
    paddingHorizontal: puraSpace.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: puraColors.surface,
    borderWidth: 1,
    borderColor: puraColors.lineSoft,
  },
  ritualPathArrow: {
    color: puraColors.muted,
    fontSize: 16,
    paddingHorizontal: 4,
  },

  // Plan steps
  planSteps: {
    marginTop: puraSpace.lg,
  },
  planStep: {
    flexDirection: 'row',
    paddingVertical: puraSpace.md,
    gap: puraSpace.lg,
  },
  planStepDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraColors.line,
  },
  planStepIndex: {
    width: 64,
  },
  planStepNumber: {
    ...puraType.eyebrow,
    fontSize: 14,
    letterSpacing: 1.4,
    color: puraColors.muted,
    fontFamily: 'InstrumentSerif-Regular',
  },
  planFocusBadge: {
    ...puraType.eyebrowClay,
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  planStepCopy: {
    flex: 1,
  },
  planStepTitle: {
    ...puraType.itemTitle,
  },
  planStepProduct: {
    ...puraType.itemMeta,
    marginTop: 2,
  },

  // Routine change visual edits
  changeUsual: {
    marginTop: puraSpace.sm,
  },
  changeTonight: {
    marginTop: puraSpace.sm,
  },
  changeStrike: {
    textDecorationLine: 'line-through',
    color: puraColors.faint,
  },
  changeEmphasis: {
    fontFamily: 'Inter-SemiBold',
    color: puraColors.inkSecondary,
  },
  changeConclusion: {
    marginTop: puraSpace.xl,
  },

  // Common CTA stack
  ctaStack: {
    marginTop: puraSpace.xxl,
    gap: puraSpace.sm,
  },
  primaryAction: {
    height: 56,
    borderRadius: 28,
    backgroundColor: puraColors.actionInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionPressed: {
    backgroundColor: puraColors.actionInkPressed,
  },
  primaryActionConfirmed: {
    backgroundColor: puraColors.clay,
  },
  quietAction: {
    alignSelf: 'flex-start',
    paddingVertical: puraSpace.sm,
  },
  expansionText: {
    marginTop: puraSpace.xs,
    maxWidth: 360,
  },
  disclosureText: {
    marginTop: puraSpace.sm,
    color: puraColors.faint,
  },

  // Composer
  composerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: puraSpace.screenX,
    paddingTop: puraSpace.sm,
    backgroundColor: 'transparent',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: puraSpace.sm,
    backgroundColor: puraColors.surfaceRaised,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: puraColors.lineSoft,
    paddingHorizontal: puraSpace.md,
    paddingVertical: 8,
  },
  composerInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: puraColors.ink,
    paddingTop: 6,
    paddingBottom: 6,
  },
  composerSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: puraColors.actionInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
