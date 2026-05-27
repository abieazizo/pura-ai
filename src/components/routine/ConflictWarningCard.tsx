/**
 * ConflictWarningCard — evening-only protective warning.
 *
 * Surfaces when the routine plan says certain actives should be skipped
 * tonight (e.g. low hydration → no acid stacking). Calm, not alarming.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

interface Props {
  message: string;
  /** Optional CTA (e.g. opens AI Assist with an "Ask why" prompt). */
  onAsk?: () => void;
}

export function ConflictWarningCard({ message, onAsk }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <ShieldCheck size={18} color={palette.amberDeep} weight="duotone" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          Pura recommends keeping actives gentle
        </Text>
        <Text
          style={styles.body}
          maxFontSizeMultiplier={1.2}
          numberOfLines={3}
        >
          {message}
        </Text>
        {onAsk ? (
          <Pressable
            onPress={() => {
              hapt.select();
              onAsk();
            }}
            accessibilityRole="button"
            accessibilityLabel="Ask why"
            style={({ pressed }) => [
              styles.askBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.askBtnText} maxFontSizeMultiplier={1.15}>
              Ask why
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: palette.amberLight,
    borderWidth: 1,
    borderColor: palette.amber,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.amberDeep,
    marginBottom: 4,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.amberDeep,
  },
  askBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.amber,
  },
  askBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: palette.amberDeep,
  },
});
