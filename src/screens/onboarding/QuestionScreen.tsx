/**
 * QuestionScreen — the reusable question renderer, driven entirely by a
 * QuestionConfig (no hardcoded copy). Screens 3, 4, 5 are all this component
 * with a different config + runtime context.
 *
 * It handles: {goal} interpolation with fallback (+ the whisper of distinction
 * on the injected word), threading a prior answer into the framing, the
 * single-select reaction loop with the two-thread archetype + verbosity
 * threading, changed-mind grace, hesitation, the quiet progress rail, dark
 * mode, forward / backward / z-axis transitions, and the robustness/edge cases.
 *
 * Sequencing stays one beat at a time: ask → cards rise → choose → cards
 * recede → orb reacts (takes the floor, speaks, settles) → advance.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { dsAmbient, ds, dsRadius } from '@/theme';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useOrb } from './orb/OrbHost';
import { OrbSpeech } from './orb/OrbSpeech';
import { useStepTransition, type ExitMode } from './orb/useStepTransition';
import { ORB_SIZES, orbBottom, targetFor } from './orb/orbLayout';
import { QuestionCard, type CardEnterMode } from './QuestionCard';
import { ProgressRail } from './ProgressRail';
import {
  estimateLineMs,
  pickReactionLine,
  resolveQuestion,
  verbosityTiming,
  type QuestionConfig,
  type QuestionOption,
} from './questionConfig';
import {
  useOnboardingTheme,
  useReduceTransparency,
} from './orb/onboardingTheme';

// The progress rail is standardized to Pura Blue across every step so its color
// reads as intentional brand — not an accidental per-question violet→blue swap.
const RAIL_ACCENT_LIGHT = '#147CFF';
const RAIL_ACCENT_DARK = '#5AA0FF';

const Q_STAGGER = 70;
const Q_DURATION = 340;
const HESITATE_MS = 4000;
const HESITATE_WARM_MS = 8000;
const DOUBLE_TAP_MS = 250;

interface SpeechState {
  text: string;
  stagger: number;
  duration: number;
  accent: string[];
  key: number;
  /** 'question' = the prompt (larger serif); 'reaction' = the orb's spoken
   *  reply (smaller, more intimate serif). Drives the text size only. */
  kind: 'question' | 'reaction';
}

export interface QuestionScreenProps {
  config: QuestionConfig;
  /** Stored goal value (for {goal} interpolation). */
  goal?: string | null;
  /** Prior answer used to reframe (e.g. guidance threading Screen 5). */
  threadKey?: string | null;
  /** User's name (for [Name] in reaction lines). */
  name?: string;
  /** Progress rail: fill at entry → fill to ease to. Also drives orb warmth. */
  progressFrom: number;
  progressTo: number;
  /** Backward nav: cards instant with prior selection, no stagger. */
  backward?: boolean;
  /** Forward entrance: 'rise' (default) or 'z' (emerge from depth, for 4→5). */
  enterMode?: 'rise' | 'z';
  /** Exit on advance: 'lift' (default) or 'z' (recede into depth, for 4→5). */
  exitMode?: ExitMode;
  initialSelected?: string | null;
  onSelect?: (value: string, optionId: string) => void;
  onAdvance: (value: string, optionId: string) => void;
}

