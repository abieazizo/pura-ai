/**
 * EmptyState — NOT-SCANNED. No products. A larger, present companion orb, a
 * two-part promise (the invitation, then the specific thing it'll do), and a
 * Scan CTA. The shop waits for the skin before it sets anything out — but the
 * orb leans in once on enter so the wait feels tended, not empty.
 */

import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AuroraOrb, type AuroraOrbHandle } from '@/components/AuroraOrb';
import { hapt } from '@/utils/haptics';
import { edit, radius, space, type } from './tokens';
import { usePressScale } from './pressFeedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function EmptyState({
  onScan,
  reduceMotion,
  topInset,
}: {
  onScan: () => void;
  reduceMotion: boolean;
  topInset: number;
}) {
  const press = usePressScale(0.96);

  // The companion leans in ONCE, ~one frame after mount — a single present
  // beat that says "I'm here, scan when you're ready." rAF (never setTimeout),
  // a no-op under reduce-motion (emphasisPulse self-gates, and we don't even
  // schedule it). Mirrors the curation set-down in TheEditScreen.
  const orbRef = useRef<AuroraOrbHandle>(null);
  useEffect(() => {
    if (reduceMotion) return;
    const raf = requestAnimationFrame(() => orbRef.current?.emphasisPulse?.());
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={styles.orb}>
        <AuroraOrb ref={orbRef} size={160} state="idle" reduceMotion={reduceMotion} />
      </View>
      <Text style={[type.empty, styles.line]}>Scan your skin</Text>
      <Text style={[type.sub, styles.sub]}>
        and I'll set out what fits — your products, in the order you need them.
      </Text>
      <AnimatedPressable
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          hapt.select();
          onScan();
        }}
        accessibilityRole="button"
        accessibilityLabel="Scan your skin"
        style={[styles.cta, press.style]}
      >
        <Text style={styles.ctaText}>Scan my skin</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  orb: { width: 160, height: 160, marginBottom: space.section },
  line: { textAlign: 'center', maxWidth: 360 },
  sub: { textAlign: 'center', maxWidth: 320, marginTop: space.m },
  cta: {
    marginTop: space.section,
    backgroundColor: edit.blue,
    borderRadius: radius.pill,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  ctaText: { color: edit.white, fontFamily: 'Inter-SemiBold', fontSize: 15 },
});
