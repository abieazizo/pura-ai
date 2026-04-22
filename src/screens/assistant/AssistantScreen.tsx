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
import { Plus, Camera, ArrowUp, X, CaretRight } from 'phosphor-react-native';
import { ScreenChrome } from '@/components/ScreenChrome';
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
      <ScreenChrome markVariant={typing ? 'thinking' : 'idle'} />

      <View style={styles.header}>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          {strings.title}
          <Text style={{ color: palette.clay }}>.</Text>
        </Text>
        <Text style={styles.subtitle}>{strings.subtitle}</Text>
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

      <View style={emptyStyles.hintRow}>
        <Text style={emptyStyles.hintText}>{strings.attachHint}</Text>
      </View>

      <EditorialRule
        label={strings.forYouLabel}
        style={{ marginTop: space.xxl, alignSelf: 'stretch' }}
      />
      <View style={emptyStyles.suggestionStack}>
        {suggestions.map((s) => (
          <Pressable
            key={s}
            onPress={() => onPick(s)}
            accessibilityRole="button"
            style={({ pressed }) => [
              emptyStyles.suggestion,
              pressed && { backgroundColor: palette.bgDeep },
            ]}
          >
            <Text style={emptyStyles.suggestionText}>{s}</Text>
            <CaretRight
              size={16}
              color={palette.inkTertiary}
              weight="regular"
            />
          </Pressable>
        ))}
      </View>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  title: {
    ...typography.titleSerif,
    color: palette.ink,
    fontSize: 40,
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
  hintRow: {
    marginTop: space.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: palette.bgDeep,
  },
  hintText: {
    ...typography.caption,
    color: palette.inkSecondary,
    textAlign: 'center',
  },
  suggestionStack: {
    alignSelf: 'stretch',
    gap: space.sm,
    marginTop: space.md,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
  },
  suggestionText: { ...typography.body, color: palette.ink, flex: 1 },
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
