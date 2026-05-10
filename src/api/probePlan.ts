/**
 * Pura AI — retrieval probe-plan builder (v19.28).
 *
 * Generalized product queries (e.g. "smoothing serum",
 * "chemical exfoliant", "best for my skin") fail OBF lookups
 * because OBF's category index reacts to specific ingredient /
 * product-type tokens, not vague consumer phrasing. v19.27's
 * single-query-via-intent helper improved this slightly but
 * still issued ONE literal probe per search.
 *
 * v19.28 expands a single InterpretedIntent into a small list
 * of richer retrieval probes. Each probe is a different keyword
 * combination that hits OBF with a known-good token set. The
 * server fans out across the probes, merges + dedupes, and
 * returns the union — substantially fattening the candidate
 * pool that reaches AI rerank.
 *
 * Pure deterministic. No AI calls. User-aware: probes shift
 * with the user's profile + scan (e.g. sensitive-skin user
 * asking for "chemical exfoliant" gets PHA / lactic probes
 * BEFORE glycolic / salicylic).
 */

import type {
  ConcernType,
} from '@/ai/ai-contracts';
import type { SkinState, UserProfileContext } from '@/types/canonical';
import type { InterpretedIntent, ProductTypeIntent } from './queryIntent';
// v19.36 — shared skin-profile inference. The same function is used
// by candidateTrust (skin-fit scoring), liveProducts (hero-pool
// skin-fit filter), and openai-client (AI rerank prompt) so every
// surface reads the user's skin axes the same way.
import { inferSkinProfile } from './candidateTrust';

// ---------------------------------------------------------------------------
// Public types.
// ---------------------------------------------------------------------------

export interface RetrievalProbe {
  query: string;
  /** Higher = more important. The first probe is always weight 1.0. */
  weight: number;
  /** Short reason for diagnostics — "redness-safe smoothing serum". */
  reason: string;
}

export interface RetrievalProbePlan {
  /** Pretty intent label for diagnostics + AI prompt. */
  primaryIntentLabel: string;
  /** Bounded list of retrieval probes, capped at 5. */
  probes: RetrievalProbe[];
  /** Avoidance constraints carried through from the intent. */
  avoidanceConstraints: string[];
}

// ---------------------------------------------------------------------------
// Probe vocabulary per concern axis. Each list orders from "most
// canonical / safe" to "most aggressive". Sensitive-skin users get
// the head of the list; non-sensitive users get the tail too.
// ---------------------------------------------------------------------------

const CONCERN_PROBE_VOCAB: Record<ConcernType, readonly string[]> = {
  texture: [
    'texture serum',
    'resurfacing serum',
    'peptide serum',
    'lactic acid serum',
    'PHA serum',
    'gentle exfoliating serum',
    'glycolic acid serum',
    'retinol serum',
  ],
  breakouts: [
    'acne serum',
    'spot treatment',
    'salicylic acid serum',
    'niacinamide blemish serum',
    'azelaic acid serum',
    'BHA exfoliant',
    'gentle acne treatment',
  ],
  redness: [
    'redness serum',
    'centella serum',
    'cica serum',
    'panthenol serum',
    'azelaic acid serum',
    'soothing serum',
    'barrier repair serum',
  ],
  hydration: [
    'hyaluronic acid serum',
    'glycerin serum',
    'ceramide moisturizer',
    'hydrating serum',
    'snail mucin serum',
    'panthenol serum',
    'squalane serum',
  ],
  dark_marks: [
    'vitamin c serum',
    'ascorbic acid serum',
    'tranexamic acid serum',
    'azelaic acid serum',
    'niacinamide brightening serum',
    'alpha arbutin serum',
  ],
  oiliness: [
    'niacinamide serum',
    'BHA exfoliant',
    'salicylic acid serum',
    'mattifying serum',
    'oil control toner',
  ],
  sensitivity: [
    'gentle moisturizer',
    'centella serum',
    'cica cream',
    'panthenol serum',
    'barrier repair serum',
    'fragrance-free moisturizer',
  ],
  pores: [
    'niacinamide serum',
    'BHA exfoliant',
    'salicylic acid serum',
    'pore minimizing serum',
  ],
};

