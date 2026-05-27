import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CaretRight, Check, X } from 'phosphor-react-native';
import { Body, Eyebrow, SectionHeading } from './primitives';
import { hapt } from '@/utils/haptics';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';

interface CompatibilityCandidate {
  id: string;
  brand?: string;
  name: string;
  category: string;
  /** When true, this product fits tonight's gentle plan. */
  okTonight: boolean;
  /** "Contains salicylic acid." */
  reason: string;
  /** "Save this for a night when your chin is calmer." */
  advice?: string;
}

interface ProductCompatibilitySheetProps {
  visible: boolean;
  onClose: () => void;
  candidates: CompatibilityCandidate[];
}

/**
 * v26 — Product compatibility checker.
 *
 * Honest non-medical check against tonight's "gentle" plan. The sheet
 * is split in two: a calm picker on top, a verdict card below once a
 * product is chosen. Verdict copy is intentionally non-clinical.
 */
export function ProductCompatibilitySheet({
  visible,
  onClose,
  candidates,
}: ProductCompatibilitySheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = candidates.find((c) => c.id === selectedId) ?? null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={s.card}>
          <View style={s.handleWrap}>
            <View style={s.handle} />
          </View>
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Eyebrow>CHECK A PRODUCT</Eyebrow>
              <SectionHeading style={s.title}>
                Will this fit tonight?
              </SectionHeading>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
              style={s.close}
            >
              <X size={18} color={V26.ink} />
            </Pressable>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <Body style={s.lead}>
              Pick one of your products to see how it fits tonight’s gentle plan.
            </Body>

            <View style={s.list}>
              {candidates.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Check ${c.name}`}
                  accessibilityState={{ selected: c.id === selectedId }}
                  onPress={() => {
                    hapt.select();
                    setSelectedId(c.id);
                  }}
                  style={({ pressed }) => [
                    s.candidate,
                    pressed && { backgroundColor: V26.paper },
                    c.id === selectedId && s.candidateSelected,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    {c.brand ? (
                      <Text style={s.brand} maxFontSizeMultiplier={1.15}>
                        {c.brand}
                      </Text>
                    ) : null}
                    <Text style={s.name} maxFontSizeMultiplier={1.2}>
                      {c.name}
                    </Text>
                    <Text style={s.category} maxFontSizeMultiplier={1.2}>
                      {c.category}
                    </Text>
                  </View>
                  <CaretRight size={14} color={V26.inkMuted} weight="bold" />
                </Pressable>
              ))}
            </View>

            {selected ? (
              <Verdict candidate={selected} />
            ) : (
              <Text style={s.hint} maxFontSizeMultiplier={1.2}>
                Tap a product to see tonight’s verdict.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Verdict({ candidate }: { candidate: CompatibilityCandidate }) {
  return (
    <View
      style={[
        verdictStyles.wrap,
        candidate.okTonight
          ? { backgroundColor: V26.positiveWash }
          : { backgroundColor: V26.guardrailSurface },
      ]}
    >
      <View
        style={[
          verdictStyles.ring,
          candidate.okTonight
            ? { backgroundColor: V26.positive }
            : { backgroundColor: V26.terracotta },
        ]}
      >
        {candidate.okTonight ? (
          <Check size={16} color="#FFFFFF" weight="bold" />
        ) : (
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>!</Text>
        )}
      </View>
      <Text
        style={[
          verdictStyles.title,
          { color: candidate.okTonight ? V26.positive : V26.terracottaText },
        ]}
        maxFontSizeMultiplier={1.2}
      >
        {candidate.okTonight ? 'Okay tonight' : 'Avoid on your chin tonight'}
      </Text>
      <Text style={verdictStyles.body} maxFontSizeMultiplier={1.2}>
        {candidate.reason}
      </Text>
      {candidate.advice ? (
        <Text style={verdictStyles.advice} maxFontSizeMultiplier={1.2}>
          {candidate.advice}
        </Text>
      ) : null}
    </View>
  );
}

const verdictStyles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    padding: 18,
    borderRadius: V26_RADIUS.inset,
    gap: 8,
  },
  ring: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 17,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: V26_TYPE.sans,
    fontSize: 14,
    lineHeight: 20,
    color: V26.ink,
  },
  advice: {
    fontFamily: V26_TYPE.sans,
    fontSize: 13,
    lineHeight: 19,
    color: V26.inkMuted,
    marginTop: 4,
  },
});

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: V26.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: V26.surface,
    borderTopLeftRadius: V26_RADIUS.hero,
    borderTopRightRadius: V26_RADIUS.hero,
    paddingHorizontal: V26_SPACE.gutter,
    paddingBottom: 28,
    paddingTop: 14,
    maxHeight: '88%',
  },
  handleWrap: { alignItems: 'center', marginBottom: 10 },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: V26.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    lineHeight: 26,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: V26.paper,
    borderWidth: 1,
    borderColor: V26.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  lead: {
    marginBottom: 14,
  },
  list: {
    gap: 8,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: V26_RADIUS.inset,
    borderWidth: 1,
    borderColor: V26.border,
    backgroundColor: V26.surface,
    gap: 12,
  },
  candidateSelected: {
    borderColor: V26.terracotta,
    backgroundColor: V26.clayMist,
  },
  brand: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 10.5,
    color: V26.inkMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 15,
    color: V26.ink,
    marginTop: 2,
  },
  category: {
    fontFamily: V26_TYPE.sans,
    fontSize: 12.5,
    color: V26.inkMuted,
    marginTop: 2,
  },
  hint: {
    marginTop: 18,
    fontFamily: V26_TYPE.sans,
    fontSize: 13,
    color: V26.inkMuted,
    textAlign: 'center',
  },
});
