/**
 * v18.6 — Commerce enrichment helpers, shared between the server
 * proxy handler (`server/lib/handlers.ts::lookupLiveProducts`) and
 * the client orchestrator (`src/api/liveProducts.ts`).
 *
 * Critical correctness note (v18.5 was broken because of this):
 *   The previous pass put `enrichCommerce` only inside the client
 *   orchestrator. A direct curl POST to `/lookupLiveProducts`
 *   bypassed the orchestrator entirely and saw raw AI output —
 *   null URLs, null merchant names. Endpoint output didn't change.
 *
 *   v18.6 moves the enrichment into a shared module so the SERVER
 *   handler now runs it before the response leaves the proxy. The
 *   endpoint test now sees enriched candidates immediately.
 *
 * Zero external dependencies — this file imports only the
 * `LiveProductCandidate` type from the shared contracts. Safe to
 * import from both server and client without bundler warnings.
 */

// v18.7 — Use a RELATIVE import path. The server's tsx/cjs runtime
// loader does not honour the TypeScript `@/` path alias the way
// the React Native bundler does. Even a type-only import like this
// can break tsx's resolution under some setups; a relative path is
// safe across all entry points (Metro middleware, standalone proxy,
// and the React Native bundle).
import type { LiveProductCandidate } from '../ai/ai-contracts';

// ---------------------------------------------------------------------------
// Trusted hosts. Used by sanitizeCandidate to drop AI-supplied URLs
// pointing at hosts the app does not vouch for. Subdomains of trusted
// hosts (e.g. shop.sephora.com) pass through.
// ---------------------------------------------------------------------------

export const TRUSTED_HOSTS = new Set<string>([
  // Major retailers
  'sephora.com',
  'ulta.com',
  'amazon.com',
  'amazon.co.uk',
  'amazon.ca',
  'boots.com',
  'cultbeauty.com',
  'cultbeauty.co.uk',
  'lookfantastic.com',
  'lookfantastic.co.uk',
  'spacenk.com',
  'beautypie.com',
  'dermstore.com',
  'target.com',
  'walmart.com',
  'mecca.com',
  'mecca.com.au',
  'adore.com.au',
  'feelunique.com',
  // Brand DTC domains — keep this list in sync with BRAND_DTC below.
  'cerave.com',
  'cerave.co.uk',
  'laroche-posay.us',
  'laroche-posay.co.uk',
  'theordinary.com',
  'paulaschoice.com',
  'paulaschoice.co.uk',
  'beautyofjoseon.com',
  'cosrx.com',
  'kiehls.com',
  'supergoop.com',
  'naturium.com',
  'glowrecipe.com',
  'youthtothepeople.com',
  'goodmolecules.com',
  'biotherm.com',
  'biotherm-usa.com',
  'elfcosmetics.com',
  'innisfree.com',
  'laneige.com',
  'drunkelephant.com',
  'tatcha.com',
  'fentyskin.com',
  'rare-beauty.com',
  'ren-skincare.com',
  'kinship.com',
  'iliabeauty.com',
  'farmacybeauty.com',
  'firstaidbeauty.com',
  'kosas.com',
  'merit-beauty.com',
  'summerfridays.com',
  'biossance.com',
  'krave-beauty.com',
  'anuaglobal.com',
  'anua-global.com',
  'bonajour.com',
  'illiyoon.com',
  'itsskin.com',
  'theinkeylist.com',
]);

// ---------------------------------------------------------------------------
// Brand → DTC site map. Lowercase brand keys; first one to match
// wins. Keep this list in sync with TRUSTED_HOSTS above.
// ---------------------------------------------------------------------------

