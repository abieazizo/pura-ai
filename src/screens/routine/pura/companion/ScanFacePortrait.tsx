/**
 * Scan Face Portrait — Cycle 12's signature imagery move.
 *
 * The user's real scan capture (`Scan.photoUri`) framed as a premium editorial
 * portrait that crowns the live companion. It is the recurring hero of the app:
 * a portrait-cropped band with generous rounded corners, a soft hairline frame,
 * a real downward lift, and a BOTTOM SCRIM (ink → transparent) so the greeting
 * and scan-day metadata stay AA+ legible over any capture. A whisper of cool
 * top-light gives a flat phone photo a little ambient depth.
 *
 * Real data only: the photo is the canonical `photoUri` passed from
 * PuraRoutineScreen → the live companion. When no scan photo exists yet the
 * component renders an honest, beautiful LOCKED placeholder (a calm Pura-Blue
 * dawn field with a camera glyph + invitation) — never a broken or gray box.
 *
 * Presentational. The host owns navigation; tapping the portrait (when a photo
 * exists and `onPress` is supplied) revisits the scan.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, ArrowRight } from 'phosphor-react-native';
import {
  CC,
  FACE_PLACEHOLDER_WASH,
  FACE_SCRIM,
  FACE_TOPLIGHT,
  companionGeo,
  companionShadows,
  companionType,
} from './companionTokens';

export interface ScanFacePortraitProps {
  /** Canonical `Scan.photoUri`. Undefined / empty → the locked placeholder. */
  photoUri?: string;
  /** Caps eyebrow (e.g. "TODAY'S SKIN"). */
  eyebrow: string;
  /** The editorial line set over the photo (the streak-aware greeting). */
  greeting: string;
  /** Quiet metadata under the greeting (e.g. "Day 6 · scanned Jun 8"). */
  meta?: string;
  /** Compact layout for short screens. */
  compact?: boolean;
  /** Tap → revisit the scan (only wired when a photo exists). */
  onPress?: () => void;
  /** Primary action for the locked (no-photo) placeholder. */
  onScan?: () => void;
}

export function ScanFacePortrait({
  photoUri,
  eyebrow,
  greeting,
  meta,
  compact = false,
  onPress,
  onScan,
}: ScanFacePortraitProps) {
  const height = compact
    ? companionGeo.faceBannerHeightCompact
    : companionGeo.faceBannerHeight;

  // ---- Locked placeholder (no real capture yet) --------------------------
  if (!photoUri) {
    return (
      <View
        style={[
          styles.frame,
          companionShadows.facePortrait,
          { height: Math.max(height - 28, 132) },
        ]}
      >
        <LinearGradient
          colors={FACE_PLACEHOLDER_WASH}
          locations={[0, 0.55, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.placeholderInner}>
          <View style={styles.placeholderIcon}>
            <Camera size={24} weight="regular" color={CC.blue} />
          </View>
          <View style={styles.placeholderCopy}>
            <Text style={companionType.facePlaceholderTitle}>
              Your face, your hero
            </Text>
            <Text style={companionType.facePlaceholderBody}>
              Scan your skin and your portrait anchors every routine.
            </Text>
          </View>
          {onScan ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan your skin"
              hitSlop={8}
              onPress={onScan}
              style={({ pressed }) => [
                styles.placeholderCta,
                pressed && styles.pressed,
              ]}
            >
              <ArrowRight size={18} weight="bold" color={CC.white} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.hairline} pointerEvents="none" />
      </View>
    );
  }

  // ---- Real editorial portrait -------------------------------------------
  const body = (
    <View style={[styles.frame, companionShadows.facePortrait, { height }]}>
      <Image
        source={{ uri: photoUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        transition={220}
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />

      {/* Cool top-light — gives a flat capture a little ambient sheen. */}
      <LinearGradient
        pointerEvents="none"
        colors={FACE_TOPLIGHT}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.8, y: 0.6 }}
        style={styles.topLight}
      />

      {/* Bottom scrim — keeps overlaid text AA+ legible on any photo. */}
      <LinearGradient
        pointerEvents="none"
        colors={FACE_SCRIM}
        locations={[0, 0.5, 0.82, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.overlay}>
        <Text style={companionType.faceEyebrow}>{eyebrow}</Text>
        <Text style={[companionType.faceGreeting, styles.greeting]} numberOfLines={2}>
          {greeting}
        </Text>
        {meta ? <Text style={[companionType.faceMeta, styles.meta]}>{meta}</Text> : null}
      </View>

      <View style={styles.hairline} pointerEvents="none" />
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Your latest skin scan. Tap to revisit."
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: companionGeo.faceRadius,
    backgroundColor: CC.white,
    overflow: 'hidden',
  },
  // A 1px inner hairline drawn over the image edge so the portrait reads as a
  // deliberately framed photograph, not a bleeding image.
  hairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: companionGeo.faceRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  topLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    marginTop: 7,
    // A faint cast so the serif clears a bright capture even before the scrim.
    textShadowColor: 'rgba(8, 10, 15, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  meta: {
    marginTop: 5,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  // Placeholder ------------------------------------------------------------
  placeholderInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 14,
  },
  placeholderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(20, 124, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCopy: {
    flex: 1,
    gap: 4,
  },
  placeholderCta: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CC.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...companionShadows.button,
  },
});
