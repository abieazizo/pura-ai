/**
 * v22.2 — Centralized dev-debug visibility gate for product surfaces.
 *
 * Production builds and normal Expo Go sessions must NEVER show the
 * yellow REAL PATH diagnostic cards, the red AI PROXY OFFLINE banner,
 * or the detail-payload marker. These were previously gated on
 * `__DEV__` alone, which is true in every Expo Go session — so they
 * leaked into real user screenshots.
 *
 * v22.2 gates them behind TWO conditions:
 *   1. __DEV__ must be true (production builds always hidden)
 *   2. EXPO_PUBLIC_SHOW_PRODUCT_DEBUG must be 'true' (explicit opt-in)
 *
 * The flag must be set explicitly via Expo env var to enable the
 * diagnostic surface. Default behavior in every other configuration
 * is: hide all debug UI. The user never sees engineering scaffolding.
 */

const PRODUCT_DEBUG_FLAG =
  (process.env.EXPO_PUBLIC_SHOW_PRODUCT_DEBUG ?? '').trim().toLowerCase() ===
  'true';

/**
 * Should the Products tab render the developer diagnostic surfaces
 * (REAL PATH yellow card, AI PROXY OFFLINE red banner, detail
 * payload marker)? Returns true only when BOTH the build is a
 * development build AND the explicit env flag is set.
 */
export function shouldShowProductDebug(): boolean {
  return __DEV__ && PRODUCT_DEBUG_FLAG;
}
