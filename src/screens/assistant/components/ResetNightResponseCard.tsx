import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SectionEyebrow } from './SectionEyebrow';
import { AssistantGroundingRow } from './AssistantGroundingRow';
import { PrimaryDecisionButton } from './PrimaryDecisionButton';
import { dx, dRadius, dShadow } from '../decisionTokens';
import { RESET_RESPONSE, INTENT_GROUNDING } from '../decisionCopy';
import { hapt } from '@/utils/haptics';

interface Props {
  onPrimary: () => void;
  onDismiss?: () => void;
}

/**
 * Reset Night response card. Used when the user reports burning or
 * stinging from the evidence sheet. The visual treatment is calm
 * but unmissable — clay hold surface, stronger ink hierarchy, with
 * a contextual escalation line. No alarming reds.
 */
export function ResetNightResponseCard({ onPrimary, onDismiss }: Props) {
  return (
    <View style={[styles.card, dShadow.card]}>
      <AssistantGroundingRow label={INTENT_GROUNDING.safety} />
      <Text style={styles.state} maxFontSizeMultiplier={1.15}>
        {RESET_RESPONSE.title}
      </Text>
      <Text style={styles.decision} maxFontSizeMultiplier={1.2}>
        {RESET_RESPONSE.decision}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.3}>
        {RESET_RESPONSE.body}
      </Text>

      <View style={styles.section}>
        <SectionEyebrow label={RESET_RESPONSE.sectionDoNow} />
        <View style={styles.stepList}>
          {RESET_RESPONSE.steps.map((s, i) => (
            <View key={s} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText} maxFontSizeMultiplier={1.3}>
                {s}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.escalation}>
        <Text style={styles.escalationText} maxFontSizeMultiplier={1.3}>
          {RESET_RESPONSE.escalation}
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryDecisionButton
          label={RESET_RESPONSE.primary}
          onPress={onPrimary}
        />
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={() => {
              hapt.select();
              onDismiss();
            }}
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.9 }]}
            hitSlop={6}
          >
            <Text style={styles.secondaryText} maxFontSizeMultiplier={1.15}>
              Not now
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: dx.clayHold,
    borderRadius: dRadius.conversationCard,
    borderWidth: 1,
    borderColor: dx.terracottaTint,
    padding: 18,
    gap: 12,
  },
  state: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: dx.terracottaText,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  decision: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    lineHeight: 26,
    color: dx.ink,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: dx.inkSecondary,
  },
  section: { gap: 8 },
  stepList: { gap: 10 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: dx.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: dx.terracotta,
  },
  stepText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: dx.ink,
  },
  escalation: {
    backgroundColor: dx.surfacePrimary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: dx.terracottaTint,
  },
  escalationText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13.5,
    lineHeight: 19,
    color: dx.ink,
  },
  actions: {
    gap: 4,
    marginTop: 4,
  },
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
});
