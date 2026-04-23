import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
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
import { EditorialRule } from '@/components/EditorialRule';
import { PuraMark } from '@/components/PuraMark';
import { TypingDots } from '@/components/TypingDots';
import { ProductCard } from '@/components/ProductCard';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { seedProducts } from '@/data/seed';
import { colors, palette, radius, space, type as typography } from '@/theme';
import { assistant as strings } from '@/copy/strings';
import { hapt } from '@/utils/haptics';
import type { AssistantMessage, Product } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

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

  const listRef = useRef<FlatList<ListItem>>(null);
  const [draft, setDraft] = useState('');
  const [attached, setAttached] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const suggestedZone =
    latestScan?.zones.find((z) => z.status === 'active')?.label.toLowerCase() ?? 'chin';
  const suggestions = hasScanned ? strings.promptsFor(suggestedZone) : strings.promptsEmpty;

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
          onPick={(t) => send(t, [])}
        />
      );
    }
    return <MessageLine message={item.message} />;
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      {/* v9.6 — branded chat header. Replaces the v5 ScreenChrome
          (absolutely-positioned mark + AI chip). The chat page reads as
          "Pura, in conversation" — so the brand bar sits cleanly at the
          top with the Mark animating to `thinking` while the assistant
          composes. */}
      <View style={styles.brandBar}>
        <View style={styles.brandLeft}>
          <PuraMark size={26} variant={typing ? 'thinking' : 'idle'} />
          <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
            Pura AI
          </Text>
        </View>
        <View style={styles.brandStatus}>
          <View
            style={[
              styles.brandStatusDot,
              { backgroundColor: typing ? palette.clay : palette.moss },
            ]}
          />
          <Text style={styles.brandStatusText} maxFontSizeMultiplier={1.1}>
            {typing ? 'Thinking' : 'Ready'}
          </Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          Ask<Text style={{ color: palette.clay }}>.</Text>
        </Text>
        <Text style={styles.subtitle}>I{'\u2019'}ve been watching your skin.</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
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
            {attached.map((id) => {
              const p = seedProducts.find((x) => x.id === id);
              if (!p) return null;
              return (
                <View key={id} style={styles.attachedChip}>
                  <ProductCard
                    product={p}
                    variant="chip"
                    onPress={() => removeAttached(id)}
                  />
                  <Pressable
                    onPress={() => removeAttached(id)}
                    hitSlop={6}
                    style={styles.chipRemove}
                  >
                    <X size={12} color={palette.inkSecondary} weight="regular" />
                  </Pressable>
                </View>
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
            <Text style={styles.pickerLabel}>ATTACH A PRODUCT</Text>
            <FlatList
              data={seedProducts.slice(0, 10)}
              horizontal
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: space.sm }}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  variant="chip"
                  onPress={() => attachProduct(item.id)}
                />
              )}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
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

function EmptyChatBody({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
}) {
  return (
    <View style={emptyStyles.root}>
      <View style={emptyStyles.markWrap}>
        <PuraMark variant="idle" size="md" />
      </View>
      <Text style={emptyStyles.title} maxFontSizeMultiplier={1.15}>
        {strings.emptyTitle}
      </Text>
      <Text style={emptyStyles.body}>{strings.emptyBody}</Text>

      <View style={emptyStyles.kickerRow}>
        <Text style={emptyStyles.kickerText} maxFontSizeMultiplier={1.1}>
          SUGGESTED
        </Text>
        <View style={emptyStyles.kickerRule} />
      </View>

      <View style={emptyStyles.promptGrid}>
        {suggestions.map((s) => {
          const Icon = PROMPT_ICONS[iconKeyForPrompt(s)];
          return (
            <Pressable
              key={s}
              onPress={() => onPick(s)}
              accessibilityRole="button"
              accessibilityLabel={s}
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
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={emptyStyles.hintText}>{strings.attachHint}</Text>
    </View>
  );
}

function MessageLine({ message }: { message: AssistantMessage }) {
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

  // Assistant — NO bubble. Mark xs to the left of raw text.
  return (
    <View style={messageStyles.assistantRow}>
      <View style={messageStyles.assistantMark}>
        <PuraMark variant="idle" size="xs" />
      </View>
      <Text style={messageStyles.assistantText}>{message.text}</Text>
    </View>
  );
}

type ListItem =
  | { kind: 'empty' }
  | { kind: 'message'; message: AssistantMessage };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  // v9.6 — branded chat header
  brandBar: {
    height: 56,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  brandStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: palette.bgDeep,
  },
  brandStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brandStatusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.0,
    color: palette.inkSecondary,
    textTransform: 'uppercase',
  },

  header: {
    paddingTop: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  title: {
    ...typography.titleSerif,
    color: palette.ink,
    fontSize: 40,
    letterSpacing: -1.0,
  },
  subtitle: {
    ...typography.italicLead,
    color: palette.inkSecondary,
    marginTop: space.sm,
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
  attachedChip: { position: 'relative' },
  chipRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  pickerLabel: {
    ...typography.micro,
    color: palette.inkTertiary,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
});

const emptyStyles = StyleSheet.create({
  root: { alignItems: 'center', paddingTop: space.lg },
  markWrap: { marginBottom: space.lg },
  title: {
    ...typography.titleSerif,
    color: palette.ink,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: palette.inkSecondary,
    textAlign: 'center',
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
  // v9.3 — concierge grid
  kickerRow: {
    marginTop: space.xxl,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: 4,
  },
  kickerText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  kickerRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
  },
  promptGrid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: space.md,
  },
  promptChip: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 74,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    gap: 10,
  },
  promptIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  hintText: {
    ...typography.caption,
    color: palette.inkTertiary,
    textAlign: 'center',
    marginTop: space.xl,
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
  assistantText: {
    ...typography.body,
    color: palette.ink,
    flex: 1,
  },
});
