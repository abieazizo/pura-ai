import React, { createContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  colorsFor,
  type ColorPalette,
  space,
  radius,
  shadow,
  type,
  motion,
  easing,
  spring,
  layout,
} from './tokens';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export type AppearanceMode = 'light' | 'dark' | 'system';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: ColorPalette;
  space: typeof space;
  radius: typeof radius;
  shadow: typeof shadow;
  type: typeof type;
  motion: typeof motion;
  easing: typeof easing;
  spring: typeof spring;
  layout: typeof layout;
}

export const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const appearance = useAppStore((s) => s.appearance);

  const value = useMemo<Theme>(() => {
    const scheme: 'light' | 'dark' =
      appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
    return {
      scheme,
      colors: colorsFor(scheme),
      space,
      radius,
      shadow,
      type,
      motion,
      easing,
      spring,
      layout,
    };
  }, [appearance, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
