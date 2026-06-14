/**
 * buyHandoff — the Buy button's SWAPPABLE backend (money flow step 5).
 *
 * The button calls `activeBuyBackend.checkout(items)`. Today that's the
 * affiliate handoff (opens the retailer with the selected products + shows the
 * required affiliate disclosure). Tomorrow it's owned checkout — the SAME
 * button, a different backend, zero screen changes. The screen only knows the
 * `BuyBackend` interface, never the implementation.
 */
import type { CommerceSku } from '@/commerce/types';

export interface BuyItem {
  sku: CommerceSku;
}

export interface BuyResult {
  ok: boolean;
  opened: number;
  message?: string;
}

export interface BuyBackend {
  readonly id: string;
  /** CTA label — "Get these" today; "Buy now" / "Place order" when owned. */
  readonly cta: string;
  /** Affiliate disclosure to show beneath the button, or null (owned checkout). */
  readonly disclosure: string | null;
  checkout(items: BuyItem[]): Promise<BuyResult>;
}

/**
 * Open one URL, web-safe (new tab on web, system browser/app on native).
 * react-native is required LAZILY (native branch only) so this module stays
 * importable from plain Node — the contract verifier reads the backends without
 * dragging RN into the tsx runtime.
 */
async function open(url: string): Promise<boolean> {
  try {
    if (typeof document !== 'undefined') {
      const w = (globalThis as { open?: (u: string, t?: string) => unknown }).open;
      if (w) { w(url, '_blank'); return true; }
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Linking } = require('react-native') as typeof import('react-native');
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Affiliate handoff — opens the retailer with the chosen products. The primary
 * (hero) product opens immediately; the rest follow. Honest disclosure shown.
 */
export const affiliateBuyBackend: BuyBackend = {
  id: 'affiliate-amazon',
  cta: 'Get these',
  disclosure:
    'These are affiliate links — Pura may earn a small commission if you buy, at no extra cost to you. It never changes which products we pick: we rank only by fit to your skin.',
  async checkout(items) {
    if (items.length === 0) return { ok: false, opened: 0, message: 'Nothing selected.' };
    let opened = 0;
    for (const { sku } of items) {
      // eslint-disable-next-line no-await-in-loop
      if (await open(sku.affiliateUrl)) opened += 1;
    }
    return { ok: opened > 0, opened };
  },
};

/**
 * Owned-checkout backend (the future swap). Same interface; no affiliate
 * disclosure. Stubbed until the real cart exists — wiring it in is a ONE-LINE
 * change to `activeBuyBackend`, nothing on the screen moves.
 */
export const ownedCheckoutBackend: BuyBackend = {
  id: 'owned-checkout',
  cta: 'Place your order',
  disclosure: null,
  async checkout() {
    return { ok: false, opened: 0, message: 'Owned checkout is not live yet.' };
  },
};

/** The single swap point. Flip this to `ownedCheckoutBackend` when it's ready. */
export const activeBuyBackend: BuyBackend = affiliateBuyBackend;
