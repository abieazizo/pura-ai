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
  Drop,
  Sun,
  Leaf,
  Plus,
  ArrowUpRight,
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
  icon: 'drop' | 'sun' | 'leaf' | 'spark';
  title: string;
  subtitle: string;
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
    icon: 'drop',
    title: 'What’s my skin barrier like tonight?',
    subtitle: 'Read tonight’s scan + recent trend',
  },
  {
    id: 'pm-routine',
    icon: 'leaf',
    title: 'Build me a calm PM routine',
    subtitle: 'A three-step plan for tonight',
  },
  {
    id: 't-zone',
    icon: 'sun',
    title: 'Why is my T-zone oily?',
    subtitle: 'What Pura noticed and what to do',
  },
  {
    id: 'serum',
    icon: 'spark',
    title: 'Can I use my serum tonight?',
    subtitle: 'Check one product against your scan',
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

  const greeting = useMemo(() => {
    const name = (displayName ?? '').trim().split(' ')[0];
    return name ? `Hello, ${name}.` : 'Good evening.';
  }, [displayName]);

  const greetingItalic = useMemo(() => {
    if (!observation.scanCompleted) return 'How is your skin tonight?';
    return 'What’s on your skin tonight?';
  }, [observation.scanCompleted]);

  const supportLine = useMemo(() => {
    if (!observation.scanCompleted)
      return 'I can still help with products, ingredients, and what to do — or start with tonight’s check-in for skin-aware answers.';
    if (observation.zone === 'full_face')
      return 'I’ve read tonight’s scan. Ask about your routine, a product, or what to change.';
    return `I’ve read tonight’s scan — activity on your ${observation.zone}. Ask me anything about your skin tonight.`;
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

      const revealDelay = reduceMotion ? 80 : 720;
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
      send(s.title);
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
        <Header
          conversationActive={conversationActive}
          onReset={onReset}
        />

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
            greeting={greeting}
            greetingItalic={greetingItalic}
            supportLine={supportLine}
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
        <View style={styles.headerMark}>
          <Sparkle size={11} weight="fill" color={puraColors.clay} />
        </View>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
          Pura
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
          <Plus size={11} weight="bold" color={puraColors.inkSecondary} />
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
  greetingItalic,
  supportLine,
  suggestions,
  onPick,
  reduceMotion,
  bottomInset,
}: {
  greeting: string;
  greetingItalic: string;
  supportLine: string;
  suggestions: readonly Suggestion[];
  onPick: (s: Suggestion) => void;
  reduceMotion: boolean;
  bottomInset: number;
}) {
  return (
    <ScrollView
      style={styles.emptyWrap}
      contentContainerStyle={[styles.emptyScrollContent, { paddingBottom: 120 + bottomInset }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(540).easing(Easing.out(Easing.cubic))}
        style={styles.emptyHeroBlock}
      >
        <View style={styles.emptyEyebrowRow}>
          <View style={styles.emptyEyebrowMark} />
          <Text style={styles.emptyEyebrow} maxFontSizeMultiplier={1.15}>
            TONIGHT · YOUR SKIN COACH
          </Text>
        </View>
        <Text style={styles.emptyGreeting} maxFontSizeMultiplier={1.15}>
          {greeting}
        </Text>
        <Text style={styles.emptyGreetingItalic} maxFontSizeMultiplier={1.15}>
          {greetingItalic}
        </Text>
        <Text style={styles.emptySupport} maxFontSizeMultiplier={1.2}>
          {supportLine}
        </Text>
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeInUp.duration(420).delay(180)}
        style={styles.suggestionGrid}
      >
        <Text style={styles.suggestionsLabel} maxFontSizeMultiplier={1.15}>
          SUGGESTED
        </Text>
        <View style={styles.suggestionsCol}>
          {suggestions.map((s, i) => (
            <Animated.View
              key={s.id}
              entering={
                reduceMotion
                  ? undefined
                  : FadeInUp.duration(380).delay(220 + i * 60).easing(Easing.out(Easing.cubic))
              }
            >
              <SuggestionCard suggestion={s} onPress={() => onPick(s)} />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function SuggestionIcon({ name }: { name: Suggestion['icon'] }) {
  const props = { size: 14, color: puraColors.clay, weight: 'duotone' as const };
  if (name === 'drop') return <Drop {...props} />;
  if (name === 'sun') return <Sun {...props} />;
  if (name === 'leaf') return <Leaf {...props} />;
  return <Sparkle {...props} />;
}

function SuggestionCard({
  suggestion,
  onPress,
}: {
  suggestion: Suggestion;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${suggestion.title}. ${suggestion.subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.suggestionCard,
        pressed && styles.suggestionCardPressed,
      ]}
    >
      <View style={styles.suggestionIconWrap}>
        <SuggestionIcon name={suggestion.icon} />
      </View>
      <View style={styles.suggestionCopy}>
        <Text style={styles.suggestionTitle} maxFontSizeMultiplier={1.2}>
          {suggestion.title}
        </Text>
        <Text style={styles.suggestionSub} maxFontSizeMultiplier={1.2}>
          {suggestion.subtitle}
        </Text>
      </View>
      <View style={styles.suggestionArrowWrap}>
        <ArrowUpRight size={13} weight="regular" color={puraColors.muted} />
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
      <View style={styles.assistantHeader}>
        <Sparkle size={11} weight="fill" color={puraColors.clay} />
        <Text style={styles.assistantEyebrow} maxFontSizeMultiplier={1.15}>
          {message.eyebrow}
        </Text>
      </View>
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
  const shimmer = useSharedValue(0);
  const spark = useSharedValue(0.45);
  const dot = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      shimmer.value = 0.5;
      spark.value = 1;
      dot.value = 1;
      return;
    }
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1900, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
    spark.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 820, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withDelay(120, withTiming(0.45, { duration: 820, easing: Easing.bezier(0.4, 0, 0.2, 1) })),
      ),
      -1,
      false,
    );
    dot.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(0, { duration: 900, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(shimmer);
      cancelAnimation(spark);
      cancelAnimation(dot);
    };
  }, [reduceMotion, shimmer, spark, dot]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -160 + shimmer.value * 340 }],
    opacity: shimmer.value < 0.04 || shimmer.value > 0.96 ? 0 : 1,
  }));
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: spark.value,
    transform: [{ scale: 0.85 + spark.value * 0.25 }],
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: 0.4 + dot.value * 0.5 }));

  return (
    <View
      style={styles.thinkingWrap}
      accessibilityLabel="Pura is thinking"
      accessibilityRole="text"
    >
      <Animated.View style={[styles.thinkingSparkWrap, sparkStyle]}>
        <Sparkle size={13} weight="fill" color={puraColors.clay} />
      </Animated.View>
      <View style={styles.thinkingPill}>
        <Text style={styles.thinkingText} maxFontSizeMultiplier={1.2}>
          reading your scan
        </Text>
        <Animated.Text style={[styles.thinkingDot, dotStyle]}>…</Animated.Text>
        <Animated.View style={[styles.thinkingShimmer, shimmerStyle]} />
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
      <View style={[styles.productSwatch, { backgroundColor: swatchColor }]}>
        <View style={styles.productSwatchHighlight} />
        <View style={styles.productSwatchBottle}>
          <Text style={styles.productSwatchInitials} maxFontSizeMultiplier={1.15}>
            {initials}
          </Text>
        </View>
      </View>
      <View style={styles.productCopy}>
        <Text style={styles.productFit} maxFontSizeMultiplier={1.15}>
          {product.fit.toUpperCase()}
        </Text>
        <Text style={styles.productBrand} maxFontSizeMultiplier={1.2}>
          {product.brand}
        </Text>
        <Text style={styles.productName} maxFontSizeMultiplier={1.2}>
          {product.name}
        </Text>
        <Text style={styles.productReason} maxFontSizeMultiplier={1.25}>
          {product.reason}
        </Text>
      </View>
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
      <Text style={styles.routineTitle} maxFontSizeMultiplier={1.15}>
        {title}
      </Text>
      <View style={styles.routineSteps}>
        {steps.map((s, i) => (
          <View
            key={`${s.label}-${i}`}
            style={[styles.routineStep, i < steps.length - 1 && styles.routineStepDivider]}
          >
            <View style={styles.routineNumberCol}>
              <Text
                style={[
                  styles.routineNumber,
                  s.focus && { color: puraColors.clayDeep },
                ]}
                maxFontSizeMultiplier={1.15}
              >
                {String(i + 1).padStart(2, '0')}
              </Text>
              {s.focus ? (
                <Text style={styles.routineFocusBadge} maxFontSizeMultiplier={1.15}>
                  FOCUS
                </Text>
              ) : null}
            </View>
            <View style={styles.routineCopyCol}>
              <Text style={styles.routineLabel} maxFontSizeMultiplier={1.2}>
                {s.label}
              </Text>
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
  // FollowUps are rendered as plain editorial chips; tapping them is
  // surfaced via the parent flow in a future iteration. For now they
  // anchor the answer with concrete next steps without competing with
  // the composer.
  return (
    <View style={styles.followups}>
      {prompts.map((p) => (
        <View key={p} style={styles.followupChip}>
          <Text style={styles.followupText} maxFontSizeMultiplier={1.15}>
            {p}
          </Text>
        </View>
      ))}
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
    alignItems: 'baseline',
    gap: 8,
  },
  headerMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: puraColors.clayMist,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.claySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginRight: 2,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    letterSpacing: -0.4,
    color: puraColors.ink,
    lineHeight: 26,
  },
  headerSub: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: puraColors.muted,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: puraColors.surfaceQuiet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.line,
  },
  newBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    letterSpacing: 0.2,
    color: puraColors.inkSecondary,
  },

  // ---- Empty state ----
  emptyWrap: {
    flex: 1,
  },
  emptyScrollContent: {
    paddingHorizontal: puraSpace.screenX,
    paddingTop: 8,
  },
  emptyHeroBlock: {
    paddingTop: 12,
  },
  emptyEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emptyEyebrowMark: {
    width: 18,
    height: 1,
    backgroundColor: puraColors.clay,
    borderRadius: 1,
  },
  emptyEyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 2.2,
    color: puraColors.clay,
  },
  emptyGreeting: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.9,
    color: puraColors.ink,
  },
  emptyGreetingItalic: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.9,
    color: puraColors.clayDeep,
    marginTop: 2,
  },
  emptySupport: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: puraColors.body,
    marginTop: 14,
    maxWidth: 320,
  },

  // ---- Suggestions ----
  suggestionGrid: {
    marginTop: 24,
  },
  suggestionsLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 2.2,
    color: puraColors.muted,
    marginBottom: 10,
  },
  suggestionsCol: {
    gap: 7,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: puraColors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.line,
    gap: 12,
  },
  suggestionCardPressed: {
    backgroundColor: puraColors.surfacePressed,
    borderColor: puraColors.lineStrong,
  },
  suggestionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: puraColors.clayMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionCopy: { flex: 1, gap: 2 },
  suggestionArrowWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  suggestionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    lineHeight: 20,
    color: puraColors.ink,
    letterSpacing: -0.1,
  },
  suggestionSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: puraColors.muted,
  },

  // ---- Conversation list ----
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: puraSpace.screenX,
    paddingTop: 8,
  },

  // ---- User bubble ----
  userRow: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
  },
  userBubble: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 6,
    backgroundColor: puraColors.clayMist,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.claySoft,
  },
  userText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: puraColors.inkSecondary,
    letterSpacing: -0.1,
  },

  // ---- Assistant turn ----
  assistantRow: { alignSelf: 'stretch' },
  assistantTurn: { paddingRight: 4, gap: 10 },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assistantEyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.0,
    color: puraColors.clay,
  },
  assistantBlocks: { gap: 14 },
  assistantText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 25,
    color: puraColors.inkSecondary,
    letterSpacing: -0.1,
  },

  // ---- Thinking state ----
  thinkingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  thinkingSparkWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingPill: {
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: puraColors.clayMist,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.claySoft,
    position: 'relative',
  },
  thinkingText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 18,
    color: puraColors.clayDeep,
    letterSpacing: -0.2,
  },
  thinkingDot: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 18,
    color: puraColors.clayDeep,
    letterSpacing: -0.2,
    marginLeft: 1,
  },
  thinkingShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 140,
    height: '100%',
    backgroundColor: 'rgba(255, 252, 248, 0.55)',
  },

  // ---- Product pick card ----
  productCard: {
    flexDirection: 'row',
    backgroundColor: puraColors.surfaceRaised,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.line,
    padding: 14,
    gap: 14,
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
  productCopy: { flex: 1, gap: 3, justifyContent: 'center' },
  productFit: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: puraColors.clay,
  },
  productBrand: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: puraColors.muted,
    textTransform: 'uppercase',
  },
  productName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: puraColors.ink,
    marginTop: -1,
  },
  productReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: puraColors.muted,
    marginTop: 4,
  },

  // ---- Routine card ----
  routineCard: {
    backgroundColor: puraColors.surfaceRaised,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  routineTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: puraColors.ink,
    marginBottom: 8,
  },
  routineSteps: {},
  routineStep: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 14,
    alignItems: 'flex-start',
  },
  routineStepDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraColors.lineSoft,
  },
  routineNumberCol: {
    width: 52,
  },
  routineNumber: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 0.4,
    color: puraColors.muted,
  },
  routineFocusBadge: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: puraColors.clayDeep,
    marginTop: 6,
  },
  routineCopyCol: { flex: 1 },
  routineLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    lineHeight: 19,
    color: puraColors.ink,
    letterSpacing: -0.1,
  },
  routineProduct: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: puraColors.muted,
    marginTop: 2,
  },

  // ---- Follow-ups ----
  followups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  followupChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: puraColors.surfaceQuiet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraColors.line,
  },
  followupText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    lineHeight: 16,
    color: puraColors.inkSecondary,
    letterSpacing: -0.05,
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
