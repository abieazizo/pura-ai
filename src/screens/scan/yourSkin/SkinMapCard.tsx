/**
 * SkinMapCard — Section B. The user's real photo as a quiet "lit print" in a
 * raised card, with the SAME additive glow renderer + the SAME once-computed
 * face landmarks as screen 1. It is a calm map, never a mugshot:
 *
 *   • COLLAPSIBLE — a quiet control shrinks the photo to a thumbnail, so reading
 *     findings is never a forced stare at one's bare face. Engaged, not imposed.
 *   • ONE GLOW AT A TIME — the active finding's spots glow; selecting another
 *     fades the current spotlight out, THEN blooms the new one (a cross-fade that
 *     can never show two live glows; there is no "all glows" view).
 *   • MARKERS — each non-active finding is a faint, focusable ring at its
 *     landmark centroid (≥44px tap target), differing by ring/size/label, never
 *     colour alone. Tapping one selects its finding (bidirectional sync).
 *   • LOCATION LABEL — the active glow is paired with ONE plain on-photo label
 *     ("Left cheek"). NO leader lines (screen 2's rule).
 *   • SHOW ME CLEARLY — invisible until the user engages the map; then a quiet
 *     one-tap option briefly BRIGHTENS the active glow, then settles. Soft is
 *     the default.
 *
 * True-to-baseline + no-wash come for free: the glow is screen-blend ADDED light
 * clipped to a named region polygon, so it reads as luminous heat on EVERY skin
 * tone and structurally cannot wash a whole face.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GlowField, type GlowFieldHandle, type GlowSpotInput } from '../firstFinding/GlowField';
import {
  regionGeometry,
  type FaceBox,
  type RegionGeometry,
} from '../firstFinding/faceRegions';
import { metricTint, type MetricTint, type ScreenTheme } from '../firstFinding/metricTint';
import { REGION_LABEL, type MetricKind, type SkinReadFinding } from '@/types/skinRead';
import { hapt } from '@/utils/haptics';
import {
  COLLAPSE,
  COPY2,
  EASE,
  LAYOUT,
  SHOW_CLEARLY,
  SPOTLIGHT,
  TYPE2,
  type ThemeTokens,
} from './yourSkinMotion';

export type ToneBackdrop = 'light' | 'medium' | 'deep';

export interface SkinMapCardProps {
  /** The captured selfie. In production this is the real photo URI. */
  photoUri?: string;
  /** Dev/offline stand-in for the captured frame when there is no photoUri. */
  toneBackdrop?: ToneBackdrop;
  /** The face box — computed ONCE on the captured frame (screen 1), never here. */
  faceBox: FaceBox;
  /** Front-selfie mirroring (person-left == viewer-left). */
  mirrored: boolean;

  findings: SkinReadFinding[];
  /** The finding whose glow is lit. null → no glow (e.g. great-skin / no spots). */
  activeFindingId: string | null;
  onSelectFinding: (id: string) => void;

  theme: ScreenTheme;
  tokens: ThemeTokens;
  reduceMotion: boolean;
  reduceTransparency: boolean;

  collapsed: boolean;
  onToggleCollapse: () => void;
}

function metricWord(metric: MetricKind): string {
  switch (metric) {
    case 'redness': return 'redness';
    case 'dryness': return 'dryness';
    case 'dark_marks': return 'dark marks';
    case 'breakouts': return 'a few bumps';
    case 'oil': return 'a little shine';
    case 'positive': return 'looking good';
    default: return 'something to look at';
  }
}

