/**
 * Pura AI — end-to-end verification.
 *
 * Smoke-tests every public AI flow against the running proxy server.
 * Exits non-zero on first failure so it can be wired into CI.
 *
 * Run:
 *   # 1. boot the proxy in another shell:
 *   OPENAI_API_KEY=sk-... npm run server:ai
 *
 *   # 2. then run verification:
 *   EXPO_PUBLIC_PURA_AI_PROXY_URL=http://localhost:8787 \
 *   EXPO_PUBLIC_PURA_AI_PROXY_TOKEN=$PURA_AI_PROXY_TOKEN \
 *   npm run verify:ai
 *
 * The verification script uses the same client gateway the RN app
 * uses, so passing here means the production fetch path works end-
 * to-end — request shapes, validation, retries, and response parsing.
 *
 * Coverage spans the brief's required scenarios:
 *   • first face scan
 *   • repeat face scan (delta context)
 *   • product image scan
 *   • barcode lookup
 *   • best-for-you matching
 *   • routine recommendation
 *   • progress + score explanation
 *   • assistant grounded answer
 *   • search suggestions
 */

import { aiGateway } from '../src/ai/aiGateway';
import type {
  AssistantContext,
  FaceScanAnalysis,
} from '../src/ai/ai-contracts';

// ---------------------------------------------------------------------------
// Tiny 1x1 transparent PNG, base64-encoded. Smallest possible valid
// image so the verification script can exercise vision endpoints
// without shipping image assets.
// ---------------------------------------------------------------------------

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// ---------------------------------------------------------------------------
// Fixture helpers.
// ---------------------------------------------------------------------------

const USER_PROFILE_SUMMARY = JSON.stringify({
  skin_type: 'combination',
  concerns: ['breakouts', 'hydration'],
  sensitivity: 'somewhat',
  goal: 'clear',
});

const CANDIDATE_PRODUCTS_JSON = JSON.stringify([
  {
    product_id: 'gentle-foam-cleanser',
    brand: 'Acme',
    name: 'Gentle Foam Cleanser',
    category: 'cleanser',
    key_ingredients: ['glycerin', 'panthenol'],
    tags: ['fragrance-free', 'sensitive-safe'],
    likely_concerns_supported: ['hydration', 'sensitivity'],
    price_usd: 18,
  },
  {
    product_id: 'salicylic-spot-treatment',
    brand: 'Acme',
    name: 'Spot Treatment 2%',
    category: 'spot_treatment',
    key_ingredients: ['salicylic acid'],
    tags: [],
    likely_concerns_supported: ['breakouts'],
    price_usd: 22,
  },
  {
    product_id: 'hydra-niacinamide-serum',
    brand: 'Acme',
    name: 'Hydra Niacinamide Serum',
    category: 'serum',
    key_ingredients: ['niacinamide', 'hyaluronic acid'],
    tags: [],
    likely_concerns_supported: ['hydration', 'breakouts', 'pores'],
    price_usd: 28,
  },
]);

const EXISTING_ROUTINE_JSON = JSON.stringify({
  morning: ['gentle-foam-cleanser'],
  evening: [],
  saved: ['hydra-niacinamide-serum'],
});

// ---------------------------------------------------------------------------
// Test runner.
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  ok: boolean;
  durationMs: number;
  error?: string;
}

async function check(
  name: string,
  fn: () => Promise<void>
): Promise<CheckResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, ok: true, durationMs: Date.now() - start };
  } catch (e) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

// ---------------------------------------------------------------------------
// Individual checks.
// ---------------------------------------------------------------------------

async function checkFirstFaceScan(): Promise<FaceScanAnalysis> {
  const result = await aiGateway.analyzeFaceScan({
    imageBase64: TINY_PNG_B64,
    mediaType: 'image/png',
    scanId: 'verify-scan-1',
    userProfileSummary: USER_PROFILE_SUMMARY,
  });
  expect(typeof result.scan_id === 'string', 'scan_id is string');
  expect(
    typeof result.skin_score.value === 'number' &&
      result.skin_score.value >= 0 &&
      result.skin_score.value <= 100,
    'skin_score.value in 0..100'
  );
  expect(Array.isArray(result.findings), 'findings is array');
  return result;
}

async function checkRepeatFaceScan(prev: FaceScanAnalysis): Promise<void> {
  const result = await aiGateway.analyzeFaceScan({
    imageBase64: TINY_PNG_B64,
    mediaType: 'image/png',
    scanId: 'verify-scan-2',
    previousSummary: JSON.stringify({
      skin_score: prev.skin_score.value,
      band: prev.skin_score.band,
      primary_concern: prev.primary_concern,
    }),
    userProfileSummary: USER_PROFILE_SUMMARY,
  });
  expect(typeof result.scan_id === 'string', 'repeat scan_id is string');
}

