/**
 * ResultCards — the new care-before-commerce result page card system.
 *
 * Single file collects the eight cards that compose the new result
 * screen below the SkinScoreReveal. Keeping them together is
 * intentional: they share style tokens, follow one editorial voice,
 * and are only used in one screen.
 *
 * Hierarchy on the result screen (top → bottom):
 *
 *   1. SkinScoreReveal (separate file)
 *   2. TonightDecisionCard        — care decision FIRST, before products
 *   3. MainSignalCard             — what Pura noticed + what it means
 *   4. SkinMapPreviewCard         — quick visual proof
 *   5. TonightPlanCard            — 4-step plan
 *   6. AvoidTonightCard           — calm cautions
 *   7. RecommendedSupportProductCard — hero product with why-it-fits
 *   8. ProductOptionsByGoalCard   — distinct goals, not "good for breakouts"
 *   9. ProgressLoopCard           — track this / scan again tomorrow
 *
 * No card invents data. Every card takes typed props and the screen
 * derives them from the canonical SkinState / RecommendationContext.
 */

import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Bell,
  CalendarBlank,
  CaretRight,
  Check,
  CircleNotch,
  Drop,
  Eye,
  HandHeart,
  Heart,
  Leaf,
  MoonStars,
  Question,
  ShieldCheck,
  Sparkle,
  WarningCircle,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

// ---------------------------------------------------------------------------
// SectionHeader — shared editorial section header used by all cards.
// ---------------------------------------------------------------------------

