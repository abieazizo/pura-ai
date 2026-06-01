/**
 * AppearanceScreen — tune how Pura looks and feels, honestly.
 *
 * Pura ships as one calm light theme on purpose: scans have to read true
 * to color, so a dark repaint would change the very pixels we analyze.
 * Rather than fake a Dark/System switch that wouldn't repaint anything,
 * the theme row shows Light as the live experience and labels the others
 * "Coming soon" — tapping them explains why instead of dead-ending.
 *
 * Everything below the theme row is real and wired to the store:
 *   • Lighting Assist  → lightingAssistEnabled (the scan-camera glow)
 *   • Motion           → motionPreference, which useReduceMotion() honors
 *   • Haptics          → hapticsEnabled, which gates hapt.* app-wide
 * The live preview reacts to the last two so the user feels the change.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check } from 'phosphor-react-native';

import { puraShop, puraShopType, puraShopRadius } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { meSettings } from '@/copy/strings';

import { SettingsScaffold } from './SettingsScaffold';
import {
  InfoSheet,
  SettingsCard,
  SettingsDivider,
  SettingsSection,
  SettingsSegmented,
  ToggleRow,
  type ChipOption,
} from './SettingsKit';

const C = meSettings.appearance;

type MotionPref = 'system' | 'reduced';
const MOTION_OPTIONS: readonly ChipOption<MotionPref>[] = [
  { value: 'system', label: C.motion.system },
  { value: 'reduced', label: C.motion.reduced },
];

// ---------------------------------------------------------------------------
// Theme preview card — a tiny mock of each theme. Light is the live one;
// Dark / System are shown honestly as "Coming soon".
// ---------------------------------------------------------------------------

function ThemeCard({
  kind,
  name,
  selected = false,
  comingSoon = false,
  onPress,
}: {
  kind: 'light' | 'dark' | 'system';
  name: string;
  selected?: boolean;
  comingSoon?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected, disabled: !onPress }}
      style={({ pressed }) => [
        styles.themeCard,
        selected && styles.themeCardActive,
        pressed && onPress && styles.themeCardPressed,
      ]}
    >
      <View style={styles.swatchWrap}>
        {kind === 'system' ? (
          <View style={[styles.swatch, styles.swatchSplit, comingSoon && styles.swatchDimmed]}>
            <View style={styles.systemHalfLight} />
            <View style={styles.systemHalfDark} />
          </View>
        ) : (
          <View
            style={[
              styles.swatch,
              kind === 'dark' ? styles.swatchDark : styles.swatchLight,
              comingSoon && styles.swatchDimmed,
            ]}
          >
            <View
              style={[
                styles.swatchBar,
                { width: '58%' },
                kind === 'dark' ? styles.barDark : styles.barLight,
              ]}
            />
            <View
              style={[
                styles.swatchBar,
                { width: '40%' },
                kind === 'dark' ? styles.barDark : styles.barLight,
              ]}
            />
            <View style={styles.swatchAccent} />
          </View>
        )}

        {selected ? (
          <View style={styles.checkBadge}>
            <Check size={11} color={puraShop.white} weight="bold" />
          </View>
        ) : null}
      </View>

      <Text
        style={[styles.themeName, !selected && styles.themeNameMuted]}
        maxFontSizeMultiplier={1.15}
      >
        {name}
      </Text>

      {comingSoon ? (
        <View style={styles.comingSoonPill}>
          <Text style={styles.comingSoonText} maxFontSizeMultiplier={1.1}>
            {C.comingSoon}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Live preview — a gentle pulse that stops under reduced motion, and a
// button that fires a real haptic (a no-op when haptics are off).
// ---------------------------------------------------------------------------

function MotionPreview() {
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.7] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <View style={styles.demoRow}>
      <View style={styles.pulseStage}>
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: ringScale }], opacity: reduceMotion ? 0 : ringOpacity },
          ]}
        />
        <View style={styles.pulseDot} />
      </View>
      <Text style={styles.demoCaption} maxFontSizeMultiplier={1.3}>
        {C.preview.motionCaption}
      </Text>
    </View>
  );
}

function HapticPreview({ enabled }: { enabled: boolean }) {
  return (
    <View style={styles.demoRow}>
      <Pressable
        onPress={() => hapt.tap()}
        accessibilityRole="button"
        accessibilityLabel={C.preview.hapticButton}
        style={({ pressed }) => [styles.hapticBtn, pressed && styles.hapticBtnPressed]}
      >
        <Text style={styles.hapticBtnText} maxFontSizeMultiplier={1.2}>
          {C.preview.hapticButton}
        </Text>
      </Pressable>
      <Text style={styles.demoCaption} maxFontSizeMultiplier={1.3}>
        {enabled ? C.preview.hapticOn : C.preview.hapticOff}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

export function AppearanceScreen() {
  const {
    lightingAssist,
    setLightingAssist,
    hapticsEnabled,
    setHapticsEnabled,
    motionPreference,
    setMotionPreference,
  } = useAppStore(
    useShallow((s) => ({
      lightingAssist: s.lightingAssistEnabled,
      setLightingAssist: s.setLightingAssistEnabled,
      hapticsEnabled: s.hapticsEnabled,
      setHapticsEnabled: s.setHapticsEnabled,
      motionPreference: s.motionPreference,
      setMotionPreference: s.setMotionPreference,
    })),
  );

  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const openComingSoon = useCallback(() => setComingSoonOpen(true), []);

  return (
    <SettingsScaffold title={C.title} intro={C.intro}>
      <View style={styles.body}>
        {/* Theme — Light is live; Dark / System are honestly "coming soon". */}
        <SettingsSection title={C.themeTitle} footnote={C.themeActiveNote}>
          <View style={styles.themeRow}>
            <ThemeCard kind="light" name={C.theme.light} selected />
            <ThemeCard
              kind="dark"
              name={C.theme.dark}
              comingSoon
              onPress={openComingSoon}
            />
            <ThemeCard
              kind="system"
              name={C.theme.system}
              comingSoon
              onPress={openComingSoon}
            />
          </View>
        </SettingsSection>

        {/* Scan lighting — real, wired to the scan camera. */}
        <SettingsSection title={C.lightingTitle}>
          <SettingsCard>
            <ToggleRow
              label={C.lightingLabel}
              meta={C.lightingMeta}
              value={lightingAssist}
              onValueChange={setLightingAssist}
            />
          </SettingsCard>
        </SettingsSection>

        {/* Motion — drives useReduceMotion() app-wide. */}
        <SettingsSection title={C.motionTitle} footnote={C.motionMeta}>
          <SettingsSegmented
            options={MOTION_OPTIONS}
            value={motionPreference}
            onChange={setMotionPreference}
          />
        </SettingsSection>

        {/* Haptics — gates hapt.* app-wide. */}
        <SettingsSection title={C.hapticsTitle}>
          <SettingsCard>
            <ToggleRow
              label={C.hapticsLabel}
              meta={C.hapticsMeta}
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
            />
          </SettingsCard>
        </SettingsSection>

        {/* Live preview — reacts to the two controls above. */}
        <SettingsSection title={C.preview.title}>
          <SettingsCard>
            <MotionPreview />
            <View style={styles.demoDivider}>
              <SettingsDivider />
            </View>
            <HapticPreview enabled={hapticsEnabled} />
          </SettingsCard>
        </SettingsSection>
      </View>

      <InfoSheet
        visible={comingSoonOpen}
        title={C.comingSoon}
        body={C.darkComingSoon}
        onClose={() => setComingSoonOpen(false)}
      />
    </SettingsScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
  },

  // Theme cards
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: puraShopRadius.cardSmall,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    backgroundColor: puraShop.surface,
  },
  themeCardActive: {
    borderColor: puraShop.coral,
  },
  themeCardPressed: {
    opacity: 0.85,
  },
  swatchWrap: {
    width: '100%',
    position: 'relative',
  },
  swatch: {
    width: '100%',
    height: 54,
    borderRadius: 10,
    overflow: 'hidden',
    padding: 9,
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: puraShop.hairline,
  },
  swatchLight: {
    backgroundColor: puraShop.surface,
  },
  swatchDark: {
    backgroundColor: puraShop.ink,
  },
  swatchSplit: {
    flexDirection: 'row',
    padding: 0,
    gap: 0,
  },
  swatchDimmed: {
    opacity: 0.5,
  },
  systemHalfLight: {
    flex: 1,
    backgroundColor: puraShop.surface,
  },
  systemHalfDark: {
    flex: 1,
    backgroundColor: puraShop.ink,
  },
  swatchBar: {
    height: 4,
    borderRadius: 2,
  },
  barLight: {
    backgroundColor: puraShop.inkFaint,
  },
  barDark: {
    backgroundColor: puraShop.surfaceMuted,
  },
  swatchAccent: {
    height: 6,
    width: '42%',
    borderRadius: 3,
    backgroundColor: puraShop.coral,
    marginTop: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: puraShop.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: puraShop.surface,
  },
  themeName: {
    ...puraShopType.chipLabel,
    color: puraShop.ink,
  },
  themeNameMuted: {
    color: puraShop.inkMuted,
  },
  comingSoonPill: {
    backgroundColor: puraShop.surfaceWarm,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  comingSoonText: {
    ...puraShopType.meta,
    color: puraShop.inkMuted,
    fontSize: 10.5,
  },

  // Live preview
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 6,
  },
  demoDivider: {
    marginVertical: 4,
  },
  demoCaption: {
    ...puraShopType.meta,
    color: puraShop.inkMuted,
    flex: 1,
    lineHeight: 17,
  },
  pulseStage: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: puraShop.coralSoft,
  },
  pulseDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: puraShop.coral,
  },
  hapticBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: puraShopRadius.chip,
    backgroundColor: puraShop.surfaceWarm,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
  },
  hapticBtnPressed: {
    opacity: 0.7,
  },
  hapticBtnText: {
    ...puraShopType.chipLabel,
    color: puraShop.ink,
  },
});
