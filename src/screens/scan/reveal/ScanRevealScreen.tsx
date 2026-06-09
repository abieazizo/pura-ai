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
 *
 * Cycle 12 (IMAGERY): the scanned face is promoted to the recurring HERO of the
 * reveal and given ONE consistent editorial treatment across every beat that
 * shows it — Skin Map portrait, Focus cover banner, and the secondary finding
 * crop rails. Wherever the real `photoUri` exists it is framed as a premium
 * portrait: a true 4:5 (or banner) ratio, generous rounded corners, a deep
 * LAYERED bottom scrim (ds.scrim → transparent) so any overlaid white text
 * stays AA+ legible, a hairline brand frame + soft edge sheen, and a small
 * pinned "YOUR SCAN" capture kicker so each face reads as a figure from one
 * personal skin report. When no photo exists every surface falls back to the
 * SAME framed neutral-skin placeholder (never a raw/gray box). Imagery + the
 * compositing around it only — beat order, the 5 beats, titles, step numbering,
 * and the ~300ms pager timing are untouched.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Camera, Drop, Leaf, Minus, ShieldCheck, Sparkle, Star, TrendDown, TrendUp } from 'phosphor-react-native';
import type { SkinState } from '@/types/canonical';
import {
  puraReveal,
  puraRevealLayout,
  puraRevealRadius,
  puraRevealShadow,
  puraRevealType,
} from '@/theme/tokens';
import { ds, dsAmbient, dsElevation, dsGradient, dsRadius, tnum } from '@/theme';
import {
  BEAT_EYEBROWS,
  concernChips,
  deriveFocusAreas,
  deriveInsights,
  deriveMapOverlays,
  derivePillars,
  directionMeta,
  regionFocus,
  severityFraction,
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

// ---------------------------------------------------------------------------
// Color & gradient layer (Cycle 10) — richer, more sophisticated color depth
// without touching beat order, timing, or any business logic.
//
// The reveal arc used to sit on a single flat porcelain field with a SOLID
// Pura-Blue "Next" pill repeated across four beats — the accent flooded the
// surface and the page read depthless. This layer:
//   • lays a subtle time-neutral porcelain→ice ambient wash behind every beat
//     (dsAmbient.day.sky), so depth no longer rests on elevation alone;
//   • pulls the blue back: the persistent forward control is now INK
//     (dsGradient.inkCta), so blue PUNCTUATES (eyebrow, the sparkle hero, the
//     "build it." payoff, live data accents) instead of repeating;
//   • blooms the porcelain icon discs with a faint blue-wash gradient so the
//     sparkle / insight / ready circles gain color-based depth;
//   • fades content into the ambient field with a porcelain veil behind the
//     floating control. All stops come from the design system / shipped ramps.
// ---------------------------------------------------------------------------

/** Ambient page wash — porcelain leaning to a faint ice-blue at the foot. */
const AMBIENT_SKY = dsAmbient.day.sky;
/** Soft disc gradient — porcelain top → whisper of brand blue. Premium depth
 *  on the icon circles that were flat #EFF4FB fields. */
const DISC_WASH = [puraReveal.white, dsGradient.blueWash[0]] as const;
/** The sparkle disc is the Insights hero — a slightly richer blue bloom. */
const SPARKLE_WASH = [dsGradient.blueWash[0], dsGradient.blueWash[1]] as const;
/** Porcelain veil — dissolves scroll content into the ambient field behind the
 *  floating Next, echoing dsGradient.pageVeil but tuned to the wash foot. */
const VEIL = ['rgba(252,253,255,0)', 'rgba(247,250,255,0.92)'] as const;

// ---------------------------------------------------------------------------
// Cycle 12 — SHARED IMAGERY SPEC. One editorial treatment for the scanned face
// across every beat, so the whole reveal frames the hero photo ONE way.
//   • Portrait ratio ~4:5 (PORTRAIT_RATIO) for the Skin Map; the Focus cover
//     uses a taller editorial banner but the same scrim + frame language.
//   • A DEEP, layered bottom scrim built on the design-system ink scrim so
//     overlaid WHITE text clears AA+ no matter how light the photo is. The
//     middle stop never drops to near-zero (the old cover dipped to 0.04 and
//     risked illegible kickers); it steps 0 → soft → strong → near-opaque.
//   • A hairline brand frame + a faint inner white sheen so the portrait reads
//     as a deliberately mounted figure, never a raw image on porcelain.
//   • The SAME neutral-skin gradient placeholder (honest, never gray) when no
//     real photo is available.
// All overlay text colors are pure white / near-white on the scrim foot.
// ---------------------------------------------------------------------------

/** Editorial portrait aspect (height = width × this). 4:5. */
const PORTRAIT_RATIO = 1.25;

// The scrim ink is the design-system scrim color (ds.scrim) — same cool ink the
// rest of the app dims with — pushed to full opacity at the foot so white text
// clears AA+. Building the ramp from ds.scrim keeps the reveal's image dimming
// on the canonical token, not a one-off hex.
const SCRIM_INK = ds.scrim.replace(/[\d.]+\)$/, '');

