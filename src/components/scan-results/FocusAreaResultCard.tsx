/**
 * FocusAreaResultCard — single finding card on the Top Focus Areas
 * slide.
 *
 * v30.3 — refined card system.
 *
 * Card layout:
 *   header: zone illustration thumb + concern name + priority dot+word
 *   body  : short finding (one sentence) + recommended direction
 *
 * The thumb shows a tasteful crop of the user's actual photo when scan
 * quality + geometry support it. Otherwise it shows a soft zone
 * illustration (face silhouette with the relevant area highlighted)
 * tinted in the concern's color — honest about "this area was
 * inferred, not measured precisely" without looking broken.
 *
 * Pressing the card gives a subtle haptic tap (no destination — the
 * card is informational, not a navigation cue).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Image as RNImage,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Ellipse, Path, G } from 'react-native-svg';
import {
  concernVisuals,
  scanColors,
  scanRadius,
  scanShadows,
  scanType,
} from '@/theme/scanResultsTokens';
import type {
  ConcernPriority,
  FaceLandmarkResult,
  SemanticFaceZone,
  VisibleFinding,
} from '@/types/scanResults';
import { buildZonesCropRect } from '@/services/scanResults/faceGeometry';
import { hapt } from '@/utils/haptics';

const PRIORITY_LABEL: Record<ConcernPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function confidenceLabel(c: number): string {
  if (c >= 0.78) return 'Clear signal';
  if (c >= 0.6) return 'Visible signal';
  return 'Soft signal';
}

function ConfidencePips({
  confidence,
  tint,
}: {
  confidence: number;
  tint: string;
}) {
  const filled = confidence >= 0.78 ? 3 : confidence >= 0.6 ? 2 : 1;
  return (
    <View style={pipStyles.row}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            pipStyles.pip,
            {
              backgroundColor: i < filled ? tint : 'rgba(0,0,0,0)',
              borderColor: tint,
            },
          ]}
        />
      ))}
    </View>
  );
}

const pipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 3,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
});

export interface FocusAreaResultCardProps {
  finding: VisibleFinding;
  photoUri: string;
  geometry: FaceLandmarkResult | null;
  /** When true, the photo crop is suppressed — fall back to zone illustration. */
  suppressCrop?: boolean;
}

const CARD_THUMB_SIZE = 92;

