/**
 * HomeNightlyMirror — v29 nightly-mirror rebuild.
 *
 * Replaces the v26 PuraNightHome composition. The screen has two
 * pure states per the v29 spec:
 *
 *   Pre-scan  → eyebrow, hero, support, NightlyMirrorOrb, trust line.
 *   Post-scan → eyebrow, hero (the observation's headline), support,
 *               smaller observation orb with ScanConcernContour,
 *               primary "Begin routine", secondary "Ask about a product",
 *               meta (timestamp + scan source).
 *
 * No card stacking. No dashboard. The orb is the centrepiece pre-scan;
 * the editorial observation is the centrepiece post-scan.
 *
 * The screen is wired to existing navigation (Scan → tab listener;
 * Routine → existing 'Routine' route; AI Assist → AssistantTab).
 */

import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { puraColors, puraSpace, puraType } from '@/design/puraTokens';
import { hapt } from '@/utils/haptics';
import { useTonightObservation } from '@/state/tonightObservation';
import { NightlyMirrorOrb } from '@/components/observation/NightlyMirrorOrb';
import { ScanConcernContour } from '@/components/observation/ScanConcernContour';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NavigationProp<RootStackParamList & {
  Routine: undefined;
  Tabs: { screen: string };
  ScanModal: undefined;
}>;

