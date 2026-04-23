import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { CaretDown } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

// Android requires manually enabling LayoutAnimation.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type AccordionId =
  | 'description'
  | 'why'
  | 'ingredients'
  | 'howToUse'
  | 'alternatives'
  | 'details';

export interface AccordionProps {
  id: AccordionId;
  title: string;
  defaultOpen?: boolean;
  /** Hide the whole section when children is null/undefined. */
  children?: React.ReactNode;
}

/**
 * Expand/collapse section wrapper (§3.8). The chevron rotates 180° via
 * Reanimated while the content height animates through LayoutAnimation so
 * `'auto'` heights are honoured without manual measurement.
 *
 * When `children` is nullish the whole accordion self-hides (per §3.8
 * IMPORTANT note) — no empty section stubs.
 */
export function Accordion({
  id,
  title,
  defaultOpen = false,
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const chevron = useSharedValue(defaultOpen ? 1 : 0);

  // v10.10 — chevron rotates via spring so the toggle feels tactile,
  // not timed. Matches the press-spring language used by every other
  // premium control in the app.
  React.useEffect(() => {
    chevron.value = withSpring(open ? 1 : 0, {
      damping: 18,
      stiffness: 220,
      mass: 1,
    });
  }, [open, chevron]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  if (!children) return null;

  const toggle = () => {
    hapt.select();
    LayoutAnimation.configureNext({
      duration: 250,
      update: { type: 'easeInEaseOut' },
    });
    setOpen((v) => !v);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${open ? 'expanded' : 'collapsed'}`}
        style={styles.header}
      >
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          {title}
        </Text>
        <Animated.View style={chevronStyle}>
          <CaretDown
            size={18}
            color={palette.inkTertiary}
            weight="duotone"
          />
        </Animated.View>
      </Pressable>
      <View style={styles.divider} />
      {open ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

// v10.12 — accordion compressed. Same v10.10 language (SemiBold serif
// title, spring chevron rotation) with tighter vertical cost:
//   • header 56 → 50pt (still above iOS's 44pt tap minimum)
//   • title 22pt / line 28 → 20pt / line 24 (still reads as a section
//     header, not caption)
//   • marginTop 28 → 20 (section rhythm tighter)
//   • content paddingTop 14 → 10, paddingBottom 22 → 14
// Savings compound across four sections (~40pt).
const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  divider: {
    height: 1,
    backgroundColor: palette.hairline,
  },
  content: {
    paddingTop: 10,
    paddingBottom: 14,
  },
});
