import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export interface ChoiceListProps {
  children: React.ReactNode;
  /** Delay before the first item starts animating in. Defaults to 300ms. */
  startDelayMs?: number;
  /** Stagger between items. Defaults to 60ms. */
  staggerMs?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Vertical stack of ChoiceRows (§2.4). 24pt horizontal margin, 32pt top
 * margin, 12pt gap. Children animate in with a 60ms stagger starting 300ms
 * after mount.
 */
export function ChoiceList({
  children,
  startDelayMs = 300,
  staggerMs = 60,
  style,
}: ChoiceListProps) {
  const items = React.Children.toArray(children);
  return (
    <View style={[styles.wrap, style]}>
      {items.map((child, i) => (
        <StaggerItem
          key={i}
          delay={startDelayMs + i * staggerMs}
          isLast={i === items.length - 1}
        >
          {child}
        </StaggerItem>
      ))}
    </View>
  );
}

function StaggerItem({
  children,
  delay,
  isLast,
}: {
  children: React.ReactNode;
  delay: number;
  isLast: boolean;
}) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
    y.value = withDelay(
      delay,
      withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, opacity, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View style={[{ marginBottom: isLast ? 0 : 12 }, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 24,
    marginTop: 32,
  },
});
