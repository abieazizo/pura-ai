/**
 * ScanRevealScreen — the screens 2–6 pager of the post-scan reveal arc.
 *
 * Screen 1 (analyzing) is its own surface (RevealAnalyzingSlide); once the AI
 * settles this pager takes over and walks the user through five framed beats:
 *   2  Your Skin Map        — face + colored zone overlays + concern chips
 *   3  Top Focus Areas      — three priority cards with close-up crops
 *   4  Personalized Insights— sparkle disc + three editorial cards
 *   5  Your Skin Plan       — four typographic pillars ("starts tonight")
 *   6  Ready when you are    — reassurance + "Build my routine" CTA
 *
 * Presentational + pure: it reads a canonical SkinState (never the store) via
 * the derivations in revealContent, so the same component drives both the live
 * flow and the dev fixture gallery. Slide motion is a single parent-level
 * translateX+fade (Expo-Go-safe — no animated SVG props).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Drop, Leaf, ShieldCheck, Sparkle, Star, Target } from 'phosphor-react-native';
import type { SkinState } from '@/types/canonical';
import {
  puraReveal,
  puraRevealLayout,
  puraRevealRadius,
  puraRevealShadow,
  puraRevealType,
} from '@/theme/tokens';
import {
  concernChips,
  deriveFocusAreas,
  deriveInsights,
  deriveMapOverlays,
  derivePillars,
  priorityTone,
  regionFocus,
  type InsightIcon,
  type MapOverlay,
} from './revealContent';
import { FloatingNext, RevealCTA, RevealHeader, RevealLink } from './revealChrome';

const SKIN_GRADIENT = ['#E8D2C2', '#D8B6A2', '#C99A86'] as const;
const TOTAL_STEPS = 6;
const LAST_STEP = 4; // step 0..4 → screens 2..6

const INSIGHT_ICON: Record<InsightIcon, typeof Drop> = {
  barrier: Drop,
  oil: Leaf,
  clarity: Star,
};

export interface ScanRevealScreenProps {
  skinState: SkinState;
  photoUri?: string;
  /** 0..4 → screens 2..6. Used by the dev gallery to jump straight to a beat. */
  initialStep?: number;
  /** Back from screen 2 (or any host-level exit). */
  onExit?: () => void;
  onBuildRoutine: () => void;
  onSkip?: () => void;
}

