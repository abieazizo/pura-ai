/**
 * Pura AI — gateway.
 *
 * The single thing the rest of the app touches when it wants AI.
 *
 * Why this layer exists:
 *   • The bare ClaudeClient holds an Anthropic API key. Embedding that
 *     in a React Native client bundle is a security mistake. The
 *     gateway hides where the call actually runs.
 *   • Multiple deployment shapes need to coexist (local dev with a
 *     direct key, production via a server proxy, and graceful
 *     fallback to deterministic logic when neither is available).
 *   • Centralising means screens and stores import a single,
 *     uniformly-shaped object — not a tangle of fetch() helpers.
 *
 * Three transports, picked once at module load:
 *
 *   1. DIRECT — instantiates `ClaudeClient` in-process. Active when
 *      `process.env.EXPO_PUBLIC_PURA_AI_TRANSPORT === 'direct'` and an
 *      `EXPO_PUBLIC_ANTHROPIC_API_KEY` is set. Intended for local
 *      development only — embedding the key in a shipped RN bundle
 *      exposes it. The SDK is constructed with
 *      `dangerouslyAllowBrowser: true` because the RN JS environment
 *      otherwise looks like a browser to the SDK.
 *
 *   2. PROXY — POSTs JSON to `EXPO_PUBLIC_PURA_AI_PROXY_URL` /
 *      `<method-name>`. The server-side endpoint instantiates
 *      `ClaudeClient` from its own environment and returns the
 *      structured result. This is the production transport.
 *
 *      Proxy contract (every method): the host endpoint accepts a
 *      JSON body equal to the method's `params` object and returns a
 *      JSON body equal to the method's resolved value. Errors should
 *      be returned with non-2xx status; the response body may be a
 *      `{ message: string }` JSON object.
 *
 *   3. NONE — the gateway reports `isAvailable() === false` and every
 *      method throws `AIGatewayUnavailableError`. Callers (api/scan,
 *      api/assistant, api/products) catch this and fall back to the
 *      deterministic logic that already shipped in the app. This is
 *      an intentional fallback: the brief allows deterministic logic
 *      to remain alive as long as it's a clearly intentional
 *      fallback path. The app never crashes for users without AI
 *      configured.
 *
 * `lookupBarcode` for the barcode flow is provided per-call by the
 * caller — the gateway doesn't own a catalog. In direct mode this is
 * passed straight through to ClaudeClient. In proxy mode the host
 * endpoint owns its own lookup; the gateway sends only the barcode
 * value and trusts the proxy to perform the loop server-side.
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

// ---------------------------------------------------------------------------
// Public errors.
// ---------------------------------------------------------------------------

export class AIGatewayUnavailableError extends Error {
  constructor() {
    super(
      'AIGatewayUnavailableError: no AI transport configured. ' +
        'Set EXPO_PUBLIC_PURA_AI_TRANSPORT=direct + ' +
        'EXPO_PUBLIC_ANTHROPIC_API_KEY for local dev, or set ' +
        'EXPO_PUBLIC_PURA_AI_PROXY_URL for production.'
    );
    this.name = 'AIGatewayUnavailableError';
  }
}

export class AIProxyError extends Error {
  constructor(
    public method: string,
    public status: number,
    detail: string
  ) {
    super(`AIProxyError: ${method} -> HTTP ${status}: ${detail}`);
    this.name = 'AIProxyError';
  }
}

// ---------------------------------------------------------------------------
// Transport selection.
// ---------------------------------------------------------------------------

type Transport = 'direct' | 'proxy' | 'none';

function resolveTransport(): Transport {
  const explicit = (process.env.EXPO_PUBLIC_PURA_AI_TRANSPORT ?? '').trim();
  if (explicit === 'direct') {
    const key = (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '').trim();
    return key.length > 0 ? 'direct' : 'none';
  }
  const proxyUrl = (process.env.EXPO_PUBLIC_PURA_AI_PROXY_URL ?? '').trim();
  if (proxyUrl.length > 0) return 'proxy';
  // Fallthrough — auto-pick direct if a key happens to be present.
  const fallbackKey = (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '').trim();
  if (fallbackKey.length > 0) return 'direct';
  return 'none';
}

const TRANSPORT: Transport = resolveTransport();
const PROXY_URL = (process.env.EXPO_PUBLIC_PURA_AI_PROXY_URL ?? '').replace(
  /\/+$/,
  ''
);

// ---------------------------------------------------------------------------
// Direct transport client (local dev only).
// ---------------------------------------------------------------------------

let _directClient: ClaudeClient | null = null;
function getDirectClient(): ClaudeClient {
  if (_directClient) return _directClient;
  const apiKey = (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '').trim();
  if (apiKey.length === 0) {
    throw new AIGatewayUnavailableError();
  }
  // The SDK constructor is permissive with `apiKey`; we set
  // `dangerouslyAllowBrowser` because the RN JS environment is detected
  // as browser-like by the SDK. This is intentional ONLY for local dev.
  _directClient = new (class extends ClaudeClient {
    constructor() {
      super({ apiKey });
      // Replace the SDK instance with one that allows browser-like
      // environments. The parent constructor already created a strict
      // client; we overwrite the private field by re-constructing.
      (this as unknown as { anthropic: Anthropic }).anthropic = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  })();
  return _directClient;
}

// ---------------------------------------------------------------------------
// Proxy helpers.
// ---------------------------------------------------------------------------

async function proxyCall<TResult>(
  method: string,
  body: Record<string, unknown>
): Promise<TResult> {
  if (PROXY_URL.length === 0) throw new AIGatewayUnavailableError();
  const url = `${PROXY_URL}/${method}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new AIProxyError(
      method,
      0,
      e instanceof Error ? e.message : 'network error'
    );
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = (await res.json()) as { message?: unknown };
      if (typeof errBody.message === 'string' && errBody.message.length > 0) {
        detail = errBody.message;
      }
    } catch {
      // ignore JSON parse failure; keep statusText
    }
    throw new AIProxyError(method, res.status, detail);
  }
  return (await res.json()) as TResult;
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

  /**
   * Barcode resolution. In direct mode the gateway runs the two-step
   * loop in-process and uses the caller-supplied `lookupBarcode`. In
   * proxy mode the host endpoint owns its own lookup, so only the
   * barcode value is sent.
   */
  normalizeBarcodeResolution(params: {
    barcodeValue: string;
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
// Implementation: dispatch each method through the active transport.
// ---------------------------------------------------------------------------

function notAvailable(): never {
  throw new AIGatewayUnavailableError();
}

const gateway: AIGateway = {
  isAvailable() {
    return TRANSPORT !== 'none';
  },
  transport() {
    return TRANSPORT;
  },

  async analyzeFaceScan(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().analyzeFaceScan(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<FaceScanAnalysis>('analyzeFaceScan', params);
    }
    notAvailable();
  },

  async identifyProductFromImage(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().identifyProductFromImage(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<ProductIdentity>('identifyProductFromImage', params);
    }
    notAvailable();
  },

  async normalizeBarcodeResolution(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().normalizeBarcodeResolution(params);
    }
    if (TRANSPORT === 'proxy') {
      // The proxy host runs the full loop server-side and owns its own
      // catalog. Only the barcode value crosses the wire.
      return proxyCall<BarcodeResolution>('normalizeBarcodeResolution', {
        barcodeValue: params.barcodeValue,
      });
    }
    notAvailable();
  },

  async matchProductsForUser(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().matchProductsForUser(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<ProductMatchResult>('matchProductsForUser', params);
    }
    notAvailable();
  },

  async generateRoutineRecommendation(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().generateRoutineRecommendation(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<RoutineRecommendation>(
        'generateRoutineRecommendation',
        params
      );
    }
    notAvailable();
  },

  async explainSkinScore(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().explainSkinScore(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<SkinScoreExplanation>('explainSkinScore', params);
    }
    notAvailable();
  },

  async explainProgress(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().explainProgress(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<ProgressExplanation>('explainProgress', params);
    }
    notAvailable();
  },

  async buildSearchSuggestions(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().buildSearchSuggestions(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<SearchSuggestionResult>(
        'buildSearchSuggestions',
        params
      );
    }
    notAvailable();
  },

  async answerAssistant(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().answerAssistant(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<string>('answerAssistant', params);
    }
    notAvailable();
  },

  async analyzeScannedProductAgainstUser(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().analyzeScannedProductAgainstUser(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<{
        identity: ProductIdentity;
        fit: ProductMatchResult;
      }>('analyzeScannedProductAgainstUser', params);
    }
    notAvailable();
  },

  async buildFullScanToPlanBundle(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().buildFullScanToPlanBundle(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<{
        analysis: FaceScanAnalysis;
        matches: ProductMatchResult;
        routine: RoutineRecommendation;
        score: SkinScoreExplanation;
      }>('buildFullScanToPlanBundle', params);
    }
    notAvailable();
  },

  async buildProgressBundle(params) {
    if (TRANSPORT === 'direct') {
      return getDirectClient().buildProgressBundle(params);
    }
    if (TRANSPORT === 'proxy') {
      return proxyCall<{
        progress: ProgressExplanation;
        score: SkinScoreExplanation;
      }>('buildProgressBundle', params);
    }
    notAvailable();
  },
};

export const aiGateway: AIGateway = gateway;

/**
 * Helper: run an async AI call and return null on AI unavailability so
 * callers can branch into deterministic fallbacks cleanly without
 * try/catching the unavailability error every time.
 */
export async function tryAi<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (
      e instanceof AIGatewayUnavailableError ||
      e instanceof AIProxyError ||
      // Any unhandled fetch/Anthropic error: still degrade gracefully.
      e instanceof Error
    ) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[aiGateway] call failed, falling back:', e.message);
      }
      return null;
    }
    return null;
  }
}
