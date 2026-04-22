import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface RoutineNextCardProps {
  stepIndex: number; // 1-based
  totalSteps: number;
  brand: string;
  productName: string;
  instruction: string;
  /** Scheduled time, formatted (e.g. "7:22"). */
  scheduledTime: string;
  completed?: boolean;
  onMarkDone: () => void;
}

/**
 * Routine Next card (§4.6). No image. Serif product name that shrinks rather
 * than wraps mid-word. "Mark done →" is a typographic link, not a filled
 * button. On tap: success haptic, the row settles to 40% ink, the time gets
 * a terracotta strike-through.
 */
export function RoutineNextCard({
  stepIndex,
  totalSteps,
  brand,
  productName,
  instruction,
  scheduledTime,
  completed = false,
  onMarkDone,
}: RoutineNextCardProps) {
  // Opacity settles to 0.4 when completed. Strike-through grows left→right
  // across the time.
  const doneProgress = useSharedValue(completed ? 1 : 0);

  React.useEffect(() => {
    doneProgress.value = withTiming(completed ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [completed, doneProgress]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: 1 - 0.6 * doneProgress.value,
  }));

  const strikeStyle = useAnimatedStyle(() => ({
    width: `${doneProgress.value * 100}%`,
  }));

  const handleMarkDone = () => {
    if (completed) return;
    hapt.stepComplete();
    onMarkDone();
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
        {`THIS MORNING \u00B7 STEP ${stepIndex} OF ${totalSteps}`}
      </Text>

      <Animated.View style={[styles.card, rowStyle]}>
        <Text style={styles.microKicker}>
          {`STEP ${stepIndex} \u00B7 NEXT`}
        </Text>
        <Text style={styles.brand}>{brand.toUpperCase()}</Text>

        {/* §4.6 — never break mid-word. `adjustsFontSizeToFit` shrinks to
            the minimum scale; `textBreakStrategy="simple"` keeps Android
            wrapping at spaces only; `numberOfLines` caps the box. */}
        <Text
          style={styles.productName}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          textBreakStrategy="simple"
          maxFontSizeMultiplier={1.15}
        >
          {productName}
        </Text>

        <Text style={styles.instruction} maxFontSizeMultiplier={1.2}>
          {instruction}
        </Text>

        <View style={styles.bottomRow}>
          <View style={styles.timeWrap}>
            <Text style={styles.time} maxFontSizeMultiplier={1.1}>
              {scheduledTime}
            </Text>
            <Animated.View style={[styles.strike, strikeStyle]} pointerEvents="none" />
          </View>

          <Pressable
            onPress={handleMarkDone}
            accessibilityRole="button"
            accessibilityLabel={completed ? 'Done' : 'Mark step done'}
            accessibilityState={{ checked: completed }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.doneLink,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.doneText} maxFontSizeMultiplier={1.2}>
              {completed ? 'Done' : 'Mark done'}
            </Text>
            <ArrowRight size={14} color={palette.clay} weight="bold" />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  sectionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
    marginBottom: 12,
  },
  card: {
    backgroundColor: palette.bg,
    borderRadius: 24,
    padding: 20,
    // Slightly lighter than the hero — spec §4.6 allows this.
    shadowColor: palette.clay,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  microKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.32,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
    marginTop: 4,
  },
  productName: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginTop: 4,
  },
  instruction: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 14 * 1.45,
    color: 'rgba(26,22,20,0.7)',
    marginTop: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    minHeight: 44,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(26,22,20,0.6)',
    fontVariant: ['tabular-nums'],
  },
  strike: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 9,
    height: 1.5,
    backgroundColor: palette.clay,
  },
  doneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  doneText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: palette.clay,
  },
});
