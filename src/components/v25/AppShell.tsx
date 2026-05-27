import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { CaretLeft } from 'phosphor-react-native';
import { T, TYPE, SPACE } from './tokens';

/**
 * v25 — AppShell.
 *
 * One screen container used across Home / Routine / Products / Product
 * Detail / AI Assist. Owns: status bar, paper background, safe areas,
 * scroll container, bottom padding for the global bottom nav.
 *
 * The bottom navigation is rendered by the navigator (FloatingTabBar),
 * so the shell only needs to reserve space at the bottom of scrolling
 * content so the floating bar never overlaps the last card.
 */

const TAB_BAR_SPACE = 88;

export interface AppShellProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  reserveBottomNav?: boolean;
  style?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'style'>;
}

export function AppShell({
  children,
  scroll = true,
  contentContainerStyle,
  reserveBottomNav = true,
  style,
  scrollViewProps,
}: AppShellProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = (reserveBottomNav ? TAB_BAR_SPACE : 0) + Math.max(insets.bottom, 8);
  if (scroll) {
    return (
      <SafeAreaView style={[s.root, style]} edges={['top']}>
        <StatusBar style="dark" />
        <ScrollView
          style={s.flex}
          contentContainerStyle={[
            { paddingBottom: bottomPad },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[s.root, style]} edges={['top']}>
      <StatusBar style="dark" />
      <View
        style={[s.flex, { paddingBottom: bottomPad }, contentContainerStyle]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------

export interface PageHeaderProps {
  /** Optional small line of metadata above the title. */
  eyebrow?: string;
  title?: string;
  /** Editorial greeting headline — used on Home. */
  greetingTitle?: string;
  /** Supporting line under the title or greeting. */
  subtitle?: string;
  /** Left slot — defaults to a back button if `showBack` is true. */
  left?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  /** Right slot — typically the profile avatar. */
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PageHeader({
  eyebrow,
  title,
  greetingTitle,
  subtitle,
  left,
  showBack,
  onBack,
  right,
  style,
}: PageHeaderProps) {
  const nav = useNavigation();
  const back = onBack ?? (() => nav.canGoBack() && nav.goBack());

  return (
    <View style={[s.header, style]}>
      {(left || showBack) ? (
        <View style={s.headerRow}>
          {showBack ? (
            <Pressable
              onPress={back}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={10}
              style={({ pressed }) => [
                s.backBtn,
                pressed && { opacity: 0.65 },
              ]}
            >
              <CaretLeft size={18} color={T.ink} weight="bold" />
            </Pressable>
          ) : (
            left
          )}
          <View style={{ flex: 1 }} />
          {right}
        </View>
      ) : null}
      <View style={s.headerBody}>
        {eyebrow ? (
          <Text style={s.headerEyebrow} maxFontSizeMultiplier={1.15}>
            {eyebrow}
          </Text>
        ) : null}
        {greetingTitle ? (
          <Text
            accessibilityRole="header"
            style={s.headerGreeting}
            maxFontSizeMultiplier={1.15}
          >
            {greetingTitle}
          </Text>
        ) : title ? (
          <Text
            accessibilityRole="header"
            style={s.headerTitle}
            maxFontSizeMultiplier={1.2}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={s.headerSubtitle} maxFontSizeMultiplier={1.25}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {/* Right slot when no back button shown */}
      {!showBack && !left && right ? (
        <View style={s.headerRightOverlay}>{right}</View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.paper },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: SPACE.gutter,
    paddingTop: SPACE.topAfterHeader,
    paddingBottom: 18,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    marginBottom: 6,
  },
  headerBody: {},
  headerEyebrow: {
    fontFamily: TYPE.sansSemi,
    fontSize: 11,
    letterSpacing: 1.5,
    color: T.inkMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerGreeting: {
    fontFamily: TYPE.serif,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: T.ink,
  },
  headerTitle: {
    fontFamily: TYPE.serif,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
    color: T.ink,
  },
  headerSubtitle: {
    fontFamily: TYPE.sansMed,
    fontSize: 14,
    lineHeight: 20,
    color: T.inkMuted,
    marginTop: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
  },
  headerRightOverlay: {
    position: 'absolute',
    right: SPACE.gutter,
    top: SPACE.topAfterHeader,
  },
});
