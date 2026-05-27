import React from 'react';
import { Modal, Pressable, StyleSheet, View, Text } from 'react-native';
import { X } from 'phosphor-react-native';
import { Body, Eyebrow, SectionHeading } from './primitives';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';

interface WhyThisPlanSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function WhyThisPlanSheet({ visible, onClose }: WhyThisPlanSheetProps) {
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
              <SectionHeading style={s.title}>Why this plan?</SectionHeading>
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

          <Body style={s.para}>
            Your scan found mild activity around your chin.
          </Body>
          <Body style={s.para}>
            Tonight, keeping treatment gentle helps avoid unnecessary irritation.
          </Body>
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
    marginBottom: 18,
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    lineHeight: 26,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: V26.paper,
    borderWidth: 1,
    borderColor: V26.border,
  },
  para: {
    marginBottom: 12,
  },
});

void V26_TYPE;
