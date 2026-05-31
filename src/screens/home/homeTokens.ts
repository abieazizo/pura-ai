/**
 * Pura — nightly experience tokens (v26).
 *
 * These tokens are scoped to the redesigned nightly loop (Home,
 * Routine, AI Assist) and live here rather than in `theme/tokens.ts`
 * because the central theme carries the app-wide cool v8 palette. The
 * nightly loop is a deliberate editorial warm island inside that
 * system, so its tokens compose separately and are imported only by
 * `components/home/*`, `screens/home/PuraNightHome.tsx`, the v25
 * Routine + Assistant screens, and the elevated Scan slot in
 * `navigation/FloatingTabBar.tsx`.
 *
 * The locked palette below is the ONE source of truth. Designers
 * tuning the warm system change values here; no component embeds hex
 * directly.
 *
 * Naming convention:
 *   - solids are named for their role (paper, surface, ink, …)
 *   - translucent variants are named for their *use*
 *     (mirrorAuraOuter, pausedMarkerRingBorder, …) so a reader can
 *     tell what role the rgba is playing without decoding the alpha
 *     math.
 */

export const pura26 = {
  // Solid surfaces — porcelain white (Pura Blue system)
  paper:             '#FCFDFF',
  surface:           '#FFFFFF',
  warmTint:          '#F7FAFF',

  // Ink scale (cool graphite)
  ink:               '#080A0F',
  inkSecondary:      '#5D6673',
  inkMuted:          '#7C8696',
  inkFaint:          '#B5BDC8',

  // Structure (cool hairlines)
  border:            '#E5EAF1',
  borderStrong:      '#D4DCE8',

  // Brand line for the nightly experience. Legacy `terracotta*` names
  // retained; values are now Pura Blue. Reserved for emotionally
  // earned moments: the primary interaction, a changed routine step,
  // active navigation, the single most meaningful safety decision.
  terracotta:        '#147CFF',
  terracottaPressed: '#075FD1',
  terracottaTint:    '#EAF4FF',
  terracottaSoft:    '#F3F8FF',
  terracottaOutline: '#A8C8FF',
  terracottaText:    '#063D8F',

  // Sage — "doing less" / "improving" / "you're done" moments.
  // Restrained semantic green, never used as a generic badge.
  sageSoft: '#E9F8F2',
  sageInk:  '#188A65',

  // Translucent variants — named by use, not alpha math.
  paperTranslucent:       'rgba(252, 253, 255, 0.82)',
  shadowWarm:             'rgba(8, 17, 31, 0.06)',
  mirrorAuraOuter:        'rgba(20, 124, 255, 0.06)',
  mirrorAuraInner:        'rgba(234, 244, 255, 0.32)',
  mirrorRim:              'rgba(7, 95, 209, 0.16)',
  scanRingBorder:         'rgba(7, 95, 209, 0.22)',
  pausedMarkerRingBorder: 'rgba(20, 124, 255, 0.32)',

  // White highlights inside the portal SVG.
  highlightStrong: 'rgba(255, 255, 255, 0.70)',
  highlightSoft:   'rgba(255, 255, 255, 0.34)',
  highlightFaint:  'rgba(255, 255, 255, 0.16)',
  highlightOff:    'rgba(255, 255, 255, 0)',

  // Atmospheric stops for the mirror radial gradient — cool icy sweep.
  mirrorHot:     '#FAFCFF',
  mirrorWarm:    '#F3F8FF',
  mirrorHollow:  '#EAF4FF',
  mirrorEdge:    '#DDE9FB',
  mirrorGather:  '#F1F6FF',
} as const;

export type Pura26Token = keyof typeof pura26;

/**
 * Layout tokens for the nightly experience. The bar height and bottom
 * clearance computation are paired so screens never land actions under
 * the floating tab bar. Update both together.
 */
export const layoutPura26 = {
  tabBarHeight: 64,
  bottomClearance(safeAreaBottom: number): number {
    return safeAreaBottom + this.tabBarHeight + 48;
  },
} as const;
