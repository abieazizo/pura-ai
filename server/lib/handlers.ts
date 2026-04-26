/**
 * Server-side handlers for every AI proxy endpoint.
 *
 * Each handler:
 *   1. Validates the inbound JSON body (rejects missing required fields).
 *   2. Calls the corresponding ClaudeClient method.
 *   3. Validates the AI's structured output before returning.
 *   4. Wraps everything with a per-method timeout.
 *
 * The handlers throw `HandlerError` on bad input; the dispatcher in
 * `aiProxy.ts` translates that into a clean HTTP error response.
 */

import { ClaudeClient } from '../../src/ai/claude-client';
import {
  validateAssistantContext,
  validateBarcodeResolution,
  validateFaceScanAnalysis,
  validateProductIdentity,
  validateProductMatchResult,
  validateProgressBundle,
  validateProgressExplanation,
  validateRoutineRecommendation,
  validateScanToPlanBundle,
  validateScannedProductFit,
  validateSearchSuggestionResult,
  validateSkinScoreExplanation,
} from '../../src/ai/validation';
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
// Per-method handlers.
// ---------------------------------------------------------------------------

export type Handler = (
  client: ClaudeClient,
  body: Record<string, unknown>
) => Promise<unknown>;

export const HANDLERS: Record<string, Handler> = {
  async analyzeFaceScan(client, body) {
    const params = {
      imageBase64: reqString(body, 'imageBase64'),
      mediaType: reqMediaType(body, 'mediaType'),
      scanId: reqString(body, 'scanId'),
      previousSummary: optString(body, 'previousSummary'),
      userProfileSummary: reqString(body, 'userProfileSummary'),
    };
    const result = await client.analyzeFaceScan(params);
    const validated = validateFaceScanAnalysis(result);
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
    const result = await client.matchProductsForUser(params);
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
    const result = await client.generateRoutineRecommendation(params);
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
    const validated = validateSkinScoreExplanation(result);
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
    const result = await client.answerAssistant({
      context: ctx,
      userQuestion,
    });
    if (typeof result !== 'string') aiBad('answerAssistant');
    return result;
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