export function QuestionScreen({
  config,
  goal,
  threadKey,
  name,
  progressFrom,
  progressTo,
  backward = false,
  enterMode = 'rise',
  exitMode = 'lift',
  initialSelected = null,
  onSelect,
  onAdvance,
}: QuestionScreenProps) {
  const reduceMotion = useReduceMotion();
  const reduceTransparency = useReduceTransparency();
  const { dark, colors } = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orb = useOrb();
  const { style: exitStyle, runExit, cancelExit } = useStepTransition(reduceMotion, { enter: false });

  const target = targetFor('question', width, height, insets.top);
  const lineTop = orbBottom(target) + 18;
  // Cards drop a touch lower so the larger display-scale question (up to three
  // lines) has confident breathing room above the decision.
  const cardsTop = Math.round(height * 0.37);
  const trackWidth = width - 48;
  const accent = dark ? RAIL_ACCENT_DARK : RAIL_ACCENT_LIGHT;

  // Portrait-frame medallion geometry — a rounded-portrait hairline frame
  // centered on the orb's settle, layered over the existing pool/bloom so the
  // companion reads as a framed portrait subject (Cycle 12 shared imagery
  // language, matching the scan capture card). Purely atmospheric.
  const medW = Math.round(target.size * 1.95);
  const medH = Math.round(medW * 1.16);

  const resolved = resolveQuestion(config, { goal, threadKey });
  const displayName = (name ?? '').trim();
  const fillName = (line: string) => line.replace(/\[Name\]/g, displayName || 'you');

  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [cardsIn, setCardsIn] = useState(reduceMotion || backward);
  const [anticipatingId, setAnticipatingId] = useState<string | null>(null);
  const [speech, setSpeech] = useState<SpeechState>({
    text: resolved.text,
    stagger: Q_STAGGER,
    duration: Q_DURATION,
    accent: resolved.accentWords,
    key: 0,
    kind: 'question',
  });

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // advanceLockRef — THE single commit lock: the screen advances EXACTLY ONCE
  // per transition no matter how it's triggered (completion callback, web
  // fallback, tap-to-skip, or background-resume). Fresh per mount (each step is
  // a keyed remount), satisfying "reset the lock when a new screen mounts".
  const advanceLockRef = useRef(false);
  // exitStartedRef — guards STARTING the exit animation more than once.
  const exitStartedRef = useRef(false);
  const selectedRef = useRef<string | null>(initialSelected);
  selectedRef.current = selected;
  const lastTap = useRef<{ id: string; t: number }>({ id: '', t: 0 });
  const pendingAdvance = useRef<{ value: string; id: string } | null>(null);

  const containerFade = useSharedValue(reduceMotion ? 0 : 1);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const push = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }, []);

  const armHesitation = useCallback(() => {
    push(() => {
      if (!selectedRef.current) {
        orb.encourage(); // brows lift + one soft glow pulse — "take your time"
        orb.setPatient(true); // gaze drifts gently across the cards
      }
    }, HESITATE_MS);
    push(() => {
      if (!selectedRef.current) {
        orb.blinkNow();
        orb.setExpression('warm'); // one warmer beat — waiting WITH the user
      }
    }, HESITATE_WARM_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orb, push]);

  // ---- Arrival: minimal orb motion (a continuation), the CONTENT transitions.
  useEffect(() => {
    orb.show();
    orb.setAura(config.orbAuraTheme); // shifts the tint at a question seam
    orb.setFamiliarity(progressTo); // orb-as-progress warms across questions
    orb.moveTo(target);

    if (reduceMotion) {
      orb.setGaze('forward');
      containerFade.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
      AccessibilityInfo.announceForAccessibility?.(resolved.text);
      return clearTimers;
    }
    if (backward) {
      // Return: everything already in place, prior selection shown.
      orb.setGaze('forward');
      AccessibilityInfo.announceForAccessibility?.(resolved.text);
      return clearTimers;
    }

    orb.setGaze('down');
    AccessibilityInfo.announceForAccessibility?.(resolved.text);
    push(() => orb.setGaze('forward'), 700);
    const askMs = 150 + resolved.text.split(' ').length * Q_STAGGER + 280;
    push(() => {
      setCardsIn(true);
      orb.attend(); // the cards are up — look down at them WITH the user
      armHesitation();
    }, askMs);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Backgrounding mid-reaction → restore to a clean settled idle.
  // Native only: on web, AppState/visibility semantics differ (a non-focused
  // page would wrongly clear the advance timers).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') {
        clearTimers(); // never fire an advance while backgrounded
      } else if (pendingAdvance.current && !advanceLockRef.current) {
        orb.blinkNow(); // clear any frozen mid-blink frame
        const p = pendingAdvance.current;
        // Complete to the already-targeted screen exactly once — the lock guards
        // against a stale double-advance; no surprise jump.
        push(() => commitAdvance(p.value, p.id), 400);
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setQuestionSpeech = () =>
    setSpeech((s) => ({
      text: resolved.text,
      stagger: Q_STAGGER,
      duration: Q_DURATION,
      accent: resolved.accentWords,
      key: s.key + 1,
      kind: 'question',
    }));

  const speak = (text: string, v: { stagger: number; duration: number }, accentWords: string[] = []) =>
    setSpeech((s) => ({ text, stagger: v.stagger, duration: v.duration, accent: accentWords, key: s.key + 1, kind: 'reaction' }));

  // The single idempotent commit — performs the actual advance. Whichever
  // trigger reaches it first wins; later calls are harmless no-ops.
  const commitAdvance = useCallback(
    (value: string, id: string) => {
      if (advanceLockRef.current) return;
      advanceLockRef.current = true;
      clearTimers();
      orb.setPatient(false);
      onAdvance(value, id);
    },
    [clearTimers, orb, onAdvance],
  );

  // Start the exit animation; the advance fires from its OWN completion callback
  // (native) or the web-only fallback inside runExit. Guarded so the exit only
  // starts once.
  const beginAdvance = useCallback(
    (value: string, id: string) => {
      if (advanceLockRef.current || exitStartedRef.current) return;
      exitStartedRef.current = true;
      clearTimers();
      orb.setPatient(false);
      runExit(() => commitAdvance(value, id), exitMode);
    },
    [clearTimers, orb, runExit, commitAdvance, exitMode],
  );

  // Tap-to-skip: cancel the exit animation + web fallback, then commit through
  // the SAME lock — no double-advance, no advance-to-wrong-screen.
  const skipNow = useCallback(() => {
    const p = pendingAdvance.current;
    if (!p) return;
    cancelExit();
    commitAdvance(p.value, p.id);
  }, [cancelExit, commitAdvance]);

  const deliverReaction = useCallback(
    (option: QuestionOption, changed: boolean) => {
      clearTimers();
      orb.setPatient(false);
      orb.setSize(ORB_SIZES.reactionLift); // "take the floor"

      const line = fillName(pickReactionLine(option, goal));
      const vt = verbosityTiming(option.reactionVerbosity);
      const v = { stagger: vt.wordStagger, duration: vt.wordDuration };
      const lineMs = estimateLineMs(line, option.reactionVerbosity);
      pendingAdvance.current = { value: option.value, id: option.id };

      const fireReaction = () => {
        orb.reactArchetype(option.reactionExpression, {
          lineMs,
          competence: option.competenceWeight,
          warmth: option.warmthWeight,
        });
        push(() => hapt.assistantReply(), 130); // soft pulse synced to the glow
        speak(line, v);
        AccessibilityInfo.announceForAccessibility?.(line);
        push(() => orb.setSize(ORB_SIZES.question), lineMs + 220); // settle back
        const hold = reduceMotion ? 1400 : lineMs + 400; // ~400ms after last word
        push(() => beginAdvance(option.value, option.id), hold);
      };

      if (changed && !reduceMotion) {
        // Changed-mind grace: a brief warm acknowledgment BEFORE B's reaction.
        orb.setExpression('warm');
        orb.blinkNow();
        speak('Ah — this one instead.', { stagger: 55, duration: 220 });
        push(fireReaction, 620);
      } else {
        fireReaction();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goal, reduceMotion],
  );

  const choose = useCallback(
    (id: string) => {
      const option = config.options.find((o) => o.id === id);
      if (!option) return;
      const now = Date.now();
      // Debounce: ignore a rapid repeat tap on the SAME card.
      if (lastTap.current.id === id && now - lastTap.current.t < DOUBLE_TAP_MS) return;
      const changed = selectedRef.current != null && selectedRef.current !== id;
      lastTap.current = { id, t: now };
      // Once the exit has started/committed, ignore further card taps (no
      // re-react, no advance-to-wrong-screen). Changing your mind DURING the
      // reaction (before the exit starts) is still allowed.
      if (advanceLockRef.current || exitStartedRef.current) return;

      setSelected(id);
      onSelect?.(option.value, id);
      deliverReaction(option, changed);
    },
    [config.options, onSelect, deliverReaction],
  );

  const anySelected = selected != null;

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerFade.value }));

  const cardEnter: CardEnterMode = backward ? 'instant' : enterMode === 'z' ? 'z' : 'rise';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.base }]} edges={['top', 'bottom']}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      {/* Dark: a faint radial pool so the orb sits in its own light. */}
      {dark && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient id="orbPool" cx="50%" cy={`${(target.cy / height) * 100}%`} r="46%">
                <Stop offset="0%" stopColor={colors.liftTop} />
                <Stop offset="100%" stopColor={colors.liftBottom} />
              </RadialGradient>
            </Defs>
            <Circle cx={width / 2} cy={target.cy} r={width * 0.7} fill="url(#orbPool)" />
          </Svg>
        </View>
      )}

      {/* Light: a soft porcelain bloom behind the orb + a cool floor wash, so
          light mode gains the same color-based depth the dark pool gives —
          the orb sits in its own light instead of on flat paper. The bloom
          tint is the ambient day glow (a whisper of brand), never a second
          accent. pointerEvents none — purely atmospheric. */}
      {!dark && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient id="orbBloomLight" cx="50%" cy={`${(target.cy / height) * 100}%`} r="60%">
                <Stop offset="0%" stopColor={dsAmbient.day.glow} />
                <Stop offset="48%" stopColor={dsAmbient.day.sky[1]} />
                <Stop offset="100%" stopColor={colors.base} />
              </RadialGradient>
            </Defs>
            <Circle cx={width / 2} cy={target.cy} r={width * 0.78} fill="url(#orbBloomLight)" />
          </Svg>
        </View>
      )}

      {/* Portrait-frame medallion — a rounded-portrait hairline frame centered
          on the orb, the shared Cycle 12 imagery language (matches the scan
          capture card). Layered over the pool/bloom, beneath all content. */}
      <View
        style={[
          styles.medallion,
          {
            width: medW,
            height: medH,
            left: width / 2 - medW / 2,
            top: target.cy - medH / 2,
            borderColor: dark ? 'rgba(255,255,255,0.10)' : ds.hairline,
          },
        ]}
        pointerEvents="none"
      />

      {/* Tap anywhere (off a card) to skip the reaction faster. */}
      {anySelected && (
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={skipNow}
        />
      )}

      <Animated.View style={[StyleSheet.absoluteFill, containerStyle, exitStyle]} pointerEvents="box-none">
        {/* Quiet progress rail (a bar; the count is hidden). */}
        <View style={[styles.railWrap, { top: insets.top + 12 }]}>
          <ProgressRail
            from={progressFrom}
            to={progressTo}
            accent={accent}
            trackColor={colors.railTrack}
            trackWidth={trackWidth}
            reduceMotion={reduceMotion}
          />
        </View>

        {/* Eyebrow (Inter SemiBold caps) — tabular so the number never shifts. */}
        {!!config.eyebrow && (
          <Text style={[styles.eyebrow, { top: insets.top + 28, color: colors.eyebrow }]}>
            {config.eyebrow}
          </Text>
        )}

        {/* The orb's voice — the question, then the spoken reaction. Width is
            bound to the 24px side margins so it ALWAYS wraps within them; the
            question (larger) also fit-shrinks rather than spilling to a 4th line. */}
        <View style={[styles.lines, { top: lineTop }]} pointerEvents="none">
          <OrbSpeech
            key={`speak-${speech.key}`}
            text={speech.text}
            reduceMotion={reduceMotion || backward}
            textStyle={[speech.kind === 'reaction' ? styles.reaction : styles.question, { color: colors.serif }]}
            accentWords={speech.accent}
            accentStyle={{ color: colors.serifAccent }}
            accessibilityRole="header"
            wordStagger={speech.stagger}
            wordDuration={speech.duration}
            maxWidth={width - 48}
            numberOfLines={speech.kind === 'reaction' ? undefined : 3}
            adjustsFontSizeToFit={speech.kind !== 'reaction'}
            minimumFontScale={speech.kind === 'reaction' ? undefined : 0.82}
          />
        </View>

        {/* The cards — the user's decision. */}
        <ScrollView
          style={[styles.cards, { top: cardsTop }]}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {config.options.map((opt, i) => (
            <QuestionCard
              key={opt.id}
              option={opt}
              index={i}
              total={config.options.length}
              selected={selected === opt.id}
              recede={anySelected && selected !== opt.id}
              dimmed={anticipatingId != null && anticipatingId !== opt.id && !anySelected}
              enterMode={cardEnter}
              riseDelay={i * 60}
              reduceMotion={reduceMotion}
              reduceTransparency={reduceTransparency}
              dark={dark}
              colors={colors}
              onPressIn={(id) => setAnticipatingId(id)}
              onPressOut={() => setAnticipatingId(null)}
              onPress={choose}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Portrait-frame medallion (Cycle 12 shared imagery language).
  medallion: {
    position: 'absolute',
    borderRadius: dsRadius.xxl,
    borderWidth: 1,
  },
  railWrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  eyebrow: {
    position: 'absolute',
    left: 24,
    right: 24,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  lines: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  // Display-scale prompt — the orb's question lands as a dramatic editorial
  // statement. adjustsFontSizeToFit (set on the OrbSpeech static path) keeps a
  // long line within three lines, so this larger base only amplifies presence.
  question: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.1,
    textAlign: 'center',
  },
  // The orb's spoken reply — more intimate than the prompt, still elevated.
  reaction: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  cards: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
