/**
 * RitualProduct — the per-step product, on the dark theater canvas.
 *
 * ACT 2's "the bottle in your hand": the REAL packshot for this step + its name
 * (Inter 16/600) and brand (the eyebrow register), quietly, so the user knows
 * exactly which product this step means. NOTHING else — no price, no "buy", no
 * "see my pick", no bundle/shop link. Commerce never appears in the ritual.
 *
 * Product-free is a first-class state: when the step has no pick (or the catalog
 * can't resolve a packshot), this renders NOTHING and returns no empty chip or
 * hole — the layout above (instruction + Done) simply stays centered.
 *
 * Tokens only: colors from `ritualTone`, type from `flowType`. The packshot sits
 * on its own porcelain chip (Packshot owns that) so white-field product
 * photography reads as an object, not a hole, against the near-black room.
 */

import React from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { resolvePackshot } from '../../components/Packshot';
import type { StepVM } from '../../model';
import { flowType } from '../type';
import { ritualTone } from '@/theme/routineFlow';

const PACKSHOT = 64;

export interface RitualProductProps {
  step: StepVM;
}

/**
 * Renders the step's product on dark, or nothing when the step is product-free.
 * Kept a thin local Image (not `Packshot`) so the chip + hairline read on the
 * dark surface exactly per `ritualTone`, while still resolving the SAME real
 * catalog packshot via the shared `resolvePackshot`.
 */
export function RitualProduct({ step }: RitualProductProps) {
  const pick = step.product.pick;
  if (!pick) return null;
  const source: ImageSourcePropType | undefined = resolvePackshot(pick);
  if (!source) return null;

  // VoiceOver reads the product as one phrase, after the instruction.
  const label = `Product: ${pick.brand}, ${pick.name}`;

  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      <View
        style={styles.chip}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          source={source}
          resizeMode="contain"
          style={styles.image}
        />
      </View>
      <View style={styles.text}>
        <Text
          style={[flowType.eyebrow, styles.brand]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          importantForAccessibility="no"
        >
          {pick.brand}
        </Text>
        <Text
          style={[flowType.uiName, styles.name]}
          numberOfLines={2}
          maxFontSizeMultiplier={1.4}
          importantForAccessibility="no"
        >
          {pick.name}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 24,
  },
  chip: {
    width: PACKSHOT,
    height: PACKSHOT,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ritualTone.hairline,
    // Packshots are shot on white — keep the field bright so the bottle reads
    // as an object on the night surface, not a dark hole.
    backgroundColor: ritualTone.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: PACKSHOT - 10, height: PACKSHOT - 10 },
  text: { flex: 1 },
  brand: { color: ritualTone.faint },
  name: { color: ritualTone.ink, marginTop: 3 },
});
