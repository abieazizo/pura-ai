/**
 * checkLinkHealth — probes every outbound product URL in the commerce +
 * curated catalogs and writes src/commerce/linkHealth.json (the quarantine
 * ledger the runtime guard reads). Run: npx tsx scripts/checkLinkHealth.ts
 *
 * Honest semantics: quarantine ONLY on definitive death —
 *   • HTTP 404 / 410 on a GET after redirects
 *   • DNS failure (ENOTFOUND) on retry
 * Everything else (2xx/3xx obviously, but also 403/429/503 bot walls and
 * timeouts) is INCONCLUSIVE → the product stays live. A flaky network must
 * never silently shrink the catalog.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMMERCE_CATALOG } from '../src/commerce/catalog';
import { CURATED_PRODUCTS } from '../src/data/curatedProducts';

interface Target { id: string; url: string }

const targets: Target[] = [
  ...COMMERCE_CATALOG.map((s) => ({ id: s.id, url: s.affiliateUrl })),
  ...CURATED_PRODUCTS.filter((p) => !!p.productUrl).map((p) => ({ id: p.id, url: p.productUrl! })),
];

const DEAD_STATUS = new Set([404, 410]);

async function probe(t: Target): Promise<{ id: string; url: string; reason: string } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(t.url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; PuraLinkHealth/1.0)' },
      });
      clearTimeout(timer);
      if (DEAD_STATUS.has(res.status)) return { id: t.id, url: t.url, reason: `http_${res.status}` };
      return null; // alive or inconclusive — stays live either way
    } catch (e) {
      const code = (e as { cause?: { code?: string } })?.cause?.code ?? '';
      if (code === 'ENOTFOUND' && attempt === 1) return { id: t.id, url: t.url, reason: 'dns_enotfound' };
      // abort/timeout/reset → retry once, then inconclusive.
    }
  }
  return null;
}

async function main() {
  console.log(`probing ${targets.length} product URLs…`);
  const quarantined: Array<{ id: string; url: string; reason: string }> = [];
  // Small batches — politeness beats speed for a health check.
  for (let i = 0; i < targets.length; i += 6) {
    const batch = targets.slice(i, i + 6);
    const results = await Promise.all(batch.map(probe));
    for (const r of results) if (r) quarantined.push(r);
    process.stdout.write(`  ${Math.min(i + 6, targets.length)}/${targets.length}\r`);
  }
  const ledger = {
    checkedAt: new Date().toISOString(),
    checked: targets.length,
    quarantined,
  };
  writeFileSync(join(__dirname, '../src/commerce/linkHealth.json'), JSON.stringify(ledger, null, 2));
  console.log(`\nchecked ${targets.length}, quarantined ${quarantined.length}`);
  for (const q of quarantined) console.log(`  ✗ ${q.id} — ${q.reason}`);
}

main();
