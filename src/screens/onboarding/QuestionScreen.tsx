/**
 * QuestionScreen — the soul screen AND the reusable template for every later
 * onboarding question.
 *
 * The orb arrives (continuous), shrinks to ~72px, and asks the question in ONE
 * gesture (glide + speak, no dead beat). The cards rise after, staggered. On
 * selection the chosen card stands forward, the others recede, and the orb
 * "takes the floor" — it scales up, performs a DISTINCT reaction expression,
 * speaks a short acknowledgment (full style), pulses a soft haptic synced to
 * its glow, then settles back and auto-advances. The choice is never trapped:
 * tap a different card mid-reaction and the orb gracefully switches.
 *
 * Sequencing is always one beat at a time (ask → cards rise → choose → cards
 * recede → orb reacts → advance) so the screen is rich, never cluttered.
 *
 * Reusability (props):
 *   • question, options[{icon,label,reaction,reactionLine}]
 *   • reactionStyle: 'full' (spoken line — Screen 3 / first question only) |
 *     'light' (expression shift + advance, no spoken line — later questions,
 *     to protect pace)
 *   • select: 'single' (tap answers + advances) | 'multi' (toggle + Continue)
 *   • progress dots, and the orb-as-progress warmth (familiarityFrom→To)
 *
 * Reduce-motion: orb static, question + all cards cross-fade together; on
 * select a static expression swap + the reaction line appears instantly. The
 * conceit carries on the conversational copy + the visible expression change.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import type { OrbReaction } from '@/components/AuroraOrb';
import { useOrb } from './orb/OrbHost';
import { OrbSpeech } from './orb/OrbSpeech';
import { OrbButton } from './orb/OrbButton';
import { useStepTransition } from './orb/useStepTransition';
import { ORB_SIZES, orbBottom, targetFor } from './orb/orbLayout';

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}>;

export interface QuestionOption {
  /** Stable key stored as the answer. */
  key: string;
  label: string;
  Icon: IconComponent;
  /** Which distinct orb reaction this answer triggers. */
  reaction: OrbReaction;
  /** Spoken acknowledgment (full style). `[Name]` is replaced with the user's
   *  name, or a warm neutral "you". */
  reactionLine: string;
}

export interface QuestionScreenProps {
  question: string;
  options: QuestionOption[];
  reactionStyle?: 'full' | 'light';
  select?: 'single' | 'multi';
  progress?: { index: number; total: number };
  /** Orb warmth on entry / after answering (orb-as-progress). */
  familiarityFrom?: number;
  familiarityTo?: number;
  /** The user's name for the name-thread (empty → warm neutral fallback). */
  name?: string;
  initialSelected?: string[];
  /** Persist the answer (fires the moment a choice is made/toggled). */
  onSelect?: (keys: string[]) => void;
  /** Advance to the next beat. */
  onAdvance: (keys: string[]) => void;
}

const REACTION_HOLD = 1500; // ms before auto-advance (single select)
const EASE_OUT = Easing.out(Easing.cubic);