const PRODUCT_TYPE_LABEL: Record<NonNullable<ProductTypeIntent>, string> = {
  cleanser: 'cleanser',
  toner: 'toner',
  serum: 'serum',
  moisturizer: 'moisturizer',
  spf: 'sunscreen',
  mask: 'mask',
  spot_treatment: 'spot treatment',
  exfoliant: 'exfoliant',
  eye_cream: 'eye cream',
};

// v19.32 — canonical ingredient/format variants per product type.
// Used to expand pure product-type queries (e.g. "moisturizer")
// into a richer multi-probe set so OBF's keyword index returns
// a diverse, image-backed candidate pool.
const PRODUCT_TYPE_VARIANTS: Record<
  NonNullable<ProductTypeIntent>,
  readonly string[]
> = {
  moisturizer: [
    'hyaluronic acid moisturizer',
    'ceramide moisturizer',
    'niacinamide moisturizer',
    'face cream',
    'hydrating cream',
  ],
  cleanser: [
    'gel cleanser',
    'foaming cleanser',
    'cream cleanser',
    'gentle face wash',
    'salicylic acid cleanser',
  ],
  toner: [
    'hydrating toner',
    'BHA toner',
    'AHA toner',
    'essence',
    'centella toner',
  ],
  serum: [
    'hyaluronic acid serum',
    'niacinamide serum',
    'vitamin c serum',
    'peptide serum',
    'retinol serum',
  ],
  spf: [
    'sunscreen SPF 50',
    'mineral sunscreen',
    'tinted sunscreen',
    'broad spectrum sunscreen',
    'face sunscreen',
  ],
  mask: [
    'sheet mask',
    'overnight mask',
    'clay mask',
    'hydrating mask',
    'exfoliating mask',
  ],
  spot_treatment: [
    'salicylic acid spot treatment',
    'pimple patch',
    'benzoyl peroxide spot treatment',
    'sulfur spot treatment',
    'tea tree spot treatment',
  ],
  exfoliant: [
    'lactic acid exfoliant',
    'salicylic acid exfoliant',
    'glycolic acid toner',
    'PHA exfoliant',
    'mandelic acid serum',
  ],
  eye_cream: [
    'caffeine eye cream',
    'peptide eye cream',
    'retinol eye cream',
    'hydrating eye cream',
    'brightening eye cream',
  ],
};

// ---------------------------------------------------------------------------
// v19.35 — explicit target-query family handling.
//
// The five canonical user-named queries do NOT route through generic
// concern/product-type expansion alone. Each one has a hard-coded
// probe family the engine ALWAYS uses, with user-context-aware
// pruning. This guarantees a strong, query-specific probe set even
// when the upstream interpreter returns weak signals.
//
// User-context awareness:
//   • sensitive users  → drop aggressive acid + high-strength acne
//                        probes; prefer cica/centella/PHA/lactic
//   • oily/acne users  → boost gel/light/non-comedogenic moisturizers
//                        + salicylic-acid acne treatments
//   • dry/sensitive    → boost barrier-cream / panthenol probes
// ---------------------------------------------------------------------------

interface TargetFamily {
  /** Patterns that match the raw query (lowercased). */
  match: RegExp[];
  /** Build the probe set for this family with user context. */
  build: (
    rawQuery: string,
    profile: UserProfileContext,
    skinState: SkinState | null
  ) => RetrievalProbe[];
  /** Stable label written onto RecommendationContext + ProductUiTrace. */
  label: string;
}

