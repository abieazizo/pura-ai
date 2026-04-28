/**
 * Condition-aware face-scan failure state (v11.3).
 *
 * The previous version showed the same "I couldn't finish this
 * reading. Sometimes the analysis doesn't come through." regardless
 * of why the AI couldn't make sense of the photo. v11.3 reads the
 * actual failure reason — derived from `image_quality.issues` on the
 * AI response when validation succeeds-but-flags the photo, OR from
 * an explicit `network` / `unknown` reason when the AI call itself
 * fell over — and shows headline + body + CTA copy that names the
 * specific problem and the specific next action.
 *
 * The reasons we recognise:
 *   • no_face_detected — image_quality.issues includes 'partial_face'
 *     or 'occluded' AND no findings detected a face region. Or the
 *     AI returned a usable=false with no findings.
 *   • partial_face    — face detected but cropped at one or more edges
 *   • poor_lighting   — image_quality.issues includes 'low_light'
 *   • blurry          — image_quality.issues includes 'blurry'
 *   • angled          — image_quality.issues includes 'angled'
 *   • network         — AI call itself errored (timeout / 5xx / no
 *     response from the proxy)
 *   • unknown         — fall-through, generic copy
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  CloudSlash,
  Crop,
  EyeSlash,
  Lightbulb,
  Person,
  WaveSawtooth,
  X,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { palette, scanTypography } from '@/theme';
import { hapt } from '@/utils/haptics';

export type ErrorStateReason =
  | 'no_face_detected'
  | 'partial_face'
  | 'poor_lighting'
  | 'blurry'
  | 'angled'
  | 'network'
  | 'unknown';

export interface ErrorStateProps {
  onRetry: () => void;
  onAbort: () => void;
  /**
   * Why the scan didn't produce a usable reading. When omitted, we
   * fall back to the generic "I couldn't finish this reading." copy,
   * matching legacy v11.2 behaviour.
   */
  reason?: ErrorStateReason;
}

interface ReasonCopy {
  Icon: React.FC<PhosphorIconProps>;
  headline: string;
  body: string;
  cta: string;
}

/**
 * Per-reason copy + icon. The headline names the specific problem
 * (so the user immediately understands why); the body offers ONE
 * concrete next action (so they know what to do); the CTA inherits
 * a verb that matches the action.
 */
const REASON_COPY: Record<ErrorStateReason, ReasonCopy> = {
  no_face_detected: {
    Icon: Person as React.FC<PhosphorIconProps>,
    headline: 'I didn’t see a face.',
    body: 'Center your face in the frame and make sure your full face is visible.',
    cta: 'Try again',
  },
  partial_face: {
    Icon: Crop as React.FC<PhosphorIconProps>,
    headline: 'Your face was cropped.',
    body: 'Move back a little so your forehead, cheeks, and chin all fit inside the oval.',
    cta: 'Try again',
  },
  poor_lighting: {
    Icon: Lightbulb as React.FC<PhosphorIconProps>,
    headline: 'It was too dark to read.',
    body: 'Turn toward a soft light source and retake the photo.',
    cta: 'Retake in better light',
  },
  blurry: {
    Icon: WaveSawtooth as React.FC<PhosphorIconProps>,
    headline: 'The photo was blurry.',
    body: 'Hold the camera steady and let it focus before you tap.',
    cta: 'Try again',
  },
  angled: {
    Icon: EyeSlash as React.FC<PhosphorIconProps>,
    headline: 'The angle was a little off.',
    body: 'Hold the camera at eye level and look straight ahead.',
    cta: 'Try again',
  },
  network: {
    Icon: CloudSlash as React.FC<PhosphorIconProps>,
    headline: 'I couldn’t reach the analysis service.',
    body: 'Your photo is safe. Check your connection and try again.',
    cta: 'Try another scan',
  },
  unknown: {
    Icon: CloudSlash as React.FC<PhosphorIconProps>,
    headline: 'I couldn’t finish this reading.',
    body: 'Sometimes the analysis doesn’t come through. Your photo is safe — let’s try again.',
    cta: 'Try another scan',
  },
};

export function ErrorState({
  onRetry,
  onAbort,
  reason = 'unknown',
}: ErrorStateProps) {
  const handleRetry = () => {
    hapt.medium();
    onRetry();
  };
  const handleAbort = () => {
    hapt.select();
    onAbort();
  };

  const copy = REASON_COPY[reason];
  const Icon = copy.Icon;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleAbort}
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
        <View style={styles.iconWrap}>
          <Icon
            size={44}
            weight="duotone"
            color={palette.inkSecondary}
          />
        </View>

        <Text
          style={styles.headline}
          maxFontSizeMultiplier={1.2}
          accessibilityRole="header"
        >
          {copy.headline}
        </Text>

        <Text style={styles.bodyText} maxFontSizeMultiplier={1.2}>
          {copy.body}
        </Text>

        <Pressable
          onPress={handleRetry}
          style={({ pressed }) => [styles.primaryCta, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel={copy.cta}
        >
          <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
            {copy.cta}
          </Text>
          <ArrowRight size={18} weight="duotone" color={palette.bg} />
        </Pressable>

        <Pressable
          onPress={handleAbort}
          style={({ pressed }) => [styles.secondaryLink, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back to home"
          hitSlop={8}
        >
          <Text style={styles.secondaryLinkText} maxFontSizeMultiplier={1.15}>
            Go back to home
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
    height: 68,
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
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginBottom: 24,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    ...scanTypography.errorHeadline,
    color: palette.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  bodyText: {
    ...scanTypography.errorBody,
    color: palette.inkSecondary,
    marginBottom: 36,
    textAlign: 'center',
  },
  primaryCta: {
    height: 56,
    width: '100%',
    borderRadius: 28,
    backgroundColor: palette.clay,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: palette.clay,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: palette.bg,
  },
  secondaryLink: {
    marginTop: 16,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkTertiary,
    textDecorationLine: 'underline',
  },
});