async function checkProductImageScan(): Promise<void> {
  const result = await aiGateway.analyzeScannedProductAgainstUser({
    imageBase64: TINY_PNG_B64,
    mediaType: 'image/png',
    userContextSummary: USER_PROFILE_SUMMARY,
  });
  expect(
    typeof result.identity.product_category === 'string',
    'identity.product_category is set'
  );
  expect(
    Array.isArray(result.fit.matches),
    'fit.matches is an array'
  );
}

async function checkBarcodeResolution(): Promise<void> {
  const result = await aiGateway.normalizeBarcodeResolution({
    barcodeValue: 'gentle-foam-cleanser',
  });
  expect(
    result.barcode_value === 'gentle-foam-cleanser',
    'barcode_value echoed'
  );
  expect(typeof result.fallback_needed === 'boolean', 'fallback_needed bool');
}

async function checkProductMatching(scan: FaceScanAnalysis): Promise<void> {
  const result = await aiGateway.matchProductsForUser({
    userId: 'verify-user',
    basedOnScanId: scan.scan_id,
    skinStateSummary: JSON.stringify({ scan }),
    candidateProductsJson: CANDIDATE_PRODUCTS_JSON,
  });
  expect(Array.isArray(result.matches), 'matches is array');
  expect(
    result.matches.every(
      (m) =>
        m.match_score >= 0 &&
        m.match_score <= 100 &&
        ['weak', 'fair', 'strong', 'excellent'].includes(m.match_band)
    ),
    'matches have integer 0..100 scores + valid bands'
  );
}

async function checkRoutineRecommendation(
  scan: FaceScanAnalysis
): Promise<void> {
  const matches = await aiGateway.matchProductsForUser({
    userId: 'verify-user',
    basedOnScanId: scan.scan_id,
    skinStateSummary: JSON.stringify({ scan }),
    candidateProductsJson: CANDIDATE_PRODUCTS_JSON,
  });
  const result = await aiGateway.generateRoutineRecommendation({
    scanSummary: JSON.stringify({ scan }),
    matchedProductsJson: JSON.stringify(matches),
    existingRoutineJson: EXISTING_ROUTINE_JSON,
    basedOnScanId: scan.scan_id,
  });
  expect(typeof result.headline === 'string', 'routine headline string');
  expect(Array.isArray(result.morning), 'morning array');
  expect(Array.isArray(result.evening), 'evening array');
}

async function checkScoreAndProgress(): Promise<void> {
  const score = await aiGateway.explainSkinScore({
    score: 73,
    deltaReference: 'previous_scan',
    deltaValue: 4,
    concernMovementsJson: JSON.stringify({
      breakouts: 'better',
      hydration: 'worse',
    }),
  });
  expect(score.score >= 0 && score.score <= 100, 'score 0..100');
  expect(['poor', 'fair', 'good', 'great'].includes(score.band), 'valid band');

  const progress = await aiGateway.explainProgress({
    baselineSummary: JSON.stringify({ score: 60, top_concern: 'breakouts' }),
    latestSummary: JSON.stringify({ score: 73, top_concern: 'hydration' }),
    concernMovementsJson: JSON.stringify({
      breakouts: 'better',
      hydration: 'worse',
    }),
  });
  expect(
    typeof progress.short_narrative === 'string',
    'short_narrative string'
  );
}

async function checkAssistant(scan: FaceScanAnalysis): Promise<void> {
  const ctx: AssistantContext = {
    user_profile: {
      skin_type: 'combination',
      top_goals: ['clear breakouts'],
      sensitivities: ['fragrance'],
    },
    latest_scan: scan,
    latest_score: null,
    routine_snapshot: {
      morning_product_ids: ['gentle-foam-cleanser'],
      evening_product_ids: [],
      saved_product_ids: ['hydra-niacinamide-serum'],
    },
    progress_snapshot: null,
    top_matches: [],
    active_product_identity: null,
  };
  const text = await aiGateway.answerAssistant({
    context: ctx,
    userQuestion: 'Should I add a serum to my evening routine tonight?',
  });
  expect(typeof text === 'string' && text.length > 0, 'assistant answered');
  // v11.1 — assert grounding signal. A grounded answer should mention
  // at least one of the user's actual context fields (skin type,
  // routine product, or scan-derived concept). Pure filler answers
  // would never reference these.
  const groundingTokens = ['combination', 'cleanser', 'serum', 'evening', 'routine', 'fragrance'];
  const lower = text.toLowerCase();
  expect(
    groundingTokens.some((t) => lower.includes(t)),
    `assistant answer references at least one context token (${groundingTokens.join(', ')})`
  );
  expect(
    !/^great question/i.test(text.trim()),
    'assistant does not lead with "Great question" filler'
  );
}

