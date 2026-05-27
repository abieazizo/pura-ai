import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ClockCounterClockwise } from 'phosphor-react-native';
import { dx, dRadius } from '../decisionTokens';
import { HEADER } from '../decisionCopy';
import { hapt } from '@/utils/haptics';

interface Props {
  /**
   * `back` shows an arrow that returns to the Decision Mode card.
   * `history` shows the clock icon for a future history surface.
   * undefined hides the button entirely (Decision Mode at rest).
   */
  utility?: 'back' | 'history';
  onUtilityPress?: () => void;
  /** Optional override for the descriptor. */
  descriptor?: string;
  /** Title override — usually left as "AI Assist" but conversation mode
   *  uses the same title to anchor the brand. */
  title?: string;
}

/**
 * Decision Room header. The right-side utility button switches
 * affordance based on mode: a back arrow inside Conversation Mode
 * so the user can quickly return to tonight's decision, or a quiet
 * history clock icon for surfaces that want it.
 */
export function AssistantHeader({
  utility,
  onUtilityPress,
  descriptor,
  title,
}: Props) {
  const Icon = utility === 'back' ? ArrowLeft : ClockCounterClockwise;
  const a11y =
    utility === 'back' ? 'Back to tonight’s decision' : HEADER.historyA11y;

  return (
    <View style={styles.root}>
      <View style={styles.copy}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.15}
        >
          {title ?? HEADER.title}
        </Text>
        <Text style={styles.descriptor} maxFontSizeMultiplier={1.25}>
          {descriptor ?? HEADER.descriptor}
        </Text>
      </View>
      {utility && onUtilityPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11y}
          onPress={() => {
            hapt.select();
            onUtilityPress();
          }}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.88 }]}
          hitSlop={6}
        >
          <Icon size={16} color={dx.ink} weight="regular" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 10,
    gap: 14,
  },
  copy: { flex: 1, gap: 2 },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: dx.ink,
  },
  descriptor: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: dx.inkSecondary,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: dRadius.utilityButton,
    borderWidth: 1,
    borderColor: dx.line,
    backgroundColor: dx.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
