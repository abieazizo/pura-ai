/**
 * linkHealth — the runtime quarantine guard (habit step 5).
 *
 * scripts/checkLinkHealth.ts probes every outbound product URL and writes
 * linkHealth.json: a ledger of hard-dead products (404/410/DNS-gone). This
 * module is the read side: surfaces filter their pool through
 * `healthyCatalog` so a dead or discontinued product can never render a
 * broken link — the catalog quietly omits it until the next check clears it.
 *
 * Honest semantics: ONLY definitively-dead URLs quarantine a product.
 * Rate-limits, bot walls, and timeouts are inconclusive — never quarantined
 * (a flaky check must not silently shrink the catalog).
 */

export interface LinkHealthLedger {
  checkedAt: string;
  checked: number;
  quarantined: Array<{ id: string; url: string; reason: string }>;
}

// Bundled statically; ~1KB. Regenerate with: npx tsx scripts/checkLinkHealth.ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ledger: LinkHealthLedger = require('./linkHealth.json');

const quarantinedIds = new Set(ledger.quarantined.map((q) => q.id));

export function isQuarantined(id: string): boolean {
  return quarantinedIds.has(id);
}

/** Filter any product pool by id — the one gate every surface shares. */
export function healthyCatalog<T extends { id: string }>(pool: readonly T[]): T[] {
  return pool.filter((p) => !quarantinedIds.has(p.id));
}

export function linkHealthLedger(): LinkHealthLedger {
  return ledger;
}
