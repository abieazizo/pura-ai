import { useContext } from 'react';
import { ThemeContext, type Theme } from './ThemeProvider';
import {
  colors,
  space,
  radius,
  shadow,
  type,
  motion,
  easing,
  spring,
  layout,
} from './tokens';

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    scheme: 'light',
    colors,
    space,
    radius,
    shadow,
    type,
    motion,
    easing,
    spring,
    layout,
  };
}
