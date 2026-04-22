import { seedMatches, seedProducts } from '@/data/seed';
import type { Product, ProductMatch } from '@/types';

export async function listProducts(): Promise<Product[]> {
  return seedProducts;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return seedProducts.find((p) => p.id === id);
}

export async function listMatches(): Promise<ProductMatch[]> {
  return seedMatches;
}

export async function getMatch(
  productId: string
): Promise<ProductMatch | undefined> {
  return seedMatches.find((m) => m.productId === productId);
}