const TARGET_QUERY_FAMILIES: TargetFamily[] = [
  // ─── Family 1: moisturizer ─────────────────────────────────────────
  // v19.36 — skin-profile-aware. The probe set is rebuilt entirely
  // from the user's skin axes (oily/acne, dry/barrier, sensitive/
  // redness, combo). A "moisturizer" search no longer means "any
  // moisturizer" — it means "the right moisturizer for THIS user".
  {
    label: 'family:moisturizer',
    match: [/^moisturi[sz]er\s*$/i, /^moisturi[sz]ers?\s*$/i],
    build: (raw, profile, skinState) => {
      const skin = inferSkinProfile(profile, skinState);
      const probes: RetrievalProbe[] = [
        { query: raw.trim(), weight: 1, reason: 'verbatim' },
      ];
      if (skin.isOily || skin.isAcneProne) {
        probes.push(
          {
            query: 'gel moisturizer',
            weight: 0.98,
            reason: 'family:moisturizer (oily/acne priority)',
          },
          {
            query: 'oil free moisturizer',
            weight: 0.95,
            reason: 'family:moisturizer (oily/acne priority)',
          },
          {
            query: 'non comedogenic moisturizer',
            weight: 0.92,
            reason: 'family:moisturizer (oily/acne priority)',
          },
          {
            query: 'lightweight moisturizer',
            weight: 0.88,
            reason: 'family:moisturizer (oily/acne priority)',
          },
          {
            query: 'gel cream',
            weight: 0.82,
            reason: 'family:moisturizer (oily/acne priority)',
          }
        );
      } else if (skin.isDry || skin.isBarrier) {
        probes.push(
          {
            query: 'barrier repair cream',
            weight: 0.98,
            reason: 'family:moisturizer (dry/barrier priority)',
          },
          {
            query: 'ceramide moisturizer',
            weight: 0.95,
            reason: 'family:moisturizer (dry/barrier priority)',
          },
          {
            query: 'rich moisturizer',
            weight: 0.9,
            reason: 'family:moisturizer (dry/barrier priority)',
          },
          {
            query: 'repairing cream',
            weight: 0.85,
            reason: 'family:moisturizer (dry/barrier priority)',
          },
          {
            query: 'fragrance free cream',
            weight: 0.8,
            reason: 'family:moisturizer (dry/barrier priority)',
          }
        );
      } else if (skin.isSensitive) {
        probes.push(
          {
            query: 'fragrance free moisturizer',
            weight: 0.98,
            reason: 'family:moisturizer (sensitive priority)',
          },
          {
            query: 'calming moisturizer',
            weight: 0.93,
            reason: 'family:moisturizer (sensitive priority)',
          },
          {
            query: 'cica moisturizer',
            weight: 0.88,
            reason: 'family:moisturizer (sensitive priority)',
          },
          {
            query: 'centella moisturizer',
            weight: 0.85,
            reason: 'family:moisturizer (sensitive priority)',
          },
          {
            query: 'soothing cream',
            weight: 0.8,
            reason: 'family:moisturizer (sensitive priority)',
          }
        );
      } else if (skin.isCombo) {
        probes.push(
          {
            query: 'lightweight moisturizer',
            weight: 0.95,
            reason: 'family:moisturizer (combo priority)',
          },
          {
            query: 'balancing moisturizer',
            weight: 0.9,
            reason: 'family:moisturizer (combo priority)',
          },
          {
            query: 'gel cream',
            weight: 0.85,
            reason: 'family:moisturizer (combo priority)',
          },
          {
            query: 'daily moisturizer',
            weight: 0.78,
            reason: 'family:moisturizer (combo priority)',
          }
        );
      } else {
        // Unknown skin type — broad but safe.
        probes.push(
          {
            query: 'face moisturizer',
            weight: 0.92,
            reason: 'family:moisturizer (unknown skin)',
          },
          {
            query: 'hydrating moisturizer',
            weight: 0.88,
            reason: 'family:moisturizer (unknown skin)',
          },
          {
            query: 'ceramide moisturizer',
            weight: 0.82,
            reason: 'family:moisturizer (unknown skin)',
          },
          {
            query: 'non comedogenic moisturizer',
            weight: 0.75,
            reason: 'family:moisturizer (unknown skin)',
          }
        );
      }
      return probes;
    },
  },
  // ─── Family 2: smoothing serum ──────────────────────────────────────
  {
    label: 'family:smoothing_serum',
    match: [/^smoothing\s+serum\s*$/i, /\bsmoothing serum\b/i],
    build: (raw, profile) => {
      const sensitive = isSensitiveUser(profile);
      const probes: RetrievalProbe[] = [
        { query: raw.trim(), weight: 1, reason: 'verbatim' },
        { query: 'texture serum', weight: 0.95, reason: 'family:smoothing_serum' },
        {
          query: 'smoothing serum',
          weight: 0.92,
          reason: 'family:smoothing_serum',
        },
        {
          query: 'peptide serum',
          weight: 0.88,
          reason: 'family:smoothing_serum',
        },
      ];
      if (sensitive) {
        probes.push(
          {
            query: 'pha serum',
            weight: 0.85,
            reason: 'family:smoothing_serum (sensitive-safe)',
          },
          {
            query: 'gentle resurfacing serum',
            weight: 0.78,
            reason: 'family:smoothing_serum (sensitive-safe)',
          }
        );
      } else {
        probes.push(
          {
            query: 'lactic acid serum',
            weight: 0.82,
            reason: 'family:smoothing_serum',
          },
          {
            query: 'pha serum',
            weight: 0.7,
            reason: 'family:smoothing_serum',
          }
        );
      }
      return probes;
    },
  },
  // ─── Family 3: chemical exfoliant ───────────────────────────────────
  {
    label: 'family:chemical_exfoliant',
    match: [/^chemical\s+exfoli/i, /\bchemical exfoli/i],
    build: (raw, profile) => {
      const sensitive = isSensitiveUser(profile);
      const probes: RetrievalProbe[] = [
        { query: raw.trim(), weight: 1, reason: 'verbatim' },
        {
          query: 'exfoliating serum',
          weight: 0.92,
          reason: 'family:chemical_exfoliant',
        },
      ];
      if (sensitive) {
        probes.push(
          {
            query: 'pha exfoliant',
            weight: 0.95,
            reason: 'family:chemical_exfoliant (sensitive-safe)',
          },
          {
            query: 'lactic acid serum',
            weight: 0.88,
            reason: 'family:chemical_exfoliant (sensitive-safe)',
          },
          {
            query: 'gentle exfoliant sensitive skin',
            weight: 0.8,
            reason: 'family:chemical_exfoliant (sensitive-safe)',
          }
        );
      } else {
        probes.push(
          {
            query: 'salicylic acid serum',
            weight: 0.9,
            reason: 'family:chemical_exfoliant',
          },
          {
            query: 'lactic acid serum',
            weight: 0.85,
            reason: 'family:chemical_exfoliant',
          },
          {
            query: 'glycolic acid serum',
            weight: 0.78,
            reason: 'family:chemical_exfoliant',
          },
          {
            query: 'pha exfoliant',
            weight: 0.65,
            reason: 'family:chemical_exfoliant',
          }
        );
      }
      return probes;
    },
  },
  // ─── Family 4: best for my skin ─────────────────────────────────────
  // NOT generic — derived from topConcerns / goals / skinType /
  // sensitivities / latestScanSummary. Reuses expandBestForMySkin
  // below so the family path and the BEST_FOR_ME interpreter path
  // produce identical probes.
  {
    label: 'family:best_for_my_skin',
    match: [/^best\s+for\s+my\s+skin\s*$/i, /\bbest for my skin\b/i],
    build: (raw, profile, skinState) => {
      const probes: RetrievalProbe[] = [];
      // Verbatim is intentionally NOT pushed — OBF returns nothing
      // for "best for my skin" literally; profile-derived probes
      // alone carry this query.
      probes.push(...expandBestForMySkin(profile, skinState, null));
      return probes;
    },
  },
  // ─── Family 5: best for my pimple ───────────────────────────────────
  {
    label: 'family:best_for_my_pimple',
    match: [
      /^best\s+for\s+my\s+pimple/i,
      /\bbest for my pimple\b/i,
      /\bfor my pimples?\b/i,
    ],
    build: (raw, profile) => {
      const sensitive = isSensitiveUser(profile);
      const probes: RetrievalProbe[] = [
        // Verbatim is too conversational for OBF; skip it.
        { query: 'acne treatment', weight: 1, reason: 'family:best_for_my_pimple' },
        {
          query: 'spot treatment',
          weight: 0.95,
          reason: 'family:best_for_my_pimple',
        },
        {
          query: 'salicylic acid treatment',
          weight: 0.9,
          reason: 'family:best_for_my_pimple',
        },
      ];
      if (sensitive) {
        probes.push(
          {
            query: 'niacinamide blemish serum',
            weight: 0.85,
            reason: 'family:best_for_my_pimple (sensitive-safe)',
          },
          {
            query: 'gentle acne treatment sensitive skin',
            weight: 0.8,
            reason: 'family:best_for_my_pimple (sensitive-safe)',
          }
        );
      } else {
        probes.push(
          {
            query: 'benzoyl peroxide spot treatment',
            weight: 0.82,
            reason: 'family:best_for_my_pimple',
          },
          {
            query: 'niacinamide blemish serum',
            weight: 0.78,
            reason: 'family:best_for_my_pimple',
          }
        );
      }
      return probes;
    },
  },
];

