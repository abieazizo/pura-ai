import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import {
  Plus,
  Camera,
  ArrowUp,
  X,
  CaretRight,
  Sparkle,
  ChartLineUp,
  MoonStars,
  Leaf,
  ShieldCheck,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { TypingDots } from '@/components/TypingDots';
import { ProductCard } from '@/components/ProductCard';
import { AISourceBadge } from '@/components/dev/AISourceBadge';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { seedProducts } from '@/data/seed';
import { colors, palette, radius, space, type as typography } from '@/theme';
import { assistant as strings } from '@/copy/strings';
import { hapt } from '@/utils/haptics';
import type { AssistantMessage, Product } from '@/types';
import type { RootStackParamList } from '@/navigation/types';
import {
  shapeAssistantText,
  type ShapedTextBlock,
} from '@/utils/shapeAssistantText';

/**
 * v5 Assistant. Title `Ask.` with italic lede. Assistant messages render
 * without bubbles — raw text, with the Mark `xs` to the left of each — the
 * assistant is not a character, it's Pura itself speaking. User messages
 * keep a clay bubble.
 */
export function AssistantScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useAppStore((s) => s.user);
  const messages = useAppStore((s) => s.messages);
  const typing = useAppStore((s) => s.assistantTyping);
  const latestScan = useAppStore((s) => s.scans[s.scans.length - 1]);
  const hasScanned = useAppStore((s) => s.scans.length > 0);
  const sendMessage = useAppStore((s) => s.sendMessage);
  // v11.5 — kill the dead air above the composer when the keyboard
  // is up. The previous fixed `keyboardVerticalOffset={64}` was
  // wrong: the actual offset = the live tab-bar height (varies per
  // device — ~83 with home indicator, ~49 without). AssistantScreen
  // always renders inside the bottom Tab navigator (see
  // navigation/TabNavigator.tsx), so this hook is always callable.
  const tabBarHeight = useBottomTabBarHeight();

  const listRef = useRef<FlatList<ListItem>>(null);
  const [draft, setDraft] = useState('');
  const [attached, setAttached] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const suggestedZone =
    latestScan?.zones.find((z) => z.status === 'active')?.label.toLowerCase() ?? 'chin';
  const suggestions = hasScanned ? strings.promptsFor(suggestedZone) : strings.promptsEmpty;

  // v10.4 — proactive opening. Pura speaks first whenever there's scan
  // data to reference. Memoized against scan state so the opening line
  // is stable across renders within a session.
  const scansForOpening = useAppStore((s) => s.scans);
  const openingMessage = useMemo(
    () => buildProactiveOpening(scansForOpening, suggestedZone),
    [scansForOpening, suggestedZone]
  );

  const canSend = draft.trim().length > 0 && !typing;

  const send = useCallback(
    (text: string, attachedIds: string[]) => {
      if (!text.trim()) return;
      hapt.tap();
      sendMessage(text.trim(), attachedIds.length ? attachedIds : undefined);
      setDraft('');
      setAttached([]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    },
    [sendMessage]
  );

  const attachProduct = (id: string) => {
    setAttached((cur) => (cur.includes(id) ? cur : [...cur, id]));
    setShowPicker(false);
  };

  const removeAttached = (id: string) =>
    setAttached((cur) => cur.filter((x) => x !== id));

  const items: ListItem[] = useMemo(() => {
    if (messages.length === 0) {
      return [{ kind: 'empty' }];
    }
    return messages.map((m) => ({ kind: 'message', message: m }));
  }, [messages]);

  if (!user) return null;

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'empty') {
      return (
        <EmptyChatBody
          suggestions={suggestions}
          opening={openingMessage}
          onPick={(t) => send(t, [])}
          hasScanned={hasScanned}
          onScan={() => nav.navigate('ScanModal')}
        />
      );
    }
    return (
      <MessageLine
        message={item.message}
        hasScanned={hasScanned}
        onScan={() => nav.navigate('ScanModal')}
        onOpenProducts={() => {
          // ProductsTab is in the bottom Tabs navigator
          // @ts-expect-error nested tab navigation typing
          nav.navigate('Tabs', { screen: 'ProductsTab' });
        }}
        onOpenRoutine={() => {
          // @ts-expect-error nested tab navigation typing
          nav.navigate('Tabs', { screen: 'RoutineTab' });
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <AISourceBadge feature="assistant" />

      {/* v11.3 — single calm header bar. The redundant top-right
          status pill (READY/THINKING) is gone — the PuraMark already
          communicates state via its `variant` prop, and a duplicate
          status indicator was the visible-clutter problem on the
          previous AI Assist screen. The 40pt "Ask." hero is replaced
          with a tighter inline title that lets the empty-body opener
          carry the warmth. */}
      <View style={styles.brandBar}>
        <View style={styles.brandLeft}>
          <PuraMark
            size={22}
            variant={typing ? 'thinking' : 'idle'}
          />
          <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
            AI Assistant
          </Text>
        </View>
      </View>

      {/* v11.6 — proper composer/keyboard geometry.
        *
        *   closed → outer View pushes content up by tabBarHeight so
        *            the composer sits ABOVE the tab bar.
        *   open   → KeyboardAvoidingView adds (keyboard - tabBarHeight)
        *            of internal padding so total bottom offset =
        *            tabBarHeight (outer) + (keyboard - tabBarHeight)
        *            (inner) = keyboard_height. Composer flush with
        *            keyboard top. Zero dead air.
        *
        * v11.5's `paddingBottom` on the KAV was overridden by KAV's
        * own behavior=padding logic (StyleSheet.flatten — last
        * paddingBottom wins) so the static value never applied
        * when the keyboard was closed. Putting it on a wrapper
        * View OUTSIDE KAV is the correct pattern. */}
      <View style={[styles.flex, { paddingBottom: tabBarHeight }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={tabBarHeight}
        >
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item, i) =>
            item.kind === 'message' ? item.message.id : `empty-${i}`
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            typing ? (
              <View style={styles.typingRow}>
                <PuraMark variant="thinking" size="xs" />
                <View style={{ flex: 1, marginLeft: space.sm }}>
                  <TypingDots color={palette.inkTertiary} />
                </View>
              </View>
            ) : null
          }
        />

        {attached.length > 0 ? (
          <View style={styles.attachedRow}>
            {/* v11.3 — slim attached pills replace the heavy
                ProductCard chip variant. Each pill: brand caps · name,
                tap-to-remove. Footprint dropped from ~80pt rows to a
                28pt single line. */}
            {attached.map((id) => {
              const p = seedProducts.find((x) => x.id === id);
              if (!p) return null;
              return (
                <Pressable
                  key={id}
                  onPress={() => removeAttached(id)}
                  hitSlop={6}
                  style={styles.attachedPill}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${p.brand} ${p.name}`}
                >
                  <Text
                    style={styles.attachedPillText}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.1}
                  >
                    {`${p.brand.toUpperCase()} · ${p.name}`}
                  </Text>
                  <X size={11} color={palette.inkTertiary} weight="bold" />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.composer}>
          <Pressable
            onPress={() => setShowPicker((v) => !v)}
            hitSlop={10}
            accessibilityLabel="Attach a product"
            style={styles.composerIconBtn}
          >
            <Plus size={18} color={palette.moss} weight="duotone" />
          </Pressable>
          <Pressable
            onPress={() => nav.navigate('ScanModal')}
            hitSlop={10}
            accessibilityLabel="Scan to attach"
            style={styles.composerIconBtn}
          >
            <Camera size={18} color={palette.ink} weight="duotone" />
          </Pressable>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={strings.composerPlaceholder}
            placeholderTextColor={palette.inkTertiary}
            style={styles.input}
            multiline
          />

          <Pressable
            onPress={() => send(draft, attached)}
            disabled={!canSend}
            hitSlop={10}
            accessibilityLabel="Send"
            style={[
              styles.sendBtn,
              { backgroundColor: canSend ? palette.clay : palette.bgDeep },
            ]}
          >
            <ArrowUp
              size={16}
              color={canSend ? palette.inkInverse : palette.inkTertiary}
              weight="bold"
            />
          </Pressable>
        </View>

        {showPicker ? (
          <View style={styles.picker}>
            {/* v11.3 — picker tray rebuilt as slim horizontal pills
                instead of full ProductCard chips. Saves ~110pt of
                vertical space on the lower screen and stops the tray
                from dominating the composer. */}
            <Text style={styles.pickerLabel}>ATTACH A PRODUCT</Text>
            <FlatList
              data={seedProducts.slice(0, 10)}
              horizontal
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerRow}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => attachProduct(item.id)}
                  style={styles.pickerPill}
                  accessibilityRole="button"
                  accessibilityLabel={`Attach ${item.brand} ${item.name}`}
                >
                  <Text
                    style={styles.pickerPillBrand}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.1}
                  >
                    {item.brand.toUpperCase()}
                  </Text>
                  <Text
                    style={styles.pickerPillName}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.1}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

/**
 * Concierge-style starter chip. A 2-column grid replaces the stacked
 * list-row treatment. Each chip leads with an icon tinted to the prompt's
 * theme (score → ChartLineUp, tonight → MoonStars, natural → Leaf, etc.)
 * so the grid reads as visual-first, not just text.
 */
const PROMPT_ICONS: Record<string, React.FC<PhosphorIconProps>> = {
  score: ChartLineUp as React.FC<PhosphorIconProps>,
  tonight: MoonStars as React.FC<PhosphorIconProps>,
  compare: Sparkle as React.FC<PhosphorIconProps>,
  natural: Leaf as React.FC<PhosphorIconProps>,
  how: ShieldCheck as React.FC<PhosphorIconProps>,
  default: Sparkle as React.FC<PhosphorIconProps>,
};

function iconKeyForPrompt(p: string): keyof typeof PROMPT_ICONS {
  const s = p.toLowerCase();
  if (s.includes('score')) return 'score';
  if (s.includes('tonight')) return 'tonight';
  if (s.includes('compare') || s.includes('last two')) return 'compare';
  if (s.includes('natural')) return 'natural';
  if (s.includes('how') || s.includes('expect') || s.includes('work')) return 'how';
  return 'default';
}

/**
 * v10.3 — EmptyChatBody upgraded to feel alive before the user types.
 *
 * Behavior:
 *   • Pool of 6–10 prompts (contextual when a scan exists, educational
 *     otherwise). On mount, a Fisher–Yates shuffle produces a fresh
 *     ordering so each open of the assistant feels considered, not
 *     memorized.
 *   • Render 4 chips at a time. Every 7 seconds, the oldest chip swaps
 *     out for the next in the shuffled queue via a crossfade. Slow enough
 *     to read without frustration; live enough to feel intelligent.
 *   • Reduce-motion: skip the rotation; just show the shuffled first 4.
 */
function EmptyChatBody({
  suggestions,
  onPick,
  opening,
  hasScanned,
  onScan,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
  opening: string | null;
  hasScanned: boolean;
  onScan: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const visible = useRotatingPrompts(suggestions, 3, 7000, reduceMotion);

  // v11.4 — when no scan exists, the empty body now leads with a
  // primary "Scan your face" action button instead of asking the
  // user to type a question and hoping the AI suggests scanning.
  // The assistant's grounded answers are massively better with scan
  // data in hand, so the CTA short-circuits the user to the highest-
  // value next step. 2 scan-free prompts ("How does the Skin Score
  // work?" / "What's the difference between a serum and a toner?")
  // remain available below.
  if (!hasScanned) {
    return (
      <View style={emptyStyles.root}>
        <Text style={emptyStyles.title} maxFontSizeMultiplier={1.15}>
          {strings.emptyTitle}
        </Text>
        <Text style={emptyStyles.body}>
          I don’t have a recent scan yet. Want to start there?
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a face scan"
          onPress={() => {
            hapt.tap();
            onScan();
          }}
          style={({ pressed }) => [
            emptyStyles.primaryCta,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Camera size={16} color={palette.inkInverse} weight="duotone" />
          <Text
            style={emptyStyles.primaryCtaLabel}
            maxFontSizeMultiplier={1.15}
          >
            Take a face scan
          </Text>
        </Pressable>
        <Text style={emptyStyles.orLine} maxFontSizeMultiplier={1.1}>
          OR ASK
        </Text>
        <View style={emptyStyles.promptGrid}>
          {visible.slice(0, 2).map((s) => (
            <PromptChip key={s} text={s} onPick={onPick} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={emptyStyles.root}>
      <Text style={emptyStyles.title} maxFontSizeMultiplier={1.15}>
        {strings.emptyTitle}
      </Text>
      {opening ? (
        <Text style={emptyStyles.opening} maxFontSizeMultiplier={1.2}>
          {opening}
        </Text>
      ) : (
        <Text style={emptyStyles.body}>{strings.emptyBody}</Text>
      )}

      <View style={emptyStyles.promptGrid}>
        {visible.map((s) => (
          <PromptChip key={s} text={s} onPick={onPick} />
        ))}
      </View>
    </View>
  );
}

// v11.3 — ProactiveOpening removed. The opening line now renders
// inline inside EmptyChatBody as the body sentence, replacing the
// generic "Ask about your scan…" copy when scan data is in hand.
// Removing the Mark + animated bounce wrap collapsed three stacked
// blocks (mark / opening / try-asking-rule) into one calm line.

/**
 * One chip. Renders with a gentle fade-in on mount via Reanimated so the
 * rotating-prompts swap is visually continuous. No fade-out animation —
 * the replacement just fades in at the same slot.
 */
function PromptChip({
  text,
  onPick,
}: {
  text: string;
  onPick: (text: string) => void;
}) {
  const Icon = PROMPT_ICONS[iconKeyForPrompt(text)];
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, {
      duration: 340,
      easing: Easing.out(Easing.cubic),
    });
  }, [opacity, text]);

  const chipStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ flexGrow: 1, flexBasis: '46%' }, chipStyle]}>
      <Pressable
        onPress={() => onPick(text)}
        accessibilityRole="button"
        accessibilityLabel={text}
        style={({ pressed }) => [
          emptyStyles.promptChip,
          pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={emptyStyles.promptIconWrap}>
          <Icon size={14} color={palette.clay} weight="duotone" />
        </View>
        <Text
          style={emptyStyles.promptText}
          numberOfLines={2}
          maxFontSizeMultiplier={1.15}
        >
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Rotating-prompts hook. Shuffles the full pool on mount, then rotates the
 * oldest visible prompt out every `intervalMs` by advancing the queue by
 * one slot. Returns exactly `windowSize` distinct prompts at a time.
 *
 * If the pool is smaller than the window, it just returns the shuffled
 * pool (no rotation happens — no new prompt to rotate in).
 */
function useRotatingPrompts(
  pool: string[],
  windowSize: number,
  intervalMs: number,
  reduceMotion: boolean
): string[] {
  const shuffled = React.useMemo(() => shuffleOnce(pool), [pool]);
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    if (reduceMotion) return;
    if (shuffled.length <= windowSize) return;
    const id = setInterval(() => {
      setOffset((o) => (o + 1) % shuffled.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [shuffled.length, windowSize, intervalMs, reduceMotion]);

  if (shuffled.length <= windowSize) return shuffled;
  // Pull `windowSize` consecutive prompts starting at offset, wrapping.
  const out: string[] = [];
  for (let i = 0; i < windowSize; i++) {
    out.push(shuffled[(offset + i) % shuffled.length]);
  }
  return out;
}

function shuffleOnce(items: string[]): string[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * v10.4 — proactive opening builder. Pura speaks first whenever it has
 * scan data to reference. Tone stays plain and grounded — this is the
 * AI's first line, not marketing copy.
 *
 * Branches (priority order):
 *   • Score dropped ≥3 since last scan → flag the drop + point to the
 *     top zone as the likely driver
 *   • Score up ≥3 since last scan → celebrate concisely
 *   • Fresh scan with a non-calm concern → name the focus for tonight
 *   • Calm/stable post-scan → steady language, invite a question
 *   • No scans yet → educational, invites a first scan
 */
function buildProactiveOpening(
  scans: ReturnType<typeof useAppStore.getState>['scans'],
  zone: string
): string | null {
  if (scans.length === 0) {
    return "I'm grounded in your skin data, not general skincare takes. Once you scan, ask me anything and I'll answer from what I actually see.";
  }
  const latest = scans[scans.length - 1];
  const previous = scans.length >= 2 ? scans[scans.length - 2] : null;
  const delta = previous ? latest.overallScore - previous.overallScore : null;

  if (delta !== null && delta <= -3) {
    return `Your Skin Score dropped ${Math.abs(delta)} since your last scan. Your ${zone} is the likely driver — want me to walk through what to do tonight?`;
  }
  if (delta !== null && delta >= 3) {
    return `Skin Score up ${delta} since your last scan. Whatever you\u2019re doing is working — want to lock the routine in?`;
  }
  const activeZone = latest.zones.find((z) => z.status === 'active');
  if (activeZone) {
    return `Your ${activeZone.label.toLowerCase()} is the focus tonight. Ask me anything — I'll tailor advice to what I see in your scan.`;
  }
  if (delta !== null) {
    return 'Things look steady since your last scan. Ask me what to keep doing, or where to push next.';
  }
  return 'Your first reading is in. Ask me anything about what you\u2019re seeing — I\u2019ll answer from your scan, not generalities.';
}

function MessageLine({
  message,
  hasScanned,
  onScan,
  onOpenProducts,
  onOpenRoutine,
}: {
  message: AssistantMessage;
  hasScanned: boolean;
  onScan: () => void;
  onOpenProducts: () => void;
  onOpenRoutine: () => void;
}) {
  const isUser = message.role === 'user';
  const attachedProducts: Product[] = (message.attachedProductIds ?? [])
    .map((id) => seedProducts.find((p) => p.id === id))
    .filter((p): p is Product => !!p);

  if (isUser) {
    return (
      <View style={messageStyles.userRow}>
        <View style={messageStyles.userBubble}>
          {attachedProducts.length > 0 ? (
            <View style={messageStyles.userAttached}>
              {attachedProducts.map((p) => (
                <ProductCard key={p.id} product={p} variant="chip" />
              ))}
            </View>
          ) : null}
          <Text style={messageStyles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // v11.4 — derive contextual action chips for assistant messages.
  // We scan the response text for intent keywords and render the
  // matching chips as tappable next steps, so the user gets an
  // actionable thread instead of a paragraph that ends.
  const actions = deriveActionChips({
    text: message.text,
    hasScanned,
  });

  // v11.5 — shape the raw model response into a lead + ordered
  // blocks before rendering. Long paragraphs split at sentence
  // boundaries, bullets become their own renderable kind, markdown
  // markers stripped.
  const shaped = shapeAssistantText(message.text);

  return (
    <View style={messageStyles.assistantRow}>
      <View style={messageStyles.assistantMark}>
        <PuraMark variant="idle" size="xs" />
      </View>
      <View style={messageStyles.assistantContent}>
        {shaped.lead.length > 0 ? (
          <Text style={messageStyles.assistantLead}>{shaped.lead}</Text>
        ) : (
          <Text style={messageStyles.assistantText}>{message.text}</Text>
        )}
        {shaped.blocks.map((b: ShapedTextBlock, i) =>
          b.kind === 'bullet' ? (
            <View key={i} style={messageStyles.bulletRow}>
              <Text style={messageStyles.bulletDot}>•</Text>
              <Text style={messageStyles.bulletText}>{b.text}</Text>
            </View>
          ) : (
            <Text key={i} style={messageStyles.assistantText}>
              {b.text}
            </Text>
          )
        )}
        {message.groundedFrom && message.groundedFrom.length > 0 ? (
          <Text
            style={messageStyles.assistantGrounding}
            maxFontSizeMultiplier={1.1}
            numberOfLines={1}
          >
            {`Grounded in: ${message.groundedFrom.join(' · ')}`}
          </Text>
        ) : null}
        {actions.length > 0 ? (
          <View style={messageStyles.actionRow}>
            {actions.map((a) => {
              const onPress =
                a === 'scan'
                  ? onScan
                  : a === 'products'
                  ? onOpenProducts
                  : onOpenRoutine;
              const isPrimary = a === 'scan' && !hasScanned;
              return (
                <Pressable
                  key={a}
                  onPress={() => {
                    hapt.select();
                    onPress();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={ACTION_LABELS[a]}
                  style={({ pressed }) => [
                    messageStyles.actionChip,
                    isPrimary && messageStyles.actionChipPrimary,
                    pressed && {
                      opacity: 0.92,
                      transform: [{ scale: 0.985 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      messageStyles.actionChipText,
                      isPrimary && messageStyles.actionChipTextPrimary,
                    ]}
                    maxFontSizeMultiplier={1.1}
                  >
                    {ACTION_LABELS[a]}
                  </Text>
                  <CaretRight
                    size={12}
                    weight="bold"
                    color={isPrimary ? palette.bg : palette.inkSecondary}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

type ActionChip = 'scan' | 'products' | 'routine';

// v11.8 — drop the inline unicode arrow from each label; the chip
// renders a proper Phosphor CaretRight on the right edge so the
// "this is tappable, this is the next step" affordance reads as a
// real button, not a sentence with an arrow appended.
const ACTION_LABELS: Record<ActionChip, string> = {
  scan: 'Take a face scan',
  products: 'View matched products',
  routine: 'Open routine',
};

/**
 * v11.4 — light keyword-based intent extraction. Two rules:
 *
 *   1. If the assistant said "I don't have a recent scan" (or the
 *      response is missing scan grounding and the user hasn't
 *      scanned yet), surface a Scan chip — this is the highest-value
 *      next step in that state.
 *   2. Otherwise scan the body for product/routine references and
 *      surface the matching chips. Cap at 2 so the UI doesn't read
 *      as a button menu.
 */
function deriveActionChips({
  text,
  hasScanned,
}: {
  text: string;
  hasScanned: boolean;
}): ActionChip[] {
  const lower = text.toLowerCase();
  const out: ActionChip[] = [];
  const noScanSignaled =
    /don’t have a recent scan|don't have a recent scan|no recent scan|once you scan|after you scan|take a scan/i.test(
      text
    ) || (!hasScanned && !/scan/i.test(text));
  if (noScanSignaled) out.push('scan');
  if (
    /\bproduct(s)?\b|matches|recommend|cleanser|serum|moisturizer|spf|toner/i.test(
      text
    )
  ) {
    out.push('products');
  }
  if (/\broutine\b|morning|evening|tonight|step/i.test(text)) {
    out.push('routine');
  }
  // Dedupe and cap at 2 so the message stays scannable.
  return Array.from(new Set(out)).slice(0, 2);
}

// v11.3 — LiveStatusDot removed. The previous design rendered
// a redundant READY/THINKING pill in the top-right of the assistant
// header alongside the PuraMark thinking variant. The two indicators
// said the same thing twice; the pill is gone.

type ListItem =
  | { kind: 'empty' }
  | { kind: 'message'; message: AssistantMessage };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  // v11.3 — single calm header row. The legacy brandStatus pill +
  // 40pt "Ask." hero + italic subtitle were replaced with a slim
  // brand bar; the warm "Hey — what do you need?" empty body now
  // carries the personality.
  brandBar: {
    height: 48,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    paddingTop: space.sm,
    gap: space.md,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
  },

  attachedRow: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // v11.3 — slim attached pill. ~28pt tall, single line. Replaces
  // the ProductCard chip variant which carried tile + brand + name +
  // remove dot per attached product (~80pt rows).
  attachedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    maxWidth: '100%',
  },
  attachedPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
    flexShrink: 1,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    backgroundColor: colors.bg,
  },
  composerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...typography.body,
    flex: 1,
    color: palette.ink,
    minHeight: 36,
    maxHeight: 100,
    paddingVertical: space.sm,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  picker: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  pickerLabel: {
    ...typography.micro,
    color: palette.inkTertiary,
    marginTop: space.sm,
    marginBottom: 8,
  },
  // v11.3 — picker tray was a horizontal FlatList of full ProductCard
  // chips (~92pt tall). Replaced with slim 2-line pills (~52pt) that
  // show brand caps on top + product name below.
  pickerRow: {
    gap: 8,
    paddingRight: space.lg,
  },
  pickerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    minWidth: 140,
    maxWidth: 200,
  },
  pickerPillBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    marginBottom: 2,
  },
  pickerPillName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.2,
    color: palette.ink,
  },
});

const emptyStyles = StyleSheet.create({
  // v11.3 — empty body collapses to title + opener + 3 prompt chips.
  // Removed: PuraMark md (redundant with the brandBar mark), the
  // emptyTitle/emptyBody dual-text stack, "TRY ASKING" kicker rule,
  // and the standalone "Attach a product. I'll read the label." hint
  // (the "+" composer button already communicates that).
  root: {
    alignItems: 'flex-start',
    paddingTop: space.md,
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginBottom: space.lg,
  },
  // v11.3 — when a scan exists, the proactive opening REPLACES the
  // generic body line so the user sees one warm sentence grounded in
  // their actual scan, not stacked greeting + body + grounded line.
  opening: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginBottom: space.lg,
  },
  promptGrid: {
    alignSelf: 'stretch',
    flexDirection: 'column',
    gap: 8,
  },
  // v11.3 — flatter chip shape. The previous 74pt min-height + icon
  // wrapper made each chip a card; v11.3 chips are 48pt full-width
  // pills that read as "tap to ask".
  promptChip: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promptIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  // v11.4 — primary "Take a face scan" CTA on the empty body.
  // Replaces the prompt-only experience when no scan exists.
  primaryCta: {
    marginTop: space.xs,
    height: 50,
    borderRadius: 25,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
  orLine: {
    marginTop: space.lg,
    marginBottom: space.sm,
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
  },
});

const messageStyles = StyleSheet.create({
  userRow: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: palette.clay,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.lg,
    borderTopRightRadius: 4,
  },
  userAttached: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: space.sm,
  },
  userText: { ...typography.body, color: palette.inkInverse },

  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    maxWidth: '94%',
  },
  assistantMark: {
    marginTop: 4,
  },
  assistantContent: {
    flex: 1,
    gap: 8,
  },
  // v11.5 — lead sentence is heavier than follow-up paragraphs so
  // the eye lands on the answer first.
  assistantLead: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  assistantText: {
    ...typography.body,
    color: palette.inkSecondary,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 22,
    color: palette.clay,
    marginTop: 0,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
  },
  // v10.26 — small grounding attribution under AI-driven replies.
  assistantGrounding: {
    marginTop: 6,
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: palette.clay,
    textTransform: 'uppercase',
  },
  // v11.8 — action chips refined: paired CaretRight icon, larger
  // tap target (38pt), clean fill instead of hairline border. The
  // first 'scan' chip when no scan exists upgrades to a clay-filled
  // primary variant since that's the highest-value next step.
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.bgDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionChipPrimary: {
    backgroundColor: palette.ink,
    shadowColor: palette.ink,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  actionChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
    color: palette.ink,
  },
  actionChipTextPrimary: {
    color: palette.bg,
  },
});
