import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  AppShell,
  PageHeader,
  Card,
  PrimaryButton,
  TextAction,
  SectionLabel,
  BodyPrimary,
  BodyFunctional,
  Metadata,
  ReviewPanel,
  RoutineStepCard,
  AvoidTonightCard,
  MorningProtectionCard,
  RoutineCompletionCard,
  SkinScoreHero,
  SkinSignalRow,
  ScoreComparisonCard,
  ScanQualityAlert,
  T,
  TYPE,
  RADIUS,
  SPACE,
} from '@/components/v25';
import {
  FIX_AVOID_TONIGHT,
  FIX_BASELINE_SCAN,
  FIX_LATEST_RELIABLE,
  FIX_ROUTINE_STEPS,
  FIX_SAVED_MOISTURIZER,
  FIX_SIGNALS,
} from '@/state/v25/fixtures';
import {
  useV25Dev,
  type RoutineFixture,
} from '@/state/v25/devSwitch';
import type { RootStackParamList } from '@/navigation/types';
import type { RoutineStepV25 } from '@/state/v25/types';
import { useAssistContext } from '@/state/v25/assistContext';
import { useAppStore } from '@/store/useAppStore';
import { pura26 } from '@/screens/home/homeTokens';

/**
 * v25 — Routine screen.
 *
 * Two internal tabs only: Today / Progress. The legacy Shelf tab is
 * gone; Products lives at the global tab level.
 *
 * Today tab:
 *   • hero summarising tonight's focus + progress line
 *   • compact RoutineStepCard list — only one expanded at a time
 *   • Avoid Tonight card (terracotta-soft)
 *   • Tomorrow Morning SPF preview (amber-soft)
 *   • Completion moment when all required steps are done
 *
 * Progress tab:
 *   • SkinScoreHero (baseline / comparison / failed-latest)
 *   • SkinSignals
 *   • Direct ScoreComparisonCard until 4 reliable scans land
 *   • TrendChart placeholder for the 4-plus state
 *   • Failed-latest insert when applicable
 *
 * The user reaches AI Assist from product / step rows via context-aware
 * navigation that prepopulates the assistant context.
 */