export function QuestionScreen({
  question,
  options,
  reactionStyle = 'full',
  select = 'single',
  progress,
  familiarityFrom = 0,
  familiarityTo,
  name,
  initialSelected = [],
  onSelect,
  onAdvance,
}: QuestionScreenProps) {
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orb = useOrb();
  const { style: exitStyle, runExit } = useStepTransition(reduceMotion, { enter: false });

  const target = targetFor('question', width, height, insets.top);
  const lineTop = orbBottom(target) + 18;
  const cardsTop = Math.round(height * 0.33);

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [cardsIn, setCardsIn] = useState(reduceMotion);
  const [spoken, setSpoken] = useState(question);
  const [spokenKey, setSpokenKey] = useState(0); // re-trigger OrbSpeech
  const [askPlay, setAskPlay] = useState(reduceMotion);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const advancedRef = useRef(false);
  const selectedRef = useRef<string[]>(initialSelected);
  selectedRef.current = selected;

  const displayName = (name ?? '').trim();
  const fill = (line: string) =>
    line.replace(/\[Name\]/g, displayName || 'you');

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const push = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }, []);

  // Arrival: orb glides to the question beat AND asks in one gesture.
  useEffect(() => {
    orb.show();
    orb.setFamiliarity(familiarityFrom);
    orb.moveTo(target);
    orb.setGaze('down');

    if (reduceMotion) {
      orb.setGaze('forward');
      AccessibilityInfo.announceForAccessibility?.(question);
      return;
    }
    setAskPlay(true);
    AccessibilityInfo.announceForAccessibility?.(question);
    // Look forward partway through asking; cards rise after the line lands.
    push(() => orb.setGaze('forward'), 700);
    const askMs = 150 + question.split(' ').length * 110 + 300;
    push(() => setCardsIn(true), askMs);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance with EXPLICIT keys so a scheduled timer never reads a stale
  // `selected` from the render that armed it.
  const doAdvance = useCallback(
    (keys: string[]) => {
      if (advancedRef.current) return;
      if (select === 'single' && keys.length === 0) return;
      advancedRef.current = true;
      clearTimers();
      runExit(() => onAdvance(keys));
    },
    [select, clearTimers, runExit, onAdvance],
  );

  const choose = useCallback(
    (opt: QuestionOption) => {
      hapt.tap(); // selection registered
      if (select === 'multi') {
        setSelected((prev) =>
          prev.includes(opt.key)
            ? prev.filter((k) => k !== opt.key)
            : [...prev, opt.key],
        );
        orb.setExpression('warm');
        onSelect?.(
          selected.includes(opt.key)
            ? selected.filter((k) => k !== opt.key)
            : [...selected, opt.key],
        );
        return;
      }

      // Single select — the soul moment.
      setSelected([opt.key]);
      onSelect?.([opt.key]);
      if (familiarityTo != null) orb.setFamiliarity(familiarityTo);

      // Re-trigger cleanly if the user switches mid-reaction.
      clearTimers();
      advancedRef.current = false;

      // The orb takes the floor: scale up, react distinctly, settle back.
      orb.setSize(ORB_SIZES.reactionLift);
      orb.react(opt.reaction);
      // a softer pulse synced to the reaction glow — the user FEELS it
      push(() => hapt.assistantReply(), 130);
      push(() => orb.setSize(ORB_SIZES.question), 950);

      if (reactionStyle === 'full') {
        const line = fill(opt.reactionLine);
        setSpoken(line);
        setSpokenKey((k) => k + 1);
        AccessibilityInfo.announceForAccessibility?.(line);
      } else {
        AccessibilityInfo.announceForAccessibility?.(`${opt.label}, selected`);
      }

      push(() => doAdvance([opt.key]), REACTION_HOLD);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [select, selected, reactionStyle, familiarityTo, doAdvance],
  );

  const anySelected = select === 'single' && selected.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Tap anywhere (off a card) to skip the reaction faster. */}
      {anySelected && (
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => doAdvance(selectedRef.current)}
        />
      )}

      <Animated.View style={[StyleSheet.absoluteFill, exitStyle]} pointerEvents="box-none">
        {/* Quiet progress dots — present but never a funnel. */}
        {progress && (
          <View
            style={[styles.dots, { top: insets.top + 8 }]}
            accessibilityRole="progressbar"
            accessibilityLabel={`Question ${progress.index + 1} of ${progress.total}`}
          >
            {Array.from({ length: progress.total }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === progress.index ? styles.dotOn : styles.dotOff]}
              />
            ))}
          </View>
        )}

        {/* The orb's voice — the question, then the spoken reaction (full). */}
        <View style={[styles.lines, { top: lineTop }]} pointerEvents="none">
          {askPlay && (
            <OrbSpeech
              key={`speak-${spokenKey}`}
              text={spoken}
              reduceMotion={reduceMotion}
              textStyle={styles.question}
              accessibilityRole="header"
              wordStagger={spokenKey === 0 ? 110 : 70}
              wordDuration={spokenKey === 0 ? 450 : 320}
            />
          )}
        </View>

        {/* The cards — the user's decision. */}
        <ScrollView
          style={[styles.cards, { top: cardsTop }]}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {options.map((opt, i) => (
            <OptionCard
              key={opt.key}
              option={opt}
              index={i}
              total={options.length}
              selected={selected.includes(opt.key)}
              recede={anySelected && !selected.includes(opt.key)}
              cardsIn={cardsIn}
              riseDelay={i * 80}
              reduceMotion={reduceMotion}
              onPress={() => choose(opt)}
            />
          ))}

          {/* Multi-select needs an explicit Continue (single auto-advances). */}
          {select === 'multi' && selected.length > 0 && (
            <View style={styles.multiCta}>
              <OrbButton
                label="Continue"
                onPress={() => runExit(() => onAdvance(selected))}
                reduceMotion={reduceMotion}
              />
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function OptionCard({
  option,
  index,
  total,
  selected,
  recede,
  cardsIn,
  riseDelay,
  reduceMotion,
  onPress,
}: {
  option: QuestionOption;
  index: number;
  total: number;
  selected: boolean;
  recede: boolean;
  cardsIn: boolean;
  riseDelay: number;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const rise = useSharedValue(reduceMotion ? 1 : 0);
  const press = useSharedValue(1);
  const sel = useSharedValue(selected ? 1 : 0);
  const rec = useSharedValue(recede ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      rise.value = 1;
      return;
    }
    if (cardsIn) {
      rise.value = withDelay(riseDelay, withTiming(1, { duration: 400, easing: EASE_OUT }));
    }
  }, [cardsIn, reduceMotion, riseDelay, rise]);

  useEffect(() => {
    sel.value = reduceMotion ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, { duration: 260 });
    rec.value = reduceMotion ? (recede ? 1 : 0) : withTiming(recede ? 1 : 0, { duration: 300 });
  }, [selected, recede, reduceMotion, sel, rec]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: rise.value * (1 - rec.value * 0.5),
    transform: [
      { translateY: (1 - rise.value) * 16 },
      { scale: press.value * (1 - rec.value * 0.02) },
    ],
    borderColor: interpolateColor(sel.value, [0, 1], ['rgba(20,124,255,0)', palette.clay]),
  }));
  const tintStyle = useAnimatedStyle(() => ({ opacity: sel.value * 0.1 }));
  const iconBrightStyle = useAnimatedStyle(() => ({ opacity: sel.value }));

  const handlePress = () => {
    if (!reduceMotion) {
      press.value = withTiming(0.97, { duration: 100, easing: Easing.out(Easing.quad) }, () => {
        press.value = withSpring(1, { damping: 15, stiffness: 320 });
      });
    }
    onPress();
  };

  const Icon = option.Icon;

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.cardTint, tintStyle]} pointerEvents="none" />
      <Pressable
        style={styles.cardPress}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${option.label}, option ${index + 1} of ${total}`}
      >
        <View style={styles.iconCircle}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.iconBright, iconBrightStyle]} pointerEvents="none" />
          <Icon size={20} color={palette.clay} weight="duotone" />
        </View>
        <Text style={styles.cardLabel} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { backgroundColor: palette.clay, width: 18 },
  dotOff: { backgroundColor: palette.hairline },
  lines: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  question: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: palette.ink,
    textAlign: 'center',
  },
  cards: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
  },
  card: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#0A0B12',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTint: { backgroundColor: palette.clay, borderRadius: 16 },
  cardPress: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  iconBright: { backgroundColor: palette.clayLight, borderRadius: 18 },
  cardLabel: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 21,
    color: palette.ink,
  },
  multiCta: { marginTop: 8 },
});
