import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SectionEyebrow } from './SectionEyebrow';
import { AssistantGroundingRow } from './AssistantGroundingRow';
import { PrimaryDecisionButton } from './PrimaryDecisionButton';
import { dx, dRadius, dShadow } from '../decisionTokens';
import { SUBSTITUTE } from '../decisionCopy';
import { hapt } from '@/utils/haptics';

interface Row {
  productName: string;
  status: string;
}

interface Props {
  pick: Row;
  alsoSafe?: Row[];
  onPrimary: () => void;
  onSecondary: () => void;
  followUps?: readonly string[];
  onFollowUp?: (prompt: string) => void;
}

/**
 * Substitute card. "Which moisturizer is safest tonight?" → the
 * safest owned product first, with optional alternates, and an
 * "Apply this tonight" CTA.
 */
export function SubstituteResponseCard({
  pick,
  alsoSafe,
  onPrimary,
  onSecondary,
  followUps,
  onFollowUp,
}: Props) {
  return (
    <View style={[styles.card, dShadow.card]}>
      <AssistantGroundingRow label={SUBSTITUTE.groundedBadge} />
      <Text style={styles.heading} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
        {SUBSTITUTE.heading}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.3}>
        {SUBSTITUTE.body}
      </Text>

      <View style={styles.section}>
        <SectionEyebrow label={SUBSTITUTE.pickLabel} />
        <Text style={styles.itemName} maxFontSizeMultiplier={1.25}>
          {pick.productName}
        </Text>
        <Text style={styles.itemStatus} maxFontSizeMultiplier={1.25}>
          {pick.status}
        </Text>
      </View>

      {alsoSafe && alsoSafe.length > 0 ? (
        <View style={styles.section}>
          <SectionEyebrow label={SUBSTITUTE.alsoLabel} />
          {alsoSafe.map((a) => (
            <View key={`${a.productName}`} style={styles.altRow}>
              <Text style={styles.itemName} maxFontSizeMultiplier={1.25}>
                {a.productName}
              </Text>
              <Text style={styles.itemStatus} maxFontSizeMultiplier={1.25}>
                {a.status}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryDecisionButton label={SUBSTITUTE.primary} onPress={onPrimary} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={SUBSTITUTE.secondary}
          onPress={() => {
            hapt.select();
            onSecondary();
          }}
          style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.secondaryText} maxFontSizeMultiplier={1.15}>
            {SUBSTITUTE.secondary}
          </Text>
        </Pressable>
      </View>

      {followUps && followUps.length > 0 ? (
        <View style={styles.followUps}>
          {followUps.map((f) => (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityLabel={f}
              onPress={() => {
                hapt.select();
                onFollowUp?.(f);
              }}
              style={({ pressed }) => [
                styles.followChip,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.followText} maxFontSizeMultiplier={1.15}>
                {f}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: dx.surfacePrimary,
    borderRadius: dRadius.conversationCard,
    borderWidth: 1,
    borderColor: dx.line,
    padding: 18,
    gap: 12,
  },
  heading: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 19,
    lineHeight: 25,
    color: dx.ink,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: dx.inkSecondary,
  },
  section: { gap: 4 },
  itemName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    lineHeight: 19,
    color: dx.ink,
    marginTop: 4,
  },
  itemStatus: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: dx.inkSecondary,
  },
  altRow: { paddingTop: 6 },
  actions: { gap: 4, marginTop: 4 },
  secondary: {
    height: 40,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  secondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: dx.terracottaText,
    textDecorationLine: 'underline',
  },
  followUps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  followChip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: dRadius.pill,
    borderWidth: 1,
    borderColor: dx.line,
    backgroundColor: dx.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    color: dx.ink,
  },
});
