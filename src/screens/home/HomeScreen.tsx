import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Line } from 'react-native-svg';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkle,
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import {
  selectNextMorningStep,
  useAppStore,
  useDayNumber,
} from '@/store/useAppStore';
import { seedProducts } from '@/data/seed';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { useShallow } from 'zustand/react/shallow';
import type { SkinZoneKey, Scan } from '@/types';

/**
 * Home — v8 cool premium-software rebuild.
 *
 * Three states compose the same page shell:
 *
 *   Day 0   — no scans yet. The page is an intentional, editorial welcome
 *             state: a single primary CTA, no fabricated data.
 *   Day 1   — one scan complete. Show the score cleanly; no delta yet.
 *   Day N   — ≥ 2 scans. Full command center: insight headline, skin
 *             intelligence constellation, routine, curated rec, progress
 *             delta.
 *
 * Structural rules:
 *   - No date strip (removed per brief — redundant with OS and adds noise).
 *   - No pull-quote at bottom (was lifestyle-brand energy).
 *   - The strongest thing on the screen is personalized intelligence —
 *     a serif insight headline derived from the user's data, not a
 *     decorative graphic.
 *   - Recommendation reads as curation ("Because your chin flagged active
 *     last scan") — not as commerce.
 */

const ZONE_ORDER: SkinZoneKey[] = ['forehead', 'tZone', 'chin', 'cheeks'];
const ZONE_LABEL: Record<SkinZoneKey, string> = {
  forehead: 'Forehead',
  tZone: 'T-zone',
  chin: 'Chin',
  cheeks: 'Cheeks',
  nose: 'Nose',
  jawline: 'Jawline',
};

// Spatial layout for the constellation SVG — normalized coords inside a 280×200 box.
const CONSTELLATION: Record<SkinZoneKey, { x: number; y: number }> = {
  forehead: { x: 0.50, y: 0.18 },
  tZone:    { x: 0.50, y: 0.50 },
  chin:     { x: 0.50, y: 0.86 },
  cheeks:   { x: 0.20, y: 0.55 }, // left cheek anchor; right cheek mirrored
  nose:     { x: 0.50, y: 0.50 },
  jawline:  { x: 0.50, y: 0.86 },
};

