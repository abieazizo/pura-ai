/**
 * Pura AI — in-app telemetry.
 *
 * The console-only `aiLog` channel is fine for production servers but
 * useless for proving — at a glance — that the real AI path is alive
 * inside a running RN bundle. This module mirrors every gateway and
 * API-wrapper event into a Zustand store the UI can subscribe to.
 *
 * What's recorded
 *   • per-method last call: status / source / requestId / duration /
 *     error message / timestamp
 *   • per-feature snapshot: which "AI feature surface" (scan,
 *     products, routine, assistant, etc.) is currently driven by AI
 *     vs. fallback
 *   • a rolling buffer of the last 50 log records (info/warn/error)
 *     so a diagnostics drawer can show recent activity
 *
 * What's NOT recorded
 *   • request bodies and response payloads (PII + size)
 *   • the proxy URL or token (security)
 *
 * Visibility
 *   • Dev builds: an `AISourceBadge` reads from this store and
 *     renders a small pill on AI-driven screens. Tap → opens the
 *     diagnostics screen.
 *   • Production builds: nothing reads from this store except an
 *     opt-in diagnostics surface (which can be disabled).
 *
 * The store deliberately uses Zustand (already in the project) so
 * subscribers re-render automatically when telemetry updates.
 */

import { create } from 'zustand';
import type { AiLogRecord } from './aiLog';

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

/**
 * Logical method names whose telemetry the UI cares about. These
 * mirror the public AIGateway methods plus the API-wrapper synthetic
 * methods like `assistantAnswer` (which goes through `answerAssistant`
 * but is consumed via the assistant API wrapper).
 */
export type AIMethodKey =
  | 'validateScanPreflight'
  | 'analyzeFaceScan'
  | 'identifyProductFromImage'
  | 'normalizeBarcodeResolution'
  | 'matchProductsForUser'
  | 'generateRoutineRecommendation'
  | 'explainSkinScore'
  | 'explainProgress'
  | 'buildSearchSuggestions'
  | 'answerAssistant'
  | 'analyzeScannedProductAgainstUser'
  | 'buildFullScanToPlanBundle'
  | 'buildProgressBundle'
  | 'lookupLiveProducts'
  | 'rerankProducts'
  | 'recommendProductsForUser';

export type AIMethodStatus =
  | 'idle'
  | 'pending'
  | 'ok'
  | 'fail'
  | 'fallback';

/**
 * Source for a high-level feature surface (scan, products, routine,
 * assistant). Used by the badge to colour itself.
 */
export type AIFeatureSource = 'idle' | 'ai' | 'fallback' | 'pending';

export type AIFeatureKey =
  | 'scan'
  | 'productScan'
  | 'barcode'
  | 'products'
  | 'routine'
  | 'progress'
  | 'assistant'
  | 'search';

export interface AIMethodSnapshot {
  status: AIMethodStatus;
  source: AIFeatureSource;
  /** Last request id, useful for proxy-side log correlation. */
  requestId: string | null;
  /** Last call duration in ms; null when no call has run. */
  durationMs: number | null;
  /** Last error message when status === 'fail'. */
  error: string | null;
  /** ms since epoch of the last status update. */
  updatedAt: number | null;
  /** Counters since app boot. */
  counts: { ok: number; fail: number; fallback: number };
}

const EMPTY_METHOD_SNAPSHOT: AIMethodSnapshot = {
  status: 'idle',
  source: 'idle',
  requestId: null,
  durationMs: null,
  error: null,
  updatedAt: null,
  counts: { ok: 0, fail: 0, fallback: 0 },
};

export interface AIFeatureSnapshot {
  source: AIFeatureSource;
  /** Plain-English line about why the surface is in its current
   *  state — shown in the diagnostics screen. */
  detail: string;
  updatedAt: number | null;
}

const EMPTY_FEATURE_SNAPSHOT: AIFeatureSnapshot = {
  source: 'idle',
  detail: '',
  updatedAt: null,
};