function SectionHeader({ kicker, title }: { kicker: string; title?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
        {kicker}
      </Text>
      <View style={styles.sectionRule} />
      {title ? (
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.15}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// TonightDecisionCard — care decision FIRST, before products.
// ---------------------------------------------------------------------------

export type TonightDecisionLabel =
  | 'keep_routine_steady'
  | 'simplify_tonight'
  | 'skip_strong_actives'
  | 'hydrate_and_protect'
  | 'spot_treat_only'
  | 'retake_for_full_analysis';

const TONIGHT_DECISIONS: Record<
  TonightDecisionLabel,
  { title: string; body: string }
> = {
  keep_routine_steady: {
    title: 'Keep routine steady',
    body: 'Cleanse gently, hydrate, moisturize, and skip stacking strong actives tonight.',
  },
  simplify_tonight: {
    title: 'Simplify tonight',
    body: 'Strip back to the basics. Your skin reads best when you give it less to react to.',
  },
  skip_strong_actives: {
    title: 'Skip strong actives',
    body: 'Pause exfoliants and retinoids tonight. Lean on barrier support instead.',
  },
  hydrate_and_protect: {
    title: 'Hydrate and protect',
    body: 'Layer a hydrating serum under a lightweight moisturizer. SPF in the morning.',
  },
  spot_treat_only: {
    title: 'Spot treat only',
    body: 'Keep treatment limited to the active-looking area. Leave calm skin alone.',
  },
  retake_for_full_analysis: {
    title: 'Retake for a clearer scan',
    body: 'This scan was hard to read. A retake in soft, even light gives you a more reliable plan.',
  },
};

export interface TonightDecisionCardProps {
  decision: TonightDecisionLabel;
}

export function TonightDecisionCard({ decision }: TonightDecisionCardProps) {
  const copy = TONIGHT_DECISIONS[decision];
  return (
    <View style={styles.decisionCard}>
      <View style={styles.decisionIconWrap}>
        <MoonStars size={20} weight="duotone" color={palette.clay} />
      </View>
      <View style={styles.decisionText}>
        <Text style={styles.decisionKicker} maxFontSizeMultiplier={1.1}>
          TONIGHT&rsquo;S SAFEST MOVE
        </Text>
        <Text style={styles.decisionTitle} maxFontSizeMultiplier={1.15}>
          {copy.title}
        </Text>
        <Text style={styles.decisionBody} maxFontSizeMultiplier={1.2} numberOfLines={3}>
          {copy.body}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// MainSignalCard — what Pura noticed and what it means.
// ---------------------------------------------------------------------------

export interface MainSignalCardProps {
  signalTitle: string;          // "Mild chin congestion"
  noticed: string;              // "A small active-looking area on the chin…"
  meaning: string;              // "Nothing urgent. This is a good night to avoid…"
}

export function MainSignalCard({
  signalTitle,
  noticed,
  meaning,
}: MainSignalCardProps) {
  return (
    <View style={styles.card}>
      <SectionHeader kicker="MAIN SIGNAL" />
      <Text style={styles.signalTitle} maxFontSizeMultiplier={1.15}>
        {signalTitle}
      </Text>
      <View style={styles.signalRow}>
        <View style={styles.signalDotIdle}>
          <View style={styles.signalDotInner} />
        </View>
        <View style={styles.signalRowText}>
          <Text style={styles.signalRowLabel} maxFontSizeMultiplier={1.1}>
            WHAT PURA NOTICED
          </Text>
          <Text style={styles.signalRowBody} maxFontSizeMultiplier={1.2}>
            {noticed}
          </Text>
        </View>
      </View>
      <View style={styles.signalRow}>
        <View style={styles.signalDotIdle}>
          <View style={styles.signalDotInner} />
        </View>
        <View style={styles.signalRowText}>
          <Text style={styles.signalRowLabel} maxFontSizeMultiplier={1.1}>
            WHAT IT MEANS
          </Text>
          <Text style={styles.signalRowBody} maxFontSizeMultiplier={1.2}>
            {meaning}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkinMapPreviewCard — quick visual proof + jump to detail.
// ---------------------------------------------------------------------------

export interface SkinMapZoneNote {
  zone: string;       // "Chin"
  note: string;       // "mild active-looking signal"
  tone: 'calm' | 'mild' | 'attention';
}

export interface SkinMapPreviewCardProps {
  photoUri: string;
  zones: ReadonlyArray<SkinMapZoneNote>;
  onOpen: () => void;
}

export function SkinMapPreviewCard({
  photoUri,
  zones,
  onOpen,
}: SkinMapPreviewCardProps) {
  return (
    <Pressable
      onPress={() => {
        hapt.select();
        onOpen();
      }}
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.95 },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Open the full skin map"
    >
      <SectionHeader kicker="SKIN MAP PREVIEW" />
      <View style={styles.skinMapRow}>
        <View style={styles.skinMapThumb}>
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View style={styles.skinMapThumbTint} />
        </View>
        <View style={styles.skinMapZones}>
          {zones.slice(0, 4).map((z) => (
            <View key={z.zone} style={styles.skinMapZoneRow}>
              <View
                style={[
                  styles.skinMapDot,
                  z.tone === 'attention'
                    ? styles.skinMapDotAttention
                    : z.tone === 'mild'
                    ? styles.skinMapDotMild
                    : styles.skinMapDotCalm,
                ]}
              />
              <Text
                style={styles.skinMapZoneLabel}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
              >
                {z.zone}
              </Text>
              <Text
                style={styles.skinMapZoneNote}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
              >
                {z.note}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.skinMapFooter}>
        <Text style={styles.skinMapCta} maxFontSizeMultiplier={1.1}>
          View full skin map
        </Text>
        <CaretRight size={13} weight="bold" color={palette.clay} />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// TonightPlanCard — 4-step structured plan.
// ---------------------------------------------------------------------------

export interface TonightPlanStep {
  title: string;
  body: string;
}

export interface TonightPlanCardProps {
  steps: ReadonlyArray<TonightPlanStep>;
}

const PLAN_DEFAULTS: ReadonlyArray<TonightPlanStep> = [
  {
    title: 'Cleanse gently',
    body: 'Remove buildup without scrubbing.',
  },
  {
    title: 'Hydrate',
    body: 'Use a simple serum or essence if your skin already tolerates it.',
  },
  {
    title: 'Moisturize',
    body: 'Support your barrier with a lightweight moisturizer.',
  },
  {
    title: 'Spot treat only if needed',
    body: 'Keep treatment limited to the active-looking area.',
  },
];

export function TonightPlanCard({ steps }: TonightPlanCardProps) {
  const list = steps.length > 0 ? steps : PLAN_DEFAULTS;
  return (
    <View style={styles.card}>
      <SectionHeader kicker="TONIGHT&rsquo;S PLAN" />
      <View style={styles.planList}>
        {list.slice(0, 4).map((step, i) => (
          <View key={i} style={styles.planRow}>
            <View style={styles.planNumWrap}>
              <Text style={styles.planNum} allowFontScaling={false}>
                {i + 1}
              </Text>
            </View>
            <View style={styles.planText}>
              <Text style={styles.planTitle} maxFontSizeMultiplier={1.15}>
                {step.title}
              </Text>
              <Text
                style={styles.planBody}
                maxFontSizeMultiplier={1.2}
                numberOfLines={3}
              >
                {step.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AvoidTonightCard — calm cautions, not scary red.
// ---------------------------------------------------------------------------

const AVOID_DEFAULT: ReadonlyArray<string> = [
  'Strong exfoliating acids',
  'Retinoid + acid stacking',
  'Harsh scrubs',
  'Testing multiple new products',
  'Picking at active areas',
];

export interface AvoidTonightCardProps {
  items?: ReadonlyArray<string>;
}

export function AvoidTonightCard({ items }: AvoidTonightCardProps) {
  const list = items && items.length > 0 ? items : AVOID_DEFAULT;
  return (
    <View style={styles.cautionCard}>
      <View style={styles.cautionRail} />
      <View style={styles.cautionHeaderRow}>
        <WarningCircle size={15} weight="duotone" color={palette.amberDeep} />
        <Text style={styles.cautionKicker} maxFontSizeMultiplier={1.1}>
          AVOID TONIGHT
        </Text>
      </View>
      <View style={styles.cautionList}>
        {list.map((item) => (
          <View key={item} style={styles.cautionRow}>
            <Text style={styles.cautionBullet} allowFontScaling={false}>
              ·
            </Text>
            <Text
              style={styles.cautionItem}
              maxFontSizeMultiplier={1.2}
              numberOfLines={2}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// RecommendedSupportProductCard — hero product framed as support.
// ---------------------------------------------------------------------------

export interface RecommendedSupportProductCardProps {
  brand: string;
  name: string;
  imageUri?: string;
  category: string;        // "Night moisturizer"
  jobLabel: string;        // "Best for barrier support"
  whyItFits: string;       // single tight sentence
  bullets: ReadonlyArray<string>;
  caution?: string;
  /** Primary CTA — adds to routine. */
  onAddToRoutine: () => void;
  /** Secondary CTA — opens product detail. */
  onOpenDetail: () => void;
  /** Tertiary CTA — scrolls to alternatives. */
  onSeeAlternatives: () => void;
  /** Optional honest source label ("Curated for this scan"). Empty hides it. */
  sourceLabel?: string;
}

export function RecommendedSupportProductCard({
  brand,
  name,
  imageUri,
  category,
  jobLabel,
  whyItFits,
  bullets,
  caution,
  onAddToRoutine,
  onOpenDetail,
  onSeeAlternatives,
  sourceLabel,
}: RecommendedSupportProductCardProps) {
  return (
    <View style={styles.heroCard}>
      <SectionHeader kicker="RECOMMENDED SUPPORT PRODUCT" />

      {sourceLabel ? (
        <Text style={styles.heroSourceLabel} maxFontSizeMultiplier={1.15}>
          {sourceLabel}
        </Text>
      ) : null}

      <View style={styles.heroProductRow}>
        <View style={styles.heroImage}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="contain"
            />
          ) : (
            <Drop size={28} weight="duotone" color={palette.inkTertiary} />
          )}
        </View>
        <View style={styles.heroMeta}>
          <Text style={styles.heroBrand} maxFontSizeMultiplier={1.15}>
            {brand}
          </Text>
          <Text
            style={styles.heroName}
            maxFontSizeMultiplier={1.15}
            numberOfLines={2}
          >
            {name}
          </Text>
          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText} maxFontSizeMultiplier={1.1}>
                {category}
              </Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText} maxFontSizeMultiplier={1.1}>
                {jobLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.heroWhyBlock}>
        <Text style={styles.heroWhyLabel} maxFontSizeMultiplier={1.1}>
          WHY THIS FITS
        </Text>
        <Text style={styles.heroWhyBody} maxFontSizeMultiplier={1.2}>
          {whyItFits}
        </Text>
        <View style={styles.heroBullets}>
          {bullets.slice(0, 4).map((b) => (
            <View key={b} style={styles.heroBulletRow}>
              <Check size={12} weight="bold" color={palette.moss} />
              <Text
                style={styles.heroBulletText}
                maxFontSizeMultiplier={1.2}
                numberOfLines={2}
              >
                {b}
              </Text>
            </View>
          ))}
        </View>
        {caution ? (
          <View style={styles.heroCaution}>
            <WarningCircle size={12} weight="fill" color={palette.amberDeep} />
            <Text
              style={styles.heroCautionText}
              maxFontSizeMultiplier={1.2}
              numberOfLines={2}
            >
              {caution}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.heroCtaCol}>
        <Pressable
          onPress={() => {
            hapt.tap();
            onAddToRoutine();
          }}
          accessibilityRole="button"
          accessibilityLabel="Add to routine"
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Heart size={15} weight="duotone" color={palette.bg} />
          <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.1}>
            Add to routine
          </Text>
        </Pressable>
        <View style={styles.heroSecondaryRow}>
          <Pressable
            onPress={() => {
              hapt.select();
              onOpenDetail();
            }}
            accessibilityRole="button"
            accessibilityLabel="View product details"
            style={({ pressed }) => [
              styles.secondaryCta,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.secondaryCtaText} maxFontSizeMultiplier={1.1}>
              View product
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hapt.select();
              onSeeAlternatives();
            }}
            accessibilityRole="button"
            accessibilityLabel="See alternative products"
            style={({ pressed }) => [
              styles.tertiaryCta,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.tertiaryCtaText} maxFontSizeMultiplier={1.1}>
              See alternatives
            </Text>
            <CaretRight size={11} weight="bold" color={palette.clay} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ProductOptionsByGoalCard — distinct goals, not "good for breakouts".
// ---------------------------------------------------------------------------

export interface ProductOptionByGoal {
  id: string;
  brand: string;
  name: string;
  imageUri?: string;
  goal: string;        // "Barrier support"
  use: string;         // "Good if skin feels dry or tight."
  onPress: () => void;
}

export interface ProductOptionsByGoalCardProps {
  options: ReadonlyArray<ProductOptionByGoal>;
}

export function ProductOptionsByGoalCard({
  options,
}: ProductOptionsByGoalCardProps) {
  if (options.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader kicker="OTHER OPTIONS BY GOAL" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsRow}
      >
        {options.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => {
              hapt.select();
              opt.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${opt.brand} ${opt.name}`}
            style={({ pressed }) => [
              styles.optionCard,
              pressed && { opacity: 0.92 },
            ]}
          >
            <View style={styles.optionImage}>
              {opt.imageUri ? (
                <Image
                  source={{ uri: opt.imageUri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="contain"
                />
              ) : (
                <Drop size={22} weight="duotone" color={palette.inkTertiary} />
              )}
            </View>
            <View style={styles.optionGoalRow}>
              <View style={styles.optionGoalDot} />
              <Text style={styles.optionGoal} maxFontSizeMultiplier={1.1}>
                {opt.goal}
              </Text>
            </View>
            <Text
              style={styles.optionBrand}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
            >
              {opt.brand}
            </Text>
            <Text
              style={styles.optionName}
              maxFontSizeMultiplier={1.15}
              numberOfLines={2}
            >
              {opt.name}
            </Text>
            <Text
              style={styles.optionUse}
              maxFontSizeMultiplier={1.2}
              numberOfLines={2}
            >
              {opt.use}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ProgressLoopCard — track this / scan again tomorrow.
// ---------------------------------------------------------------------------

export interface ProgressLoopCardProps {
  body: string;
  onRemindTomorrow: () => void;
  onSetReminder?: () => void;
}

export function ProgressLoopCard({
  body,
  onRemindTomorrow,
  onSetReminder,
}: ProgressLoopCardProps) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressIconWrap}>
        <CalendarBlank size={20} weight="duotone" color={palette.clay} />
      </View>
      <View style={styles.progressText}>
        <Text style={styles.progressKicker} maxFontSizeMultiplier={1.1}>
          TRACK THIS
        </Text>
        <Text style={styles.progressBody} maxFontSizeMultiplier={1.2} numberOfLines={3}>
          {body}
        </Text>
        <View style={styles.progressCtaRow}>
          <Pressable
            onPress={() => {
              hapt.tap();
              onRemindTomorrow();
            }}
            accessibilityRole="button"
            accessibilityLabel="Remind me tomorrow"
            style={({ pressed }) => [
              styles.progressCta,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Bell size={13} weight="duotone" color={palette.bg} />
            <Text style={styles.progressCtaText} maxFontSizeMultiplier={1.1}>
              Scan again tomorrow
            </Text>
          </Pressable>
          {onSetReminder ? (
            <Pressable
              onPress={() => {
                hapt.select();
                onSetReminder();
              }}
              accessibilityRole="button"
              accessibilityLabel="Set a custom reminder"
              style={({ pressed }) => [
                styles.progressSecondary,
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={styles.progressSecondaryText} maxFontSizeMultiplier={1.1}>
                Choose a time
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Shared section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  sectionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.7,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: palette.hairline,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    color: palette.ink,
  },

  // Base card shell
  card: {
    backgroundColor: palette.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 18,
    marginBottom: 18,
  },

  section: {
    marginBottom: 26,
  },

  // TonightDecisionCard
  decisionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: palette.clayPaper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.clayLight,
    padding: 18,
    marginBottom: 18,
  },
  decisionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionText: {
    flex: 1,
  },
  decisionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  decisionTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 6,
  },
  decisionBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
  },

  // MainSignalCard
  signalTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 14,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  signalDotIdle: {
    marginTop: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.clay,
  },
  signalRowText: {
    flex: 1,
  },
  signalRowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  signalRowBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
  },

  // SkinMapPreviewCard
  skinMapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 12,
  },
  skinMapThumb: {
    width: 88,
    height: 108,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  skinMapThumbTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.12)',
  },
  skinMapZones: {
    flex: 1,
    gap: 8,
  },
  skinMapZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skinMapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skinMapDotCalm: {
    backgroundColor: palette.moss,
  },
  skinMapDotMild: {
    backgroundColor: palette.amber,
  },
  skinMapDotAttention: {
    backgroundColor: palette.rust,
  },
  skinMapZoneLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: palette.ink,
    minWidth: 56,
  },
  skinMapZoneNote: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: palette.inkSecondary,
  },
  skinMapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  skinMapCta: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.clay,
  },

  // TonightPlanCard
  planList: {
    gap: 6,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  planNumWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.inkSecondary,
  },
  planText: {
    flex: 1,
  },
  planTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    lineHeight: 19,
    color: palette.ink,
    marginBottom: 2,
  },
  planBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 18,
    color: palette.inkSecondary,
  },

  // AvoidTonightCard
  cautionCard: {
    backgroundColor: palette.amber + '0F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.amber + '38',
    padding: 16,
    paddingLeft: 18,
    marginBottom: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  cautionRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: palette.amber,
  },
  cautionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cautionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: palette.amberDeep,
    textTransform: 'uppercase',
  },
  cautionList: {
    gap: 6,
  },
  cautionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cautionBullet: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: palette.amberDeep,
    width: 8,
  },
  cautionItem: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 18,
    color: palette.ink,
  },

  // RecommendedSupportProductCard
  heroCard: {
    backgroundColor: palette.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 18,
    marginBottom: 18,
  },
  heroSourceLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    letterSpacing: 0.2,
    color: palette.inkTertiary,
    marginBottom: 10,
  },
  heroProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  heroImage: {
    width: 76,
    height: 92,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroMeta: {
    flex: 1,
  },
  heroBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: palette.inkSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 8,
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  heroChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.3,
    color: palette.inkSecondary,
  },
  heroWhyBlock: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  heroWhyLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroWhyBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
    marginBottom: 12,
  },
  heroBullets: {
    gap: 6,
  },
  heroBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  heroBulletText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
  heroCaution: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: palette.amber + '14',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.amber + '36',
  },
  heroCautionText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: palette.amberDeep,
  },
  heroCtaCol: {
    gap: 10,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.ink,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.2,
    color: palette.bg,
  },
  heroSecondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryCta: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  secondaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  tertiaryCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  tertiaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.clay,
  },

  // ProductOptionsByGoalCard
  optionsRow: {
    gap: 12,
    paddingRight: 6,
  },
  optionCard: {
    width: 188,
    padding: 14,
    borderRadius: 16,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  optionImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  optionGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  optionGoalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.clay,
  },
  optionGoal: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.clayDeep,
    textTransform: 'uppercase',
  },
  optionBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.3,
    color: palette.inkSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  optionName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
    color: palette.ink,
    marginBottom: 6,
  },
  optionUse: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: palette.inkSecondary,
  },

  // ProgressLoopCard
  progressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: palette.clayPaper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.clayLight,
    padding: 18,
    marginBottom: 18,
  },
  progressIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    flex: 1,
  },
  progressKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  progressBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
    marginBottom: 12,
  },
  progressCtaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  progressCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: palette.clay,
  },
  progressCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: palette.bg,
  },
  progressSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.clayLight,
  },
  progressSecondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: palette.clayDeep,
  },
});
