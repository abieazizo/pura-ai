/**
 * v25 onboarding — ScanThread.
 *
 * Spec demand from v26.3 review: "the user's accepted scan image must
 * become the continuous visual object carrying the user from capture
 * into result and routine."
 *
 * Implementation: a small persistent header strip rendered at the top
 * of the screens that follow capture (Baseline → Plan → Save). It
 * carries the photo as a circular thumbnail, a kicker label that
 * names the stage, and a relative timestamp ("Captured just now").
 *
 * The thumbnail is the same accepted scan asset stored in
 * `onboardingV2.capturedScanUri`. Rendering the same image at the
 * same position across three screens gives the user a visual through-
 * line: every subsequent decision visibly stays attached to the photo
 * they took, not to abstract account / settings cards.
 *
 * Visual rules:
 *   • Always warm paper-raised surface.
 *   • Thumbnail: 44pt circle, terracotta hairline.
 *   • Kicker: small uppercase, sans-semi, muted.
 *   • Stage label: sans-medium ink.
 *   • Timestamp: sans regular, muted.
 *   • Never animates by itself — the screen's entry animation owns it.
 *
 * Accessibility: labelled with the full stage + timestamp string so
 * VoiceOver users hear the continuity ("Baseline · Captured just now").
 *
 * Reduced-motion: respected by the parent screen; this component
 * itself does no animation.
 */

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PURA, PURA_FONT } from './tokensV2';

export type ScanThreadStage =
  | 'processing'
  | 'baseline'
  | 'safety'
  | 'simplicity'
  | 'plan'
  | 'save';

const STAGE_LABEL: Record<ScanThreadStage, string> = {
  processing: 'Reading your scan',
  baseline: 'Your first baseline',
  safety: 'Calibrating safely',
  simplicity: 'Choosing routine size',
  plan: 'Tonight’s routine',
  save: 'Saving your baseline',
};

export interface ScanThreadProps {
  /** The accepted scan image URI from onboardingV2 state. */
  scanUri: string | null;
  /** Which stage label to show. */
  stage: ScanThreadStage;
  /** ISO timestamp of capture — used to render "Captured just now" / "x min ago". */
  capturedAt?: string | null;
}

function relativeCaptureLabel(iso: string | null | undefined): string {
  if (!iso) return 'Captured just now';
  try {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return 'Captured just now';
    const elapsed = Date.now() - t;
    if (elapsed < 0) return 'Captured just now';
    const mins = Math.floor(elapsed / 60_000);
    if (mins < 1) return 'Captured just now';
    if (mins === 1) return 'Captured 1 min ago';
    if (mins < 60) return `Captured ${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs === 1) return 'Captured 1 hour ago';
    return `Captured ${hrs} hours ago`;
  } catch {
    return 'Captured just now';
  }
}

export function ScanThread({
  scanUri,
  stage,
  capturedAt,
}: ScanThreadProps) {
  // If no scan asset exists, render nothing — the post-capture screens
  // depend on it. Their parent already handles the missing-asset
  // fallback elsewhere (BaselineRevealV2 swaps to an error shell).
  if (!scanUri) return null;
  const stageLabel = STAGE_LABEL[stage];
  const relative = relativeCaptureLabel(capturedAt);
  return (
    <View
      style={styles.wrap}
      accessibilityRole="header"
      accessibilityLabel={`${stageLabel}. ${relative}.`}
    >
      <View style={styles.thumbWrap}>
        <Image
          source={{ uri: scanUri }}
          style={styles.thumb}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View pointerEvents="none" style={styles.thumbVignette} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.15}>
          FROM YOUR SCAN
        </Text>
        <Text style={styles.stage} maxFontSizeMultiplier={1.2} numberOfLines={1}>
          {stageLabel}
        </Text>
        <Text style={styles.timestamp} maxFontSizeMultiplier={1.15} numberOfLines={1}>
          {relative}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
  },
  thumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: PURA.paper,
    borderWidth: 1.5,
    borderColor: PURA.terracotta,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,20,16,0.08)',
  },
  copy: {
    flex: 1,
    paddingRight: 6,
  },
  kicker: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: PURA.terracotta,
    marginBottom: 2,
  },
  stage: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.ink,
    lineHeight: 18,
  },
  timestamp: {
    fontFamily: PURA_FONT.sans,
    fontSize: 11.5,
    color: PURA.muted,
    marginTop: 1,
  },
});