/** Deep hero scrim for the FULL portrait (Skin Map) — legible white at the
 *  foot, glass-clear at the crown so the face stays the subject. */
const HERO_SCRIM = [
  `${SCRIM_INK}0)`,
  `${SCRIM_INK}0.06)`,
  `${SCRIM_INK}0.42)`,
  `${SCRIM_INK}0.84)`,
] as const;

/** Cover banner scrim — deep enough at the foot to carry the big serif concern
 *  title; the crown stays mostly clear for the pinned kicker + trend chip, which
 *  also get their own crown scrim. */
const COVER_SCRIM = [
  `${SCRIM_INK}0.14)`,
  `${SCRIM_INK}0.05)`,
  `${SCRIM_INK}0.34)`,
  `${SCRIM_INK}0.88)`,
] as const;

/** Crop-rail scrim — lighter (the rank/name live beside the rail, not on it)
 *  but still grounds the foot so the accent bar + region tag read as a caption
 *  edge. */
const CROP_SCRIM = [`${SCRIM_INK}0)`, `${SCRIM_INK}0.16)`, `${SCRIM_INK}0.52)`] as const;

/** Faint crown scrim behind a pinned white kicker so it clears AA over a bright
 *  forehead/skin crown. */
const KICKER_SCRIM = [`${SCRIM_INK}0.44)`, `${SCRIM_INK}0)`] as const;

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

// ---------------------------------------------------------------------------
// Editorial type layer (Cycle 9) — a thin set of local overrides on top of the
// shipped puraRevealType tokens. The reveal arc's headlines were a touch timid
// (28px serif, gentle tracking); editorial display wants to be LARGER and
// TIGHTER, uppercase markers want POSITIVE tracking, and every digit-bearing
// label wants tabular figures so meters/trends never jitter. We override only
// the few keys that carry the typographic weight of each beat — fonts, colors,
// and layout below stay on the locked tokens.
// ---------------------------------------------------------------------------

const SERIF_SEMI = 'InstrumentSerif-SemiBold';
const SERIF_REG = 'InstrumentSerif-Regular';
const SERIF_ITALIC = 'InstrumentSerif-Italic';

