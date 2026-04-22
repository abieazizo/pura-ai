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
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import {
  House,
  Drop,
  ChatCircle,
  ChartLineUp,
  Camera,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { LayeredShadow } from '@/components/LayeredShadow';
import {
  colors,
  layout,
  motion,
  palette,
  shadow,
  space,
  spring,
  type as typography,
} from '@/theme';
import { hapt } from '@/utils/haptics';
import { tabs as tabsStrings } from '@/copy/strings';
import type { RootStackParamList } from './types';

type PhosphorIcon = React.FC<PhosphorIconProps>;

const TAB_META: Record<
  string,
  { label: string; Icon: PhosphorIcon }
> = {
  HomeTab: { label: tabsStrings.home, Icon: House as PhosphorIcon },
  ProductsTab: { label: tabsStrings.products, Icon: Drop as PhosphorIcon },
  AssistantTab: { label: tabsStrings.assist, Icon: ChatCircle as PhosphorIcon },
  ProgressTab: { label: tabsStrings.progress, Icon: ChartLineUp as PhosphorIcon },
};

/**
 * 4-slot tab bar + absolutely-positioned FAB overlay.
 *
 * v5 treatment:
 *   - Backdrop blur on iOS (BlurView intensity 30 over bg-at-92%).
 *   - Android falls back to a solid bg tint.
 *   - Active state: icon Phosphor `duotone` filled, label clay.
 *   - Inactive: icon `regular`, label inkTertiary.
 *   - FAB: 68×68 clay (not coral), 4pt bg ring, Phosphor Camera duotone.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();

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

  const lastFabPress = useSharedValue(0);
  const onFabPress = () => {
    const now = Date.now();
    if (now - lastFabPress.value < 400) return;
    lastFabPress.value = now;
    hapt.tap();
    rootNav.navigate('ScanModal');
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={30}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.tint} />
      <View style={styles.hairline} />

      <View style={[styles.bar, { height: layout.tabBarHeight }]}>
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

      <View
        pointerEvents="box-none"
        style={[
          styles.fabWrap,
          {
            bottom:
              insets.bottom + layout.tabBarHeight - layout.fabSize / 2,
          },
        ]}
      >
        <LayeredShadow
          preset={shadow.fab}
          borderRadius={layout.fabSize / 2}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a scan"
            accessibilityHint="Opens the camera to scan your skin"
            onPress={onFabPress}
            style={({ pressed }) => [
              styles.fab,
              {
                width: layout.fabSize,
                height: layout.fabSize,
                borderRadius: layout.fabSize / 2,
                borderWidth: layout.fabRingWidth,
                borderColor: colors.bg,
                backgroundColor: colors.clay,
              },
              pressed && styles.fabPressed,
            ]}
          >
            <Camera
              size={28}
              color={colors.inkInverse}
              weight="duotone"
            />
          </Pressable>
        </LayeredShadow>
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
  const dotOpacity = useSharedValue(focused ? 1 : 0);
  const dotScale = useSharedValue(focused ? 1 : 0.4);

  useEffect(() => {
    dotOpacity.value = withTiming(focused ? 1 : 0, motion.fast);
    dotScale.value = withSpring(focused ? 1 : 0.4, spring.default);
  }, [focused, dotOpacity, dotScale]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotScale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} tab`}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View style={[styles.activeDot, dotStyle]} />
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
        adjustsFontSizeToFit
        minimumFontScale={0.85}
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
    backgroundColor: Platform.OS === 'ios' ? 'rgba(250,247,244,0.7)' : colors.bg,
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
    paddingHorizontal: space.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 6,
    paddingBottom: 8,
    gap: 2,
  },
  activeDot: {
    position: 'absolute',
    top: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.clay,
  },
  label: {
    ...typography.tabLabel,
    paddingHorizontal: 4,
  },
  fabWrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
});
