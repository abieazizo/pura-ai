import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'phosphor-react-native';
import { Body, Eyebrow, SectionHeading } from './primitives';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';

interface WhyProductSheetProps {
  visible: boolean;
  onClose: () => void;
  onChange?: () => void;
  productName: string;
}

export function WhyProductSheet({
  visible,
  onClose,
  onChange,
  productName,
}: WhyProductSheetProps) {
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
              <Eyebrow>{productName.toUpperCase()}</Eyebrow>
              <SectionHeading style={s.title}>
                Why this works tonight
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

          <Body style={s.body}>
            Your chin shows mild activity. This moisturizer supports your
            skin barrier without adding strong treatment tonight.
          </Body>

          <View style={s.checks}>
            <CheckRow text="No exfoliating acids detected" />
            <CheckRow text="No retinoid detected" />
          </View>

          <View style={s.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [s.ghost, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.ghostLabel}>Close</Text>
            </Pressable>
            {onChange ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change product"
                onPress={() => {
                  onChange();
                  onClose();
                }}
                style={({ pressed }) => [
                  s.primary,
                  pressed && { backgroundColor: V26.ctaDarkPressed },
                ]}
              >
                <Text style={s.primaryLabel}>Change product</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CheckRow({ text }: { text: string }) {
  return (
    <View style={s.checkRow}>
      <View style={s.checkRing}>
        <Check size={12} color={V26.positive} weight="bold" />
      </View>
      <Text style={s.checkText} maxFontSizeMultiplier={1.2}>
        {text}
      </Text>
    </View>
  );
}

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
    paddingBottom: 36,
    paddingTop: 14,
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
    marginBottom: 14,
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
  body: { marginBottom: 14 },
  checks: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: V26_RADIUS.inset,
    backgroundColor: V26.positiveWash,
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontFamily: V26_TYPE.sansMed,
    fontSize: 14,
    color: V26.positive,
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  ghost: {
    flex: 1,
    height: V26_SPACE.buttonHeight,
    borderRadius: V26_SPACE.buttonRadius,
    borderWidth: 1,
    borderColor: V26.borderStrong,
    backgroundColor: V26.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 16,
    color: V26.ink,
  },
  primary: {
    flex: 1,
    height: V26_SPACE.buttonHeight,
    borderRadius: V26_SPACE.buttonRadius,
    backgroundColor: V26.ctaDarkFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 16,
    color: V26.ctaDarkText,
  },
});
