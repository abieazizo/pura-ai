/**
 * v29 — Scan Review (rejected vs approved).
 *
 * Makes quality integrity visible. Two states:
 *
 *   • REJECTED — the captured image did not pass quality. The retake
 *     CTA is the only path forward. There is no "use anyway" override.
 *     Pura never produces findings from this state.
 *
 *   • APPROVED — the live frame had passed every quality check at
 *     capture time. Show calm confirmation pills and a single
 *     `Use this scan` action that runs the actual analyzeFaceScan
 *     and routes to BaselineRevealV2.
 *
 * This screen exists specifically to honor Rule 1: an unusable photo
 * must end in a mandatory retake, not in a fabricated baseline.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Check, CircleNotch, Warning } from 'phosphor-react-native';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import {
  EditorialHeadline,
  BodyText,
  Eyebrow,
  HelperText,
  PURA,
  PURA_FONT,
  PURA_RADIUS,
  PURA_SHADOW,
} from '@/components/onboarding/v2';
import { useOnboardingV2 } from '@/state/onboardingV2';
import { hapt } from '@/utils/haptics';
import { analyzeFaceScan } from '@/api/scan';
import { useAppStore } from '@/store/useAppStore';
import {
  type ObservationConfidence,
  type VisibleConcern,
  type VisibleObservation,
} from '@/state/onboardingV2';
import type { Scan } from '@/types';
import {
  recordScanQuality,
} from '@/ai/persistedTelemetry';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';

export interface ScanReviewV2Props {
  /** Approved -> baseline reveal. */
  onApproved: () => void;
  /** Rejected -> retake (or user cancel). */
  onRetake: () => void;
}