export function RoutineV25Screen({
  initialTab,
}: {
  initialTab?: 'today' | 'progress';
}) {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const openPanel = useV25Dev((s) => s.setPanelOpen);
  const routineFixture = useV25Dev((s) => s.routine);
  const setAssistContext = useAssistContext((s) => s.setContext);

  const [tab, setTab] = useState<'today' | 'progress'>(initialTab ?? 'today');

  const subtitle = useMemo(() => {
    if (tab === 'today')
      return routineFixture === 'complete'
        ? 'Routine complete tonight'
        : 'Personalized from today’s scan';
    return 'Based on reliable scans only';
  }, [tab, routineFixture]);

  const openScan = useCallback(() => {
    nav.navigate('ScanModal');
  }, [nav]);

  const openAssistWithContext = useCallback(
    (intent: string, primary: string, secondary: string) => {
      setAssistContext({
        kind: 'routine-step',
        primary,
        secondary,
        intent,
      });
      // @ts-expect-error tabs param
      nav.navigate?.('Tabs', { screen: 'AssistantTab' });
    },
    [nav, setAssistContext]
  );

  return (
    <>
      <AppShell>
        <Pressable
          onLongPress={() => openPanel(true)}
          delayLongPress={500}
        >
          <PageHeader title="Routine" subtitle={subtitle} />
        </Pressable>

        <View style={s.tabsWrap}>
          <RoutineTabs active={tab} onChange={setTab} />
        </View>

        {tab === 'today' ? (
          <TodayBody
            fixture={routineFixture}
            onAskAssist={openAssistWithContext}
            onAddSpf={openScan}
            onFindSpfMatch={() => {
              // @ts-expect-error tabs nav
              nav.navigate?.('Tabs', { screen: 'ProductsTab' });
            }}
          />
        ) : (
          <ProgressBody onRetake={openScan} />
        )}
      </AppShell>
      <ReviewPanel />
    </>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function RoutineTabs({
  active,
  onChange,
}: {
  active: 'today' | 'progress';
  onChange: (v: 'today' | 'progress') => void;
}) {
  const indicator = useSharedValue(active === 'today' ? 0 : 1);
  React.useEffect(() => {
    indicator.value = withTiming(active === 'today' ? 0 : 1, {
      duration: 240,
    });
  }, [active, indicator]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: indicator.value * 100 + '%' as unknown as number }],
  }));

  return (
    <View style={tabStyles.row}>
      {(['today', 'progress'] as const).map((t) => (
        <Pressable
          key={t}
          onPress={() => onChange(t)}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === t }}
          accessibilityLabel={t === 'today' ? 'Today' : 'Progress'}
          style={tabStyles.tab}
        >
          <Text
            style={[
              tabStyles.label,
              active === t && tabStyles.labelOn,
            ]}
            maxFontSizeMultiplier={1.2}
          >
            {t === 'today' ? 'Today' : 'Progress'}
          </Text>
        </Pressable>
      ))}
      <Animated.View style={[tabStyles.indicator, animated]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Today body
// ---------------------------------------------------------------------------

function TodayBody({
  fixture,
  onAskAssist,
  onAddSpf,
  onFindSpfMatch,
}: {
  fixture: RoutineFixture;
  onAskAssist: (intent: string, primary: string, secondary: string) => void;
  onAddSpf: () => void;
  onFindSpfMatch: () => void;
}) {
  // Build steps tailored to the selected fixture without mutating the
  // shared fixture data.
  const steps = useMemo<RoutineStepV25[]>(() => {
    return FIX_ROUTINE_STEPS.map((step) => {
      if (fixture === 'complete') {
        return { ...step, completed: true };
      }
      if (fixture === 'in-progress-no-product' && step.id === 'moisturize') {
        return {
          ...step,
          assignedProduct: undefined,
          missingProductMessage:
            'You do not have a moisturizer saved in Products.',
        };
      }
      return step;
    });
  }, [fixture]);

  const [expandedId, setExpandedId] = useState<string | null>(
    steps.find((step) => !step.completed && step.priority === 'required')?.id ??
      steps.find((step) => !step.completed)?.id ??
      null
  );
  const [marked, setMarked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(steps.map((s) => [s.id, !!s.completed])) as Record<string, boolean>
  );
  const [avoidCollapsed, setAvoidCollapsed] = useState(false);

  React.useEffect(() => {
    setMarked(Object.fromEntries(steps.map((s) => [s.id, !!s.completed])) as Record<string, boolean>);
    setExpandedId(
      steps.find((step) => !step.completed && step.priority === 'required')?.id ??
        steps.find((step) => !step.completed)?.id ??
        null
    );
  }, [steps]);

  const completedCount = Object.values(marked).filter(Boolean).length;
  const totalCount = steps.length;
  const allComplete = completedCount === totalCount;

  // v26 — when all required steps land, signal tonight's closing
  // state so the home screen shifts into the "That is enough for
  // tonight." variant. Clear the stamp if the user un-marks (defensive
  // — the screen currently only marks one-way, but the store contract
  // is two-way so we honour it).
  const setTonightCompleteAt = useAppStore((s) => s.setTonightCompleteAt);
  React.useEffect(() => {
    if (allComplete) {
      setTonightCompleteAt(new Date().toISOString());
    }
  }, [allComplete, setTonightCompleteAt]);

  const markStep = useCallback(
    (id: string) => {
      setMarked((prev) => ({ ...prev, [id]: true }));
      const next = steps.find(
        (step) => step.id !== id && !marked[step.id]
      );
      setExpandedId(next ? next.id : null);
    },
    [steps, marked]
  );

  // v26 — surface the ONE thing that changed tonight. The current step
  // priority model treats required steps as the load-bearing changes.
  // We lead with the first required step's headline so the user reads
  // what's different *before* the rest of the routine. If nothing is
  // required, we fall through to a calm acknowledgement instead.
  const changedStep = steps.find(
    (step) => step.priority === 'required' && !marked[step.id]
  );
  const tonightEditLine =
    changedStep
      ? `Tonight, ${changedStep.title.toLowerCase()} is the one thing that changed.`
      : allComplete
      ? 'Tonight is closed. Nothing else is asked of you.'
      : 'Nothing has changed tonight. The plan you know is the plan.';

  return (
    <View style={s.gutter}>
      {/* v26 — Tonight's Edit banner. Surfaces the ONE thing that
          changed tonight, prominently, before the full routine. The
          spec is explicit that Routine must surface the one changed
          instruction immediately. */}
      <View style={tonightEditStyles.wrap}>
        <Text style={tonightEditStyles.eyebrow} maxFontSizeMultiplier={1.1}>
          TONIGHT’S EDIT
        </Text>
        <Text style={tonightEditStyles.line} maxFontSizeMultiplier={1.15}>
          {tonightEditLine}
        </Text>
      </View>

      <Card tone="surface" hero elevated style={tStyles.heroCard}>
        <SectionLabel style={{ marginBottom: 10 }}>TONIGHT</SectionLabel>
        <Text style={tStyles.heroHeadline} maxFontSizeMultiplier={1.15}>
          {'Calm breakouts.\nProtect your barrier.'}
        </Text>
        <Metadata style={{ marginTop: 12 }}>
          3 steps · About 5 minutes
        </Metadata>
        <View style={tStyles.progressTrack}>
          <View
            style={[
              tStyles.progressFill,
              { width: `${(completedCount / totalCount) * 100}%` },
            ]}
          />
        </View>
        <Text style={tStyles.progressLabel} maxFontSizeMultiplier={1.2}>
          {allComplete
            ? 'Routine complete'
            : `${completedCount} of ${totalCount} completed`}
        </Text>
      </Card>

      <View style={s.stepsList}>
        {steps.map((step) => {
          const stepForView: RoutineStepV25 = {
            ...step,
            completed: marked[step.id] ?? false,
          };
          return (
            <RoutineStepCard
              key={step.id}
              step={stepForView}
              expanded={expandedId === step.id && !stepForView.completed}
              onExpand={() =>
                setExpandedId((prev) => (prev === step.id ? null : step.id))
              }
              onMarkComplete={() => markStep(step.id)}
              onAlternativeComplete={() => markStep(step.id)}
              onAddOwnedProduct={onFindSpfMatch}
              onFindMatch={onFindSpfMatch}
              onAskWhy={() =>
                onAskAssist(
                  step.id === 'moisturize'
                    ? 'Why is moisturizer required tonight?'
                    : 'What does this step do for my skin?',
                  `${step.title} · ${
                    step.priority === 'required' ? 'Required' : 'Recommended'
                  } tonight`,
                  'Chin area active · Barrier support'
                )
              }
            />
          );
        })}
      </View>

      <AvoidTonightCard
        items={FIX_AVOID_TONIGHT}
        collapsed={avoidCollapsed}
        onToggle={() => setAvoidCollapsed((v) => !v)}
      />

      <MorningProtectionCard
        onPrimaryAction={onAddSpf}
        onSecondaryAction={onFindSpfMatch}
      />

      {allComplete ? (
        <RoutineCompletionCard
          completedTitles={steps.map((s) => s.title)}
          onReviewProgress={() => {
            /* parent owns navigation */
          }}
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Progress body
// ---------------------------------------------------------------------------

function ProgressBody({ onRetake }: { onRetake: () => void }) {
  const progressFixture = useV25Dev((s) => s.progress);

  return (
    <View style={s.gutter}>
      {progressFixture === 'failed-latest' ? (
        <SkinScoreHero
          variant="failed-latest"
          score={FIX_LATEST_RELIABLE.skinScore}
          interpretation="Breakouts remain your main focus. Hydration is beginning to improve."
          reliableScanCount={2}
        />
      ) : progressFixture === 'baseline-only' ? (
        <SkinScoreHero
          variant="baseline-only"
          score={FIX_BASELINE_SCAN.skinScore}
          interpretation="Complete another reliable scan to begin tracking visible change."
          reliableScanCount={1}
        />
      ) : (
        <SkinScoreHero
          variant="reliable-comparison"
          score={FIX_LATEST_RELIABLE.skinScore}
          delta={FIX_LATEST_RELIABLE.skinScore - FIX_BASELINE_SCAN.skinScore}
          interpretation="Breakouts remain your main focus. Hydration is beginning to improve."
          reliableScanCount={progressFixture === 'four-plus' ? 4 : 2}
        />
      )}

      {progressFixture === 'failed-latest' ? (
        <ScanQualityAlert variant="progress" onRetake={onRetake} />
      ) : null}

      <Card tone="raised" style={s.signalsCard}>
        <SectionLabel style={{ marginBottom: 10 }}>SKIN SIGNALS</SectionLabel>
        <View>
          {FIX_SIGNALS.map((signal, i) => (
            <SkinSignalRow
              key={signal.id}
              signal={signal}
              last={i === FIX_SIGNALS.length - 1}
            />
          ))}
        </View>
      </Card>

      {progressFixture === 'baseline-only' ? (
        <Card tone="raised" style={s.baselineCard}>
          <SectionLabel style={{ marginBottom: 8 }}>NEXT BEST ACTION</SectionLabel>
          <BodyPrimary>
            Complete another reliable scan in similar lighting to begin
            tracking visible progress.
          </BodyPrimary>
          <PrimaryButton
            label="Start scan"
            onPress={onRetake}
            variant="terracotta"
            style={{ marginTop: 14 }}
          />
        </Card>
      ) : progressFixture === 'four-plus' ? (
        <Card tone="raised" style={s.chartCard}>
          <SectionLabel style={{ marginBottom: 12 }}>SCORE TREND</SectionLabel>
          <View style={s.chartViewport}>
            <ChartMockup />
          </View>
          <BodyFunctional style={{ marginTop: 10 }}>
            +7 since baseline. Improvement is primarily driven by hydration and
            reduced breakout activity.
          </BodyFunctional>
        </Card>
      ) : (
        <ScoreComparisonCard
          baselineDay={FIX_BASELINE_SCAN.dayLabel}
          baselineScore={FIX_BASELINE_SCAN.skinScore}
          latestDay={FIX_LATEST_RELIABLE.dayLabel}
          latestScore={FIX_LATEST_RELIABLE.skinScore}
          driver="Improvement is driven primarily by improved hydration."
        />
      )}

      <Card tone="raised" style={s.nbaCard}>
        <SectionLabel style={{ marginBottom: 8 }}>NEXT BEST ACTION</SectionLabel>
        <BodyPrimary>
          {progressFixture === 'failed-latest'
            ? 'Retake today’s scan in bright, even light so Pura can create an accurate progress update.'
            : 'Complete a reliable scan tomorrow in similar lighting to continue tracking visible progress.'}
        </BodyPrimary>
        <PrimaryButton
          label={
            progressFixture === 'failed-latest' ? 'Retake scan now' : 'Start scan'
          }
          onPress={onRetake}
          variant="ink"
          style={{ marginTop: 14 }}
        />
        <TextAction
          label="Review tonight’s routine"
          onPress={() => {}}
          style={{ marginTop: 10, alignSelf: 'flex-start' }}
        />
      </Card>
    </View>
  );
}

function ChartMockup() {
  // Lightweight chart mockup so the 4+ reliable scan state isn't blank.
  // A polished chart implementation lives behind the recharts-react-native
  // story (not currently in deps); this view communicates the visual
  // intent: filled terracotta line + dots, hollow muted markers for
  // failed attempts.
  return (
    <View style={s.chartLane}>
      {[60, 58, 62, 65, 64, 67].map((v, i) => {
        const failed = i === 3;
        return (
          <View key={i} style={s.chartCol}>
            <View
              style={{
                height: 96 * (v / 100),
                width: 2,
                backgroundColor: failed ? T.line : T.terracotta,
              }}
            />
            <View
              style={[
                s.chartDot,
                failed && {
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: T.inkMuted,
                },
              ]}
            />
            <Text style={s.chartLabel} maxFontSizeMultiplier={1.0}>
              Day {i * 3 + 1}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const tabStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: TYPE.sansSemi,
    fontSize: 13,
    color: T.inkMuted,
    letterSpacing: 0.4,
  },
  labelOn: { color: T.ink },
  indicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    width: '50%',
    height: 2,
    borderRadius: 2,
    backgroundColor: T.terracotta,
  },
});

const tonightEditStyles = StyleSheet.create({
  wrap: {
    borderLeftWidth: 2,
    borderLeftColor: pura26.terracotta,
    paddingLeft: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 2.2,
    color: pura26.terracottaText,
    marginBottom: 8,
  },
  line: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: pura26.ink,
  },
});

const tStyles = StyleSheet.create({
  heroCard: {},
  heroHeadline: {
    fontFamily: TYPE.serif,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: T.ink,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: T.line,
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: T.terracotta,
  },
  progressLabel: {
    fontFamily: TYPE.sansMed,
    fontSize: 12,
    color: T.inkMuted,
    marginTop: 8,
  },
});

const s = StyleSheet.create({
  tabsWrap: { paddingHorizontal: SPACE.gutter },
  gutter: {
    paddingHorizontal: SPACE.gutter,
    paddingTop: 18,
    gap: SPACE.cardGap,
  },
  stepsList: { gap: 10 },
  signalsCard: { gap: 0 },
  baselineCard: { gap: 6 },
  chartCard: { gap: 6 },
  chartViewport: {
    height: 120,
    paddingTop: 6,
  },
  chartLane: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
  },
  chartCol: {
    alignItems: 'center',
    gap: 6,
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.terracotta,
  },
  chartLabel: {
    fontFamily: TYPE.sans,
    fontSize: 10,
    color: T.inkMuted,
  },
  nbaCard: { gap: 4 },
});

// quiet unused exports
void RADIUS;
