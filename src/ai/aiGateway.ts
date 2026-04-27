/**
 * Pura AI — client-side gateway. **EXPO-SAFE.**
 *
 * This file is the only thing the React Native bundle imports when it
 * needs AI. It is strictly fetch-based:
 *   • no `@anthropic-ai/sdk` import (the SDK pulls Node-only resources
 *     and a beta path Metro can't resolve, so it MUST stay server-only)
 *   • no import of any file under `server/`
 *   • no instantiation of the Anthropic SDK at any branch, ever
 *
 * Two transports:
 *
 *   1. PROXY (production / dev)
 *      Active when `EXPO_PUBLIC_PURA_AI_PROXY_URL` is set. Every method
 *      POSTs JSON to `<proxy_url>/<method-name>`. The proxy server
 *      (see `server/aiProxy.ts`) holds the Anthropic API key, runs
 *      the SDK server-side, validates the structured output, and
 *      returns it. The client adds an `Authorization: Bearer <token>`
 *      header from `EXPO_PUBLIC_PURA_AI_PROXY_TOKEN` when present.
 *
 *   2. NONE (resilience fallback only)
 *      No transport configured. The gateway reports
 *      `isAvailable() === false`; every method throws
 *      `AIGatewayUnavailableError`. Callers catch and fall back to
 *      deterministic logic. This is NEVER the primary user
 *      experience in production — it exists only so the app keeps
 *      running for users who haven't pointed at a proxy yet.
 *
 * Hardening:
 *   • Per-method timeouts via AbortController.
 *   • One retry on transient errors (network failures + HTTP 5xx);
 *     no retry on 4xx, on validation failures, or on
 *     AIGatewayUnavailableError.
 *   • Every result passes through `validation.ts` before returning;
 *     malformed payloads are treated as failures and counted against
 *     the retry budget.
 *   • Structured logs through `aiLog`.
 *   • Per-request request-id surfaced as `x-request-id` for
 *     server-side correlation.
 *   • Bearer-token auth header on every proxy call.
 *
 * The "direct" SDK transport that previously lived here was removed
 * in v10.24 — embedding the Anthropic SDK in the RN bundle is
 * infeasible (Metro can't resolve the SDK's beta resource paths) and
 * exposes the API key. Local development now uses the same proxy
 * (`npm run server:ai`).
 */

import Constants from 'expo-constants';
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
  SupportedImageMediaType,
} from './ai-contracts';
import { aiLog } from './aiLog';
import { aiTelemetry, type AIMethodKey } from './aiTelemetry';
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

// Re-export for client callers that previously read this from the
// gateway file.
export type { SupportedImageMediaType };

// ---------------------------------------------------------------------------
// Public errors.
// ---------------------------------------------------------------------------

