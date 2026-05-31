export {
  palette,
  colors,
  lightColors,
  darkColors,
  colorsFor,
  space,
  radius,
  type,
  typeMaxScale,
  shadow,
  easing,
  motion,
  spring,
  avatarSwatches,
  layout,
  pressedTints,
  fontFamily,
  SKIN_CYCLE_DAYS,
  // v7.7 scan-analyzing additions — additive namespaces
  analysisMarkers,
  status as statusColor,
  scanTypography,
  // v26 — home rebuild semantic tokens. The new home composition reads
  // ONLY from this object; nothing in components/home should embed
  // literal hex.
  pura26,
  layoutPura26,
  // pura27 — nightly control center (Home / Products / Routine). The
  // three production screens and their shared primitives are the only
  // legitimate consumers; nothing else should reach in.
  pura27,
  pura27Type,
  pura27Radius,
  pura27Space,
  pura27Shadow,
  pura27Layout,
  // puraShop — Pura Shop (commerce) tokens. Consumed only by the
  // shop screen + its primitives, and by FloatingTabBar / MeScreen
  // for app-wide nav chrome and the profile entry surface.
  puraShop,
  puraShopType,
  puraShopRadius,
  puraShopSpace,
  puraShopShadow,
  puraShopLayout,
  // puraAssist — "Pura Assist" Home + conversation surface tokens.
  // Consumed only by the new Home (AI Assist landing) and the
  // conversation screen + the animated face mesh.
  puraAssist,
  puraAssistType,
  puraAssistRadius,
  puraAssistShadow,
  puraAssistLayout,
} from './tokens';
// puraRoutine — Routine + Progress tokens. Consumed only by the
// routine domain (components/routine, screens/routine, services).
export {
  puraRoutineColors,
  puraRoutineType,
  puraRoutineRadius,
  puraRoutineSpace,
  puraRoutineShadows,
  puraRoutineMotion,
} from './puraRoutineTokens';
export type {
  PuraRoutineColor,
  PuraRoutineTypeKey,
} from './puraRoutineTokens';
export type {
  ColorPalette,
  AvatarColor,
  LayeredShadowDef,
  Palette,
  AnalysisMarkerType,
  StatusTier,
  ScanTypographyKey,
  Pura26Token,
  Pura27Token,
  PuraShopToken,
  PuraAssistToken,
} from './tokens';
export { ThemeProvider } from './ThemeProvider';
export { useTheme } from './useTheme';
