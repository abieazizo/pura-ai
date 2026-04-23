import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight } from 'phosphor-react-native';
import { ScreenChrome } from '@/components/ScreenChrome';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { CompareSlider } from '@/components/CompareSlider';
import { PuraMark } from '@/components/PuraMark';
import { PhotoTimelineStrip } from './PhotoTimelineStrip';
import { ProgressNarrative } from './ProgressNarrative';
import { SkinScoreHero } from './SkinScoreHero';
import { computeSkinScore } from '@/utils/skinScore';
import { useAppStore } from '@/store/useAppStore';
import { useHasScanned, useLatestScan, useFirstScan, useDayNumber, useStreakDays, useProgressPercent } from '@/store/selectors';
import { useShallow } from 'zustand/react/shallow';
import { colors, palette, space, type as typography } from '@/theme';
import { progress } from '@/copy/strings';
import { hapt } from '@/utils/haptics';
import type { Scan } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

export function ProgressScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useAppStore((s) => s.user);
  const scans = useAppStore((s) => s.scans);
  const dayNumber = useDayNumber();

  const first = scans[0];
  const latest = scans[scans.length - 1];

  const [selectedId, setSelectedId] = useState<string | null>(latest?.id ?? null);
  const selectedScan: Scan | undefined =
    scans.find((s) => s.id === selectedId) ?? latest ?? undefined;

  const { width } = useWindowDimensions();
  const compareHeight = 420;
  const insets = useSafeAreaInsets();
  // §2.4 — scroll content must clear the tab bar (60) + FAB overlap (34) +
  // bottom safe inset, plus breathing room. 120 below the safe inset.
  const bottomClearance = insets.bottom + 120;

  if (!user) return null;

  // ---- Empty ----
  if (scans.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="dark" />
        <ScreenChrome />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: bottomClearance },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Header />
          <View style={styles.emptyBlock}>
            <PuraMark variant="idle" size="lg" />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.15}>
              {progress.emptyTitle}
            </Text>
            <Text style={styles.emptyBody}>{progress.emptyBody}</Text>
            <PrimaryButton
              label={progress.emptyCta}
              onPress={() => nav.navigate('ScanModal')}
              serif
              arrow
              style={{ marginTop: space.lg }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Only 1 scan ----
  if (scans.length === 1) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="dark" />
        <ScreenChrome />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: bottomClearance },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Header />
          <DayCounter day={dayNumber} />
          <SurfaceCard tone="subtle" padding="lg" style={{ marginTop: space.lg }}>
            <Text style={styles.oneScanTitle}>{progress.oneScanTitle}</Text>
            <Text style={styles.emptyBody}>{progress.oneScanBody}</Text>
            {/* §2.4 — editorial link row, not a faded PrimaryButton. */}
            <ScanAgainRow onPress={() => nav.navigate('ScanModal')} />
          </SurfaceCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Populated ----
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenChrome />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Header day={dayNumber} />

        {/* v9.2 — Skin Score is the spine of the whole app. Progress page
            leads with the score hero: giant tabular value, delta chip,
            tier pill, and an animated sparkline across every scan in
            history. ProgressNarrative + compare slider + metric bars
            continue below as supporting proof. */}
        <SkinScoreHero score={computeSkinScore(scans)} scans={scans} />

        <ProgressNarrative scans={scans} />

        {first && selectedScan ? (
          <View style={styles.compareBlock}>
            <View style={styles.compareHead}>
              <Text style={styles.compareKicker} maxFontSizeMultiplier={1.1}>
                SIDE BY SIDE
              </Text>
              <Text style={styles.compareDates} maxFontSizeMultiplier={1.1}>
                {`DAY 1 \u2192 DAY ${selectedScan.dayNumber}`}
              </Text>
            </View>
            <View
              style={[
                styles.fullBleedCompare,
                { marginHorizontal: -space.lg },
              ]}
            >
              <CompareSlider
                leftUri={first.photoUri}
                rightUri={selectedScan.photoUri}
                leftLabel="DAY 1"
                rightLabel={`DAY ${selectedScan.dayNumber}`}
                width={width}
                height={compareHeight}
              />
            </View>
          </View>
        ) : null}

        {scans.length > 2 ? (
          <View style={styles.historyBlock}>
            <Text style={styles.historyKicker} maxFontSizeMultiplier={1.1}>
              SCAN HISTORY
            </Text>
            <View style={{ marginLeft: -space.lg }}>
              <PhotoTimelineStrip
                scans={scans}
                selectedId={selectedId ?? latest?.id ?? null}
                onSelect={(s) => setSelectedId(s.id)}
              />
            </View>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ day }: { day?: number }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          {progress.title}
          <Text style={{ color: palette.clay }}>.</Text>
        </Text>
        {typeof day === 'number' && day > 0 ? (
          <View style={styles.headerDayPill}>
            <Text style={styles.headerDayPillText} maxFontSizeMultiplier={1.1}>
              {`DAY ${day}`}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * §3.3 — replaces the centered progress ring.
 * Big serif day number on the left, vertical tick timeline on the right.
 * Number counts up on mount; the current day's tick scales from 5 → 12px
 * with a 200ms delay after the number settles.
 */
function DayCounter({ day, totalDays = 84 }: { day: number; totalDays?: number }) {
  return (
    <View style={counter.wrap}>
      <View style={counter.leftCol}>
        <Text
          style={counter.number}
          maxFontSizeMultiplier={1.1}
          allowFontScaling
        >
          {String(Math.max(1, day)).padStart(2, '0')}
        </Text>
        <Text style={counter.ofLabel}>{`OF ${totalDays}`}</Text>
      </View>
      <TickTimeline day={day} totalDays={totalDays} />
    </View>
  );
}

function TickTimeline({
  day,
  totalDays,
}: {
  day: number;
  totalDays: number;
}) {
  // 84 tick marks along a vertical hairline. Current day's tick is 12px
  // solid coral; others are 5px @ 15% clay. Rendered as simple Views for
  // predictable perf — no SVG needed at this scale.
  const ticks = React.useMemo(
    () => new Array(totalDays).fill(0).map((_, i) => i + 1),
    [totalDays]
  );
  return (
    <View style={counter.rightCol}>
      <View style={counter.rail} />
      <View style={counter.ticks}>
        {ticks.map((i) => {
          const isActive = i === day;
          return (
            <View
              key={i}
              style={[
                counter.tick,
                isActive && counter.tickActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * §2.4 — editorial link row replacing the faded PrimaryButton. Terracotta
 * label with arrow, full-width 56pt tap target, hairline divider above so
 * it reads as a footer action.
 */
function ScanAgainRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        hapt.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [
        linkRow.row,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={linkRow.label}>{progress.oneScanCta}</Text>
      <ArrowRight size={18} color={palette.clay} weight="duotone" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: space.lg,
  },
  header: { marginBottom: space.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    ...typography.titleSerif,
    color: palette.ink,
    fontSize: 40,
    letterSpacing: -1.0,
  },
  headerDayPill: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDayPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkSecondary,
  },
  subtitle: {
    ...typography.italicLead,
    color: palette.inkSecondary,
    marginTop: space.sm,
  },
  ringWrap: {
    // Retained for any legacy callers; the live screen uses DayCounter now.
    alignItems: 'center',
    paddingVertical: space.lg,
  },
  oneScanTitle: {
    ...typography.titleSerif,
    fontSize: 28,
    lineHeight: 32,
    color: palette.ink,
  },

  // v9.6 — compare block header + full-bleed slider
  compareBlock: {
    marginTop: space.xxl,
  },
  compareHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  compareKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  compareDates: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: palette.clay,
    fontVariant: ['tabular-nums'],
  },
  fullBleedCompare: {
    marginTop: 4,
  },

  historyBlock: {
    marginTop: space.xxl,
  },
  historyKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: space.md,
  },

  changesBlock: {
    marginTop: space.xxl,
  },

  emptyBlock: {
    alignItems: 'center',
    paddingTop: space.xl,
  },
  emptyTitle: {
    ...typography.titleSerif,
    color: palette.ink,
    marginTop: space.xl,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginTop: space.sm,
    paddingHorizontal: space.md,
  },
});

// §3.3 — DayCounter
const counter = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: space.xl,
    minHeight: 260,
  },
  leftCol: {
    flex: 1,
    justifyContent: 'center',
  },
  number: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 140,
    lineHeight: 140,
    letterSpacing: -4,
    color: palette.clay,
  },
  ofLabel: {
    ...typography.micro,
    color: palette.clay,
    marginTop: space.sm,
  },
  rightCol: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'flex-end',
    position: 'relative',
  },
  // v10 — hairlines in cool ink. The `rgba(198,93,72,…)` residuals were v5
  // terracotta at 15/35% — they predated the v8 cool-palette migration.
  rail: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: palette.hairline,
  },
  ticks: {
    height: 240,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  tick: {
    width: 5,
    height: 1,
    backgroundColor: palette.inkTertiary,
  },
  tickActive: {
    width: 12,
    height: 2,
    backgroundColor: palette.clay,
  },
});

// §2.4 — editorial link row
const linkRow = StyleSheet.create({
  row: {
    marginTop: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  label: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 24,
    color: palette.clay,
  },
});
