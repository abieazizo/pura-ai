/**
 * tokens — composition layer. Reads the named atmosphere palette (theme) and
 * the shared type scale (ds) so component files carry NO literal hex and the
 * editorial type is consistent: Instrument Serif is the orb's voice, Inter is
 * the UI. The morning greeting is the opening line of a letter — serif, 30/1.25.
 */

import type { TextStyle } from 'react-native';
import { dsType } from '@/theme/ds';

export const SERIF = 'InstrumentSerif-Regular';
export const SERIF_ITALIC = 'InstrumentSerif-Italic';
export const SANS = 'Inter-Regular';
export const SANS_MED = 'Inter-Medium';
export const SANS_SEMI = 'Inter-SemiBold';

export const rType = {
  /** Opening-line greeting / first-reveal — Instrument Serif 30, line-height 1.25. */
  letter: { fontFamily: SERIF, fontSize: 30, lineHeight: 37.5, letterSpacing: -0.4 } as TextStyle,
  /** The action as hero on the focus card / ritual step. */
  hero: { fontFamily: SERIF, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 } as TextStyle,
  /** Section header the morph's move title rises into. */
  section: { fontFamily: SERIF, fontSize: 24, lineHeight: 29, letterSpacing: -0.4 } as TextStyle,
  /** Move card title. */
  moveTitle: { fontFamily: SERIF, fontSize: 22, lineHeight: 27, letterSpacing: -0.3 } as TextStyle,
  /** The throughline — a small muted Instrument Serif caption. */
  throughline: { fontFamily: SERIF, fontSize: 16, lineHeight: 23, letterSpacing: -0.1 } as TextStyle,
  /** Product name (serif, quiet). */
  productName: { fontFamily: SERIF, fontSize: 20, lineHeight: 25, letterSpacing: -0.2 } as TextStyle,
  body: dsType.body,
  bodyMed: dsType.bodyMed,
  bodySm: dsType.bodySm,
  label: dsType.label,
  labelSm: dsType.labelSm,
  button: dsType.button,
} as const;