export class AIGatewayUnavailableError extends Error {
  constructor() {
    super(
      'AIGatewayUnavailableError: no AI transport configured. ' +
        'Set EXPO_PUBLIC_PURA_AI_PROXY_URL to point at the proxy server ' +
        '(run `npm run server:ai` locally for development).'
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
// text-only calls less.
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
// Transport selection — proxy or none.
// ---------------------------------------------------------------------------

type Transport = 'proxy' | 'none';

function envString(name: string): string {
  return (process.env[name] ?? '').trim();
}

/**
 * v10.33 — auto-derive the proxy URL from Expo's bundle host.
 *
 * The bug v10.33 fixes: a dev running on a real phone (Expo Go or a
 * dev build) couldn't reach the AI proxy because the bundle's
 * `EXPO_PUBLIC_PURA_AI_PROXY_URL` was `http://localhost:8787` — and
 * `localhost` on a phone resolves to the phone's own loopback, not
 * the dev machine. Every AI call hit a network error, `tryAi`
 * swallowed it, and every screen rendered the deterministic fallback
 * — so the entire app appeared to be running without AI.
 *
 * The fix: prefer Expo's bundle host (Constants.expoConfig.hostUri,
 * e.g. `192.168.1.42:8081`) — that IS the dev machine, by definition,
 * because the phone is currently downloading the JS bundle from it.
 * Strip the Metro port, append 8787, and that's the proxy URL.
 *
 * Order of precedence:
 *   1. Explicit override — EXPO_PUBLIC_PURA_AI_PROXY_URL set to a
 *      non-localhost host. Production deployments and explicit dev
 *      tunnels (ngrok etc) take this path.
 *   2. Auto-derived bundle host — the LAN IP Metro is serving from.
 *      Right for 99% of dev workflows.
 *   3. Localhost fallback — works in iOS Simulator / Android emulator
 *      where localhost IS the dev machine. The bundle host can also
 *      be 'localhost' in that case, which is fine.
 */
function deriveProxyUrl(): {
  url: string;
  source: 'override' | 'bundle-host' | 'localhost-fallback' | 'none';
} {
  const override = envString('EXPO_PUBLIC_PURA_AI_PROXY_URL').replace(
    /\/+$/,
    ''
  );
  // Use the explicit override only when it's a real host. A localhost
  // override loses to bundle-host derivation because localhost on a
  // phone is broken — keeping the override would defeat the auto fix.
  if (
    override.length > 0 &&
    !/\/\/(localhost|127\.0\.0\.1)\b/.test(override)
  ) {
    return { url: override, source: 'override' };
  }

  // Bundle host comes from Expo Constants. Different SDK versions
  // expose it under slightly different shapes — try them all.
  let hostUri: string | undefined;
  try {
    const cfg = (Constants as unknown as {
      expoConfig?: { hostUri?: string } | null;
      expoGoConfig?: { hostUri?: string } | null;
      manifest2?: { extra?: { expoGo?: { developer?: { hostUri?: string } } } };
    }) ?? {};
    hostUri =
      cfg.expoConfig?.hostUri ??
      cfg.expoGoConfig?.hostUri ??
      cfg.manifest2?.extra?.expoGo?.developer?.hostUri ??
      undefined;
  } catch {
    /* fall through */
  }
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      host !== '0.0.0.0'
    ) {
      return { url: `http://${host}:8787`, source: 'bundle-host' };
    }
  }

  // Last resort — keep whatever the override said (even if it was
  // localhost, since simulator/emulator workflows benefit from it),
  // or empty if nothing was configured.
  if (override.length > 0) {
    return { url: override, source: 'localhost-fallback' };
  }
  return { url: '', source: 'none' };
}

const { url: PROXY_URL, source: PROXY_URL_SOURCE } = deriveProxyUrl();
const PROXY_TOKEN = envString('EXPO_PUBLIC_PURA_AI_PROXY_TOKEN');

const TRANSPORT: Transport = PROXY_URL.length > 0 ? 'proxy' : 'none';

aiLog.info('aiGateway.boot', `transport=${TRANSPORT}`, {
  proxyUrl: PROXY_URL,
  proxyUrlSource: PROXY_URL_SOURCE,
  proxyTokenSet: PROXY_TOKEN.length > 0,
});

// ---------------------------------------------------------------------------
// Request-id generator.
// ---------------------------------------------------------------------------

function newRequestId(): string {
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
  if (TRANSPORT !== 'proxy') throw new AIGatewayUnavailableError();
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
// validation + structured logs.
// ---------------------------------------------------------------------------

async function runMethod<TRaw, T>(args: {
  method: AIMethodName;
  body: unknown;
  validate: (raw: unknown) => T | null;
}): Promise<T> {
  const { method, body, validate } = args;
  const timeoutMs = TIMEOUT_MS[method];
  const requestId = newRequestId();
  const start = Date.now();

  const attempt = async (): Promise<T> => {
    const raw = await proxyFetch<TRaw>(method, body, timeoutMs, requestId);
    const validated = validate(raw);
    if (!validated) {
      aiLog.warn('aiGateway.validate', `${method} returned malformed payload`, {
        requestId,
      });
      throw new AIValidationError(method);
    }
    return validated;
  };

  aiTelemetry.beginMethodCall(method as AIMethodKey, requestId);
  try {
    aiLog.info('aiGateway.call', `${method} start`, {
      requestId,
      transport: TRANSPORT,
    });
    const result = await attempt();
    const dur = Date.now() - start;
    aiLog.info('aiGateway.call', `${method} ok`, {
      requestId,
      durationMs: dur,
    });
    aiTelemetry.completeMethodCallOk(method as AIMethodKey, dur);
    return result;
  } catch (firstError) {
    const transient =
      firstError instanceof AIProxyError && firstError.isTransient();
    if (!transient) {
      const dur = Date.now() - start;
      const errMsg =
        firstError instanceof Error ? firstError.message : String(firstError);
      aiLog.warn('aiGateway.call', `${method} failed (no retry)`, {
        requestId,
        durationMs: dur,
        error: errMsg,
      });
      aiTelemetry.completeMethodCallFail(method as AIMethodKey, dur, errMsg);
      throw firstError;
    }
    aiLog.warn('aiGateway.call', `${method} transient failure, retrying once`, {
      requestId,
      error: firstError.message,
    });
    try {
      const result = await attempt();
      const dur = Date.now() - start;
      aiLog.info('aiGateway.call', `${method} ok after retry`, {
        requestId,
        durationMs: dur,
      });
      aiTelemetry.completeMethodCallOk(method as AIMethodKey, dur);
      return result;
    } catch (secondError) {
      const dur = Date.now() - start;
      const errMsg =
        secondError instanceof Error
          ? secondError.message
          : String(secondError);
      aiLog.error('aiGateway.call', `${method} failed after retry`, {
        requestId,
        durationMs: dur,
        error: errMsg,
      });
      aiTelemetry.completeMethodCallFail(method as AIMethodKey, dur, errMsg);
      throw secondError;
    }
  }
}

function ensureAvailable(): void {
  if (TRANSPORT !== 'proxy') throw new AIGatewayUnavailableError();
}

// ---------------------------------------------------------------------------
// Public gateway shape.
// ---------------------------------------------------------------------------

export interface AIGateway {
  isAvailable(): boolean;
  transport(): Transport;
  /**
   * v10.33 — diagnostic surfaces. The dev badge / diagnostics screen
   * reads these so a user looking at fallback can see exactly what
   * proxy URL the client tried and where it came from. Returns
   * `proxyUrl: ''` when transport is `none`.
   */
  proxyUrl(): string;
  proxyUrlSource(): 'override' | 'bundle-host' | 'localhost-fallback' | 'none';

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

  /**
   * Resolve a barcode through the AI's two-step lookup loop. The
   * server proxy owns the catalog lookup — clients never supply a
   * lookup callback. Pass only the scanned barcode value.
   */
  normalizeBarcodeResolution(params: {
    barcodeValue: string;
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

const gateway: AIGateway = {
  isAvailable() {
    return TRANSPORT === 'proxy';
  },
  transport() {
    return TRANSPORT;
  },
  proxyUrl() {
    return PROXY_URL;
  },
  proxyUrlSource() {
    return PROXY_URL_SOURCE;
  },

  async analyzeFaceScan(params) {
    ensureAvailable();
    return runMethod({
      method: 'analyzeFaceScan',
      body: params,
      validate: validateFaceScanAnalysis,
    });
  },

  async identifyProductFromImage(params) {
    ensureAvailable();
    return runMethod({
      method: 'identifyProductFromImage',
      body: params,
      validate: validateProductIdentity,
    });
  },

  async normalizeBarcodeResolution(params) {
    ensureAvailable();
    return runMethod({
      method: 'normalizeBarcodeResolution',
      body: { barcodeValue: params.barcodeValue },
      validate: validateBarcodeResolution,
    });
  },

  async matchProductsForUser(params) {
    ensureAvailable();
    return runMethod({
      method: 'matchProductsForUser',
      body: params,
      validate: validateProductMatchResult,
    });
  },

  async generateRoutineRecommendation(params) {
    ensureAvailable();
    return runMethod({
      method: 'generateRoutineRecommendation',
      body: params,
      validate: validateRoutineRecommendation,
    });
  },

  async explainSkinScore(params) {
    ensureAvailable();
    return runMethod({
      method: 'explainSkinScore',
      body: params,
      validate: validateSkinScoreExplanation,
    });
  },

  async explainProgress(params) {
    ensureAvailable();
    return runMethod({
      method: 'explainProgress',
      body: params,
      validate: validateProgressExplanation,
    });
  },

  async buildSearchSuggestions(params) {
    ensureAvailable();
    return runMethod({
      method: 'buildSearchSuggestions',
      body: params,
      validate: validateSearchSuggestionResult,
    });
  },

  async answerAssistant(params) {
    ensureAvailable();
    return runMethod({
      method: 'answerAssistant',
      body: params,
      validate: validateAssistantAnswer,
    });
  },

  async analyzeScannedProductAgainstUser(params) {
    ensureAvailable();
    return runMethod({
      method: 'analyzeScannedProductAgainstUser',
      body: params,
      validate: validateScannedProductFit,
    });
  },

  async buildFullScanToPlanBundle(params) {
    ensureAvailable();
    return runMethod({
      method: 'buildFullScanToPlanBundle',
      body: params,
      validate: validateScanToPlanBundle,
    });
  },

  async buildProgressBundle(params) {
    ensureAvailable();
    return runMethod({
      method: 'buildProgressBundle',
      body: params,
      validate: validateProgressBundle,
    });
  },
};

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
