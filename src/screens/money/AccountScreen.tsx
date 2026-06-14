/**
 * AccountScreen — money flow step 6. Reached at/after Confirm. Account creation
 * to save the routine — and, deliberately, NO notification ask (that opt-in is
 * deferred to after the first completed ritual step; see notifications.ts). The
 * orb is calm and quietly proud; the routine already feels theirs.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AssistantAuroraOrb } from '@/screens/assistant/AssistantAuroraOrb';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { NOTIF_DEFERRAL_NOTE } from './notifications';
import { money, cardShadow, SERIF } from './theme';

export interface AccountScreenProps {
  /** True if the buy handoff opened the retailer; false on the product-free path. */
  bought: boolean;
  openedCount?: number;
  onCreateAccount: () => void;
  onMaybeLater: () => void;
}

export function AccountScreen({ bought, openedCount = 0, onCreateAccount, onMaybeLater }: AccountScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const enter = (i: number) =>
    reduceMotion ? undefined : FadeInDown.delay(100 * i).springify().damping(18).stiffness(140);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: insets.bottom + 28, flexGrow: 1 }}>
        <Animated.View entering={enter(0)} style={styles.orbRow}>
          <AssistantAuroraOrb state="responding" size={72} scanTone="balanced" />
        </Animated.View>
        <Animated.Text entering={enter(1)} style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          You’re all set.
        </Animated.Text>
        <Animated.Text entering={enter(2)} style={styles.sub} maxFontSizeMultiplier={1.6}>
          {bought
            ? `Your routine’s saved${openedCount > 0 ? ` and your ${openedCount === 1 ? 'product is' : `${openedCount} products are`} opening at the shop` : ''}. Start with one step tonight.`
            : 'Your routine’s saved — start with one step tonight, with what you have.'}
        </Animated.Text>

        <Animated.View entering={enter(3)} style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>Save your routine</Text>
          <Text style={styles.cardBody} maxFontSizeMultiplier={1.6}>
            Make a free account so it’s here when you come back — and so we can track how your skin changes.
          </Text>
          <Pressable onPress={onCreateAccount} accessibilityRole="button" accessibilityLabel="Create a free account"
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.9 : 1 }]}>
            <Text style={styles.ctaText} maxFontSizeMultiplier={1.3}>Create a free account</Text>
          </Pressable>
          <Pressable onPress={onMaybeLater} accessibilityRole="button" accessibilityLabel="Maybe later"
            style={styles.later}>
            <Text style={styles.laterText} maxFontSizeMultiplier={1.4}>Maybe later</Text>
          </Pressable>
        </Animated.View>

        <View style={{ flex: 1 }} />
        {/* No notification ask here — by design. */}
        <Animated.Text entering={enter(4)} style={styles.notif} maxFontSizeMultiplier={1.6}>
          {NOTIF_DEFERRAL_NOTE}
        </Animated.Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: money.bg },
  orbRow: { alignItems: 'flex-start', marginBottom: 18 },
  h1: { fontFamily: SERIF, fontSize: 46, lineHeight: 50, color: money.ink, letterSpacing: -0.7 },
  sub: { fontFamily: 'Inter-Regular', fontSize: 16, lineHeight: 23, color: money.muted, marginTop: 12, maxWidth: 320 },
  card: { backgroundColor: money.surface, borderRadius: 24, padding: 22, marginTop: 32, borderWidth: 1, borderColor: money.hairline },
  cardTitle: { fontFamily: SERIF, fontSize: 24, color: money.ink },
  cardBody: { fontFamily: 'Inter-Regular', fontSize: 14.5, lineHeight: 21, color: money.muted, marginTop: 8 },
  cta: { minHeight: 52, borderRadius: 999, backgroundColor: money.blue, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#FFFFFF' },
  later: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  laterText: { fontFamily: 'Inter-Medium', fontSize: 15, color: money.muted },
  notif: { fontFamily: 'Inter-Regular', fontSize: 12.5, lineHeight: 18, color: money.faint, textAlign: 'center', marginTop: 24 },
});