export function SkinMapCard(props: SkinMapCardProps) {
  const {
    photoUri, toneBackdrop = 'medium', faceBox, mirrored,
    findings, activeFindingId, onSelectFinding,
    theme, tokens, reduceMotion, reduceTransparency,
    collapsed, onToggleCollapse,
  } = props;

  const { width } = useWindowDimensions();
  const frameW = Math.round(Math.max(168, Math.min(232, width * 0.52)));
  const frameH = Math.round(frameW / LAYOUT.photoAspect); // 3:4 portrait

  // ── Geometry — resolved ONCE per layout from the shared faceBox (never
  //    per frame, never recomputed upstream). One entry per finding that has a
  //    located strongest spot. ──────────────────────────────────────────────
  const geomByFinding = useMemo(() => {
    const map: Record<string, RegionGeometry | null> = {};
    for (const f of findings) {
      map[f.id] = f.strongestRegion
        ? regionGeometry(f.strongestRegion, faceBox, frameW, frameH, mirrored)
        : null;
    }
    return map;
  }, [findings, faceBox, frameW, frameH, mirrored]);

  const tintByFinding = useMemo(() => {
    const map: Record<string, MetricTint> = {};
    for (const f of findings) map[f.id] = metricTint(f.metric, theme);
    return map;
  }, [findings, theme]);

  // The active finding actually rendered in the glow (lags activeFindingId by
  // the fade-out half of the cross-fade so two glows are never lit at once).
  const [renderedId, setRenderedId] = useState<string | null>(activeFindingId);
  const glowRef = useRef<GlowFieldHandle>(null);
  const glowOpacity = useSharedValue(0);

  const activeRendered = findings.find((f) => f.id === renderedId) ?? null;
  const activeRenderedSpots: GlowSpotInput[] = useMemo(() => {
    if (!activeRendered) return [];
    return activeRendered.spots
      .map((s) => {
        const g = regionGeometry(s.region, faceBox, frameW, frameH, mirrored);
        return { geometry: g, strength: s.strength, chipLabel: s.place };
      })
      .slice(0, 4);
  }, [activeRendered, faceBox, frameW, frameH, mirrored]);

  // Bloom the hero glow on arrival.
  useEffect(() => {
    if (activeRenderedSpots.length === 0) return;
    if (reduceMotion) {
      glowOpacity.value = 1;
      glowRef.current?.settleAll();
      return;
    }
    glowOpacity.value = withTiming(1, { duration: SPOTLIGHT.inMs, easing: EASE.out });
    glowRef.current?.settleAll();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the single spotlight when the selection changes.
  const swapTo = useCallback(
    (id: string | null) => {
      setRenderedId(id);
      requestAnimationFrame(() => {
        if (reduceMotion) {
          glowOpacity.value = 1;
        } else {
          glowOpacity.value = withTiming(1, { duration: SPOTLIGHT.inMs, easing: EASE.out });
        }
        glowRef.current?.settleAll();
      });
    },
    [reduceMotion, glowOpacity],
  );

  useEffect(() => {
    if (activeFindingId === renderedId) return;
    if (reduceMotion) {
      swapTo(activeFindingId);
      return;
    }
    cancelAnimation(glowOpacity);
    glowOpacity.value = withTiming(0, { duration: SPOTLIGHT.outMs, easing: EASE.io }, (fin) => {
      if (fin) runOnJS(swapTo)(activeFindingId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFindingId]);

  // ── "Show me clearly" — a transient brighter copy of the SAME active glow. ──
  const [engaged, setEngaged] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const boostOpacity = useSharedValue(0);
  const boostRef = useRef<GlowFieldHandle>(null);

  const showClearly = useCallback(() => {
    if (boosting || activeRenderedSpots.length === 0) return;
    hapt.tap();
    setBoosting(true);
    requestAnimationFrame(() => boostRef.current?.settleAll());
    boostOpacity.value = withSequence(
      withTiming(1, { duration: SHOW_CLEARLY.upMs, easing: EASE.out }),
      withDelay(SHOW_CLEARLY.holdMs, withTiming(0, { duration: SHOW_CLEARLY.downMs, easing: EASE.io }, (fin) => {
        if (fin) runOnJS(setBoosting)(false);
      })),
    );
  }, [boosting, activeRenderedSpots.length, boostOpacity]);

  const selectFromMap = useCallback(
    (id: string) => {
      setEngaged(true);
      hapt.select();
      onSelectFinding(id);
    },
    [onSelectFinding],
  );

  const glowWrapStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const boostWrapStyle = useAnimatedStyle(() => ({ opacity: boostOpacity.value }));

  const cardDepth: ViewStyle = {
    boxShadow: [
      { offsetX: 0, offsetY: tokens.depth.contact.offsetY, blurRadius: tokens.depth.contact.blur, spreadDistance: 0, color: tokens.depth.contact.color },
      { offsetX: 0, offsetY: tokens.depth.ambient.offsetY, blurRadius: tokens.depth.ambient.blur, spreadDistance: 0, color: tokens.depth.ambient.color },
    ],
  } as ViewStyle;

  // ── Collapsed: a slim, calm bar — a tiny thumbnail + "Show photo". ──────────
  if (collapsed) {
    return (
      <View style={styles.centered}>
        <Pressable
          onPress={onToggleCollapse}
          accessibilityRole="button"
          accessibilityLabel={`${COPY2.mapShow}. Your photo is hidden.`}
          style={[styles.collapsedBar, { backgroundColor: tokens.frame, borderColor: tokens.frameHairline }, cardDepth]}
        >
          <View style={[styles.thumb, { borderColor: tokens.frameHairline }]}>
            {photoUri ? (
              <Image source={photoUri} style={StyleSheet.absoluteFillObject} contentFit="cover" cachePolicy="memory-disk" accessibilityIgnoresInvertColors accessibilityLabel="Your selfie" />
            ) : (
              <ToneBackdrop tone={toneBackdrop} />
            )}
          </View>
          <Text style={[TYPE2.quiet, { color: tokens.body }]} maxFontSizeMultiplier={1.6}>
            {COPY2.mapShow}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <View
        style={[styles.card, { width: frameW, height: frameH, borderRadius: LAYOUT.photoRadius, backgroundColor: tokens.frame }, cardDepth]}
        accessible={false}
      >
        <View style={[styles.frame, { borderRadius: LAYOUT.photoRadius, borderColor: tokens.frameHairline }]}>
          {/* The truth — the captured frame (or an explicit dev tone stand-in). */}
          {photoUri ? (
            <Image source={photoUri} style={StyleSheet.absoluteFillObject} contentFit="cover" cachePolicy="memory-disk" accessibilityIgnoresInvertColors accessibilityLabel="Your selfie" />
          ) : (
            <ToneBackdrop tone={toneBackdrop} />
          )}

          {/* Lit-print mute: ~6% desaturate + ~8% dim so the glow reads as ADD. */}
          {!reduceTransparency && (
            <View style={[StyleSheet.absoluteFill, styles.desat]} pointerEvents="none" />
          )}
          <View style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="none" />

          {/* Active glow (single, cross-faded). No chips/leader lines here. */}
          {activeRenderedSpots.length > 0 && (
            <Animated.View style={[StyleSheet.absoluteFill, glowWrapStyle]} pointerEvents="none">
              <GlowField
                ref={glowRef}
                spots={activeRenderedSpots}
                tint={tintByFinding[activeRendered!.id]}
                frameW={frameW}
                frameH={frameH}
                lowConfidence={!!activeRendered?.lowConfidence}
                reduceMotion={reduceMotion}
                reduceTransparency={reduceTransparency}
                renderChips={false}
                a11yLabel={glowA11y(activeRendered)}
              />
            </Animated.View>
          )}

          {/* "Show me clearly" — a transient brighter copy of the SAME glow. */}
          {boosting && activeRenderedSpots.length > 0 && (
            <Animated.View style={[StyleSheet.absoluteFill, boostWrapStyle]} pointerEvents="none">
              <GlowField
                ref={boostRef}
                spots={activeRenderedSpots}
                tint={tintByFinding[activeRendered!.id]}
                frameW={frameW}
                frameH={frameH}
                lowConfidence={false}
                reduceMotion={reduceMotion}
                reduceTransparency={reduceTransparency}
                renderChips={false}
                a11yLabel=""
              />
            </Animated.View>
          )}

          {/* Markers — every non-active finding, faint + focusable. */}
          {findings.map((f) => {
            if (f.id === renderedId) return null;
            const g = geomByFinding[f.id];
            if (!g) return null;
            return (
              <Marker
                key={`marker-${f.id}`}
                geometry={g}
                tint={tintByFinding[f.id]}
                lowConfidence={f.lowConfidence}
                label={`${REGION_LABEL[g.region]} — ${metricWord(f.metric)} — ${f.level}`}
                onPress={() => selectFromMap(f.id)}
              />
            );
          })}

          {/* One on-photo location label for the active glow — NO leader line. */}
          {activeRendered && activeRenderedSpots.length > 0 && (
            <LocationLabel
              geometry={activeRenderedSpots[0].geometry}
              place={activeRenderedSpots[0].chipLabel}
              tint={tintByFinding[activeRendered.id]}
              frameW={frameW}
              frameH={frameH}
              opacityStyle={glowWrapStyle}
              engaged={engaged}
              onShowClearly={showClearly}
            />
          )}

          {/* Top-lit inner highlight. */}
          <LinearGradient colors={[tokens.depth.innerHighlight, 'transparent']} style={styles.innerHighlight} pointerEvents="none" />
        </View>

        {/* Quiet collapse control. */}
        <Pressable
          onPress={onToggleCollapse}
          accessibilityRole="button"
          accessibilityLabel={COPY2.mapHide}
          hitSlop={10}
          style={[styles.hide, { backgroundColor: theme === 'dark' ? 'rgba(8,10,15,0.55)' : 'rgba(255,255,255,0.82)', borderColor: tokens.frameHairline }]}
        >
          <Text style={[TYPE2.quiet, { color: theme === 'dark' ? 'rgba(255,255,255,0.9)' : '#22252B', fontSize: 12 }]} maxFontSizeMultiplier={1.4}>
            {COPY2.mapHide}
          </Text>
        </Pressable>
      </View>

      {/* Accessible summary — the findings list below is the full equivalent. */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="Skin map of your photo. The marked areas match the findings list below; use the list to move between them."
        style={styles.a11ySummary}
        importantForAccessibility="yes"
      />
    </View>
  );
}

function glowA11y(f: SkinReadFinding | null): string {
  if (!f) return '';
  const places = f.spots.map((s) => s.place).join(' and ');
  const sided = f.spots.length > 1 ? `, strongest on ${f.spots[0].place}` : '';
  return `${metricWord(f.metric)}${places ? ` on ${places}` : ''}${sided}`;
}

// ───────────────────────────────────────────────────────────────────────────

function Marker({
  geometry, tint, lowConfidence, label, onPress,
}: {
  geometry: RegionGeometry;
  tint: MetricTint;
  lowConfidence: boolean;
  label: string;
  onPress: () => void;
}) {
  const { centroid } = geometry;
  // Differentiate WITHOUT colour: low-confidence reads as a smaller, thinner,
  // dashed ring — size + line style, not hue.
  const ringD = lowConfidence ? 9 : 12;
  const TAP = 44;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.markerHit, { width: TAP, height: TAP, left: centroid.x - TAP / 2, top: centroid.y - TAP / 2 }]}
    >
      <View
        style={{
          width: ringD,
          height: ringD,
          borderRadius: ringD / 2,
          borderWidth: lowConfidence ? 1 : 1.5,
          borderColor: tint.chipBorder,
          borderStyle: lowConfidence ? 'dashed' : 'solid',
          backgroundColor: 'transparent',
          opacity: 0.9,
        }}
      />
      <View style={{ position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: tint.line, opacity: 0.85 }} />
    </Pressable>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function LocationLabel({
  geometry, place, tint, frameW, frameH, opacityStyle, engaged, onShowClearly,
}: {
  geometry: RegionGeometry;
  place: string;
  tint: MetricTint;
  frameW: number;
  frameH: number;
  opacityStyle: ViewStyle;
  engaged: boolean;
  onShowClearly: () => void;
}) {
  const { centroid } = geometry;
  const estW = Math.min(frameW - 16, place.length * 7 + 22);
  const x = clamp(centroid.x - estW / 2, 6, frameW - estW - 6);
  const y = clamp(centroid.y - 40, 6, frameH - 52);
  return (
    <Animated.View style={[styles.labelWrap, { left: x, top: y }, opacityStyle]} pointerEvents="box-none">
      <View style={[styles.label, { backgroundColor: tint.chipBg, borderColor: tint.chipBorder }]} pointerEvents="none">
        <Text style={[TYPE2.mapLabel, { color: tint.chipText }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {place}
        </Text>
      </View>
      {/* "Show me clearly" — invisible until the map has been engaged. */}
      {engaged && (
        <Pressable onPress={onShowClearly} hitSlop={8} accessibilityRole="button" accessibilityLabel={COPY2.showClearly} style={styles.clearly}>
          <Text style={[TYPE2.quiet, { color: tint.chipText, fontSize: 12, opacity: 0.92 }]} maxFontSizeMultiplier={1.3}>
            {COPY2.showClearly}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ───────────────────────────────────────────────────────────────────────────
// ToneBackdrop — an explicit OFFLINE stand-in for the captured selfie (the dev
// harness has no bundled face). A soft, centre-lit oval over a darker surround
// reads as a lit portrait, so the region-contained additive glow + markers are
// demonstrable on light AND deep tones. Production renders the real photo.
// ───────────────────────────────────────────────────────────────────────────

const TONE: Record<ToneBackdrop, { base: string; lit: string; edge: string }> = {
  light:  { base: '#E8C7AE', lit: '#F3DCCB', edge: '#C79C82' },
  medium: { base: '#B07A56', lit: '#C99873', edge: '#7E5236' },
  deep:   { base: '#5A3A2A', lit: '#7A5238', edge: '#321F16' },
};

export function ToneBackdrop({ tone }: { tone: ToneBackdrop }) {
  const t = TONE[tone];
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient colors={[t.edge, t.base, t.edge]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      {/* centre-lit oval (the face) */}
      <View style={styles.faceOvalWrap}>
        <LinearGradient
          colors={[t.lit, t.base, 'transparent']}
          style={styles.faceOval}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  card: { alignItems: 'center', justifyContent: 'center' },
  frame: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  desat: { backgroundColor: 'rgba(128,128,128,0.06)' },
  dim: { backgroundColor: 'rgba(0,0,0,0.08)' },
  innerHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 40 },
  markerHit: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  labelWrap: { position: 'absolute', alignItems: 'center' },
  label: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearly: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3 },
  hide: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  a11ySummary: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  collapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: COLLAPSE.thumbWidth * 0.5,
    height: COLLAPSE.thumbWidth * 0.66,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  faceOvalWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  faceOval: { width: '78%', height: '64%', borderRadius: 999 },
});
