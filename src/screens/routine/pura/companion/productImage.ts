/**
 * Resolve a routine product to a renderable image source.
 *
 * The routine plan carries product *ids* but no bundled artwork. The
 * shop catalog, however, ships a clean, verified, locally-required
 * packshot for every product — and `RoutineProduct.id === ShopCatalog
 * Product.id`. We resolve through the catalog first so the companion
 * shows real, offline-safe product photography. Remote URLs are the
 * last resort (they may not load in an offline sandbox).
 */

import type { ImageSourcePropType } from 'react-native';
import type { RoutineProduct } from '@/types/routine';
import { findShopProduct } from '@/screens/shop/shopCatalog';

export function resolveRoutineProductImage(
  product?: RoutineProduct,
): ImageSourcePropType | undefined {
  if (!product) return undefined;
  const catalog = findShopProduct(product.id);
  if (catalog?.catalogPackshot) return catalog.catalogPackshot;
  if (product.imageAsset != null) return product.imageAsset;
  if (product.imageUrl) return { uri: product.imageUrl };
  return undefined;
}
