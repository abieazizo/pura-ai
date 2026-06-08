/**
 * CommitSection — Section E. The close. It lands on HOPE, not pressure: the
 * horizon returns as a refrain, then the ONE warm primary button — the only
 * loud filled control on either results screen. The button PREVIEWS the next
 * step so commitment is informed, and a quiet "I'll do this later" preserves
 * agency. If the read was unsure, a calm "Rescan in better light" is offered.
 *
 * No urgency, no countdown, no FOMO, no second loud CTA, no product. The plan's
 * 2–3 moves become the AM/PM routine on the next screen (carried language).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COPY2, TYPE, TYPE2, type ThemeTokens } from './yourSkinMotion';
import { hapt } from '@/utils/haptics';

export interface CommitSectionProps {
  horizonLine?: string;
  tokens: ThemeTokens;
  lowConfidence: boolean;
  onBuild: () => void;
  onDoLater: () => void;
  onRescan: () => void;
}

export function CommitSection({ horizonLine, tokens, lowConfidence, onBuild, onDoLater, onRescan }: CommitSectionProps) {
  return (
    <View>
      {!!horizonLine && (
        <Text
          style={[TYPE2.horizon, { color: tokens.line, textAlign: 'center', marginBottom: 18 }]}
          minimumFontScale={0.85}
          adjustsFontSizeToFit
          numberOfLines={4}
          maxFontSizeMultiplier={1.6}
        >
          {horizonLine}
        </Text>
      )}

      <Pressable
        onPress={() => { hapt.tap(); onBuild(); }}
        accessibilityRole="button"
        accessibilityLabel={`${COPY2.build}. ${COPY2.buildPreview}`}
        style={({ pressed }) => [styles.cta, { backgroundColor: tokens.accent, opacity: pressed ? 0.92 : 1 }]}
      >
        <Text style={[TYPE.cta, { color: '#FFFFFF' }]} maxFontSizeMultiplier={1.4}>{COPY2.build}</Text>
      </Pressable>

      <Text style={[TYPE2.quiet, { color: tokens.label, textAlign: 'center', marginTop: 10 }]} maxFontSizeMultiplier={1.6}>
        {COPY2.buildPreview}
      </Text>

      <View style={styles.escapes}>
        <Pressable onPress={onDoLater} accessibilityRole="button" hitSlop={8} style={styles.escape}>
          <Text style={[TYPE2.quiet, { color: tokens.faint }]} maxFontSizeMultiplier={1.6}>{COPY2.doLater}</Text>
        </Pressable>
        {lowConfidence && (
          <Pressable onPress={onRescan} accessibilityRole="button" hitSlop={8} style={styles.escape}>
            <Text style={[TYPE2.quiet, { color: tokens.accent }]} maxFontSizeMultiplier={1.6}>{COPY2.rescan}</Text>
          </Pressable>
        )}
      </View>

      <Text style={[TYPE2.quiet, { color: tokens.faint, fontSize: 12, textAlign: 'center', marginTop: 18 }]} maxFontSizeMultiplier={1.5}>
        {COPY2.privacy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cta: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  escapes: { marginTop: 16, alignItems: 'center', gap: 12 },
  escape: { paddingVertical: 6, paddingHorizontal: 10 },
});
