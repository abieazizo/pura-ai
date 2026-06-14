/**
 * Money-flow theme — the light Porcelain utility surface (blueprint design):
 * a whisper of cool blue, never peach. Two-shadow cards at radius 22–24,
 * Instrument Serif headlines + Inter UI, Pura Blue CTAs. Kept local so these
 * commerce screens share one look without re-deriving it per file.
 */
import { Platform, type ViewStyle } from 'react-native';

export const money = {
  bg: '#FCFDFF', // porcelain page
  surface: '#FFFFFF', // cards
  ink: '#080A0F',
  muted: '#6E6E73',
  faint: 'rgba(8, 22, 56, 0.40)',
  hairline: 'rgba(8, 22, 56, 0.08)',
  blue: '#147CFF',
  blueDeep: '#075FD1',
  blue06: 'rgba(20, 124, 255, 0.06)',
  blue10: 'rgba(20, 124, 255, 0.10)',
  blue15: 'rgba(20, 124, 255, 0.15)',
  whisper: '#EFF5FC', // the cool-blue lift at the very top
  budget: '#1E8E5A', // the honest budget-tier accent (green = thrift, not alarm)
} as const;

/** The signature two-shadow card lift (contact + ambient). */
export const cardShadow: ViewStyle =
  Platform.OS === 'web'
    ? ({
        boxShadow:
          '0px 1px 2px rgba(8,22,56,0.06), 0px 12px 28px rgba(8,22,56,0.08)',
      } as unknown as ViewStyle)
    : {
        shadowColor: '#0A1638',
        shadowOpacity: 0.1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      };

export const SERIF = 'InstrumentSerif-Regular';
export const SERIF_SEMI = 'InstrumentSerif-SemiBold';
