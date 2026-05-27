import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SectionEyebrow } from './SectionEyebrow';
import { AssistantGroundingRow } from './AssistantGroundingRow';
import { PrimaryDecisionButton } from './PrimaryDecisionButton';
import { dx, dRadius, dShadow } from '../decisionTokens';
import { hapt } from '@/utils/haptics';

interface Row {
  productName: string;
  status: string;
}

interface Props {
  groundedLabel: string;
  heading: string;
  body: string;
  heldLabel: string;
  heldRow: Row;
  useInsteadLabel: string;
  useInsteadRow: Row;
  whenLabel: string;
  whenBody: string;
  primary: string;
  secondary: string;
  onPrimary: () => void;
  onSecondary: () => void;
  followUps?: readonly string[];
  onFollowUp?: (prompt: string) => void;
}

/**
 * Compact decisive response card used for direct safety challenges
 * such as "Can I exfoliate tonight?". Visually distinct from the
 * Decision Card — sans-serif headline, focused product rows, no
 * shopping CTA — so the user never confuses the two.
 */
export function ChallengeResponseCard({
  groundedLabel,
  heading,
  body,
  heldLabel,
  heldRow,
  useInsteadLabel,
  useInsteadRow,
  whenLabel,
  whenBody,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  followUps,
  onFollowUp,
}: Props) {
  return (
    <View style={[styles.card, dShadow.card]}>
      <AssistantGroundingRow label={groundedLabel} />

      <Text style={styles.heading} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
        {heading}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.3}>
        {body}
      </Text>

      <View style={styles.section}>
        <SectionEyebrow label={heldLabel} />
        <Text style={styles.itemName} maxFontSizeMultiplier={1.25}>
          {heldRow.productName}
        </Text>
        <Text style={styles.itemStatus} maxFontSizeMultiplier={1.25}>
          {heldRow.status}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionEyebrow label={useInsteadLabel} />
        <Text style={styles.itemName} maxFontSizeMultiplier={1.25}>
          {useInsteadRow.productName}
        </Text>
        <Text style={styles.itemStatus} maxFontSizeMultiplier={1.25}>
          {useInsteadRow.status}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionEyebrow label={whenLabel} />
        <Text style={styles.whenBody} maxFontSizeMultiplier={1.3}>
          {whenBody}
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryDecisionButton label={primary} onPress={onPrimary} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={secondary}
          onPress={() => {
            hapt.select();
            onSecondary();
          }}
          style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.88 }]}
          hitSlop={6}
        >
          <Text style={styles.secondaryText} maxFontSizeMultiplier={1.15}>
            {secondary}
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
              hitSlop={4}
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: dx.line,
    padding: 16,
    gap: 10,
  },
  heading: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: dx.ink,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: dx.inkSecondary,
  },
  section: {
    paddingTop: 4,
    gap: 2,
  },
  itemName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
    color: dx.ink,
    marginTop: 3,
  },
  itemStatus: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: dx.inkSecondary,
  },
  whenBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: dx.inkSecondary,
    marginTop: 3,
  },
  actions: {
    marginTop: 2,
    gap: 2,
  },
  secondary: {
    height: 34,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  secondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: dx.terracottaText,
    textDecorationLine: 'underline',
  },
  followUps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  followChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: dRadius.pill,
    borderWidth: 1,
    borderColor: dx.line,
    backgroundColor: dx.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    color: dx.ink,
  },
});
