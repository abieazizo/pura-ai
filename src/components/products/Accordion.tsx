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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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
  | 'ingredients'
  | 'howToUse'
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

  React.useEffect(() => {
    chevron.value = withTiming(open ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
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
            color="rgba(26,22,20,0.6)"
            weight="duotone"
          />
        </Animated.View>
      </Pressable>
      <View style={styles.divider} />
      {open ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 20,
    lineHeight: 24,
    color: palette.ink,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(26,22,20,0.1)',
  },
  content: {
    paddingTop: 16,
    paddingBottom: 20,
  },
});
