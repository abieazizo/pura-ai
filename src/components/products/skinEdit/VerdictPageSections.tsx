/**
 * VerdictPageSections — the modular sections that build the product
 * Verdict page (Linked-to-scan, Routine placement, Compatibility,
 * Worth-buying, Ingredient purpose, Decision alternatives, Adaptive
 * sticky CTA).
 *
 * Each section is a pure component over a Recommendation; the
 * Verdict screen composes them top-to-bottom in the order spec'd
 * by the v27 master prompt.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { CaretRight } from 'phosphor-react-native';
import { palette } from '@/theme';
import type { Recommendation } from '@/state/skinEdit';
import { ProductStage } from './ProductStage';
import { RoutinePathway } from './RoutinePathway';

// ============================================================================
// SectionHeading
// ============================================================================

export function SectionHeading({ title }: { title: string }) {
  return (
    <Text style={sectionStyles.title} maxFontSizeMultiplier={1.2}>
      {title}
    </Text>
  );
}

const sectionStyles = StyleSheet.create({
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: palette.ink,
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
  },
});

// ============================================================================
// LinkedToScan
// ============================================================================

interface LinkedToScanProps {
  recommendation: Recommendation;
  primaryRegion: string;
}

export function LinkedToScan({ recommendation, primaryRegion }: LinkedToScanProps) {
  return (
    <View>
      <SectionHeading title="Linked to your scan" />
      <View style={linkStyles.card}>
        <View style={linkStyles.diagramWrap}>
          <FaceDiagram region={primaryRegion} />
        </View>
        <View style={linkStyles.copy}>
          <Text style={linkStyles.body} maxFontSizeMultiplier={1.3}>
            Pura noticed active-looking areas and early marks concentrated around the {primaryRegion}.
          </Text>
          <Text style={linkStyles.relevance} maxFontSizeMultiplier={1.3}>
            {recommendation.scanRelation}
          </Text>
        </View>
      </View>
    </View>
  );
}

function FaceDiagram({ region }: { region: string }) {
  const lower = region.toLowerCase();
  const highlightChin = lower.includes('chin') || lower.includes('jaw');
  const highlightForehead = lower.includes('forehead');
  const highlightCheeks = lower.includes('cheek');
  const highlightTZone = lower.includes('nose') || lower.includes('t-zone') || lower.includes('center');
  return (
    <Svg viewBox="0 0 100 120" width={92} height={110}>
      <Path
        d="M50 8 C32 8 22 22 22 44 C22 70 30 100 50 112 C70 100 78 70 78 44 C78 22 68 8 50 8 Z"
        fill={palette.clayPaper}
        stroke="#EBCFC5"
        strokeWidth={1}
      />
      {highlightForehead ? (
        <Ellipse cx={50} cy={26} rx={18} ry={6} fill={palette.clay} opacity={0.55} />
      ) : null}
      {highlightTZone ? (
        <Ellipse cx={50} cy={52} rx={6} ry={12} fill={palette.clay} opacity={0.55} />
      ) : null}
      {highlightCheeks ? (
        <>
          <Ellipse cx={30} cy={58} rx={9} ry={7} fill={palette.clay} opacity={0.45} />
          <Ellipse cx={70} cy={58} rx={9} ry={7} fill={palette.clay} opacity={0.45} />
        </>
      ) : null}
      {highlightChin ? (
        <Ellipse cx={50} cy={92} rx={14} ry={8} fill={palette.clay} opacity={0.6} />
      ) : null}
    </Svg>
  );
}

const linkStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
  },
  diagramWrap: {
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginBottom: 6,
  },
  relevance: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: palette.ink,
  },
});

// ============================================================================
// RoutinePlacement
// ============================================================================

export function RoutinePlacement({ recommendation }: { recommendation: Recommendation }) {
  return (
    <View>
      <SectionHeading title="Where it belongs" />
      <View style={placeStyles.card}>
        <RoutinePathway
          steps={recommendation.routinePathway}
          activeIndex={recommendation.routinePathwayActiveIndex}
          variant="card"
        />
        <View style={placeStyles.guidance}>
          <GuidanceRow label="Start with" body={recommendation.startFrequency} />
          <GuidanceRow label="Increase only if" body={recommendation.increaseIf} />
          <GuidanceRow label="Avoid on irritated nights with" body={recommendation.avoidWith} />
        </View>
      </View>
    </View>
  );
}

function GuidanceRow({ label, body }: { label: string; body: string }) {
  return (
    <View style={placeStyles.row}>
      <Text style={placeStyles.rowLabel} maxFontSizeMultiplier={1.1}>
        {label.toUpperCase()}
      </Text>
      <Text style={placeStyles.rowBody} maxFontSizeMultiplier={1.2}>
        {body}
      </Text>
    </View>
  );
}

const placeStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: '#FFFFFF',
    gap: 14,
  },
  guidance: {
    gap: 10,
  },
  row: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.clayDeep,
    marginBottom: 4,
  },
  rowBody: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 17,
    color: palette.ink,
  },
});

// ============================================================================
// CompatibilityCheck
// ============================================================================

export function CompatibilityCheck({ recommendation }: { recommendation: Recommendation }) {
  return (
    <View>
      <SectionHeading title="Compatibility check" />
      <View style={compatStyles.card}>
        {recommendation.compatibilityRows.map((row, idx) => (
          <View
            key={`${row.label}-${idx}`}
            style={[
              compatStyles.row,
              idx < recommendation.compatibilityRows.length - 1 ? compatStyles.rowDivider : null,
            ]}
          >
            <Text style={compatStyles.label} maxFontSizeMultiplier={1.2}>
              {row.label}
            </Text>
            <Text
              style={[compatStyles.value, row.isWarning ? compatStyles.valueWarning : null]}
              maxFontSizeMultiplier={1.2}
              numberOfLines={2}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const compatStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  label: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 17,
    color: palette.inkSecondary,
  },
  value: {
    flexShrink: 0,
    maxWidth: '55%',
    textAlign: 'right',
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 17,
    color: palette.ink,
  },
  valueWarning: {
    color: palette.clayDeep,
  },
});

// ============================================================================
// WorthBuyingPanel
// ============================================================================

export function WorthBuyingPanel({ recommendation }: { recommendation: Recommendation }) {
  return (
    <View>
      <SectionHeading title="Is this worth buying for you?" />
      <View style={worthStyles.card}>
        <Group label="BUY IT IF" items={recommendation.buyIf} accent={palette.clay} />
        <Group label="SKIP IT FOR NOW IF" items={recommendation.skipIf} accent={palette.inkTertiary} />
        <View style={worthStyles.verdict}>
          <Text style={worthStyles.verdictLabel} maxFontSizeMultiplier={1.1}>
            PURA’S CALL
          </Text>
          <Text style={worthStyles.verdictBody} maxFontSizeMultiplier={1.2}>
            {recommendation.buyVerdict}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Group({ label, items, accent }: { label: string; items: string[]; accent: string }) {
  return (
    <View style={worthStyles.group}>
      <Text style={[worthStyles.groupLabel, { color: accent }]} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
      {items.map((item, idx) => (
        <View key={`${label}-${idx}`} style={worthStyles.item}>
          <View style={[worthStyles.dot, { backgroundColor: accent }]} />
          <Text style={worthStyles.itemText} maxFontSizeMultiplier={1.2}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const worthStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    marginTop: 7,
  },
  itemText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.ink,
  },
  verdict: {
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    paddingTop: 12,
  },
  verdictLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    marginBottom: 4,
  },
  verdictBody: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
  },
});

// ============================================================================
// IngredientPurposePanel
// ============================================================================

interface IngredientPurposePanelProps {
  recommendation: Recommendation;
}

export function IngredientPurposePanel({ recommendation }: IngredientPurposePanelProps) {
  return (
    <View>
      <SectionHeading title="Why these ingredients matter" />
      <View style={ingStyles.card}>
        {recommendation.ingredientPurpose.map((ing, idx) => (
          <View
            key={`${ing.name}-${idx}`}
            style={[
              ingStyles.row,
              idx < recommendation.ingredientPurpose.length - 1 ? ingStyles.rowDivider : null,
            ]}
          >
            <Text style={ingStyles.name} maxFontSizeMultiplier={1.2}>
              {ing.name}
            </Text>
            <Text style={ingStyles.purpose} maxFontSizeMultiplier={1.2}>
              {ing.purpose}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const ingStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    color: palette.ink,
    marginBottom: 4,
  },
  purpose: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
});

// ============================================================================
// DecisionAlternatives
// ============================================================================

interface DecisionAlternativesProps {
  recommendation: Recommendation;
  onSelectAlternative: (productId: string) => void;
  onCompare: (productId: string) => void;
}

export function DecisionAlternatives({
  recommendation,
  onSelectAlternative,
  onCompare,
}: DecisionAlternativesProps) {
  if (recommendation.alternatives.length === 0) return null;
  return (
    <View>
      <SectionHeading title="Better depending on your priority" />
      <View style={altStyles.list}>
        {recommendation.alternatives.map((alt) => (
          <View key={alt.productId} style={altStyles.card}>
            <Text style={altStyles.purpose} maxFontSizeMultiplier={1.1}>
              {alt.purposeLabel}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${alt.product.brand} ${alt.product.name}`}
              onPress={() => onSelectAlternative(alt.productId)}
              style={({ pressed }) => [altStyles.row, pressed && { opacity: 0.95 }]}
            >
              <View style={altStyles.thumb}>
                <ProductStage product={alt.product} imageUrl={alt.product.imageUrl} size="tile" />
              </View>
              <View style={altStyles.copy}>
                <Text style={altStyles.brand} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                  {alt.product.brand.toUpperCase()}
                </Text>
                <Text style={altStyles.name} maxFontSizeMultiplier={1.2} numberOfLines={2}>
                  {alt.product.name}
                </Text>
                <Text style={altStyles.price} maxFontSizeMultiplier={1.1}>
                  ${alt.product.price}
                </Text>
                <Text style={altStyles.reason} maxFontSizeMultiplier={1.2}>
                  {alt.reason}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Compare with ${alt.product.brand} ${alt.product.name}`}
              onPress={() => onCompare(alt.productId)}
              style={({ pressed }) => [altStyles.compare, pressed && { opacity: 0.94 }]}
            >
              <Text style={altStyles.compareText} maxFontSizeMultiplier={1.1}>
                Compare
              </Text>
              <CaretRight size={12} color={palette.clayDeep} weight="bold" />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const altStyles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 14,
  },
  purpose: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.clayDeep,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  thumb: {
    width: 86,
  },
  copy: {
    flex: 1,
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkSecondary,
    marginBottom: 2,
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: palette.ink,
    marginBottom: 4,
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 15,
    color: palette.inkSecondary,
    marginBottom: 6,
  },
  reason: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: palette.inkSecondary,
  },
  compare: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: palette.clayPaper,
  },
  compareText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: -0.05,
    color: palette.clayDeep,
  },
});

// ============================================================================
// AdaptiveStickyCTA
// ============================================================================

interface AdaptiveStickyCTAProps {
  recommendation: Recommendation;
  onPrimary: () => void;
  onSecondary: () => void;
}

export function AdaptiveStickyCTA({
  recommendation,
  onPrimary,
  onSecondary,
}: AdaptiveStickyCTAProps) {
  const { cta } = recommendation;
  return (
    <View style={ctaStyles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cta.primaryLabel}
        onPress={onPrimary}
        style={({ pressed }) => [ctaStyles.primaryBtn, pressed && ctaStyles.primaryBtnPressed]}
      >
        <Text style={ctaStyles.primaryLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
          {cta.primaryLabel}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cta.secondaryLabel}
        onPress={onSecondary}
        style={({ pressed }) => [ctaStyles.secondaryBtn, pressed && ctaStyles.secondaryBtnPressed]}
      >
        <Text style={ctaStyles.secondaryLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
          {cta.secondaryLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const ctaStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(252, 253, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    gap: 8,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: '#0A0C12',
  },
  primaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.inkInverse,
  },
  secondaryBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: {
    backgroundColor: palette.bgDeep,
  },
  secondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
});
