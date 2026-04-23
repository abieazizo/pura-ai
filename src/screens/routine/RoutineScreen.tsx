import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Sun, Moon, BookmarkSimple, ArrowRight } from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { CompareSlider } from '@/components/CompareSlider';
import { SkinScoreHero } from '@/screens/progress/SkinScoreHero';
import { ProgressNarrative } from '@/screens/progress/ProgressNarrative';
import { PhotoTimelineStrip } from '@/screens/progress/PhotoTimelineStrip';
import { useAppStore } from '@/store/useAppStore';
import { computeSkinScore } from '@/utils/skinScore';
import { palette, space } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { Scan } from '@/types';

/**
 * RoutineScreen — v10.11 unified daily destination.
 *
 * The product architecture changed: the floating ProgressTab was
 * removed and its content moved inside Routine. This screen is now the
 * user's one long-format destination for "what am I doing today, and
 * how is it going?":
 *
 *   1. Segmented morning / evening / saved — daily action center
 *   2. Boundary rule ("YOUR TRAJECTORY")
 *   3. Embedded Progress section:
 *        • SkinScoreHero     (dial + celebration + chart)
 *        • ProgressNarrative (biggest-win headline + tier transitions)
 *        • CompareSlider     (before/after, full-bleed)
 *        • PhotoTimelineStrip (scan history)
 *
 * Pre-scan users see the daily segments with empty states + the scan
 * CTA; the Progress section is hidden until at least two scans exist
 * (one reading is not a trajectory).
 */

type Segment = 'morning' | 'evening' | 'saved';

const SEGMENTS: Array<{ id: Segment; label: string; Icon: React.FC<any> }> = [
  { id: 'morning', label: 'Morning', Icon: Sun },
  { id: 'evening', label: 'Evening', Icon: Moon },
  { id: 'saved',   label: 'Saved',   Icon: BookmarkSimple },
];