async function checkBundleFullScanToPlan(): Promise<void> {
  // The composite bundle endpoint exercises 4 sequential calls in
  // one request: face scan → matching + score (parallel) → routine.
  // Verifies the end-to-end pipeline a real face scan triggers.
  const result = await aiGateway.buildFullScanToPlanBundle({
    imageBase64: TINY_PNG_B64,
    mediaType: 'image/png',
    scanId: 'verify-bundle-scan',
    userProfileSummary: USER_PROFILE_SUMMARY,
    candidateProductsJson: CANDIDATE_PRODUCTS_JSON,
    existingRoutineJson: EXISTING_ROUTINE_JSON,
  });
  expect(typeof result.analysis.scan_id === 'string', 'bundle.analysis.scan_id');
  expect(Array.isArray(result.matches.matches), 'bundle.matches array');
  expect(typeof result.routine.headline === 'string', 'bundle.routine.headline');
  expect(typeof result.score.score === 'number', 'bundle.score.score');
}

async function checkBundleProgress(): Promise<void> {
  const result = await aiGateway.buildProgressBundle({
    baselineSummary: JSON.stringify({ score: 60, top_concern: 'breakouts' }),
    latestSummary: JSON.stringify({ score: 73, top_concern: 'hydration' }),
    concernMovementsJson: JSON.stringify({ breakouts: 'better', hydration: 'worse' }),
    score: 73,
    deltaValue: 13,
  });
  expect(typeof result.progress.short_narrative === 'string', 'bundle.progress.short_narrative');
  expect(typeof result.score.score === 'number', 'bundle.score.score');
}

async function checkSearchSuggestions(): Promise<void> {
  const result = await aiGateway.buildSearchSuggestions({
    latestScanSummary: JSON.stringify({ primary_concern: 'breakouts' }),
    routineSummary: EXISTING_ROUTINE_JSON,
    pageContext: 'products',
  });
  expect(
    typeof result.prefill_placeholder === 'string',
    'prefill_placeholder string'
  );
  expect(
    Array.isArray(result.suggestion_chips),
    'suggestion_chips array'
  );
}

// ---------------------------------------------------------------------------
// Runner.
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(
    `[verify:ai] transport=${aiGateway.transport()}, available=${aiGateway.isAvailable()}`
  );
  if (!aiGateway.isAvailable()) {
    // eslint-disable-next-line no-console
    console.error(
      '[verify:ai] ABORT: no AI transport configured. Set ' +
        'EXPO_PUBLIC_PURA_AI_PROXY_URL to your running proxy ' +
        '(`npm run server:ai` boots a local one on http://localhost:8787).'
    );
    process.exit(2);
  }

  // Run sequentially so prior outputs feed later checks. Each check
  // is wrapped so a failure doesn't abort the rest.
  let firstScan: FaceScanAnalysis | null = null;
  const checks: CheckResult[] = [];

  checks.push(
    await check('first face scan', async () => {
      firstScan = await checkFirstFaceScan();
    })
  );
  if (firstScan) {
    checks.push(
      await check('repeat face scan with comparison', () =>
        checkRepeatFaceScan(firstScan!)
      )
    );
    checks.push(
      await check('product image scan', () => checkProductImageScan())
    );
    checks.push(
      await check('barcode lookup', () => checkBarcodeResolution())
    );
    checks.push(
      await check('best-for-you matching', () =>
        checkProductMatching(firstScan!)
      )
    );
    checks.push(
      await check('routine recommendation', () =>
        checkRoutineRecommendation(firstScan!)
      )
    );
    checks.push(
      await check('score + progress explanation', () =>
        checkScoreAndProgress()
      )
    );
    checks.push(
      await check('grounded assistant answer', () =>
        checkAssistant(firstScan!)
      )
    );
    checks.push(
      await check('search suggestions', () => checkSearchSuggestions())
    );
    checks.push(
      await check('composite: full scan → plan bundle', () =>
        checkBundleFullScanToPlan()
      )
    );
    checks.push(
      await check('composite: progress bundle', () =>
        checkBundleProgress()
      )
    );
  }

  // Report.
  let failed = 0;
  for (const r of checks) {
    const tag = r.ok ? 'PASS' : 'FAIL';
    // eslint-disable-next-line no-console
    console.log(
      `  [${tag}] ${r.name.padEnd(40)} ${r.durationMs}ms${
        r.error ? ` -> ${r.error}` : ''
      }`
    );
    if (!r.ok) failed += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    `\n[verify:ai] ${checks.length - failed}/${checks.length} passed`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(
    `[verify:ai] fatal: ${e instanceof Error ? e.message : String(e)}`
  );
  process.exit(2);
});
