/**
 * v25 — HomeScreen.
 *
 * The shim at `src/screens/home/v25/HomeV25Screen.tsx` re-exports this
 * module so the TabNavigator import path stays stable. The actual
 * redesigned daily command center lives here.
 *
 * Renders the four documented daily-scan states from a single shell:
 *   • no-valid-scan-today   — daily scan CTA + historical insights
 *   • valid-scan-today      — tonight's plan + why-it-changed + score peek
 *   • failed-scan-today     — scan-not-counted alert + last reliable results
 *   • tonight-complete      — completion-aware home
 *
 * The header long-press opens the review panel so reviewers can cycle
 * through every state without exercising the backend.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  CameraSlash,
  CheckCircle,
  Drop,
  ScanSmiley,
  ShieldCheck,
  Sparkle,
} from 'phosphor-react-native';
import {
  AppShell,
  PageHeader,
  Card,
  PrimaryButton,
  TextAction,
  InsightRow,
  SectionLabel,
  BodyPrimary,
  BodyFunctional,
  CardHeadline,
  ScanQualityAlert,
  ReviewPanel,
  T,
  TYPE,
  SPACE,
} from '@/components/v25';
import {
  FIX_CAPTURE_TIPS,
  FIX_HISTORICAL_INSIGHTS,
  FIX_LATEST_RELIABLE,
  FIX_PLAN_CHANGE_INSIGHTS,
} from '@/state/v25/fixtures';
import { useV25Dev } from '@/state/v25/devSwitch';
import { useAppStore } from '@/store/useAppStore';
import type { RootStackParamList } from '@/navigation/types';

/** Returns an appropriate greeting phrase for the current hour. */
function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

