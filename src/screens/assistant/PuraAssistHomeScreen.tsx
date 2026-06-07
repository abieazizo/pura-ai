/**
 * PuraAssistHomeScreen — the Home tab (Pura Assist landing surface).
 *
 * Cycle 3 elevation — the brief: promote the Aurora orb from a buried mid-page
 * widget to THE centerpiece, give the flat porcelain real figure-ground, turn
 * "Tonight's Signal" into a visually-encoded read (not a text list), establish a
 * weight ladder (one primary next step; quick actions demoted), push the hero
 * serif, and add a staggered entrance + scroll-linked header + press/haptics.
 *
 * Composition, top → bottom:
 *   • Sticky header — "Home" + a hairline that fades in on scroll.
 *   • Presence zone — scan pill, the LARGE breathing orb (scan-tinted) as the
 *     crown, an editorial centred serif hero, subhead. This is the moment.
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

import React, { useCallback, useEffect, useState } from 'react';
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
  blue,
  ds,
  dsElevation,
  dsRadius,
  dsSpace,
  dsTiming,
  dsType,
  fontFamily,
  puraAssist,
  puraAssistLayout,
  puraAssistRadius,
  puraAssistType,
} from '@/theme';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useAssistSignal, type AssistSignalRow } from '@/state/assistSignal';
import type {
  HomeStackParamList,
  RootStackParamList,
  TabParamList,
} from '@/navigation/types';
import { Button } from '@/components/ui';
import { AssistInputBar } from './AssistInputBar';
import { AssistantAuroraOrb, type AssistantOrbState } from './AssistantAuroraOrb';

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
  if (tone === 'green') {
    return { edge: puraAssist.green, icon: puraAssist.green, chip: puraAssist.green10, value: puraAssist.greenText };
  }
  if (tone === 'muted') {
    return { edge: puraAssist.border, icon: puraAssist.veryMuted, chip: puraAssist.hairline, value: puraAssist.muted };
  }
  return { edge: puraAssist.blue, icon: puraAssist.blue, chip: puraAssist.blue12, value: puraAssist.blueText };
}

interface QuickAction {
  key: string;
  eyebrow: string;
  title: string;
  Icon: IconCmp;
  accent: 'blue' | 'purple' | 'green';
  onPress: () => void;
}

const ACCENT: Record<QuickAction['accent'], { icon: string; chip: string }> = {
  blue: { icon: puraAssist.blue, chip: puraAssist.blue12 },
  purple: { icon: puraAssist.purple, chip: puraAssist.purple10 },
  green: { icon: puraAssist.green, chip: puraAssist.green10 },
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

  const [draft, setDraft] = useState('');

  const homeOrbState: AssistantOrbState =
    draft.trim().length > 0 ? 'listening' : 'idle';

  // Scroll-linked header — a hairline + subtle lift fade in once the hero
  // begins to leave, so the sticky header reads as a layer over the content.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const headerSepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 36], [0, 1], Extrapolation.CLAMP),
  }));

  const openConversation = useCallback(() => {
    hapt.tap();
    rootNav.navigate('AssistChat');
  }, [rootNav]);

  const openWithMessage = useCallback(
    (text: string) => {
      hapt.tap();
      rootNav.navigate('AssistChat', { initialMessage: text });
      setDraft('');
    },
    [rootNav],
  );

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
  const heroLines = scanReady
    ? ['Your skin has', 'context now.']
    : ['Let’s read your', 'skin tonight.'];
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
            <Waveform size={20} color={puraAssist.blue} weight="bold" />
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
          {/* ---- Ambient atmosphere behind the presence zone ---- */}
          <LinearGradient
            pointerEvents="none"
            colors={[puraAssist.blue05, puraAssist.bgClear]}
            style={styles.atmosphere}
          />

          {/* ---- Presence zone — orb as the centerpiece ---- */}
          <View style={styles.presence}>
            <Rise delay={0}>
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
            </Rise>

            <Rise delay={70} style={styles.orbWrap}>
              <AssistantAuroraOrb size={158} state={homeOrbState} scanTone={signal.scanTone} />
            </Rise>

            <Rise delay={150}>
              <Text style={styles.hero}>
                {heroLines[0]}
                {'\n'}
                {heroLines[1]}
              </Text>
            </Rise>
            <Rise delay={210}>
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
                icon={<Scan size={20} color={puraAssist.white} weight="bold" />}
              />
            </Rise>
          ) : null}

          {/* ---- Tonight's read — elevated, visually-encoded ---- */}
          <Rise delay={scanReady ? 280 : 340} style={styles.readCard}>
            <View style={styles.readHead}>
              <Text style={styles.readEyebrow}>Tonight’s read</Text>
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
            colors={[puraAssist.bgClear, puraAssist.bg]}
            style={[styles.dockFade, { height: fadeHeight, top: -fadeHeight }]}
          />
          <AssistInputBar
            mode="launcher"
            value={draft}
            onChangeText={setDraft}
            onSubmit={openWithMessage}
            bottomInset={0}
          />
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
  headerSub: { ...puraAssistType.headerSub, color: puraAssist.muted, marginTop: 2 },
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
  atmosphere: {
    position: 'absolute',
    left: -puraAssistLayout.screenPadding,
    right: -puraAssistLayout.screenPadding,
    top: 0,
    height: 360,
  },

  // Presence zone
  presence: {
    alignItems: 'center',
    paddingTop: dsSpace.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 7,
    paddingLeft: 10,
    paddingRight: 13,
    height: 28,
    borderRadius: puraAssistRadius.pill,
  },
  pillReady: { backgroundColor: puraAssist.blue08 },
  pillMuted: { backgroundColor: puraAssist.hairline },
  pillDot: { width: 7, height: 7, borderRadius: 3.5 },
  pillText: { ...puraAssistType.chip },
  orbWrap: {
    height: 176,
    width: 176,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: dsSpace.md,
    marginBottom: dsSpace.xs,
  },
  hero: {
    fontFamily: fontFamily.serifSemi,
    fontSize: 42,
    lineHeight: 45,
    letterSpacing: -1.1,
    color: puraAssist.ink,
    textAlign: 'center',
  },
  subhead: {
    ...puraAssistType.subhead,
    color: puraAssist.muted,
    marginTop: dsSpace.md,
    textAlign: 'center',
    maxWidth: 300,
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
    ...dsElevation.e2,
  },
  readHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  readEyebrow: {
    fontFamily: fontFamily.sansSemi,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: puraAssist.ink,
  },
  readProvenance: {
    ...dsType.caption,
    color: puraAssist.veryMuted,
  },
  readRows: { marginTop: dsSpace.base, gap: dsSpace.sm },
  readRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpace.md,
    backgroundColor: puraAssist.bg,
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
