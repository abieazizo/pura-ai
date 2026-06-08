/**
 * normalizePlan — the screen-2 gate for the three "Your Skin" additions
 * (skin_summary_line, horizon_line, routine_focus). CLAUDE.md law: the screen
 * never reads raw AI output. `normalizeSkinRead` already validated the core
 * read; this is its ADDITIVE sibling (zero edits to that module) that validates
 * + maps the plan fields, and — crucially — resolves each move's `addresses`
 * (finding NAMES the model wrote) onto the matching `SkinReadFinding.id`s so the
 * consolidation animation and the finding↔move grouping are exact, never guessed.
 *
 * It derives NOTHING the model didn't say. If a field is missing or fails a
 * plain-language gate it is dropped (the screen degrades gracefully — a finished
 * plan with fewer moves, or the synthesis falling back to the opening line), and
 * findings are NEVER fabricated to fill a move.
 */

import type { RoutineFocusMove, SkinRead, SkinReadFinding } from '@/types/skinRead';

// The raw plan fields off the SAME GPT-4V response object (loose by design).
export interface RawPlanFields {
  skin_summary_line?: string;
  horizon_line?: string;
  routine_focus?: Array<{
    title?: string;
    why?: string;
    addresses?: string[];
  }>;
}

export interface PlanFields {
  skinSummaryLine?: string;
  horizonLine?: string;
  routineFocus?: RoutineFocusMove[];
}

// Compact jargon guard for the plan copy (mirrors normalizeSkinRead's intent;
// kept local so this module needs no edit to its sibling). UI must stay plain.
const BANNED = [
  't-zone', 't zone', 'glabella', 'perioral', 'periorbital', 'barrier',
  'sebum', 'erythema', 'hyperpigmentation', 'texture irregularities',
  'actives', 'exfoliant', 'exfoliants', 'comedone', 'comedones',
];

function clean(s: string | undefined): string {
  return (s ?? '').trim();
}

function isPlain(s: string): boolean {
  const l = s.toLowerCase();
  return !BANNED.some((w) => l.includes(w));
}

/** Normalize a finding name / address for fuzzy matching. */
function key(s: string): string {
  return s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Resolve one move's `addresses` (names) to finding ids. A match is: exact
 * (normalized) name, or one string containing the other, or a shared salient
 * skin word (redness/dry/spots/…). Returns the matched finding ids, de-duped
 * and in `findings` order so grouping reads top-down like the list.
 */
function resolveAddresses(addresses: string[], findings: SkinReadFinding[]): string[] {
  const WORDS = ['red', 'dry', 'flak', 'dark', 'spot', 'mark', 'bump', 'break', 'oil', 'shine', 'pore', 'dull', 'even', 'glow', 'line'];
  const ids = new Set<string>();
  for (const addrRaw of addresses) {
    const addr = key(addrRaw);
    if (!addr) continue;
    for (const f of findings) {
      const name = key(f.name);
      const exact = name === addr;
      const contains = name.includes(addr) || addr.includes(name);
      const shared =
        WORDS.some((w) => name.includes(w) && addr.includes(w));
      if (exact || contains || shared) ids.add(f.id);
    }
  }
  return findings.filter((f) => ids.has(f.id)).map((f) => f.id);
}

/**
 * Map the raw plan fields onto the canonical, validated shape. `read` is the
 * already-normalized core read (for finding ids/names).
 */
export function normalizeRoutineFocus(raw: RawPlanFields, read: SkinRead): PlanFields {
  const out: PlanFields = {};

  const summary = clean(raw.skin_summary_line);
  if (summary && isPlain(summary)) out.skinSummaryLine = summary;

  const horizon = clean(raw.horizon_line);
  // Reject an over-promising horizon ("will" without a hedge) — the screen must
  // never make a false guarantee. A hedged "should/likely/usually" is required.
  if (horizon && isPlain(horizon) && isHedged(horizon)) out.horizonLine = horizon;

  const rawMoves = Array.isArray(raw.routine_focus) ? raw.routine_focus : [];
  const moves: RoutineFocusMove[] = [];
  rawMoves.forEach((m, i) => {
    const title = clean(m?.title);
    const why = clean(m?.why);
    if (!title || !why) return;
    if (!isPlain(title) || !isPlain(why)) return;
    const addresses = (Array.isArray(m?.addresses) ? m!.addresses! : [])
      .map(clean)
      .filter(Boolean)
      .filter(isPlain);
    moves.push({
      id: `move-${i}`,
      title,
      why,
      addresses,
      addressesIds: resolveAddresses(addresses, read.findings),
    });
  });

  // Cap at 3 (the spine: a 6-finding read still compresses to 2–3 moves).
  if (moves.length > 0) out.routineFocus = moves.slice(0, 3);

  return out;
}

/** A horizon line must be HEDGED — "should/likely/usually/often", never a bare
 *  promise. We reject a sentence that says "will" without a softener. */
function isHedged(s: string): boolean {
  const l = s.toLowerCase();
  const hedged = /(should|likely|usually|often|tends to|can|may|a good chance|over time)/.test(l);
  const promises = /\bwill\b/.test(l);
  return hedged || !promises;
}

/** Convenience: fold the plan fields back into a single SkinRead. */
export function withPlan(read: SkinRead, raw: RawPlanFields): SkinRead {
  const plan = normalizeRoutineFocus(raw, read);
  return { ...read, ...plan };
}