const rt = StyleSheet.create({
  // Section hero — right-sized up from 28→33 with tighter negative tracking so
  // the serif reads with editorial confidence at the top of each beat.
  heroTitle: {
    fontFamily: SERIF_SEMI,
    fontSize: 33,
    lineHeight: 35,
    letterSpacing: -1.0,
  },
  // The italic counter-line ("starts tonight" / "build it.") — paired one size
  // under the roman hero, generously tracked-in.
  heroItalic: {
    fontFamily: SERIF_ITALIC,
    fontSize: 31,
    lineHeight: 34,
    letterSpacing: -0.7,
  },
  // The "Ready when you are." opener — slightly quieter than the blue payoff
  // line beneath it, establishing a two-beat read.
  readyLead: {
    fontFamily: SERIF_SEMI,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
  },
  // The Focus beat's "what it is" line — the data-moment serif. Pushed up a
  // step (20→22) and tightened so it lands as the editorial payoff it is.
  focusPhrase: {
    fontFamily: SERIF_REG,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  // ---- Cycle 11 Focus masthead + cover (BOLD editorial "skin report") ----
  // Oversized serif masthead — the beat opens like a magazine cover, not a
  // section label. Dramatically larger than the standard 33px heroTitle.
  focusMastTitle: {
    fontFamily: SERIF_SEMI,
    fontSize: 52,
    lineHeight: 49,
    letterSpacing: -1.8,
  },
  // Tabular "01 — 03" running index, sat opposite the eyebrow.
  focusIndex: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.5,
    ...tnum,
  },
  // The hero cover's concern title, set large in serif OVER the face banner.
  coverTitle: {
    fontFamily: SERIF_SEMI,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1.2,
  },
  // White uppercase kicker pinned top-left of the cover banner.
  coverKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.92)',
  },
  // The cover's editorial "what it is" line — larger than the standard phrase.
  coverPhrase: {
    fontFamily: SERIF_REG,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  // Big severity word next to the arc gauge on the cover.
  gaugeLevel: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  // Tabular caption under the severity word ("severity · 3 of 4").
  gaugeUnit: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: 0.2,
    ...tnum,
  },
  // The "01 / 02 / 03" rank numeral on the secondary finding cards.
  findingRank: {
    fontFamily: SERIF_SEMI,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: -0.5,
    ...tnum,
  },
  // Secondary finding concern name — a step up from the shipped concernName.
  findingName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 19,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  // Big lit-rank numeral at the center of the cover's severity arc.
  arcNum: {
    fontFamily: 'Inter-Bold',
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.0,
    ...tnum,
  },
  // Faint "/ 4" denominator under the arc numeral.
  arcDen: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 13,
    letterSpacing: 0,
    marginTop: 1,
    ...tnum,
  },
  // The compact arc numeral on secondary finding cards.
  arcNumCompact: {
    fontFamily: 'Inter-Bold',
    fontSize: 19,
    lineHeight: 20,
    letterSpacing: -0.6,
    ...tnum,
  },
  // Tracked uppercase eyebrow — the section kicker above each hero.
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // In-card uppercase labels ("Why it matters" / "What to do" / "What it
  // means") — retracked from a timid 0.8 up to a crisp 1.3.
  microCaps: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  // Severity + trend pills — uppercase, tracked, AND tabular so the level word
  // and any digits sit on a stable rhythm next to the meter.
  metaPill: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    ...tnum,
  },
  // ---- Cycle 12 imagery overlays (WHITE on the hero scrim) ----
  // The pinned "YOUR SCAN" capture marker that brands every face as a figure
  // from one report. Tracked uppercase, near-white so it clears the top scrim.
  scanKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.94)',
  },
  // The zone-legend labels printed along the Skin Map portrait foot.
  mapLegend: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: 0.1,
    color: 'rgba(255,255,255,0.92)',
  },
  // The region tag printed at the foot of a secondary finding's crop rail.
  cropTag: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    lineHeight: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.94)',
  },
});

/**
 * The forward control, retinted INK for Cycle 10. The shipped FloatingNext is
 * a SOLID Pura-Blue pill; repeated across four beats it made the accent flood
 * the surface. Overriding only its background (via the chrome's own `style`
 * prop — no chrome edit) to near-black pulls the blue back so it can punctuate
 * the genuine accent moments. Its white label/caret already read on ink.
 */
function NextInk({ onPress }: { onPress: () => void }) {
  return <FloatingNext onPress={onPress} style={styles.nextInk} />;
}

/** Small tracked section kicker rendered above each beat's serif hero. */
function Eyebrow({ label, align = 'left' }: { label: string; align?: 'left' | 'center' }) {
  return (
    <Text
      style={[
        rt.eyebrow,
        { color: puraReveal.blue, textAlign: align },
        align === 'center' && styles.eyebrowCenter,
      ]}
    >
      {label}
    </Text>
  );
}

/**
 * ScanKicker (Cycle 12) — the white "YOUR SCAN" capture marker pinned to the
 * crown of a hero face. A frosted camera glyph + tracked label that sits on the
 * top scrim, so every framed face declares itself as a figure from the same
 * personal report.
 */
