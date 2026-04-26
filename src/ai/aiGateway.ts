/**
 * Pura AI — gateway.
 *
 * The single thing the rest of the app touches when it wants AI.
 *
 * Three transports, picked once at module load:
 *
 *   1. PROXY (production)
 *      Active when `EXPO_PUBLIC_PURA_AI_PROXY_URL` is set. Every method
 *      POSTs JSON to `<proxy_url>/<method-name>`. The proxy server
 *      (see `server/aiProxy.ts`) holds the Anthropic API key, runs
 *      ClaudeClient server-side, and returns validated structured
 *      output. The client adds an `Authorization: Bearer <token>`
 *      header from `EXPO_PUBLIC_PURA_AI_PROXY_TOKEN` when present.
 *
 *   2. DIRECT (local development only)
 *      Active when `EXPO_PUBLIC_PURA_AI_TRANSPORT=direct` and
 *      `EXPO_PUBLIC_ANTHROPIC_API_KEY` are both set. Instantiates
 *      ClaudeClient in-process with `dangerouslyAllowBrowser: true`.
 *      Embedding a key in a shipped RN bundle exposes it; this
 *      transport refuses to activate without the explicit
 *      `transport=direct` opt-in so a stray key in a `.env` file
 *      can't accidentally enable it in production.
 *
 *   3. NONE (resilience fallback only)
 *      No transport configured. The gateway reports
 *      `isAvailable() === false`; every method throws
 *      `AIGatewayUnavailableError`. Callers catch and fall back to
 *      deterministic logic. The brief allows this as the
 *      controlled-resilience path; it is NEVER the primary user
 *      experience in production.
 *
 * Production hardening (v10.23):
 *   • Per-method timeouts via AbortController.
 *   • One retry on transient errors (network failures + HTTP 5xx);
 *     no retry on 4xx, on validation failures, or on
 *     AIGatewayUnavailableError.
 *   • Every result passes through `validation.ts` before reaching the
 *     caller; malformed payloads are treated as failures and counted
 *     against the retry budget.
 *   • Structured logs through `aiLog` for every attempt + outcome.
 *   • Per-request request-id surfaced as `x-request-id` for
 *     server-side correlation.
 *   • Bearer-token auth header on every proxy call.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ClaudeClient,
  type BarcodeLookupResult,
  type SupportedImageMediaType,
} from './claude-client';
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
} from './ai-contracts';
import { aiLog } from './aiLog';
import {
  validateAssistantAnswer,
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
} from './validation';

// ---------------------------------------------------------------------------
// Public errors.
// ---------------------------------------------------------------------------

export class AIGatewayUnavailableError extends Error {
  constructor() {
    super(
      'AIGatewayUnavailableError: no AI transport configured. ' +
        'Set EXPO_PUBLIC_PURA_AI_PROXY_URL for production, or ' +
        'EXPO_PUBLIC_PURA_AI_TRANSPORT=direct + ' +
        'EXPO_PUBLIC_ANTHROPIC_API_KEY for local development.'
    );
    this.name = 'AIGatewayUnavailableError';
  }
}

export class AIProxyError extends Error {
  constructor(
    public method: string,
    public status: number,
    public requestId: string,
    detail: string
  ) {
    super(
      `AIProxyError: ${method} -> HTTP ${status} (req=${requestId}): ${detail}`
    );
    this.name = 'AIProxyError';
  }

  /** True when this error is worth retrying (network / 5xx). */
  isTransient(): boolean {
    return this.status === 0 || (this.status >= 500 && this.status < 600);
  }
}

export class AIValidationError extends Error {
  constructor(public method: string) {
    super(
      `AIValidationError: ${method} returned a payload that failed structural validation.`
    );
    this.name = 'AIValidationError';
  }
}

// ---------------------------------------------------------------------------
// Per-method timeout budget. Image-bearing calls get the most time;
// text-only calls less. Tuned conservatively so requests never hang
// the UI past what feels reasonable to users.
// ---------------------------------------------------------------------------

const TIMEOUT_MS = {
  analyzeFaceScan: 60_000,
  identifyProductFromImage: 45_000,
  normalizeBarcodeResolution: 30_000,
  matchProductsForUser: 30_000,
  generateRoutineRecommendation: 30_000,
  explainSkinScore: 20_000,
  explainProgress: 25_000,
  buildSearchSuggestions: 15_000,
  answerAssistant: 60_000,
  analyzeScannedProductAgainstUser: 75_000,
  buildFullScanToPlanBundle: 120_000,
  buildProgressBundle: 30_000,
} as const;

type AIMethodName = keyof typeof TIMEOUT_MS;

// ---------------------------------------------------------------------------
// Transport selection.
// ---------------------------------------------------------------------------

