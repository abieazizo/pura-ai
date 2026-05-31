/**
 * PuraAssistConversationScreen — the full-screen conversation surface the
 * Home input dock opens. It is a ROOT-level route (covers the floating tab
 * dock, matching the reference's no-tab-bar conversation).
 *
 * The "Reading your scan" hero card is pinned at the top; the low-poly
 * AssistantFace on it IS the thinking indicator — it animates from the
 * moment the user sends until the answer finishes revealing, then settles
 * to neutral.
 *
 * There is no real token stream: `askAssistant()` resolves a single
 * `AssistantMessage` whose canonical `structured` answer we reveal with a
 * calm client-side cadence (word-by-word, sentence/paragraph pauses), so
 * the surface reads as "alive / working" without ever exposing raw AI
 * output or implementation details (per CLAUDE.md). Pre-scan, the hero
 * degrades to an honest "no scan yet" line.
 *
 * Reads ONLY `puraAssist` tokens — no hex literals.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  CaretLeft,
  Moon,
  Prohibit,
  Scan,
  Sparkle,
} from 'phosphor-react-native';

import {
  puraAssist,
  puraAssistRadius,
  puraAssistShadow,
  puraAssistType,
} from '@/theme';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useAppStore } from '@/store/useAppStore';
import { askAssistant } from '@/api/assistant';
import type { AssistantMessage } from '@/types';
import { useAssistSignal } from '@/state/assistSignal';
import type { RootStackParamList } from '@/navigation/types';
import { AssistantFace } from './AssistantFace';
import { AssistInputBar } from './AssistInputBar';

// ---------------------------------------------------------------------------
// Conversation model
// ---------------------------------------------------------------------------

type TurnStatus = 'thinking' | 'streaming' | 'done' | 'error';

interface UserTurn {
  id: string;
  role: 'user';
  text: string;
  at: number;
}
interface AssistantTurnT {
  id: string;
  role: 'assistant';
  status: TurnStatus;
  /** The user text that prompted this turn — kept for retry. */
  sourceText: string;
  message?: AssistantMessage;
  at: number;
}
type Turn = UserTurn | AssistantTurnT;

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function PuraAssistConversationScreen() {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AssistChat'>>();
  const signal = useAssistSignal();
  const scans = useAppStore((s) => s.scans);
  const latestScan = scans.length > 0 ? scans[scans.length - 1] : undefined;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput | null>(null);
  const sentInitial = useRef(false);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      try {
        scrollRef.current?.scrollToEnd({ animated: !reduce });
      } catch {
        /* not mounted */
      }
    });
  }, [reduce]);

  // The face thinks while any assistant turn is awaiting OR revealing.
  const isThinking = useMemo(
    () =>
      turns.some(
        (t) =>
          t.role === 'assistant' &&
          (t.status === 'thinking' || t.status === 'streaming'),
      ),
    [turns],
  );

  // ---- Send / receive ----------------------------------------------------
  const runAssistant = useCallback(
    async (asstId: string, text: string) => {
      try {
        const message = await askAssistant({
          text,
          latestScan,
          messageId: asstId,
        });
        setTurns((prev) =>
          prev.map((t) =>
            t.id === asstId && t.role === 'assistant'
              ? { ...t, status: 'streaming', message }
              : t,
          ),
        );
      } catch {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === asstId && t.role === 'assistant'
              ? { ...t, status: 'error' }
              : t,
          ),
        );
      }
    },
    [latestScan],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      // Don't fire a second request while the last one is still awaiting.
      const last = turns[turns.length - 1];
      if (last && last.role === 'assistant' && last.status === 'thinking') {
        return;
      }
      hapt.tap();
      setDraft('');
      Keyboard.dismiss();
      const at = Date.now();
      const userId = `u-${at}`;
      const asstId = `a-${at}`;
      setTurns((prev) => [
        ...prev,
        { id: userId, role: 'user', text, at },
        { id: asstId, role: 'assistant', status: 'thinking', sourceText: text, at },
      ]);
      scrollToEnd();
      void runAssistant(asstId, text);
    },
    [turns, runAssistant, scrollToEnd],
  );

  const retry = useCallback(
    (asstId: string, text: string) => {
      hapt.tap();
      setTurns((prev) =>
        prev.map((t) =>
          t.id === asstId && t.role === 'assistant'
            ? { ...t, status: 'thinking' }
            : t,
        ),
      );
      void runAssistant(asstId, text);
    },
    [runAssistant],
  );

  const markDone = useCallback((asstId: string) => {
    setTurns((prev) =>
      prev.map((t) =>
        t.id === asstId && t.role === 'assistant'
          ? { ...t, status: 'done' }
          : t,
      ),
    );
  }, []);

  const onNewThread = useCallback(() => {
    hapt.select();
    setTurns([]);
    setDraft('');
  }, []);

  // Optional deep-link: open with a pre-filled question and auto-send once.
  useEffect(() => {
    const initial = route.params?.initialMessage?.trim();
    if (initial && !sentInitial.current) {
      sentInitial.current = true;
      send(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.initialMessage]);

  // ---- Follow-up chips ----------------------------------------------------
  const initialChips = useMemo(() => {
    if (!signal.scanReady) {
      return [
        'What should I do tonight?',
        'Build a simple PM routine',
        'What should I avoid?',
      ];
    }
    const zone = signal.focusZoneLabel;
    const first =
      zone === 'Overall'
        ? "What's my barrier like tonight?"
        : `Why only my ${zone.toLowerCase()}?`;
    return [first, 'Build my PM routine', 'Compare to last scan'];
  }, [signal.scanReady, signal.focusZoneLabel]);

  const activeChips = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (
        t.role === 'assistant' &&
        t.status === 'done' &&
        t.message?.structured?.followUps?.length
      ) {
        return t.message.structured.followUps.slice(0, 4);
      }
      // A turn still in flight suppresses chips until it settles.
      if (t.role === 'assistant' && t.status !== 'done' && t.status !== 'error') {
        return [];
      }
    }
    return turns.length === 0 ? initialChips : [];
  }, [turns, initialChips]);

  const firstAt = turns.length > 0 ? turns[0].at : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ---- Header ---- */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            onPress={() => {
              hapt.tap();
              nav.goBack();
            }}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.dim]}
          >
            <CaretLeft size={22} color={puraAssist.ink} weight="bold" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Pura Assist</Text>
            <Text style={styles.headerSub}>Scan-aware skincare AI</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a new thread"
            hitSlop={10}
            onPress={onNewThread}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.dim]}
          >
            <Sparkle size={20} color={puraAssist.blue} weight="fill" />
          </Pressable>
        </View>

        {/* ---- Reading-your-scan hero (pinned; carries the face) ---- */}
        <ReadingScanCard
          scanReady={signal.scanReady}
          chips={signal.scanChips}
          noScanLine={signal.scanContextLine}
          thinking={isThinking}
        />

        {/* ---- Conversation ---- */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            try {
              scrollRef.current?.scrollToEnd({ animated: false });
            } catch {
              /* not mounted */
            }
          }}
        >
          {firstAt !== null ? (
            <Text style={styles.dayLabel}>Today, {clock(firstAt)}</Text>
          ) : (
            <EmptyHint scanReady={signal.scanReady} />
          )}

          {turns.map((t) =>
            t.role === 'user' ? (
              <UserBubble key={t.id} text={t.text} reduce={reduce} />
            ) : (
              <AssistantTurn
                key={t.id}
                turn={t}
                scanReady={signal.scanReady}
                focusZoneLabel={signal.focusZoneLabel}
                reduce={reduce}
                onComplete={() => markDone(t.id)}
                onRetry={() => retry(t.id, t.sourceText)}
              />
            ),
          )}
        </ScrollView>

        {/* ---- Follow-up chips ---- */}
        {activeChips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            {activeChips.map((c, i) => (
              <Animated.View
                key={`${c}-${i}`}
                entering={
                  reduce ? undefined : FadeInDown.duration(260).delay(i * 50)
                }
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c}
                  onPress={() => send(c)}
                  style={({ pressed }) => [styles.chip, pressed && styles.dim]}
                >
                  <Text style={styles.chipText} numberOfLines={1}>
                    {c}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        ) : null}

        {/* ---- Composer (identical to Home) ---- */}
        <AssistInputBar
          mode="composer"
          value={draft}
          onChangeText={setDraft}
          onSend={() => send(draft)}
          inputRef={inputRef}
          bottomInset={insets.bottom}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Reading-your-scan hero card
// ---------------------------------------------------------------------------

function ReadingScanCard({
  scanReady,
  chips,
  noScanLine,
  thinking,
}: {
  scanReady: boolean;
  chips: string[];
  noScanLine: string;
  thinking: boolean;
}) {
  return (
    <View style={styles.scanCard}>
      <View style={styles.scanCardCopy}>
        <View style={styles.scanCardTitleRow}>
          <Scan size={16} color={puraAssist.blue} weight="bold" />
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor: scanReady
                  ? puraAssist.green
                  : puraAssist.veryMuted,
              },
            ]}
          />
          <Text style={styles.scanCardTitle}>
            {scanReady ? 'Reading your scan' : 'No scan yet'}
          </Text>
        </View>
        {scanReady ? (
          <View style={styles.scanChipsWrap}>
            {chips.map((c) => (
              <View key={c} style={styles.scanChip}>
                <Text style={styles.scanChipText}>{c}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.scanNoScan}>{noScanLine}</Text>
        )}
      </View>
      <AssistantFace thinking={thinking} size={52} />
    </View>
  );
}

