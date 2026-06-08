/**
 * FloatingTabBar — v30 luxury rebuild.
 *
 * Soft warm-ivory floating pill that hovers above the home indicator.
 * Five visible tabs only: Home / Shop / Scan / Routine / Me.
 * AssistantTab is registered in the navigator but intentionally NOT
 * rendered here — every existing `navigate('AssistantTab')` call-site
 * still routes, and the Me tab surfaces a prominent AI Assist row.
 *
 * Visual contract per the brief:
 *   • Calm ivory dock surface, not muddy beige.
 *   • Active tab uses a subtle warm pill behind the icon — no thick
 *     rectangular outline.
 *   • Center Scan is an elevated orb with a soft coral rim, sitting
 *     slightly above the dock's top edge.
 *   • Generous bottom safe-area handling.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import {
  House,
  ShoppingBagOpen,
  Scan,
  CalendarCheck,
  User as UserIcon,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { ScanFrameGlyph } from '@/components/ScanFrameGlyph';
import {
  motion,
  spring,
  puraShop,
  puraShopType,
  puraShopRadius,
  puraShopShadow,
  puraShopLayout,
  puraShopSpace,
} from '@/theme';
import { hapt } from '@/utils/haptics';
import { tabs as tabsStrings } from '@/copy/strings';
import { useRoutineFocus } from '@/state/v26/routineFocus';
import { useRoutineStore, countUnconfirmedRequiredSteps } from '@/state/routine/routineStore';
import { useShallow } from 'zustand/react/shallow';

type PhosphorIcon = React.FC<PhosphorIconProps>;

interface TabMeta {
  label: string;
  Icon: PhosphorIcon;
}

const TAB_META: Record<string, TabMeta> = {
  HomeTab:     { label: tabsStrings.home,     Icon: House as PhosphorIcon },
  ProductsTab: { label: tabsStrings.products, Icon: ShoppingBagOpen as PhosphorIcon },
  ScanTab:     { label: tabsStrings.scan,     Icon: Scan as PhosphorIcon },
  RoutineTab:  { label: tabsStrings.routine,  Icon: CalendarCheck as PhosphorIcon },
  MeTab:       { label: tabsStrings.me,       Icon: UserIcon as PhosphorIcon },
};

const VISIBLE_TABS = ['HomeTab', 'ProductsTab', 'ScanTab', 'RoutineTab', 'MeTab'] as const;

const DOCK_HEIGHT = puraShopLayout.dockBarHeight;

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routineFocused = useRoutineFocus((s) => s.focused);

  const routineBadge = useRoutineStore(
    useShallow((s) => {
      if (s.lifecycle === 'building') {
        const percent = s.buildProgress?.percent ?? 0;
        return {
          kind: 'percent' as const,
          value: `${Math.max(0, Math.min(100, Math.round(percent)))}%`,
        };
      }
      const needs = countUnconfirmedRequiredSteps({
        routine: s.routine,
        confirmedOwnedIds: s.confirmedOwnedProductIds,
        skippedStepIds: s.skippedStepIds,
      });
      if (s.lifecycle === 'ready_to_review' || s.lifecycle === 'confirming_products') {
        return needs > 0 ? { kind: 'dot' as const } : null;
      }
      return null;
    }),
  );

  // Emit the tabPress + navigate. Kept haptic-free so callers can choose
  // their own feedback (the Scan orb fires a Light impact on press-in).
  const navigateTab = (routeName: string, routeKey: string) => {
    const focused = state.routes[state.index]?.key === routeKey;
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const onTabPress = (routeName: string, routeKey: string) => {
    hapt.select();
    navigateTab(routeName, routeKey);
  };

  if (routineFocused) return null;

  const visibleRoutes = VISIBLE_TABS.map((name) =>
    state.routes.find((r) => r.name === name),
  ).filter((r): r is NonNullable<typeof r> => r !== undefined);

  return (
    <View
      style={[
        styles.root,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.dockOuter}>
        <View style={styles.dock}>
          <View style={styles.bar}>
            {visibleRoutes.map((route) => {
              const meta = TAB_META[route.name];
              if (!meta) return null;
              const focused = state.routes[state.index]?.key === route.key;
              if (route.name === 'ScanTab') {
                return (
                  <ScanTabButton
                    key={route.key}
                    label={meta.label}
                    focused={focused}
                    onPress={() => navigateTab(route.name, route.key)}
                  />
                );
              }
              const badge =
                route.name === 'RoutineTab' && routineBadge ? routineBadge : null;
              return (
                <TabButton
                  key={route.key}
                  label={meta.label}
                  Icon={meta.Icon}
                  focused={focused}
                  badge={badge}
                  onPress={() => onTabPress(route.name, route.key)}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

type TabBadge =
  | { kind: 'percent'; value: string }
  | { kind: 'dot' };

function TabButton({
  label,
  Icon,
  focused,
  badge,
  onPress,
}: {
  label: string;
  Icon: PhosphorIcon;
  focused: boolean;
  badge?: TabBadge | null;
  onPress: () => void;
}) {
  const pillOpacity = useSharedValue(focused ? 1 : 0);
  const pillScale = useSharedValue(focused ? 1 : 0.85);

  useEffect(() => {
    pillOpacity.value = withTiming(focused ? 1 : 0, motion.fast);
    pillScale.value = withSpring(focused ? 1 : 0.85, spring.default);
  }, [focused, pillOpacity, pillScale]);

  const pillAnim = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));

  const iconColor = focused ? puraShop.dockIcon : puraShop.dockIconIdle;
  const labelColor = focused ? puraShop.dockLabel : puraShop.dockLabelIdle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        badge?.kind === 'percent'
          ? `${label} tab, build ${badge.value} complete`
          : `${label} tab`
      }
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      hitSlop={6}
      style={styles.tab}
    >
      <View style={styles.iconWrap}>
        <Icon
          size={22}
          color={iconColor}
          weight={focused ? 'fill' : 'regular'}
        />
        {badge?.kind === 'percent' ? (
          <View style={styles.percentBadge} pointerEvents="none">
            <Text style={styles.percentBadgeText}>{badge.value}</Text>
          </View>
        ) : null}
        {badge?.kind === 'dot' ? (
          <View style={styles.dotBadge} pointerEvents="none" />
        ) : null}
      </View>
      <Text
        style={[styles.label, { color: labelColor }]}
        numberOfLines={1}
        allowFontScaling
        maxFontSizeMultiplier={1.0}
      >
        {label}
      </Text>
      {/* Active indicator — a small terracotta dot below the label. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.activeDot, pillAnim]}
      />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ScanTabButton — elevated center control. The orb here is brand chrome, so it
// wears the scan-frame brackets (the same phosphor `Scan` glyph used by the
// "Take a 30-second scan" CTA) instead of the orb's face. The face is reserved
// for moments where the orb is genuinely alive (hero, analyzing, scan reveal) —
// never static tab chrome.
//   • White scan-frame brackets centered in the Pura-Blue disc
//   • Spring "squish" + Light haptic on press for tactile personality
// No idle breathing and no focus pulse: tapping Scan opens the full-screen
// ScanModal (the tab itself never enters a `focused` state), so the orb stays
// calm tab chrome and only reacts to the press. Restraint over decoration.
// ---------------------------------------------------------------------------

function ScanTabButton({
  label,
  focused,
  onPress,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const pressScale = useSharedValue(1);

  // Scale with the press squish only — no idle breath, no pulse. As tab chrome
  // (not a living face) the orb stays calm at rest; restraint is the point.
  const orbAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const onPressIn = () => {
    pressScale.value = withSpring(0.92, { mass: 0.5, damping: 15, stiffness: 420 });
    hapt.tap(); // Light impact — soft, never heavy
  };

  const onPressOut = () => {
    // Spring back with a gentle overshoot (~1.02) before settling at 1.0.
    pressScale.value = withSpring(1, { mass: 0.6, damping: 9, stiffness: 230 });
  };

  const labelColor = focused ? puraShop.dockLabel : puraShop.dockLabelIdle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={6}
      style={styles.tab}
    >
      <Animated.View style={[styles.scanOrbWrap, orbAnim]}>
        <ScanOrbDisc focused={focused} />
        <View style={styles.scanGlyph} pointerEvents="none">
          {/* White scan-frame brackets (shared with the "Take a 30-second scan"
              CTA), never a face/smiley — the orb's face is reserved for live
              moments, never static tab chrome. */}
          <ScanFrameGlyph size={26} color="#FFFFFF" strokeWidth={2} />
        </View>
      </Animated.View>
      <Text
        style={[styles.label, { color: labelColor, marginTop: 4 }]}
        numberOfLines={1}
        allowFontScaling
        maxFontSizeMultiplier={1.0}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ScanOrbDisc — the vibrant Pura-Blue orb disc (white rim + glossy highlight)
