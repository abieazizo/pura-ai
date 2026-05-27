import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { CaretLeft } from 'phosphor-react-native';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { PURA, PURA_FONT } from './tokensV2';

export interface CompactProgressProps {
  /** 0–1 fill ratio for the progress bar. */
  fill: number;
  /** Stage label rendered above the bar in small caps. */
  label: string;
}

export function CompactProgress({ fill, label }: CompactProgressProps) {
  const ratio = Math.max(0, Math.min(1, fill));
  return (
    <View style={progressStyles.wrap} accessibilityLabel={label}>
      <Text style={progressStyles.label} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
      <View style={progressStyles.track}>
        <View
          style={[progressStyles.fill, { width: `${ratio * 100}%` }]}
        />
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  label: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    color: PURA.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: PURA.border,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: PURA.terracotta,
  },
});

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

export interface OnboardingTopBarProps {
  showBack?: boolean;
  onBack?: () => void;
  progress?: CompactProgressProps | null;
  /** Optional right slot — e.g. a small lock badge. */
  right?: React.ReactNode;
}

export function OnboardingTopBar({
  showBack = true,
  onBack,
  progress,
  right,
}: OnboardingTopBarProps) {
  const nav = useNavigation();
  const handleBack = onBack ?? (() => nav.canGoBack() && nav.goBack());

  return (
    <View style={topBarStyles.wrap}>
      <View style={topBarStyles.side}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            style={({ pressed }) => [
              topBarStyles.back,
              pressed && { opacity: 0.6 },
            ]}
          >
            <CaretLeft size={20} color={PURA.ink} weight="bold" />
          </Pressable>
        ) : null}
      </View>
      <View style={topBarStyles.center}>
        {progress ? <CompactProgress {...progress} /> : null}
      </View>
      <View style={[topBarStyles.side, topBarStyles.sideRight]}>
        {right}
      </View>
    </View>
  );
}

const topBarStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
  },
  side: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: { alignItems: 'flex-end' },
  center: { flex: 1, justifyContent: 'center' },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
  },
});

// ---------------------------------------------------------------------------
// Bottom action tray
// ---------------------------------------------------------------------------

const CTA_TRAY_HEIGHT = 56 + 40;
const CTA_FADE_HEIGHT = 36;

export interface BottomActionTrayProps {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  disabledReason?: string;
  /** Optional secondary action rendered below the primary button. */
  secondary?: { label: string; onPress: () => void } | null;
  /** Tertiary action — typically used for "Not now" or guest paths. */
  tertiary?: { label: string; onPress: () => void } | null;
  /** Trust strip rendered above the primary CTA (e.g. privacy reassurance). */
  trust?: React.ReactNode;
}

export function BottomActionTray({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  disabledReason,
  secondary,
  tertiary,
  trust,
}: BottomActionTrayProps) {
  const insets = useSafeAreaInsets();
  const showHint = !!primaryDisabled && !!disabledReason;
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(250,247,244,0)', PURA.paper]}
        style={[
          trayStyles.fadeMask,
          { height: CTA_FADE_HEIGHT, bottom: CTA_TRAY_HEIGHT + insets.bottom - 6 },
        ]}
      />
      <View
        style={[trayStyles.wrap, { paddingBottom: insets.bottom + 16 }]}
      >
        {trust ? <View style={trayStyles.trustRow}>{trust}</View> : null}
        {showHint ? (
          <Text
            style={trayStyles.disabledHint}
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.2}
          >
            {disabledReason}
          </Text>
        ) : null}
        <OnboardingPrimaryButton
          label={primaryLabel}
          onPress={onPrimary}
          disabled={primaryDisabled}
          style={trayStyles.cta}
        />
        {secondary ? (
          <Pressable
            onPress={secondary.onPress}
            accessibilityRole="button"
            accessibilityLabel={secondary.label}
            hitSlop={10}
            style={({ pressed }) => [
              trayStyles.secondaryWrap,
              pressed && { opacity: 0.65 },
            ]}
          >
            <Text style={trayStyles.secondaryLabel} maxFontSizeMultiplier={1.15}>
              {secondary.label}
            </Text>
          </Pressable>
        ) : null}
        {tertiary ? (
          <Pressable
            onPress={tertiary.onPress}
            accessibilityRole="button"
            accessibilityLabel={tertiary.label}
            hitSlop={10}
            style={({ pressed }) => [
              trayStyles.tertiaryWrap,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={trayStyles.tertiaryLabel} maxFontSizeMultiplier={1.15}>
              {tertiary.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

const trayStyles = StyleSheet.create({
  fadeMask: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: PURA.paper,
  },
  trustRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  disabledHint: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13,
    lineHeight: 18,
    color: PURA.muted,
    textAlign: 'center',
    marginBottom: 10,
    marginHorizontal: 24,
  },
  cta: {
    marginHorizontal: 0,
    height: 56,
    borderRadius: 28,
  },
  secondaryWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  secondaryLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.ink,
  },
  tertiaryWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingVertical: 6,
  },
  tertiaryLabel: {
    fontFamily: PURA_FONT.sansMed,
    fontSize: 13,
    color: PURA.muted,
    textDecorationLine: 'underline',
  },
});

// ---------------------------------------------------------------------------
// Screen shell
// ---------------------------------------------------------------------------

export interface OnboardingScreenShellV2Props {
  /** Optional top bar — pass `null` to omit (e.g. immersive camera screen). */
  topBar?: OnboardingTopBarProps | null;
  /** Body content. Rendered inside a ScrollView with bottom padding for CTA tray. */
  children: React.ReactNode;
  bottom?: BottomActionTrayProps | null;
  /** When true, body uses View not ScrollView (for camera screens etc.). */
  noScroll?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function OnboardingScreenShellV2({
  topBar,
  children,
  bottom,
  noScroll,
  style,
}: OnboardingScreenShellV2Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = bottom ? CTA_TRAY_HEIGHT + insets.bottom + 24 : insets.bottom + 24;

  return (
    <SafeAreaView style={[shellStyles.root, style]} edges={['top']}>
      <StatusBar style="dark" />
      {topBar !== null ? <OnboardingTopBar {...(topBar ?? {})} /> : null}
      {noScroll ? (
        <View style={shellStyles.body}>{children}</View>
      ) : (
        <ScrollView
          style={shellStyles.body}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      )}
      {bottom ? <BottomActionTray {...bottom} /> : null}
    </SafeAreaView>
  );
}

const shellStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PURA.paper,
  },
  body: { flex: 1 },
});
