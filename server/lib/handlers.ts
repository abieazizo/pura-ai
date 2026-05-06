/**
 * Server-side handlers for every AI proxy endpoint.
 *
 * Each handler:
 *   1. Validates the inbound JSON body (rejects missing required fields).
 *   2. Calls the corresponding OpenAIClient method.
 *   3. Validates the AI's structured output before returning.
 *   4. Wraps everything with a per-method timeout.
 *
 * The handlers throw `HandlerError` on bad input; the dispatcher in
 * `aiProxy.ts` translates that into a clean HTTP error response.
 */

import { OpenAIClient, AIError } from '../openai/openai-client';
import {
  validateAssistantContext,
  validateBarcodeResolution,
  validateFaceScanAnalysis,
  validateLiveProductLookupResult,
  validateProductIdentity,
  validateProductMatchResult,
  validateProgressBundle,
  validateProgressExplanation,
  validateRoutineRecommendation,
  validateScanPreflightResult,
  validateScanToPlanBundle,
  validateScannedProductFit,
  validateSearchSuggestionResult,
  validateSkinScoreExplanation,
} from '../../src/ai/validation';
import { sanitizeAndEnrich } from '../../src/lib/commerceEnrichment';
import { lookupBarcodeServerSide } from './barcodeLookup';

export class HandlerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HandlerError';
  }
}

function bad(field: string, detail = 'missing or wrong type'): never {
  throw new HandlerError(400, `bad request: ${field} (${detail})`);
}

function aiBad(method: string): never {
  throw new HandlerError(
    502,
    `${method}: AI returned a payload that failed structural validation`
  );
}

/**
 * v18.8 — translate an AIError thrown by runStrictStructured into a
 * structured HandlerError the proxy will surface as a clean HTTP
 * status. The client gateway can then distinguish:
 *   503 — empty/length cap, retry suggested
 *   502 — parse failure, do not retry
 * Anything else propagates as a generic 502.
 */
function aiErrorStatus(reason: AIError['reason']): number {
  switch (reason) {
    case 'empty_content':
    case 'length_cap':
      return 503;
    case 'parse_failed':
      return 502;
    default:
      return 502;
  }
}

/**
 * Wrap an OpenAI client call so AIError gets translated to a clean
 * HandlerError with a stable status. Other errors propagate
 * unchanged (the dispatcher will return 502 / 500 as appropriate).
 */
