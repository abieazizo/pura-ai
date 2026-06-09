/**
 * PuraAssistHomeScreen — the Home tab (Pura Assist landing surface).
 *
 * Cycle 11 — BOLD structural elevation. The prior cycles refined an orb-crowned,
 * centred column; users "barely saw changes," so the skin-status hero is now the
 * unmistakable focal point on open. The composition flips from a symmetric column
 * to an asymmetric EDITORIAL MASTHEAD:
 *
 *   • Sticky header — "Home" + a hairline that fades in on scroll.
 *   • Masthead hero — a tracked eyebrow, then a GIANT left-aligned Instrument-
 *     Serif headline at true display scale (~60px) that states tonight's skin
 *     status, framed by generous whitespace. Cycle 12 (imagery): the user's
 *     latest SCAN-FACE rides the upper-right as a framed ~4:5 editorial
 *     portrait (bottom scrim + hairline + the scan-aware orb as a corner
 *     badge), tying Home to this user the moment it opens; pre-scan it is an
 *     honest framed placeholder, never a fake image. A focused Pura-Blue bloom
 *     grounds it. This is the one-second moment. Below it: the scan-status pill
 *     + subhead on one editorial baseline.
 *   • Weight-ladder primary — pre-scan: a glowing "Take a scan" CTA; post-scan:
 *     the elevated "Tonight's read" panel is the focal content.
 *   • Tonight's read — an elevated card with provenance + tonal accent rows
 *     (each row carries a colored edge + icon disc encoding its tone), echoing
 *     the orb's intelligence accent. Pre-scan it degrades to one honest line.
 *   • Quick actions — DEMOTED to a flat grouped list, clearly below the read.
 *   • Ask dock — unchanged; opens the conversation.
 *
 * Everything grounded in tonight's scan still flows through `useAssistSignal()`
 * (no raw AI output; pre-scan degrades to an honest invitation, per CLAUDE.md).
 */

import React, { useCallback, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowRight,
  Drop,
  Scan,
  Shield,
  ShoppingBagOpen,
  Sliders,
  Target,
  Waveform,
  type IconProps,
} from 'phosphor-react-native';

import {
  ds,
  dsAmbient,
  dsElevation,
  dsGradient,
  dsRadius,
  dsSpace,
  dsTiming,
  dsType,
  fontFamily,
  neutral,
  puraAssist,
  puraAssistLayout,
  puraAssistRadius,
  puraAssistType,
  success,
  tnum,
} from '@/theme';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useAppStore } from '@/store/useAppStore';
import { useAssistSignal, type AssistSignalRow } from '@/state/assistSignal';
import type {
  HomeStackParamList,
  RootStackParamList,
  TabParamList,
} from '@/navigation/types';
import { Button } from '@/components/ui';
import { ScanFrameGlyph } from '@/components/ScanFrameGlyph';
import { AssistInputBar } from './AssistInputBar';
import { ScanHeroPortrait } from './components/ScanHeroPortrait';

type IconCmp = React.FC<IconProps>;

const SIGNAL_ICON: Record<AssistSignalRow['icon'], IconCmp> = {
  shield: Shield as IconCmp,
  target: Target as IconCmp,
  drop: Drop as IconCmp,
};

interface ToneStyle {
  edge: string;
  icon: string;
  chip: string;
  value: string;
}
function toneStyle(tone: AssistSignalRow['tone']): ToneStyle {
  // Positive signal reads from the design-system clinical `success` ramp so the
  // green agrees with the rest of the app's data language (the bright iOS green
  // stays reserved for the live "scan ready" status dot, not data rows).
  if (tone === 'green') {
    return { edge: success[500], icon: success[700], chip: success.soft, value: success.text };
  }
  if (tone === 'muted') {
    return { edge: puraAssist.border, icon: puraAssist.veryMuted, chip: puraAssist.hairline, value: puraAssist.muted };
  }
  // Blue tone — the data accent. The edge stays full Pura Blue (a punctuating
  // key-metric mark); the chip is a restrained tint so blue doesn't flood.
  return { edge: puraAssist.blue, icon: puraAssist.blueDeep, chip: puraAssist.blue10, value: puraAssist.blueText };
}

interface QuickAction {
  key: string;
  eyebrow: string;
  title: string;
  Icon: IconCmp;
  accent: 'blue' | 'purple' | 'green';
  onPress: () => void;
}

