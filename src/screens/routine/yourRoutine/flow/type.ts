/**
 * flow/type — the LOCKED type ramp for the two-act routine redesign.
 *
 * Instrument Serif is the editorial voice (the plan title, the ritual step
 * moment, product/step names). Inter is the UI. Exact to the brief:
 *   • Serif 34 — overview title        (LH 1.05)
 *   • Serif 40 — the ritual step moment (LH 1.05)
 *   • Serif 22 — step / product name    (LH 1.1)
 *   • Inter 16/600 — product name / UI  (LH 1.4)
 *   • Inter 15/600 — Start
 *   • Inter 13/400 — muted spec/duration/context (LH 1.4)
 *   • Inter 12/600 +0.08em UPPERCASE — eyebrow (TODAY / STEP n OF m)
 *
 * No hex here (font families + numbers only), so it may live in the screens dir.
 */

import type { TextStyle } from 'react-native';

const SERIF = 'InstrumentSerif-Regular';
const SANS_REG = 'Inter-Regular';
const SANS_MED = 'Inter-Medium';
const SANS_SEMI = 'Inter-SemiBold';

export const flowType = {
  /** ACT 1 — the overview title ("Your morning, in three steps"). */
  overviewTitle: {
    fontFamily: SERIF,
    fontSize: 34,
    lineHeight: 36, // ~1.05
    letterSpacing: -0.6,
  } as TextStyle,
  /** ACT 2 — the ritual step name: THE moment. */
  stepMoment: {
    fontFamily: SERIF,
    fontSize: 40,
    lineHeight: 42, // ~1.05
    letterSpacing: -0.9,
  } as TextStyle,
  /** Step / product name (serif, quiet). */
  name: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 25, // ~1.1
    letterSpacing: -0.3,
  } as TextStyle,
  /** Product name / primary UI line — Inter 16/600. */
  uiName: {
    fontFamily: SANS_SEMI,
    fontSize: 16,
    lineHeight: 22, // ~1.4
    letterSpacing: -0.1,
  } as TextStyle,
  /** The Start label — Inter 15/600. */
  start: {
    fontFamily: SANS_SEMI,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  } as TextStyle,
  /** Muted spec / duration / context — Inter 13/400. */
  context: {
    fontFamily: SANS_REG,
    fontSize: 13,
    lineHeight: 18, // ~1.4
    letterSpacing: 0,
  } as TextStyle,
  /** Slightly stronger context (a duration value) — Inter 13/500. */
  contextMed: {
    fontFamily: SANS_MED,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,
  /** Eyebrow — Inter 12/600, +0.08em, UPPERCASE (TODAY · AM · STEP n OF m). */
  eyebrow: {
    fontFamily: SANS_SEMI,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.96, // 0.08em × 12px
    textTransform: 'uppercase',
  } as TextStyle,
} as const;

export type FlowTypeRamp = typeof flowType;
