/**
 * PuraNightHome — v26 emotional rebuild.
 *
 * The screen is no longer a dashboard. It composes the redesigned
 * Pura home experience from a single canonical night-state contract
 * (`HomeNightState`, derived by `selectHomeNightState`). One belief
 * runs through every variant:
 *
 *   "Sometimes the most intelligent skincare recommendation is to do less."
 *
 * Trust contract: nothing on this screen claims to know tonight's skin
 * before tonight's scan exists. Pre-scan variants reference history
 * only; fresh variants speak in appearance language ("looks", "appears")
 * about a scan captured in the last 4 hours.
 *
 * State drives layout:
 *   • no_baseline                  — first-look invitation
 *   • stale_pre_scan               — mirror portal + historical note
 *   • next_night_after_recovery    — "Last night, you gave your skin a break."
 *   • fresh_recovery_night         — "Your skin looks tired of being treated."
 *   • fresh_stable_night           — "Keep it exactly as it is."
 *   • fresh_hydration_edit         — "Your skin is asking for more comfort."
 *
 * Skip-scan recovery is a local screen state that crossfades into the
 * gentle fallback. It auto-resets when the home regains focus and the
 * underlying state has become fresh — the user shouldn't have to back
 * out of "recovery mode" if they actually scanned in the meantime.
 *
 * All hex literals are read from `pura26`; bottom clearance comes
 * from `layoutPura26.bottomClearance(insets)`.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CaretRight } from 'phosphor-react-native';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { layoutPura26, pura26 } from '@/screens/home/homeTokens';
import {
  selectHomeNightState,
  nightsPhrase,
} from '@/state/homeNight';
import type {
  FreshHydrationEditState,
  FreshRecoveryNightState,
  HomeNightState,
  NextNightAfterRecoveryState,
  PreviousEditMemory,
  StalePreScanState,
  TonightCompleteState,
} from '@/types/homeNight';
import { CrossfadeStage } from '@/components/home/CrossfadeStage';
import { MirrorPortal } from '@/components/home/MirrorPortal';
import { TonightMetaHeader } from '@/components/home/TonightMetaHeader';
import {
  MinimalRoutineSequence,
  type SequenceStep,
} from '@/components/home/MinimalRoutineSequence';
import { TonightsEdit } from '@/components/home/TonightsEdit';
import { PausedRoutineStep } from '@/components/home/PausedRoutineStep';
import { HistoricalEditNote } from '@/components/home/HistoricalEditNote';
import { PostScanReveal } from '@/components/home/PostScanReveal';
import { RecoveryNightFallback } from '@/components/home/RecoveryNightFallback';
import { RevealStack } from '@/components/home/RevealStack';
import { WhyExpander } from '@/components/home/WhyExpander';
import { PrimaryCTA } from '@/components/home/PrimaryCTA';
import { PaperGrain } from '@/components/home/PaperGrain';
import { AmbientLight } from '@/components/home/AmbientLight';
import { BreathSignature } from '@/components/home/BreathSignature';

// ---------------------------------------------------------------------------
// Grammar / region helpers — keep appearance language consistent.
// ---------------------------------------------------------------------------

function regionVerb(region: string): { appear: string; is: string } {
  const normalized = region.trim().toLowerCase();
  const plural = /\bcheeks\b|\bjawlines?\b|\bsides\b/.test(normalized);
  return {
    appear: plural ? 'appear' : 'appears',
    is: plural ? 'are' : 'is',
  };
}

// ===========================================================================
// PuraNightHome
// ===========================================================================

export function PuraNightHome() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scans = useAppStore((s) => s.scans);
  const userRoutineEvening = useAppStore((s) => s.userRoutineEvening);
  const userInitials = useAppStore((s) => s.user?.initials ?? null);
  const userName = useAppStore((s) => s.user?.name ?? s.name ?? null);
  const tonightCompleteAt = useAppStore((s) => s.tonightCompleteAt);
  const [skipScanRecovery, setSkipScanRecovery] = useState(false);

  const initialsFallback =
    userInitials ?? (userName ? userName.trim()[0]?.toUpperCase() ?? null : null);

  const openProfile = () => {
    hapt.select();
    // The Me tab is the canonical personal surface. The home stack's parent
    // is the tab navigator, so a single hop reads as a natural tab switch.
    nav.getParent?.()?.navigate?.('MeTab');
  };

  const nightState = useMemo<HomeNightState>(
    () => selectHomeNightState({ scans, now: Date.now(), tonightCompleteAt }),
    [scans, tonightCompleteAt]
  );

  // If the user lands back on the home tab and a fresh scan now exists,
  // any lingering "recovery night" override is no longer relevant.
  useFocusEffect(
    useCallback(() => {
      if (
        skipScanRecovery &&
        (nightState.kind === 'fresh_recovery_night' ||
          nightState.kind === 'fresh_stable_night' ||
          nightState.kind === 'fresh_hydration_edit')
      ) {
        setSkipScanRecovery(false);
      }
      return undefined;
    }, [skipScanRecovery, nightState.kind])
  );

  const goScan = () => {
    setSkipScanRecovery(false);
    nav.navigate('ScanModal');
  };
  const goRoutine = () => {
    const parent = nav.getParent?.();
    parent?.navigate?.('RoutineTab');
  };
  const goAssist = () => {
    const parent = nav.getParent?.();
    parent?.navigate?.('AssistantTab');
  };
  const onSkipForRecovery = () => {
    hapt.select();
    setSkipScanRecovery(true);
  };

  const bottomClearance = layoutPura26.bottomClearance(insets.bottom);

  // Stage key for the top-level crossfade — distinguishes "in recovery
  // fallback" from "in night state X" so each meaningful change gets a
  // calm fade.
  const stageKey = skipScanRecovery
    ? 'recovery'
    : `state:${nightState.kind}`;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* Background atmosphere — paper grain + ambient warm wash. Sit
          behind every state so the home always reads as a physical
          inhabited surface, not a flat color. */}
      <PaperGrain />
      <AmbientLight />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topRow}>
          <TonightMetaHeader />
          {initialsFallback ? (
            <Pressable
              onPress={openProfile}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              hitSlop={10}
              style={({ pressed }) => [
                styles.avatarPill,
                pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Text style={styles.avatarInitials} maxFontSizeMultiplier={1.1}>
                {initialsFallback}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <CrossfadeStage stageKey={stageKey}>
          {skipScanRecovery ? (
            <RecoveryNightFallback
              onBegin={goRoutine}
              onTakeLook={() => setSkipScanRecovery(false)}
            />
          ) : (
            <ScrollView
              contentContainerStyle={[
                styles.scroll,
                { paddingBottom: bottomClearance },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <NightContent
                state={nightState}
                evening={userRoutineEvening}
                onTakeLook={goScan}
                onSkipForRecovery={onSkipForRecovery}
                onBeginRoutine={goRoutine}
                onAskAssist={goAssist}
                onSeePreviousEdit={goRoutine}
              />
            </ScrollView>
          )}
        </CrossfadeStage>
      </SafeAreaView>
    </View>
  );
}

// ===========================================================================
// NightContent — routes the discriminated state to the right composition.
// ===========================================================================

interface NightContentProps {
  state: HomeNightState;
  evening: readonly string[];
  onTakeLook: () => void;
  onSkipForRecovery: () => void;
  onBeginRoutine: () => void;
  onAskAssist: () => void;
  onSeePreviousEdit: () => void;
}

function NightContent(props: NightContentProps) {
  switch (props.state.kind) {
    case 'no_baseline':
      return <NoBaselineHome onTakeLook={props.onTakeLook} />;
    case 'stale_pre_scan':
      return (
        <StalePreScanHome
          state={props.state}
          onTakeLook={props.onTakeLook}
          onSkipForRecovery={props.onSkipForRecovery}
          onSeePreviousEdit={props.onSeePreviousEdit}
        />
      );
    case 'next_night_after_recovery':
      return (
        <NextNightAfterRecoveryHome
          state={props.state}
          onTakeLook={props.onTakeLook}
          onSkipForRecovery={props.onSkipForRecovery}
          onSeePreviousEdit={props.onSeePreviousEdit}
        />
      );
    case 'fresh_recovery_night':
      return (
        <FreshRecoveryHome
          state={props.state}
          onBeginRoutine={props.onBeginRoutine}
          onAskAssist={props.onAskAssist}
        />
      );
    case 'fresh_stable_night':
      return (
        <FreshStableHome
          evening={props.evening}
          onBeginRoutine={props.onBeginRoutine}
          onAskAssist={props.onAskAssist}
        />
      );
    case 'fresh_hydration_edit':
      return (
        <FreshHydrationHome
          state={props.state}
          onBeginRoutine={props.onBeginRoutine}
          onAskAssist={props.onAskAssist}
        />
      );
    case 'tonight_complete':
      return <TonightCompleteHome state={props.state} />;
  }
}

// ===========================================================================
// Completion state — quiet, closing, no further CTAs.
// ===========================================================================

function TonightCompleteHome({
  state: _state,
}: {
  state: TonightCompleteState;
}) {
  void _state;
  return (
    <View style={styles.completeWrap}>
      <View style={styles.completeMark}>
        <View style={styles.completeMarkInner} />
      </View>
      <Text style={styles.completeHeadline} maxFontSizeMultiplier={1.2}>
        That is enough{'\n'}for tonight.
      </Text>
      <Text style={styles.completeBody} maxFontSizeMultiplier={1.2}>
        You have looked at that spot enough. Pura will check in again
        tomorrow.
      </Text>
      <Text style={styles.completeBelief} maxFontSizeMultiplier={1.15}>
        Rest is part of the routine.
      </Text>
    </View>
  );
}

// ===========================================================================
// Pre-scan layouts
// ===========================================================================

interface PreScanLayoutProps {
  headlineLines: readonly string[];
  supporting: string;
  portalLabel: string;
  portalAccessibilityLabel: string;
  microcopy: string;
  secondaryActionLabel?: string;
  onTakeLook: () => void;
  onSecondaryAction?: () => void;
  historicalNote?: { body: string; onPress: () => void } | null;
}

function PreScanLayout({
  headlineLines,
  supporting,
  portalLabel,
  portalAccessibilityLabel,
  microcopy,
  secondaryActionLabel,
  onTakeLook,
  onSecondaryAction,
  historicalNote,
}: PreScanLayoutProps) {
  return (
    <View>
      <View style={styles.heroBlock}>
        {headlineLines.map((line, i) => (
          <Text
            key={i}
            accessibilityRole={i === 0 ? 'header' : 'text'}
            style={styles.headlineLine}
            maxFontSizeMultiplier={1.2}
          >
            {line}
          </Text>
        ))}
        <Text style={styles.supporting} maxFontSizeMultiplier={1.2}>
          {supporting}
        </Text>
      </View>

      <View style={styles.portalBlock}>
        <MirrorPortal
          label={portalLabel}
          accessibilityLabel={portalAccessibilityLabel}
          onPress={onTakeLook}
        />
        <Text style={styles.microcopy} maxFontSizeMultiplier={1.15}>
          {microcopy}
        </Text>
      </View>

      {secondaryActionLabel && onSecondaryAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={secondaryActionLabel}
          onPress={onSecondaryAction}
          hitSlop={10}
          style={({ pressed }) => [
            styles.secondaryAction,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.secondaryActionText} maxFontSizeMultiplier={1.15}>
            {secondaryActionLabel}
          </Text>
        </Pressable>
      ) : null}

      {historicalNote ? (
        <HistoricalEditNote
          body={historicalNote.body}
          onPress={historicalNote.onPress}
        />
      ) : null}
    </View>
  );
}

function NoBaselineHome({ onTakeLook }: { onTakeLook: () => void }) {
  return (
    <PreScanLayout
      headlineLines={['Begin with one', 'honest look.']}
      supporting="Take your first skin check-in to build tonight’s routine around what your skin shows now."
      portalLabel="Take your first look"
      portalAccessibilityLabel="Take your first look. Begin a new skin scan to build tonight’s routine."
      microcopy="30 seconds · private · no judgment"
      onTakeLook={onTakeLook}
    />
  );
}

function StalePreScanHome({
  state,
  onTakeLook,
  onSkipForRecovery,
  onSeePreviousEdit,
}: {
  state: StalePreScanState;
  onTakeLook: () => void;
  onSkipForRecovery: () => void;
  onSeePreviousEdit: () => void;
}) {
  const supporting = `Your last scan was ${nightsPhrase(
    state.nightsSinceLastScan
  )}. Tonight’s edit is waiting for a new check-in.`;
  const historical = buildHistoricalNote(state.previousEdit);
  return (
    <PreScanLayout
      headlineLines={['Before you add another step,', 'take one honest look.']}
      supporting={supporting}
      portalLabel="Take tonight’s look"
      portalAccessibilityLabel="Take tonight’s look. Start a new skin scan to prepare tonight’s routine."
      microcopy="30 seconds · private · no judgment"
      secondaryActionLabel="Skip scan — choose a recovery night"
      onTakeLook={onTakeLook}
      onSecondaryAction={onSkipForRecovery}
      historicalNote={
        historical ? { body: historical, onPress: onSeePreviousEdit } : null
      }
    />
  );
}

function NextNightAfterRecoveryHome({
  state,
  onTakeLook,
  onSkipForRecovery,
  onSeePreviousEdit,
}: {
  state: NextNightAfterRecoveryState;
  onTakeLook: () => void;
  onSkipForRecovery: () => void;
  onSeePreviousEdit: () => void;
}) {
  const paused = state.previousEdit.pausedStepName ?? 'Your active step';
  const region = state.previousEdit.region ?? 'irritated area';
  const supporting = `Your ${paused.toLowerCase()} was paused while your ${region} recovered. Take tonight’s look to see whether it is ready to return.`;
  return (
    <PreScanLayout
      headlineLines={['Last night, you gave', 'your skin a break.']}
      supporting={supporting}
      portalLabel="Take tonight’s look"
      portalAccessibilityLabel="Take tonight’s look. Start a new skin scan to see whether the paused step can return."
      microcopy="30 seconds · private · no judgment"
      secondaryActionLabel="Choose another recovery night"
      onTakeLook={onTakeLook}
      onSecondaryAction={onSkipForRecovery}
      historicalNote={{
        body: `Last time, Pura paused your ${paused.toLowerCase()} while your ${region} recovered.`,
        onPress: onSeePreviousEdit,
      }}
    />
  );
}

function buildHistoricalNote(prev: PreviousEditMemory): string | null {
  if (prev.kind === 'recovery' && prev.pausedStepName && prev.region) {
    return `Last time, Pura asked you to keep ${prev.pausedStepName.toLowerCase()}s away from your ${prev.region}.`;
  }
  if (prev.kind === 'hydration' && prev.region) {
    return `Last time, Pura added one layer of hydration for your ${prev.region}.`;
  }
  if (prev.kind === 'stable') {
    return 'Last time, Pura asked you to keep things exactly as they were.';
  }
  return null;
}

// ===========================================================================
// Post-scan layouts
// ===========================================================================

function PrimaryActions({
  primary,
  whyLabel,
  whyExplanation,
  onPrimary,
  onAskAssist,
}: {
  primary: string;
  whyLabel?: string;
  whyExplanation?: string;
  onPrimary: () => void;
  onAskAssist?: () => void;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const defaultExplanation =
    'Your skin showed visible signals tonight. Pura adjusts the routine to match what your check-in showed — never to push you toward more.';
  return (
    <View style={styles.postActions}>
      <PrimaryCTA label={primary} onPress={onPrimary} />
      {whyLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={whyLabel}
          accessibilityState={{ expanded: whyOpen }}
          onPress={() => {
            hapt.select();
            setWhyOpen((v) => !v);
          }}
          hitSlop={10}
          style={({ pressed }) => [
            styles.whyAction,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.whyActionText} maxFontSizeMultiplier={1.15}>
            {whyOpen ? 'Hide explanation' : whyLabel}
          </Text>
        </Pressable>
      ) : null}
      <WhyExpander open={whyOpen}>
        <View style={styles.whyBlock}>
          <Text style={styles.whyBody} maxFontSizeMultiplier={1.2}>
            {whyExplanation ?? defaultExplanation}
          </Text>
          {onAskAssist ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ask AI Assist a follow-up"
              onPress={() => {
                hapt.select();
                onAskAssist();
              }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.assistInlineLink,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={styles.assistInlineLinkText}
                maxFontSizeMultiplier={1.15}
              >
                Ask AI Assist a follow-up
              </Text>
              <CaretRight size={11} color={pura26.terracotta} weight="bold" />
            </Pressable>
          ) : null}
        </View>
      </WhyExpander>
    </View>
  );
}

const RECOVERY_REMAINING_STEPS: readonly SequenceStep[] = [
  {
    title: 'Cleanse gently',
    hint: 'Gently remove buildup. No scrubbing.',
  },
  {
    title: 'Moisturize',
    hint: 'Support your barrier and stop there.',
  },
];

function FreshRecoveryHome({
  state,
  onBeginRoutine,
  onAskAssist,
}: {
  state: FreshRecoveryNightState;
  onBeginRoutine: () => void;
  onAskAssist: () => void;
}) {
  const v = regionVerb(state.region);
  return (
    <PostScanReveal
      headline="Your skin looks tired of being treated."
      supporting={`There’s visible sensitivity around your ${state.region} tonight. Let it recover.`}
      decision="Tonight, do less."
    >
      <TonightsEdit headline={`${state.pausedStepName} paused.`}>
        <RevealStack gap={260}>
          <PausedRoutineStep
            stepName={state.pausedStepName}
            reason={`Your ${state.region} ${v.is} showing visible sensitivity.`}
          />
          <View style={styles.subSection}>
            <Text style={styles.subSectionLabel} maxFontSizeMultiplier={1.1}>
              YOUR RECOVERY NIGHT
            </Text>
            <MinimalRoutineSequence
              steps={RECOVERY_REMAINING_STEPS}
              closing="Done after two steps."
            />
          </View>
        </RevealStack>
      </TonightsEdit>
      <PrimaryActions
        primary="Begin recovery night"
        whyLabel="Why was this removed?"
        whyExplanation={`Your ${state.region} showed visible sensitivity tonight. ${state.pausedStepName}s can be irritating when skin already appears stressed, so Pura paused that step for this evening.`}
        onPrimary={onBeginRoutine}
        onAskAssist={onAskAssist}
      />
      <BreathSignature enterDelay={900} />
    </PostScanReveal>
  );
}

const DEFAULT_STABLE_STEPS: readonly SequenceStep[] = [
  { title: 'Cleanse gently' },
  { title: 'Your active step' },
  { title: 'Moisturize' },
];

function FreshStableHome({
  evening,
  onBeginRoutine,
  onAskAssist,
}: {
  evening: readonly string[];
  onBeginRoutine: () => void;
  onAskAssist: () => void;
}) {
  const steps: readonly SequenceStep[] =
    evening.length === 0
      ? DEFAULT_STABLE_STEPS
      : [
          { title: 'Begin as usual' },
          {
            title:
              evening.length === 1
                ? 'Your one evening step'
                : `Your ${evening.length} evening steps`,
            hint: 'Exactly the routine you’ve built.',
          },
          { title: 'Moisturize' },
        ];
  return (
    <PostScanReveal
      headline="Keep it exactly as it is."
      supporting="Your skin appears calm tonight. There’s no reason to add more."
      decision="No changes tonight."
    >
      <TonightsEdit
        headline="No changes tonight."
        belief="Do not chase faster results."
      >
        <RevealStack gap={220}>
          <MinimalRoutineSequence steps={steps} />
        </RevealStack>
      </TonightsEdit>
      <PrimaryActions
        primary="Begin tonight’s routine"
        whyLabel="Ask about tonight’s routine"
        whyExplanation="Tonight’s scan didn’t surface anything that warrants a change. Pura is not incentivized to always change something — when your skin looks calm, the most intelligent step is to let it stay calm."
        onPrimary={onBeginRoutine}
        onAskAssist={onAskAssist}
      />
      <BreathSignature enterDelay={900} />
    </PostScanReveal>
  );
}

function FreshHydrationHome({
  state,
  onBeginRoutine,
  onAskAssist,
}: {
  state: FreshHydrationEditState;
  onBeginRoutine: () => void;
  onAskAssist: () => void;
}) {
  const v = regionVerb(state.region);
  const steps: readonly SequenceStep[] = [
    { title: 'Cleanse gently' },
    {
      title: 'One layer of hydration',
      hint: 'A simple hydrating layer before moisturizer.',
      emphasis: 'added',
    },
    { title: 'Moisturize' },
  ];
  return (
    <PostScanReveal
      headline="Your skin is asking for more comfort tonight."
      supporting={`Your ${state.region} ${v.appear} drier tonight. The rest of your routine can stay the same.`}
      decision="Add one layer of hydration."
    >
      <TonightsEdit headline="Add one layer of hydration.">
        <RevealStack gap={220}>
          <MinimalRoutineSequence steps={steps} />
        </RevealStack>
      </TonightsEdit>
      <PrimaryActions
        primary="Begin tonight’s routine"
        whyLabel="Why this change?"
        whyExplanation={`Your ${state.region} ${v.appear} drier tonight. One extra hydrating layer is gentle and reversible — every other step in your routine stays.`}
        onPrimary={onBeginRoutine}
        onAskAssist={onAskAssist}
      />
      <BreathSignature enterDelay={900} />
    </PostScanReveal>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pura26.paper,
  },
  safe: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 24,
  },
  avatarPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: pura26.surface,
    borderWidth: 1,
    borderColor: pura26.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: pura26.terracottaText,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginTop: 8,
  },
  avatarInitials: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: pura26.inkSecondary,
    letterSpacing: 0.2,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 160,
  },
  heroBlock: {
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 36,
  },
  headlineLine: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
    color: pura26.ink,
  },
  supporting: {
    fontFamily: 'Inter-Regular',
    fontSize: 16.5,
    lineHeight: 25,
    color: pura26.inkSecondary,
    marginTop: 22,
  },
  portalBlock: {
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
    gap: 22,
  },
  microcopy: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: pura26.inkMuted,
    letterSpacing: 0.4,
  },
  secondaryAction: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  secondaryActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: pura26.inkSecondary,
    letterSpacing: 0.1,
  },
  postActions: {
    paddingHorizontal: 32,
    paddingTop: 32,
    gap: 18,
  },
  whyAction: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  whyActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: pura26.terracottaText,
    letterSpacing: 0.1,
  },
  whyBlock: {
    marginTop: 4,
    padding: 20,
    borderRadius: 18,
    backgroundColor: pura26.warmTint,
    gap: 14,
  },
  whyBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 23,
    color: pura26.inkSecondary,
  },
  assistInlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  assistInlineLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: pura26.terracotta,
    letterSpacing: 0.1,
  },
  subSection: {
    paddingTop: 12,
    gap: 16,
  },
  subSectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2.2,
    color: pura26.inkMuted,
  },
  // ─── Tonight complete (closing state) ──────────────────────────────
  completeWrap: {
    paddingHorizontal: 32,
    paddingTop: 56,
    alignItems: 'center',
    gap: 22,
  },
  completeMark: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: pura26.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  completeMarkInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: pura26.sageInk,
    opacity: 0.85,
  },
  completeHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
    color: pura26.ink,
    textAlign: 'center',
  },
  completeBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 16.5,
    lineHeight: 25,
    color: pura26.inkSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  completeBelief: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 25,
    color: pura26.sageInk,
    letterSpacing: -0.1,
    marginTop: 8,
  },
});
