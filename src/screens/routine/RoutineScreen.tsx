import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Sun, Moon, BookmarkSimple, ArrowRight } from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { RootStackParamList } from '@/navigation/types';

/**
 * RoutineScreen — v8 placeholder.
 *
 * Functional shell for the routine tab. Gives users a proper home for
 * "what am I doing today" that matches the premium software feel, with
 * the segmented morning/evening/saved structure already in place so the
 * real routine-building logic can land without visual rework.
 *
 * Empty states are intentional — they tell the user what the segment is
 * for and offer one clear next action. No toy-like illustrations.
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
  const hasScanned = useAppStore((s) => s.scans.length > 0);

  const handleSelect = (id: Segment) => {
    if (id === active) return;
    hapt.select();
    setActive(id);
  };

  const handlePrimary = () => {
    hapt.tap();
    // v9.8 — context-aware CTA. If the user has scanned, their routine
    // builds from the plan page, not another scan. Otherwise, the
    // primary action remains "take a scan".
    if (hasScanned) {
      // Route to the Plan screen inside the Home stack.
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

      <View style={styles.titleBlock}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          YOUR ROUTINE
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          Routine.
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
          Morning and evening steps, tailored from your last scan.
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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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

        <Text style={styles.footerHint} maxFontSizeMultiplier={1.2}>
          Your saved steps live here. They follow you across scans.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
    lineHeight: 46,
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

  // Scroll
  scroll: {
    paddingBottom: 140,
  },

  // Panel
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
