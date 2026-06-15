/**
 * OverviewStepRow — one routine step as a calm row card (ACT 1, the overview).
 *
 * A white card (overviewTone.card, radius 24, the two-shadow overviewTone
 * .cardShadow — a premium lift + contact, not a flat drop). Reading left→right:
 *   • a quiet step GLYPH (the 1-based position within its AM/PM group, or a soft
 *     Pura-Blue tick once the step is done) — calm, never a badge or a score;
 *   • a text column — the action NAME (serif 22, Ink, from step.action, short),
 *     the product line beneath it (muted 13 = brand + name, only when a pick
 *     exists), and a DurationChip;
 *   • the BleedingPackshot — the REAL product photo as an oversized object
 *     spilling 12–20px past the card's right edge.
 *
 * STEP NUMBERING: the glyph numbers 1-based WITHIN its AM/PM group, so MORNING
 * reads 1·2·3 and EVENING reads 1·2·3 again. With both groups under their own
 * SectionLabel heading, each numeral reads as "position within this part of the
 * day" — the heading owns the AM/PM split — not one continuous 1..6 list. Done
 * steps drop the numeral entirely for a tick, so a finished group never shows a
 * competing run of numbers.
 *
 * Done is CALM: the glyph becomes a soft Pura-Blue tick that is ALREADY settled —
 * the overview is a typeset PLAN, not the ritual, so the check is never re-drawn
 * and fires no haptic on mount (a self-drawing check + its mid-draw tap are the
 * RITUAL's Done beat, never a beat for merely *viewing* a finished plan). The
 * card settles a touch. Undone is simply the full-present default — zero guilt,
 * zero warning colour, no "X left", no nag. ZERO commerce: the packshot is an
 * object already in the plan, with no press target and no "see my pick".
 *
 * The "settled" dim is held SHALLOW on purpose: a done step in the non-active
 * (already-dimmed) group must still read as calmly settled, never disabled or
 * dead-grey. So done dims the CARD a hair only; the name/product keep full ink
 * (the tick, not a grey-out, says "done"), preventing the parent-group dim ×
 * done-dim × text-dim stack the plan forbids.
 *
 * MOTION (only from flow/motion.ts): the SOLE beat is useSetDown(staggerIndex) —
 * the row drops in (translateY 16→0 + opacity, brief spring) on the one
 * continuous cascade continued from the header. The done tick rides that same
 * set-down; it does not animate independently. Reduce-motion: useSetDown presents
 * the row instantly (no transform) and the tick is, as always here, already-drawn.
 *
 * A11y: the whole row is ONE VoiceOver node reading name → product → duration →
 * (done); Dynamic Type wraps the serif name and the product line without
 * clipping. Colours from overviewTone, type from flowType.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { overviewTone } from '@/theme/routineFlow';
import { flowType } from '../type';
import { useSetDown } from '../motion';
import { stepDurationText, type OverviewStepRowProps } from '../contracts';
import { DrawCheck } from '../../components/DrawCheck';
import { BleedingPackshot } from './BleedingPackshot';
import { DurationChip } from './DurationChip';

/** The object's layout slot + how far it spills past the card edge. With the
 *  card's paddingRight 18, a bleed of 18 puts the object's right edge ≈18px past
 *  the CARD boundary (2×bleed − paddingRight) — the top of the spec's 12–20px. */
const PACKSHOT_SIZE = 72;
const PACKSHOT_BLEED = 18;
const CARD_INSET = 18;
const GLYPH = 28;

export function OverviewStepRow({
  step,
  position,
  staggerIndex,
  reduceMotion,
}: OverviewStepRowProps) {
  const setDown = useSetDown(staggerIndex, reduceMotion);
  const pick = step.product.pick;
  const done = step.done;

  const durationText = stepDurationText(step);
  const productLine = pick ? `${pick.brand} ${pick.name}`.trim() : null;

  // One composed VoiceOver node: name → product → duration → done.
  const a11yLabel = [
    step.action,
    productLine,
    durationText,
    done ? 'Done' : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Animated.View
      style={[styles.outer, setDown]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
    >
      <View style={[styles.card, done && styles.cardDone]}>
        {/* Step glyph — quiet position numeral, or the calm done tick.
            The tick is rendered STATIC (already-drawn): the overview is a plan,
            not the ritual, so we never re-draw the check or fire its mid-draw
            haptic. `drawing reduceMotion` takes DrawCheck's already-drawn path —
            no path animation, no internal setTimeout, no onMidDraw/onDone wired —
            and the tick simply rides the row's useSetDown entrance. */}
        <View style={[styles.glyph, done && styles.glyphDone]}>
          {done ? (
            <DrawCheck
              size={18}
              color={overviewTone.tick}
              drawing
              reduceMotion
            />
          ) : (
            <Text
              style={styles.glyphNum}
              maxFontSizeMultiplier={1.3}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {position}
            </Text>
          )}
        </View>

        {/* Text column — the action name, the product line, the duration. */}
        <View
          style={styles.text}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.name} maxFontSizeMultiplier={1.6}>
            {step.action}
          </Text>
          {productLine ? (
            <Text style={styles.product} maxFontSizeMultiplier={1.5}>
              {productLine}
            </Text>
          ) : null}
          <View style={styles.chipRow}>
            <DurationChip text={durationText} />
          </View>
        </View>

        {/* The REAL product photo — an object spilling past the card edge. */}
        {pick ? (
          <BleedingPackshot pick={pick} size={PACKSHOT_SIZE} bleed={PACKSHOT_BLEED} />
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The wrapper carries the set-down transform; it must let the packshot bleed.
  outer: {
    overflow: 'visible',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingLeft: 18,
    // Room on the right for the bleeding object to overhang past — the bleed is
    // sized (in OverviewStepRow's PACKSHOT_BLEED) to clear THIS inset plus 12–20.
    paddingRight: CARD_INSET,
    borderRadius: overviewTone.cardRadius,
    backgroundColor: overviewTone.card,
    boxShadow: overviewTone.cardShadow,
    // The object is allowed to overhang the card's edge.
    overflow: 'visible',
  },
  // Done settles a touch — peace, not a strike-through. Held SHALLOW so a done
  // step inside the already-dimmed upcoming group never reads disabled/dead-grey:
  // the tick (not a grey-out) carries "done"; the text keeps full ink.
  cardDone: {
    opacity: 0.97,
  },
  glyph: {
    width: GLYPH,
    height: GLYPH,
    borderRadius: GLYPH / 2,
    backgroundColor: overviewTone.chip,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  glyphDone: {
    backgroundColor: 'transparent',
  },
  glyphNum: {
    ...flowType.contextMed,
    color: overviewTone.muted,
  },
  text: {
    flex: 1,
    // Keep clear of the bleeding object on the right.
    paddingRight: 12,
  },
  name: {
    ...flowType.name,
    color: overviewTone.ink,
  },
  product: {
    ...flowType.context,
    color: overviewTone.muted,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
});
