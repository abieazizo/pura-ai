/**
 * yourSkinMotion — the single DIAL BOARD for the "Your Skin" full-results
 * screen (scan-results screen 2). It REUSES the First-Finding screen's tokens
 * verbatim (the two screens are one continuous world) and adds ONLY the
 * screen-2 choreography: the calm section reveals, the one-at-a-time map
 * cross-fade, the "show me clearly" brighten-then-settle, the plan
 * consolidation that SHOWS THE LOGIC, the co-shape reorder, the collapsible
 * photo, and the plain copy. Everything tunable in one place so the screen
 * stays coherent and serene.
 */

import type { TextStyle } from 'react-native';

export {
  LAYOUT,
  EASE,
  GLOW_ALPHA_CAP,
  tokensFor,
  COPY as FINDING_COPY,
  TYPE,
} from '../firstFinding/motion';
export type { ThemeTokens, RaisedDepth } from '../firstFinding/motion';

const SERIF = 'InstrumentSerif-Regular';
const INTER = 'Inter-Regular';
const INTER_MED = 'Inter-Medium';
const INTER_SEMI = 'Inter-SemiBold';

// ───────────────────────────────────────────────────────────────────────────
// 1 · SECTION REVEAL — each section fades + rises (y+12, opacity 0→1, ~400ms
//     Easing.out) as it scrolls into view, gently staggered. NEVER on the
//     default-paint canvas all at once: it earns its calm by arriving in beats.
//     Reduced Motion drops this entirely (sections appear assembled).
// ───────────────────────────────────────────────────────────────────────────

export const REVEAL = {
  riseY: 12,
  durMs: 400,
  /** Section top must cross this fraction of the viewport to arm the reveal. */
  triggerFraction: 0.9,
  /** Extra per-child stagger inside a section (e.g. supporting rows). */
  childStaggerMs: 70,
} as const;

/** Section seams: ≥ 32px. 36 reads a hair calmer without feeling gappy. */
export const SECTION_GAP = 36;

// ───────────────────────────────────────────────────────────────────────────
// 2 · MAP — the single spotlight moves; it is NEVER doubled. The current glow
//     fades to nothing, THEN the new one blooms (a cross-fade that can never
//     show two live glows). "Show me clearly" briefly lifts the active glow's
//     alpha + crispness, then settles back to soft (soft is the default).
// ───────────────────────────────────────────────────────────────────────────

export const SPOTLIGHT = {
  /** Fade the outgoing glow out first… */
  outMs: 160,
  /** …then bloom the incoming one in. Sum ≈ a 400ms move. */
  inMs: 240,
} as const;

export const SHOW_CLEARLY = {
  upMs: 140,
  holdMs: 460,
  downMs: 560,
  /** Multiplier on the active glow alpha at the peak of the brighten. */
  boost: 1.55,
} as const;

export const COLLAPSE = { durMs: 360, thumbWidth: 92 } as const;

// ───────────────────────────────────────────────────────────────────────────
// 3 · FINDINGS — supporting rows expand in place; capped so the page is never
//     a wall of open cards.
// ───────────────────────────────────────────────────────────────────────────

export const SUPPORTING = { expandMs: 320, visibleCap: 3 } as const;

// ───────────────────────────────────────────────────────────────────────────
// 4 · PLAN CONSOLIDATION — the finding chips visibly MERGE into each move (the
//     logic, made visible: "redness + sensitivity → be gentle"). ONE-TIME,
//     calm, teaching — never slot-machine confetti. Reduced Motion → assembled.
// ───────────────────────────────────────────────────────────────────────────

export const CONSOLIDATE = {
  /** A chip's travel into its move card. */
  moveMs: 480,
  /** Stagger between successive moves consolidating. */
  moveStaggerMs: 150,
  /** The move card body fading up as its chips land. */
  settleMs: 260,
  /** Gap before consolidation starts after the plan section reveals. */
  startDelayMs: 220,
} as const;

/** Co-shape: one tap bumps a finding's priority and the moves re-order. */
export const COSHAPE = { reorderMs: 440 } as const;

