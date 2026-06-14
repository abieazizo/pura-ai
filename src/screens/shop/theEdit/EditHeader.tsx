/**
 * EditHeader — sticky, transparent over Porcelain, left-aligned. Eyebrow "FOR
 * YOUR SKIN"; an Instrument Serif title that references the user's top finding;
 * the small companion orb (44px) right-aligned, calm + breathing. On scroll the
 * title shrinks 34→22; the orb stays. No "Shop"/"Store".
 */

import React from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { AuroraOrb, type AuroraOrbHandle } from '@/components/AuroraOrb';
import { edit, space, type } from './tokens';

const AText = Animated.createAnimatedComponent(Text);

export function EditHeader({
  title,
  scrollY,
  orbRef,
  reduceMotion,
  topInset,
  contentLeft,
  onHeight,
}: {
  title: string;
  scrollY: SharedValue<number>;
  orbRef: React.Ref<AuroraOrbHandle>;
  reduceMotion: boolean;
  topInset: number;
  contentLeft: number;
  onHeight?: (h: number) => void;
}) {
  const titleStyle = useAnimatedStyle(() => {
    const fs = interpolate(scrollY.value, [0, 80], [34, 22], 'clamp');
    return { fontSize: fs, lineHeight: fs * 1.05 };
  });

  const onLayout = (e: LayoutChangeEvent) => onHeight?.(e.nativeEvent.layout.height);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.root,
        { paddingTop: topInset + 12, paddingHorizontal: contentLeft },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={type.eyebrow}>FOR YOUR SKIN</Text>
          <AText style={[type.title, styles.title, titleStyle]} numberOfLines={2}>
            {title}
          </AText>
        </View>
        <View style={styles.orbBox}>
          <AuroraOrb ref={orbRef} size={44} state="idle" reduceMotion={reduceMotion} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingBottom: 10,
    // a whisper of porcelain so the title never collides with a card edge
    backgroundColor: 'rgba(252,253,255,0.78)',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  textCol: { flex: 1, paddingRight: space.m },
  title: { marginTop: 6 },
  orbBox: { width: 44, height: 44, marginTop: 6 },
});
