/**
 * PlanSection — Section D. The relief and the hinge. The plan arrives ALREADY
 * SET: 2–3 raised move cards the user FOLLOWS, never assembles. The only choice
 * offered is a single optional co-shape tap — and even that defaults to "leave
 * it as set".
 *
 * MEANINGFUL CONSOLIDATION (one-time, on first arrival): each move's finding
 * chips gather from above and MERGE into the move card as its title + why fade
 * up — motion that TEACHES the logic ("redness + sensitivity → be gentle"),
 * never slot-machine confetti. Reduced Motion → the plan is simply assembled.
 *
 * THE ONE CO-SHAPE TOUCH (invisible until invited): a single quiet line
 * "Anything bugging you most?" reveals the findings as chips; one tap bumps that
 * finding's priority and the moves gently re-order. No config screen, no
 * required decision. It turns "your plan" into "our plan".
 *
 * WORKS PRODUCT-FREE: every move is doable with what the person already owns.
 * No product, price, or upsell appears here. The plan is framed as evolving with
 * future scans.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { CONSOLIDATE, COPY2, EASE, LAYOUT, TYPE, TYPE2, type ThemeTokens } from './yourSkinMotion';
import type { MetricTint } from '../firstFinding/metricTint';
import type { RoutineFocusMove, SkinReadFinding } from '@/types/skinRead';
import { hapt } from '@/utils/haptics';

export interface PlanSectionProps {
  moves: RoutineFocusMove[];
  findingsById: Record<string, SkinReadFinding>;
  tintByFinding: Record<string, MetricTint>;
  concernFindings: SkinReadFinding[]; // for the co-shape chip list (no positives)
  downweighted: Set<string>;
  tokens: ThemeTokens;
  reduceMotion: boolean;
  /** Flip false→true once the section first reveals — plays consolidation ONCE. */
  play: boolean;
  coShapePriorityId: string | null;
  onCoShape: (findingId: string) => void;
  badPhoto?: boolean;
}

