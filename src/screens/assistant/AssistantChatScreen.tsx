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
  | { kind: 'followups'; prompts: string[] };

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
    title: 'Your barrier, tonight',
    meta: 'Read the scan',
    prompt: 'What’s my skin barrier like tonight?',
  },
  {
    id: 'pm-routine',
    numeral: 'II',
    title: 'A calm PM routine',
    meta: 'Three steps',
    prompt: 'Build me a calm PM routine for tonight',
  },
  {
    id: 'serum',
    numeral: 'III',
    title: 'Whether your serum belongs',
    meta: 'Check one product',
    prompt: 'Can I use my serum tonight?',
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
        ) : (
          <EmptyState
            greeting={greetingName}
            dateLabel={dateLabel}
            observationLine={observationLine}
            suggestions={SUGGESTIONS}
            onPick={onPickSuggestion}
            reduceMotion={reduceMotion}
            bottomInset={insets.bottom}
          />
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
  dateLabel,
  observationLine,
  suggestions,
  onPick,
  reduceMotion,
  bottomInset,
}: {
  greeting: string;
  dateLabel: string;
  observationLine: string;
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
            : FadeInDown.duration(580).easing(Easing.out(Easing.cubic))
        }
        style={styles.emptyMastheadRow}
      >
        <Text style={styles.emptyMastheadKicker} maxFontSizeMultiplier={1.15}>
          PURA · NO. 12
        </Text>
        <Text style={styles.emptyMastheadDate} maxFontSizeMultiplier={1.15}>
          {dateLabel}
        </Text>
      </Animated.View>

      <View style={styles.emptyMastheadRule} />

      <Animated.View
        entering={
          reduceMotion
            ? undefined
            : FadeInDown.duration(620).delay(80).easing(Easing.out(Easing.cubic))
        }
        style={styles.emptyHeroBlock}
      >
        <Text style={styles.emptyGreetingFirst} maxFontSizeMultiplier={1.15}>
          An evening
        </Text>
        <Text style={styles.emptyGreetingMid} maxFontSizeMultiplier={1.15}>
          with your
        </Text>
        <Text style={styles.emptyGreetingThird} maxFontSizeMultiplier={1.15}>
          skin.
        </Text>
        <View style={styles.emptyBylineRow}>
          <View style={styles.emptyBylineRule} />
          <Text style={styles.emptyByline} maxFontSizeMultiplier={1.15}>
            FOR {greeting.toUpperCase()} · IN PRIVATE
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={
          reduceMotion
            ? undefined
            : FadeInUp.duration(480).delay(220).easing(Easing.out(Easing.cubic))
        }
        style={styles.emptyObservationBlock}
      >
        <Text style={styles.emptyObservationLabel} maxFontSizeMultiplier={1.15}>
          TONIGHT’S OBSERVATION
        </Text>
        <Text style={styles.emptyObservation} maxFontSizeMultiplier={1.2}>
          {observationLine}
        </Text>
      </Animated.View>

      <Animated.View
        entering={
          reduceMotion
            ? undefined
            : FadeInUp.duration(480).delay(320).easing(Easing.out(Easing.cubic))
        }
        style={styles.contentsBlock}
      >
        <View style={styles.contentsHeader}>
          <Text style={styles.contentsLabel} maxFontSizeMultiplier={1.15}>
            QUESTIONS WORTH ASKING
          </Text>
          <Text style={styles.contentsCount} maxFontSizeMultiplier={1.15}>
            {String(suggestions.length).padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.contentsList}>
          {suggestions.map((s, i) => (
            <Animated.View
              key={s.id}
              entering={
                reduceMotion
                  ? undefined
                  : FadeInUp.duration(420)
                      .delay(360 + i * 90)
                      .easing(Easing.out(Easing.cubic))
              }
            >
              <ChapterRow
                suggestion={s}
                onPress={() => onPick(s)}
                showTopRule={i === 0}
              />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function ChapterRow({
  suggestion,
  onPress,
  showTopRule,
}: {
  suggestion: Suggestion;
  onPress: () => void;
  showTopRule?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${suggestion.title}. ${suggestion.meta}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chapterRow,
        showTopRule && styles.chapterRowFirst,
        pressed && styles.chapterRowPressed,
      ]}
    >
      <View style={styles.chapterNumeralCol}>
        <Text style={styles.chapterNumeral} maxFontSizeMultiplier={1.15}>
          {suggestion.numeral}
        </Text>
        <View style={styles.chapterNumeralMark} />
      </View>
      <View style={styles.chapterCopyCol}>
        <Text style={styles.chapterTitle} maxFontSizeMultiplier={1.2}>
          {suggestion.title}
        </Text>
        <Text style={styles.chapterMeta} maxFontSizeMultiplier={1.2}>
          {suggestion.meta}
        </Text>
      </View>
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
        <View style={styles.userBlock}>
          <View style={styles.userInner}>
            <Text style={styles.userLabel} maxFontSizeMultiplier={1.15}>
              YOU ASKED
            </Text>
            <Text style={styles.userText} maxFontSizeMultiplier={1.3}>
              {message.text}
            </Text>
          </View>
          <View style={styles.userRule} />
        </View>
      </Animated.View>
    );
  }
  if (message.kind === 'thinking') {
    return (
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(220)}
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
  return (
    <View style={styles.assistantTurn}>
      <View style={styles.assistantRule} />
      <View style={styles.assistantInner}>
        <Text style={styles.assistantEyebrow} maxFontSizeMultiplier={1.15}>
          {message.eyebrow}
        </Text>
        <View style={styles.assistantBlocks}>
          {message.blocks.map((b, i) => (
            <Animated.View
              key={i}
              entering={
                reduceMotion
                  ? undefined
                  : FadeInUp.duration(420)
                      .delay(120 + i * 140)
                      .easing(Easing.out(Easing.cubic))
              }
            >
              <BlockView block={b} />
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
}

function BlockView({ block }: { block: AssistantBlock }) {
  if (block.kind === 'text') {
    return (
      <Text style={styles.assistantText} maxFontSizeMultiplier={1.3}>
        {block.text}
      </Text>
    );
  }
  if (block.kind === 'product') return <ProductPickCard product={block.product} />;
  if (block.kind === 'routine')
    return <RoutineCard title={block.title} steps={block.steps} />;
  if (block.kind === 'followups') return <FollowUps prompts={block.prompts} />;
  return null;
}

// ============================================================================
// Thinking — a Pura-native loading moment
// ============================================================================

function ThinkingState({ reduceMotion }: { reduceMotion: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 0.6;
      return;
    }
    // Progress sweep: 0 → 1 over 2.4s, then quick reset. Loops indefinitely.
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(0, { duration: 280, easing: Easing.bezier(0.4, 0, 1, 1) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [reduceMotion, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={styles.thinkingWrap}
      accessibilityLabel="Pura is reading tonight’s scan"
      accessibilityRole="text"
    >
      <View style={styles.thinkingRule} />
      <View style={styles.thinkingInner}>
        <Text style={styles.thinkingEyebrow} maxFontSizeMultiplier={1.15}>
          PURA · THINKING
        </Text>
        <Text style={styles.thinkingPhrase} maxFontSizeMultiplier={1.2}>
          Reading tonight’s scan, your routine, the recent trend.
        </Text>
        <View style={styles.thinkingTrack}>
          <Animated.View style={[styles.thinkingFill, fillStyle]} />
        </View>
      </View>
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
    if (conversationActive) return 'Ask a follow-up';
    if (!observation.scanCompleted) return 'Ask about a product or tonight’s skin';
    return 'Ask about tonight’s skin, a product, or your routine';
  }, [conversationActive, observation.scanCompleted]);

  // Constrain growth: 1 line ≈ 24px, cap at ~5 lines.
  const computedInputHeight = Math.min(Math.max(inputHeight, 24), 120);

  return (
    <View
      style={[
        styles.composerWrap,
        { paddingBottom: 14 + Math.max(bottomInset, 0) },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.composer, focused && styles.composerFocused]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open scan"
          onPress={() => hapt.tap()}
          style={({ pressed }) => [
            styles.composerLeading,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={6}
        >
          <Camera size={18} color={puraColors.muted} weight="regular" />
        </Pressable>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={puraColors.muted}
          style={[
            styles.composerInput,
            { height: computedInputHeight },
          ]}
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
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={onSend}
            style={({ pressed }) => [
              styles.sendBtn,
              canSend && styles.sendBtnActive,
              pressed && canSend && { opacity: 0.92, transform: [{ scale: 0.96 }] },
            ]}
            hitSlop={4}
          >
            <ArrowUp
              size={15}
              weight="bold"
              color={canSend ? puraColors.inverse : puraColors.muted}
            />
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
  // ---- Masthead (editorial date line) ----
  emptyMastheadRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  emptyMastheadKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.4,
    color: puraColors.clay,
  },
  emptyMastheadDate: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.4,
    color: puraColors.muted,
  },
  emptyMastheadRule: {
    height: 1.5,
    backgroundColor: puraColors.ink,
    marginTop: 10,
    marginBottom: 18,
  },
  emptyMastheadHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraColors.ink,
    marginTop: 4,
    marginBottom: 28,
  },

  // ---- Hero ("An evening / with your skin" / byline) ----
  emptyHeroBlock: {
    paddingTop: 0,
    paddingBottom: 8,
  },
  emptyGreetingFirst: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 50,
    lineHeight: 52,
    letterSpacing: -1.5,
    color: puraColors.ink,
  },
  emptyGreetingMid: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 50,
    lineHeight: 52,
    letterSpacing: -1.5,
    color: puraColors.ink,
    marginTop: 0,
    paddingLeft: 12,
  },
  emptyGreetingThird: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 58,
    lineHeight: 60,
    letterSpacing: -1.6,
    color: puraColors.clayDeep,
    marginTop: 0,
    paddingLeft: 26,
  },
  emptyBylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  emptyBylineRule: {
    width: 22,
    height: 1,
    backgroundColor: puraColors.clayDeep,
  },
  emptyByline: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
    letterSpacing: 2.4,
    color: puraColors.clayDeep,
  },

  // ---- Observation block ----
  emptyObservationBlock: {
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: puraColors.lineSoft,
  },
  emptyObservationLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.4,
    color: puraColors.muted,
    marginBottom: 10,
  },
  emptyObservation: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 25,
    color: puraColors.inkSecondary,
    letterSpacing: -0.2,
  },

  // ---- Table of contents ----
  contentsBlock: {
    marginTop: 22,
  },
  contentsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contentsLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.4,
    color: puraColors.muted,
  },
  contentsCount: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 16,
    letterSpacing: 0.4,
    color: puraColors.muted,
  },
  contentsList: {},
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraColors.line,
  },
  chapterRowFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: puraColors.line,
  },
  chapterRowPressed: {
    backgroundColor: puraColors.surfaceQuiet,
  },
  chapterNumeralCol: {
    width: 52,
  },
  chapterNumeral: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: 0.4,
    color: puraColors.clayDeep,
  },
  chapterNumeralMark: {
    width: 14,
    height: 1,
    backgroundColor: puraColors.clayDeep,
    marginTop: 6,
    opacity: 0.45,
  },
  chapterCopyCol: { flex: 1, paddingTop: 4 },
  chapterTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: puraColors.ink,
  },
  chapterMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: puraColors.muted,
    letterSpacing: 0.1,
    marginTop: 3,
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
  userBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  userInner: {
    flex: 1,
    paddingRight: 12,
    paddingVertical: 2,
    alignItems: 'flex-end',
  },
  userLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.8,
    color: puraColors.muted,
    marginBottom: 4,
  },
  userText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 19,
    lineHeight: 26,
    color: puraColors.ink,
    letterSpacing: -0.2,
    textAlign: 'right',
  },
  userRule: {
    width: 2,
    backgroundColor: puraColors.clayDeep,
    borderRadius: 1,
  },

  // ---- Assistant turn (left-anchored with left terracotta rule) ----
  assistantRow: { alignSelf: 'stretch' },
  assistantTurn: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingRight: 4,
  },
  assistantRule: {
    width: 2,
    backgroundColor: puraColors.clayDeep,
    borderRadius: 1,
    marginRight: 14,
  },
  assistantInner: {
    flex: 1,
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
    fontSize: 15.5,
    lineHeight: 24,
    color: puraColors.inkSecondary,
    letterSpacing: -0.1,
  },

  // ---- Thinking state (editorial progress line) ----
  thinkingWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingRight: 4,
    paddingVertical: 2,
  },
  thinkingRule: {
    width: 2,
    backgroundColor: puraColors.clayDeep,
    borderRadius: 1,
    marginRight: 14,
  },
  thinkingInner: {
    flex: 1,
    paddingVertical: 2,
    gap: 8,
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

  // ---- Composer ----
  composerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: puraSpace.screenX,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    backgroundColor: puraColors.surfaceRaised,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.line,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: '#3B2B23',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  composerFocused: {
    borderColor: puraColors.lineStrong,
    shadowOpacity: 0.09,
  },
  composerLeading: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15.5,
    lineHeight: 22,
    color: puraColors.ink,
    paddingHorizontal: 4,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    minHeight: 24,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.line,
    backgroundColor: puraColors.surfaceQuiet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: puraColors.actionInk,
    borderColor: puraColors.actionInk,
  },
});

// Re-export under the legacy v29 name so the tab navigator's import
// (`AssistantConsultation`) keeps working without touching navigation.
export { AssistantChatScreen as AssistantConsultation };
