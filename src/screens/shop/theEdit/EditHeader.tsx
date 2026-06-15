/**
 * EditHeader — the masthead. Sticky scrim over Porcelain, left-aligned. An
 * eyebrow grounded in the top finding ("FOR YOUR REDNESS", falling back to "FOR
 * YOUR SKIN"); an Instrument Serif title that references the finding, its
 * negative tracking tightening as it shrinks (34→22 over [0,80]); a single tint
 * underline in the finding's color — the only header accent, the finding anchor;
 * and the 44px companion orb, which drifts/scales a hair on scroll so it reads
 * as tending the curation. No "Shop"/"Store". Worklet-only motion; still under
 * reduce-motion. TheEditScreen owns the header height (topInset + 96), so this
 * component no longer measures itself.
 */

import React from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { AuroraOrb, type AuroraOrbHandle } from '@/components/AuroraOrb';
import { edit, space, type } from './tokens';

const AText = Animated.createAnimatedComponent(Text);

export function EditHeader({
  title,
  eyebrow,
  tintHex,
  scrollY,
  orbRef,
  reduceMotion,
  topInset,
  contentLeft,
}: {
  title: string;
  /** Pre-built finding eyebrow, e.g. "FOR YOUR REDNESS". Defaults to skin. */
  eyebrow?: string;
  /** The top concern's tint — the lone warm accent, used for the underline. */
  tintHex: string;
  scrollY: SharedValue<number>;
  orbRef: React.Ref<AuroraOrbHandle>;
  reduceMotion: boolean;
  topInset: number;
  contentLeft: number;
}) {
  // Title width drives the underline so the anchor never overruns short titles.
  const titleW = useSharedValue(0);
  const onTitleLayout = (e: LayoutChangeEvent) => {
    titleW.value = e.nativeEvent.layout.width;
  };

  // One shrink cadence: the serif tightens its tracking as it contracts.
  const titleStyle = useAnimatedStyle(() => {
    const fs = interpolate(scrollY.value, [0, 80], [34, 22], 'clamp');
    return {
      fontSize: fs,
      lineHeight: fs * 1.05,
      letterSpacing: interpolate(scrollY.value, [0, 80], [-0.68, -0.44], 'clamp'),
    };
  });

  // The finding underline — width clamps to ~min(160, title width).
  const underlineStyle = useAnimatedStyle(() => ({
    width: Math.min(160, titleW.value || 160),
  }));

  // The companion drifts up a hair and breathes a touch larger as you scroll —
  // alive, tending, but restrained (one drift). Identity when reduce-motion.
  const orbStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [] };
    return {
      transform: [
        { translateY: interpolate(scrollY.value, [0, 240], [0, -3], 'clamp') },
        { scale: interpolate(scrollY.value, [0, 240], [1, 1.02], 'clamp') },
      ],
    };
  });

  return (
    <View
      style={[
        styles.root,
        { paddingTop: topInset + 8, paddingHorizontal: contentLeft },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={type.eyebrow}>{eyebrow ?? 'FOR YOUR SKIN'}</Text>
          <AText
            style={[type.title, styles.title, titleStyle]}
            numberOfLines={2}
            onLayout={onTitleLayout}
          >
            {title}
          </AText>
          <Animated.View
            style={[styles.underline, { backgroundColor: tintHex }, underlineStyle]}
          />
        </View>
        <Animated.View style={[styles.orbBox, orbStyle]}>
          <AuroraOrb ref={orbRef} size={44} state="idle" reduceMotion={reduceMotion} />
        </Animated.View>
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
    // The sticky surface: a cool porcelain scrim so the title rides over cards
    // without ever colliding with a card edge.
    backgroundColor: 'rgba(252,253,255,0.88)',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  textCol: { flex: 1, paddingRight: space.m },
  title: { marginTop: 6 },
  underline: { height: 3, borderRadius: 2, marginTop: space.s },
  orbBox: { width: 44, height: 44, marginTop: 6 },
});