// Quick-action chips are DELIBERATELY neutral. The "Jump to" list is secondary
// navigation, so its discs read as quiet ink-on-porcelain — no per-row accent
// hue (the old blue / purple / green) competing with the primary CTA. Pulling
// these back to neutral lets the single blue accent + the scan-ready signal
// re-earn attention, and removes the off-system second hues (purple/iOS-green).
const NEUTRAL_CHIP = { icon: neutral[700], chip: neutral[100] } as const;
const ACCENT: Record<QuickAction['accent'], { icon: string; chip: string }> = {
  blue: NEUTRAL_CHIP,
  purple: NEUTRAL_CHIP,
  green: NEUTRAL_CHIP,
};

// ---------------------------------------------------------------------------
// Rise — staggered fade-up entrance. Reduce-motion → appears instantly.
// ---------------------------------------------------------------------------
function Rise({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: object;
}) {
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      p.value = 1;
      return;
    }
    p.value = withDelay(delay, withTiming(1, dsTiming.settle));
  }, [reduce, delay, p]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 16 }],
  }));

  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>;
}

export function PuraAssistHomeScreen() {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const homeNav = useNavigation<NavigationProp<HomeStackParamList>>();
  const signal = useAssistSignal();

  // Cycle 12 (Imagery) — the latest-scan FACE is the recurring hero. Read the
  // newest scan's photoUri straight from canonical store state (the single
  // source of truth for captured photos). No recompute; just the raw URI so
  // the hero plate can frame it. `null` → honest locked placeholder.
  const latestPhotoUri = useAppStore((s) => {
    const arr = Array.isArray(s.scans) ? s.scans : [];
    return arr.length > 0 ? arr[arr.length - 1].photoUri ?? null : null;
  });

  // Scroll-linked header — a hairline + subtle lift fade in once the hero
  // begins to leave, so the sticky header reads as a layer over the content.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const headerSepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 36], [0, 1], Extrapolation.CLAMP),
  }));

  // The Home dock is a BUTTON, not a live input — tapping it navigates to the
  // conversation, which auto-focuses its real input. No inline keyboard/zoom.
  const openConversation = useCallback(() => {
    hapt.tap();
    rootNav.navigate('AssistChat', { focusInput: true });
  }, [rootNav]);

  const goScan = useCallback(() => {
    hapt.tap();
    rootNav.navigate('ScanModal');
  }, [rootNav]);

  const goRoutine = useCallback(() => {
    hapt.select();
    homeNav.getParent<NavigationProp<TabParamList>>()?.navigate('RoutineTab');
  }, [homeNav]);

  const goProducts = useCallback(() => {
    hapt.select();
    homeNav.getParent<NavigationProp<TabParamList>>()?.navigate('ProductsTab');
  }, [homeNav]);

  const quickActions: QuickAction[] = [
    { key: 'scan', eyebrow: 'Scan', title: "What's my skin barrier like tonight?", Icon: Scan as IconCmp, accent: 'blue', onPress: goScan },
    { key: 'routine', eyebrow: 'Routine', title: "Build tonight's routine.", Icon: Sliders as IconCmp, accent: 'purple', onPress: goRoutine },
    { key: 'products', eyebrow: 'Products', title: 'What should I avoid tonight?', Icon: ShoppingBagOpen as IconCmp, accent: 'green', onPress: goProducts },
  ];

  const scanReady = signal.scanReady;
  // Masthead headline — three editorial lines at true display scale. The last
  // line carries the emphasis (the orb's accent blue) so the eye lands on the
  // verb of tonight's read. Left-aligned, big, confident.
  const heroLines = scanReady
    ? ['Tonight,', 'your skin', 'has context.']
    : ['Let’s read', 'your skin', 'tonight.'];
  const heroEyebrow = scanReady ? 'Your skin tonight' : 'Pura Assist';
  const subhead = scanReady
    ? 'Ask what changed, what to use, or what to avoid tonight.'
    : 'A 30-second scan personalizes everything Pura tells you.';

  const fadeHeight = 44;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ---- Sticky header (scroll-linked hairline) ---- */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Home</Text>
            <Text style={styles.headerSub}>Scan-aware skincare AI</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Talk to Pura Assist"
            hitSlop={8}
            onPress={openConversation}
            style={({ pressed }) => [styles.waveBtn, pressed && styles.pressedDim]}
          >
            <Waveform size={20} color={puraAssist.ink} weight="bold" />
          </Pressable>
          <Animated.View style={[styles.headerSep, headerSepStyle]} pointerEvents="none" />
        </View>

        <Animated.ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: puraAssistLayout.screenPadding,
            paddingTop: dsSpace.sm,
            paddingBottom: fadeHeight + dsSpace.md,
          }}
        >
          {/* ---- Ambient atmosphere ---------------------------------------
              Two layered washes give the porcelain real depth instead of a
              flat field: (1) a calm day-ambient porcelain SKY behind the whole
              page (top→bottom, cool-icy → porcelain), and (2) a focused Pura-
              Blue BLOOM anchored to the upper-RIGHT where the orb now floats —
              an off-axis halo that grounds the asymmetric masthead, fading to
              clear before the read card. No second hue (DNA: porcelain/ink/blue). */}
          <LinearGradient
            pointerEvents="none"
            colors={dsAmbient.day.sky}
            locations={[0, 0.5, 1]}
            style={styles.skyWash}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[puraAssist.blue10, puraAssist.blue05, puraAssist.bgClear]}
            locations={[0, 0.5, 1]}
            start={{ x: 0.92, y: 0.04 }}
            end={{ x: 0.2, y: 1 }}
            style={styles.atmosphere}
          />

          {/* ---- Masthead hero — GIANT left-aligned display headline is the
              focal point; the user's framed SCAN-FACE portrait (orb badge in
              its corner) floats to the upper-right as the human accent. ---- */}
          <View style={styles.masthead}>
            {/* Scan-face HERO — the recurring signature image. A framed
                editorial portrait of the user's latest scan floats to the
                upper-right (carrying the scan-aware orb as a corner badge),
                tying Home to THIS user the moment it opens. Pre-scan it is an
                honest, framed locked placeholder — never a fake image. The
                giant serif still dominates; the portrait is the accent. */}
            <Rise delay={60} style={styles.heroPortraitFloat}>
              <ScanHeroPortrait
                photoUri={latestPhotoUri}
                scanReady={scanReady}
                focusZoneLabel={signal.focusZoneLabel}
                timestampLabel={signal.timestampLabel}
                scanTone={signal.scanTone}
                onPress={goScan}
              />
            </Rise>

            <Rise delay={0}>
              <Text style={styles.heroEyebrow}>{heroEyebrow}</Text>
            </Rise>

            <Rise delay={130}>
              <Text style={styles.hero} accessibilityRole="header">
                <Text>{heroLines[0]}</Text>
                {'\n'}
                <Text>{heroLines[1]}</Text>
                {'\n'}
                <Text style={styles.heroAccent}>{heroLines[2]}</Text>
              </Text>
            </Rise>

            {/* Status pill + subhead on a shared editorial baseline below the
                headline — the read, not the decoration. */}
            <Rise delay={210} style={styles.heroFooter}>
              <View style={[styles.pill, scanReady ? styles.pillReady : styles.pillMuted]}>
                <View
                  style={[
                    styles.pillDot,
                    { backgroundColor: scanReady ? puraAssist.green : puraAssist.veryMuted },
                  ]}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: scanReady ? puraAssist.blueText : puraAssist.muted },
                  ]}
                >
                  {scanReady ? 'Tonight’s scan ready' : 'Take a scan to begin'}
                </Text>
              </View>
              <Text style={styles.subhead}>{subhead}</Text>
            </Rise>
          </View>

          {/* ---- Weight-ladder primary action (pre-scan) ---- */}
          {!scanReady ? (
            <Rise delay={280} style={styles.primaryCta}>
              <Button
                label="Take a 30-second scan"
                variant="accent"
                size="lg"
                fullWidth
                onPress={goScan}
                icon={<ScanFrameGlyph size={20} color={puraAssist.white} strokeWidth={2} />}
              />
            </Rise>
          ) : null}

          {/* ---- Tonight's read — elevated, visually-encoded ---- */}
          <Rise delay={scanReady ? 280 : 340} style={styles.readCard}>
            {/* Faint cool top-light veil — deepens the surface with color, not
                just elevation, and echoes the orb's intelligence halo. */}
            <LinearGradient
              pointerEvents="none"
              colors={[puraAssist.blue05, puraAssist.bgClear]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.readVeil}
            />
            <View style={styles.readHead}>
              <Text style={styles.readEyebrow}>Tonight’s read</Text>
              <Text style={styles.readTitle}>
                {scanReady ? 'Here’s the signal.' : 'Nothing to read yet.'}
              </Text>
              <Text style={styles.readProvenance}>
                {scanReady
                  ? signal.timestampLabel
                    ? `From your ${signal.timestampLabel} scan`
                    : 'From tonight’s scan'
                  : 'Appears after a scan'}
              </Text>
            </View>

            {scanReady ? (
              <View style={styles.readRows}>
                {signal.signalRows.map((row) => {
                  const RowIcon = SIGNAL_ICON[row.icon];
                  const t = toneStyle(row.tone);
                  return (
                    <View key={row.key} style={styles.readRow}>
                      <View style={[styles.readEdge, { backgroundColor: t.edge }]} />
                      <View style={[styles.readChip, { backgroundColor: t.chip }]}>
                        <RowIcon size={16} color={t.icon} weight="bold" />
                      </View>
                      <Text style={styles.readLabel}>{row.label}</Text>
                      <View style={styles.flex1} />
                      <Text style={[styles.readValue, { color: t.value }]}>{row.value}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.readEmpty}>
                Your barrier, focus zone, and tonight’s routine direction will
                show here once Pura has read your skin.
              </Text>
            )}
          </Rise>

          {/* ---- Quick actions — DEMOTED to a flat grouped list ---- */}
          <Rise delay={scanReady ? 360 : 420} style={styles.quickGroup}>
            <Text style={styles.quickGroupLabel}>Jump to</Text>
            {quickActions.map((qa, i) => {
              const accent = ACCENT[qa.accent];
              return (
                <Pressable
                  key={qa.key}
                  accessibilityRole="button"
                  accessibilityLabel={qa.title}
                  onPress={qa.onPress}
                  style={({ pressed }) => [
                    styles.quickRow,
                    i < quickActions.length - 1 && styles.quickDivider,
                    pressed && styles.pressedDim,
                  ]}
                >
                  <View style={[styles.quickChip, { backgroundColor: accent.chip }]}>
                    <qa.Icon size={18} color={accent.icon} weight="bold" />
                  </View>
                  <Text style={styles.quickTitle} numberOfLines={1}>
                    {qa.title}
                  </Text>
                  <ArrowRight size={16} color={puraAssist.veryMuted} weight="bold" />
                </Pressable>
              );
            })}
          </Rise>
        </Animated.ScrollView>

        {/* ---- Ask dock ---- */}
        <View style={styles.dockBar} pointerEvents="box-none">
          <LinearGradient
            pointerEvents="none"
            colors={dsGradient.pageVeil}
            style={[styles.dockFade, { height: fadeHeight, top: -fadeHeight }]}
          />
          <AssistInputBar mode="launcher" onOpen={openConversation} bottomInset={0} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: puraAssist.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  flex1: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: puraAssistLayout.screenPadding,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { ...puraAssistType.headerTitle, color: puraAssist.ink },
  headerSub: { ...dsType.labelSm, color: puraAssist.veryMuted, marginTop: 3 },
  headerSep: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraAssist.border,
  },
  waveBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: puraAssist.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...dsElevation.e1,
  },
  pressedDim: { opacity: 0.7 },

  // Atmosphere
  // (1) Page-base ambient sky — a calm vertical porcelain wash so the surface
  // reads as atmosphere, not a flat fill. Sits behind all scroll content.
  skyWash: {
    position: 'absolute',
    left: -puraAssistLayout.screenPadding,
    right: -puraAssistLayout.screenPadding,
    top: -dsSpace.sm,
    height: 720,
  },
  // (2) Focused Pura-Blue bloom anchored to the upper-RIGHT, under the floated
  // orb — an off-axis halo grounding the asymmetric masthead, fading to clear
  // before the read card.
  atmosphere: {
    position: 'absolute',
    left: -puraAssistLayout.screenPadding,
    right: -puraAssistLayout.screenPadding,
    top: -dsSpace.sm,
    height: 440,
  },

  // Masthead hero — asymmetric editorial composition. Left-aligned giant serif
  // is the focal point; the orb floats top-right. Generous top/bottom air.
  masthead: {
    position: 'relative',
    paddingTop: dsSpace.lg,
    paddingBottom: dsSpace.sm,
    minHeight: 360,
  },
  // Scan-face portrait floated to the upper-right, slightly overlapping the
  // headline's top band so the SERIF still reads as dominant and the real
  // photo is the warm, human accent. zIndex lifts it (and its orb badge) above
  // the headline text + ambient washes.
  heroPortraitFloat: {
    position: 'absolute',
    top: dsSpace.xs,
    right: 0,
    zIndex: 2,
  },
  heroEyebrow: {
    ...dsType.label,
    color: puraAssist.blueText,
    marginBottom: dsSpace.md,
    // Keep the eyebrow clear of the floated portrait's left edge.
    maxWidth: 200,
  },
  // THE moment — display-scale Instrument Serif, left-aligned, tight leading.
  hero: {
    fontFamily: fontFamily.serifSemi,
    fontSize: 60,
    lineHeight: 58,
    letterSpacing: -2.4,
    color: puraAssist.ink,
    textAlign: 'left',
  },
  // Final line carries the accent — the eye lands on the verb of the read.
  heroAccent: {
    color: puraAssist.blue,
  },
  heroFooter: {
    marginTop: dsSpace.xl,
    alignItems: 'flex-start',
    gap: dsSpace.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingLeft: 10,
    paddingRight: 13,
    height: 28,
    borderRadius: puraAssistRadius.pill,
  },
  pillReady: { backgroundColor: puraAssist.blue08 },
  pillMuted: { backgroundColor: puraAssist.hairline },
  pillDot: { width: 7, height: 7, borderRadius: 3.5 },
  pillText: { ...dsType.labelSm },
  subhead: {
    ...puraAssistType.subhead,
    color: puraAssist.muted,
    textAlign: 'left',
    maxWidth: 320,
  },

  // Primary CTA
  primaryCta: { marginTop: dsSpace.xl },

  // Tonight's read
  readCard: {
    backgroundColor: puraAssist.surface,
    borderRadius: dsRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.border,
    padding: dsSpace.lg,
    marginTop: dsSpace.xl,
    overflow: 'hidden', // clip the cool top-light veil to the card radius
    ...dsElevation.e2,
  },
  // Cool top-light veil — top ~third of the card, fading to clear.
  readVeil: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 160,
  },
  readHead: {
    flexDirection: 'column',
  },
  // Eyebrow stays NEUTRAL — a label shouldn't wear the accent. Pulling this off
  // Pura Blue is the biggest restraint win: the blue now punctuates (CTA + key
  // data marks) instead of flooding every caption.
  readEyebrow: {
    ...dsType.label,
    color: ds.textTertiary,
  },
  readTitle: {
    fontFamily: fontFamily.serifSemi,
    fontSize: 25,
    lineHeight: 27,
    letterSpacing: -0.7,
    color: puraAssist.ink,
    marginTop: dsSpace.sm,
  },
  readProvenance: {
    ...dsType.caption,
    ...tnum,
    color: puraAssist.veryMuted,
    marginTop: dsSpace.xs,
  },
  readRows: { marginTop: dsSpace.base, gap: dsSpace.sm },
  readRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpace.md,
    // Cool sunken porcelain (vs. the white card) — color-based depth so each
    // row separates without another border. Ink label stays AA+ on this tint.
    backgroundColor: neutral[50],
    borderRadius: dsRadius.md,
    paddingVertical: dsSpace.md,
    paddingRight: dsSpace.base,
    paddingLeft: dsSpace.base,
    overflow: 'hidden',
  },
  readEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: dsRadius.md,
    borderBottomLeftRadius: dsRadius.md,
  },
  readChip: {
    width: 30,
    height: 30,
    borderRadius: puraAssistRadius.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readLabel: {
    ...puraAssistType.signalLabel,
    color: puraAssist.ink,
  },
  readValue: {
    ...puraAssistType.signalValue,
    ...tnum,
    letterSpacing: -0.2,
    textAlign: 'right',
  },
  readEmpty: {
    ...dsType.bodySm,
    color: puraAssist.muted,
    marginTop: dsSpace.md,
  },

  // Quick actions (demoted)
  quickGroup: {
    marginTop: dsSpace.xl,
    paddingHorizontal: dsSpace.xs,
  },
  quickGroupLabel: {
    ...dsType.label,
    color: puraAssist.veryMuted,
    marginBottom: dsSpace.xs,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpace.md,
    paddingVertical: dsSpace.md,
  },
  quickDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraAssist.hairline,
  },
  quickChip: {
    width: 36,
    height: 36,
    borderRadius: puraAssistRadius.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    flex: 1,
    ...puraAssistType.quickAction,
    color: puraAssist.ink,
  },

  // Dock
  dockBar: { backgroundColor: puraAssist.bg },
  dockFade: { position: 'absolute', left: 0, right: 0 },
});
