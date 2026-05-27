/**
 * v28 — ProductsV25Screen.
 *
 * Re-exports the canonical Products screen from
 * `src/screens/products/ProductsScreen.tsx`, which is the v28
 * one-glance-one-answer rebuild. The TabNavigator imports this path
 * to keep navigation wiring stable; the actual implementation lives
 * in the canonical module.
 *
 * The legacy "Skin Edit v27" implementation that previously lived
 * here is preserved in version control if it ever needs to be
 * retrieved.
 */

export { ProductsScreen as ProductsV25Screen } from '@/screens/products/ProductsScreen';
