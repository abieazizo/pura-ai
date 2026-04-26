/**
 * Server-side catalog lookup for the barcode resolution flow.
 *
 * The proxy owns the catalog because:
 *   • A real catalog (UPC database, internal product table) is large
 *     and would bloat the RN bundle.
 *   • Letting the AI tool-call into a server-owned function keeps the
 *     two-step loop fully server-side: the client only ever sees the
 *     final canonical BarcodeResolution.
 *
 * The default implementation below is a small in-memory catalog used
 * for development + verification. In production, replace
 * `defaultCatalog` with a query against a UPC database, an internal
 * product table, or a third-party API. The function signature must
 * stay as `(barcodeValue: string) => Promise<BarcodeLookupResult | null>`.
 *
 * No imports from the RN bundle here on purpose — the server must run
 * cleanly in Node without pulling Expo / RN modules.
 */

import type { BarcodeLookupResult } from '../../src/ai/claude-client';

interface CatalogEntry {
  id: string;
  brand: string;
  product_name: string;
  category: BarcodeLookupResult['product_category'];
  key_claims: string[];
  packaging_notes: string;
}

/**
 * Tiny development catalog. Production deployments should replace
 * this with a real lookup.
 */
const defaultCatalog: Record<string, CatalogEntry> = {
  'gentle-foam-cleanser': {
    id: 'gentle-foam-cleanser',
    brand: 'Acme',
    product_name: 'Gentle Foam Cleanser',
    category: 'cleanser',
    key_claims: ['glycerin', 'panthenol', 'fragrance-free'],
    packaging_notes:
      'White soft-touch tube, 150ml, sky-blue cap. EN/FR labelling.',
  },
  'salicylic-spot-treatment': {
    id: 'salicylic-spot-treatment',
    brand: 'Acme',
    product_name: 'Spot Treatment 2%',
    category: 'spot_treatment',
    key_claims: ['salicylic acid 2%'],
    packaging_notes:
      'Tinted glass bottle with dropper, 30ml, amber colour. EN labelling only.',
  },
  'hydra-niacinamide-serum': {
    id: 'hydra-niacinamide-serum',
    brand: 'Acme',
    product_name: 'Hydra Niacinamide Serum',
    category: 'serum',
    key_claims: ['niacinamide 5%', 'hyaluronic acid'],
    packaging_notes:
      'Frosted glass bottle with pipette, 30ml, white outer carton.',
  },
};

export async function lookupBarcodeServerSide(
  barcodeValue: string
): Promise<BarcodeLookupResult | null> {
  const entry = defaultCatalog[barcodeValue];
  if (!entry) return null;
  return {
    matched_catalog_product_id: entry.id,
    brand: entry.brand,
    product_name: entry.product_name,
    canonical_title: `${entry.brand} ${entry.product_name}`,
    product_category: entry.category,
    likely_concerns_supported: [],
    key_claims: entry.key_claims,
    barcode_value: barcodeValue,
    catalog_lookup_key: entry.id,
    packaging_notes: entry.packaging_notes,
  };
}