export function ScanRevealScreen({
  skinState,
  photoUri,
  initialStep = 0,
  onExit,
  onBuildRoutine,
  onSkip,
}: ScanRevealScreenProps) {
  const { width: vw } = useWindowDimensions();
  const [step, setStep] = useState(clampStep(initialStep));
  const dirRef = useRef(1);

  const tx = useSharedValue(0);
  const op = useSharedValue(1);

  useEffect(() => {
    tx.value = dirRef.current * 40;
    op.value = 0;
    tx.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    op.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [step, tx, op]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: op.value,
  }));

  const go = useCallback((next: number, dir: number) => {
    dirRef.current = dir;
    setStep(clampStep(next));
  }, []);

  const handleNext = useCallback(() => go(step + 1, 1), [go, step]);
  const handleBack = useCallback(() => {
    if (step > 0) go(step - 1, -1);
    else onExit?.();
  }, [go, step, onExit]);

  // Derivations (pure, memoized on the canonical state).
  const chips = useMemo(() => concernChips(skinState), [skinState]);
  const overlays = useMemo(() => deriveMapOverlays(skinState), [skinState]);
  const focus = useMemo(() => deriveFocusAreas(skinState), [skinState]);
  const insights = useMemo(() => deriveInsights(skinState), [skinState]);
  const pillars = useMemo(() => derivePillars(skinState), [skinState]);

  const contentW =
    Math.min(vw, puraRevealLayout.maxContentWidth) - puraRevealLayout.screenPadding * 2;
  const mapW = Math.round(contentW * 0.6);
  const mapH = Math.round(mapW * 1.14);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Slide footer={<FloatingNext onPress={handleNext} />}>
            <View style={styles.titleBlock}>
              <Text style={[puraRevealType.sectionTitle, { color: puraReveal.ink }]}>
                Your Skin Map
              </Text>
              <Text style={[puraRevealType.body, styles.subtext]}>
                Where each concern shows up on your skin.
              </Text>
            </View>

            <View style={styles.mapBlock}>
              <ZoneMapFrame photoUri={photoUri} overlays={overlays} width={mapW} height={mapH} />
            </View>

            {chips.length > 0 ? (
              <View style={styles.chipsRow}>
                {chips.map((c) => (
                  <View key={c.key} style={[styles.chip, { backgroundColor: c.soft }]}>
                    <Text style={[puraRevealType.tag, { color: c.color }]}>{c.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={[puraRevealType.cardTitle, { color: puraReveal.ink }]}>
                What it means
              </Text>
              <Text style={[puraRevealType.body, { color: puraReveal.muted, marginTop: 8 }]}>
                {skinState.summaryBody}
              </Text>
            </View>
          </Slide>
        );

      case 1:
        return (
          <Slide footer={<FloatingNext onPress={handleNext} />}>
            <View style={styles.titleBlock}>
              <Text style={[puraRevealType.sectionTitle, { color: puraReveal.ink }]}>
                Top Focus Areas
              </Text>
              <Text style={[puraRevealType.body, styles.subtext]}>
                The areas worth your attention first.
              </Text>
            </View>

            <View style={styles.stack}>
              {focus.map((f) => {
                const tone = priorityTone(f.priority);
                return (
                  <View key={f.key} style={styles.focusCard}>
                    <View style={styles.focusBody}>
                      <View style={styles.focusHead}>
                        <Target size={18} weight="bold" color={puraReveal.blue} />
                        <Text
                          style={[puraRevealType.concernName, { color: puraReveal.ink, flex: 1 }]}
                          numberOfLines={1}
                        >
                          {f.name}
                        </Text>
                        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
                          <Text style={[puraRevealType.priorityPill, { color: tone.color }]}>
                            {f.priority}
                          </Text>
                        </View>
                      </View>
                      <Text style={[puraRevealType.focusPhrase, { color: puraReveal.ink }]}>
                        {f.phrase}
                      </Text>
                    </View>
                    <CropImage photoUri={photoUri} region={f.region} width={92} height={116} />
                  </View>
                );
              })}
            </View>
          </Slide>
        );

      case 2:
        return (
          <Slide footer={<FloatingNext onPress={handleNext} />}>
            <View style={styles.insightHero}>
              <View style={styles.insightDisc}>
                <Sparkle size={44} weight="fill" color={puraReveal.blue} />
              </View>
              <Text
                style={[
                  puraRevealType.sectionTitle,
                  { color: puraReveal.ink, textAlign: 'center', marginTop: 18 },
                ]}
              >
                Personalized Insights
              </Text>
              <Text style={[puraRevealType.body, styles.subtextCenter]}>
                What your scan suggests for the weeks ahead.
              </Text>
            </View>

            <View style={styles.stack}>
              {insights.map((card) => {
                const Icon = INSIGHT_ICON[card.icon];
                return (
                  <View key={card.key} style={styles.insightCard}>
                    <View style={styles.insightIcon}>
                      <Icon size={30} weight="regular" color={card.iconColor} />
                    </View>
                    <View style={styles.insightCol}>
                      <Text style={[puraRevealType.concernName, { color: puraReveal.ink }]}>
                        {card.title}
                      </Text>
                      <Text
                        style={[puraRevealType.body, { color: puraReveal.muted, marginTop: 6 }]}
                      >
                        {card.body}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Slide>
        );

      case 3:
        return (
          <Slide footer={<FloatingNext onPress={handleNext} />}>
            <View style={styles.titleBlock}>
              <Text style={[puraRevealType.sectionTitle, { color: puraReveal.ink }]}>
                Your Skin Plan
              </Text>
              <Text style={[puraRevealType.displayItalic, { color: puraReveal.blue }]}>
                starts tonight
              </Text>
              <Text style={[puraRevealType.body, styles.subtext]}>
                Four simple steps, in the right order.
              </Text>
            </View>

            <View style={styles.pillarList}>
              {pillars.map((p, i) => (
                <View key={p.index}>
                  {i > 0 ? <View style={styles.pillarDivider} /> : null}
                  <View style={styles.pillarRow}>
                    <Text style={[puraRevealType.pillarNumber, { color: puraReveal.blue }]}>
                      {p.index}
                    </Text>
                    <View style={styles.pillarCol}>
                      <Text style={[puraRevealType.pillarName, { color: puraReveal.ink }]}>
                        {p.name}
                      </Text>
                      <Text
                        style={[puraRevealType.pillarDesc, { color: puraReveal.muted, marginTop: 4 }]}
                      >
                        {p.desc}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Slide>
        );

      case 4:
      default:
        return (
          <Slide
            center
            footerAlign="stretch"
            footer={
              <View style={styles.readyFooter}>
                <RevealCTA label="Build my routine" onPress={onBuildRoutine} />
                <RevealLink
                  label="Skip for now, I'll set up later."
                  onPress={onSkip ?? onExit ?? (() => {})}
                />
              </View>
            }
          >
            <View style={styles.readyHero}>
              <Text style={[puraRevealType.sectionTitle, styles.readyTitle]}>
                Ready when you are.
              </Text>
              <Text style={styles.readyTitle}>
                <Text style={[puraRevealType.sectionTitle, { color: puraReveal.ink }]}>Let’s </Text>
                <Text style={[puraRevealType.displayItalic, { color: puraReveal.blue }]}>
                  build it.
                </Text>
              </Text>

              <View style={styles.readyCircles}>
                {[Sparkle, Drop, Star].map((Icon, i) => (
                  <View key={i} style={styles.readyCircle}>
                    <Icon size={26} weight="regular" color={puraReveal.blue} />
                  </View>
                ))}
              </View>

              <View style={styles.shieldRow}>
                <ShieldCheck size={16} weight="fill" color={puraReveal.blue} />
                <Text style={[puraRevealType.body, { color: puraReveal.muted, flex: 1 }]}>
                  Every product is checked for your skin’s safety.
                </Text>
              </View>
            </View>
          </Slide>
        );
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <RevealHeader step={step + 2} total={TOTAL_STEPS} onBack={handleBack} />
        <Animated.View style={[styles.slide, slideStyle]}>{renderStep()}</Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Slide — shared frame: scrollable content + a pinned footer slot.
// ---------------------------------------------------------------------------

function Slide({
  children,
  footer,
  footerAlign = 'end',
  center = false,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerAlign?: 'end' | 'stretch';
  center?: boolean;
}) {
  return (
    <View style={styles.slideInner}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, center && styles.scrollCenter]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, footerAlign === 'end' ? styles.footerEnd : styles.footerStretch]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ZoneMapFrame — portrait photo (or neutral skin gradient) under translucent
// concern-colored zone ellipses. Static SVG only.
// ---------------------------------------------------------------------------

function ZoneMapFrame({
  photoUri,
  overlays,
  width,
  height,
}: {
  photoUri?: string;
  overlays: MapOverlay[];
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.frame, { width, height }]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={SKIN_GRADIENT}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        {overlays.map((o) => (
          <Ellipse
            key={o.key}
            cx={o.blob.cx * width}
            cy={o.blob.cy * height}
            rx={o.blob.rx * width}
            ry={o.blob.ry * height}
            fill={o.wash}
            stroke={o.color}
            strokeWidth={1.2}
            opacity={0.95}
          />
        ))}
      </Svg>

      <View style={styles.frameEdge} pointerEvents="none" />
    </View>
  );
}

function CropImage({
  photoUri,
  region,
  width,
  height,
}: {
  photoUri?: string;
  region: string;
  width: number;
  height: number;
}) {
  const dims = { width, height, borderRadius: puraRevealRadius.thumb };
  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={dims}
        contentFit="cover"
        contentPosition={regionFocus(region)}
      />
    );
  }
  return (
    <LinearGradient
      colors={SKIN_GRADIENT}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={dims}
    />
  );
}

function clampStep(s: number): number {
  if (s < 0) return 0;
  if (s > LAST_STEP) return LAST_STEP;
  return Math.round(s);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: puraReveal.bg },
  page: {
    flex: 1,
    paddingHorizontal: puraRevealLayout.screenPadding,
    paddingTop: 6,
    maxWidth: puraRevealLayout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  slide: { flex: 1 },
  slideInner: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 14, paddingBottom: 96 },
  scrollCenter: { flexGrow: 1, justifyContent: 'center' },

  footer: { paddingVertical: 14 },
  footerEnd: { alignItems: 'flex-end' },
  footerStretch: { alignItems: 'stretch' },

  titleBlock: { marginBottom: 6 },
  subtext: { color: puraReveal.muted, marginTop: 10, maxWidth: 320 },
  subtextCenter: {
    color: puraReveal.muted,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },

  // Screen 2 — Skin Map
  mapBlock: { alignItems: 'center', marginVertical: 16 },
  frame: {
    borderRadius: puraRevealRadius.cardLg,
    overflow: 'hidden',
    backgroundColor: puraReveal.porcelainDeep,
    ...puraRevealShadow.card,
  },
  frameEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: puraRevealRadius.cardLg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: puraRevealRadius.chip,
  },
  card: {
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.border,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...puraRevealShadow.card,
  },

  // Screen 3 — Focus Areas
  stack: { gap: puraRevealLayout.cardGap, marginTop: 4 },
  focusCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.border,
    padding: 14,
    ...puraRevealShadow.card,
  },
  focusBody: { flex: 1, justifyContent: 'center', gap: 10 },
  focusHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: puraRevealRadius.pill,
  },

  // Screen 4 — Insights
  insightHero: { alignItems: 'center', marginBottom: 22 },
  insightDisc: {
    width: puraRevealLayout.sparkleDisc,
    height: puraRevealLayout.sparkleDisc,
    borderRadius: puraRevealRadius.iconCircle,
    backgroundColor: puraReveal.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.border,
    padding: 16,
    ...puraRevealShadow.card,
  },
  insightIcon: {
    width: puraRevealLayout.insightIcon,
    height: puraRevealLayout.insightIcon,
    borderRadius: puraRevealRadius.iconCircle,
    backgroundColor: puraReveal.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCol: { flex: 1 },

  // Screen 5 — Skin Plan
  pillarList: {
    marginTop: 18,
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.border,
    paddingHorizontal: 20,
    paddingVertical: 6,
    ...puraRevealShadow.card,
  },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 18 },
  pillarCol: { flex: 1 },
  pillarDivider: { height: StyleSheet.hairlineWidth, backgroundColor: puraReveal.divider },

  // Screen 6 — Ready
  readyHero: { alignItems: 'center', paddingHorizontal: 8 },
  readyTitle: { textAlign: 'center', color: puraReveal.ink },
  readyCircles: { flexDirection: 'row', gap: 16, marginTop: 30 },
  readyCircle: {
    width: puraRevealLayout.readyIcon,
    height: puraRevealLayout.readyIcon,
    borderRadius: puraRevealRadius.iconCircle,
    backgroundColor: puraReveal.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 30,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: puraRevealRadius.card,
    backgroundColor: puraReveal.porcelain,
  },
  readyFooter: { gap: 6 },
});