type Transport = 'direct' | 'proxy' | 'none';

function envString(name: string): string {
  const raw = (process.env[name] ?? '').trim();
  return raw;
}

function resolveTransport(): Transport {
  const explicit = envString('EXPO_PUBLIC_PURA_AI_TRANSPORT');
  const proxyUrl = envString('EXPO_PUBLIC_PURA_AI_PROXY_URL');
  const directKey = envString('EXPO_PUBLIC_ANTHROPIC_API_KEY');

  // Explicit direct opt-in. Refuses without a key.
  if (explicit === 'direct') {
    return directKey.length > 0 ? 'direct' : 'none';
  }
  // Production preference: proxy URL wins if set.
  if (proxyUrl.length > 0) return 'proxy';
  // No transport configured.
  return 'none';
}

const TRANSPORT: Transport = resolveTransport();
const PROXY_URL = envString('EXPO_PUBLIC_PURA_AI_PROXY_URL').replace(/\/+$/, '');
const PROXY_TOKEN = envString('EXPO_PUBLIC_PURA_AI_PROXY_TOKEN');

aiLog.info('aiGateway.boot', `transport=${TRANSPORT}`, {
  proxyUrlSet: PROXY_URL.length > 0,
  proxyTokenSet: PROXY_TOKEN.length > 0,
});

// ---------------------------------------------------------------------------
// Direct transport client (local dev only).
// ---------------------------------------------------------------------------

