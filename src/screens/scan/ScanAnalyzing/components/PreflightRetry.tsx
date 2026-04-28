/**
 * PreflightRetry (v11.8).
 *
 * Replaces the heavy full-screen ErrorState wall for preflight-specific
 * failures. The previous flow (v11.7) routed every preflight verdict
 * straight into ErrorState, which has a "Go back to home" footer link
 * and reads as "you failed, leave." That's wrong for a quick correction
 * loop — the user just took a photo, they're still in the scan headspace,
 * and the right experience is to put the captured photo back in their
 * hands with a smart, named reason and a one-tap retake.
 *
 * Layout
 * ------
 * 1. Top bar — X close (returns to home).
 * 2. Captured photo thumbnail at ~200pt tall, with a warm ink scrim and
 *    a subtle reason badge anchored to the top-right corner so the
 *    failure is named ON the photo, not below it.
 * 3. Headline (italic serif) — names the exact problem in 5 words.
 * 4. Body line (Inter regular) — one concrete next action.
 * 5. Primary CTA "Retake photo" — clay-filled, full width.
 *
 * Tone: short, named, calm, recoverable. Never accusatory.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowClockwise,
  Crop,
  EyeSlash,
  Lightbulb,
  Person,
  WaveSawtooth,
  X,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { ScanPreflightReason } from '@/ai/ai-contracts';

export interface PreflightRetryProps {
  photoUri: string;
  reason: ScanPreflightReason;
  /** v11.8 — passthrough of the model's free-text retry copy. We
   *  prefer our own tightly-curated lines, but fall back to this
   *  when no curated copy exists (e.g. for `unknown`). */
  retryMessageFromModel?: string;
  onRetry: () => void;
  onCancel: () => void;
}

interface ReasonCopy {
  Icon: React.FC<PhosphorIconProps>;
  badge: string; // SHORT — fits in a corner pill
  headline: string;
  body: string;
}

const COPY: Record<ScanPreflightReason, ReasonCopy> = {
  ok: {
    // never rendered, but keeps the type complete.
    Icon: Person as React.FC<PhosphorIconProps>,
    badge: 'OK',
    headline: 'Looks good.',
    body: 'Continuing analysis.',
  },
  no_face: {
    Icon: Person as React.FC<PhosphorIconProps>,
    badge: 'NO FACE',
    headline: 'I couldn’t see your face clearly.',
    body: 'Center your face in the oval and make sure your full face is visible.',
  },
  partial_face: {
    Icon: Crop as React.FC<PhosphorIconProps>,
    badge: 'CROPPED',
    headline: 'Your face was cropped.',
    body: 'Step back a little so your forehead, cheeks, and chin all fit inside the oval.',
  },
  not_centered: {
    Icon: EyeSlash as React.FC<PhosphorIconProps>,
    badge: 'OFF-CENTER',
    headline: 'Your face was off-center.',
    body: 'Line your face up with the oval before tapping the shutter.',
  },
  too_dark: {
    Icon: Lightbulb as React.FC<PhosphorIconProps>,
    badge: 'LOW LIGHT',
    headline: 'It was a little too dark to read.',
    body: 'Turn toward a soft, even light source and retake the photo.',
  },
  too_blurry: {
    Icon: WaveSawtooth as React.FC<PhosphorIconProps>,
    badge: 'BLURRY',
    headline: 'The photo came through blurry.',
    body: 'Hold the camera steady and let it focus before tapping.',
  },
  unknown: {
    Icon: Person as React.FC<PhosphorIconProps>,
    badge: 'TRY AGAIN',
    headline: 'I couldn’t read this photo.',
    body: 'Try again with even light and your full face centered in the oval.',
  },
};

export function PreflightRetry({
  photoUri,
  reason,
  retryMessageFromModel,
  onRetry,
  onCancel,
}: PreflightRetryProps) {
  const copy = COPY[reason] ?? COPY.unknown;
  const Icon = copy.Icon;

  // Prefer curated copy. The model's free-text retry hint is a fallback
  // for the `unknown` bucket where we can't pre-write a perfect line.
  const bodyCopy =
    reason === 'unknown' && retryMessageFromModel?.trim()
      ? retryMessageFromModel.trim()
      : copy.body;

  const handleRetry = () => {
    hapt.medium();
    onRetry();
  };
  const handleCancel = () => {
    hapt.select();
    onCancel();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
        >
          <X size={18} weight="duotone" color={palette.ink} />
        </Pressable>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.body}>
        {/* Captured photo with badge + soft scrim */}
        <View style={styles.photoWrap}>
          <Image
            source={photoUri}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.photoScrim} />
          <View style={styles.badgePill}>
            <Icon size={12} weight="duotone" color={palette.bg} />
            <Text style={styles.badgeText} maxFontSizeMultiplier={1.1}>
              {copy.badge}
            </Text>
          </View>
        </View>

        <Text
          style={styles.headline}
          maxFontSizeMultiplier={1.2}
          accessibilityRole="header"
        >
          {copy.headline}
        </Text>
        <Text style={styles.bodyText} maxFontSizeMultiplier={1.2}>
          {bodyCopy}
        </Text>

        <Pressable
          onPress={handleRetry}
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Retake photo"
        >
          <ArrowClockwise size={16} weight="bold" color={palette.bg} />
          <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
            Retake photo
          </Text>
        </Pressable>

        <Pressable
          onPress={handleCancel}
          hitSlop={8}
          style={({ pressed }) => [styles.cancelLink, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Cancel scan"
        >
          <Text style={styles.cancelLinkText} maxFontSizeMultiplier={1.15}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  headerRow: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 18,
  },
  photoWrap: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    shadowColor: palette.ink,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    marginBottom: 6,
  },
  photoScrim: {
    ...StyleSheet.absoluteFillObject,
    // Cool ink @ 22% — softens the photo so the badge reads cleanly.
    backgroundColor: 'rgba(11,18,32,0.22)',
  },
  badgePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(11,18,32,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  badgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.bg,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: palette.ink,
    textAlign: 'left',
  },
  bodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    textAlign: 'left',
    marginBottom: 4,
  },
  primaryCta: {
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.clay,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: palette.clay,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
    color: palette.bg,
  },
  cancelLink: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkTertiary,
  },
});
