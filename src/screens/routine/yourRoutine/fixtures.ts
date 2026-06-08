/**
 * fixtures — a deterministic demo scan + routine + moves for the harness and
 * for verification. The data is chosen so the model renders the spec's example
 * copy exactly: the morning cleanse traces to "redness on your left cheek", the
 * canonical ritual trio (cleanse → moisturiser → SPF) appears in AM, one step
 * is product-free, one product is "maybe skip for now", and a rescan variant
 * shows real, honest improvement for the adaptive update.
 *
 * Nothing here ships in the real flow — the experience reads the live store.
 */

import type { CustomRoutine, RoutineProduct, RoutineStep } from '@/types/routine';
import type { VisibleFinding } from '@/types/scanResults';
import type { RoutineFocusMove } from './model';

type PricedProduct = RoutineProduct & { price?: number };

const finding = (
  id: string,
  type: VisibleFinding['type'],
  zones: VisibleFinding['zones'],
  priority: VisibleFinding['priority'],
  confidence: number,
  shortFinding: string,
): VisibleFinding => ({
  id,
  type,
  displayName: shortFinding,
  present: true,
  supportedByScan: true,
  confidence,
  priority,
  zones,
  shortFinding,
  recommendedDirection: 'Keep it calm and consistent.',
});

export const demoFindings: VisibleFinding[] = [
  finding('f-redness', 'redness', ['left_cheek'], 'high', 0.82, 'Redness on left cheek'),
  finding('f-dryness', 'dryness', ['left_cheek', 'right_cheek'], 'medium', 0.7, 'Dry cheeks'),
  finding('f-darkmarks', 'dark_marks', ['chin'], 'low', 0.5, 'A few dark marks'),
];

// One product used across AM + PM (the moisturiser), so the honest bundle can
// prove it's counted once.
const pMoist: PricedProduct = {
  id: 'p-moist',
  brand: 'Plain',
  name: 'Everyday Moisturiser',
  productType: 'hydrate',
  whyMatched: 'Puts moisture back without any fuss.',
  availability: 'recommended',
  price: 16,
};
const pSpf: PricedProduct = {
  id: 'p-spf',
  brand: 'Daylight',
  name: 'Light SPF 50',
  productType: 'protect',
  whyMatched: 'The one that earns its place.',
  availability: 'recommended',
  price: 19,
};
const pTreat: PricedProduct = {
  id: 'p-treat',
  brand: 'Slow',
  name: 'Gentle Dark-Mark Serum',
  productType: 'treat',
  whyMatched: 'For the dark marks, eventually. No rush.',
  availability: 'recommended',
  price: 22,
};

const step = (
  id: string,
  order: number,
  type: RoutineStep['type'],
  timing: RoutineStep['timing'],
  directions: string,
  relatedFocusAreaIds: string[],
  opts: { product?: RoutineProduct; optional?: boolean } = {},
): RoutineStep => ({
  id,
  order,
  type,
  title: type.charAt(0).toUpperCase() + type.slice(1),
  purpose: directions,
  directions,
  timing,
  frequency: 'Daily',
  optional: opts.optional ?? false,
  relatedFocusAreaIds,
  product: opts.product,
  availability: opts.product ? opts.product.availability : 'not_required',
});

export const demoRoutine: CustomRoutine = {
  id: 'routine-demo',
  scanId: 'scan-demo',
  createdAt: '2026-06-08T08:00:00.000Z',
  status: 'active',
  // AM — the canonical trio, product-free first step.
  morningSteps: [
    step('am-cleanse', 1, 'cleanse', 'morning', 'Warm water, a gentle cleanser, no scrubbing.', ['f-redness']),
    step('am-moist', 2, 'hydrate', 'morning', "A pea-size of moisturiser while your skin's still damp.", ['f-dryness'], { product: pMoist }),
    step('am-spf', 3, 'protect', 'morning', 'Two fingers of SPF, last thing before you leave.', ['f-darkmarks'], { product: pSpf }),
  ],
  // PM — includes the "maybe skip for now" optional treat.
  eveningSteps: [
    step('pm-cleanse', 1, 'cleanse', 'evening', 'Warm water, take the day off gently.', ['f-redness']),
    step('pm-treat', 2, 'treat', 'evening', 'A thin layer on the marks only.', ['f-darkmarks'], { product: pTreat, optional: true }),
    step('pm-moist', 3, 'hydrate', 'evening', 'Moisturiser to seal the night in.', ['f-dryness'], { product: pMoist }),
  ],
  explanation: [
    'Three small things, built around what the scan saw.',
    'Nothing harsh while we calm the redness.',
  ],
  canStartMorning: true,
  canStartEvening: true,
  limitedByScan: false,
};

export const demoMoves: RoutineFocusMove[] = [
  { title: 'Be gentle', why: 'Your left cheek is a little red.', addresses: ['f-redness'] },
  { title: 'Bring moisture back', why: 'Your cheeks read dry.', addresses: ['f-dryness'] },
  { title: "Protect what you've got", why: 'The SPF does the long game.', addresses: ['f-darkmarks'] },
];

// --- Rescan variant: real, honest improvement for the adaptive update -------

export const rescanFindings: VisibleFinding[] = [
  finding('f-redness', 'redness', ['left_cheek'], 'low', 0.38, 'Redness, much calmer'),
  finding('f-dryness', 'dryness', ['left_cheek', 'right_cheek'], 'low', 0.4, 'Cheeks softer'),
  finding('f-darkmarks', 'dark_marks', ['chin'], 'low', 0.5, 'Dark marks, slow fade'),
];

export const adaptiveAfterRescan = {
  calmerLately: true,
  /** The orb's adaptive line — eases off, adds one thing. Honest, no hype. */
  line:
    "Your cheeks are calmer than last month. Let's ease off the heavy calming and add one gentle thing for the marks.",
  /** A truthful milestone — never a fake "great progress". */
  milestone: 'Three weeks in. The redness reads lower. That much is real.',
} as const;

/**
 * A recent completion ledger with a couple of gaps, so the kind consistency
 * view can celebrate the run without ever shaming the misses. Pure: anchored
 * to a passed-in date.
 */
export function recentCompletionDates(anchor: Date): string[] {
  const gaps = new Set([3, 4, 9]); // days-ago that were missed — never surfaced as failure
  const out: string[] = [];
  for (let ago = 0; ago < 21; ago++) {
    if (gaps.has(ago)) continue;
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - ago);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push(key);
  }
  return out.sort();
}