// ───────────────────────────────────────────────────────────────────────────
// 5 · TYPE — screen-2 voice sizes (the shared TYPE scale covers UI text). The
//     synthesis + horizon + plan title are the orb's voice (Instrument Serif).
// ───────────────────────────────────────────────────────────────────────────

export const TYPE2 = {
  /** skin_summary_line — the gestalt. 24/30, tracking -0.4. */
  synthesis: {
    fontFamily: SERIF,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  } satisfies TextStyle,
  /** The oversized editorial "moment" — Section A's serif hero, tucked into the
   *  orb's negative space. 40/44, tracking -0.8. Wraps + shrinks to fit; the orb
   *  voice never truncates (adjustsFontSizeToFit on the consumer). */
  momentXL: {
    fontFamily: SERIF,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
  } satisfies TextStyle,
  /** Wide-tracked Inter caps eyebrow ("DAY 1 · YOUR SKIN"). 11px, +1.6 tracking. */
  eyebrow: {
    fontFamily: INTER_MED,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,
  /** horizon_line — the bounded, hopeful forward-look. */
  horizon: {
    fontFamily: SERIF,
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  /** "Here's what I'd focus on for you." — the plan title. */
  planTitle: {
    fontFamily: SERIF,
    fontSize: 23,
    lineHeight: 29,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  /** "This is your starting point." — the quiet Day-1 frame. */
  dayOne: {
    fontFamily: INTER_MED,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,
  /** Section eyebrow ("A few other things I noticed"). */
  sectionLabel: {
    fontFamily: INTER_MED,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.1,
  } satisfies TextStyle,
  /** Plan move title. */
  moveTitle: {
    fontFamily: INTER_SEMI,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  /** Plan move "why". */
  moveWhy: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  } satisfies TextStyle,
  /** A finding chip / tag (name) inside a move + the supporting row. */
  tag: {
    fontFamily: INTER_MED,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
  } satisfies TextStyle,
  /** On-photo location label for the active spot. */
  mapLabel: {
    fontFamily: INTER_MED,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
  } satisfies TextStyle,
  /** Quiet text affordances (toggles, "show me clearly", "I'll do this later"). */
  quiet: {
    fontFamily: INTER_MED,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.1,
  } satisfies TextStyle,
} as const;

// ───────────────────────────────────────────────────────────────────────────
// 6 · COPY — plain words only. The plan arrives ALREADY SET; the screen opens
//     and closes on forward motion and never lands on a flaw.
// ───────────────────────────────────────────────────────────────────────────

export const COPY2 = {
  startingPoint: 'This is your starting point.',
  planTitle: 'Here’s what I’d focus on for you.',
  adaptive: 'We’ll adjust this as your skin changes.',

  supportingHeader: 'A few other things I noticed',
  seeMore: (n: number) => `See ${n} more`,
  seeFewer: 'Show fewer',

  soundRight: 'Sound right?',
  confirmYes: 'Yes',
  confirmNo: 'Not me',
  downweighted: 'Got it — I’ll ease off on that one.',

  coShapePrompt: 'Anything bugging you most?',
  coShapeHint: 'Tap one and I’ll put it first.',
  coShapeDone: 'Good to know — I put that first.',

  justFindings: 'Just the findings',
  warmView: 'Back to normal',
  showClearly: 'Show me clearly',

  mapHide: 'Hide photo',
  mapShow: 'Show photo',

  build: 'Build my routine',
  buildPreview: 'I’ll set up your morning and evening routine — about a minute.',
  doLater: 'I’ll do this later',
  rescan: 'Rescan in better light',

  badPhotoBanner: 'A clearer photo in better light helps me be sure.',
  badPhotoPlan: 'Here’s a gentle starting point — we’ll refine it once I get a clearer look.',

  shareEyebrow: 'Day 1',
  shareTitle: 'My starting point',
  shareCta: 'Share my Day 1 card',
  shareSub: 'A quiet marker of where you started — never a list of flaws.',

  moreOptions: 'View options',

  /** Honest privacy line. The photo IS sent to our AI provider to read the
   *  skin, so we must NOT promise it is never sent to anyone — only that it
   *  isn't stored after the read. Mirrors the First-Finding privacy copy. */
  privacy: 'Your photo is sent securely to read your skin, then it’s never stored.',
} as const;