async function withAIErrorTranslation<T>(
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AIError) {
      throw new HandlerError(
        aiErrorStatus(e.reason),
        `${method}: ${e.reason}`
      );
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Body shape coercion. Each helper extracts and lightly type-checks
// what we expect; HandlerError(400) is thrown on missing fields.
// ---------------------------------------------------------------------------

function reqString(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (typeof v !== 'string' || v.length === 0) bad(key);
  return v as string;
}

function optString(
  body: Record<string, unknown>,
  key: string
): string | undefined {
  const v = body[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') bad(key, 'expected string');
  return v;
}

function reqMediaType(
  body: Record<string, unknown>,
  key: string
): 'image/jpeg' | 'image/png' {
  const v = body[key];
  if (v !== 'image/jpeg' && v !== 'image/png') {
    bad(key, 'expected image/jpeg or image/png');
  }
  return v as 'image/jpeg' | 'image/png';
}

function reqBasedOnScanId(body: Record<string, unknown>): string | null {
  const v = body['basedOnScanId'];
  if (v === null) return null;
  if (typeof v !== 'string') bad('basedOnScanId', 'expected string|null');
  return v as string;
}

// ---------------------------------------------------------------------------
// v10.35 — repair helpers.
//
// Claude's tool_use output sometimes omits fields the model treats as
// "input context" — `scan_id` on analyzeFaceScan, `score` on
// explainSkinScore. The handler already knows these values from the
// request params, so repair the response BEFORE validation runs.
// This eliminates the "missing scan_id" / "missing score" 502s that
// the user saw on every face scan / skin-score explanation in v10.34.
// ---------------------------------------------------------------------------

function repairFaceScanAnalysis(
  result: unknown,
  scanId: string
): unknown {
  if (!result || typeof result !== 'object') return result;
  const r = result as Record<string, unknown>;
  if (typeof r.scan_id !== 'string' || r.scan_id.length === 0) {
    r.scan_id = scanId;
  }
  if (typeof r.analyzed_at_iso !== 'string' || r.analyzed_at_iso.length === 0) {
    r.analyzed_at_iso = new Date().toISOString();
  }
  return r;
}

function repairSkinScoreExplanation(
  result: unknown,
  score: number,
  deltaReference: 'previous_scan' | 'baseline' | 'none',
  deltaValue: number | null
): unknown {
  if (!result || typeof result !== 'object') return result;
  const r = result as Record<string, unknown>;
  if (typeof r.score !== 'number' || !Number.isFinite(r.score)) {
    r.score = score;
  }
  if (
    r.delta_reference !== 'previous_scan' &&
    r.delta_reference !== 'baseline' &&
    r.delta_reference !== 'none'
  ) {
    r.delta_reference = deltaReference;
  }
  if (
    r.delta_value !== null &&
    !(typeof r.delta_value === 'number' && Number.isFinite(r.delta_value))
  ) {
    r.delta_value = deltaValue;
  }
  // Auto-derive band from score if Claude omitted it.
  if (r.band !== 'poor' && r.band !== 'fair' && r.band !== 'good' && r.band !== 'great') {
    r.band =
      score >= 85 ? 'great' : score >= 70 ? 'good' : score >= 55 ? 'fair' : 'poor';
  }
  return r;
}

// ---------------------------------------------------------------------------
// Per-method handlers.
// ---------------------------------------------------------------------------

export type Handler = (
  client: OpenAIClient,
  body: Record<string, unknown>
) => Promise<unknown>;

export const HANDLERS: Record<string, Handler> = {
  async validateScanPreflight(client, body) {
    const params = {
      imageBase64: reqString(body, 'imageBase64'),
      mediaType: reqMediaType(body, 'mediaType'),
    };
    const result = await withAIErrorTranslation(
      'validateScanPreflight',
      () => client.validateScanPreflight(params)
    );
    const validated = validateScanPreflightResult(result);
    if (!validated) aiBad('validateScanPreflight');
    return validated;
  },

  async analyzeFaceScan(client, body) {
    const params = {
      imageBase64: reqString(body, 'imageBase64'),
      mediaType: reqMediaType(body, 'mediaType'),
      scanId: reqString(body, 'scanId'),
      previousSummary: optString(body, 'previousSummary'),
      userProfileSummary: reqString(body, 'userProfileSummary'),
    };
    const result = await client.analyzeFaceScan(params);
    // v10.35 — Claude sometimes omits scan_id from the tool_use
    // payload (it's in the user message and the model treats it as
    // input, not output). Fill it in from the request params before
    // validation so the response surfaces as success instead of
    // failing structural validation.
    const repaired = repairFaceScanAnalysis(result, params.scanId);
    const validated = validateFaceScanAnalysis(repaired);
    if (!validated) aiBad('analyzeFaceScan');
    return validated;
  },

  async identifyProductFromImage(client, body) {
    const params = {
      imageBase64: reqString(body, 'imageBase64'),
      mediaType: reqMediaType(body, 'mediaType'),
    };
    const result = await client.identifyProductFromImage(params);
    const validated = validateProductIdentity(result);
    if (!validated) aiBad('identifyProductFromImage');
    return validated;
  },

  async normalizeBarcodeResolution(client, body) {
    const params = {
      barcodeValue: reqString(body, 'barcodeValue'),
      lookupBarcode: lookupBarcodeServerSide,
    };
    const result = await client.normalizeBarcodeResolution(params);
    const validated = validateBarcodeResolution(result);
    if (!validated) aiBad('normalizeBarcodeResolution');
    return validated;
  },

  async matchProductsForUser(client, body) {
    const params = {
      userId: reqString(body, 'userId'),
      basedOnScanId: reqBasedOnScanId(body),
      skinStateSummary: reqString(body, 'skinStateSummary'),
      candidateProductsJson: reqString(body, 'candidateProductsJson'),
    };
    // Empty candidate set guard — return a clean empty match result
    // without burning a Claude call. The client treats this as
    // "no AI ranking" and falls back to seeded order.
    try {
      const parsed = JSON.parse(params.candidateProductsJson);
      if (Array.isArray(parsed) && parsed.length === 0) {
        return {
          for_user_id: params.userId,
          based_on_scan_id: params.basedOnScanId,
          top_pick_product_id: null,
          matches: [],
          alternatives: [],
        };
      }
    } catch {
      bad('candidateProductsJson', 'must be valid JSON');
    }
    const result = await withAIErrorTranslation(
      'matchProductsForUser',
      () => client.matchProductsForUser(params)
    );
    const validated = validateProductMatchResult(result);
    if (!validated) aiBad('matchProductsForUser');
    return validated;
  },

  async generateRoutineRecommendation(client, body) {
    const params = {
      scanSummary: reqString(body, 'scanSummary'),
      matchedProductsJson: reqString(body, 'matchedProductsJson'),
      existingRoutineJson: reqString(body, 'existingRoutineJson'),
      basedOnScanId: reqBasedOnScanId(body),
    };
    const result = await withAIErrorTranslation(
      'generateRoutineRecommendation',
      () => client.generateRoutineRecommendation(params)
    );
    const validated = validateRoutineRecommendation(result);
    if (!validated) aiBad('generateRoutineRecommendation');
    return validated;
  },

  async explainSkinScore(client, body) {
    const score = body['score'];
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      bad('score', 'expected number');
    }
    const deltaReference = body['deltaReference'];
    if (
      deltaReference !== 'previous_scan' &&
      deltaReference !== 'baseline' &&
      deltaReference !== 'none'
    ) {
      bad('deltaReference');
    }
    const deltaValueRaw = body['deltaValue'];
    const deltaValue =
      deltaValueRaw === null
        ? null
        : typeof deltaValueRaw === 'number' && Number.isFinite(deltaValueRaw)
        ? deltaValueRaw
        : (bad('deltaValue', 'expected number|null') as never);
    const params = {
      score: score as number,
      deltaReference: deltaReference as 'previous_scan' | 'baseline' | 'none',
      deltaValue,
      concernMovementsJson: reqString(body, 'concernMovementsJson'),
    };
    const result = await client.explainSkinScore(params);
    // v10.35 — Claude treats `score` as input context and sometimes
    // omits it from the tool output. Repair it from params before
    // validation so we don't reject otherwise-valid explanations.
    const repaired = repairSkinScoreExplanation(
      result,
      params.score,
      params.deltaReference,
      params.deltaValue
    );
    const validated = validateSkinScoreExplanation(repaired);
    if (!validated) aiBad('explainSkinScore');
    return validated;
  },

  async explainProgress(client, body) {
    const params = {
      baselineSummary: reqString(body, 'baselineSummary'),
      latestSummary: reqString(body, 'latestSummary'),
      concernMovementsJson: reqString(body, 'concernMovementsJson'),
    };
    const result = await client.explainProgress(params);
    const validated = validateProgressExplanation(result);
    if (!validated) aiBad('explainProgress');
    return validated;
  },

  async buildSearchSuggestions(client, body) {
    const pageContext = body['pageContext'];
    if (pageContext !== 'products' && pageContext !== 'assistant') {
      bad('pageContext');
    }
    const latestRaw = body['latestScanSummary'];
    const latestScanSummary =
      latestRaw === null
        ? null
        : typeof latestRaw === 'string'
        ? latestRaw
        : (bad('latestScanSummary', 'expected string|null') as never);
    const params = {
      latestScanSummary,
      routineSummary: reqString(body, 'routineSummary'),
      pageContext: pageContext as 'products' | 'assistant',
    };
    const result = await client.buildSearchSuggestions(params);
    const validated = validateSearchSuggestionResult(result);
    if (!validated) aiBad('buildSearchSuggestions');
    return validated;
  },

  async answerAssistant(client, body) {
    const ctx = validateAssistantContext(body['context']);
    if (!ctx) bad('context');
    const userQuestion = reqString(body, 'userQuestion');
    // v19.5 — wrap in AI-error translator so empty-content failures
    // surface as 503 (transient, retryable) instead of bubbling as
    // a generic 500 + structural-validation error in the gateway.
    const result = await withAIErrorTranslation('answerAssistant', () =>
      client.answerAssistant({
        context: ctx,
        userQuestion,
      })
    );
    if (typeof result !== 'string' || result.trim().length === 0) {
      aiBad('answerAssistant');
    }
    return result;
  },

  async lookupLiveProducts(client, body) {
    const query = reqString(body, 'query');
    const countRaw = body['count'];
    // v19.9 — default 8 → 4 and ceiling 12 → 8. The lean schema +
    // 2048-token cap can comfortably handle 8 in the worst case;
    // 4 is the realistic target for the result screen (hero + ≤3
    // alternatives) and what every client-side caller now passes.
    const count =
      typeof countRaw === 'number' && Number.isFinite(countRaw)
        ? Math.max(1, Math.min(8, Math.round(countRaw)))
        : 4;
    let scanContext:
      | {
          primary_concern: string | null;
          secondary_concerns: string[];
          severity_band: string;
          regions: string[];
          skin_type: string;
          sensitivities: string[];
        }
      | undefined;
    const ctxRaw = body['scanContext'];
    if (ctxRaw && typeof ctxRaw === 'object' && !Array.isArray(ctxRaw)) {
      const ctx = ctxRaw as Record<string, unknown>;
      scanContext = {
        primary_concern:
          typeof ctx['primary_concern'] === 'string'
            ? (ctx['primary_concern'] as string)
            : null,
        secondary_concerns: Array.isArray(ctx['secondary_concerns'])
          ? (ctx['secondary_concerns'] as unknown[]).filter(
              (x): x is string => typeof x === 'string'
            )
          : [],
        severity_band:
          typeof ctx['severity_band'] === 'string'
            ? (ctx['severity_band'] as string)
            : 'unknown',
        regions: Array.isArray(ctx['regions'])
          ? (ctx['regions'] as unknown[]).filter(
              (x): x is string => typeof x === 'string'
            )
          : [],
        skin_type:
          typeof ctx['skin_type'] === 'string'
            ? (ctx['skin_type'] as string)
            : 'unknown',
        sensitivities: Array.isArray(ctx['sensitivities'])
          ? (ctx['sensitivities'] as unknown[]).filter(
              (x): x is string => typeof x === 'string'
            )
          : [],
      };
    }
    const raw = await withAIErrorTranslation('lookupLiveProducts', () =>
      client.lookupLiveProducts({ query, scanContext, count })
    );
    // Stamp the source timestamp server-side so the client never sees
    // a candidate without it.
    const stamped = {
      ...raw,
      candidates: (raw.candidates ?? []).map((c) => ({
        ...c,
        sourceTimestamp:
          typeof c.sourceTimestamp === 'string' && c.sourceTimestamp.length > 0
            ? c.sourceTimestamp
            : new Date().toISOString(),
      })),
    };
    const validated = validateLiveProductLookupResult(stamped);
    if (!validated) aiBad('lookupLiveProducts');
    // v18.6/18.7 — deterministic commerce enrichment runs SERVER-SIDE
    // so a direct curl POST to /lookupLiveProducts (and the client
    // gateway alike) sees enriched candidates. v18.7 adds a verifiable
    // server-side log so you can confirm enrichment ran on every
    // request: look for "[v18.7 enrichment]" in the Metro console.
    const beforeNullUrls = validated.candidates.filter(
      (c) => !c.productUrl
    ).length;
    const beforeNullMerchants = validated.candidates.filter(
      (c) => !c.merchantName
    ).length;
    const enriched = sanitizeAndEnrich(validated.candidates);
    const afterNullUrls = enriched.filter((c) => !c.productUrl).length;
    const afterNullMerchants = enriched.filter(
      (c) => !c.merchantName
    ).length;
    // eslint-disable-next-line no-console
    console.log(
      '[v18.7 enrichment]',
      JSON.stringify({
        method: 'lookupLiveProducts',
        n: validated.candidates.length,
        productUrl_null_before: beforeNullUrls,
        productUrl_null_after: afterNullUrls,
        merchantName_null_before: beforeNullMerchants,
        merchantName_null_after: afterNullMerchants,
        first_candidate_after: enriched[0]
          ? {
              brand: enriched[0].brand,
              merchantName: enriched[0].merchantName,
              productUrl: enriched[0].productUrl,
            }
          : null,
      })
    );
    return {
      ...validated,
      candidates: enriched,
    };
  },

  async analyzeScannedProductAgainstUser(client, body) {
    const params = {
      imageBase64: reqString(body, 'imageBase64'),
      mediaType: reqMediaType(body, 'mediaType'),
      userContextSummary: reqString(body, 'userContextSummary'),
    };
    const result = await client.analyzeScannedProductAgainstUser(params);
    const validated = validateScannedProductFit(result);
    if (!validated) aiBad('analyzeScannedProductAgainstUser');
    return validated;
  },

  async buildFullScanToPlanBundle(client, body) {
    const params = {
      imageBase64: reqString(body, 'imageBase64'),
      mediaType: reqMediaType(body, 'mediaType'),
      scanId: reqString(body, 'scanId'),
      previousSummary: optString(body, 'previousSummary'),
      userProfileSummary: reqString(body, 'userProfileSummary'),
      candidateProductsJson: reqString(body, 'candidateProductsJson'),
      existingRoutineJson: reqString(body, 'existingRoutineJson'),
    };
    const result = await client.buildFullScanToPlanBundle(params);
    const validated = validateScanToPlanBundle(result);
    if (!validated) aiBad('buildFullScanToPlanBundle');
    return validated;
  },

  async buildProgressBundle(client, body) {
    const score = body['score'];
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      bad('score', 'expected number');
    }
    const deltaValueRaw = body['deltaValue'];
    const deltaValue =
      deltaValueRaw === null
        ? null
        : typeof deltaValueRaw === 'number' && Number.isFinite(deltaValueRaw)
        ? deltaValueRaw
        : (bad('deltaValue', 'expected number|null') as never);
    const params = {
      baselineSummary: reqString(body, 'baselineSummary'),
      latestSummary: reqString(body, 'latestSummary'),
      concernMovementsJson: reqString(body, 'concernMovementsJson'),
      score: score as number,
      deltaValue,
    };
    const result = await client.buildProgressBundle(params);
    const validated = validateProgressBundle(result);
    if (!validated) aiBad('buildProgressBundle');
    return validated;
  },
};