export function RoutineScreen() {
  const [active, setActive] = useState<Segment>('morning');
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const scans = useAppStore((s) => s.scans);
  const hasScanned = scans.length > 0;
  const firstScan = scans[0];
  const latestScan = scans[scans.length - 1];
  const showProgress = scans.length >= 2;

  const { width } = useWindowDimensions();
  const compareHeight = 420;

  const handleSelect = (id: Segment) => {
    if (id === active) return;
    hapt.select();
    setActive(id);
  };

  const handlePrimary = () => {
    hapt.tap();
    // Context-aware CTA. Scanned users build from the plan; pre-scan
    // users take their first scan.
    if (hasScanned) {
      // @ts-expect-error nested stack nav
      nav.navigate?.('Tabs', {
        screen: 'HomeTab',
        params: { screen: 'Plan' },
      });
      return;
    }
    nav.navigate('ScanModal');
  };

  const primaryLabel = hasScanned ? 'Build from my plan' : 'Start with a scan';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.headerRow}>
        <PuraMark size={26} variant="idle" />
        <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
          Pura AI
        </Text>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            YOUR ROUTINE
          </Text>
          <Text style={styles.title} maxFontSizeMultiplier={1.15}>
            Routine.
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
            Your daily steps, and how your skin is tracking.
          </Text>
        </View>

        <View style={styles.segmentedWrap}>
          <View style={styles.segmented}>
            {SEGMENTS.map((seg) => {
              const selected = seg.id === active;
              const Icon = seg.Icon;
              return (
                <Pressable
                  key={seg.id}
                  onPress={() => handleSelect(seg.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${seg.label} routine`}
                  style={({ pressed }) => [
                    styles.segment,
                    selected && styles.segmentSelected,
                    pressed && !selected && { opacity: 0.85 },
                  ]}
                >
                  <Icon
                    size={14}
                    color={selected ? palette.inkInverse : palette.inkSecondary}
                    weight={selected ? 'duotone' : 'regular'}
                  />
                  <Text
                    style={[
                      styles.segmentLabel,
                      { color: selected ? palette.inkInverse : palette.inkSecondary },
                    ]}
                    maxFontSizeMultiplier={1.1}
                  >
                    {seg.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {active === 'morning' ? (
          <EmptyPanel
            heading="No morning steps yet."
            body={
              hasScanned
                ? 'Build your morning from your last scan\u2019s plan. Steps you add persist here.'
                : 'Your morning routine builds from your first scan. It takes thirty seconds.'
            }
            cta={primaryLabel}
            onCta={handlePrimary}
          />
        ) : null}

        {active === 'evening' ? (
          <EmptyPanel
            heading="No evening steps yet."
            body={
              hasScanned
                ? 'Evening is where repair happens. Add targeted steps from your plan.'
                : 'Evening routines focus on repair. Start with a scan to tailor yours.'
            }
            cta={primaryLabel}
            onCta={handlePrimary}
          />
        ) : null}

        {active === 'saved' ? (
          <EmptyPanel
            heading="Nothing saved."
            body="Products you bookmark while exploring land here, so you can come back to decide."
            cta="Explore products"
            onCta={() => {
              hapt.tap();
              // @ts-expect-error nested stack nav
              nav.navigate?.('Tabs', { screen: 'ProductsTab' });
            }}
          />
        ) : null}

        {/* v10.11 — embedded Progress. Only renders with ≥2 scans; one
            reading isn't a trajectory. A boundary rule introduces the
            section so the daily actions above and the trend proof
            below read as two intentional halves of the same page. */}
        {showProgress && firstScan && latestScan ? (
          <>
            <View style={styles.boundary}>
              <View style={styles.boundaryRule} />
              <Text style={styles.boundaryKicker} maxFontSizeMultiplier={1.1}>
                YOUR TRAJECTORY
              </Text>
              <View style={styles.boundaryRule} />
            </View>

            <SkinScoreHero score={computeSkinScore(scans)} scans={scans} />

            <ProgressNarrative scans={scans} />

            <ProgressCompareBlock
              first={firstScan}
              latest={latestScan}
              width={width}
              compareHeight={compareHeight}
            />

            {scans.length > 2 ? (
              <View style={styles.historyBlock}>
                <Text style={styles.historyKicker} maxFontSizeMultiplier={1.1}>
                  SCAN HISTORY
                </Text>
                <View style={{ marginLeft: -space.lg }}>
                  <PhotoTimelineStrip
                    scans={scans}
                    selectedId={latestScan.id}
                    onSelect={() => {
                      // Timeline selection is visual only on Routine;
                      // tapping a history frame doesn't swap the compare
                      // image here — the CompareSlider is fixed to
                      // first-vs-latest for the celebration read.
                    }}
                  />
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        <Text style={styles.footerHint} maxFontSizeMultiplier={1.2}>
          Your saved steps live here. They follow you across scans.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressCompareBlock({
  first,
  latest,
  width,
  compareHeight,
}: {
  first: Scan;
  latest: Scan;
  width: number;
  compareHeight: number;
}) {
  return (
    <View style={styles.compareBlock}>
      <View style={styles.compareHead}>
        <Text style={styles.compareKicker} maxFontSizeMultiplier={1.1}>
          SIDE BY SIDE
        </Text>
        <Text style={styles.compareDates} maxFontSizeMultiplier={1.1}>
          {`DAY 1 \u2192 DAY ${latest.dayNumber}`}
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
          rightUri={latest.photoUri}
          leftLabel="DAY 1"
          rightLabel={`DAY ${latest.dayNumber}`}
          width={width}
          height={compareHeight}
        />
      </View>
    </View>
  );
}

function EmptyPanel({
  heading,
  body,
  cta,
  onCta,
}: {
  heading: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelMark}>
        <PuraMark size={44} variant="idle" />
      </View>
      <Text style={styles.panelHeading} maxFontSizeMultiplier={1.2}>
        {heading}
      </Text>
      <Text style={styles.panelBody} maxFontSizeMultiplier={1.2}>
        {body}
      </Text>

      <Pressable
        onPress={onCta}
        accessibilityRole="button"
        accessibilityLabel={cta}
        style={({ pressed }) => [
          styles.primaryCta,
          pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
          {cta}
        </Text>
        <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  scroll: {
    paddingBottom: 140,
  },

  // Header
  headerRow: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    letterSpacing: -0.3,
    color: palette.ink,
  },

  // Title block
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.0,
    color: palette.ink,
  },
  subtitle: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 24,
    color: palette.inkSecondary,
    marginTop: 10,
    maxWidth: '85%',
  },

  // Segmented
  segmentedWrap: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: palette.bgDeep,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentSelected: {
    backgroundColor: palette.ink,
  },
  segmentLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // Boundary between daily actions and embedded Progress
  boundary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 40,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  boundaryRule: {
    flex: 1,
    height: 1,
    backgroundColor: palette.hairline,
  },
  boundaryKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.8,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },

  // Embedded compare block (same vocabulary as the old ProgressScreen)
  compareBlock: {
    marginTop: space.xxl,
  },
  compareHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
    paddingHorizontal: space.lg,
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

  // Scan history strip (only ≥3 scans)
  historyBlock: {
    marginTop: space.xxl,
    paddingHorizontal: space.lg,
  },
  historyKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: space.md,
  },

  // Segment empty panel
  panel: {
    marginTop: 40,
    marginHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'center',
  },
  panelMark: {
    marginBottom: 24,
  },
  panelHeading: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  panelBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 280,
  },
  primaryCta: {
    height: 44,
    minWidth: 200,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },

  footerHint: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 20,
    color: palette.inkTertiary,
    textAlign: 'center',
    marginTop: 40,
    marginHorizontal: 32,
  },
});
