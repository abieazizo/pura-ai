/**
 * Pura AI — client-side gateway. **EXPO-SAFE.**
 *
 * This file is the only thing the React Native bundle imports when it
 * needs AI. It is strictly fetch-based:
 *   • no provider SDK import (the OpenAI SDK pulls Node-only resources
 *     and a beta path Metro can't resolve, so it MUST stay server-only)
 *   • no import of any file under `server/`
 *   • no instantiation of any provider SDK at any branch, ever
 *
 * Two transports:
 *
 *   1. PROXY (production / dev)
 *      Active when `EXPO_PUBLIC_PURA_AI_PROXY_URL` is set. Every method
 *      POSTs JSON to `<proxy_url>/<method-name>`. The proxy server
 *      (see `server/aiProxy.ts`) holds the OpenAI API key, runs
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
 * in v10.24 — embedding any provider SDK in the RN bundle is
 * infeasible (Metro can't resolve the SDK's beta resource paths) and
 * exposes the API key. Local development now uses the same proxy
 * (`npm run server:ai`).
 */

import Constants from 'expo-constants';
import type {
  AssistantContext,
  BarcodeResolution,
  FaceScanAnalysis,
  LiveProductLookupResult,
  ProductIdentity,
  ProductMatchResult,
  ProgressExplanation,
  RoutineRecommendation,
  ScanPreflightResult,
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
    detail: string,
    /**
     * v19.10 — explicit flag distinguishing a CLIENT-SIDE
     * AbortController timeout from a real network failure or 5xx.
     * Both produce status=0 historically, but they call for
     * different retry behavior:
     *   • timeout: model is genuinely slow — retrying with the
     *     same budget just doubles wall-clock for the same outcome
     *     (50s→90s of "timeout"). Skip retry.
     *   • non-timeout network/5xx: real transient — retry once.
     */
    public timedOut: boolean = false
  ) {
    super(
      `AIProxyError: ${method} -> HTTP ${status} (req=${requestId}): ${detail}`
    );
    this.name = 'AIProxyError';
  }

  /**
   * True when this error is worth retrying. v19.10 — timeouts no
   * longer count as transient. The previous "status === 0" rule
   * conflated network failures with budget-exceeded, and the retry
   * envelope kept restarting an already-too-short request, which
   * is exactly what produced the user-visible
   * `client timeout after 25000ms` after a full 50s wall-clock.
   */
  isTransient(): boolean {
    if (this.timedOut) return false;
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

// v19.6 — `matchProductsForUser` + `generateRoutineRecommendation`
// bumped 50_000 → 90_000. Real-world AI runs of 24-candidate ranking
// were exceeding 50s and triggering AbortController, surfacing as
// `AIProxyError: matchProductsForUser -> HTTP 0 -> Aborted`. The 90s
// budget covers one full attempt at the bumped 6144-token cap (v18.10)
// plus the server-side runStrictStructured retry-once envelope.
// Combined with v19.6's candidate pre-filter (10 instead of 24),
// the call now finishes well inside the budget on normal scans.
const TIMEOUT_MS = {
  // v19.13 — bumped 18_000 → 35_000. Vision preflight calls
  // (image-bearing GPT-5-mini analysis) regularly exceed 18 s in
  // the wild because of vision encoding + reasoning overhead;
  // diagnostics were surfacing `validateScanPreflight FAIL ->
  // client timeout after 18000ms` on cold starts. 35 s gives the
  // single attempt + the runStrictStructured retry envelope room
  // to breathe. Combined with the v19.10 no-retry-on-timeout
  // policy this caps worst case at 35 s.
  validateScanPreflight: 35_000,
  analyzeFaceScan: 75_000,
  identifyProductFromImage: 60_000,
  normalizeBarcodeResolution: 30_000,
  matchProductsForUser: 90_000,
  generateRoutineRecommendation: 90_000,
  explainSkinScore: 25_000,
  explainProgress: 30_000,
  // v19.13 — bumped 18_000 → 25_000 for the same reason as
  // preflight. Search suggestions are non-critical (gateway
  // swallows failures silently) but a 25s budget reduces the
  // visible "no chips" surface on cold starts.
  buildSearchSuggestions: 25_000,
  answerAssistant: 75_000,
  analyzeScannedProductAgainstUser: 90_000,
  buildFullScanToPlanBundle: 150_000,
  buildProgressBundle: 35_000,
  // v19.14 — DROPPED 45_000 → 25_000. v19.10's 45s budget existed
  // to cover gpt-5-mini's variable reasoning latency. v19.14
  // swaps lookupLiveProducts to gpt-4o-mini (non-reasoning, 2-5s
  // typical) so the budget can shrink dramatically:
  //   • Median: 3-6s
  //   • Worst case: 15-20s
  //   • Cold start max observed: ~22s
  // 25s covers a cold-start worst case with comfortable headroom
  // and surfaces a 25s timeout MUCH faster than the 45s ceiling
  // when the proxy or upstream is genuinely down.
  //
  // No retry on timeout (v19.10 policy preserved). Worst case = 25s.
  lookupLiveProducts: 25_000,
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
 * v10.34 — route AI requests through Metro's dev server.
 *
 * History:
 *   • v10.33 auto-derived the proxy URL from Expo's bundle host
 *     (Constants.expoConfig.hostUri, e.g. `192.168.1.42:8081`) and
 *     swapped the port to 8787 — the proxy's own port. That fixed
 *     the localhost-on-phone bug but left a port-firewall bug:
 *     most dev machines whitelist port 8081 (because that's how the
 *     JS bundle loads) but block inbound 8787, so phones still saw
 *     "Network request failed" on every AI call.
 *   • v10.34 keeps the bundle host but routes through Metro's port
 *     (the SAME port the bundle uses) under the `/__pura_ai__/`
 *     prefix. Metro's middleware (see `metro.config.js`) forwards
 *     each request to the actual proxy on `127.0.0.1:8787`, which
 *     works because Metro lives on the dev machine and can reach
 *     its own loopback. No firewall changes needed.
 *
 * Result: zero env config required for dev. Phone reaches Metro on
 * 8081 → Metro forwards to local proxy → OpenAI. The same path
 * the bundle takes.
 *
 * Order of precedence:
 *   1. Explicit override — EXPO_PUBLIC_PURA_AI_PROXY_URL set to a
 *      non-localhost host. Use for production deployments, ngrok,
 *      Cloudflare tunnels, etc.
 *   2. Auto-derived Metro middleware URL — the LAN IP Metro is
 *      serving from + Metro's port + `/__pura_ai__/` prefix. Right
 *      for 99% of dev workflows.
 *   3. Localhost fallback — iOS Simulator / Android emulator with
 *      direct port 8787 access. Rare.
 */
type ProxySource =
  | 'override'
  | 'metro-middleware'
  | 'direct-port'
  | 'localhost-fallback'
  | 'none';

interface ProxyCandidate {
  url: string;
  source: ProxySource;
}

/**
 * v10.39 — build the list of plausible proxy URLs.
 *
 * As of v10.39 the metro-middleware path serves AI responses
 * IN-PROCESS (Metro itself loads the OpenAI SDK and answers
 * /__pura_ai__/* directly — see metro.config.js). The direct-port
 * candidate is kept around for the standalone server/aiProxy.ts
 * (used by `npm run verify:ai` and other scripts), but normal
 * dev workflows no longer need it.
 *
 * Net: `npm start` is now sufficient. No separate `npm run dev`,
 * no port-8787 firewall, no second process to babysit.
 */
function listProxyCandidates(): ProxyCandidate[] {
  const out: ProxyCandidate[] = [];
  const override = envString('EXPO_PUBLIC_PURA_AI_PROXY_URL').replace(
    /\/+$/,
    ''
  );
  if (
    override.length > 0 &&
    !/\/\/(localhost|127\.0\.0\.1)\b/.test(override)
  ) {
    out.push({ url: override, source: 'override' });
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
    const [host, port] = hostUri.split(':');
    const metroPort = port && /^\d+$/.test(port) ? port : '8081';
    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      host !== '0.0.0.0'
    ) {
      // Two parallel candidates per host: middleware path (no
      // firewall change needed if Metro is restarted with the new
      // metro.config.js) AND direct port 8787 (works if firewall
      // allows it / on the dev machine itself).
      out.push({
        url: `http://${host}:${metroPort}/__pura_ai__`,
        source: 'metro-middleware',
      });
      out.push({
        url: `http://${host}:8787`,
        source: 'direct-port',
      });
    }
  }

  // Last resort — localhost flavours, useful in iOS Simulator /
  // Android emulator (and as a sanity check on the dev machine).
  if (override.length > 0) {
    out.push({ url: override, source: 'localhost-fallback' });
  }
  out.push({
    url: 'http://127.0.0.1:8081/__pura_ai__',
    source: 'localhost-fallback',
  });
  out.push({ url: 'http://127.0.0.1:8787', source: 'localhost-fallback' });

  return out;
}

const PROXY_CANDIDATES = listProxyCandidates();
// v10.38 — start UNVERIFIED. Previously we defaulted to candidate[0]
// which made the diagnostic UI render the first candidate as "active"
// (in moss-green) before the probe had verified anything. That was
// misleading — the user saw a green active source but unreachable
// status simultaneously. Active stays empty until the probe finds a
// candidate that returns a valid /healthz.
let _activeCandidate: ProxyCandidate = PROXY_CANDIDATES[0] ?? {
  url: '',
  source: 'none',
};
let _activeVerified = false;

/**
 * Replace the active proxy candidate. Called once a probe succeeds
 * so all subsequent calls go through the URL that's known to work.
 * Exposed for the diagnostics screen.
 */
export function setActiveProxyCandidate(c: ProxyCandidate): void {
  _activeCandidate = c;
  _activeVerified = true;
  aiLog.info('aiGateway.candidate', 'active proxy candidate updated', {
    url: c.url,
    source: c.source,
  });
}

export function isActiveProxyVerified(): boolean {
  return _activeVerified;
}

export function getProxyCandidates(): ProxyCandidate[] {
  return PROXY_CANDIDATES.slice();
}

const PROXY_TOKEN = envString('EXPO_PUBLIC_PURA_AI_PROXY_TOKEN');

const TRANSPORT: Transport =
  _activeCandidate.url.length > 0 ? 'proxy' : 'none';

aiLog.info('aiGateway.boot', `transport=${TRANSPORT}`, {
  candidates: PROXY_CANDIDATES.map((c) => `${c.source}: ${c.url}`),
  activeUrl: _activeCandidate.url,
  activeSource: _activeCandidate.source,
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
  const url = `${_activeCandidate.url}/${method}`;

  const controller = new AbortController();
  // v19.6 — explicit abort observability. Before, the user saw a
  // generic `HTTP 0 -> Aborted` with no signal whether the AbortController
  // fired because of the timeout or because of a network error. The
  // `timedOut` flag + the aiLog.warn make the failure mode visible
  // in the Metro console at the exact moment it happens.
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    aiLog.warn('aiGateway.proxyFetch', `${method} timed out after ${timeoutMs}ms; aborting`, {
      requestId,
      timeoutMs,
    });
    controller.abort();
  }, timeoutMs);

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
    const detail = timedOut
      ? `client timeout after ${timeoutMs}ms`
      : e instanceof Error
      ? e.message
      : 'network error';
    // v19.10 — surface the timedOut bit explicitly so the retry
    // envelope can decide intelligently. A timeout means the
    // BUDGET was exceeded; retrying under the same budget is
    // just expensive theatre.
    throw new AIProxyError(method, 0, requestId, detail, timedOut);
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

/**
 * v11.10 — non-critical methods: opt out of the retry-then-error
 * pattern so transient failures don't surface as red console.error
 * overlays in dev. These calls power optional UX (search suggestion
 * chips, etc.); when they fail the surface degrades silently to its
 * default copy.
 *
 * The criteria for inclusion: failure must NOT block any user goal.
 *   • buildSearchSuggestions → search bar renders default placeholder
 *   • (others can be added here without further touching runMethod)
 */
const NON_CRITICAL_METHODS = new Set<AIMethodName>([
  'buildSearchSuggestions',
]);

async function runMethod<TRaw, T>(args: {
  method: AIMethodName;
  body: unknown;
  validate: (raw: unknown) => T | null;
}): Promise<T> {
  const { method, body, validate } = args;
  const timeoutMs = TIMEOUT_MS[method];
  const requestId = newRequestId();
  const start = Date.now();
  const isNonCritical = NON_CRITICAL_METHODS.has(method);

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

    // Non-critical methods: ONE attempt, no retry, log as info-level
    // so it never surfaces as a red overlay in __DEV__. Caller swallows.
    if (isNonCritical) {
      const dur = Date.now() - start;
      const errMsg =
        firstError instanceof Error ? firstError.message : String(firstError);
      aiLog.info(
        'aiGateway.call',
        `${method} skipped (non-critical, degraded gracefully)`,
        { requestId, durationMs: dur, error: errMsg }
      );
      aiTelemetry.completeMethodCallFail(method as AIMethodKey, dur, errMsg);
      throw firstError;
    }

    if (!transient) {
      const dur = Date.now() - start;
      const errMsg =
        firstError instanceof Error ? firstError.message : String(firstError);
      // v19.10 — make the retry-skipped reason explicit in the log.
      // Helps the diagnostics screen surface "timed out, did not
      // retry" vs "validation failed, did not retry" cleanly.
      const reason =
        firstError instanceof AIProxyError && firstError.timedOut
          ? 'timeout'
          : firstError instanceof AIValidationError
          ? 'validation'
          : '4xx';
      aiLog.warn(
        'aiGateway.call',
        `${method} failed (no retry, reason=${reason})`,
        {
          requestId,
          durationMs: dur,
          error: errMsg,
        }
      );
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
      // v11.10 — was aiLog.error which fired console.error → red
      // overlay. Downgraded to warn: the proxy/network failure is
      // already surfaced via the AISourceBadge / fallback flag, so a
      // duplicate red overlay served no UX purpose.
      aiLog.warn('aiGateway.call', `${method} failed after retry`, {
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
  proxyUrlSource(): ProxySource;

  /**
   * v11.7 — fast preflight to validate the captured photo BEFORE
   * the expensive analyzeFaceScan call. Returns a structured
   * ScanPreflightResult with face_box + reason; UI uses the reason
   * to short-circuit obviously bad captures into the
   * condition-aware retry screen.
   */
  validateScanPreflight(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
  }): Promise<ScanPreflightResult>;

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

  /**
   * v18.0 — Live product retrieval. Returns real, named, commercially
   * available products for either a free-text query or a scan-derived
   * concern context. The AI is the inventory; the client renders the
   * result with brand/name/price/buy-url when present and a quiet
   * placeholder + search-on-merchant CTA when fields are null.
   */
  lookupLiveProducts(params: {
    query: string;
    scanContext?: {
      primary_concern: string | null;
      secondary_concerns: string[];
      severity_band: string;
      regions: string[];
      skin_type: string;
      sensitivities: string[];
    };
    count?: number;
  }): Promise<LiveProductLookupResult>;

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
    return _activeCandidate.url;
  },
  proxyUrlSource() {
    return _activeCandidate.source;
  },

  async validateScanPreflight(params) {
    ensureAvailable();
    return runMethod({
      method: 'validateScanPreflight',
      body: params,
      validate: validateScanPreflightResult,
    });
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

  async lookupLiveProducts(params) {
    ensureAvailable();
    return runMethod({
      method: 'lookupLiveProducts',
      body: params,
      validate: validateLiveProductLookupResult,
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
