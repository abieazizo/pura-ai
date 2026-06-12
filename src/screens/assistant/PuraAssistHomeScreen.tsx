/**
 * PuraAssistHomeScreen — the Home tab: Pura's calm daily companion.
 *
 * The whole screen is ONE quiet thought: a living orb that greets you like it
 * remembers you, the single next thing to do, and nothing else competing. An
 * editorial page, not a dashboard — restraint IS the aesthetic.
 *
 * Exactly five elements, top to bottom:
 *   • The orb — the real AuroraOrb (~72px), idle, breathing, warming with
 *     familiarity as scans accumulate. Present, not a hero.
 *   • The greeting — Instrument Serif, varies day to day via `homeVoice`;
 *     occasionally a specific, data-backed callback ("your cheeks are calmer
 *     than your first scan"). Never the same generic line.
 *   • ONE focus card — the real next-product packshot, the step name, a spec
 *     line, one blue Start circle. Done-today renders a calm rest line
 *     instead — rest, not emptiness.
 *   • One quiet progress line + the seven-day consistency strip.
 *   • A quiet "Full routine" link. The floating tab bar. That's the screen.
 *
 * Everything renders from `useDailyHome()` — one pure model, no raw store
 * reads (per CLAUDE.md). Motion is Reanimated worklets only: the orb breathes
 * continuously; greeting → card → progress unfold in one gentle staggered
 * rise (translateY 12→0, spring damping 18 / stiffness 140, ~90ms apart).
 * Reduce Motion stills all of it but keeps the composition.
 */

import React, { useCallback, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { ArrowRight } from 'phosphor-react-native';

import {
  dsSpace,
  dsType,
  puraAssist,
  puraAssistLayout,
  puraAssistType,
  puraShopLayout,
} from '@/theme';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { AuroraOrb } from '@/components/AuroraOrb';
import type {
  HomeStackParamList,
  RootStackParamList,
  TabParamList,
} from '@/navigation/types';
import { useDailyHome } from './home/useDailyHome';
import { NextStepCard } from './home/NextStepCard';
import { ConsistencyStrip } from './home/ConsistencyStrip';

const ORB_SIZE = 72;
const RISE_STAGGER_MS = 90;

/**
 * Rise — one gentle staggered unfold: fade + translateY 12→0 on a spring
 * (damping 18, stiffness 140). Reduce Motion renders settled, instantly.
 */
function Rise({
  order,
  children,
  style,
}: {
  order: number;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      p.value = 1;
      return;
    }
    const delay = order * RISE_STAGGER_MS;
    p.value = withDelay(
      delay,
      withSpring(1, { damping: 18, stiffness: 140 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, p.value)),
    transform: [{ translateY: (1 - p.value) * 12 }],
  }));

  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>;
}

export function PuraAssistHomeScreen() {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const homeNav = useNavigation<NavigationProp<HomeStackParamList>>();
  const reduceMotion = useReduceMotion();
  const model = useDailyHome();

  const goRoutine = useCallback(() => {
    hapt.tap();
    homeNav.getParent<NavigationProp<TabParamList>>()?.navigate('RoutineTab');
  }, [homeNav]);

  const goScan = useCallback(() => {
    hapt.tap();
    rootNav.navigate('ScanModal');
  }, [rootNav]);

  const goSinceDayOne = useCallback(() => {
    hapt.tap();
    homeNav.navigate('RescanCompare');
  }, [homeNav]);

  const onStart = useCallback(() => {
    if (model.focus?.kind === 'first_scan') goScan();
    else goRoutine();
  }, [model.focus?.kind, goScan, goRoutine]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* A whisper of cool blue at the very top — the only atmosphere. */}
      <LinearGradient
        pointerEvents="none"
        colors={['#EFF5FC', puraAssist.bgClear]}
        style={styles.whisper}
      />

      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + dsSpace.xl,
            paddingBottom:
              puraShopLayout.dockBarHeight + insets.bottom + dsSpace.lg,
          },
        ]}
      >
        {/* The companion — breathing, warming as it gets to know you. */}
        <View style={styles.orb}>
          <AuroraOrb
            size={ORB_SIZE}
            state="idle"
            familiarity={model.familiarity}
            reduceMotion={reduceMotion}
            auraTheme="blue-warm"
          />
        </View>

        <Rise order={0}>
          <Text style={styles.greeting} accessibilityRole="header">
            {model.greeting}
          </Text>
        </Rise>

        <Rise order={1} style={styles.focus}>
          {model.state === 'due' && model.focus ? (
            <NextStepCard focus={model.focus} onStart={onStart} />
          ) : (
            <Text style={styles.rest}>{model.restLine}</Text>
          )}
        </Rise>

        {/* Generous air — the page breathes between the thought and the record. */}
        <View style={styles.air} />

        {model.showRecord ? (
          <Rise order={2}>
            <ConsistencyStrip
              progressLine={model.progressLine}
              strip={model.strip}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Full routine"
              onPress={goRoutine}
              hitSlop={10}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Text style={styles.linkText}>Full routine</Text>
              <ArrowRight size={14} color={puraAssist.muted} weight="bold" />
            </Pressable>

            {/* Two real scans → the before/after is one quiet tap away. */}
            {model.showSinceDayOne ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Since Day 1"
                onPress={goSinceDayOne}
                hitSlop={10}
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              >
                <Text style={styles.linkText}>Since Day 1</Text>
                <ArrowRight size={14} color={puraAssist.muted} weight="bold" />
              </Pressable>
            ) : null}

            {/* The ~4-week rescan nudge — a murmur, not a banner. The model
                surfaces it only when the horizon is honest (habit step 3);
                misses never change it, and it never counts days at the user. */}
            {model.rescanLine ? (
              <View style={styles.rescan}>
                <Text style={styles.rescanLine}>{model.rescanLine}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Scan again"
                  onPress={goScan}
                  hitSlop={10}
                  style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                >
                  <Text style={styles.linkText}>Scan again</Text>
                  <ArrowRight size={14} color={puraAssist.muted} weight="bold" />
                </Pressable>
              </View>
            ) : null}
          </Rise>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: puraAssist.bg },
  flex: { flex: 1 },
  whisper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: puraAssistLayout.screenPadding + 4,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    marginBottom: dsSpace.lg,
  },
  greeting: {
    ...puraAssistType.heroSerif,
    color: puraAssist.ink,
    maxWidth: 320,
  },
  focus: {
    marginTop: dsSpace.xl,
  },
  rest: {
    fontFamily: puraAssistType.heroSerif.fontFamily,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: puraAssist.muted,
    maxWidth: 300,
  },
  air: {
    flex: 1,
    minHeight: dsSpace.xl,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: dsSpace.lg,
    paddingVertical: 6,
  },
  pressed: { opacity: 0.7 },
  linkText: {
    ...dsType.bodySmMed,
    color: puraAssist.muted,
  },
  // The rescan murmur sits a beat below the record, quieter than the focus
  // card — sentence-case caption + the same quiet link treatment.
  rescan: {
    marginTop: dsSpace.xl,
  },
  rescanLine: {
    ...dsType.caption,
    color: puraAssist.muted,
    maxWidth: 300,
  },
});
