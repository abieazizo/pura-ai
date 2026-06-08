/**
 * metricTint — ONE tint family per finding (no rainbow), in both themes.
 *
 * The glow is ADDITIVE light (screen / plus-lighter), so the `glow` color is the
 * light we ADD — never a paint over skin. Each metric gets a single, soft tint;
 * Pura Blue (#147CFF) is reserved for UI/action and is NEVER a concern tint.
 *
 * Differentiate-Without-Color rule: color is never the only signal — every glow
 * is paired with a plain location chip + leader line and the card's plain words.
 * So these tints can stay soft and accessible; meaning lives in the text too.
 */

import type { MetricKind } from '@/types/skinRead';

export type ScreenTheme = 'dark' | 'light';

export interface MetricTint {
  /** The light we ADD onto the photo (radial-gradient core color). */
  glow: string;
  /** Level-pill background (soft capsule) + text. */
  pillBg: string;
  pillText: string;
  /** On-photo location chip (sits over the photo, must read on imagery). */
  chipBg: string;
  chipText: string;
  chipBorder: string;
  /** 1px leader line from chip → region centroid. */
  line: string;
}

// Soft tint anchors (NOT Pura Blue). Warm, low-saturation, friendly.
//   redness     → coral red   #FF6B5E
//   dryness     → soft sand    #E8C9A0
//   dark_marks  → soft mauve   #C7A2C8
//   breakouts   → soft coral-pink #FF8FA0
//   oil         → soft amber   #F2C879
//   positive    → success green (a calm, earned "good")
//   neutral     → warm porcelain light
const ANCHOR: Record<MetricKind, string> = {
  redness: '#FF6B5E',
  dryness: '#E8C9A0',
  dark_marks: '#C7A2C8',
  breakouts: '#FF8FA0',
  oil: '#F2C879',
  positive: '#74D6A8',
  neutral: '#FBE7CF',
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
/** Mix a tint toward white (for soft pastel pill/chip fills). t=0 → tint. */
function lighten(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}
/** Mix toward ink (for legible pill text on a soft fill). */
function darken(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (c: number) => Math.round(c * (1 - t));
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

export function metricTint(metric: MetricKind, theme: ScreenTheme): MetricTint {
  const anchor = ANCHOR[metric] ?? ANCHOR.neutral;
  if (theme === 'dark') {
    return {
      // Luminous heat on near-black — the additive core is lifted ~10% toward
      // white so screen-blend reads as light, not paint, on black.
      glow: lighten(anchor, 0.1),
      pillBg: rgba(anchor, 0.18),
      pillText: lighten(anchor, 0.55),
      chipBg: 'rgba(14, 16, 22, 0.72)',
      chipText: '#FFFFFF',
      chipBorder: rgba(anchor, 0.55),
      line: rgba(anchor, 0.8),
    };
  }
  return {
    glow: anchor,
    pillBg: lighten(anchor, 0.82),
    pillText: darken(anchor, 0.55),
    chipBg: 'rgba(255, 255, 255, 0.92)',
    chipText: '#1B2230',
    chipBorder: rgba(anchor, 0.6),
    line: rgba(anchor, 0.85),
  };
}

/** Stand-alone helpers for callers that only want the additive color at alpha. */
export const tintRgba = rgba;
