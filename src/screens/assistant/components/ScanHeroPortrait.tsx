/**
 * ScanHeroPortrait — Cycle 12 (Imagery) Home hero accent.
 *
 * The user's latest SCANNED FACE is the recurring HERO of the app. On Home it
 * appears as a small framed editorial PORTRAIT in the masthead — the single
 * piece of real imagery that immediately ties this surface to *this* user.
 *
 * Brand framing (the shared imagery spec, applied here):
 *   • portrait ~4:5 ratio, generous rounded corners (dsRadius.xl)
 *   • a soft BOTTOM SCRIM (expo-linear-gradient, ds.scrim → transparent) so the
 *     overlaid focus-zone label + capture time stay AA+ legible over any photo
 *   • a subtle 1px hairline frame + a real elevation lift so it floats off the
 *     porcelain (never a raw unframed image)
 *   • the Pura-Blue intelligence orb sits as a small reactive BADGE clipped to
 *     the portrait's corner, carrying the orb's scan-aware tint onto the photo
 *
 * REAL DATA ONLY. The photo comes straight from canonical `scans[].photoUri`
 * (newest scan). When no scan photo exists yet, this degrades to an honest,
 * beautifully-framed LOCKED placeholder — same corners + frame, a scan glyph
 * and a one-line invitation — never a broken or gray box.
 *
 * It does not recompute scan state: scan-readiness, the focus-zone label, the
 * capture-time label and the orb tint are all passed in from `useAssistSignal`
 * (the canonical display contract), so this stays a thin presentational frame.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Image as RNImage, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LockSimple } from 'phosphor-react-native';

import {
  ds,
  dsElevation,
  dsRadius,
  dsSpace,
  dsTiming,
  dsType,
  fontFamily,
  puraAssist,
  tnum,
} from '@/theme';
import { ScanFrameGlyph } from '@/components/ScanFrameGlyph';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { AssistScanTone } from '@/state/assistSignal';
import { AssistantAuroraOrb } from '../AssistantAuroraOrb';

// Portrait sizing — a compact editorial 4:5 plate that floats top-right of the
// masthead headline. Big enough to read as a real face; small enough that the
// giant serif still owns the composition.
const PORTRAIT_W = 116;
const PORTRAIT_H = Math.round((PORTRAIT_W * 5) / 4); // 4:5 → 145

export interface ScanHeroPortraitProps {
  /** Canonical latest-scan photo. `null`/empty → honest locked placeholder. */
  photoUri: string | null;
  /** True when a scan exists to ground tonight's read. */
  scanReady: boolean;
  /** Focus-zone display label ("Chin", "Forehead", "Overall"). */
  focusZoneLabel: string;
  /** Capture-time label e.g. "9:41 PM", or undefined pre-scan. */
  timestampLabel?: string;
  /** Orb tint derived from the canonical scan. */
  scanTone: AssistScanTone;
  /** Tapping the hero opens the scan flow (placeholder) or full result. */
  onPress: () => void;
}