export function HomeNightlyMirror() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const observation = useTonightObservation();

  const goToScan = useCallback(() => {
    hapt.select();
    // ScanModal is a root-stack route handled by the parent navigator.
    // The tab navigator's center Scan slot listens for tabPress and
    // navigates here, so we go through ScanModal directly.
    // @ts-expect-error — RootStackParamList from the existing nav.
    nav.navigate?.('ScanModal');
  }, [nav]);

  const goToRoutine = useCallback(() => {
    hapt.select();
    // @ts-expect-error tabs nav
    nav.navigate?.('Tabs', { screen: 'RoutineTab' });
  }, [nav]);

  const goToAssist = useCallback(() => {
    hapt.select();
    // @ts-expect-error tabs nav
    nav.navigate?.('Tabs', { screen: 'AssistantTab' });
  }, [nav]);

  // Orb size — scales by width so it fits compact/standard/large phones.
  const orbSize = useMemo(() => {
    if (width <= 380) return 235;
    if (width >= 420) return 274;
    return 252;
  }, [width]);

  const scanned = observation.scanCompleted;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      {/* Top marker row */}
      <View style={styles.topRow}>
        <Animated.Text
          entering={FadeIn.duration(260).easing(Easing.out(Easing.cubic))}
          style={puraType.eyebrow}
          maxFontSizeMultiplier={1.2}
        >
          {observation.dateLabel}
        </Animated.Text>
        <View style={styles.avatarSlot}>
          <View style={styles.avatar} />
        </View>
      </View>

      {scanned ? (
        <PostScanContent
          observation={observation}
          orbSize={Math.round(orbSize * 0.52)}
          onBeginRoutine={goToRoutine}
          onAskProduct={goToAssist}
          bottomPadding={insets.bottom + 110}
        />
      ) : (
        <PreScanContent
          orbSize={orbSize}
          onBeginScan={goToScan}
          bottomPadding={insets.bottom + 110}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// Pre-scan
// ============================================================================

function PreScanContent({
  orbSize,
  onBeginScan,
  bottomPadding,
}: {
  orbSize: number;
  onBeginScan: () => void;
  bottomPadding: number;
}) {
  return (
    <View style={[styles.body, { paddingBottom: bottomPadding }]}>
      <Animated.View
        entering={FadeInDown.duration(360).delay(60).easing(Easing.out(Easing.cubic))}
        style={styles.hero}
      >
        <Text style={puraType.homeHero} maxFontSizeMultiplier={1.15}>
          How is your skin{'\n'}feeling tonight?
        </Text>
        <Text style={[puraType.bodyLarge, styles.support]} maxFontSizeMultiplier={1.2}>
          One private check-in. One clear routine.
        </Text>
      </Animated.View>

      <View style={styles.orbCenter}>
        <Animated.View
          entering={FadeIn.duration(540).delay(180).easing(Easing.out(Easing.cubic))}
        >
          <NightlyMirrorOrb
            size={orbSize}
            label="BEGIN CHECK-IN"
            hint="30 seconds · private"
            zone="full_face"
            onPress={onBeginScan}
            accessibilityLabel="Begin tonight’s private skin check-in, approximately 30 seconds."
          />
        </Animated.View>
      </View>

      <Animated.Text
        entering={FadeIn.duration(380).delay(360)}
        style={styles.trustLine}
        maxFontSizeMultiplier={1.2}
      >
        30 seconds · Private on your account
      </Animated.Text>
    </View>
  );
}

// ============================================================================
// Post-scan
// ============================================================================

interface PostScanContentProps {
  observation: ReturnType<typeof useTonightObservation>;
  orbSize: number;
  onBeginRoutine: () => void;
  onAskProduct: () => void;
  bottomPadding: number;
}

function PostScanContent({
  observation,
  orbSize,
  onBeginRoutine,
  onAskProduct,
  bottomPadding,
}: PostScanContentProps) {
  return (
    <View style={[styles.body, { paddingBottom: bottomPadding }]}>
      <Animated.View
        entering={FadeInDown.duration(360).delay(60).easing(Easing.out(Easing.cubic))}
        style={styles.hero}
      >
        <Text style={puraType.homeHero} maxFontSizeMultiplier={1.15}>
          {observation.headline}
        </Text>
        <Text style={[puraType.bodyLarge, styles.support]} maxFontSizeMultiplier={1.2}>
          {observation.supportText}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(540).delay(180).easing(Easing.out(Easing.cubic))}
        style={styles.observationCenter}
      >
        <ScanConcernContour
          zone={observation.zone}
          size="medium"
          mode="observation"
          showLabel
          label={observation.observationLabel}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(280).easing(Easing.out(Easing.cubic))}
        style={styles.actions}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Begin tonight's routine"
          onPress={onBeginRoutine}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
        >
          <Text style={puraType.buttonPrimary} maxFontSizeMultiplier={1.2}>
            Begin routine
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask Pura about a product"
          onPress={onAskProduct}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={puraType.buttonQuiet} maxFontSizeMultiplier={1.2}>
            Ask about a product
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.Text
        entering={FadeIn.duration(360).delay(440)}
        style={styles.metaLine}
        maxFontSizeMultiplier={1.2}
      >
        Based on your scan {observation.scanTimestamp ? `· ${observation.scanTimestamp}` : ''}
      </Animated.Text>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraColors.canvas,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: puraSpace.screenX,
    paddingTop: puraSpace.screenTop,
    paddingBottom: puraSpace.sm,
  },
  avatarSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: puraColors.surfaceQuiet,
    borderWidth: 1,
    borderColor: puraColors.lineSoft,
  },
  body: {
    flex: 1,
    paddingHorizontal: puraSpace.screenX,
    paddingTop: puraSpace.xxl,
  },
  hero: {
    marginBottom: puraSpace.section,
  },
  support: {
    marginTop: puraSpace.md,
    maxWidth: 320,
  },
  orbCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  observationCenter: {
    alignItems: 'center',
    marginTop: puraSpace.lg,
    marginBottom: puraSpace.section,
  },
  trustLine: {
    ...puraType.micro,
    textAlign: 'center',
    marginTop: puraSpace.lg,
  },
  metaLine: {
    ...puraType.micro,
    textAlign: 'center',
    marginTop: puraSpace.lg,
  },
  actions: {
    gap: puraSpace.sm,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: puraColors.actionInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: puraColors.actionInkPressed,
  },
  secondaryBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