export function FocusAreaResultCard({
  finding,
  photoUri,
  geometry,
  suppressCrop = false,
}: FocusAreaResultCardProps) {
  const visual = concernVisuals[finding.type];

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      photoUri,
      (w, h) => {
        if (!cancelled) setNatural({ w, h });
      },
      () => {
        if (!cancelled) setNatural({ w: 3, h: 4 });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [photoUri]);

  const cropStyle = useMemo(() => {
    if (suppressCrop || !geometry || !geometry.usableForOverlay || !natural) {
      return null;
    }
    const rect = buildZonesCropRect(finding.zones, geometry, 0.08);
    if (!rect) return null;
    const fullWidth = CARD_THUMB_SIZE / Math.max(0.01, rect.width);
    const fullHeight = CARD_THUMB_SIZE / Math.max(0.01, rect.height);
    return {
      width: fullWidth,
      height: fullHeight,
      transform: [
        { translateX: -fullWidth * rect.x },
        { translateY: -fullHeight * rect.y },
      ],
    };
  }, [finding.zones, geometry, suppressCrop, natural]);

  return (
    <Pressable
      onPress={() => hapt.select()}
      android_ripple={{ color: scanColors.line }}
      style={({ pressed }) => [
        styles.card,
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.thumb,
            { borderColor: visual.border },
          ]}
        >
          {cropStyle ? (
            <View style={styles.cropClip}>
              <ExpoImage
                source={{ uri: photoUri }}
                style={cropStyle}
                contentFit="cover"
                cachePolicy="memory"
              />
              <View
                style={[styles.thumbOverlay, { backgroundColor: visual.fill }]}
                pointerEvents="none"
              />
            </View>
          ) : (
            <ZoneIllustration
              zones={finding.zones}
              fillColor={visual.fill}
              strokeColor={visual.tint}
              washColor={visual.wash}
            />
          )}
        </View>

        <View style={styles.copyCol}>
          <View style={styles.headerRow}>
            <Text style={styles.name} maxFontSizeMultiplier={1.1}>
              {finding.displayName}
            </Text>
            <View style={styles.priorityRow}>
              <View
                style={[styles.priorityDot, { backgroundColor: visual.tint }]}
              />
              <Text
                style={[styles.priorityLabel, { color: visual.tint }]}
                maxFontSizeMultiplier={1.1}
              >
                {PRIORITY_LABEL[finding.priority]}
              </Text>
            </View>
          </View>
          <Text style={styles.findingText} maxFontSizeMultiplier={1.2}>
            {finding.shortFinding}
          </Text>
          <Text style={styles.directionText} maxFontSizeMultiplier={1.2}>
            {finding.recommendedDirection}
          </Text>
          <View style={styles.metaRow}>
            <ConfidencePips confidence={finding.confidence} tint={visual.tint} />
            <Text style={styles.metaLabel} maxFontSizeMultiplier={1.1}>
              {confidenceLabel(finding.confidence)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ZoneIllustration — soft face silhouette with the relevant zone(s)
// highlighted. Used when a real photo crop isn't supported.
// ---------------------------------------------------------------------------

const ZONE_PLACEMENT: Record<
  SemanticFaceZone,
  { cx: number; cy: number; rx: number; ry: number }
> = {
  forehead: { cx: 0.5, cy: 0.24, rx: 0.32, ry: 0.08 },
  t_zone: { cx: 0.5, cy: 0.45, rx: 0.1, ry: 0.18 },
  nose: { cx: 0.5, cy: 0.5, rx: 0.07, ry: 0.12 },
  left_cheek: { cx: 0.28, cy: 0.56, rx: 0.13, ry: 0.13 },
  right_cheek: { cx: 0.72, cy: 0.56, rx: 0.13, ry: 0.13 },
  under_eye_left: { cx: 0.35, cy: 0.42, rx: 0.09, ry: 0.04 },
  under_eye_right: { cx: 0.65, cy: 0.42, rx: 0.09, ry: 0.04 },
  chin: { cx: 0.5, cy: 0.81, rx: 0.18, ry: 0.06 },
};

function ZoneIllustration({
  zones,
  fillColor,
  strokeColor,
  washColor,
}: {
  zones: SemanticFaceZone[];
  fillColor: string;
  strokeColor: string;
  washColor: string;
}) {
  const size = CARD_THUMB_SIZE;
  // Face silhouette ellipse (more egg-shaped).
  const faceCx = 0.5 * size;
  const faceCy = 0.52 * size;
  const faceRx = 0.36 * size;
  const faceRy = 0.45 * size;
  return (
    <View style={[styles.illustration, { backgroundColor: washColor }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Face silhouette */}
        <Ellipse
          cx={faceCx}
          cy={faceCy}
          rx={faceRx}
          ry={faceRy}
          fill={scanColors.cardSoft}
          stroke={scanColors.line}
          strokeWidth={1}
        />
        {/* Subtle eye marks for orientation */}
        <Ellipse
          cx={0.37 * size}
          cy={0.38 * size}
          rx={0.025 * size}
          ry={0.012 * size}
          fill={scanColors.muted}
          opacity={0.5}
        />
        <Ellipse
          cx={0.63 * size}
          cy={0.38 * size}
          rx={0.025 * size}
          ry={0.012 * size}
          fill={scanColors.muted}
          opacity={0.5}
        />
        {/* Zone highlights */}
        <G>
          {zones.map((zone) => {
            const p = ZONE_PLACEMENT[zone];
            if (!p) return null;
            return (
              <G key={zone}>
                <Ellipse
                  cx={p.cx * size}
                  cy={p.cy * size}
                  rx={p.rx * size}
                  ry={p.ry * size}
                  fill={fillColor}
                />
                <Ellipse
                  cx={p.cx * size}
                  cy={p.cy * size}
                  rx={p.rx * size}
                  ry={p.ry * size}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={1.2}
                  opacity={0.85}
                />
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: scanColors.card,
    borderRadius: scanRadius.largeCard,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
    ...scanShadows.softLift,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  thumb: {
    width: CARD_THUMB_SIZE,
    height: CARD_THUMB_SIZE,
    borderRadius: scanRadius.smallCard,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: scanColors.cardSoft,
  },
  cropClip: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  illustration: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyCol: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: scanColors.ink,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  priorityLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  findingText: {
    ...scanType.body,
    color: scanColors.inkSoft,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  directionText: {
    ...scanType.body,
    color: scanColors.body,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  metaLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    letterSpacing: 0.4,
    color: scanColors.muted,
    textTransform: 'uppercase',
  },
});