export function ScanReviewV2({ onApproved, onRetake }: ScanReviewV2Props) {
  const insets = useSafeAreaInsets();
  const capturedScanUri = useOnboardingV2((s) => s.capturedScanUri);
  const capturedQuality = useOnboardingV2((s) => s.capturedQuality);
  const setScanAnalysisResult = useOnboardingV2(
    (s) => s.setScanAnalysisResult
  );
  const setVisibleObservation = useOnboardingV2(
    (s) => s.setVisibleObservation
  );
  const scans = useAppStore((s) => s.scans);

  const status = capturedQuality?.status ?? 'rejected';
  const rejected = status !== 'approved';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onboardingV2.guidanceStateChanged(
      rejected ? 'captured' : 'captured'
    );
  }, [rejected]);

  const handleUse = useCallback(async () => {
    if (busy || rejected || !capturedScanUri) return;
    setBusy(true);
    setError(null);
    try {
      const previous = scans[scans.length - 1];
      const dayNumber = previous ? previous.dayNumber + 1 : 1;
      const scan: Scan = await analyzeFaceScan({
        photoUri: capturedScanUri,
        previousScan: previous,
        dayNumber,
      });
      setScanAnalysisResult(scan);
      // Honest observation derivation — see helper below.
      const observation = buildHonestObservation(scan, capturedQuality);
      setVisibleObservation(observation);
      const iq = scan.aiAnalysis?.image_quality;
      if (iq) {
        recordScanQuality({
          scanId: scan.id,
          confidence: iq.confidence ?? 1,
          branch:
            (iq.confidence ?? 1) < 0.7
              ? 'low_confidence_result'
              : 'normal_result',
          issues: iq.issues ?? [],
        });
      }
      hapt.success();
      onApproved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    rejected,
    capturedScanUri,
    capturedQuality,
    scans,
    setScanAnalysisResult,
    setVisibleObservation,
    onApproved,
  ]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusPillWrap]}>
          <View
            style={[
              styles.statusPill,
              rejected ? styles.statusPillRejected : styles.statusPillApproved,
            ]}
          >
            {rejected ? (
              <Warning
                size={14}
                color={PURA.terracottaPressed}
                weight="duotone"
              />
            ) : (
              <Check size={14} color="#3F5A4B" weight="bold" />
            )}
            <Text
              style={[
                styles.statusPillText,
                rejected
                  ? { color: PURA.terracottaPressed }
                  : { color: '#3F5A4B' },
              ]}
              maxFontSizeMultiplier={1.15}
            >
              {rejected ? "LET’S RETAKE THIS" : 'SCAN APPROVED'}
            </Text>
          </View>
        </View>

        <View style={styles.head}>
          <EditorialHeadline style={styles.headline}>
            {rejected
              ? 'Your full face isn’t visible.'
              : 'Clear enough to build your baseline.'}
          </EditorialHeadline>
          <BodyText style={styles.lead}>
            {rejected
              ? 'We need a clear view from forehead to chin before creating your baseline.'
              : 'Your full face is visible in even light.'}
          </BodyText>
        </View>

        {capturedScanUri ? (
          <View
            style={[
              styles.previewWrap,
              rejected && styles.previewDimmed,
            ]}
          >
            <View style={styles.previewFrame}>
              <Image
                source={{ uri: capturedScanUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
              {rejected ? (
                <View pointerEvents="none" style={styles.previewMask} />
              ) : null}
              {rejected ? (
                <View pointerEvents="none" style={styles.previewBadgeWrap}>
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewBadgeText}>Face incomplete</Text>
                  </View>
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewBadgeText}>Framing unavailable</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {rejected ? (
          <View style={styles.cardCorrection}>
            <Eyebrow style={styles.cardEyebrow}>FOR YOUR NEXT SCAN</Eyebrow>
            <CorrectionRow text="Face the camera directly" />
            <CorrectionRow text="Keep your full face inside the outline" />
            <CorrectionRow text="Use even, natural light" />
          </View>
        ) : (
          <View style={styles.qualityBadges}>
            <QualityBadge label="Full face visible" />
            <QualityBadge label="Lighting clear" />
            <QualityBadge label="Ready to analyze" />
          </View>
        )}

        {error ? (
          <View style={styles.errorCard}>
            <BodyText style={styles.errorText}>{error}</BodyText>
          </View>
        ) : null}

        <View style={styles.actions}>
          {rejected ? (
            <>
              <OnboardingPrimaryButton
                label="Retake scan"
                onPress={() => {
                  hapt.select();
                  onRetake();
                }}
                style={styles.primaryCta}
              />
              <Pressable
                onPress={() => {
                  hapt.tap();
                  onRetake();
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel for now"
                hitSlop={10}
                style={({ pressed }) => [
                  styles.secondaryWrap,
                  pressed && { opacity: 0.65 },
                ]}
              >
                <Text style={styles.secondaryLabel}>Cancel for now</Text>
              </Pressable>
            </>
          ) : (
            <>
              <OnboardingPrimaryButton
                label={busy ? 'Looking at visible skin…' : 'Use this scan'}
                onPress={handleUse}
                disabled={busy}
                style={styles.primaryCta}
              />
              {busy ? (
                <View style={styles.busyRow}>
                  <CircleNotch size={14} color={PURA.muted} weight="bold" />
                  <HelperText style={styles.busyText}>
                    This takes a moment.
                  </HelperText>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    hapt.tap();
                    onRetake();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Retake"
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.secondaryWrap,
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <Text style={styles.secondaryLabel}>Retake</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Honest observation derivation
// ---------------------------------------------------------------------------

/**
 * Build a VisibleObservation from the real Scan + the captured quality.
 *
 * Rule 1: insufficient confidence when capture quality is anything but
 * approved. Rule 2: never claim a concern Pura can't responsibly show.
 */
function buildHonestObservation(
  scan: Scan,
  capturedQuality: ReturnType<typeof useOnboardingV2.getState>['capturedQuality']
): VisibleObservation {
  if (!capturedQuality || capturedQuality.status !== 'approved') {
    return {
      confidence: 'insufficient',
      concern: 'uncertain',
      label: 'We need a clearer photo before creating your baseline.',
      summary:
        'No analysis runs on a scan that didn’t pass the quality check.',
      supportsOverlay: false,
    };
  }

  const iq = scan.aiAnalysis?.image_quality;
  const lowConfidence = iq && (iq.confidence ?? 1) < 0.7;
  if (lowConfidence) {
    return {
      confidence: 'uncertain',
      concern: 'uncertain',
      label: 'There isn’t one clear focus today.',
      summary:
        'We can still build a gentle routine around what matters to you.',
      supportsOverlay: false,
    };
  }

  const topConcern = scan.concerns?.[0];
  if (!topConcern || topConcern.severity === 'calm') {
    return {
      confidence: 'supported',
      concern: 'none',
      label: 'Your skin looks steady today.',
      summary: 'No single visible concern stands out in this scan.',
      supportsOverlay: false,
    };
  }

  const concernType = topConcern.category;
  const visibleArea = topConcern.region
    ? `around your ${topConcern.region}`
    : undefined;
  const label = buildLabelFor(concernType, visibleArea);
  const summary = topConcern.finding ?? 'Based on visible appearance only.';

  return {
    confidence: 'supported',
    concern: mapConcern(concernType),
    label,
    summary,
    visibleArea,
    supportsOverlay: false, // We don't have per-finding polygons in Expo Go yet.
  };
}

function mapConcern(category: string): VisibleConcern {
  switch (category) {
    case 'breakouts':
      return 'breakouts';
    case 'hydration':
      return 'dryness';
    case 'texture':
      return 'texture';
    case 'tone':
      return 'darkSpots';
    default:
      return 'uncertain';
  }
}

function buildLabelFor(category: string, visibleArea?: string): string {
  switch (category) {
    case 'breakouts':
      return visibleArea
        ? `We noticed possible breakout activity ${visibleArea}.`
        : 'We noticed possible breakout activity.';
    case 'hydration':
      return visibleArea
        ? `We noticed possible redness ${visibleArea}.`
        : 'We noticed possible visible dryness.';
    case 'texture':
      return 'We noticed possible visible texture.';
    case 'tone':
      return 'We noticed possible uneven tone.';
    default:
      return 'There isn’t one clear focus today.';
  }
}

// quiet imports retained for future
type _KeepObservationConfidence = ObservationConfidence;

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function CorrectionRow({ text }: { text: string }) {
  return (
    <View style={styles.correctionRow}>
      <View style={styles.correctionDot} />
      <Text style={styles.correctionText} maxFontSizeMultiplier={1.25}>
        {text}
      </Text>
    </View>
  );
}

function QualityBadge({ label }: { label: string }) {
  return (
    <View style={styles.qualityBadge}>
      <Check size={12} color="#3F5A4B" weight="bold" />
      <Text style={styles.qualityBadgeText} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PURA.paper },
  scroll: { paddingHorizontal: 24, paddingTop: 12 },
  statusPillWrap: { alignItems: 'flex-start', marginBottom: 14 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: PURA_RADIUS.pill,
  },
  statusPillApproved: { backgroundColor: '#E3ECDE' },
  statusPillRejected: { backgroundColor: '#F7E5DD' },
  statusPillText: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  head: { marginBottom: 18 },
  headline: { fontSize: 30, lineHeight: 36 },
  lead: { marginTop: 10, maxWidth: 380, color: PURA.body },
  previewWrap: { alignItems: 'center', marginBottom: 18 },
  previewDimmed: { opacity: 0.78 },
  previewFrame: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: PURA_RADIUS.reveal,
    overflow: 'hidden',
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
    ...PURA_SHADOW.soft,
  },
  previewMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,20,16,0.12)',
  },
  previewBadgeWrap: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(247,229,221,0.92)',
  },
  previewBadgeText: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.1,
    color: PURA.terracottaPressed,
    textTransform: 'uppercase',
  },
  cardCorrection: {
    backgroundColor: PURA.paperRaised,
    borderRadius: PURA_RADIUS.card,
    borderWidth: 1,
    borderColor: PURA.border,
    padding: 16,
    marginBottom: 18,
  },
  cardEyebrow: { marginBottom: 10 },
  correctionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  correctionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PURA.terracotta,
    marginTop: 8,
  },
  correctionText: {
    flex: 1,
    fontFamily: PURA_FONT.sans,
    fontSize: 14.5,
    lineHeight: 21,
    color: PURA.body,
  },
  qualityBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: PURA_RADIUS.pill,
    backgroundColor: '#E3ECDE',
  },
  qualityBadgeText: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 11.5,
    letterSpacing: 0.2,
    color: '#3F5A4B',
  },
  errorCard: {
    backgroundColor: '#F7E5DD',
    borderRadius: PURA_RADIUS.card,
    padding: 14,
    marginBottom: 12,
  },
  errorText: { color: PURA.terracottaPressed },
  actions: { marginTop: 6 },
  primaryCta: { marginHorizontal: 0, height: 56, borderRadius: 28 },
  secondaryWrap: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  secondaryLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.body,
    textDecorationLine: 'underline',
  },
  busyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  busyText: { color: PURA.muted },
});
