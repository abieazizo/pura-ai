/**
 * bloomSchedule — WHEN each located glow blooms, so it lands ON the spoken word.
 *
 * The signature beat is the glow blooming as the orb SPEAKS the place. The screen
 * speaks `openingLine` word-by-word (OrbSpeech: startDelay + i·wordStagger), so a
 * glow for a region must fire when that region's word is revealed.
 *
 * REFINEMENT over a naive map (the old screen anchored a cheek glow on the
 * trailing SIDE word "left", so on the canonical line — "…redness on your cheeks,
 * a little more on the left." — both cheeks waited until the very last word):
 *
 *   • Anchor timing on the region's GENERAL place noun ("cheek"/"cheeks",
 *     "forehead", "chin"…), NOT the trailing side word. So both cheeks bloom as
 *     the orb says "cheeks" — mid-sentence, tied to the concern as it's named —
 *     and the later "left" simply confirms the side the chip already shows.
 *   • The STRONGER spot still reads first + brighter: spots arrive strongest-first,
 *     and when two share an anchor word they bloom strongest-first, one beat apart.
 *   • A spot whose word isn't in the line falls back to the final word (never
 *     before its moment, never lost).
 *
 * Pure (no react-native) → unit-tested headlessly in scripts/verifyFirstFinding.ts.
 */

import type { FaceRegionKey } from '@/types/skinRead';

const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/** General PLACE noun(s) per region — these drive bloom TIMING (when spoken). */
const ANCHOR_NOUNS: Record<FaceRegionKey, string[]> = {
  forehead: ['forehead'],
  between_brows: ['brows', 'eyebrows', 'brow', 'eyebrow'],
  nose: ['nose'],
  around_nose: ['nose'],
  left_cheek: ['cheek', 'cheeks'],
  right_cheek: ['cheek', 'cheeks'],
  under_eyes: ['eyes', 'eye'],
  around_mouth: ['mouth', 'lips', 'lip'],
  chin: ['chin'],
  jaw: ['jaw', 'jawline'],
};

/** Side words only DISAMBIGUATE a region; used as a timing fallback. */
const SIDE_WORD: Partial<Record<FaceRegionKey, string>> = {
  left_cheek: 'left',
  right_cheek: 'right',
};

/**
 * Word index that should TRIGGER a region's bloom: the general place noun first,
 * then the side word, else -1 (caller falls back to the last word).
 */
export function anchorWordIndex(words: string[], region: FaceRegionKey): number {
  const lower = words.map(cleanWord);
  const nouns = ANCHOR_NOUNS[region];
  for (let i = 0; i < lower.length; i++) {
    if (nouns.includes(lower[i])) return i;
  }
  const side = SIDE_WORD[region];
  if (side) {
    const si = lower.indexOf(side);
    if (si >= 0) return si;
  }
  return -1;
}

export interface BloomScheduleOpts {
  /** Base offset before word 0 — match OrbSpeech's startDelay so clocks share t0. */
  startDelayMs: number;
  /** Per-word reveal stagger (same value passed to OrbSpeech). */
  wordStaggerMs: number;
  /** Land a hair AFTER the word starts revealing (reads as "on" the word). */
  onWordOffsetMs: number;
  /** Minimum spacing when two glows share an anchor word (strongest-first). */
  bloomStaggerMs: number;
}

export interface BloomSchedule {
  /** Bloom time (ms from line start) per input region, in the SAME order. */
  times: number[];
  /** Index of the temporally-FIRST bloom (the stronger one) — for the haptic. */
  firstIndex: number;
}

/**
 * Compute per-region bloom times. `regions` are STRONGEST-FIRST (index 0 is the
 * brightest spot). Times are monotonic per resolved word order with a strongest-
 * first tie-break, so the stronger side always blooms first + brighter.
 */
export function computeBloomSchedule(
  words: string[],
  regions: FaceRegionKey[],
  opts: BloomScheduleOpts,
): BloomSchedule {
  const { startDelayMs, wordStaggerMs, onWordOffsetMs, bloomStaggerMs } = opts;
  const lastIdx = Math.max(0, words.length - 1);

  const raw = regions.map((region, i) => {
    let idx = anchorWordIndex(words, region);
    if (idx < 0) idx = lastIdx;
    return { i, idx };
  });

  // Resolve order: earliest spoken word first; ties → strongest-first (lower i).
  const order = [...raw].sort((a, b) => a.idx - b.idx || a.i - b.i);

  const times = new Array<number>(regions.length).fill(0);
  let prev = -Infinity;
  for (const e of order) {
    let t = startDelayMs + e.idx * wordStaggerMs + onWordOffsetMs;
    if (t <= prev) t = prev + bloomStaggerMs;
    prev = t;
    times[e.i] = t;
  }

  return { times, firstIndex: order.length ? order[0].i : 0 };
}