// that hosts the Scan tab's scan-frame glyph. No face: the orb's face is
// reserved for genuinely-alive moments, never static tab chrome.
function ScanOrbDisc({ focused }: { focused: boolean }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="scanFill" cx="50%" cy="30%" rx="75%" ry="75%">
          <Stop offset="0%" stopColor="#5CA8FF" stopOpacity={1} />
          <Stop offset="50%" stopColor="#147CFF" stopOpacity={1} />
          <Stop offset="100%" stopColor="#0A57C9" stopOpacity={1} />
        </RadialGradient>
        <RadialGradient id="scanGloss" cx="40%" cy="26%" rx="48%" ry="38%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.6} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* white base disc → crisp ring separating the orb from the dock */}
      <Circle cx={50} cy={50} r={48} fill="#FFFFFF" />
      {/* vibrant brand-blue fill */}
      <Circle cx={50} cy={50} r={focused ? 45 : 46} fill="url(#scanFill)" />
      {/* glossy top highlight for dimensionality */}
      <Ellipse cx={42} cy={30} rx={24} ry={14} fill="url(#scanGloss)" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: puraShopSpace.lg,
    backgroundColor: 'transparent',
  },
  dockOuter: {
    borderRadius: puraShopRadius.dock,
    ...puraShopShadow.dock,
  },
  dock: {
    height: DOCK_HEIGHT,
    borderRadius: puraShopRadius.dock,
    backgroundColor: puraShop.dockSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraShop.dockHairline,
    overflow: 'visible',
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  iconWrap: {
    width: 38,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    width: 44,
    height: 30,
    borderRadius: 15,
    backgroundColor: puraShop.dockActivePillBg,
  },
  activeDot: {
    position: 'absolute',
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: puraShop.coral,
  },
  label: {
    ...puraShopType.dockLabel,
  },
  scanOrbWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginTop: -10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...puraShopShadow.scanOrb,
  },
  scanGlyph: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentBadge: {
    position: 'absolute',
    top: -12,
    right: -16,
    minWidth: 32,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#147CFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#147CFF',
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  percentBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  dotBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#147CFF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