export function HomeScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const dailyScan = useV25Dev((s) => s.dailyScan);
  const openPanel = useV25Dev((s) => s.setPanelOpen);
  const user = useAppStore((s) => s.user);
  const userName = user?.name?.split(' ')[0] ?? 'there';
  const userInitials = user?.initials ?? '?';

  const openScan = useCallback(() => {
    nav.navigate('ScanModal');
  }, [nav]);

  const openRoutine = useCallback(() => {
    // @ts-expect-error tabs param
    nav.navigate?.('Tabs', { screen: 'RoutineTab' });
  }, [nav]);

  const openProgress = useCallback(() => {
    // @ts-expect-error tabs param
    nav.navigate?.('Tabs', { screen: 'RoutineTab' });
  }, [nav]);

  const openAssistant = useCallback(() => {
    // @ts-expect-error tabs param
    nav.navigate?.('Tabs', { screen: 'AssistantTab' });
  }, [nav]);

  const subtitle = useMemo(() => {
    switch (dailyScan) {
      case 'no-valid-scan-today':
        return 'Ready for your daily check-in?';
      case 'valid-scan-today':
        return "Updated from today's scan";
      case 'failed-scan-today':
        return "Today's scan needs a retake";
      case 'tonight-complete':
        return 'Routine complete tonight';
    }
  }, [dailyScan]);

  // Re-animate the content block on every state transition so the new
  // content feels like it arrives, not like it was always there.
  const contentOp = useSharedValue(0);
  const contentY = useSharedValue(12);

  useEffect(() => {
    contentOp.value = 0;
    contentY.value = 12;
    const ease = Easing.out(Easing.cubic);
    contentOp.value = withTiming(1, { duration: 380, easing: ease });
    contentY.value = withTiming(0, { duration: 380, easing: ease });
  }, [dailyScan, contentOp, contentY]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOp.value,
    transform: [{ translateY: contentY.value }],
  }));

  return (
    <>
      <AppShell>
        <Pressable
          onLongPress={() => openPanel(true)}
          delayLongPress={500}
          accessibilityRole="header"
          accessibilityHint="Long press to open review panel"
          style={{ position: 'relative' }}
        >
          <PageHeader
            greetingTitle={`${timeOfDayGreeting()}, ${userName}`}
            subtitle={subtitle}
            right={<ProfileMark initials={userInitials} />}
          />
        </Pressable>

        <Animated.View style={[s.gutter, contentStyle]}>
          {dailyScan === 'no-valid-scan-today' && (
            <NoScanState
              onStartScan={openScan}
              onAskAssistant={openAssistant}
            />
          )}
          {dailyScan === 'valid-scan-today' && (
            <ValidScanState
              onOpenRoutine={openRoutine}
              onOpenProgress={openProgress}
            />
          )}
          {dailyScan === 'failed-scan-today' && (
            <FailedScanState
              onRetake={openScan}
              onLastReliable={openRoutine}
            />
          )}
          {dailyScan === 'tonight-complete' && (
            <TonightCompleteState onOpenProgress={openProgress} />
          )}
        </Animated.View>
      </AppShell>
      <ReviewPanel />
    </>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function NoScanState({
  onStartScan,
  onAskAssistant,
}: {
  onStartScan: () => void;
  onAskAssistant: () => void;
}) {
  return (
    <>
      <Card tone="surface" hero elevated style={s.heroCard}>
        <SectionLabel style={s.heroEyebrow}>DAILY SCAN</SectionLabel>
        <Text style={s.heroHeadline} maxFontSizeMultiplier={1.15}>
          {'See what your skin\nneeds tonight'}
        </Text>
        <BodyPrimary style={s.heroBody}>
          Complete a 20-second scan to personalize tonight’s routine and update
          your progress.
        </BodyPrimary>
        <PrimaryButton
          label="Start scan"
          onPress={onStartScan}
          variant="terracotta"
          RightIcon={ScanSmiley}
          style={{ marginTop: 18 }}
        />
        <View style={s.trustRow}>
          <ShieldCheck size={13} color={T.inkMuted} weight="duotone" />
          <Text style={s.trustText} maxFontSizeMultiplier={1.2}>
            Private by default · Results in seconds
          </Text>
        </View>
      </Card>

      <Card tone="raised" style={s.insightsCard}>
        <SectionLabel style={s.insightsEyebrow}>
          FROM YOUR LAST RELIABLE SCAN
        </SectionLabel>
        <View style={s.insightsList}>
          {FIX_HISTORICAL_INSIGHTS.map((row, i, arr) => (
            <InsightRow
              key={row.title}
              title={row.title}
              body={row.body}
              badge={row.badge}
              last={i === arr.length - 1}
            />
          ))}
        </View>
        <Text style={s.insightsMeta} maxFontSizeMultiplier={1.25}>
          Last measured 4 days ago
        </Text>
      </Card>

      <Card tone="mist" style={s.assistantCard}>
        <View style={s.assistantHead}>
          <Sparkle size={18} color={T.terracottaDeep} weight="duotone" />
          <CardHeadline style={s.assistantHeadline}>
            Questions before you scan?
          </CardHeadline>
        </View>
        <BodyPrimary style={s.assistantBody}>
          Ask about product conflicts, sensitivity, or what tonight’s routine
          may include.
        </BodyPrimary>
        <TextAction
          label="Ask AI Assist"
          onPress={onAskAssistant}
          style={{ marginTop: 10 }}
        />
      </Card>
    </>
  );
}

function ValidScanState({
  onOpenRoutine,
  onOpenProgress,
}: {
  onOpenRoutine: () => void;
  onOpenProgress: () => void;
}) {
  return (
    <>
      <Card tone="surface" hero elevated style={s.heroCard}>
        <View style={s.tonightAccent} />
        <SectionLabel style={s.heroEyebrow}>TONIGHT’S PLAN</SectionLabel>
        <Text style={s.heroHeadline} maxFontSizeMultiplier={1.15}>
          {'Calm chin activity.\nKeep hydration steady.'}
        </Text>
        <BodyPrimary style={s.heroBody}>
          Your scan found mild breakout activity around the chin with no new
          irritation elsewhere.
        </BodyPrimary>
        <PrimaryButton
          label="View tonight’s routine"
          onPress={onOpenRoutine}
          variant="terracotta"
          style={{ marginTop: 18 }}
        />
        <Text style={s.heroMeta} maxFontSizeMultiplier={1.2}>
          3 steps · About 5 minutes · Updated today
        </Text>
      </Card>

      <Card tone="raised" style={s.insightsCard}>
        <SectionLabel style={s.insightsEyebrow}>
          WHY YOUR PLAN CHANGED
        </SectionLabel>
        <View style={s.insightsList}>
          {FIX_PLAN_CHANGE_INSIGHTS.map((row, i, arr) => (
            <InsightRow
              key={row.title}
              title={row.title}
              body={row.body}
              badge={row.badge}
              last={i === arr.length - 1}
            />
          ))}
        </View>
      </Card>

      <Card tone="raised" style={s.progressCard}>
        <View style={s.progressTop}>
          <SectionLabel>PROGRESS</SectionLabel>
        </View>
        <View style={s.progressRow}>
          <View>
            <Text style={s.progressScoreLabel} maxFontSizeMultiplier={1.15}>
              Skin Score
            </Text>
            <Text style={s.progressScore} maxFontSizeMultiplier={1.1}>
              {FIX_LATEST_RELIABLE.skinScore}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={s.progressTrendCol}>
            <Text style={s.progressTrend} maxFontSizeMultiplier={1.2}>
              ↑ +2 since baseline
            </Text>
            <Text style={s.progressMeta} maxFontSizeMultiplier={1.25}>
              Based on 2 reliable scans
            </Text>
          </View>
        </View>
        <TextAction
          label="View progress"
          onPress={onOpenProgress}
          style={{ marginTop: 12 }}
        />
      </Card>
    </>
  );
}

function FailedScanState({
  onRetake,
  onLastReliable,
}: {
  onRetake: () => void;
  onLastReliable: () => void;
}) {
  return (
    <>
      <ScanQualityAlert
        variant="home"
        onRetake={onRetake}
        onLastReliable={onLastReliable}
      />

      <Card tone="raised" style={s.lastReliableCard}>
        <SectionLabel style={s.lastReliableEyebrow}>
          LAST RELIABLE RESULTS
        </SectionLabel>
        <Text style={s.lastReliableScore} maxFontSizeMultiplier={1.1}>
          Skin Score {FIX_LATEST_RELIABLE.skinScore}
        </Text>
        <BodyFunctional style={s.lastReliableMeta}>
          Based on your previous valid scan
        </BodyFunctional>
        <View style={s.lastReliableList}>
          <Text style={s.lastReliableBullet} maxFontSizeMultiplier={1.25}>
            · Chin area needed calming care
          </Text>
          <Text style={s.lastReliableBullet} maxFontSizeMultiplier={1.25}>
            · Hydration was improving
          </Text>
        </View>
      </Card>

      <Card tone="raised" style={s.tipsCard}>
        <View style={s.tipsHead}>
          <CameraSlash size={18} color={T.terracottaDeep} weight="duotone" />
          <CardHeadline style={s.tipsHeadline}>
            How to get a reliable scan
          </CardHeadline>
        </View>
        <View style={s.tipsList}>
          {FIX_CAPTURE_TIPS.map((tip) => (
            <View key={tip} style={s.tipRow}>
              <Drop size={12} color={T.terracotta} weight="fill" />
              <Text style={s.tipText} maxFontSizeMultiplier={1.2}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
        <TextAction
          label="View capture tips"
          onPress={onRetake}
          style={{ marginTop: 10 }}
        />
      </Card>
    </>
  );
}

function TonightCompleteState({
  onOpenProgress,
}: {
  onOpenProgress: () => void;
}) {
  return (
    <>
      <Card tone="sage" hero elevated style={s.completeCard}>
        <SectionLabel style={[s.heroEyebrow, { color: T.sage }]}>
          TONIGHT COMPLETE
        </SectionLabel>
        <Text style={s.heroHeadline} maxFontSizeMultiplier={1.15}>
          {'Your skin has what\nit needs tonight.'}
        </Text>
        <BodyPrimary style={s.heroBody}>
          You completed a gentle routine built around today’s reliable scan.
        </BodyPrimary>
        <View style={s.completeRow}>
          <CheckCircle size={18} color={T.sage} weight="fill" />
          <Text style={s.completeText} maxFontSizeMultiplier={1.2}>
            3 of 3 steps completed
          </Text>
        </View>
      </Card>

      <Card tone="amber" style={s.morningCard}>
        <SectionLabel style={[s.morningEyebrow]}>TOMORROW MORNING</SectionLabel>
        <CardHeadline style={s.morningTitle}>SPF 30+ is your priority step</CardHeadline>
        <BodyPrimary style={s.morningBody}>
          Protect progress before going out.
        </BodyPrimary>
        <TextAction
          label="Review progress"
          onPress={onOpenProgress}
          style={{ marginTop: 10 }}
        />
      </Card>

      <Card tone="raised" style={s.nextScanCard}>
        <BodyPrimary style={s.nextScanText}>
          Scan tomorrow in similar lighting for a more accurate comparison.
        </BodyPrimary>
      </Card>
    </>
  );
}

function ProfileMark({ initials }: { initials: string }) {
  return (
    <View style={s.avatar}>
      <Text style={s.avatarInitial} maxFontSizeMultiplier={1.1}>
        {initials}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  gutter: {
    paddingHorizontal: SPACE.gutter,
    gap: SPACE.cardGap,
  },
  heroCard: {
    gap: 6,
    paddingBottom: SPACE.heroPad + 2,
  },
  tonightAccent: {
    height: 3,
    width: 28,
    borderRadius: 2,
    backgroundColor: T.terracotta,
    marginBottom: 14,
  },
  heroEyebrow: { marginBottom: 10 },
  heroHeadline: {
    fontFamily: TYPE.serif,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: T.ink,
  },
  heroBody: { color: T.inkSecondary, marginTop: 12 },
  heroMeta: {
    fontFamily: TYPE.sansMed,
    fontSize: 12,
    color: T.inkMuted,
    marginTop: 14,
    textAlign: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  trustText: {
    fontFamily: TYPE.sansMed,
    fontSize: 12,
    color: T.inkMuted,
  },
  insightsCard: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  insightsEyebrow: {
    paddingHorizontal: SPACE.cardPad,
    paddingTop: 16,
    marginBottom: 4,
  },
  insightsList: {
    paddingHorizontal: 0,
  },
  insightsMeta: {
    paddingHorizontal: SPACE.cardPad,
    paddingBottom: 14,
    paddingTop: 6,
    fontFamily: TYPE.sansMed,
    fontSize: 12,
    color: T.inkMuted,
  },
  assistantCard: {
    gap: 8,
  },
  assistantHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assistantHeadline: { color: T.ink },
  assistantBody: { color: T.inkSecondary },
  progressCard: {
    gap: 6,
  },
  progressTop: { marginBottom: 6 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressScoreLabel: {
    fontFamily: TYPE.sansSemi,
    fontSize: 12,
    color: T.inkMuted,
    letterSpacing: 0.4,
  },
  progressScore: {
    fontFamily: TYPE.serifSemi,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -0.8,
    color: T.ink,
    marginTop: 4,
  },
  progressTrendCol: { alignItems: 'flex-end' },
  progressTrend: {
    fontFamily: TYPE.sansSemi,
    fontSize: 13,
    color: T.sage,
  },
  progressMeta: {
    fontFamily: TYPE.sans,
    fontSize: 12,
    color: T.inkMuted,
    marginTop: 4,
  },
  lastReliableCard: {
    gap: 6,
  },
  lastReliableEyebrow: { marginBottom: 4 },
  lastReliableScore: {
    fontFamily: TYPE.serifSemi,
    fontSize: 28,
    color: T.ink,
  },
  lastReliableMeta: { color: T.inkMuted },
  lastReliableList: { marginTop: 12, gap: 4 },
  lastReliableBullet: {
    fontFamily: TYPE.sansMed,
    fontSize: 14,
    color: T.inkSecondary,
  },
  tipsCard: {
    gap: 8,
  },
  tipsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipsHeadline: { color: T.ink },
  tipsList: { marginTop: 8, gap: 8 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontFamily: TYPE.sansMed,
    fontSize: 13.5,
    color: T.inkSecondary,
  },
  completeCard: {
    paddingBottom: SPACE.heroPad,
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  completeText: {
    fontFamily: TYPE.sansSemi,
    fontSize: 14,
    color: T.sage,
  },
  morningCard: { gap: 6 },
  morningEyebrow: { color: T.amber, marginBottom: 6 },
  morningTitle: { color: T.ink },
  morningBody: { color: T.amber },
  nextScanCard: { gap: 4 },
  nextScanText: { color: T.inkSecondary },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.terracottaSoft,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: TYPE.sansSemi,
    fontSize: 14,
    color: T.terracottaDeep,
  },
});