/**
 * v19.35 — match a raw query against the canonical target families.
 * Returns the family + probes when the query matches one; null
 * otherwise. Called as the FIRST branch of buildProbePlan, so a
 * matched family overrides the generic intent-driven expansion.
 */
function matchTargetFamily(
  rawQuery: string,
  profile: UserProfileContext,
  skinState: SkinState | null
): { label: string; probes: RetrievalProbe[] } | null {
  const norm = rawQuery.trim().toLowerCase();
  if (norm.length === 0) return null;
  for (const family of TARGET_QUERY_FAMILIES) {
    if (family.match.some((re) => re.test(norm))) {
      return {
        label: family.label,
        probes: family.build(rawQuery, profile, skinState),
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function isSensitiveUser(profile: UserProfileContext): boolean {
  if (profile.skinType === 'sensitive') return true;
  return (profile.sensitivities ?? []).some((s) =>
    /sensitiv|barrier|reactive|rosacea/i.test(s)
  );
}

function pruneByAvoidance(
  probe: string,
  avoidance: string[]
): boolean {
  const lower = probe.toLowerCase();
  for (const a of avoidance) {
    const norm = a.toLowerCase();
    if (norm === 'high_strength_acid') {
      // Drop aggressive acid probes for sensitive users.
      if (
        /glycolic|salicylic( acid)?(?! serum$)/.test(lower) ||
        /retinol|tretinoin/.test(lower)
      ) {
        return false;
      }
    }
    if (norm === 'fragrance' && /(^|\s)fragrance(\s|$)/.test(lower)) return false;
    if (norm === 'retinoid' && /retinol|retinal|tretinoin/.test(lower)) return false;
  }
  return true;
}

function uniqueProbes(probes: RetrievalProbe[]): RetrievalProbe[] {
  const seen = new Set<string>();
  const out: RetrievalProbe[] = [];
  for (const p of probes) {
    const k = p.query.toLowerCase().trim();
    if (k.length === 0 || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function expandConcern(
  concern: ConcernType,
  profile: UserProfileContext,
  productType: ProductTypeIntent
): RetrievalProbe[] {
  const vocab = CONCERN_PROBE_VOCAB[concern];
  if (!vocab) return [];
  const sensitive = isSensitiveUser(profile);
  // Sensitive users → first 4 probes (gentler). Others → first 6.
  const slice = vocab.slice(0, sensitive ? 4 : 6);

  const probes: RetrievalProbe[] = slice.map((q, i) => ({
    query: q,
    weight: Math.max(0.4, 1 - i * 0.12),
    reason: `${concern} probe (${i + 1}/${slice.length}${
      sensitive ? ', sensitive-safe' : ''
    })`,
  }));

  // If the user explicitly asked for a product type but the vocab
  // entry is generic, stitch the product type onto the front for
  // type-specific recall.
  if (productType && productType !== 'serum') {
    const ptLabel = PRODUCT_TYPE_LABEL[productType];
    probes.push({
      query: `${concern.replace(/_/g, ' ')} ${ptLabel}`,
      weight: 0.85,
      reason: `${concern} ${ptLabel}`,
    });
  }

  return probes;
}

/**
 * v19.34 — product-type expansion. Used when the user explicitly
 * named a product type (e.g. "moisturizer", "smoothing serum",
 * "chemical exfoliant"). The probe set MUST stay product-type
 * shaped — a "moisturizer" query should not be answered with a
 * grid of serums just because OBF's category-keyword index reacts
 * to "moistur".
 *
 * Strategy:
 *   1. Bare productType label as a low-weight catch-all probe.
 *   2. When the query also carries a concern, push a `concern + ptLabel`
 *      probe (e.g. "redness moisturizer") for type+concern recall.
 *   3. Pull concern-vocab entries that ARE shaped with the productType
 *      label (e.g. for hydration concern + moisturizer pt, the
 *      concern vocab includes "ceramide moisturizer" — keep it).
 *      Drops the concern-vocab serums when the user asked for a
 *      moisturizer.
 *   4. Fill remaining slots with PRODUCT_TYPE_VARIANTS for
 *      ingredient/format diversity.
 *
 * For "moisturizer" (concern=hydration): probes become
 * ["moisturizer", "hydration moisturizer", "ceramide moisturizer",
 *  "hyaluronic acid moisturizer", "niacinamide moisturizer"] — all
 * moisturizers, none of them serums.
 *
 * For "smoothing serum" (concern=texture): probes become
 * ["smoothing serum", "texture serum", "resurfacing serum",
 *  "peptide serum", "lactic acid serum"] — all texture-shaped serums.
 *
 * For "chemical exfoliant" (concern=null): probes become
 * ["chemical exfoliant", "exfoliant", "gentle exfoliant",
 *  "lactic acid exfoliant", "salicylic acid exfoliant"].
 */
function expandProductType(
  productType: NonNullable<ProductTypeIntent>,
  concernHint: ConcernType | null,
  profile: UserProfileContext
): RetrievalProbe[] {
  const ptLabel = PRODUCT_TYPE_LABEL[productType];
  const variants = PRODUCT_TYPE_VARIANTS[productType] ?? [];
  const sensitive = isSensitiveUser(profile);
  const probes: RetrievalProbe[] = [];

  if (concernHint) {
    // Concern-aware path. Skip the bare productType label — it's
    // strictly less informative than `concern + ptLabel` and we
    // want to preserve probe slots (cap is 5) for type-shaped,
    // concern-relevant probes.
    probes.push({
      query: `${concernHint.replace(/_/g, ' ')} ${ptLabel}`,
      weight: 0.95,
      reason: `${concernHint} + ${ptLabel}`,
    });

    // Concern-vocab entries that LITERALLY mention the productType
    // label. This drops "hyaluronic acid serum" when the user asked
    // for "moisturizer", but keeps "ceramide moisturizer". For
    // "smoothing serum", every entry of the texture concern vocab
    // is shaped /serum/ so all 6 probes survive (and the slice cap
    // at 5 in buildProbePlan picks the strongest).
    const concernVocab = (CONCERN_PROBE_VOCAB[concernHint] ?? []).slice(
      0,
      sensitive ? 4 : 6
    );
    const ptShape = new RegExp(`\\b${ptLabel}s?\\b`, 'i');
    for (let i = 0; i < concernVocab.length; i++) {
      if (ptShape.test(concernVocab[i])) {
        probes.push({
          query: concernVocab[i],
          weight: Math.max(0.55, 0.9 - i * 0.08),
          reason: `${concernHint} ${ptLabel} probe`,
        });
      }
    }
  } else {
    // No concern hint — push the bare productType label + "gentle"
    // sibling so OBF gets a couple of strong product-type queries.
    probes.push({
      query: ptLabel,
      weight: 0.95,
      reason: `product type: ${ptLabel}`,
    });
    probes.push({
      query: `gentle ${ptLabel}`,
      weight: 0.7,
      reason: `gentle ${ptLabel}`,
    });
  }

  // PRODUCT_TYPE_VARIANTS — ingredient/format diversity. Always
  // appended; cap-at-5 in buildProbePlan trims if needed.
  for (let i = 0; i < variants.length; i++) {
    probes.push({
      query: variants[i],
      weight: Math.max(0.35, 0.78 - i * 0.08),
      reason: `${ptLabel} variant`,
    });
  }

  return probes;
}

function expandBestForMySkin(
  profile: UserProfileContext,
  skinState: SkinState | null,
  productType: ProductTypeIntent
): RetrievalProbe[] {
  // Heart of "best for my skin": derive from topConcerns + skinType
  // + goals + sensitivities + scan summary. We construct probes
  // that reflect what THIS user actually needs.
  const probes: RetrievalProbe[] = [];

  const top = skinState?.topConcerns ?? [];
  for (let i = 0; i < Math.min(top.length, 3); i++) {
    const c = top[i].concern;
    const vocab = CONCERN_PROBE_VOCAB[c];
    if (vocab && vocab.length > 0) {
      probes.push({
        query: vocab[0],
        weight: 1 - i * 0.15,
        reason: `top concern #${i + 1}: ${c}`,
      });
    }
    // Also push a `{concern} {productType}` probe if a type was
    // hinted (e.g. "best moisturizer for my skin").
    if (productType) {
      probes.push({
        query: `${c.replace(/_/g, ' ')} ${PRODUCT_TYPE_LABEL[productType]}`,
        weight: 0.8 - i * 0.1,
        reason: `top concern #${i + 1} + ${PRODUCT_TYPE_LABEL[productType]}`,
      });
    }
  }

  // Skin-type fallback when there are no scan concerns.
  if (probes.length === 0) {
    if (profile.skinType === 'dry') {
      probes.push(
        {
          query: 'hyaluronic acid serum',
          weight: 1,
          reason: 'dry skin baseline',
        },
        {
          query: 'ceramide moisturizer',
          weight: 0.9,
          reason: 'dry skin baseline',
        }
      );
    } else if (profile.skinType === 'oily') {
      probes.push(
        {
          query: 'niacinamide serum',
          weight: 1,
          reason: 'oily skin baseline',
        },
        {
          query: 'BHA exfoliant',
          weight: 0.85,
          reason: 'oily skin baseline',
        }
      );
    } else if (profile.skinType === 'sensitive') {
      probes.push(
        {
          query: 'centella serum',
          weight: 1,
          reason: 'sensitive skin baseline',
        },
        {
          query: 'gentle moisturizer',
          weight: 0.9,
          reason: 'sensitive skin baseline',
        }
      );
    } else {
      probes.push(
        {
          query: 'gentle daily serum',
          weight: 1,
          reason: 'general baseline',
        },
        {
          query: 'hydrating moisturizer',
          weight: 0.85,
          reason: 'general baseline',
        }
      );
    }
  }

  // Goals (free-form text from onboarding, e.g. "even out tone")
  // contribute one extra probe each, capped at 2.
  for (const goal of (profile.goals ?? []).slice(0, 2)) {
    const norm = goal.toLowerCase().replace(/[_-]/g, ' ');
    probes.push({
      query: `${norm} skincare`,
      weight: 0.5,
      reason: `goal: ${goal}`,
    });
  }

  return probes;
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export function buildProbePlan(
  rawQuery: string,
  intent: InterpretedIntent,
  profile: UserProfileContext,
  skinState: SkinState | null
): RetrievalProbePlan {
  // v19.35 — Target-query family path. The 5 user-named target
  // queries (moisturizer / smoothing serum / chemical exfoliant /
  // best for my skin / best for my pimple) match a hard-coded family
  // and return immediately. The generic intent-driven expansion below
  // is bypassed for these queries so a misclassified concern (e.g.
  // "moistur" matching the hydration concern vocab) cannot pull the
  // probe set off-shape. Pruning + cap-at-5 still apply.
  const family = matchTargetFamily(rawQuery, profile, skinState);
  if (family) {
    const filtered = family.probes
      .filter((p) => pruneByAvoidance(p.query, intent.avoidanceConstraints))
      .filter((p) => p.query.length > 0);
    const uniq = uniqueProbes(filtered).slice(0, 5);
    if (uniq.length === 0) {
      uniq.push({
        query: rawQuery.trim().length > 0 ? rawQuery.trim() : 'gentle skincare',
        weight: 1,
        reason: 'family fallback (all probes pruned)',
      });
    }
    return {
      primaryIntentLabel: family.label,
      probes: uniq,
      avoidanceConstraints: intent.avoidanceConstraints,
    };
  }

  const probes: RetrievalProbe[] = [];

  // ALWAYS keep the user's literal query as the first probe so we
  // don't surprise them — it still gets the highest weight unless
  // the interpreter decided the query was vague.
  if (rawQuery.trim().length > 0 && intent.mode !== 'best_for_my_skin') {
    probes.push({
      query: rawQuery.trim(),
      weight: intent.isVague ? 0.6 : 1,
      reason: 'verbatim query',
    });
  }

  if (intent.mode === 'best_for_my_skin') {
    probes.push(
      ...expandBestForMySkin(profile, skinState, intent.interpretedProductType)
    );
  } else if (intent.interpretedProductType) {
    // v19.34 — productType wins when set, even if concern is also
    // extracted. Without this swap, "moisturizer" got routed to
    // expandConcern('hydration') (because "moistur" matches the
    // hydration concern vocab AND the moisturizer product-type
    // vocab), which fanned out to mostly *serums* — the user typed
    // "moisturizer" and got serum probes. Now expandProductType
    // takes the concern as a hint instead, keeping every probe
    // shaped as the requested productType.
    probes.push(
      ...expandProductType(
        intent.interpretedProductType,
        intent.interpretedConcern,
        profile
      )
    );
  } else if (intent.interpretedConcern) {
    probes.push(
      ...expandConcern(
        intent.interpretedConcern,
        profile,
        intent.interpretedProductType
      )
    );
  }

  // Apply avoidance pruning + dedup + cap at 5.
  const filtered = probes
    .filter((p) => pruneByAvoidance(p.query, intent.avoidanceConstraints))
    .filter((p) => p.query.length > 0);
  const uniq = uniqueProbes(filtered).slice(0, 5);

  // Safety net: if pruning emptied the plan, fall back to the
  // verbatim query (or an extremely safe baseline).
  if (uniq.length === 0) {
    uniq.push({
      query: rawQuery.trim().length > 0 ? rawQuery.trim() : 'gentle skincare',
      weight: 1,
      reason: 'fallback (all probes pruned)',
    });
  }

  return {
    primaryIntentLabel: intent.intentLabel,
    probes: uniq,
    avoidanceConstraints: intent.avoidanceConstraints,
  };
}
