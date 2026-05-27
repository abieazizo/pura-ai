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
  // Solid surfaces
  paper:             '#FAF7F4',
  surface:           '#FCFAF7',
  warmTint:          '#F7F0EC',

  // Ink scale (locked spec)
  ink:               '#1A1A1A',
  inkSecondary:      '#625C58',
  inkMuted:          '#8A817B',
  inkFaint:          '#B4AAA3',

  // Structure (locked spec)
  border:            '#E8DFD8',
  borderStrong:      '#DED3CC',

  // Terracotta family — the brand line for the nightly experience.
  // Solely reserved for emotionally earned moments: the primary
  // interaction, a changed routine step, active navigation, the single
  // most meaningful safety decision.
  terracotta:        '#C65D48',
  terracottaPressed: '#B6533F',
  terracottaTint:    '#F3E2DC',
  terracottaSoft:    '#F2DFD9',
  terracottaOutline: '#D9A292',
  terracottaText:    '#984637',

  // Sage — used exclusively for the "doing less" / "this is improving"
  // / "you're done" moments. Restrained, never used as a "success
  // green" badge.
  sageSoft: '#E5ECE4',
  sageInk:  '#49614F',

  // Translucent variants — named by use, not alpha math.
  paperTranslucent:       'rgba(250, 247, 244, 0.82)',
  shadowWarm:             'rgba(31, 20, 16, 0.045)',
  mirrorAuraOuter:        'rgba(198, 93, 72, 0.06)',
  mirrorAuraInner:        'rgba(243, 226, 220, 0.32)',
  mirrorRim:              'rgba(152, 70, 55, 0.16)',
  scanRingBorder:         'rgba(152, 70, 55, 0.22)',
  pausedMarkerRingBorder: 'rgba(198, 93, 72, 0.32)',

  // White highlights inside the portal SVG.
  highlightStrong: 'rgba(255, 255, 255, 0.70)',
  highlightSoft:   'rgba(255, 255, 255, 0.34)',
  highlightFaint:  'rgba(255, 255, 255, 0.16)',
  highlightOff:    'rgba(255, 255, 255, 0)',

  // Atmospheric warmth stops for the mirror radial gradient.
  mirrorHot:     '#FCF2EC',
  mirrorWarm:    '#F8EEEA',
  mirrorHollow:  '#F3E2DC',
  mirrorEdge:    '#EBD3CC',
  mirrorGather:  '#FCEFE9',
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
