/**
 * v28 — ProductDetailV25Screen.
 *
 * Re-exports the canonical Product Detail screen from
 * `src/screens/productDetail/ProductDetailScreen.tsx`, which is the
 * v28 calm-hero-plus-two-secondaries rebuild. The TabNavigator imports
 * this path to keep navigation wiring stable; the actual implementation
 * lives in the canonical module.
 *
 * The legacy "Verdict Page v27" implementation that previously lived
 * here is preserved in version control if it ever needs to be retrieved.
 */

export { ProductDetailScreen as ProductDetailV25Screen } from '@/screens/productDetail/ProductDetailScreen';
