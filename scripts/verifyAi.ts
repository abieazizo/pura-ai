/**
 * Pura AI — end-to-end verification.
 *
 * Pure-Node script. Talks to a running proxy server over HTTP using
 * the built-in `fetch`. Imports only TypeScript TYPES from
 * `src/ai/ai-contracts.ts` (which has zero runtime imports), so this
 * file pulls in zero React Native / Expo / client-only modules.
 *
 *   v11.2 — refactored from the legacy gateway-import path. The
 *   previous version imported `aiGateway` from `src/`, which pulled
 *   `expo-constants → react-native` into the Node bundle and broke
 *   tsx with `Unexpected "typeof"` at react-native/index.js:27.
 *
 * Run:
 *   # 1. boot the proxy in another shell:
 *   OPENAI_API_KEY=sk-... npm run server:ai
 *
 *   # 2. then run verification:
 *   npm run verify:ai
 *
 *   # Optional env overrides:
 *   #   PURA_AI_PROXY_URL          — defaults to EXPO_PUBLIC_PURA_AI_PROXY_URL
 *   #                                or http://localhost:8787
 *   #   PURA_AI_PROXY_TOKEN        — defaults to .env value
 *
 * Coverage spans every public AI flow:
 *   • first face scan (vision)
 *   • repeat face scan with comparison
 *   • product image scan (composite)
 *   • barcode resolution
 *   • product matching
 *   • routine recommendation
 *   • skin score + progress explanation
 *   • assistant grounded answer (with grounding assertion)
 *   • search suggestions
 *   • composite buildFullScanToPlanBundle
 *   • composite buildProgressBundle
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  AssistantContext,
  BarcodeResolution,
  FaceScanAnalysis,
  ProductIdentity,
  ProductMatchResult,
  ProgressExplanation,
  RoutineRecommendation,
  SearchSuggestionResult,
  SkinScoreExplanation,
} from '../src/ai/ai-contracts';

// ---------------------------------------------------------------------------
// .env loader (Node-safe, no deps).
// Reads .env into process.env without overriding values already set in the
// shell. Mirrors the explicit-override loader in `server/aiProxy.ts` but
// here we treat shell env as authoritative so a CI runner can pass an
// override-URL without touching .env.
// ---------------------------------------------------------------------------

(function loadDotenv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  let raw: string;
  try {
    raw = fs.readFileSync(envPath, 'utf8');
  } catch {
    return;
  }
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
})();

// ---------------------------------------------------------------------------
// Proxy client.
// ---------------------------------------------------------------------------

const PROXY_URL = (
  process.env.PURA_AI_PROXY_URL ??
  process.env.EXPO_PUBLIC_PURA_AI_PROXY_URL ??
  `http://localhost:${process.env.PURA_AI_PROXY_PORT ?? 8787}`
).replace(/\/+$/, '');

const PROXY_TOKEN = (
  process.env.PURA_AI_PROXY_TOKEN ??
  process.env.EXPO_PUBLIC_PURA_AI_PROXY_TOKEN ??
  ''
).trim();

class ProxyError extends Error {
  constructor(
    public readonly method: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(`${method}: HTTP ${status} ${body.slice(0, 240)}`);
    this.name = 'ProxyError';
  }
}

async function call<T>(method: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json',
  };
  if (PROXY_TOKEN.length > 0) {
    headers.Authorization = `Bearer ${PROXY_TOKEN}`;
  }
  // 90 s timeout — the composite full-scan bundle runs 4 sequential calls.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  let res: Response;
  try {
    res = await fetch(`${PROXY_URL}/${method}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  if (!res.ok) {
    throw new ProxyError(method, res.status, text);
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new ProxyError(
      method,
      res.status,
      `JSON parse failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

async function pingHealth(): Promise<{ ok: boolean; transport?: string }> {
  try {
    const res = await fetch(`${PROXY_URL}/healthz`, {
      method: 'GET',
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { ok: false };
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return {
      ok: body.ok === true,
      transport:
        typeof body.transport === 'string' ? body.transport : undefined,
    };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Tiny 1×1 transparent PNG, base64-encoded. Smallest possible valid
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
// Individual checks. Each one POSTs raw JSON to a proxy method and
// asserts the structural / semantic correctness of the response.
// ---------------------------------------------------------------------------

async function checkFirstFaceScan(): Promise<FaceScanAnalysis> {
  const result = await call<FaceScanAnalysis>('analyzeFaceScan', {
    imageBase64: TINY_PNG_B64,
    mediaType: 'image/png',
    scanId: 'verify-scan-1',
    userProfileSummary: USER_PROFILE_SUMMARY,
  });
  expect(typeof result.scan_id === 'string', 'scan_id is string');
  expect(
    typeof result.skin_score?.value === 'number' &&
      result.skin_score.value >= 0 &&
      result.skin_score.value <= 100,
    'skin_score.value in 0..100'
  );
  expect(Array.isArray(result.findings), 'findings is array');
  expect(typeof result.skin_score?.why_line === 'string', 'why_line string');
  return result;
}

async function checkRepeatFaceScan(prev: FaceScanAnalysis): Promise<void> {
  const result = await call<FaceScanAnalysis>('analyzeFaceScan', {
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
  const result = await call<{
    identity: ProductIdentity;
    fit: ProductMatchResult;
  }>('analyzeScannedProductAgainstUser', {
    imageBase64: TINY_PNG_B64,
    mediaType: 'image/png',
    userContextSummary: USER_PROFILE_SUMMARY,
  });
  expect(
    typeof result.identity.product_category === 'string',
    'identity.product_category is set'
  );
  expect(Array.isArray(result.fit.matches), 'fit.matches is an array');
}

async function checkBarcodeResolution(): Promise<void> {
  const result = await call<BarcodeResolution>('normalizeBarcodeResolution', {
    barcodeValue: 'gentle-foam-cleanser',
  });
  expect(
    result.barcode_value === 'gentle-foam-cleanser',
    'barcode_value echoed'
  );
  expect(typeof result.fallback_needed === 'boolean', 'fallback_needed bool');
}

async function checkProductMatching(scan: FaceScanAnalysis): Promise<void> {
  const result = await call<ProductMatchResult>('matchProductsForUser', {
    userId: 'verify-user',
    basedOnScanId: scan.scan_id,
    skinStateSummary: JSON.stringify({ scan }),
    candidateProductsJson: CANDIDATE_PRODUCTS_JSON,
  });
  expect(Array.isArray(result.matches), 'matches is array');
  expect(
    result.matches.every(
      (m) =>
        typeof m.match_score === 'number' &&
        m.match_score >= 0 &&
        m.match_score <= 100 &&
        ['weak', 'fair', 'strong', 'excellent'].includes(m.match_band)
    ),
    'every match has integer 0..100 score + valid band'
  );
}

async function checkRoutineRecommendation(
  scan: FaceScanAnalysis
): Promise<void> {
  const matches = await call<ProductMatchResult>('matchProductsForUser', {
    userId: 'verify-user',
    basedOnScanId: scan.scan_id,
    skinStateSummary: JSON.stringify({ scan }),
    candidateProductsJson: CANDIDATE_PRODUCTS_JSON,
  });
  const result = await call<RoutineRecommendation>(
    'generateRoutineRecommendation',
    {
      scanSummary: JSON.stringify({ scan }),
      matchedProductsJson: JSON.stringify(matches),
      existingRoutineJson: EXISTING_ROUTINE_JSON,
      basedOnScanId: scan.scan_id,
    }
  );
  expect(typeof result.headline === 'string', 'routine headline string');
  expect(Array.isArray(result.morning), 'morning array');
  expect(Array.isArray(result.evening), 'evening array');
  expect(
    typeof result.tonight_focus === 'string' &&
      result.tonight_focus.length > 0,
    'tonight_focus non-empty'
  );
}

async function checkScoreAndProgress(): Promise<void> {
  const score = await call<SkinScoreExplanation>('explainSkinScore', {
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
  expect(typeof score.coach_line === 'string', 'coach_line string');

  const progress = await call<ProgressExplanation>('explainProgress', {
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
  const text = await call<string>('answerAssistant', {
    context: ctx,
    userQuestion: 'Should I add a serum to my evening routine tonight?',
  });
  expect(typeof text === 'string' && text.length > 0, 'assistant answered');
  // Grounding assertion — answer must reference at least one user-context
  // token. Pure filler answers would never include any of these.
  const groundingTokens = [
    'combination',
    'cleanser',
    'serum',
    'evening',
    'routine',
    'fragrance',
  ];
  const lower = text.toLowerCase();
  expect(
    groundingTokens.some((t) => lower.includes(t)),
    `assistant answer references at least one context token (${groundingTokens.join(', ')})`
  );
  expect(
    !/^\s*great question/i.test(text),
    'assistant does not lead with "Great question" filler'
  );
}

async function checkSearchSuggestions(): Promise<void> {
  const result = await call<SearchSuggestionResult>('buildSearchSuggestions', {
    latestScanSummary: JSON.stringify({ primary_concern: 'breakouts' }),
    routineSummary: EXISTING_ROUTINE_JSON,
    pageContext: 'products',
  });
  expect(
    typeof result.prefill_placeholder === 'string',
    'prefill_placeholder string'
  );
  expect(Array.isArray(result.suggestion_chips), 'suggestion_chips array');
}

async function checkBundleFullScanToPlan(): Promise<void> {
  const result = await call<{
    analysis: FaceScanAnalysis;
    matches: ProductMatchResult;
    routine: RoutineRecommendation;
    score: SkinScoreExplanation;
  }>('buildFullScanToPlanBundle', {
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
  const result = await call<{
    progress: ProgressExplanation;
    score: SkinScoreExplanation;
  }>('buildProgressBundle', {
    baselineSummary: JSON.stringify({ score: 60, top_concern: 'breakouts' }),
    latestSummary: JSON.stringify({ score: 73, top_concern: 'hydration' }),
    concernMovementsJson: JSON.stringify({
      breakouts: 'better',
      hydration: 'worse',
    }),
    score: 73,
    deltaValue: 13,
  });
  expect(
    typeof result.progress.short_narrative === 'string',
    'bundle.progress.short_narrative'
  );
  expect(typeof result.score.score === 'number', 'bundle.score.score');
}

// ---------------------------------------------------------------------------
// Runner.
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[verify:ai] proxy=${PROXY_URL} token=${PROXY_TOKEN ? 'on' : 'off'}`);

  const health = await pingHealth();
  if (!health.ok) {
    // eslint-disable-next-line no-console
    console.error(
      `[verify:ai] ABORT: /healthz unreachable at ${PROXY_URL}. Boot the ` +
        `proxy with \`npm run server:ai\` (or set PURA_AI_PROXY_URL to ` +
        `your deployed proxy).`
    );
    process.exit(2);
  }
  // eslint-disable-next-line no-console
  console.log(
    `[verify:ai] /healthz ok (transport=${health.transport ?? '?'})`
  );

  // Sequential so prior outputs feed later checks. Each check is wrapped
  // so a failure doesn't abort the rest.
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
      await check('composite: progress bundle', () => checkBundleProgress())
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
