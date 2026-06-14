/**
 * EmptyState — NOT-SCANNED. No products. A centered calm orb, one Instrument
 * Serif 44 line, and a Scan CTA. The shop waits for the skin before it sets
 * anything out.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuroraOrb } from '@/components/AuroraOrb';
import { hapt } from '@/utils/haptics';
import { edit, radius, space, type } from './tokens';

export function EmptyState({
  onScan,
  reduceMotion,
  topInset,
}: {
  onScan: () => void;
  reduceMotion: boolean;
  topInset: number;
}) {
  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={styles.orb}>
        <AuroraOrb size={132} state="idle" reduceMotion={reduceMotion} />
      </View>
      <Text style={[type.empty, styles.line]}>
        Scan your skin and I'll set out what fits.
      </Text>
      <Pressable
        onPress={() => {
          hapt.select();
          onScan();
        }}
        accessibilityRole="button"
        accessibilityLabel="Scan your skin"
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.ctaText}>Scan my skin</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  orb: { width: 132, height: 132, marginBottom: space.section },
  line: { textAlign: 'center', maxWidth: 360 },
  cta: {
    marginTop: space.section,
    backgroundColor: edit.blue,
    borderRadius: radius.pill,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  ctaText: { color: edit.white, fontFamily: 'Inter-SemiBold', fontSize: 15 },
});