export const BRAND_DTC: Record<string, { host: string; merchant: string }> = {
  'the ordinary': { host: 'theordinary.com', merchant: 'The Ordinary' },
  'the inkey list': {
    host: 'theinkeylist.com',
    merchant: 'The Inkey List',
  },
  'inkey list': { host: 'theinkeylist.com', merchant: 'The Inkey List' },
  cerave: { host: 'cerave.com', merchant: 'CeraVe' },
  'la roche-posay': { host: 'laroche-posay.us', merchant: 'La Roche-Posay' },
  'la roche posay': { host: 'laroche-posay.us', merchant: 'La Roche-Posay' },
  "paula's choice": { host: 'paulaschoice.com', merchant: "Paula's Choice" },
  'paulas choice': { host: 'paulaschoice.com', merchant: "Paula's Choice" },
  'paula choice': { host: 'paulaschoice.com', merchant: "Paula's Choice" },
  cosrx: { host: 'cosrx.com', merchant: 'COSRX' },
  'beauty of joseon': {
    host: 'beautyofjoseon.com',
    merchant: 'Beauty of Joseon',
  },
  "kiehl's": { host: 'kiehls.com', merchant: "Kiehl's" },
  kiehls: { host: 'kiehls.com', merchant: "Kiehl's" },
  supergoop: { host: 'supergoop.com', merchant: 'Supergoop!' },
  'supergoop!': { host: 'supergoop.com', merchant: 'Supergoop!' },
  naturium: { host: 'naturium.com', merchant: 'Naturium' },
  'glow recipe': { host: 'glowrecipe.com', merchant: 'Glow Recipe' },
  'youth to the people': {
    host: 'youthtothepeople.com',
    merchant: 'Youth To The People',
  },
  'good molecules': {
    host: 'goodmolecules.com',
    merchant: 'Good Molecules',
  },
  biossance: { host: 'biossance.com', merchant: 'Biossance' },
  'drunk elephant': {
    host: 'drunkelephant.com',
    merchant: 'Drunk Elephant',
  },
  tatcha: { host: 'tatcha.com', merchant: 'Tatcha' },
  farmacy: { host: 'farmacybeauty.com', merchant: 'Farmacy' },
  'first aid beauty': {
    host: 'firstaidbeauty.com',
    merchant: 'First Aid Beauty',
  },
  kosas: { host: 'kosas.com', merchant: 'Kosas' },
  merit: { host: 'merit-beauty.com', merchant: 'Merit' },
  'summer fridays': {
    host: 'summerfridays.com',
    merchant: 'Summer Fridays',
  },
  'krave beauty': { host: 'krave-beauty.com', merchant: 'Krave Beauty' },
  anua: { host: 'anuaglobal.com', merchant: 'Anua' },
  'fenty skin': { host: 'fentyskin.com', merchant: 'Fenty Skin' },
  ilia: { host: 'iliabeauty.com', merchant: 'Ilia' },
  'rare beauty': { host: 'rare-beauty.com', merchant: 'Rare Beauty' },
  ren: { host: 'ren-skincare.com', merchant: 'REN' },
  'e.l.f.': { host: 'elfcosmetics.com', merchant: 'e.l.f.' },
  elf: { host: 'elfcosmetics.com', merchant: 'e.l.f.' },
  innisfree: { host: 'innisfree.com', merchant: 'innisfree' },
  laneige: { host: 'laneige.com', merchant: 'LANEIGE' },
};

// ---------------------------------------------------------------------------
// URL helpers.
// ---------------------------------------------------------------------------

/** Strip leading "www." from a URL's host. Returns null on parse fail. */
export function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    let host = u.host.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    return host;
  } catch {
    return null;
  }
}

export function isTrustedUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  if (TRUSTED_HOSTS.has(host)) return true;
  for (const t of TRUSTED_HOSTS) {
    if (host.endsWith('.' + t)) return true;
  }
  return false;
}