export function HomeScreen() {
  // Composite nav — we push within the HomeStack (Products, ProductDetail,
  // CategoryView) AND dispatch to the root stack (ScanModal). Typing
  // permissively here keeps the call sites readable; both stacks are
  // registered so navigate() will find the right route at runtime.
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Data
  const scans = useAppStore((s) => s.scans);
  const user = useAppStore(
    useShallow((s) => ({ name: s.name, initials: s.user?.initials ?? null }))
  );
  const dayNumber = useDayNumber();
  const nextStep = useAppStore(selectNextMorningStep);
  const morningLen = useAppStore(
    (s) => s.routine.filter((r) => r.slot === 'morning').length
  );
  const eveningLen = useAppStore(
    (s) => s.routine.filter((r) => r.slot === 'evening').length
  );
  const markStepDone = useAppStore((s) => s.markStepDone);

  // State derivation
  const homeState: 'day0' | 'day1' | 'dayN' =
    scans.length === 0 ? 'day0' : scans.length === 1 ? 'day1' : 'dayN';

  const latest = scans[scans.length - 1];
  const previous = scans.length >= 2 ? scans[scans.length - 2] : null;
  const first = scans[0];

  const firstName = (user.name || '').split(/\s+/)[0] || null;
  const greeting = useMemo(() => buildGreeting(firstName), [firstName]);

  const handleTakeScan = () => {
    hapt.tap();
    nav.navigate('ScanModal');
  };

  const handleOpenProducts = () => {
    hapt.select();
    // Products lives inside HomeStack now (demoted from a primary tab) —
    // a straight `navigate` from within HomeScreen targets the right slot.
    nav.navigate('Products');
  };

  const bottomClearance = insets.bottom + 120;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <HomeBrandBar
        streakDays={homeState === 'dayN' ? dayNumber : 0}
        initials={user.initials ?? firstName?.[0]?.toUpperCase() ?? null}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomClearance }}
        showsVerticalScrollIndicator={false}
      >
        {homeState === 'day0' ? (
          <Day0Body greeting={greeting} onScan={handleTakeScan} onProducts={handleOpenProducts} />
        ) : null}

        {homeState === 'day1' ? (
          <Day1Body
            greeting={greeting}
            latest={latest!}
            morningLen={morningLen}
            nextStep={nextStep}
            onMarkStepDone={markStepDone}
          />
        ) : null}

        {homeState === 'dayN' ? (
          <DayNBody
            greeting={greeting}
            latest={latest!}
            previous={previous}
            first={first}
            dayNumber={dayNumber}
            morningLen={morningLen}
            eveningLen={eveningLen}
            nextStep={nextStep}
            onMarkStepDone={markStepDone}
            onScan={handleTakeScan}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Brand bar
// ============================================================================

function HomeBrandBar({
  streakDays,
  initials,
}: {
  streakDays: number;
  initials: string | null;
}) {
  return (
    <View style={styles.brandBar}>
      <View style={styles.brandLeft}>
        <PuraMark size={22} variant="idle" />
        <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
          PURA
        </Text>
      </View>

      <View style={styles.brandRight}>
        {streakDays >= 2 ? (
          <View style={styles.streakPill}>
            <Sparkle size={12} color={palette.clay} weight="duotone" />
            <Text style={styles.streakLabel} maxFontSizeMultiplier={1.1}>
              {`${streakDays} DAY${streakDays === 1 ? '' : 'S'}`}
            </Text>
          </View>
        ) : null}

        {initials ? (
          <View style={styles.avatarPill}>
            <Text style={styles.avatarInitials} maxFontSizeMultiplier={1.1}>
              {initials}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================================
// Command strip — greeting + AI insight headline (all three states)
// ============================================================================

function CommandStrip({
  greeting,
  headline,
  subline,
}: {
  greeting: string;
  headline: string;
  subline?: string | null;
}) {
  return (
    <View style={styles.command}>
      <Text style={styles.greeting} maxFontSizeMultiplier={1.2}>
        {greeting}
      </Text>
      <Text
        style={styles.headline}
        maxFontSizeMultiplier={1.15}
        numberOfLines={3}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {headline}
      </Text>
      {subline ? (
        <Text style={styles.subline} maxFontSizeMultiplier={1.2}>
          {subline}
        </Text>
      ) : null}
    </View>
  );
}

// ============================================================================
// DAY 0 — Welcome state, no scans yet
// ============================================================================

function Day0Body({
  greeting,
  onScan,
  onProducts,
}: {
  greeting: string;
  onScan: () => void;
  onProducts: () => void;
}) {
  return (
    <View>
      <CommandStrip
        greeting={greeting}
        headline={'Let\u2019s meet your skin.'}
        subline={'Thirty seconds now, thirty seconds tomorrow \u2014 I\u2019ll do the rest.'}
      />

      <View style={styles.day0Mark}>
        <PuraMark size={120} variant="idle" glow />
      </View>

      <View style={styles.ctaStack}>
        <PrimaryCta label="Start your first scan" onPress={onScan} />
        <GhostCta label="Explore the catalog first" onPress={onProducts} />
      </View>

      <Text style={styles.microFootnote} maxFontSizeMultiplier={1.2}>
        Most users see measurable change by week two.
      </Text>
    </View>
  );
}

// ============================================================================
// DAY 1 — First scan complete
// ============================================================================

function Day1Body({
  greeting,
  latest,
  morningLen,
  nextStep,
  onMarkStepDone,
}: {
  greeting: string;
  latest: Scan;
  morningLen: number;
  nextStep: ReturnType<typeof selectNextMorningStep>;
  onMarkStepDone: (id: string) => void;
}) {
  const insightHeadline = latest.summaryHeadline || 'Your reading is ready.';
  return (
    <View>
      <CommandStrip
        greeting={greeting}
        headline={insightHeadline}
        subline={null}
      />

      <ScorePanel
        kicker="YOUR FIRST READING"
        score={latest.overallScore}
        deltaLabel={'Compare begins tomorrow.'}
        deltaColor={palette.inkTertiary}
      />

      {latest.summaryBody ? (
        <InsightCard
          kicker="WHAT I SEE"
          body={latest.summaryBody}
        />
      ) : null}

      {nextStep && morningLen > 0 ? (
        <TodayRoutineRow
          stepIndex={nextStep.order}
          totalSteps={morningLen}
          productName={productNameFor(nextStep.productId)}
          brand={productBrandFor(nextStep.productId)}
          instruction={nextStep.instruction}
          completed={!!nextStep.completedAt}
          onMarkDone={() => onMarkStepDone(nextStep.id)}
        />
      ) : null}
    </View>
  );
}

// ============================================================================
// DAY N — full command center
// ============================================================================

function DayNBody({
  greeting,
  latest,
  previous,
  first,
  dayNumber,
  morningLen,
  eveningLen,
  nextStep,
  onMarkStepDone,
  onScan,
}: {
  greeting: string;
  latest: Scan;
  previous: Scan | null;
  first: Scan;
  dayNumber: number;
  morningLen: number;
  eveningLen: number;
  nextStep: ReturnType<typeof selectNextMorningStep>;
  onMarkStepDone: (id: string) => void;
  onScan: () => void;
}) {
  const delta = previous ? latest.overallScore - previous.overallScore : 0;
  const sinceFirst = latest.overallScore - first.overallScore;

  const insightHeadline =
    latest.summaryHeadline || buildInsightHeadline(latest, delta);

  // Find a recommended product by category — pick first moisturizer or serum
  // as a stand-in. Real recs land with the RecommendationEngine work; the
  // module here delivers the _shape_ of curated evidence.
  const recProduct = useMemo(() => {
    return (
      seedProducts.find((p) => p.category === 'serum') ??
      seedProducts.find((p) => p.category === 'moisturizer') ??
      null
    );
  }, []);

  const recRationale = useMemo(
    () => buildRecRationale(latest),
    [latest]
  );

  return (
    <View>
      <CommandStrip
        greeting={greeting}
        headline={insightHeadline}
        subline={null}
      />

      <ScorePanel
        kicker={`DAY ${dayNumber}  \u00B7  SKIN SCORE`}
        score={latest.overallScore}
        deltaLabel={deltaLabelFor(delta)}
        deltaColor={colorForDelta(delta)}
      />

      <SkinReport scan={latest} />

      {nextStep && morningLen > 0 ? (
        <TodayRoutineRow
          stepIndex={nextStep.order}
          totalSteps={morningLen}
          productName={productNameFor(nextStep.productId)}
          brand={productBrandFor(nextStep.productId)}
          instruction={nextStep.instruction}
          completed={!!nextStep.completedAt}
          onMarkDone={() => onMarkStepDone(nextStep.id)}
        />
      ) : null}

      {eveningLen > 0 ? (
        <TonightRow stepCount={eveningLen} />
      ) : null}

      {recProduct ? (
        <RecCard
          productName={recProduct.name}
          brand={recProduct.brand}
          rationale={recRationale}
          matchScore={78}
        />
      ) : null}

      <ProgressLine
        dayNumber={dayNumber}
        currentScore={latest.overallScore}
        startingScore={first.overallScore}
        delta={sinceFirst}
      />

      <View style={{ height: 24 }} />

      <Pressable
        onPress={onScan}
        accessibilityRole="button"
        accessibilityLabel="Start a new scan"
        style={({ pressed }) => [styles.secondaryInlineCta, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.secondaryInlineLabel} maxFontSizeMultiplier={1.15}>
          Take today\u2019s scan
        </Text>
        <ArrowRight size={14} color={palette.ink} weight="duotone" />
      </Pressable>
    </View>
  );
}

// ============================================================================
// Reusable modules
// ============================================================================

function PrimaryCta({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.primaryCta,
        pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
      ]}
    >
      <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
    </Pressable>
  );
}

function GhostCta({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.ghostCta,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={styles.ghostCtaLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
    </Pressable>
  );
}

function ScorePanel({
  kicker,
  score,
  deltaLabel,
  deltaColor,
}: {
  kicker: string;
  score: number;
  deltaLabel: string;
  deltaColor: string;
}) {
  return (
    <View style={styles.scorePanel}>
      <Text style={styles.scoreKicker} maxFontSizeMultiplier={1.1}>
        {kicker}
      </Text>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreNumber} maxFontSizeMultiplier={1.15}>
          {score}
        </Text>
        <Text style={styles.scoreOutOf} maxFontSizeMultiplier={1.15}>
          {'\u2009/\u200A100'}
        </Text>
      </View>
      <Text
        style={[styles.scoreDelta, { color: deltaColor }]}
        maxFontSizeMultiplier={1.2}
      >
        {deltaLabel}
      </Text>
    </View>
  );
}

function InsightCard({ kicker, body }: { kicker: string; body: string }) {
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightKicker} maxFontSizeMultiplier={1.1}>
        {kicker}
      </Text>
      <Text style={styles.insightBody} maxFontSizeMultiplier={1.2}>
        {body}
      </Text>
    </View>
  );
}

// --- Skin report: constellation + zone chips -------------------------------

function SkinReport({ scan }: { scan: Scan }) {
  // Extract score by zone key from scan.zones; fallback to overallScore.
  const scoreFor = (k: SkinZoneKey) =>
    scan.zones.find((z) => z.key === k)?.score ?? scan.overallScore;

  return (
    <View style={styles.skinReport}>
      <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
        SKIN INTELLIGENCE
      </Text>

      <Constellation scoreFor={scoreFor} />

      <View style={styles.zoneChipGrid}>
        {ZONE_ORDER.map((zone) => {
          const score = scoreFor(zone);
          const status = statusFor(score);
          return (
            <View key={zone} style={styles.zoneChip}>
              <View style={styles.zoneChipTop}>
                <View
                  style={[styles.zoneChipDot, { backgroundColor: status.color }]}
                />
                <Text
                  style={styles.zoneChipLabel}
                  maxFontSizeMultiplier={1.1}
                >
                  {ZONE_LABEL[zone]}
                </Text>
              </View>
              <View style={styles.zoneChipBottom}>
                <Text style={styles.zoneChipScore} maxFontSizeMultiplier={1.15}>
                  {score}
                </Text>
                <Text
                  style={[styles.zoneChipStatus, { color: status.color }]}
                  maxFontSizeMultiplier={1.1}
                >
                  {status.word}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Abstract constellation: four zone nodes at stable spatial positions,
 * connected by hairlines. Reads as "zones, mapped" without a labeled face
 * overlay. Each node is colored by status.
 */
function Constellation({ scoreFor }: { scoreFor: (k: SkinZoneKey) => number }) {
  const W = 280;
  const H = 200;

  // Fixed positions for the four zones inside the canvas
  const forehead = { x: 0.50 * W, y: 0.18 * H };
  const tZone    = { x: 0.50 * W, y: 0.50 * H };
  const chin     = { x: 0.50 * W, y: 0.86 * H };
  const leftCheek  = { x: 0.22 * W, y: 0.58 * H };
  const rightCheek = { x: 0.78 * W, y: 0.58 * H };

  const cheekScore = scoreFor('cheeks');
  const lineColor = palette.hairline;
  const lineOpacity = 0.85;

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }}>
      <Svg width={W} height={H}>
        {/* Connecting hairlines — create the "constellation" */}
        <Line
          x1={forehead.x}
          y1={forehead.y}
          x2={tZone.x}
          y2={tZone.y}
          stroke={lineColor}
          strokeOpacity={lineOpacity}
          strokeWidth={1}
        />
        <Line
          x1={tZone.x}
          y1={tZone.y}
          x2={chin.x}
          y2={chin.y}
          stroke={lineColor}
          strokeOpacity={lineOpacity}
          strokeWidth={1}
        />
        <Line
          x1={tZone.x}
          y1={tZone.y}
          x2={leftCheek.x}
          y2={leftCheek.y}
          stroke={lineColor}
          strokeOpacity={lineOpacity}
          strokeWidth={1}
        />
        <Line
          x1={tZone.x}
          y1={tZone.y}
          x2={rightCheek.x}
          y2={rightCheek.y}
          stroke={lineColor}
          strokeOpacity={lineOpacity}
          strokeWidth={1}
        />

        {/* Outer halo circle at each node */}
        {[
          { pt: forehead, score: scoreFor('forehead') },
          { pt: tZone,    score: scoreFor('tZone')    },
          { pt: chin,     score: scoreFor('chin')     },
          { pt: leftCheek,  score: cheekScore },
          { pt: rightCheek, score: cheekScore },
        ].map(({ pt, score }, i) => {
          const status = statusFor(score);
          return (
            <React.Fragment key={i}>
              <Circle
                cx={pt.x}
                cy={pt.y}
                r={10}
                fill={status.color}
                fillOpacity={0.12}
              />
              <Circle
                cx={pt.x}
                cy={pt.y}
                r={4}
                fill={status.color}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function TodayRoutineRow({
  stepIndex,
  totalSteps,
  productName,
  brand,
  instruction,
  completed,
  onMarkDone,
}: {
  stepIndex: number;
  totalSteps: number;
  productName: string;
  brand: string;
  instruction: string;
  completed: boolean;
  onMarkDone: () => void;
}) {
  return (
    <View style={styles.routineRow}>
      <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
        {`TODAY  \u00B7  STEP ${stepIndex} OF ${totalSteps}`}
      </Text>
      <View style={styles.routineRowBody}>
        <View style={{ flex: 1 }}>
          <Text style={styles.routineBrand} maxFontSizeMultiplier={1.1}>
            {brand.toUpperCase()}
          </Text>
          <Text
            style={styles.routineName}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.15}
          >
            {productName}
          </Text>
          <Text
            style={styles.routineInstruction}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            {instruction}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            if (completed) return;
            hapt.success();
            onMarkDone();
          }}
          disabled={completed}
          accessibilityRole="button"
          accessibilityLabel={completed ? 'Step done' : 'Mark step done'}
          style={({ pressed }) => [
            styles.routineDoneBtn,
            completed && styles.routineDoneBtnComplete,
            pressed && !completed && { opacity: 0.9 },
          ]}
        >
          <Text
            style={[
              styles.routineDoneLabel,
              completed && { color: palette.inkTertiary },
            ]}
            maxFontSizeMultiplier={1.15}
          >
            {completed ? 'Done' : 'Mark done'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function TonightRow({ stepCount }: { stepCount: number }) {
  return (
    <View style={styles.tonightRow}>
      <View>
        <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
          TONIGHT
        </Text>
        <Text style={styles.tonightLabel} maxFontSizeMultiplier={1.2}>
          {`${stepCount} step${stepCount === 1 ? '' : 's'} queued for 9:30 PM`}
        </Text>
      </View>
      <ArrowRight size={14} color={palette.inkTertiary} weight="duotone" />
    </View>
  );
}

function RecCard({
  productName,
  brand,
  rationale,
  matchScore,
}: {
  productName: string;
  brand: string;
  rationale: string;
  matchScore: number;
}) {
  return (
    <View style={styles.recCard}>
      <View style={styles.recTop}>
        <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
          MATCHED FOR YOU
        </Text>
        <View style={styles.recMatchRing}>
          <Text style={styles.recMatchScore} maxFontSizeMultiplier={1.1}>
            {matchScore}
          </Text>
        </View>
      </View>

      <Text style={styles.recBrand} maxFontSizeMultiplier={1.1}>
        {brand.toUpperCase()}
      </Text>
      <Text
        style={styles.recName}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.15}
      >
        {productName}
      </Text>

      <View style={styles.recRationaleRow}>
        <View style={styles.recBullet} />
        <Text
          style={styles.recRationale}
          numberOfLines={3}
          maxFontSizeMultiplier={1.2}
        >
          {rationale}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View rationale"
        style={({ pressed }) => [
          styles.recCtaInline,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.recCtaLabel} maxFontSizeMultiplier={1.15}>
          View rationale
        </Text>
        <ArrowRight size={13} color={palette.clay} weight="duotone" />
      </Pressable>
    </View>
  );
}

function ProgressLine({
  dayNumber,
  currentScore,
  startingScore,
  delta,
}: {
  dayNumber: number;
  currentScore: number;
  startingScore: number;
  delta: number;
}) {
  const DeltaIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const deltaColor = colorForDelta(delta);

  return (
    <View style={styles.progressLine}>
      <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
        YOUR PROGRESS
      </Text>
      <View style={styles.progressRow}>
        <View style={styles.progressCol}>
          <Text style={styles.progressMicro} maxFontSizeMultiplier={1.1}>
            DAY 1
          </Text>
          <Text style={styles.progressScore} maxFontSizeMultiplier={1.15}>
            {startingScore}
          </Text>
        </View>

        <View style={styles.progressDivider} />

        <View style={styles.progressCol}>
          <Text style={styles.progressMicro} maxFontSizeMultiplier={1.1}>
            {`DAY ${dayNumber}`}
          </Text>
          <Text
            style={[styles.progressScore, { color: palette.clay }]}
            maxFontSizeMultiplier={1.15}
          >
            {currentScore}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.progressDeltaWrap}>
          <DeltaIcon size={13} color={deltaColor} weight="duotone" />
          <Text
            style={[styles.progressDeltaLabel, { color: deltaColor }]}
            maxFontSizeMultiplier={1.15}
          >
            {Math.abs(delta)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function buildGreeting(firstName: string | null): string {
  const h = new Date().getHours();
  const timeOfDay =
    h < 5 ? 'Late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return firstName ? `${timeOfDay}, ${firstName}.` : `${timeOfDay}.`;
}

function buildInsightHeadline(scan: Scan, delta: number): string {
  // Prefer the scan's own summary if available; otherwise construct a terse
  // data-grounded line.
  if (scan.summaryHeadline) return scan.summaryHeadline;
  if (delta > 2) return 'You\u2019re gaining ground.';
  if (delta < -2) return 'Something shifted. Let\u2019s look.';
  return 'Steady today.';
}

function buildRecRationale(scan: Scan): string {
  const activeZone = scan.zones.find((z) => z.status === 'active');
  const monitorZone = scan.zones.find((z) => z.status === 'monitor');
  if (activeZone) {
    return `Because your ${activeZone.label.toLowerCase()} flagged active in your last scan.`;
  }
  if (monitorZone) {
    return `Because your ${monitorZone.label.toLowerCase()} is trending \u2014 worth monitoring.`;
  }
  return 'Matched to your skin type and current routine cadence.';
}

function deltaLabelFor(delta: number): string {
  if (delta > 0) return `\u2191 ${delta} from yesterday`;
  if (delta < 0) return `\u2193 ${Math.abs(delta)} from yesterday`;
  return 'Steady from yesterday';
}

function colorForDelta(delta: number): string {
  if (delta > 0) return palette.moss;
  if (delta < 0) return palette.rust;
  return palette.inkTertiary;
}

function statusFor(score: number): { word: string; color: string } {
  if (score >= 70) return { word: 'Calm', color: palette.moss };
  if (score >= 40) return { word: 'Monitor', color: palette.amber };
  return { word: 'Active', color: palette.rust };
}

function productNameFor(productId: string): string {
  const p = seedProducts.find((p) => p.id === productId);
  return p?.name ?? 'Product';
}

function productBrandFor(productId: string): string {
  const p = seedProducts.find((p) => p.id === productId);
  return p?.brand ?? '';
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  scroll: { flex: 1 },

  // Brand bar
  brandBar: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandWord: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 2.0,
    color: palette.ink,
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.clayPaper,
  },
  streakLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.0,
    color: palette.clayDeep,
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
    color: palette.inkSecondary,
  },

  // Command strip
  command: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.inkSecondary,
    marginBottom: 14,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1.0,
    color: palette.ink,
  },
  subline: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 24,
    color: palette.inkSecondary,
    marginTop: 12,
    maxWidth: '88%',
  },

  // Day 0 pieces
  day0Mark: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  ctaStack: {
    paddingHorizontal: 20,
    gap: 12,
  },
  microFootnote: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkTertiary,
    textAlign: 'center',
    marginTop: 36,
    marginHorizontal: 40,
  },

  // CTAs
  primaryCta: {
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  ghostCta: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostCtaLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: palette.inkSecondary,
    textDecorationLine: 'underline',
  },

  // Score panel
  scorePanel: {
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  scoreKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  scoreNumber: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 72,
    lineHeight: 72,
    letterSpacing: -2.4,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  scoreOutOf: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 20,
    lineHeight: 28,
    color: palette.inkTertiary,
    marginLeft: 6,
    marginBottom: 10,
  },
  scoreDelta: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    marginTop: 6,
  },

  // Insight card
  insightCard: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
  },
  insightKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  insightBody: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 25,
    color: palette.ink,
  },

  // Skin report
  skinReport: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  zoneChipGrid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  zoneChip: {
    flexGrow: 1,
    flexBasis: '47%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  zoneChipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  zoneChipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.inkSecondary,
  },
  zoneChipBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    gap: 10,
  },
  zoneChipScore: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -0.8,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  zoneChipStatus: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  sectionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },

  // Today routine row
  routineRow: {
    marginTop: 32,
    marginHorizontal: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  routineRowBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  routineBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  routineName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.ink,
    marginTop: 4,
  },
  routineInstruction: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginTop: 4,
  },
  routineDoneBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineDoneBtnComplete: {
    backgroundColor: palette.bgDeep,
  },
  routineDoneLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },

  // Tonight row
  tonightRow: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.bgDeep,
  },
  tonightLabel: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    color: palette.inkSecondary,
    marginTop: 4,
  },

  // Rec card
  recCard: {
    marginTop: 28,
    marginHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  recTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  recMatchRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: palette.clay,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.clayPaper,
  },
  recMatchScore: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.clayDeep,
    letterSpacing: 0.2,
  },
  recBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginTop: 12,
  },
  recName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
    marginTop: 4,
  },
  recRationaleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    gap: 10,
  },
  recBullet: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: palette.clay,
    marginTop: 2,
  },
  recRationale: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
  },
  recCtaInline: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  recCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    color: palette.clay,
  },

  // Progress line
  progressLine: {
    marginTop: 32,
    marginHorizontal: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: palette.bgDeep,
  },
  progressRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCol: {
    alignItems: 'flex-start',
  },
  progressMicro: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  progressScore: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -1.0,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  progressDivider: {
    width: 1,
    height: 28,
    backgroundColor: palette.hairline,
    marginHorizontal: 18,
    alignSelf: 'center',
  },
  progressDeltaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: palette.bg,
  },
  progressDeltaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
  },

  // Secondary inline CTA
  secondaryInlineCta: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryInlineLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: palette.ink,
    letterSpacing: 0.1,
  },
});