export function PlanSection(props: PlanSectionProps) {
  const {
    moves, findingsById, tintByFinding, concernFindings, downweighted,
    tokens, reduceMotion, play, coShapePriorityId, onCoShape, badPhoto,
  } = props;

  const [coShapeOpen, setCoShapeOpen] = useState(false);
  const coShaped = coShapePriorityId != null;

  return (
    <View>
      <Text style={[TYPE2.planTitle, { color: tokens.line }]} maxFontSizeMultiplier={1.4} accessibilityRole="header">
        {COPY2.planTitle}
      </Text>
      {badPhoto && (
        <Text style={[TYPE2.moveWhy, { color: tokens.label, marginTop: 6 }]} maxFontSizeMultiplier={1.6}>
          {COPY2.badPhotoPlan}
        </Text>
      )}

      <View style={{ marginTop: 16, gap: 12 }}>
        {moves.map((m, i) => (
          <Animated.View key={m.id} layout={reduceMotion ? undefined : LinearTransition.duration(440).easing(EASE.io)}>
            <MoveCard
              move={m}
              index={i}
              findingsById={findingsById}
              tintByFinding={tintByFinding}
              downweighted={downweighted}
              tokens={tokens}
              reduceMotion={reduceMotion}
              play={play}
              prioritized={coShapePriorityId != null && m.addressesIds.includes(coShapePriorityId)}
            />
          </Animated.View>
        ))}
      </View>

      {/* Adaptive framing — the plan evolves with rescans. */}
      <Text style={[TYPE2.quiet, { color: tokens.faint, marginTop: 14 }]} maxFontSizeMultiplier={1.6}>
        {COPY2.adaptive}
      </Text>

      {/* THE ONE CO-SHAPE TOUCH — quiet line; chips are invisible until invited. */}
      {concernFindings.length > 1 && (
        <View style={[styles.coShape, { borderTopColor: tokens.depth.hairline }]}>
          {coShaped ? (
            <Text style={[TYPE2.quiet, { color: tokens.body }]} maxFontSizeMultiplier={1.6}>
              {COPY2.coShapeDone}
            </Text>
          ) : !coShapeOpen ? (
            <Pressable onPress={() => { setCoShapeOpen(true); hapt.select(); }} accessibilityRole="button" hitSlop={6}>
              <Text style={[TYPE2.quiet, { color: tokens.accent }]} maxFontSizeMultiplier={1.6}>
                {COPY2.coShapePrompt}
              </Text>
            </Pressable>
          ) : (
            <View>
              <Text style={[TYPE2.quiet, { color: tokens.label, marginBottom: 8 }]} maxFontSizeMultiplier={1.6}>
                {COPY2.coShapeHint}
              </Text>
              <View style={styles.coChips}>
                {concernFindings.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => { onCoShape(f.id); hapt.tap(); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Put ${f.name} first`}
                    style={[styles.coChip, { borderColor: tokens.depth.hairline, backgroundColor: tokens.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(8,10,15,0.03)' }]}
                  >
                    <Text style={[TYPE2.tag, { color: tokens.body }]} maxFontSizeMultiplier={1.4}>{f.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function MoveCard({
  move, index, findingsById, tintByFinding, downweighted, tokens, reduceMotion, play, prioritized,
}: {
  move: RoutineFocusMove;
  index: number;
  findingsById: Record<string, SkinReadFinding>;
  tintByFinding: Record<string, MetricTint>;
  downweighted: Set<string>;
  tokens: ThemeTokens;
  reduceMotion: boolean;
  play: boolean;
  prioritized: boolean;
}) {
  const p = useSharedValue(reduceMotion ? 1 : 0);
  const played = useRef(reduceMotion);

  // Chips for the findings this move consolidates (skip down-weighted ones —
  // "not me" clears a finding's plan influence).
  const chips = move.addressesIds
    .map((id) => findingsById[id])
    .filter((f): f is SkinReadFinding => !!f && !downweighted.has(f.id));

  useEffect(() => {
    if (!play || played.current) return;
    played.current = true;
    if (reduceMotion) { p.value = 1; return; }
    p.value = withDelay(
      CONSOLIDATE.startDelayMs + index * CONSOLIDATE.moveStaggerMs,
      withTiming(1, { duration: CONSOLIDATE.moveMs, easing: EASE.out }, (fin) => {
        if (fin) runOnJS(hapt.cardLand)();
      }),
    );
    return () => cancelAnimation(p);
  }, [play, reduceMotion, index, p]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: 0.0 + p.value,
    transform: [{ translateY: (1 - p.value) * 10 }, { scale: 0.98 + 0.02 * p.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (p.value - 0.35) / 0.65),
    transform: [{ translateY: (1 - p.value) * 4 }],
  }));

  return (
    <Animated.View
      style={[
        styles.moveCard,
        {
          borderRadius: LAYOUT.cardRadius,
          borderColor: prioritized ? tokens.accent : tokens.depth.hairline,
          borderWidth: prioritized ? 1.25 : StyleSheet.hairlineWidth,
          boxShadow: [
            { offsetX: 0, offsetY: tokens.depth.contact.offsetY, blurRadius: tokens.depth.contact.blur, spreadDistance: 0, color: tokens.depth.contact.color },
            { offsetX: 0, offsetY: tokens.depth.ambient.offsetY, blurRadius: tokens.depth.ambient.blur, spreadDistance: 0, color: tokens.depth.ambient.color },
          ],
        } as ViewStyle,
        cardStyle,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Plan focus: ${move.title}. ${move.why}${chips.length ? `. Addresses ${chips.map((c) => c.name).join(', ')}` : ''}`}
    >
      <LinearGradient colors={tokens.depth.surface} style={[StyleSheet.absoluteFill, { borderRadius: LAYOUT.cardRadius }]} pointerEvents="none" />
      <LinearGradient colors={[tokens.depth.innerHighlight, 'transparent']} style={styles.innerHighlight} pointerEvents="none" />

      <View style={styles.moveBody}>
        {/* The chips that MERGE in — they sit at the top, the logic of the move. */}
        {chips.length > 0 && (
          <View style={styles.tagRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {chips.map((f, ci) => (
              <ConsolidatingChip key={f.id} p={p} index={ci} reduceMotion={reduceMotion} tokens={tokens} tint={tintByFinding[f.id]} finding={f} />
            ))}
          </View>
        )}

        <Animated.View style={bodyStyle}>
          <Text style={[TYPE2.moveTitle, { color: tokens.name, marginTop: chips.length ? 10 : 0 }]} maxFontSizeMultiplier={1.5} accessibilityRole="header">
            {move.title}
          </Text>
          <Text style={[TYPE2.moveWhy, { color: tokens.body, marginTop: 4 }]} maxFontSizeMultiplier={1.8}>
            {move.why}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** One finding chip converging into its move (translate + scale + fade from a
 *  gathered position above the card). Reduced Motion → already seated. */
function ConsolidatingChip({
  p, index, reduceMotion, tokens, tint, finding,
}: {
  p: SharedValue<number>;
  index: number;
  reduceMotion: boolean;
  tokens: ThemeTokens;
  tint: MetricTint;
  finding: SkinReadFinding;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    if (reduceMotion) return { opacity: 1, transform: [] };
    const start = Math.min(0.5, index * 0.1);
    const local = Math.max(0, Math.min(1, (p.value - start) / 0.45));
    return {
      opacity: local,
      transform: [
        { translateY: (1 - local) * -20 - index * 2 },
        { scale: 0.92 + 0.08 * local },
      ],
    };
  });
  return (
    <Animated.View style={[styles.chip, { backgroundColor: tokens.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(8,10,15,0.03)', borderColor: tokens.depth.hairline }, style]}>
      <Text style={[TYPE2.tag, { color: tokens.body }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{finding.name}</Text>
      {finding.metric !== 'positive' && (
        <View style={[styles.chipPill, { backgroundColor: tint.pillBg }]}>
          <Text style={[TYPE.pill, { color: tint.pillText, fontSize: 11 }]} maxFontSizeMultiplier={1.2}>{finding.level}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  moveCard: { overflow: 'hidden' },
  innerHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 26 },
  moveBody: { padding: LAYOUT.cardPadding },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 6, paddingVertical: 5, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  chipPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  coShape: { marginTop: 18, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  coChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  coChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
