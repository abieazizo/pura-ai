/**
 * v25 — locked design tokens for the post-onboarding redesign.
 *
 * Mirrors the onboarding v25 tokens but adds the full sage / amber
 * semantic palette and motion/easing tokens used across Home, Routine,
 * Progress, Products, Product Detail, and AI Assist.
 *
 * Color names match the spec exactly. Existing app code keeps reading
 * `palette` from `@/theme`; the redesigned surfaces use `T` from this
 * module so the editorial design system stays internally consistent
 * without rippling through every legacy screen.
 */

import { Easing } from 'react-native-reanimated';

export const T = {
  paper: '#FCFDFF',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  ink: '#080A0F',
  inkSecondary: '#514B47',
  inkMuted: '#807870',
  line: '#E5EAF1',
  lineStrong: '#D8CDC4',

  terracotta: '#147CFF',
  terracottaDeep: '#A94736',
  terracottaSoft: '#F3E2DB',
  terracottaMist: '#FAF1ED',

  sage: '#56705F',
  sageSoft: '#E7EEE8',
  amber: '#896322',
  amberSoft: '#F6EACF',
  neutralSoft: '#EEEAE5',
  neutralDeep: '#625D59',
  neutralMid: '#716A64',
  failedSoft: '#EAF4FF',

  overlayDark: 'rgba(8,10,15,0.45)',
} as const;

export const TYPE = {
  serif: 'InstrumentSerif-Regular',
  serifSemi: 'InstrumentSerif-SemiBold',
  serifItalic: 'InstrumentSerif-Italic',
  sans: 'Inter-Regular',
  sansMed: 'Inter-Medium',
  sansSemi: 'Inter-SemiBold',
  sansBold: 'Inter-Bold',
} as const;

export const RADIUS = {
  hero: 24,
  card: 20,
  inset: 14,
  pill: 999,
  small: 10,
} as const;

export const SHADOW = {
  card: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.025,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  hero: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.045,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  overlay: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.10,
    shadowRadius: 46,
    shadowOffset: { width: 0, height: 20 },
    elevation: 14,
  },
} as const;

export const SPACE = {
  gutter: 20,
  section: 28,
  cardGap: 12,
  heroPad: 22,
  cardPad: 18,
  insetPad: 14,
  topAfterHeader: 16,
} as const;

export const MOTION = {
  fast: { duration: 140, easing: Easing.bezier(0.22, 1, 0.36, 1) },
  base: { duration: 220, easing: Easing.bezier(0.22, 1, 0.36, 1) },
  expand: { duration: 280, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  hero: { duration: 340, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  data: { duration: 620, easing: Easing.bezier(0.25, 0.8, 0.25, 1) },
} as const;
