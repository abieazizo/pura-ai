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

// v10.10 — accordion visuals upgraded:
//   • Title is now InstrumentSerif-SemiBold 22pt (was Regular 20pt) so
//     each section reads with real weight, not a body-caption register.
//   • Tap target grows 48 → 56pt — premium controls sit above iOS's
//     44pt minimum with real breathing room.
//   • Chevron stays right-aligned; its spring rotation comes from the
//     hook above.
//   • Content padding slightly tighter on top to pair with the
//     wider header.
const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  divider: {
    height: 1,
    backgroundColor: palette.hairline,
  },
  content: {
    paddingTop: 14,
    paddingBottom: 22,
  },
});
