/**
 * PuraAssistHomeScreen — the redesigned Home tab.
 *
 * The Home tab IS the Pura Assist landing surface. There is no separate
 * "AI Assist" destination anymore; tapping the input dock at the bottom
 * opens the conversation (a full-screen root route that covers the tab
 * dock, matching the reference).
 *
 * Everything grounded in tonight's scan flows through `useAssistSignal()`
 * — the thin display model composed from the canonical readers. Pre-scan,
 * every signal degrades to an honest "Take a scan" rather than inventing
 * precision (per CLAUDE.md). The decorative orb-and-path is static here;
 * the animated face mesh lives on the conversation surface.
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  ArrowRight,
  Drop,
  Info,
  Scan,
  Shield,
  ShoppingBagOpen,
  Sliders,
  Sparkle,
  Target,
  Waveform,
  type IconProps,
} from 'phosphor-react-native';

import {
  puraAssist,
  puraAssistLayout,
  puraAssistRadius,
  puraAssistShadow,
  puraAssistType,
} from '@/theme';
import { hapt } from '@/utils/haptics';
import { useAssistSignal, type AssistSignalRow } from '@/state/assistSignal';
import type {
  HomeStackParamList,
  RootStackParamList,
  TabParamList,
} from '@/navigation/types';
import { AssistInputBar } from './AssistInputBar';

type IconCmp = React.FC<IconProps>;

const SIGNAL_ICON: Record<AssistSignalRow['icon'], IconCmp> = {
  shield: Shield as IconCmp,
  target: Target as IconCmp,
  drop: Drop as IconCmp,
};

function rowIconColor(tone: AssistSignalRow['tone']): string {
  return tone === 'green'
    ? puraAssist.green
    : tone === 'muted'
      ? puraAssist.veryMuted
      : puraAssist.blue;
}
function rowChipBg(tone: AssistSignalRow['tone']): string {
  return tone === 'green'
    ? puraAssist.green10
    : tone === 'muted'
      ? puraAssist.hairline
      : puraAssist.blue12;
}
function rowValueColor(tone: AssistSignalRow['tone']): string {
  return tone === 'green'
    ? puraAssist.greenText
    : tone === 'muted'
      ? puraAssist.muted
      : puraAssist.blueText;
}

interface QuickAction {
  key: string;
  eyebrow: string;
  title: string;
  Icon: IconCmp;
  accent: 'blue' | 'purple' | 'green';
  onPress: () => void;
}

const ACCENT: Record<
  QuickAction['accent'],
  { icon: string; chip: string; eyebrow: string }
> = {
  blue: { icon: puraAssist.blue, chip: puraAssist.blue12, eyebrow: puraAssist.blueText },
  purple: { icon: puraAssist.purple, chip: puraAssist.purple10, eyebrow: puraAssist.purpleText },
  green: { icon: puraAssist.green, chip: puraAssist.green10, eyebrow: puraAssist.greenText },
};

export function PuraAssistHomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const homeNav = useNavigation<NavigationProp<HomeStackParamList>>();
  const signal = useAssistSignal();

  const openConversation = useCallback(() => {
    hapt.tap();
    rootNav.navigate('AssistChat');
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
    {
      key: 'scan',
      eyebrow: 'Scan',
      title: "What's my skin barrier like tonight?",
      Icon: Scan as IconCmp,
      accent: 'blue',
      onPress: goScan,
    },
    {
      key: 'routine',
      eyebrow: 'Routine',
      title: "Build tonight's routine.",
      Icon: Sliders as IconCmp,
      accent: 'purple',
      onPress: goRoutine,
    },
    {
      key: 'products',
      eyebrow: 'Products',
      title: 'What should I avoid tonight?',
      Icon: ShoppingBagOpen as IconCmp,
      accent: 'green',
      onPress: goProducts,
    },
  ];

  const scanReady = signal.scanReady;
  const heroLines = scanReady
    ? ['Your skin has', 'context now.']
    : ['Let’s read your', 'skin tonight.'];
  const subhead = scanReady
    ? 'Ask what changed, what to use, or what to avoid tonight.'
    : 'Take a 30-second scan to personalize everything Pura tells you.';

  const orbWidth = width - puraAssistLayout.screenPadding * 2;
  const dockGap = puraAssistLayout.dockClearance + Math.max(insets.bottom, 8);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: puraAssistLayout.screenPadding,
          paddingTop: 8,
          paddingBottom: dockGap + 96,
        }}
      >
        {/* ---- Header ---- */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Pura Assist</Text>
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
        </View>

        {/* ---- Scan-ready pill ---- */}
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

        {/* ---- Hero ---- */}
        <Text style={styles.hero}>
          {heroLines[0]}
          {'\n'}
          {heroLines[1]}
        </Text>
        <Text style={styles.subhead}>{subhead}</Text>

        {/* ---- Decorative orb + dotted path (static on Home) ---- */}
        <View style={styles.orbWrap} pointerEvents="none">
          <Svg width={orbWidth} height={132} viewBox="0 0 320 132">
            <Path
              d="M16 104 Q 96 38 168 70 T 304 44"
              stroke={puraAssist.blue}
              strokeOpacity={0.42}
              strokeWidth={2}
              strokeDasharray="1 8"
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx={16} cy={104} r={3} fill={puraAssist.blue} opacity={0.5} />
            <Circle cx={304} cy={44} r={3} fill={puraAssist.blue} opacity={0.5} />
            <Circle cx={168} cy={70} r={36} fill={puraAssist.blue} opacity={0.05} />
            <Circle
              cx={168}
              cy={70}
              r={25}
              stroke={puraAssist.blue}
              strokeOpacity={0.16}
              strokeWidth={1.5}
              fill="none"
            />
            <Circle cx={168} cy={70} r={13} fill={puraAssist.blue} opacity={0.12} />
            <Circle cx={168} cy={70} r={6} fill={puraAssist.blue} />
            <Circle cx={160} cy={62} r={2.4} fill={puraAssist.white} opacity={0.85} />
          </Svg>
        </View>

        {/* ---- Tonight's Signal card ---- */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Sparkle size={16} color={puraAssist.blue} weight="fill" />
            <Text style={styles.cardTitle}>Tonight’s Signal</Text>
            <View style={{ flex: 1 }} />
            <Info size={16} color={puraAssist.veryMuted} weight="regular" />
          </View>
          <View style={styles.signalList}>
            {signal.signalRows.map((row) => {
              const RowIcon = SIGNAL_ICON[row.icon];
              return (
                <View key={row.key} style={styles.signalRow}>
                  <View style={[styles.signalChip, { backgroundColor: rowChipBg(row.tone) }]}>
                    <RowIcon size={16} color={rowIconColor(row.tone)} weight="bold" />
                  </View>
                  <Text style={styles.signalLabel}>{row.label}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.signalValue, { color: rowValueColor(row.tone) }]}>
                    {row.value}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ---- Quick actions ---- */}
        <View style={styles.quickList}>
          {quickActions.map((qa) => {
            const accent = ACCENT[qa.accent];
            return (
              <Pressable
                key={qa.key}
                accessibilityRole="button"
                accessibilityLabel={qa.title}
                onPress={qa.onPress}
                style={({ pressed }) => [styles.quickCard, pressed && styles.pressedCard]}
              >
                <View style={[styles.quickChip, { backgroundColor: accent.chip }]}>
                  <qa.Icon size={20} color={accent.icon} weight="bold" />
                </View>
                <View style={styles.quickCopy}>
                  <Text style={[styles.quickEyebrow, { color: accent.eyebrow }]}>
                    {qa.eyebrow}
                  </Text>
                  <Text style={styles.quickTitle}>{qa.title}</Text>
                </View>
                <ArrowRight size={18} color={puraAssist.veryMuted} weight="bold" />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ---- Input dock — floats above the tab dock; tapping opens chat. ---- */}
      <View style={[styles.inputDock, { bottom: dockGap }]} pointerEvents="box-none">
        <AssistInputBar mode="launcher" onOpen={openConversation} bottomInset={0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraAssist.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 18,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...puraAssistType.headerTitle,
    color: puraAssist.ink,
  },
  headerSub: {
    ...puraAssistType.headerSub,
    color: puraAssist.muted,
    marginTop: 2,
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
    ...puraAssistShadow.card,
  },
  pressedDim: {
    opacity: 0.7,
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
  pillReady: {
    backgroundColor: puraAssist.blue08,
  },
  pillMuted: {
    backgroundColor: puraAssist.hairline,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  pillText: {
    ...puraAssistType.chip,
  },
  hero: {
    ...puraAssistType.heroSerif,
    color: puraAssist.ink,
    marginTop: 18,
  },
  subhead: {
    ...puraAssistType.subhead,
    color: puraAssist.muted,
    marginTop: 12,
    maxWidth: 320,
  },
  orbWrap: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  card: {
    backgroundColor: puraAssist.surface,
    borderRadius: puraAssistRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.border,
    padding: 16,
    marginTop: 10,
    ...puraAssistShadow.card,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...puraAssistType.cardTitle,
    color: puraAssist.ink,
  },
  signalList: {
    marginTop: 14,
    gap: 14,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signalChip: {
    width: 32,
    height: 32,
    borderRadius: puraAssistRadius.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalLabel: {
    ...puraAssistType.signalLabel,
    color: puraAssist.ink,
  },
  signalValue: {
    ...puraAssistType.signalValue,
    textAlign: 'right',
  },
  quickList: {
    marginTop: 14,
    gap: 10,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: puraAssist.surface,
    borderRadius: puraAssistRadius.quickAction,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.border,
    paddingVertical: 15,
    paddingHorizontal: 15,
    ...puraAssistShadow.card,
  },
  pressedCard: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  quickChip: {
    width: 40,
    height: 40,
    borderRadius: puraAssistRadius.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  quickEyebrow: {
    ...puraAssistType.eyebrow,
  },
  quickTitle: {
    ...puraAssistType.quickAction,
    color: puraAssist.ink,
  },
  inputDock: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
