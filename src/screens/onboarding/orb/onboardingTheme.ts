/**
 * onboardingTheme — the light + dark appearance for the orb-interview screens.
 *
 * Dark mode is first-class (the orb is a light source — more beautiful in the
 * dark), not an inversion. Resolution mirrors the app's ThemeProvider:
 * `appearance` ('light' | 'dark' | 'system') with `useColorScheme()` for
 * 'system'. All the exact spec colors live here so the screens + card read from
 * one source.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, useColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

export type OnboardingScheme = 'light' | 'dark';
export type AuraTheme = 'violet-cool' | 'blue-warm';

export interface OnboardingColors {
  /** Page canvas. */
  base: string;
  /** Dark-only radial pool behind the orb (top → base). */
  liftTop: string;
  liftBottom: string;
  /** Card surface gradient (light) / glass + solid fallback (dark). */
  cardTop: string;
  cardBottom: string;
  cardGlass: string; // dark glass (translucent)
  cardSolid: string; // dark solid (Reduce Transparency / Android default)
  cardBorder: string; // resting hairline
  cardBorderSelected: string; // Pura Blue
  cardTint: string; // selected surface wash
  iconWell: string; // resting icon-well fill
  iconWellSelected: string;
  shadowContact: string;
  shadowAmbient: string;
  /** Card label (Inter). */
  label: string;
  /** Card sublabel (Inter, muted). */
  sublabel: string;
  /** The orb's voice (Instrument Serif) — question + reaction lines. */
  serif: string;
  /** The whisper of distinction on an interpolated {goal} word. */
  serifAccent: string;
  /** Eyebrow (Inter SemiBold caps). */
  eyebrow: string;
  /** Progress rail track. */
  railTrack: string;
}

const PURA_BLUE = '#147CFF';

const LIGHT: OnboardingColors = {
  base: '#FCFDFF',
  liftTop: '#FCFDFF',
  liftBottom: '#FCFDFF',
  cardTop: '#FFFFFF',
  cardBottom: '#FDFEFF',
  cardGlass: '#FFFFFF',
  cardSolid: '#FFFFFF',
  cardBorder: 'rgba(8,10,15,0.06)',
  cardBorderSelected: PURA_BLUE,
  cardTint: 'rgba(20,124,255,0.04)',
  iconWell: 'rgba(20,124,255,0.10)',
  iconWellSelected: 'rgba(20,124,255,0.18)',
  // FULL-alpha shadow inks — the card's shadowOpacity carries the intended
  // alpha exactly once. (Alpha here AND in shadowOpacity multiplied to ~2%
  // effective: the "two-shadow card" rule was shipping invisible.)
  shadowContact: '#080A0F',
  shadowAmbient: '#080A0F',
  label: '#0A0B12',
  sublabel: '#6E6E73',
  serif: '#080A0F',
  serifAccent: '#1F6FE0', // a whisper toward Pura Blue
  eyebrow: '#6E6E73',
  // Visible against porcelain for low vision — the unfilled track is how the
  // user FEELS the interview's length without a count.
  railTrack: 'rgba(8,10,15,0.13)',
};

const DARK: OnboardingColors = {
  base: '#0A0B12',
  liftTop: '#101218',
  liftBottom: '#0A0B12',
  cardTop: 'rgba(28,30,40,0.72)',
  cardBottom: 'rgba(28,30,40,0.72)',
  cardGlass: 'rgba(28,30,40,0.72)',
  cardSolid: '#1C1E28',
  cardBorder: 'rgba(255,255,255,0.08)', // top-lit hairline (dark elevation)
  cardBorderSelected: PURA_BLUE,
  cardTint: 'rgba(20,124,255,0.12)',
  iconWell: 'rgba(20,124,255,0.16)',
  iconWellSelected: 'rgba(20,124,255,0.28)',
  // Full-alpha (see LIGHT) — the card's shadowOpacity carries the alpha.
  shadowContact: '#000000',
  shadowAmbient: '#000000',
  label: 'rgba(255,255,255,0.92)',
  sublabel: 'rgba(255,255,255,0.55)',
  serif: 'rgba(255,250,245,0.96)', // slightly brighter warm-white than UI text
  serifAccent: '#7FB4FF',
  eyebrow: 'rgba(255,255,255,0.55)',
  railTrack: 'rgba(255,255,255,0.12)',
};

export const ONBOARDING_COLORS: Record<OnboardingScheme, OnboardingColors> = {
  light: LIGHT,
  dark: DARK,
};

/** Rail / aura accent color for a theme (brighter in dark). */
export function auraAccent(theme: AuraTheme, scheme: OnboardingScheme): string {
  if (theme === 'blue-warm') return scheme === 'dark' ? '#5AA0FF' : '#2E86F0';
  return scheme === 'dark' ? '#A99CF0' : '#8B7CD8';
}

/** Resolve the onboarding scheme the same way the app's ThemeProvider does. */
export function useOnboardingScheme(): OnboardingScheme {
  const system = useColorScheme();
  const appearance = useAppStore((s) => s.appearance);
  if (appearance === 'system') return system === 'dark' ? 'dark' : 'light';
  return appearance === 'dark' ? 'dark' : 'light';
}

/** Combined onboarding theme: scheme + resolved colors. */
export function useOnboardingTheme() {
  const scheme = useOnboardingScheme();
  return { scheme, dark: scheme === 'dark', colors: ONBOARDING_COLORS[scheme] };
}

/**
 * iOS "Reduce Transparency" (separate from Reduce Motion). When on, dark glass
 * cards fall back to solid so the design stays complete. No-op (false) on
 * platforms without the setting.
 */
export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    const api: any = AccessibilityInfo as any;
    if (typeof api.isReduceTransparencyEnabled === 'function') {
      api
        .isReduceTransparencyEnabled()
        .then((v: boolean) => mounted && setReduce(!!v))
        .catch(() => {});
    }
    let sub: { remove: () => void } | undefined;
    try {
      sub = AccessibilityInfo.addEventListener(
        'reduceTransparencyChanged' as any,
        (v: boolean) => mounted && setReduce(!!v),
      );
    } catch {}
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);
  // Android has no equivalent; treat as off (glass is an enhancement anyway).
  return Platform.OS === 'ios' ? reduce : false;
}