interface AITelemetryState {
  /** Telemetry per low-level gateway method. */
  methods: Record<AIMethodKey, AIMethodSnapshot>;
  /** Telemetry per high-level feature surface (scan, products, ...). */
  features: Record<AIFeatureKey, AIFeatureSnapshot>;
  /** Rolling buffer of recent log records (max 50). */
  logs: AiLogRecord[];
  /** Last `/healthz` ping result. Updated by the diagnostics screen. */
  healthz: {
    ok: boolean | null;
    pingedAt: number | null;
    latencyMs: number | null;
    detail: string | null;
  };

  // Mutators (used by gateway + api wrappers + diagnostics screen).
  beginMethodCall(method: AIMethodKey, requestId: string): void;
  completeMethodCallOk(method: AIMethodKey, durationMs: number): void;
  completeMethodCallFail(
    method: AIMethodKey,
    durationMs: number,
    error: string
  ): void;
  setFeatureSource(
    feature: AIFeatureKey,
    source: AIFeatureSource,
    detail: string
  ): void;
  countFallback(method: AIMethodKey): void;
  pushLog(record: AiLogRecord): void;
  setHealthz(result: AITelemetryState['healthz']): void;
  reset(): void;
}

// ---------------------------------------------------------------------------
// Initial state.
// ---------------------------------------------------------------------------

const METHOD_KEYS: AIMethodKey[] = [
  // v11.7 — preflight added to the gateway. Was missing from this
  // registry, which caused the runtime crash:
  //   beginMethodCall('validateScanPreflight') would set a partial
  //   snapshot (no `counts` field) because the spread of `undefined`
  //   produces nothing → completeMethodCallFail then reads
  //   `prev.counts.fail` and crashes with "Cannot read property
  //   'fail' of undefined" → the whole face-scan flow dies silently.
  'validateScanPreflight',
  'analyzeFaceScan',
  'identifyProductFromImage',
  'normalizeBarcodeResolution',
  'matchProductsForUser',
  'generateRoutineRecommendation',
  'explainSkinScore',
  'explainProgress',
  'buildSearchSuggestions',
  'answerAssistant',
  'analyzeScannedProductAgainstUser',
  'buildFullScanToPlanBundle',
  'buildProgressBundle',
  'lookupLiveProducts',
  'rerankProducts',
  'recommendProductsForUser',
];

const FEATURE_KEYS: AIFeatureKey[] = [
  'scan',
  'productScan',
  'barcode',
  'products',
  'routine',
  'progress',
  'assistant',
  'search',
];

function emptyMethodMap(): Record<AIMethodKey, AIMethodSnapshot> {
  const out = {} as Record<AIMethodKey, AIMethodSnapshot>;
  for (const k of METHOD_KEYS) {
    out[k] = { ...EMPTY_METHOD_SNAPSHOT, counts: { ok: 0, fail: 0, fallback: 0 } };
  }
  return out;
}

function emptyFeatureMap(): Record<AIFeatureKey, AIFeatureSnapshot> {
  const out = {} as Record<AIFeatureKey, AIFeatureSnapshot>;
  for (const k of FEATURE_KEYS) {
    out[k] = { ...EMPTY_FEATURE_SNAPSHOT };
  }
  return out;
}

const LOG_BUFFER_LIMIT = 50;

// ---------------------------------------------------------------------------
// Zustand store.
// ---------------------------------------------------------------------------

