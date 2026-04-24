import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  House,
  ScanSmiley,
  Drop,
  CalendarCheck,
  Sparkle,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import {
  colors,
  motion,
  palette,
  space,
  spring,
  type as typography,
} from '@/theme';
import { hapt } from '@/utils/haptics';
import { tabs as tabsStrings } from '@/copy/strings';

type PhosphorIcon = React.FC<PhosphorIconProps>;

const TAB_META: Record<
  string,
  { label: string; Icon: PhosphorIcon }
> = {
  HomeTab:     { label: tabsStrings.home,     Icon: House as PhosphorIcon },
  ScanTab:     { label: tabsStrings.scan,     Icon: ScanSmiley as PhosphorIcon },
  ProductsTab: { label: tabsStrings.products, Icon: Drop as PhosphorIcon },
  // v10.17 — icon switched from ChartLineUp (progress/analytics-coded)
  // to CalendarCheck so the glyph matches the ROUTINE label. A trend
  // line next to "ROUTINE" pulled the tab toward its secondary Progress
  // segment's personality; CalendarCheck reads as daily cadence +
  // tracked completion and covers both sub-segments without leaning
  // either way. Label + icon now speak the same noun.
  RoutineTab:  { label: tabsStrings.routine, Icon: CalendarCheck as PhosphorIcon },
  AssistantTab:{ label: tabsStrings.assist,   Icon: Sparkle as PhosphorIcon },
};

const TAB_HEIGHT = 56;

/**
 * Five-slot tab bar, no FAB.
 *
 * v8 treatment — premium native iOS feel:
 *   - iOS BlurView over a cool paper tint; Android falls back to the solid
 *     tint + top hairline.
 *   - Active: Phosphor duotone + azure label, 2pt top indicator line.
 *   - Inactive: Phosphor regular + slate label.
 *   - No chunky FAB — Scan is its own tab slot, pressing it routes to the
 *     scan modal (see TabNavigator.tsx tabPress listener).
 *   - Container height follows `TAB_HEIGHT`; safe-area bottom is added by
 *     the root container, not padded inside each tab.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const onTabPress = (routeName: string, routeKey: string) => {
    const focused = state.routes[state.index]?.key === routeKey;
    hapt.select();
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={32}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.tint} />
      <View style={styles.hairline} />

      <View style={[styles.bar, { height: TAB_HEIGHT }]}>
        {state.routes.map((route) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.routes[state.index]?.key === route.key;
          return (
            <TabButton
              key={route.key}
              label={meta.label}
              Icon={meta.Icon}
              focused={focused}
              onPress={() => onTabPress(route.name, route.key)}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  label,
  Icon,
  focused,
  onPress,
}: {
  label: string;
  Icon: PhosphorIcon;
  focused: boolean;
  onPress: () => void;
}) {
  const indicatorOpacity = useSharedValue(focused ? 1 : 0);
  const indicatorScale = useSharedValue(focused ? 1 : 0.6);

  useEffect(() => {
    indicatorOpacity.value = withTiming(focused ? 1 : 0, motion.fast);
    indicatorScale.value = withSpring(focused ? 1 : 0.6, spring.default);
  }, [focused, indicatorOpacity, indicatorScale]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ scaleX: indicatorScale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} tab`}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View style={[styles.activeBar, indicatorStyle]} />
      <Icon
        size={22}
        color={focused ? palette.clay : colors.inkTertiary}
        weight={focused ? 'duotone' : 'regular'}
      />
      <Text
        style={[
          styles.label,
          { color: focused ? palette.clay : colors.inkTertiary },
        ]}
        numberOfLines={1}
        allowFontScaling
        maxFontSizeMultiplier={1.0}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    overflow: 'hidden',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(248,250,252,0.72)' : colors.bg,
  },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: space.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 8,
    gap: 3,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.clay,
  },
  label: {
    ...typography.tabLabel,
    fontSize: 9,
    letterSpacing: 1.3,
    paddingHorizontal: 2,
  },
});
