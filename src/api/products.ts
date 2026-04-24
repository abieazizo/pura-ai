import { seedProducts } from '@/data/seed';
import type { Product } from '@/types';

export async function listProducts(): Promise<Product[]> {
  return seedProducts;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return seedProducts.find((p) => p.id === id);
}