function EmptyHint({ scanReady }: { scanReady: boolean }) {
  return (
    <Text style={styles.emptyHint}>
      {scanReady
        ? 'Ask anything about tonight — what changed, what to use, what to skip.'
        : 'Ask about your routine, ingredients, or what to do tonight.'}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// User bubble
// ---------------------------------------------------------------------------

function UserBubble({ text, reduce }: { text: string; reduce: boolean }) {
  return (
    <Animated.View
      entering={reduce ? undefined : FadeInDown.duration(200)}
      style={styles.userRow}
    >
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Assistant turn
// ---------------------------------------------------------------------------

function AssistantTurn({
  turn,
  scanReady,
  focusZoneLabel,
  reduce,
  onComplete,
  onRetry,
}: {
  turn: AssistantTurnT;
  scanReady: boolean;
  focusZoneLabel: string;
  reduce: boolean;
  onComplete: () => void;
  onRetry: () => void;
}) {
  const [revealed, setRevealed] = useState(turn.status === 'done');

  const structured = turn.message?.structured;
  const body = structured?.summary ?? turn.message?.text ?? '';
  const steps = structured?.steps ?? [];
  const avoid = structured?.avoid ?? [];
  const why = structured?.why;

  const showAttribution =
    turn.status === 'thinking'
      ? scanReady
      : !!turn.message?.groundedFrom?.length;

  const onBodyDone = useCallback(() => {
    setRevealed(true);
    onComplete();
  }, [onComplete]);

  return (
    <Animated.View
      entering={reduce ? undefined : FadeIn.duration(220)}
      style={styles.assistantRow}
    >
      <View style={styles.assistantCard}>
        {showAttribution ? (
          <View style={styles.attributionRow}>
            <Sparkle size={12} color={puraAssist.blue} weight="fill" />
            <Text style={styles.attributionText}>Based on tonight’s scan</Text>
          </View>
        ) : null}

        {turn.status === 'thinking' ? (
          <ThinkingLine reduce={reduce} />
        ) : turn.status === 'error' ? (
          <ErrorBlock onRetry={onRetry} />
        ) : (
          <>
            <StreamingBody
              text={body}
              reduce={reduce}
              instant={turn.status === 'done'}
              onComplete={onBodyDone}
            />
            {revealed && steps.length > 0 ? (
              <TonightSubCard
                steps={steps}
                focusZoneLabel={focusZoneLabel}
                at={turn.at}
                reduce={reduce}
              />
            ) : null}
            {revealed && avoid.length > 0 ? (
              <Animated.View
                entering={reduce ? undefined : FadeIn.duration(240)}
                style={styles.avoidRow}
              >
                <Prohibit size={14} color={puraAssist.muted} weight="bold" />
                <Text style={styles.avoidText}>Skip tonight: {avoid.join(' · ')}</Text>
              </Animated.View>
            ) : null}
            {revealed && why ? (
              <Animated.Text
                entering={reduce ? undefined : FadeIn.duration(240)}
                style={styles.whyText}
              >
                {why}
              </Animated.Text>
            ) : null}
          </>
        )}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Tonight sub-card (nested)
// ---------------------------------------------------------------------------

function TonightSubCard({
  steps,
  focusZoneLabel,
  at,
  reduce,
}: {
  steps: string[];
  focusZoneLabel: string;
  at: number;
  reduce: boolean;
}) {
  return (
    <Animated.View
      entering={reduce ? undefined : FadeInDown.duration(260).delay(80)}
      style={styles.subCard}
    >
      <View style={styles.subCardHead}>
        <Moon size={14} color={puraAssist.blue} weight="fill" />
        <Text style={styles.subCardTitle}>Tonight</Text>
        <View style={styles.flex} />
        <Text style={styles.subCardMeta}>
          {focusZoneLabel === 'Overall' ? 'Overall' : `${focusZoneLabel} focus`}
        </Text>
      </View>
      <View style={styles.subCardSteps}>
        {steps.slice(0, 4).map((s, i) => (
          <View key={`${s}-${i}`} style={styles.subCardStep}>
            <View style={styles.stepIndex}>
              <Text style={styles.stepIndexText}>{i + 1}</Text>
            </View>
            <Text style={styles.subCardStepText}>{s}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.subCardTime}>{clock(at)}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Streaming body — calm client-side reveal of the canonical summary
// ---------------------------------------------------------------------------

function StreamingBody({
  text,
  reduce,
  instant,
  onComplete,
}: {
  text: string;
  reduce: boolean;
  instant: boolean;
  onComplete: () => void;
}) {
  const [count, setCount] = useState(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const tokens = useMemo(() => {
    const out: string[] = [];
    const re = /\S+|\s+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) out.push(m[0]);
    return out;
  }, [text]);

  useEffect(() => {
    if (reduce || instant || tokens.length === 0) {
      setCount(tokens.length);
      completeRef.current();
      return;
    }
    let cancelled = false;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      i += 1;
      setCount(i);
      if (i >= tokens.length) {
        completeRef.current();
        return;
      }
      const just = tokens[i - 1] ?? '';
      let delay = 26; // natural word rhythm
      if (/\n\n/.test(just)) delay = 190; // paragraph
      else if (/[.?!;]"?$/.test(just.trim())) delay = 95; // sentence end
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 26);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tokens, reduce, instant]);

  const visible = useMemo(
    () => tokens.slice(0, count).join(''),
    [tokens, count],
  );
  const done = count >= tokens.length;

  return (
    <Text style={styles.answerBody}>
      {visible}
      {!done && !reduce && !instant ? <Cursor /> : null}
    </Text>
  );
}

function Cursor() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 360, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 360, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(o);
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.Text style={[styles.cursor, s]}>▍</Animated.Text>;
}

// ---------------------------------------------------------------------------
// Thinking luminance line + Still-thinking acknowledgement
// ---------------------------------------------------------------------------

function ThinkingLine({ reduce }: { reduce: boolean }) {
  const lum = useSharedValue(0.35);
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    if (reduce) {
      lum.value = 0.7;
      return;
    }
    lum.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    const t = setTimeout(() => setLongWait(true), 8000);
    return () => {
      cancelAnimation(lum);
      clearTimeout(t);
    };
  }, [reduce, lum]);

  const s = useAnimatedStyle(() => ({ opacity: lum.value }));

  return (
    <View
      style={styles.thinkingWrap}
      accessibilityRole="text"
      accessibilityLabel="Pura is thinking"
    >
      <Animated.View style={[styles.thinkingLine, s]} />
      {longWait ? (
        <Animated.Text
          entering={reduce ? undefined : FadeIn.duration(320)}
          style={styles.thinkingLong}
        >
          Still thinking…
        </Animated.Text>
      ) : null}
    </View>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorText}>Couldn’t finish that thought.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        hitSlop={6}
        onPress={onRetry}
        style={({ pressed }) => [pressed && styles.dim]}
      >
        <Text style={styles.errorRetry}>Try again</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraAssist.bg,
  },
  flex: { flex: 1 },
  dim: { opacity: 0.6 },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...puraAssistType.headerTitle,
    color: puraAssist.ink,
  },
  headerSub: {
    ...puraAssistType.headerSub,
    color: puraAssist.muted,
    marginTop: 1,
  },

  // ---- Reading-your-scan hero ----
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: puraAssist.blue05,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.blue15,
  },
  scanCardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  scanCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  scanCardTitle: {
    ...puraAssistType.cardTitle,
    color: puraAssist.ink,
  },
  scanChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scanChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: puraAssistRadius.pill,
    backgroundColor: puraAssist.blue08,
  },
  scanChipText: {
    ...puraAssistType.chip,
    color: puraAssist.blueText,
  },
  scanNoScan: {
    ...puraAssistType.subCardMeta,
    color: puraAssist.muted,
  },

  // ---- Conversation list ----
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 14,
  },
  dayLabel: {
    ...puraAssistType.timestamp,
    color: puraAssist.veryMuted,
    textAlign: 'center',
    marginBottom: 2,
  },
  emptyHint: {
    ...puraAssistType.subhead,
    color: puraAssist.veryMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // ---- User bubble ----
  userRow: {
    alignSelf: 'flex-end',
    maxWidth: '84%',
  },
  userBubble: {
    backgroundColor: puraAssist.blue,
    borderTopLeftRadius: puraAssistRadius.bubble,
    borderTopRightRadius: puraAssistRadius.bubble,
    borderBottomLeftRadius: puraAssistRadius.bubble,
    borderBottomRightRadius: puraAssistRadius.bubbleTail,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  userText: {
    ...puraAssistType.answerBody,
    color: puraAssist.onBlue,
  },

  // ---- Assistant card ----
  assistantRow: {
    alignSelf: 'stretch',
    maxWidth: '96%',
  },
  assistantCard: {
    backgroundColor: puraAssist.surface,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    ...puraAssistShadow.card,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attributionText: {
    ...puraAssistType.attribution,
    color: puraAssist.blueText,
  },
  answerBody: {
    ...puraAssistType.answerBody,
    color: puraAssist.ink,
  },
  cursor: {
    ...puraAssistType.answerBody,
    color: puraAssist.blue,
  },

  // ---- Tonight sub-card ----
  subCard: {
    backgroundColor: puraAssist.cardSubBg,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  subCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  subCardTitle: {
    ...puraAssistType.subCardLabel,
    color: puraAssist.ink,
  },
  subCardMeta: {
    ...puraAssistType.subCardMeta,
    color: puraAssist.veryMuted,
  },
  subCardSteps: {
    gap: 10,
  },
  subCardStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepIndex: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: puraAssist.blue08,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepIndexText: {
    ...puraAssistType.chip,
    fontSize: 11,
    color: puraAssist.blueText,
  },
  subCardStepText: {
    ...puraAssistType.subCardMeta,
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: puraAssist.ink,
  },
  subCardTime: {
    ...puraAssistType.timestamp,
    color: puraAssist.veryMuted,
    textAlign: 'right',
  },

  // ---- Avoid / why ----
  avoidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  avoidText: {
    ...puraAssistType.subCardMeta,
    flex: 1,
    color: puraAssist.muted,
  },
  whyText: {
    ...puraAssistType.subCardMeta,
    color: puraAssist.muted,
  },

  // ---- Thinking ----
  thinkingWrap: {
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  thinkingLine: {
    height: 1,
    width: 120,
    borderRadius: 0.5,
    backgroundColor: puraAssist.blue,
  },
  thinkingLong: {
    ...puraAssistType.subCardMeta,
    color: puraAssist.veryMuted,
    fontStyle: 'italic',
    marginTop: 10,
  },

  // ---- Error ----
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    ...puraAssistType.subCardMeta,
    color: puraAssist.muted,
  },
  errorRetry: {
    ...puraAssistType.attribution,
    color: puraAssist.blue,
    textDecorationLine: 'underline',
  },

  // ---- Follow-up chips ----
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: puraAssistRadius.pill,
    backgroundColor: puraAssist.blue08,
  },
  chipText: {
    ...puraAssistType.chip,
    color: puraAssist.blueText,
  },
});
