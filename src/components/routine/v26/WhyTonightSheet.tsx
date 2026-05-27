import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'phosphor-react-native';
import { Body, Eyebrow, SectionHeading } from './primitives';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';

interface Row {
  label: string;
  body: string;
}

interface WhyTonightSheetProps {
  visible: boolean;
  onClose: () => void;
  rows?: Row[];
}

const DEFAULT_ROWS: Row[] = [
  { label: 'Today’s scan', body: 'Mild activity around your chin' },
  { label: 'Tonight’s adjustment', body: 'No strong treatment on that area' },
  {
    label: 'Product checked',
    body: 'CeraVe Moisturizing Cream is suitable tonight',
  },
];

export function WhyTonightSheet({
  visible,
  onClose,
  rows = DEFAULT_ROWS,
}: WhyTonightSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.root}>
        <Pressable
          accessibilityLabel="Dismiss"
          onPress={onClose}
          style={s.backdrop}
        />
        <View style={s.card}>
          <View style={s.handleWrap}>
            <View style={s.handle} />
          </View>
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Eyebrow>WHY TONIGHT</Eyebrow>
              <SectionHeading style={s.title}>
                Why tonight is gentle
              </SectionHeading>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={10}
              style={s.close}
            >
              <X size={18} color={V26.ink} />
            </Pressable>
          </View>

          <View style={s.rows}>
            {rows.map((row, idx) => (
              <View
                key={`${row.label}-${idx}`}
                style={[s.row, idx === rows.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={s.rowLabel} maxFontSizeMultiplier={1.15}>
                  {row.label}
                </Text>
                <Body style={s.rowBody}>{row.body}</Body>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
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
  handleWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: V26.paper,
    borderWidth: 1,
    borderColor: V26.border,
  },
  rows: {
    paddingTop: 4,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V26.border,
  },
  rowLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11.5,
    color: V26.terracottaText,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  rowBody: {
    marginTop: 6,
    color: V26.ink,
    fontSize: 15,
    lineHeight: 20,
  },
});
