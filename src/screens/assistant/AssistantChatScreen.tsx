/**
 * AssistantChatScreen — Pura AI Assist, chat-first.
 *
 * A calm, expensive, intelligent companion surface. Not a generic chat
 * library, not a ChatGPT clone — a Pura-native chat where:
 *
 *   • The empty state is a confident editorial moment (serif greeting +
 *     four considered prompt cards).
 *   • User and assistant messages are asymmetric: the user is a
 *     contained terracotta-soft pill; the assistant reads as clean
 *     editorial text on Paper.
 *   • The thinking state is a Pura-native moment — a quiet terracotta
 *     spark with a serif "thinking…" — not a generic dot spinner.
 *   • Rich assistant content (product picks, tonight rituals) renders
 *     as designed inline components, never as a wall of markdown.
 *   • Motion is intentional: subtle rise + fade on enter, calm
 *     auto-scroll, deliberate empty → first-message transition.
 *
 * The screen reads canonical state via `useTonightObservation` (the
 * single skin-aware contract) so chat answers stay grounded in real
 * scan-derived facts rather than hallucinated assistant context.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowUp,
  Sparkle,
  Camera,
  Plus,
} from 'phosphor-react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { puraColors, puraSpace } from '@/design/puraTokens';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTonightObservation } from '@/state/tonightObservation';
import { useAppStore } from '@/store/useAppStore';

// ============================================================================
// Conversation model
// ============================================================================

type Suggestion = {
  id: string;
  numeral: 'I' | 'II' | 'III' | 'IV';
  title: string;
  meta: string;
  prompt: string;
};

type RoutineStep = {
  label: string;
  product?: string;
  focus?: boolean;
};

type ProductCard = {
  brand: string;
  name: string;
  fit: string;
  reason: string;
  swatch: 'terracotta' | 'sand' | 'rose';
};

type AssistantBlock =
  | { kind: 'text'; text: string }
  | { kind: 'product'; product: ProductCard }
  | { kind: 'routine'; title: string; steps: RoutineStep[] }
  | { kind: 'followups'; prompts: string[] }
  | { kind: 'error'; lead: string; body: string; retryLabel: string };

type Message =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'thinking'; id: string }
  | { kind: 'assistant'; id: string; eyebrow: string; blocks: AssistantBlock[] };

// ============================================================================
// Suggestion deck — the signature moment of the empty state
// ============================================================================

const SUGGESTIONS: readonly Suggestion[] = [
  {
    id: 'barrier',
    numeral: 'I',
    title: 'What’s my skin barrier like right now?',
    meta: 'Reading tonight’s scan',
    prompt: 'What’s my skin barrier like right now?',
  },
  {
    id: 'pm-routine',
    numeral: 'II',
    title: 'Build me an evening routine for active breakouts.',
    meta: 'Three considered steps',
    prompt: 'Build me an evening routine for active breakouts.',
  },
  {
    id: 't-zone',
    numeral: 'III',
    title: 'Why does my T-zone feel oily by 2pm?',
    meta: 'What Pura noticed',
    prompt: 'Why does my T-zone feel oily by 2pm?',
  },
];

// ============================================================================
// Deterministic mock-grounded answers
//
// These exist so the redesigned chat surface can be exercised end-to-end
// without an AI proxy round-trip. They read the canonical observation so
// content stays consistent with the rest of the app.
// ============================================================================

function answerFor(
  prompt: string,
  observation: ReturnType<typeof useTonightObservation>,
): { eyebrow: string; blocks: AssistantBlock[] } {
  const lower = prompt.toLowerCase();
  const zoneLabel = observation.zone === 'full_face' ? 'your face' : `your ${observation.zone}`;

  // Demo / design-audit trigger: any prompt containing "error" or a sentinel
  // flag forces the error block path. Useful for capturing the error state
  // for the design gallery; never hit in normal product flow.
  const forceError =
    typeof window !== 'undefined' &&
    (window as any).__puraStaticError__ === true;
  if (forceError || lower.includes('__error__')) {
    return {
      eyebrow: 'GROUNDED IN TONIGHT’S SCAN',
      blocks: [
        {
          kind: 'text',
          text:
            'Tonight’s reading shows activity concentrated on your chin, with the rest of your skin reading calm. That suggests your barrier is mostly intact — just one area is asking for a',
        },
        {
          kind: 'error',
          lead: 'Couldn’t finish that thought.',
          body: 'The connection dropped mid-answer.',
          retryLabel: 'Try again',
        },
      ],
    };
  }

  if (lower.includes('barrier') || lower.includes('skin')) {
    return {
      eyebrow: 'GROUNDED IN TONIGHT’S SCAN',
      blocks: [
        {
          kind: 'text',
          text: `Tonight’s reading shows activity concentrated on ${zoneLabel}, with the rest of your skin reading calm. That suggests your barrier is mostly intact — just one area is asking for a slower night.`,
        },
        {
          kind: 'text',
          text: 'I’d keep treatment localized, leave the rest undisturbed, and lead with moisture before sleep.',
        },
        {
          kind: 'followups',
          prompts: [
            'Build me a PM routine for tonight',
            'Why only the focus area?',
            'How does this compare to last week?',
          ],
        },
      ],
    };
  }

  if (lower.includes('serum')) {
    return {
      eyebrow: 'CHECKED AGAINST TONIGHT’S SCAN',
      blocks: [
        {
          kind: 'text',
          text: `Not tonight. ${capitalize(zoneLabel)} is reading reactive, and your serum adds another active step on top of what your skin is already managing.`,
        },
        {
          kind: 'product',
          product: {
            brand: 'La Roche-Posay',
            name: 'Cicaplast Balm B5',
            fit: 'Better fit for tonight',
            reason: 'Barrier-support, no actives — already in your routine.',
            swatch: 'sand',
          },
        },
        {
          kind: 'followups',
          prompts: [
            'When can I restart my serum?',
            'Show me my evening routine',
            'What else should I skip tonight?',
          ],
        },
      ],
    };
  }

  if (lower.includes('routine') || lower.includes('pm') || lower.includes('night')) {
    return {
      eyebrow: 'TONIGHT’S PLAN · 3 STEPS',
      blocks: [
        {
          kind: 'text',
          text: `Three steps. Treat ${zoneLabel} only. Leave the rest calm.`,
        },
        {
          kind: 'routine',
          title: 'Tonight’s routine',
          steps: [
            { label: 'Cleanse gently', product: 'Vanicream Cleanser' },
            {
              label: observation.zone === 'full_face' ? 'Treat the focus area' : `Treat ${observation.zone} only`,
              product: 'Salicylic Spot Treatment',
              focus: true,
            },
            { label: 'Moisturize', product: 'CeraVe PM Lotion' },
          ],
        },
        {
          kind: 'followups',
          prompts: [
            'Why only the focus area?',
            'Can I add my retinoid?',
            'How long until I see a change?',
          ],
        },
      ],
    };
  }

  if (lower.includes('t-zone') || lower.includes('oily') || lower.includes('shine')) {
    return {
      eyebrow: 'WHAT PURA NOTICED',
      blocks: [
        {
          kind: 'text',
          text: 'A bright T-zone usually means your skin is balancing — sebum is rising to compensate for somewhere it feels stripped, dehydrated, or over-treated.',
        },
        {
          kind: 'text',
          text: 'I’d look at what came before the shine: a stronger active two nights ago, a missed moisturizer, or a longer day in the sun. The fix is rarely more — it’s usually softer.',
        },
        {
          kind: 'followups',
          prompts: [
            'Build me a PM routine for tonight',
            'What should I avoid this week?',
            'Show me my last scan',
          ],
        },
      ],
    };
  }

  // Default — a calm, grounded reply
  return {
    eyebrow: 'GROUNDED IN YOUR LAST SCAN',
    blocks: [
      {
        kind: 'text',
        text: `Here’s what I can tell from tonight’s reading: activity is concentrated on ${zoneLabel}, with the rest of your skin reading calm.`,
      },
      {
        kind: 'text',
        text: 'Ask me to build tonight’s routine, check a product, or explain what changed.',
      },
      {
        kind: 'followups',
        prompts: [
          'Build me a PM routine for tonight',
          'Can I use my serum?',
          'What changed since my last scan?',
        ],
      },
    ],
  };
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// ============================================================================
// Screen
// ============================================================================

export function AssistantChatScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const observation = useTonightObservation();
  const displayName = useAppStore((s) => s.user?.name ?? (s as any).name ?? null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [composerFocused, setComposerFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(24);

  const listRef = useRef<FlatList<Message>>(null);

  const conversationActive = messages.length > 0;

  const greetingName = useMemo(() => {
    const name = (displayName ?? '').trim().split(' ')[0];
    return name || 'you';
  }, [displayName]);

  const dateLabel = useMemo(() => {
    const d = new Date();
    return d
      .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      .toUpperCase();
  }, []);

  const observationLine = useMemo(() => {
    if (!observation.scanCompleted) {
      return 'No reading tonight yet — I can still walk through products, layering, or what to ask before your next check-in.';
    }
    if (observation.zone === 'full_face') {
      return 'Tonight your skin reads broadly active. The plan is fewer steps, more comfort.';
    }
    return `Tonight your skin reads steady, with one area on your ${observation.zone} asking for less.`;
  }, [observation]);

  // -------------------------------------------------------------------------
  // Send / receive
  // -------------------------------------------------------------------------

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      try {
        listRef.current?.scrollToEnd({ animated: !reduceMotion });
      } catch {
        /* not mounted */
      }
    }, 60);
  }, [reduceMotion]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      hapt.tap();
      setDraft('');
      setInputHeight(24);
      Keyboard.dismiss();

      const userId = `u-${Date.now()}`;
      const thinkingId = `t-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { kind: 'user', id: userId, text: trimmed },
        { kind: 'thinking', id: thinkingId },
      ]);
      scrollToEnd();

      // Tests / design audits can hold the thinking state by setting
      //   window.__puraStaticThinking__ = true
      // before sending — useful for capturing the loading frame.
      const staticThinking =
        typeof window !== 'undefined' &&
        (window as any).__puraStaticThinking__ === true;
      const revealDelay = staticThinking ? 8000 : reduceMotion ? 80 : 720;
      setTimeout(() => {
        const answer = answerFor(trimmed, observation);
        setMessages((prev) =>
          prev
            .filter((m) => !(m.kind === 'thinking' && m.id === thinkingId))
            .concat({
              kind: 'assistant',
              id: `a-${Date.now()}`,
              eyebrow: answer.eyebrow,
              blocks: answer.blocks,
            }),
        );
        scrollToEnd();
      }, revealDelay);
    },
    [observation, reduceMotion, scrollToEnd],
  );

  const onPickSuggestion = useCallback(
    (s: Suggestion) => {
      send(s.prompt);
    },
    [send],
  );

  const onReset = useCallback(() => {
    hapt.select();
    setMessages([]);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const canSend = draft.trim().length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {conversationActive ? (
          <Header
            conversationActive={conversationActive}
            onReset={onReset}
          />
        ) : null}

        {conversationActive ? (
          <Animated.View
            key="conversation"
            entering={
              reduceMotion
                ? undefined
                : FadeIn.duration(360).delay(120).easing(Easing.out(Easing.cubic))
            }
            style={styles.flex}
          >
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <MessageRow message={item} reduceMotion={reduceMotion} />
              )}
              style={styles.list}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: 160 + insets.bottom },
              ]}
              ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToEnd}
            />
          </Animated.View>
        ) : (
          <Animated.View
            key="empty"
            exiting={reduceMotion ? undefined : FadeOut.duration(220)}
            style={styles.flex}
          >
            <EmptyState
              greeting={greetingName}
              suggestions={SUGGESTIONS}
              onPick={onPickSuggestion}
              reduceMotion={reduceMotion}
              bottomInset={insets.bottom}
            />
          </Animated.View>
        )}

        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => send(draft)}
          focused={composerFocused}
          onFocusChange={setComposerFocused}
          canSend={canSend}
          inputHeight={inputHeight}
          onInputHeight={setInputHeight}
          bottomInset={insets.bottom}
          reduceMotion={reduceMotion}
          conversationActive={conversationActive}
          observation={observation}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// Header — quiet, editorial
// ============================================================================

function Header({
  conversationActive,
  onReset,
}: {
  conversationActive: boolean;
  onReset: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.headerMark} />
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
          IN CONVERSATION
        </Text>
      </View>
      {conversationActive ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a new conversation"
          onPress={onReset}
          hitSlop={8}
          style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.newBtnText} maxFontSizeMultiplier={1.15}>
            New thread
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ============================================================================
// Empty state — the signature first impression
// ============================================================================

function EmptyState({
  greeting,
  suggestions,
  onPick,
  reduceMotion,
  bottomInset,
}: {
  greeting: string;
  suggestions: readonly Suggestion[];
  onPick: (s: Suggestion) => void;
  reduceMotion: boolean;
  bottomInset: number;
}) {
  return (
    <ScrollView
      style={styles.emptyWrap}
      contentContainerStyle={[
        styles.emptyScrollContent,
        { paddingBottom: 120 + bottomInset },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        entering={
          reduceMotion
            ? undefined
            : FadeInDown.duration(560).easing(Easing.out(Easing.cubic))
        }
        style={styles.emptyKickerRow}
      >
        <Text style={styles.emptyKicker} maxFontSizeMultiplier={1.15}>
          PURA · ASSIST
        </Text>
      </Animated.View>

      <Animated.View
        entering={
          reduceMotion
            ? undefined
            : FadeInDown.duration(640).delay(120).easing(Easing.out(Easing.cubic))
        }
        style={styles.emptyHeroBlock}
      >
        <Text style={styles.emptyHeroLine1} maxFontSizeMultiplier={1.15}>
          Ask me anything.
        </Text>
        <Text style={styles.emptyHeroLine2} maxFontSizeMultiplier={1.15}>
          I’ve been studying{' '}
          <Text style={styles.emptyHeroItalic}>skin</Text>
          {' '}for a while.
        </Text>
      </Animated.View>

      <Animated.View
        entering={
          reduceMotion
            ? undefined
            : FadeInUp.duration(440).delay(300).easing(Easing.out(Easing.cubic))
        }
        style={styles.emptySuggestionsBlock}
      >
        <Text style={styles.emptySuggestionsLabel} maxFontSizeMultiplier={1.15}>
          {greeting ? `Tonight, ${greeting} — try one of these` : 'Try one of these'}
        </Text>
        <View style={styles.emptySuggestionsList}>
          {suggestions.map((s, i) => (
            <Animated.View
              key={s.id}
              entering={
                reduceMotion
                  ? undefined
                  : FadeInUp.duration(420)
                      .delay(420 + i * 90)
                      .easing(Easing.out(Easing.cubic))
              }
            >
              <QuestionRow
                suggestion={s}
                onPress={() => onPick(s)}
                isLast={i === suggestions.length - 1}
              />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function QuestionRow({
  suggestion,
  onPress,
  isLast,
}: {
  suggestion: Suggestion;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${suggestion.title}. ${suggestion.meta}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.questionRow,
        !isLast && styles.questionRowDivider,
        pressed && styles.questionRowPressed,
      ]}
    >
      <View style={styles.questionCopy}>
        <Text style={styles.questionTitle} maxFontSizeMultiplier={1.2}>
          {suggestion.title}
        </Text>
        <Text style={styles.questionMeta} maxFontSizeMultiplier={1.2}>
          {suggestion.meta}
        </Text>
      </View>
      <Text style={styles.questionArrow} maxFontSizeMultiplier={1.15}>
        →
      </Text>
    </Pressable>
  );
}

// ============================================================================
// Message rows
// ============================================================================

function MessageRow({
  message,
  reduceMotion,
}: {
  message: Message;
  reduceMotion: boolean;
}) {
  if (message.kind === 'user') {
    return (
      <Animated.View
        entering={
          reduceMotion ? undefined : FadeInUp.duration(220).easing(Easing.out(Easing.cubic))
        }
        style={styles.userRow}
      >
        <View style={styles.userBubble}>
          <Text style={styles.userText} maxFontSizeMultiplier={1.3}>
            {message.text}
          </Text>
        </View>
      </Animated.View>
    );
  }
  if (message.kind === 'thinking') {
    return (
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(220)}
        exiting={reduceMotion ? undefined : FadeOut.duration(240)}
        style={styles.assistantRow}
      >
        <ThinkingState reduceMotion={reduceMotion} />
      </Animated.View>
    );
  }
  return (
    <Animated.View
      entering={
        reduceMotion ? undefined : FadeInDown.duration(360).delay(40).easing(Easing.out(Easing.cubic))
      }
      style={styles.assistantRow}
    >
      <AssistantTurn message={message} reduceMotion={reduceMotion} />
    </Animated.View>
  );
}

function AssistantTurn({
  message,
  reduceMotion,
}: {
  message: Extract<Message, { kind: 'assistant' }>;
  reduceMotion: boolean;
}) {
  // Streaming choreography:
  //  1. Eyebrow appears immediately (it identifies the source).
  //  2. Text blocks stream one after another, each waiting for the
  //     previous to complete (cursor blinks at leading edge).
  //  3. Once all text blocks are done, rich blocks (product, routine,
  //     followups, error) fade in below.
  //
  // Tests / design audits can disable streaming by setting
  //   window.__puraStaticStream__ = true
  // — useful for the mid-stream screenshot capture.
  const staticStream =
    typeof window !== 'undefined' && (window as any).__puraStaticStream__ === true;
  const textBlockIndices = useMemo(
    () => message.blocks.map((b, i) => (b.kind === 'text' ? i : -1)).filter((i) => i >= 0),
    [message.blocks],
  );
  const [streamedTextCount, setStreamedTextCount] = useState(
    reduceMotion ? textBlockIndices.length : 0,
  );
  const allTextStreamed = streamedTextCount >= textBlockIndices.length;

  return (
    <View style={styles.assistantTurn}>
      <Text style={styles.assistantEyebrow} maxFontSizeMultiplier={1.15}>
        {message.eyebrow}
      </Text>
      <View style={styles.assistantBlocks}>
        {message.blocks.map((b, i) => {
          if (b.kind === 'text') {
            const textIdx = textBlockIndices.indexOf(i);
            const shouldStream = !reduceMotion && !staticStream && textIdx === streamedTextCount;
            const alreadyDone = !reduceMotion && !staticStream && textIdx < streamedTextCount;
            const notYet = !reduceMotion && !staticStream && textIdx > streamedTextCount;
            if (notYet) return null;
            return (
              <View key={i}>
                <BlockView
                  block={b}
                  isStreaming={shouldStream}
                  onStreamComplete={() => setStreamedTextCount((c) => c + 1)}
                />
              </View>
            );
          }
          // Rich blocks (product, routine, followups, error) wait until
          // all text blocks finish streaming, then fade in.
          if (!allTextStreamed) return null;
          return (
            <Animated.View
              key={i}
              entering={
                reduceMotion
                  ? undefined
                  : FadeInUp.duration(420)
                      .delay(100)
                      .easing(Easing.out(Easing.cubic))
              }
            >
              <BlockView block={b} />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function BlockView({
  block,
  isStreaming,
  onStreamComplete,
}: {
  block: AssistantBlock;
  isStreaming?: boolean;
  onStreamComplete?: () => void;
}) {
  if (block.kind === 'text') {
    return isStreaming ? (
      <StreamingText
        text={block.text}
        style={styles.assistantText}
        onComplete={onStreamComplete}
      />
    ) : (
      <Text style={styles.assistantText} maxFontSizeMultiplier={1.3}>
        {block.text}
      </Text>
    );
  }
  if (block.kind === 'product') return <ProductPickCard product={block.product} />;
  if (block.kind === 'routine')
    return <RoutineCard title={block.title} steps={block.steps} />;
  if (block.kind === 'followups') return <FollowUps prompts={block.prompts} />;
  if (block.kind === 'error')
    return (
      <ErrorBlock lead={block.lead} body={block.body} retryLabel={block.retryLabel} />
    );
  return null;
}

// ============================================================================
// Streaming text — reveals tokens with calm cadence
//
// The design layer: tokens (words) arrive every ~28ms. After a sentence
// terminator (. ? !) we pause ~100ms before the next word. After a
// paragraph break (\n\n) we pause ~200ms. A thin Pura Blue cursor sits
// at the leading edge while streaming, blinking ~750ms; it disappears
// when streaming completes.
//
// In production this same component would receive tokens from the
// streaming endpoint instead of slicing a pre-known string — the visual
// cadence is what matters, and it's identical either way.
// ============================================================================

function StreamingText({
  text,
  style,
  onComplete,
}: {
  text: string;
  style: object;
  onComplete?: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const [visibleCount, setVisibleCount] = useState(0);
  const [complete, setComplete] = useState(false);

  // Pre-split the text into words+separators so we can advance one token
  // at a time without breaking word boundaries.
  const tokens = useMemo(() => {
    const out: string[] = [];
    const re = /\S+|\s+/g;
    let m;
    while ((m = re.exec(text)) !== null) out.push(m[0]);
    return out;
  }, [text]);

  useEffect(() => {
    if (reduceMotion) {
      setVisibleCount(tokens.length);
      setComplete(true);
      onComplete?.();
      return;
    }
    let cancelled = false;
    let i = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (cancelled) return;
      i += 1;
      setVisibleCount(i);
      if (i >= tokens.length) {
        setComplete(true);
        onComplete?.();
        return;
      }
      const just = tokens[i - 1] ?? '';
      // Cadence:
      //  • after a paragraph break (whitespace token containing "\n\n") → 200ms
      //  • after a sentence terminator (last visible non-space ends in . ? ! ;) → 100ms
      //  • default token → 28ms (the natural word-by-word rhythm)
      let delay = 28;
      if (/\n\n/.test(just)) delay = 200;
      else if (/[.?!;]"?$/.test(just.trim())) delay = 110;
      timeout = setTimeout(tick, delay);
    };
    timeout = setTimeout(tick, 28);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [tokens, reduceMotion, onComplete]);

  const visible = useMemo(() => tokens.slice(0, visibleCount).join(''), [tokens, visibleCount]);

  return (
    <Text style={style as any} maxFontSizeMultiplier={1.3}>
      {visible}
      {!complete ? <Cursor /> : null}
    </Text>
  );
}

function Cursor() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 360, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 360, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[styles.streamCursor, aStyle]} maxFontSizeMultiplier={1.3}>
      ▍
    </Animated.Text>
  );
}

function ErrorBlock({
  lead,
  body,
  retryLabel,
}: {
  lead: string;
  body: string;
  retryLabel: string;
}) {
  return (
    <View style={styles.errorInline}>
      <View style={styles.errorInlineRule} />
      <View style={styles.errorInlineCopy}>
        <Text style={styles.errorInlineLead} maxFontSizeMultiplier={1.2}>
          {lead}
          <Text style={styles.errorInlineBody}> {body}</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          onPress={() => hapt.tap()}
          hitSlop={6}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.errorInlineRetry} maxFontSizeMultiplier={1.2}>
            {retryLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ============================================================================
// Thinking — a Pura-native loading moment
// ============================================================================

function ThinkingState({ reduceMotion }: { reduceMotion: boolean }) {
  // Luminance — a single 1px Pura Blue line that pulses opacity 0.3 → 1.0 → 0.3
  // over ~1.4s. NOT a progress bar (no fill, no completion). Positioned
  // exactly where the first character of the response will appear so the
  // handoff to streaming text feels seamless.
  //
  // If the first token hasn't arrived after 15s, a quiet italic "Still
  // thinking…" line appears below the luminance — acknowledges the wait
  // without panic.
  const lum = useSharedValue(0.35);
  const [longWait, setLongWait] = useState(
    typeof window !== 'undefined' && (window as any).__puraStaticLongWait__ === true,
  );

  useEffect(() => {
    if (reduceMotion) {
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
    const t = setTimeout(() => setLongWait(true), 15000);
    return () => {
      cancelAnimation(lum);
      clearTimeout(t);
    };
  }, [reduceMotion, lum]);

  const lumStyle = useAnimatedStyle(() => ({ opacity: lum.value }));

  return (
    <View
      style={styles.thinkingWrap}
      accessibilityLabel="Pura is thinking"
      accessibilityRole="text"
    >
      <Animated.View style={[styles.thinkingLuminance, lumStyle]} />
      {longWait ? (
        <Animated.Text
          entering={reduceMotion ? undefined : FadeIn.duration(320)}
          style={styles.thinkingLong}
          maxFontSizeMultiplier={1.2}
        >
          Still thinking…
        </Animated.Text>
      ) : null}
    </View>
  );
}

// ============================================================================
// Product pick — inline rich content
// ============================================================================

function ProductPickCard({ product }: { product: ProductCard }) {
  const swatchColor =
    product.swatch === 'terracotta'
      ? puraColors.claySoft
      : product.swatch === 'rose'
      ? puraColors.roseLight
      : puraColors.sandLight;
  const initials = product.brand
    .split(/[\s.-]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={styles.productCard}>
      <View style={styles.productCardEyebrowRow}>
        <View style={styles.productCardEyebrowMark} />
        <Text style={styles.productFit} maxFontSizeMultiplier={1.15}>
          {product.fit.toUpperCase()}
        </Text>
      </View>
      <View style={styles.productCardMainRow}>
        <View style={[styles.productSwatch, { backgroundColor: swatchColor }]}>
          <View style={styles.productSwatchHighlight} />
          <View style={styles.productSwatchBottle}>
            <Text style={styles.productSwatchInitials} maxFontSizeMultiplier={1.15}>
              {initials}
            </Text>
          </View>
        </View>
        <View style={styles.productCopy}>
          <Text style={styles.productBrand} maxFontSizeMultiplier={1.2}>
            {product.brand}
          </Text>
          <Text style={styles.productName} maxFontSizeMultiplier={1.2}>
            {product.name}
          </Text>
        </View>
      </View>
      <Text style={styles.productReason} maxFontSizeMultiplier={1.25}>
        {product.reason}
      </Text>
    </View>
  );
}

// ============================================================================
// Routine card — inline numbered ritual
// ============================================================================

function RoutineCard({
  title,
  steps,
}: {
  title: string;
  steps: RoutineStep[];
}) {
  return (
    <View style={styles.routineCard}>
      <View style={styles.routineHeader}>
        <View style={styles.routineHeaderMark} />
        <Text style={styles.routineEyebrow} maxFontSizeMultiplier={1.15}>
          {String(steps.length).padStart(2, '0')} · {title.toUpperCase()}
        </Text>
      </View>
      <View style={styles.routineSteps}>
        {steps.map((s, i) => (
          <View key={`${s.label}-${i}`} style={styles.routineStep}>
            <View style={styles.routineNumberCol}>
              <Text
                style={[
                  styles.routineNumber,
                  s.focus && styles.routineNumberFocus,
                ]}
                maxFontSizeMultiplier={1.15}
              >
                {String(i + 1).padStart(2, '0')}
              </Text>
              {i < steps.length - 1 ? (
                <View style={styles.routineConnector} />
              ) : null}
            </View>
            <View style={styles.routineCopyCol}>
              <View style={styles.routineLabelRow}>
                <Text style={styles.routineLabel} maxFontSizeMultiplier={1.2}>
                  {s.label}
                </Text>
                {s.focus ? (
                  <Text style={styles.routineFocusBadge} maxFontSizeMultiplier={1.15}>
                    FOCUS
                  </Text>
                ) : null}
              </View>
              {s.product ? (
                <Text style={styles.routineProduct} maxFontSizeMultiplier={1.2}>
                  {s.product}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// Follow-up prompts — a quiet row after a long answer
// ============================================================================

function FollowUps({ prompts }: { prompts: string[] }) {
  // Editorial "next questions" — rendered as a stacked list of underlined
  // serif phrases, not gray chip pills. Reads like the footnotes section
  // of an essay where the author suggests further reading.
  return (
    <View style={styles.followups}>
      <Text style={styles.followupsLabel} maxFontSizeMultiplier={1.15}>
        NEXT QUESTIONS
      </Text>
      <View style={styles.followupsList}>
        {prompts.map((p) => (
          <View key={p} style={styles.followupRow}>
            <Text style={styles.followupArrow} maxFontSizeMultiplier={1.15}>
              →
            </Text>
            <Text style={styles.followupText} maxFontSizeMultiplier={1.2}>
              {p}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// Composer — the input bar
// ============================================================================

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  focused: boolean;
  onFocusChange: (b: boolean) => void;
  canSend: boolean;
  inputHeight: number;
  onInputHeight: (h: number) => void;
  bottomInset: number;
  reduceMotion: boolean;
  conversationActive: boolean;
  observation: ReturnType<typeof useTonightObservation>;
}

function Composer({
  value,
  onChange,
  onSend,
  focused,
  onFocusChange,
  canSend,
  inputHeight,
  onInputHeight,
  bottomInset,
  reduceMotion,
  conversationActive,
  observation,
}: ComposerProps) {
  const inputRef = useRef<TextInput>(null);
  const sendScale = useSharedValue(canSend ? 1 : 0.86);
  const sendOpacity = useSharedValue(canSend ? 1 : 0.5);
  const borderProgress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      sendScale.value = canSend ? 1 : 0.86;
      sendOpacity.value = canSend ? 1 : 0.5;
      return;
    }
    sendScale.value = withTiming(canSend ? 1 : 0.86, {
      duration: 180,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
    sendOpacity.value = withTiming(canSend ? 1 : 0.5, {
      duration: 160,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [canSend, reduceMotion, sendOpacity, sendScale]);

  useEffect(() => {
    if (reduceMotion) {
      borderProgress.value = focused ? 1 : 0;
      return;
    }
    borderProgress.value = withTiming(focused ? 1 : 0, {
      duration: 220,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [borderProgress, focused, reduceMotion]);

  const sendStyle = useAnimatedStyle(() => ({
    opacity: sendOpacity.value,
    transform: [{ scale: sendScale.value }],
  }));

  const placeholder = useMemo(() => {
    if (conversationActive) return 'Ask a follow-up…';
    return 'Ask about your skin…';
  }, [conversationActive]);

  // Constrain growth: 1 line ≈ 24px, cap at ~5 lines.
  const computedInputHeight = Math.min(Math.max(inputHeight, 24), 120);

  return (
    <View
      style={[
        styles.composerWrap,
        { paddingBottom: 16 + Math.max(bottomInset, 0) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.composerCanvasBackdrop} pointerEvents="none" />
      <View style={[styles.composer, focused && styles.composerFocused]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={puraColors.muted}
          style={[styles.composerInput, { height: computedInputHeight }]}
          multiline
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          onContentSizeChange={(e) =>
            onInputHeight(e.nativeEvent.contentSize.height)
          }
          accessibilityLabel="Ask Pura"
          maxFontSizeMultiplier={1.25}
          underlineColorAndroid="transparent"
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
        />
        <Animated.View style={sendStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send to Pura"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={onSend}
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && canSend && { opacity: 0.7 },
            ]}
            hitSlop={6}
          >
            <Text
              style={[
                styles.sendArrow,
                canSend ? styles.sendArrowActive : styles.sendArrowIdle,
              ]}
              maxFontSizeMultiplier={1.15}
            >
              →
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: puraColors.canvas },
  flex: { flex: 1 },

  // ---- Header ----
  header: {
    paddingTop: 6,
    paddingHorizontal: puraSpace.screenX,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerMark: {
    width: 18,
    height: 1.5,
    backgroundColor: puraColors.clayDeep,
    borderRadius: 1,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 2.4,
    color: puraColors.clay,
  },
  newBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: puraColors.ink,
  },
  newBtnText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    letterSpacing: -0.1,
    color: puraColors.ink,
  },

  // ---- Empty state ----
  emptyWrap: {
    flex: 1,
  },
  emptyScrollContent: {
    paddingHorizontal: puraSpace.screenX,
    paddingTop: 8,
  },
  // ---- Editorial empty state — opening line + quiet menu ----
  emptyKickerRow: {
    paddingTop: 12,
    paddingBottom: 36,
  },
  emptyKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.4,
    color: puraColors.muted,
  },
  emptyHeroBlock: {
    paddingBottom: 12,
  },
  emptyHeroLine1: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.1,
    color: puraColors.ink,
  },
  emptyHeroLine2: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.1,
    color: puraColors.body,
    marginTop: 2,
  },
  emptyHeroItalic: {
    fontFamily: 'InstrumentSerif-Italic',
    color: puraColors.clay,
  },
  emptySuggestionsBlock: {
    marginTop: 56,
  },
  emptySuggestionsLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.05,
    color: puraColors.muted,
    marginBottom: 6,
  },
  emptySuggestionsList: {},
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  questionRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraColors.line,
  },
  questionRowPressed: {
    backgroundColor: puraColors.surfaceQuiet,
  },
  questionCopy: { flex: 1 },
  questionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: puraColors.ink,
  },
  questionMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: puraColors.muted,
    letterSpacing: 0.1,
    marginTop: 3,
  },
  questionArrow: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 24,
    color: puraColors.clay,
    width: 18,
    textAlign: 'right',
  },

  // ---- Conversation list ----
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: puraSpace.screenX,
    paddingTop: 8,
  },

  // ---- User block (right-aligned with right-side terracotta rule) ----
  userRow: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
  },
  userBubble: {
    backgroundColor: 'rgba(20, 124, 255, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 23,
    color: puraColors.ink,
    letterSpacing: -0.15,
  },

  // ---- Assistant turn — clean editorial text, NO container, NO rule ----
  assistantRow: { alignSelf: 'stretch' },
  assistantTurn: {
    paddingVertical: 2,
    gap: 12,
  },
  assistantEyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.2,
    color: puraColors.clay,
  },
  assistantBlocks: { gap: 14 },
  assistantText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16.5,
    lineHeight: 26,
    color: puraColors.ink,
    letterSpacing: -0.15,
  },
  streamCursor: {
    color: puraColors.clay,
    fontFamily: 'Inter-Regular',
    fontSize: 16.5,
    lineHeight: 26,
    letterSpacing: -0.15,
  },

  // ---- Thinking state — single luminance line, positioned where text will start ----
  thinkingWrap: {
    paddingTop: 6,
    paddingBottom: 6,
    alignItems: 'flex-start',
  },
  thinkingLuminance: {
    height: 1,
    width: 120,
    backgroundColor: puraColors.clay,
    borderRadius: 0.5,
  },
  thinkingLong: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14.5,
    lineHeight: 20,
    color: puraColors.muted,
    marginTop: 10,
    letterSpacing: -0.1,
  },
  thinkingEyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.2,
    color: puraColors.clay,
  },
  thinkingPhrase: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 24,
    color: puraColors.inkSecondary,
    letterSpacing: -0.2,
  },
  thinkingTrack: {
    height: 1,
    backgroundColor: puraColors.lineSoft,
    overflow: 'hidden',
    marginTop: 4,
    maxWidth: 240,
  },
  thinkingFill: {
    height: 1,
    backgroundColor: puraColors.clayDeep,
  },

  // ---- Product pick card ----
  productCard: {
    backgroundColor: puraColors.surfaceQuiet,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  productCardEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productCardEyebrowMark: {
    width: 14,
    height: 1,
    backgroundColor: puraColors.clayDeep,
  },
  productCardMainRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  productSwatch: {
    width: 70,
    height: 86,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  productSwatchHighlight: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 252, 248, 0.55)',
  },
  productSwatchBottle: {
    width: 38,
    height: 56,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 252, 248, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productSwatchInitials: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 15,
    letterSpacing: 0.4,
    color: puraColors.clayDeep,
  },
  productCopy: { flex: 1, gap: 2, justifyContent: 'center' },
  productFit: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.0,
    color: puraColors.clayDeep,
  },
  productBrand: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
    letterSpacing: 1.8,
    color: puraColors.muted,
    textTransform: 'uppercase',
  },
  productName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: puraColors.ink,
    marginTop: 2,
  },
  productReason: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 21,
    color: puraColors.inkSecondary,
    letterSpacing: -0.2,
  },

  // ---- Routine card ----
  routineCard: {
    backgroundColor: puraColors.surfaceQuiet,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  routineHeaderMark: {
    width: 14,
    height: 1,
    backgroundColor: puraColors.clayDeep,
  },
  routineEyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.2,
    color: puraColors.clayDeep,
  },
  routineSteps: {},
  routineStep: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  routineNumberCol: {
    width: 48,
    alignItems: 'center',
  },
  routineNumber: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: puraColors.muted,
  },
  routineNumberFocus: {
    color: puraColors.clayDeep,
    fontFamily: 'InstrumentSerif-Italic',
  },
  routineConnector: {
    width: 1,
    flex: 1,
    minHeight: 24,
    backgroundColor: puraColors.lineStrong,
    marginTop: 6,
    marginBottom: 6,
  },
  routineCopyCol: { flex: 1, paddingTop: 8, paddingBottom: 18 },
  routineLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    flexWrap: 'wrap',
  },
  routineLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    color: puraColors.ink,
    letterSpacing: -0.3,
  },
  routineFocusBadge: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.8,
    color: puraColors.clayDeep,
  },
  routineProduct: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: puraColors.muted,
    marginTop: 4,
  },

  // ---- Follow-ups (editorial footnote-style list) ----
  followups: {
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: puraColors.line,
  },
  followupsLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: puraColors.muted,
    marginBottom: 10,
  },
  followupsList: {
    gap: 10,
  },
  followupRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  followupArrow: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: puraColors.clayDeep,
    width: 14,
  },
  followupText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: puraColors.inkSecondary,
    letterSpacing: -0.2,
    flex: 1,
  },

  // ---- Inline error notice — sits beneath partial response ----
  errorInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 4,
    paddingBottom: 4,
    marginTop: 4,
  },
  errorInlineRule: {
    width: 2,
    minHeight: 24,
    alignSelf: 'stretch',
    backgroundColor: puraColors.faint,
    borderRadius: 1,
  },
  errorInlineCopy: {
    flex: 1,
    gap: 6,
  },
  errorInlineLead: {
    fontFamily: 'Inter-Medium',
    fontSize: 13.5,
    lineHeight: 19,
    color: puraColors.muted,
    letterSpacing: -0.1,
  },
  errorInlineBody: {
    fontFamily: 'Inter-Regular',
    color: puraColors.muted,
  },
  errorInlineRetry: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    lineHeight: 19,
    color: puraColors.clay,
    letterSpacing: -0.1,
    textDecorationLine: 'underline',
  },

  // ---- Composer — contained Porcelain-tinted field, Pura Blue focus ----
  composerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: puraSpace.screenX,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  composerCanvasBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: puraColors.canvas,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: puraColors.canvasWarm,
    borderWidth: 1,
    borderColor: puraColors.line,
  },
  composerFocused: {
    borderColor: puraColors.clay,
    backgroundColor: puraColors.surface,
    shadowColor: '#147CFF',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  composerInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: puraColors.ink,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
    minHeight: 28,
    // RN Web: suppress browser default focus ring
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' as any, outlineWidth: 0 as any } as object)
      : {}),
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sendArrow: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 24,
    lineHeight: 26,
  },
  sendArrowIdle: {
    color: puraColors.faint,
  },
  sendArrowActive: {
    color: puraColors.clay,
  },
});

// Re-export under the legacy v29 name so the tab navigator's import
// (`AssistantConsultation`) keeps working without touching navigation.
export { AssistantChatScreen as AssistantConsultation };