function ScanKicker({ label = 'Your scan' }: { label?: string }) {
  return (
    <View style={styles.scanKickerWrap}>
      <Camera size={12} weight="fill" color="rgba(255,255,255,0.94)" />
      <Text style={rt.scanKicker}>{label}</Text>
    </View>
  );
}

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
  // Cycle 12 — the Skin Map portrait is now the FULL-WIDTH hero of the beat (was
  // a timid 72%-width crop). A true editorial 4:5 portrait, capped so it never
  // crowds the chips/legend off a short screen.
  const mapW = contentW;
  const mapH = Math.round(Math.min(mapW * PORTRAIT_RATIO, 460));

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Slide footer={<NextInk onPress={handleNext} />}>
            <View style={styles.titleBlock}>
              <Eyebrow label={BEAT_EYEBROWS.map} />
              <Text style={[rt.heroTitle, styles.heroTitleText, { color: puraReveal.ink }]}>
                Your Skin Map
              </Text>
              <Text style={[puraRevealType.body, styles.subtext]}>
                Where each concern shows up on your skin.
              </Text>
            </View>

            {/* Cycle 12 — the scanned face as the full-width editorial HERO:
                4:5 portrait, deep foot scrim, brand frame, with the report's
                "YOUR SCAN" marker pinned at the crown and a concern-zone legend
                printed along the foot so the figure reads as a personal map. */}
            <View style={styles.mapBlock}>
              <LinearGradient
                colors={SPARKLE_WASH}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.mapGlow}
                pointerEvents="none"
              />
              <ZoneMapFrame
                photoUri={photoUri}
                overlays={overlays}
                width={mapW}
                height={mapH}
                legend={chips}
              />
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
              <Text style={[rt.microCaps, { color: puraReveal.veryMuted }]}>
                What it means
              </Text>
              <Text style={[puraRevealType.body, { color: puraReveal.muted, marginTop: 9 }]}>
                {skinState.summaryBody}
              </Text>
            </View>
          </Slide>
        );

      case 1:
        return (
          <Slide footer={<NextInk onPress={handleNext} />}>
            <View style={styles.focusMasthead}>
              <View style={styles.focusMastheadHead}>
                <Eyebrow label={BEAT_EYEBROWS.focus} />
                <Text style={[rt.focusIndex, { color: puraReveal.veryMuted }]}>
                  {`01 — ${pad2(focus.length)}`}
                </Text>
              </View>
              <Text style={[rt.focusMastTitle, { color: puraReveal.ink }]}>
                Your skin{'\n'}report
              </Text>
              <View style={styles.focusMastRule} />
              <Text style={[puraRevealType.body, styles.subtext]}>
                The areas worth your attention first — read in order.
              </Text>
            </View>

            <View style={styles.focusStack}>
              {focus.map((f, i) => {
                const sev = severityTone(f.severity);
                const dir = directionMeta(f.direction);
                const frac = severityFraction(f.severityRank);
                const hero = i === 0;
                return (
                  <StaggerItem key={f.key} index={i}>
                    {hero ? (
                      <View style={styles.coverCard}>
                        {/* Cycle 12 — the scanned face as the report's HERO cover:
                            a tall editorial banner cropped to the finding's
                            region, a deep legible foot scrim, the "primary focus"
                            marker + trend chip on a crown scrim, the big white
                            serif concern title and a "your scan" capture tag at
                            the foot, all inside the shared brand frame. */}
                        <View style={styles.coverBanner}>
                          <CoverImage photoUri={photoUri} region={f.region} />
                          <View style={styles.coverTopRow} pointerEvents="none">
                            <View style={styles.coverKickerPill}>
                              <View style={[styles.coverKickerDot, { backgroundColor: f.color }]} />
                              <Text style={rt.coverKicker}>Primary focus</Text>
                            </View>
                            <TrendChip icon={dir.icon} label={dir.label} color={dir.color} bg={dir.bg} />
                          </View>
                          <View style={styles.coverHeadline} pointerEvents="none">
                            <View style={styles.coverCaptureTag}>
                              <Camera size={11} weight="fill" color="rgba(255,255,255,0.92)" />
                              <Text style={rt.scanKicker}>{`Your scan · ${cap(f.region)}`}</Text>
                            </View>
                            <Text style={[rt.coverTitle, { color: '#FFFFFF' }]} numberOfLines={2}>
                              {f.name}
                            </Text>
                          </View>
                          <View style={styles.coverFrame} pointerEvents="none" />
                        </View>

                        {/* Severity data-viz strip — the magazine "score" moment */}
                        <View style={styles.coverGaugeRow}>
                          <SeverityArc fraction={frac} color={sev.color} size={92} />
                          <View style={styles.coverGaugeText}>
                            <Text style={[rt.gaugeLevel, { color: sev.color }]}>{sev.label}</Text>
                            <Text style={[rt.gaugeUnit, { color: puraReveal.veryMuted }]}>
                              {`severity · ${f.severityRank} of ${SEVERITY_TICKS}`}
                            </Text>
                          </View>
                        </View>

                        <Text style={[rt.coverPhrase, { color: puraReveal.ink }]}>
                          {f.phrase}
                        </Text>

                        <View style={styles.coverNotes}>
                          <View style={styles.coverNoteCol}>
                            <Text style={[rt.microCaps, { color: puraReveal.veryMuted }]}>
                              Why it matters
                            </Text>
                            <Text style={[puraRevealType.body, { color: puraReveal.muted, marginTop: 6 }]}>
                              {f.why}
                            </Text>
                          </View>
                          <View style={[styles.coverDoCard, { borderLeftColor: f.color }]}>
                            <Text style={[rt.microCaps, { color: puraReveal.blueText }]}>
                              What to do
                            </Text>
                            <Text style={[puraRevealType.body, { color: puraReveal.ink, marginTop: 6 }]}>
                              {f.action}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.findingCard}>
                        <View style={styles.findingTop}>
                          <CropPanel photoUri={photoUri} region={f.region} accent={f.color} />
                          <View style={styles.findingBody}>
                            <View style={styles.findingHead}>
                              <Text style={[rt.findingRank, { color: f.color }]}>{pad2(i + 1)}</Text>
                              <Text
                                style={[rt.findingName, { color: puraReveal.ink, flex: 1 }]}
                                numberOfLines={1}
                              >
                                {f.name}
                              </Text>
                              <TrendChip icon={dir.icon} label={dir.label} color={dir.color} bg={dir.bg} />
                            </View>

                            <View style={styles.meterRow}>
                              <SeverityArc fraction={frac} color={sev.color} size={56} compact />
                              <View style={{ flex: 1 }}>
                                <Text style={[rt.metaPill, { color: sev.color }]}>{sev.label}</Text>
                                <Text style={[rt.gaugeUnit, { color: puraReveal.veryMuted, marginTop: 2 }]}>
                                  {`${f.severityRank} of ${SEVERITY_TICKS}`}
                                </Text>
                              </View>
                            </View>

                            <Text style={[rt.focusPhrase, { color: puraReveal.ink }]}>
                              {f.phrase}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.findingDivider} />

                        <View style={styles.findingNote}>
                          <Text style={[rt.microCaps, { color: puraReveal.veryMuted }]}>
                            Why it matters
                          </Text>
                          <Text style={[puraRevealType.body, { color: puraReveal.muted, marginTop: 6 }]}>
                            {f.why}
                          </Text>
                        </View>

                        <View style={styles.findingAction}>
                          <View style={[styles.actionMark, { backgroundColor: f.color }]} />
                          <View style={styles.findingActionCol}>
                            <Text style={[rt.microCaps, { color: puraReveal.blueText }]}>
                              What to do
                            </Text>
                            <Text style={[puraRevealType.body, { color: puraReveal.ink, marginTop: 6 }]}>
                              {f.action}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </StaggerItem>
                );
              })}
            </View>
          </Slide>
        );

      case 2:
        return (
          <Slide footer={<NextInk onPress={handleNext} />}>
            <View style={styles.insightHero}>
              <View style={styles.insightDisc}>
                <LinearGradient
                  colors={SPARKLE_WASH}
                  start={{ x: 0.3, y: 0 }}
                  end={{ x: 0.7, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={styles.discRing} pointerEvents="none" />
                <Sparkle size={44} weight="fill" color={puraReveal.blue} />
              </View>
              <View style={styles.insightEyebrow}>
                <Eyebrow label={BEAT_EYEBROWS.insights} align="center" />
              </View>
              <Text
                style={[
                  rt.heroTitle,
                  { color: puraReveal.ink, textAlign: 'center', marginTop: 6 },
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
                        <LinearGradient
                          colors={DISC_WASH}
                          start={{ x: 0.3, y: 0 }}
                          end={{ x: 0.7, y: 1 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
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
          <Slide footer={<NextInk onPress={handleNext} />}>
            <View style={styles.titleBlock}>
              <Eyebrow label={BEAT_EYEBROWS.plan} />
              <Text style={[rt.heroTitle, styles.heroTitleText, { color: puraReveal.ink }]}>
                Your Skin Plan
              </Text>
              <Text style={[rt.heroItalic, styles.heroItalicText, { color: puraReveal.blue }]}>
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
              <Text style={[rt.readyLead, styles.readyTitle, { color: puraReveal.veryMuted }]}>
                Ready when you are.
              </Text>
              <Text style={[styles.readyTitle, styles.readyPayoff]}>
                <Text style={[rt.heroTitle, { color: puraReveal.ink }]}>Let’s </Text>
                <Text style={[rt.heroItalic, { color: puraReveal.blue }]}>
                  build it.
                </Text>
              </Text>

              <View style={styles.readyCircles}>
                {[Sparkle, Drop, Star].map((Icon, i) => (
                  <View key={i} style={styles.readyCircle}>
                    <LinearGradient
                      colors={DISC_WASH}
                      start={{ x: 0.3, y: 0 }}
                      end={{ x: 0.7, y: 1 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                    <Icon size={26} weight="regular" color={puraReveal.blue} />
                  </View>
                ))}
              </View>

              <View style={styles.shieldRow}>
                <LinearGradient
                  colors={DISC_WASH}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={styles.shieldRing} pointerEvents="none" />
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
      <LinearGradient
        colors={AMBIENT_SKY}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
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
        <View
          style={[styles.footer, footerAlign === 'end' ? styles.footerEnd : styles.footerStretch]}
        >
          <LinearGradient
            colors={VEIL}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.footerVeil}
            pointerEvents="none"
          />
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
// SeverityArc — the BOLD severity data-viz (Cycle 11). A thick ~270° dial that
// fills to the canonical severity fraction, with the lit rank as a large
// tabular numeral at its center ("3" over a faint "/4"). Replaces the timid
// 68px segmented bar so the magazine "score" reads in one second. Static SVG
// only (no animated SVG props) — Expo-Go-safe.
// ---------------------------------------------------------------------------

function SeverityArc({
  fraction,
  color,
  size,
  compact = false,
}: {
  fraction: number;
  color: string;
  size: number;
  compact?: boolean;
}) {
  const stroke = compact ? 5 : 8;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  // Draw a 3/4 dial (270°). The SVG starts at 3-o'clock; we rotate the whole
  // SVG container by 135° (RN transform → portable CSS transform) so the open
  // gap sits centered at the bottom. The numeral overlay lives in a separate,
  // un-rotated layer so the digits stay upright.
  const sweep = 0.75;
  const litRank = Math.round(fraction * SEVERITY_TICKS);
  const dashArc = circ * sweep;
  const gap = circ - dashArc;
  const litFrac = Math.max(0, Math.min(1, fraction));
  return (
    <View style={{ width: size, height: size }}>
      <View style={styles.arcRotor} pointerEvents="none">
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={puraReveal.ringTrack}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dashArc} ${gap}`}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dashArc * litFrac} ${circ}`}
          />
        </Svg>
      </View>
      <View style={styles.arcCenter} pointerEvents="none">
        {compact ? (
          <Text style={[rt.arcNumCompact, { color }]}>{litRank}</Text>
        ) : (
          <>
            <Text style={[rt.arcNum, { color: puraReveal.ink }]}>{litRank}</Text>
            <Text style={[rt.arcDen, { color: puraReveal.veryMuted }]}>{`/ ${SEVERITY_TICKS}`}</Text>
          </>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// CoverImage — the captured face as a full-bleed editorial banner across the
// top of the primary finding's cover card. A bottom-weighted ink scrim lets the
// large white serif title sit legibly over the photo (or a neutral skin
// gradient when no photo). Region-aware crop via the same regionFocus map.
// ---------------------------------------------------------------------------

function CoverImage({ photoUri, region }: { photoUri?: string; region: string }) {
  return (
    <>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={regionFocus(region)}
          transition={220}
        />
      ) : (
        <LinearGradient
          colors={SKIN_GRADIENT}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Crown scrim — backs the "primary focus" + trend chips. */}
      <LinearGradient
        colors={KICKER_SCRIM}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={styles.heroTopScrim}
        pointerEvents="none"
      />
      {/* Deep, layered foot scrim — carries the big white serif title with AA+
          headroom (the old middle stop dipped to 0.04 and risked illegibility). */}
      <LinearGradient
        colors={COVER_SCRIM}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </>
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
      <Text style={[rt.metaPill, { color }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// CropPanel (Cycle 12) — the captured face on a SECONDARY finding, framed to the
// finding's region and given the SAME editorial DNA as the heroes: a 4:5-leaning
// rail, a deep foot scrim, a small white region capture tag, the accent caption
// edge, and the shared brand frame + inner sheen. Stretches to the card's top
// row so it reads as a mounted portrait rail, not a bare thumbnail.
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
          transition={220}
        />
      ) : (
        <LinearGradient
          colors={SKIN_GRADIENT}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={CROP_SCRIM}
        start={{ x: 0.5, y: 0.4 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Text style={[rt.cropTag, styles.cropTag]} numberOfLines={1} pointerEvents="none">
        {cap(region)}
      </Text>
      <View style={[styles.cropAccent, { backgroundColor: accent }]} pointerEvents="none" />
      <View style={styles.cropEdge} pointerEvents="none" />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ZoneMapFrame (Cycle 12) — the SCANNED FACE as the beat's editorial hero.
// Full-width 4:5 portrait (real photo or the framed neutral-skin placeholder)
// under translucent concern-colored zone ellipses, then a DEEP design-system
// foot scrim that carries: the pinned "YOUR SCAN" capture marker at the crown,
// and a concern-zone legend printed along the foot. A hairline brand frame +
// inner sheen mount it as a figure from a personal report. Static SVG only.
// ---------------------------------------------------------------------------

function ZoneMapFrame({
  photoUri,
  overlays,
  width,
  height,
  legend = [],
}: {
  photoUri?: string;
  overlays: MapOverlay[];
  width: number;
  height: number;
  legend?: { key: string; label: string; color: string }[];
}) {
  return (
    <View style={[styles.frame, { width, height }]}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={220}
        />
      ) : (
        <LinearGradient
          colors={SKIN_GRADIENT}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Concern zones — vivid on the face (above the photo, under the foot
          scrim so the crown/cheeks stay saturated). */}
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
            strokeWidth={1.4}
            opacity={0.95}
          />
        ))}
      </Svg>

      {/* Faint crown scrim so the white capture marker clears AA over a bright
          forehead, and the deep foot scrim that backs the legend. */}
      <LinearGradient
        colors={KICKER_SCRIM}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.34 }}
        style={styles.heroTopScrim}
        pointerEvents="none"
      />
      <LinearGradient
        colors={HERO_SCRIM}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.mapKickerSlot} pointerEvents="none">
        <ScanKicker label="Your scan · skin map" />
      </View>

      {legend.length > 0 ? (
        <View style={styles.mapLegendSlot} pointerEvents="none">
          <View style={styles.mapLegendDots}>
            {legend.slice(0, 5).map((c) => (
              <View key={c.key} style={[styles.mapLegendDot, { backgroundColor: c.color }]} />
            ))}
          </View>
          <Text style={rt.mapLegend} numberOfLines={1}>
            {legend.length === 1 ? 'Top concern, mapped' : 'Top concerns, mapped'}
          </Text>
        </View>
      ) : null}

      <View style={styles.frameEdge} pointerEvents="none" />
    </View>
  );
}

function clampStep(s: number): number {
  if (s < 0) return 0;
  if (s > LAST_STEP) return LAST_STEP;
  return Math.round(s);
}

/** Zero-padded count for the editorial running index ("01", "03"). */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Humanize a canonical region key for an image caption ("left_cheek" →
 *  "Left cheek", "t_zone" → "T zone"). Keeps overlay captions readable without
 *  inventing data — falls back to a neutral "Overall" for the catch-all. */
function cap(region?: string): string {
  if (!region || region === 'overall') return 'Overall';
  const words = region.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const styles = StyleSheet.create({
  // The ambient LinearGradient owns the field now; the porcelain anchor below
  // it keeps the very base on-brand if the gradient ever fails to mount.
  root: { flex: 1, backgroundColor: puraReveal.bg },
  ambient: { ...StyleSheet.absoluteFillObject },
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
  // Porcelain veil rising behind the footer so scroll content dissolves into
  // the ambient field instead of clipping hard under the floating control.
  footerVeil: {
    position: 'absolute',
    left: -puraRevealLayout.screenPadding,
    right: -puraRevealLayout.screenPadding,
    bottom: 0,
    top: -34,
  },

  titleBlock: { marginBottom: 6 },
  // Eyebrow → hero spacing: a tight 8pt gap so the kicker reads as attached to
  // the headline, then the serif drops in.
  heroTitleText: { marginTop: 8 },
  heroItalicText: { marginTop: 1 },
  eyebrowCenter: { textAlign: 'center', alignSelf: 'center' },
  insightEyebrow: { marginTop: 16 },
  subtext: { color: puraReveal.muted, marginTop: 11, maxWidth: 320 },
  subtextCenter: {
    color: puraReveal.muted,
    marginTop: 9,
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },

  // Screen 2 — Skin Map (Cycle 12: full-width editorial portrait hero)
  mapBlock: { alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 18 },
  // Soft ice-blue halo blooming symmetrically just past the portrait frame,
  // seating the hero in the ambient field instead of floating on flat porcelain.
  mapGlow: {
    position: 'absolute',
    top: -14,
    bottom: -18,
    left: -10,
    right: -10,
    borderRadius: dsRadius.xl + 18,
    opacity: 0.7,
  },
  // The portrait mount — generous xl corners, a real lift, porcelain base under
  // the photo so a transparent PNG never flashes the page.
  frame: {
    borderRadius: dsRadius.xl,
    overflow: 'hidden',
    backgroundColor: puraReveal.porcelainDeep,
    ...dsElevation.e3,
  },
  // Pinned "your scan · skin map" marker, top-left of the portrait.
  mapKickerSlot: { position: 'absolute', top: 14, left: 14 },
  // Concern caption printed along the portrait foot, on the deep scrim: a row
  // of concern-accent dots + a quiet "Top concerns, mapped" figure caption.
  mapLegendSlot: { position: 'absolute', left: 16, right: 16, bottom: 15 },
  mapLegendDots: { flexDirection: 'row', gap: 5, marginBottom: 7 },
  mapLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  // Shared brand frame — a faint 1px white inner sheen that, with the dsElevation
  // lift below, mounts the portrait as a deliberate figure rather than a raw
  // image bleeding onto porcelain.
  frameEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: dsRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },

  // Crown scrim shared by the portrait + cover (backs the white kicker/chips).
  heroTopScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: '36%' },
  // The frosted "Your scan" capture marker (camera glyph + tracked label).
  scanKickerWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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

  // Screen 3 — Focus Areas (editorial "skin report")
  // Oversized serif masthead opening the beat.
  focusMasthead: { marginBottom: 18 },
  focusMastheadHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusMastRule: {
    height: 2,
    backgroundColor: puraReveal.ink,
    width: 46,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 1,
  },
  focusStack: { gap: 16, marginTop: 4 },
  // Insights (screen 4) card stack — unchanged spacing.
  stack: { gap: puraRevealLayout.cardGap, marginTop: 4 },

  // ---- Primary finding: full-bleed editorial cover card ----
  coverCard: {
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.cardLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.border,
    overflow: 'hidden',
    ...puraRevealShadow.float,
  },
  // Cycle 12 — taller editorial cover (was a squat 232). A magazine-cover crop
  // of the scanned face that opens the report; porcelain base under the photo.
  coverBanner: {
    height: 304,
    backgroundColor: puraReveal.porcelainDeep,
    justifyContent: 'space-between',
  },
  coverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  // Frosted "Primary focus" pill — reads on the photo crown without a hard chip.
  coverKickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: puraRevealRadius.pill,
    backgroundColor: 'rgba(8,10,15,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  coverKickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  coverHeadline: { paddingHorizontal: 20, paddingBottom: 18, gap: 9 },
  // Small "your scan · region" capture tag sat above the big white title.
  coverCaptureTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Shared brand frame on the cover banner (matches the portrait + crop rails).
  coverFrame: {
    ...StyleSheet.absoluteFillObject,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  // The severity data-viz strip directly under the banner.
  coverGaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  coverGaugeText: { flex: 1 },
  coverPhrase: { paddingHorizontal: 20, paddingTop: 12 },
  coverNotes: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 14 },
  coverNoteCol: {},
  coverDoCard: {
    backgroundColor: puraReveal.blue05,
    borderLeftWidth: 3,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },

  // ---- Secondary findings: editorial cards ----
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
  findingHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Rotates the dial SVG 135° so its open gap sits centered at the bottom.
  // Rotating the container (not per-Circle SVG props) keeps it portable across
  // SVG backends and avoids the web transform-origin warning.
  arcRotor: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ rotate: '135deg' }],
  },
  // Centered numeral overlay for the SeverityArc dial.
  arcCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  // Face-crop rail (Cycle 12 — a mounted portrait rail, same DNA as the heroes)
  cropPanel: {
    width: 96,
    alignSelf: 'stretch',
    minHeight: 132,
    borderRadius: dsRadius.md,
    overflow: 'hidden',
    backgroundColor: puraReveal.porcelainDeep,
    ...dsElevation.e1,
  },
  // Region capture tag, foot-left on the rail's scrim.
  cropTag: { position: 'absolute', left: 9, right: 8, bottom: 9 },
  cropAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  cropEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: dsRadius.md,
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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Faint brand ring around the sparkle hero — color-based depth, no extra blue
  // fill. Sits above the wash, under the glyph.
  discRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: puraRevealRadius.iconCircle,
    borderWidth: 1,
    borderColor: puraReveal.blue12,
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
    overflow: 'hidden',
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
  readyPayoff: { marginTop: 2 },
  readyCircles: { flexDirection: 'row', gap: 16, marginTop: 30 },
  readyCircle: {
    width: puraRevealLayout.readyIcon,
    height: puraRevealLayout.readyIcon,
    borderRadius: puraRevealRadius.iconCircle,
    backgroundColor: puraReveal.porcelain,
    overflow: 'hidden',
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
    overflow: 'hidden',
  },
  // Hairline brand ring on the trust strip — lets the blue-wash fill read as a
  // deliberate, contained safety note rather than a flat porcelain block.
  shieldRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: puraRevealRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.blue15,
  },
  readyFooter: { gap: 6 },

  // Forward "Next" pill, retinted from solid Pura-Blue to near-black ink so the
  // accent stops repeating across four beats. A faint cool-ink shadow keeps it
  // reading as the primary forward action; the white label/caret stay legible.
  nextInk: {
    backgroundColor: puraReveal.ctaInk,
    shadowColor: dsGradient.inkCta[1],
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
});