/** Pretty-name a host into a merchant string. */
export function merchantNameForHost(host: string): string {
  if (host.endsWith('sephora.com')) return 'Sephora';
  if (host.endsWith('ulta.com')) return 'Ulta';
  if (host.startsWith('amazon.')) return 'Amazon';
  if (host.endsWith('boots.com')) return 'Boots';
  if (host.endsWith('cultbeauty.com') || host.endsWith('cultbeauty.co.uk'))
    return 'Cult Beauty';
  if (
    host.endsWith('lookfantastic.com') ||
    host.endsWith('lookfantastic.co.uk')
  )
    return 'LookFantastic';
  if (host.endsWith('spacenk.com')) return 'Space NK';
  if (host.endsWith('dermstore.com')) return 'Dermstore';
  if (host.endsWith('target.com')) return 'Target';
  if (host.endsWith('walmart.com')) return 'Walmart';
  if (host.endsWith('mecca.com.au') || host.endsWith('mecca.com'))
    return 'Mecca';
  if (host.endsWith('feelunique.com')) return 'Feelunique';
  // First-segment fallback ("naturium.com" → "Naturium").
  const seg = host.split('.')[0] ?? host;
  return seg.replace(/-/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/** Build a Sephora search URL keyed by brand + name. */
export function sephoraSearchUrl(brand: string, name: string): string {
  const q = encodeURIComponent(`${brand} ${name}`);
  return `https://www.sephora.com/search?keyword=${q}`;
}

// ---------------------------------------------------------------------------
// sanitizeCandidate — drops AI-supplied URLs pointing at untrusted
// hosts. Run BEFORE enrichCommerce so a bad AI URL collapses to null
// and then enrichment fills it in deterministically.
// ---------------------------------------------------------------------------

export function sanitizeCandidate(c: LiveProductCandidate): LiveProductCandidate {
  let productUrl = c.productUrl;
  let merchantName = c.merchantName;
  let imageUrl = c.imageUrl;
  let imageSource = c.imageSource;

  if (productUrl && !isTrustedUrl(productUrl)) {
    productUrl = null;
    if (imageSource === 'merchant' || imageSource === 'brand') {
      merchantName = merchantName ?? null;
    }
  }
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    imageUrl = null;
    imageSource = 'none';
  }
  return {
    ...c,
    productUrl,
    merchantName,
    imageUrl,
    imageSource,
  };
}

// ---------------------------------------------------------------------------
// enrichCommerce — deterministic post-processor that fills missing
// commerce fields. Runs on the SERVER inside the proxy handler so
// the endpoint response itself is always enriched. Idempotent: when
// productUrl is already set, this only normalises merchantName.
// ---------------------------------------------------------------------------

export function enrichCommerce(c: LiveProductCandidate): LiveProductCandidate {
  let productUrl = c.productUrl;
  let merchantName = c.merchantName;
  let imageSource = c.imageSource;

  // (1) AI gave us a trusted URL — keep it; derive merchantName from
  // the host when missing.
  if (productUrl) {
    const host = hostOf(productUrl);
    if (host && (!merchantName || merchantName.length === 0)) {
      merchantName = merchantNameForHost(host);
    }
    return { ...c, productUrl, merchantName, imageSource };
  }

  // (2) productUrl is null — try a brand DTC match by lowercase brand.
  const brandKey = (c.brand ?? '').trim().toLowerCase();
  const dtc = BRAND_DTC[brandKey];
  if (dtc) {
    productUrl = `https://www.${dtc.host}/`;
    merchantName = `${dtc.merchant} (DTC)`;
    imageSource = 'none';
    return { ...c, productUrl, merchantName, imageSource };
  }

  // (3) No DTC match — Sephora search URL fallback. Always works as
  // a real shoppable destination for major brands.
  if (c.brand && c.name) {
    productUrl = sephoraSearchUrl(c.brand, c.name);
    merchantName = 'Sephora (search)';
    imageSource = 'none';
  }
  return { ...c, productUrl, merchantName, imageSource };
}

// ---------------------------------------------------------------------------
// One-call wrapper used by both the server handler and the client
// orchestrator. Sanitize → enrich. Idempotent.
// ---------------------------------------------------------------------------

export function sanitizeAndEnrich(
  candidates: LiveProductCandidate[]
): LiveProductCandidate[] {
  return candidates.map(sanitizeCandidate).map(enrichCommerce);
}
