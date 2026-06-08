/**
 * ScanRevealScreen — the screens 2–6 pager of the post-scan reveal arc.
 *
 * Screen 1 (analyzing) is its own surface (RevealAnalyzingSlide); once the AI
 * settles this pager takes over and walks the user through five framed beats:
 *   2  Your Skin Map        — face (hero) + colored zone overlays + concern chips
 *   3  Top Focus Areas      — editorial finding cards (severity, trend, why, do)
 *   4  Personalized Insights— sparkle disc + three editorial cards
 *   5  Your Skin Plan       — four typographic pillars ("starts tonight")
 *   6  Ready when you are    — reassurance + "Build my routine" CTA
 *
 * Presentational + pure: it reads a canonical SkinState (never the store) via
 * the derivations in revealContent, so the same component drives both the live
 * flow and the dev fixture gallery. The parent beat transition is a single
 * translateX+fade (Expo-Go-safe — no animated SVG props); within the two card
 * beats the cards stream in on a short per-item stagger, and each FINDING lands
 * with a light haptic — polish layered inside the locked beats, never changing
 * their order, titles, step numbering, or transition timing.
 *
 * Cycle 5: the Focus beat is the editorial payoff of the whole arc. Each finding
 * is a designed card — a real severity meter + trend chip (canonical data that
 * used to be discarded), the summary as the "what it is" line, and grounded
 * "why it matters" / "what to do" copy — with the captured face as a hero crop.
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
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Drop, Leaf, Minus, ShieldCheck, Sparkle, Star, TrendDown, TrendUp } from 'phosphor-react-native';
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
  directionMeta,
  regionFocus,
  severityTone,
  SEVERITY_TICKS,
  type InsightIcon,
  type MapOverlay,
  type TrendIcon,
} from './revealContent';
import { FloatingNext, RevealCTA, RevealHeader, RevealLink } from './revealChrome';
import { PillarIcon } from '@/components/routine/pillarIdentity';
import { hapt } from '@/utils/haptics';

const SKIN_GRADIENT = ['#E8D2C2', '#D8B6A2', '#C99A86'] as const;
const TOTAL_STEPS = 6;
const LAST_STEP = 4; // step 0..4 → screens 2..6

const INSIGHT_ICON: Record<InsightIcon, typeof Drop> = {
  barrier: Drop,
  oil: Leaf,
  clarity: Star,
};

const TREND_ICON: Record<TrendIcon, typeof TrendUp> = {
  up: TrendUp,
  down: TrendDown,
  flat: Minus,
  new: Sparkle,
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

  // Per-finding haptic stream — each focus card lands with a light tap as it
  // staggers in. Scheduled only on the Focus beat; cleared on any beat change
  // or unmount so a delayed tap never fires on the wrong screen.
  const haptTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => {
    haptTimers.current.forEach(clearTimeout);
    haptTimers.current = [];
    if (step === 1 && focus.length > 0) {
      focus.forEach((_, i) => {
        haptTimers.current.push(setTimeout(() => hapt.tap(), 170 + i * 120));
      });
    }
    return () => {
      haptTimers.current.forEach(clearTimeout);
      haptTimers.current = [];
    };
  }, [step, focus]);

  const contentW =
    Math.min(vw, puraRevealLayout.maxContentWidth) - puraRevealLayout.screenPadding * 2;
  const mapW = Math.round(contentW * 0.72);
  const mapH = Math.round(mapW * 1.2);

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
                    <View style={[styles.chipDot, { backgroundColor: c.color }]} />
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
              {focus.map((f, i) => {
                const sev = severityTone(f.severity);
                const dir = directionMeta(f.direction);
                return (
                  <StaggerItem key={f.key} index={i}>
                    <View style={styles.findingCard}>
                      <View style={styles.findingTop}>
                        <CropPanel photoUri={photoUri} region={f.region} accent={f.color} />
                        <View style={styles.findingBody}>
                          <View style={styles.findingHead}>
                            <Text
                              style={[puraRevealType.concernName, { color: puraReveal.ink, flex: 1 }]}
                              numberOfLines={1}
                            >
                              {f.name}
                            </Text>
                            <TrendChip icon={dir.icon} label={dir.label} color={dir.color} bg={dir.bg} />
                          </View>

                          <View style={styles.meterRow}>
                            <SeverityMeter rank={f.severityRank} color={sev.color} />
                            <Text style={[puraRevealType.priorityPill, { color: sev.color }]}>
                              {sev.label}
                            </Text>
                          </View>

                          <Text
                            style={[puraRevealType.focusPhrase, { color: puraReveal.ink }]}
                          >
                            {f.phrase}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.findingDivider} />

                      <View style={styles.findingNote}>
                        <Text style={[puraRevealType.brandCaps, { color: puraReveal.veryMuted }]}>
                          Why it matters
                        </Text>
                        <Text style={[puraRevealType.body, { color: puraReveal.muted, marginTop: 5 }]}>
                          {f.why}
                        </Text>
                      </View>

                      <View style={styles.findingAction}>
                        <View style={[styles.actionMark, { backgroundColor: f.color }]} />
                        <View style={styles.findingActionCol}>
                          <Text style={[puraRevealType.brandCaps, { color: puraReveal.blueText }]}>
                            What to do
                          </Text>
                          <Text style={[puraRevealType.body, { color: puraReveal.ink, marginTop: 5 }]}>
                            {f.action}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </StaggerItem>
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
              {insights.map((card, i) => {
                const Icon = INSIGHT_ICON[card.icon];
                return (
                  <StaggerItem key={card.key} index={i}>
                    <View style={styles.insightCard}>
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
                  </StaggerItem>
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
                <View key={p.key}>
                  {i > 0 ? <View style={styles.pillarDivider} /> : null}
                  <View style={styles.pillarRow}>
                    <PillarIcon pillar={p.key} size={44} />
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
// StaggerItem — subtle per-card entrance (translateY + fade) on a short
// index-based delay. Layered inside a beat; never touches the parent beat
// transition. Expo-Go-safe (no layout animation, no animated SVG props).
// ---------------------------------------------------------------------------

function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  const ty = useSharedValue(14);
  const op = useSharedValue(0);

  useEffect(() => {
    const delay = index * 90;
    ty.value = withDelay(delay, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
    op.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [index, ty, op]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// SeverityMeter — segmented bar lit to the canonical severity rank (0..4).
// ---------------------------------------------------------------------------

function SeverityMeter({ rank, color }: { rank: number; color: string }) {
  return (
    <View style={styles.meter} accessibilityRole="progressbar">
      {Array.from({ length: SEVERITY_TICKS }).map((_, i) => (
        <View
          key={i}
          style={[styles.meterTick, { backgroundColor: i < rank ? color : puraReveal.ringTrack }]}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// TrendChip — movement vs the previous scan. "New" when there's no prior scan.
// ---------------------------------------------------------------------------

function TrendChip({
  icon,
  label,
  color,
  bg,
}: {
  icon: TrendIcon;
  label: string;
  color: string;
  bg: string;
}) {
  const Icon = TREND_ICON[icon];
  return (
    <View style={[styles.trendChip, { backgroundColor: bg }]}>
      <Icon size={11} weight="bold" color={color} />
      <Text style={[puraRevealType.priorityPill, { color }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// CropPanel — the captured face, framed to the finding's region. Stretches to
// the height of the card's top row so it reads as a hero rail, not a thumbnail.
// ---------------------------------------------------------------------------

function CropPanel({
  photoUri,
  region,
  accent,
}: {
  photoUri?: string;
  region: string;
  accent: string;
}) {
  return (
    <View style={styles.cropPanel}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={regionFocus(region)}
        />
      ) : (
        <LinearGradient
          colors={SKIN_GRADIENT}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[styles.cropAccent, { backgroundColor: accent }]} pointerEvents="none" />
      <View style={styles.cropEdge} pointerEvents="none" />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ZoneMapFrame — portrait photo (or neutral skin gradient) under translucent
// concern-colored zone ellipses, with a soft grounding scrim. Static SVG only.
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

      <LinearGradient
        colors={['transparent', 'rgba(8,10,15,0.16)']}
        start={{ x: 0.5, y: 0.6 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.frameScrim}
        pointerEvents="none"
      />

      <View style={styles.frameEdge} pointerEvents="none" />
    </View>
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
  mapBlock: { alignItems: 'center', marginVertical: 18 },
  frame: {
    borderRadius: puraRevealRadius.cardLg,
    overflow: 'hidden',
    backgroundColor: puraReveal.porcelainDeep,
    ...puraRevealShadow.float,
  },
  frameScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
  },
  frameEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: puraRevealRadius.cardLg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: puraRevealRadius.chip,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  card: {
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.border,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...puraRevealShadow.card,
  },

  // Screen 3 — Focus Areas (editorial findings)
  stack: { gap: puraRevealLayout.cardGap, marginTop: 4 },
  findingCard: {
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.border,
    padding: 16,
    ...puraRevealShadow.card,
  },
  findingTop: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  findingBody: { flex: 1, justifyContent: 'flex-start', gap: 9 },
  findingHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meter: { flexDirection: 'row', gap: 4, width: 68 },
  meterTick: { flex: 1, height: 4, borderRadius: 2 },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: puraRevealRadius.pill,
  },
  findingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraReveal.divider,
    marginTop: 14,
    marginBottom: 13,
  },
  findingNote: {},
  findingAction: { flexDirection: 'row', gap: 11, marginTop: 13, alignItems: 'flex-start' },
  findingActionCol: { flex: 1 },
  actionMark: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },

  // Face-crop rail
  cropPanel: {
    width: 88,
    alignSelf: 'stretch',
    minHeight: 118,
    borderRadius: puraRevealRadius.thumb,
    overflow: 'hidden',
    backgroundColor: puraReveal.porcelainDeep,
  },
  cropAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  cropEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: puraRevealRadius.thumb,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
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