let _directClient: ClaudeClient | null = null;
function getDirectClient(): ClaudeClient {
  if (_directClient) return _directClient;
  const apiKey = envString('EXPO_PUBLIC_ANTHROPIC_API_KEY');
  if (apiKey.length === 0) {
    throw new AIGatewayUnavailableError();
  }
  // Subclass overwrite: replace the parent's strict Anthropic
  // instance with one that allows browser-like environments. The
  // `private anthropic` is a TS access modifier only; the field is
  // a plain property at runtime.
  _directClient = new (class extends ClaudeClient {
    constructor() {
      super({ apiKey });
      (this as unknown as { anthropic: Anthropic }).anthropic = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  })();
  return _directClient;
}

// ---------------------------------------------------------------------------
// Request-id generator.
// ---------------------------------------------------------------------------

function newRequestId(): string {
  // Reasonably unique without a crypto dep: timestamp + 6 random hex.
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `pura-${t}-${r}`;
}

// ---------------------------------------------------------------------------
// Proxy fetch with timeout.
// ---------------------------------------------------------------------------

async function proxyFetch<TRaw>(
  method: string,
  body: unknown,
  timeoutMs: number,
  requestId: string
): Promise<TRaw> {
  if (PROXY_URL.length === 0) throw new AIGatewayUnavailableError();
  const url = `${PROXY_URL}/${method}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-request-id': requestId,
    };
    if (PROXY_TOKEN.length > 0) {
      headers.Authorization = `Bearer ${PROXY_TOKEN}`;
    }
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const detail = e instanceof Error ? e.message : 'network error';
    throw new AIProxyError(method, 0, requestId, detail);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = (await res.json()) as { message?: unknown };
      if (typeof errBody.message === 'string' && errBody.message.length > 0) {
        detail = errBody.message;
      }
    } catch {
      /* keep statusText */
    }
    throw new AIProxyError(method, res.status, requestId, detail);
  }

  return (await res.json()) as TRaw;
}

// ---------------------------------------------------------------------------
// Per-call envelope: timeout + single retry on transient errors +
// validation + structured logs. The validator is required so every
// path through the gateway returns a guaranteed-shape result.
// ---------------------------------------------------------------------------

async function runMethod<TRaw, T>(args: {
  method: AIMethodName;
  /** Transport-agnostic call. Either calls Anthropic directly or
   *  posts to the proxy. */
  call: (timeoutMs: number, requestId: string) => Promise<TRaw>;
  validate: (raw: unknown) => T | null;
}): Promise<T> {
  const { method, call, validate } = args;
  const timeoutMs = TIMEOUT_MS[method];
  const requestId = newRequestId();
  const start = Date.now();

  const attempt = async (): Promise<T> => {
    const raw = await call(timeoutMs, requestId);
    const validated = validate(raw);
    if (!validated) {
      aiLog.warn('aiGateway.validate', `${method} returned malformed payload`, {
        requestId,
      });
      throw new AIValidationError(method);
    }
    return validated;
  };

  try {
    aiLog.info('aiGateway.call', `${method} start`, {
      requestId,
      transport: TRANSPORT,
    });
    const result = await attempt();
    aiLog.info('aiGateway.call', `${method} ok`, {
      requestId,
      durationMs: Date.now() - start,
    });
    return result;
  } catch (firstError) {
    const transient =
      firstError instanceof AIProxyError && firstError.isTransient();
    if (!transient) {
      aiLog.warn('aiGateway.call', `${method} failed (no retry)`, {
        requestId,
        durationMs: Date.now() - start,
        error:
          firstError instanceof Error
            ? firstError.message
            : String(firstError),
      });
      throw firstError;
    }
    aiLog.warn('aiGateway.call', `${method} transient failure, retrying once`, {
      requestId,
      error: firstError.message,
    });
    try {
      const result = await attempt();
      aiLog.info('aiGateway.call', `${method} ok after retry`, {
        requestId,
        durationMs: Date.now() - start,
      });
      return result;
    } catch (secondError) {
      aiLog.error('aiGateway.call', `${method} failed after retry`, {
        requestId,
        durationMs: Date.now() - start,
        error:
          secondError instanceof Error
            ? secondError.message
            : String(secondError),
      });
      throw secondError;
    }
  }
}

// ---------------------------------------------------------------------------
// Public gateway shape.
// ---------------------------------------------------------------------------

export interface AIGateway {
  /** True iff a transport is configured. UI surfaces should still
   *  function when this is false — they just use deterministic
   *  fallbacks. */
  isAvailable(): boolean;
  /** Which transport is active — useful for telemetry / dev console. */
  transport(): Transport;

  analyzeFaceScan(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
    scanId: string;
    previousSummary?: string;
    userProfileSummary: string;
  }): Promise<FaceScanAnalysis>;

  identifyProductFromImage(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
  }): Promise<ProductIdentity>;

  normalizeBarcodeResolution(params: {
    barcodeValue: string;
    /** Used in DIRECT mode only. The proxy runs its own catalog
     *  lookup server-side and ignores this callback. */
    lookupBarcode: (
      barcodeValue: string
    ) => Promise<BarcodeLookupResult | null>;
  }): Promise<BarcodeResolution>;

  matchProductsForUser(params: {
    userId: string;
    basedOnScanId: string | null;
    skinStateSummary: string;
    candidateProductsJson: string;
  }): Promise<ProductMatchResult>;

  generateRoutineRecommendation(params: {
    scanSummary: string;
    matchedProductsJson: string;
    existingRoutineJson: string;
    basedOnScanId: string | null;
  }): Promise<RoutineRecommendation>;

  explainSkinScore(params: {
    score: number;
    deltaReference: 'previous_scan' | 'baseline' | 'none';
    deltaValue: number | null;
    concernMovementsJson: string;
  }): Promise<SkinScoreExplanation>;

  explainProgress(params: {
    baselineSummary: string;
    latestSummary: string;
    concernMovementsJson: string;
  }): Promise<ProgressExplanation>;

  buildSearchSuggestions(params: {
    latestScanSummary: string | null;
    routineSummary: string;
    pageContext: 'products' | 'assistant';
  }): Promise<SearchSuggestionResult>;

  answerAssistant(params: {
    context: AssistantContext;
    userQuestion: string;
  }): Promise<string>;

  analyzeScannedProductAgainstUser(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
    userContextSummary: string;
  }): Promise<{ identity: ProductIdentity; fit: ProductMatchResult }>;

  buildFullScanToPlanBundle(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
    scanId: string;
    previousSummary?: string;
    userProfileSummary: string;
    candidateProductsJson: string;
    existingRoutineJson: string;
  }): Promise<{
    analysis: FaceScanAnalysis;
    matches: ProductMatchResult;
    routine: RoutineRecommendation;
    score: SkinScoreExplanation;
  }>;

  buildProgressBundle(params: {
    baselineSummary: string;
    latestSummary: string;
    concernMovementsJson: string;
    score: number;
    deltaValue: number | null;
  }): Promise<{
    progress: ProgressExplanation;
    score: SkinScoreExplanation;
  }>;
}

// ---------------------------------------------------------------------------
// Direct/proxy dispatch — every method goes through `runMethod` so
// timeouts, retries, validation, and logging are uniform.
// ---------------------------------------------------------------------------

function ensureAvailable(): void {
  if (TRANSPORT === 'none') throw new AIGatewayUnavailableError();
}

const gateway: AIGateway = {
  isAvailable() {
    return TRANSPORT !== 'none';
  },
  transport() {
    return TRANSPORT;
  },

  async analyzeFaceScan(params) {
    ensureAvailable();
    return runMethod({
      method: 'analyzeFaceScan',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().analyzeFaceScan(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch('analyzeFaceScan', params, timeoutMs, requestId);
      },
      validate: validateFaceScanAnalysis,
    });
  },

  async identifyProductFromImage(params) {
    ensureAvailable();
    return runMethod({
      method: 'identifyProductFromImage',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().identifyProductFromImage(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch(
          'identifyProductFromImage',
          params,
          timeoutMs,
          requestId
        );
      },
      validate: validateProductIdentity,
    });
  },

  async normalizeBarcodeResolution(params) {
    ensureAvailable();
    return runMethod({
      method: 'normalizeBarcodeResolution',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().normalizeBarcodeResolution(params),
            timeoutMs,
            requestId
          );
        }
        // The proxy server owns the lookup; the callback is stripped.
        return proxyFetch(
          'normalizeBarcodeResolution',
          { barcodeValue: params.barcodeValue },
          timeoutMs,
          requestId
        );
      },
      validate: validateBarcodeResolution,
    });
  },

  async matchProductsForUser(params) {
    ensureAvailable();
    return runMethod({
      method: 'matchProductsForUser',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().matchProductsForUser(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch('matchProductsForUser', params, timeoutMs, requestId);
      },
      validate: validateProductMatchResult,
    });
  },

  async generateRoutineRecommendation(params) {
    ensureAvailable();
    return runMethod({
      method: 'generateRoutineRecommendation',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().generateRoutineRecommendation(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch(
          'generateRoutineRecommendation',
          params,
          timeoutMs,
          requestId
        );
      },
      validate: validateRoutineRecommendation,
    });
  },

  async explainSkinScore(params) {
    ensureAvailable();
    return runMethod({
      method: 'explainSkinScore',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().explainSkinScore(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch('explainSkinScore', params, timeoutMs, requestId);
      },
      validate: validateSkinScoreExplanation,
    });
  },

  async explainProgress(params) {
    ensureAvailable();
    return runMethod({
      method: 'explainProgress',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().explainProgress(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch('explainProgress', params, timeoutMs, requestId);
      },
      validate: validateProgressExplanation,
    });
  },

  async buildSearchSuggestions(params) {
    ensureAvailable();
    return runMethod({
      method: 'buildSearchSuggestions',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().buildSearchSuggestions(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch(
          'buildSearchSuggestions',
          params,
          timeoutMs,
          requestId
        );
      },
      validate: validateSearchSuggestionResult,
    });
  },

  async answerAssistant(params) {
    ensureAvailable();
    return runMethod({
      method: 'answerAssistant',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().answerAssistant(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch('answerAssistant', params, timeoutMs, requestId);
      },
      validate: validateAssistantAnswer,
    });
  },

  async analyzeScannedProductAgainstUser(params) {
    ensureAvailable();
    return runMethod({
      method: 'analyzeScannedProductAgainstUser',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().analyzeScannedProductAgainstUser(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch(
          'analyzeScannedProductAgainstUser',
          params,
          timeoutMs,
          requestId
        );
      },
      validate: validateScannedProductFit,
    });
  },

  async buildFullScanToPlanBundle(params) {
    ensureAvailable();
    return runMethod({
      method: 'buildFullScanToPlanBundle',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().buildFullScanToPlanBundle(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch(
          'buildFullScanToPlanBundle',
          params,
          timeoutMs,
          requestId
        );
      },
      validate: validateScanToPlanBundle,
    });
  },

  async buildProgressBundle(params) {
    ensureAvailable();
    return runMethod({
      method: 'buildProgressBundle',
      call: async (timeoutMs, requestId) => {
        if (TRANSPORT === 'direct') {
          return withDirectTimeout(
            getDirectClient().buildProgressBundle(params),
            timeoutMs,
            requestId
          );
        }
        return proxyFetch('buildProgressBundle', params, timeoutMs, requestId);
      },
      validate: validateProgressBundle,
    });
  },
};

// ---------------------------------------------------------------------------
// Direct-mode timeout shim. Anthropic's SDK has its own request
// timeouts but we wrap defensively so direct mode obeys the same
// per-method budget proxy mode does.
// ---------------------------------------------------------------------------

async function withDirectTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  requestId: string
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new AIProxyError(
          'direct',
          0,
          requestId,
          `direct call timed out after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export const aiGateway: AIGateway = gateway;

/**
 * Helper: run an async AI call and return null on AI unavailability,
 * proxy failure, or validation failure so callers can branch into
 * deterministic fallbacks cleanly.
 */
export async function tryAi<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AIGatewayUnavailableError) return null;
    if (e instanceof AIProxyError) return null;
    if (e instanceof AIValidationError) return null;
    aiLog.error(
      'aiGateway.tryAi',
      'unexpected error in tryAi',
      e instanceof Error ? { error: e.message } : { error: String(e) }
    );
    return null;
  }
}
