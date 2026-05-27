import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import { plan } from './tokens';

/**
 * v25 — Plan tabs simplified to Today / Progress only. Shelf was a
 * duplicate destination of the global Products tab and is removed
 * from the active product. The `'shelf'` member of the union is kept
 * for back-compat with any persisted state.
 */
export type PlanTab = 'today' | 'progress' | 'shelf';

export interface PlanTabsProps {
  active: PlanTab;
  onChange: (next: PlanTab) => void;
}

const OPTIONS: ReadonlyArray<{ id: PlanTab; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'progress', label: 'Progress' },
];

/**
 * Underline tab row for the Plan destination.
 *
 * Three tabs, equal weight, single hairline divider below. Underline
 * fade-slides under the active label in 220ms. Inactive labels stay
 * legible (inkSecondary, not muted) so the row reads as navigation
 * rather than decoration.
 */
export function PlanTabs({ active, onChange }: PlanTabsProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((o) => {
        const selected = o.id === active;
        const handle = () => {
          if (selected) return;
          hapt.select();
          onChange(o.id);
        };
        return (
          <Pressable
            key={o.id}
            onPress={handle}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${o.label} tab`}
            hitSlop={6}
            style={({ pressed }) => [
              styles.seg,
              pressed && !selected && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? plan.ink : plan.inkSecondary },
              ]}
              maxFontSizeMultiplier={1.15}
            >
              {o.label}
            </Text>
            <Underline visible={selected} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Underline({ visible }: { visible: boolean }) {
  const w = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    w.value = withTiming(visible ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, w]);
  const style = useAnimatedStyle(() => ({
    opacity: w.value,
    transform: [{ scaleX: 0.5 + 0.5 * w.value }],
  }));
  return <Animated.View style={[styles.underline, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: plan.border,
  },
  seg: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  underline: {
    position: 'absolute',
    bottom: -StyleSheet.hairlineWidth,
    width: '50%',
    height: 2,
    backgroundColor: plan.brand,
    borderRadius: 1,
  },
});