export const useAITelemetry = create<AITelemetryState>((set, get) => ({
  methods: emptyMethodMap(),
  features: emptyFeatureMap(),
  logs: [],
  healthz: { ok: null, pingedAt: null, latencyMs: null, detail: null },

  beginMethodCall(method, requestId) {
    set((s) => ({
      methods: {
        ...s.methods,
        // v11.12 — fall back to a fully-shaped snapshot if `method`
        // wasn't pre-registered in METHOD_KEYS. Previously a missing
        // key (e.g. v11.7's `validateScanPreflight`) caused the spread
        // of `undefined` to produce a snapshot without `counts`, which
        // then crashed completeMethodCallFail downstream.
        [method]: {
          ...EMPTY_METHOD_SNAPSHOT,
          ...(s.methods[method] ?? {}),
          status: 'pending',
          source: 'pending',
          requestId,
          durationMs: null,
          error: null,
          updatedAt: Date.now(),
        },
      },
    }));
  },

  completeMethodCallOk(method, durationMs) {
    set((s) => {
      const prev = s.methods[method] ?? EMPTY_METHOD_SNAPSHOT;
      const counts = prev.counts ?? { ok: 0, fail: 0, fallback: 0 };
      return {
        methods: {
          ...s.methods,
          [method]: {
            ...prev,
            status: 'ok',
            source: 'ai',
            durationMs,
            error: null,
            updatedAt: Date.now(),
            counts: { ...counts, ok: counts.ok + 1 },
          },
        },
      };
    });
  },

  completeMethodCallFail(method, durationMs, error) {
    set((s) => {
      const prev = s.methods[method] ?? EMPTY_METHOD_SNAPSHOT;
      const counts = prev.counts ?? { ok: 0, fail: 0, fallback: 0 };
      return {
        methods: {
          ...s.methods,
          [method]: {
            ...prev,
            status: 'fail',
            source: 'fallback',
            durationMs,
            error,
            updatedAt: Date.now(),
            counts: { ...counts, fail: counts.fail + 1 },
          },
        },
      };
    });
  },

  countFallback(method) {
    set((s) => {
      const prev = s.methods[method] ?? EMPTY_METHOD_SNAPSHOT;
      const counts = prev.counts ?? { ok: 0, fail: 0, fallback: 0 };
      return {
        methods: {
          ...s.methods,
          [method]: {
            ...prev,
            counts: { ...counts, fallback: counts.fallback + 1 },
          },
        },
      };
    });
  },

  setFeatureSource(feature, source, detail) {
    set((s) => ({
      features: {
        ...s.features,
        [feature]: { source, detail, updatedAt: Date.now() },
      },
    }));
  },

  pushLog(record) {
    set((s) => {
      const next = [record, ...s.logs];
      if (next.length > LOG_BUFFER_LIMIT) next.length = LOG_BUFFER_LIMIT;
      return { logs: next };
    });
  },

  setHealthz(result) {
    set({ healthz: result });
  },

  reset() {
    set({
      methods: emptyMethodMap(),
      features: emptyFeatureMap(),
      logs: [],
      healthz: { ok: null, pingedAt: null, latencyMs: null, detail: null },
    });
    void get;
  },
}));

// ---------------------------------------------------------------------------
// Imperative helpers — used by code paths that don't want to call the
// hook (gateway / api wrappers run outside React). Each delegates to
// the Zustand store's mutators.
// ---------------------------------------------------------------------------

export const aiTelemetry = {
  beginMethodCall(method: AIMethodKey, requestId: string) {
    useAITelemetry.getState().beginMethodCall(method, requestId);
  },
  completeMethodCallOk(method: AIMethodKey, durationMs: number) {
    useAITelemetry.getState().completeMethodCallOk(method, durationMs);
  },
  completeMethodCallFail(
    method: AIMethodKey,
    durationMs: number,
    error: string
  ) {
    useAITelemetry.getState().completeMethodCallFail(method, durationMs, error);
  },
  countFallback(method: AIMethodKey) {
    useAITelemetry.getState().countFallback(method);
  },
  setFeatureSource(
    feature: AIFeatureKey,
    source: AIFeatureSource,
    detail: string
  ) {
    useAITelemetry.getState().setFeatureSource(feature, source, detail);
  },
  pushLog(record: AiLogRecord) {
    useAITelemetry.getState().pushLog(record);
  },
  setHealthz(result: AITelemetryState['healthz']) {
    useAITelemetry.getState().setHealthz(result);
  },
};
