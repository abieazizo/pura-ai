/**
 * Pura Shop — THE EDIT.
 *
 * The shop is the back half of the scan: Pura's curation of YOUR skin's
 * products, a living personal collection a companion tends — not a store, not a
 * merch grid. This screen is a thin mount; everything (the depth system, the
 * curation set-down, the collection hero, concern-threaded sections, the
 * finding-echo glows, the honest replenishment) lives in `theEdit/`, which
 * renders ONLY from the canonical `useSkinShop` model (every product tied to a
 * finding, the kept routine, or a concern).
 */

import React from 'react';
import { TheEditScreen } from './theEdit';

export function PuraShopScreen() {
  return <TheEditScreen />;
}