export function ScanHeroPortrait({
  photoUri,
  scanReady,
  focusZoneLabel,
  timestampLabel,
  scanTone,
  onPress,
}: ScanHeroPortraitProps) {
  const reduce = useReduceMotion();
  const hasPhoto = scanReady && !!photoUri && photoUri.length > 0;

  // Confirm the URI actually resolves to a real image before promoting it to a
  // hero. If it can't load (stale cache / missing file), we fall back to the
  // honest placeholder rather than showing a broken frame.
  const [resolved, setResolved] = useState<boolean>(false);
  useEffect(() => {
    let cancelled = false;
    setResolved(false);
    if (!hasPhoto || !photoUri) return;
    RNImage.getSize(
      photoUri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setResolved(true);
      },
      () => {
        /* keep placeholder on failure */
      },
    );
    return () => {
      cancelled = true;
    };
  }, [hasPhoto, photoUri]);

  const showPhoto = hasPhoto && resolved;

  // Gentle entrance — the plate settles in. Reduce-motion → instant.
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      p.value = 1;
      return;
    }
    p.value = withTiming(1, dsTiming.settle);
  }, [reduce, p, showPhoto]);
  const plateStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.96 + p.value * 0.04 }],
  }));

  const a11yLabel = useMemo(
    () =>
      showPhoto
        ? `Your latest scan${
            timestampLabel ? `, captured ${timestampLabel}` : ''
          }. Focus zone: ${focusZoneLabel}. Tap to view your skin.`
        : 'No scan yet. Tap to take a 30-second scan.',
    [showPhoto, timestampLabel, focusZoneLabel],
  );

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      hitSlop={6}
    >
      {({ pressed }) => (
        // Outer wrapper does NOT clip — it lets the orb badge overhang the
        // plate's rounded corner. The plate inside owns `overflow: hidden` so
        // the photo + scrims stay clipped to the radius.
        <Animated.View style={[styles.wrap, plateStyle]}>
          <View
            style={[
              styles.plate,
              showPhoto ? styles.plateLit : styles.platePlaceholder,
              pressed && styles.pressed,
            ]}
          >
            {showPhoto ? (
              <>
                {/* Real editorial portrait — cover-fit, mirrored to read like a
                    selfie. */}
                <ExpoImage
                  source={{ uri: photoUri as string }}
                  style={styles.image}
                  contentFit="cover"
                  transition={220}
                  cachePolicy="memory-disk"
                />
                {/* Bottom scrim — ink → transparent so the overlaid caption
                    holds AA+ legibility over any skin tone / lighting. */}
                <LinearGradient
                  pointerEvents="none"
                  colors={[ds.scrim, ds.scrimSoft, 'rgba(8,10,15,0)']}
                  locations={[0, 0.45, 1]}
                  start={{ x: 0.5, y: 1 }}
                  end={{ x: 0.5, y: 0 }}
                  style={styles.scrim}
                />
                {/* Cool top-light from the orb — a faint intelligence wash that
                    ties the photo to the blue accent. */}
                <LinearGradient
                  pointerEvents="none"
                  colors={[puraAssist.blue10, 'rgba(20,124,255,0)']}
                  start={{ x: 0.85, y: 0 }}
                  end={{ x: 0.3, y: 0.6 }}
                  style={styles.topLight}
                />
                {/* Overlaid caption — focus zone (editorial) + capture time. */}
                <View style={styles.caption} pointerEvents="none">
                  <Text style={styles.captionEyebrow}>Latest scan</Text>
                  <Text style={styles.captionZone} numberOfLines={1}>
                    {focusZoneLabel}
                  </Text>
                  {timestampLabel ? (
                    <Text style={styles.captionTime}>{timestampLabel}</Text>
                  ) : null}
                </View>
              </>
            ) : (
              // Honest locked placeholder — same frame language, no fake image.
              <View style={styles.placeholderInner}>
                <LinearGradient
                  pointerEvents="none"
                  colors={[puraAssist.blue08, puraAssist.bgClear]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.placeholderGlyph}>
                  <ScanFrameGlyph size={30} color={puraAssist.blue} strokeWidth={2} />
                </View>
                <Text style={styles.placeholderTitle}>Your face,{'\n'}read nightly</Text>
                <View style={styles.placeholderLockRow}>
                  <LockSimple size={11} color={puraAssist.veryMuted} weight="bold" />
                  <Text style={styles.placeholderHint}>Take a scan</Text>
                </View>
              </View>
            )}
          </View>

          {/* Orb badge — the Pura-Blue intelligence accent, scan-aware,
              overhanging the portrait's top-right corner. Kept AS-IS (no orb
              edits); it simply rides the hero plate so the photo reads as
              "seen" by Pura. Lives OUTSIDE the clipped plate so it's not cut. */}
          <View style={styles.orbBadge} pointerEvents="none">
            <View style={styles.orbBadgeRing}>
              <AssistantAuroraOrb
                size={34}
                state="idle"
                scanTone={showPhoto ? scanTone : 'none'}
              />
            </View>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Non-clipping wrapper sized to the plate — hosts the entrance animation and
  // lets the orb badge overhang the corner without being clipped.
  wrap: {
    width: PORTRAIT_W,
    height: PORTRAIT_H,
  },
  // The framed plate — generous radius + hairline + real elevation lift so it
  // floats off porcelain. `overflow: hidden` clips the photo + scrims to the
  // rounded corners.
  plate: {
    width: PORTRAIT_W,
    height: PORTRAIT_H,
    borderRadius: dsRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.border,
    backgroundColor: puraAssist.surface,
    overflow: 'hidden',
  },
  plateLit: { ...dsElevation.e3 },
  platePlaceholder: { ...dsElevation.e2 },
  pressed: { opacity: 0.92 },

  image: { ...StyleSheet.absoluteFillObject, transform: [{ scaleX: -1 }] },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  topLight: { position: 'absolute', left: 0, right: 0, top: 0, height: '55%' },

  caption: {
    position: 'absolute',
    left: dsSpace.md,
    right: dsSpace.md,
    bottom: dsSpace.md,
  },
  captionEyebrow: {
    ...dsType.labelSm,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 2,
  },
  captionZone: {
    fontFamily: fontFamily.serifSemi,
    fontSize: 19,
    lineHeight: 21,
    letterSpacing: -0.4,
    color: puraAssist.white,
  },
  captionTime: {
    ...dsType.caption,
    ...tnum,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 1,
  },

  // Placeholder — honest, framed, inviting. No gray box.
  placeholderInner: {
    flex: 1,
    paddingHorizontal: dsSpace.md,
    paddingVertical: dsSpace.base,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  placeholderGlyph: {
    width: 48,
    height: 48,
    borderRadius: dsRadius.md,
    backgroundColor: puraAssist.blue10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontFamily: fontFamily.serifSemi,
    fontSize: 17,
    lineHeight: 19,
    letterSpacing: -0.3,
    color: puraAssist.ink,
  },
  placeholderLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  placeholderHint: {
    ...dsType.labelSm,
    color: puraAssist.veryMuted,
  },

  // Orb badge — small reactive disc on a soft white ring, top-right corner.
  orbBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  orbBadgeRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: puraAssist.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.border,
    ...dsElevation.e2,
  },
});
