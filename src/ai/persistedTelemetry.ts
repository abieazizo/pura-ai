/**
 * Pura AI — persistent telemetry (v19.16, Phase 2A).
 *
 * The existing `useAITelemetry` (Zustand in-memory) records the
 * SHAPE of the latest call per method + a rolling log buffer.
 * That's reset on every cold start. v19.16 adds a SECOND store
 * that persists structured events across sessions via AsyncStorage,
 * so debugging recurring failures + reasoning about scan-quality
 * trends works without forcing the user to reproduce the issue
 * mid-session.
 *
 * Stored events (categorised):
 *   • ai_call          — request timings + classified failure reasons
 *   • scan_quality     — imageQuality.confidence + branch outcome
 *   • result_state     — which result-state mode the resolver picked
 *   • assistant        — grounding success/failure
 *   • recommendation   — hero resolved / unavailable / error
 *   • onboarding       — milestone events (entered, granted_camera, ...)
 *
 * Rules:
 *   • bounded ring buffer (last 200 events) — never grows unbounded
 *   • no raw face image data, no PII bodies, no proxy URL/token
 *   • diagnostics screen reads from here directly
 *   • events are append-only from the recording side; clearable
 *     via `clearPersistedTelemetry()` for a fresh-state debug session
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type AIFailureCategory =
  | 'timeout'
  | 'validation'
  | 'empty'
  | 'proxy_unreachable'
  | 'parse'
  | 'ui_cancel'
  | 'unknown';

export type ScanQualityBranch =
  | 'blocked_retake_required'
  | 'low_confidence_result'
  | 'normal_result';

export type ResultStateMode =
  | 'blocked_retake_required'
  | 'low_confidence_result'
  | 'normal_result'
  | 'result_with_products_loading'
  | 'result_with_products_ready'
  | 'result_with_products_unavailable';

export type OnboardingMilestone =
  | 'entered_onboarding'
  | 'granted_camera'
  | 'first_scan_attempted'
  | 'first_scan_blocked'
  | 'first_result_shown'
  | 'completed_onboarding';

export interface AICallEvent {
  kind: 'ai_call';
  at: number; // ms since epoch
  method: string; // AIMethodKey, but stringified for storage
  ok: boolean;
  durationMs: number;
  failureCategory: AIFailureCategory | null;
  /** Trimmed error message — never raw stack or body. */
  errorSummary: string | null;
}

export interface ScanQualityEvent {
  kind: 'scan_quality';
  at: number;
  scanId: string;
  confidence: number;
  branch: ScanQualityBranch;
  issues: string[];
}

export interface ResultStateEvent {
  kind: 'result_state';
  at: number;
  scanId: string;
  mode: ResultStateMode;
}

export interface AssistantGroundingEvent {
  kind: 'assistant';
  at: number;
  groundedFrom: string[];
  hasDisplayName: boolean;
  hasLatestScan: boolean;
  hasTopMatches: boolean;
}

export interface RecommendationEvent {
  kind: 'recommendation';
  at: number;
  intentMode: string;
  availabilityState: string;
  candidateCount: number;
  hasHero: boolean;
  failureReason: string | null;
}

export interface OnboardingEvent {
  kind: 'onboarding';
  at: number;
  milestone: OnboardingMilestone;
  detail: string | null;
}

export type TelemetryEvent =
  | AICallEvent
  | ScanQualityEvent
  | ResultStateEvent
  | AssistantGroundingEvent
  | RecommendationEvent
  | OnboardingEvent;

// ---------------------------------------------------------------------------
// Persisted Zustand store
// ---------------------------------------------------------------------------

interface PersistedTelemetryState {
  /** Append-only ring buffer of events. Newest first. */
  events: TelemetryEvent[];
  /** ms since epoch when the buffer was last cleared / first
   *  initialised — useful for the diagnostics screen to label
   *  "events since {time}". */
  startedAt: number;
  recordEvent(event: TelemetryEvent): void;
  clearEvents(): void;
}

const RING_LIMIT = 200;

export const usePersistedTelemetry = create<PersistedTelemetryState>()(
  persist(
    (set) => ({
      events: [],
      startedAt: Date.now(),
      recordEvent(event) {
        set((s) => {
          const next = [event, ...s.events];
          if (next.length > RING_LIMIT) next.length = RING_LIMIT;
          return { events: next };
        });
      },
      clearEvents() {
        set({ events: [], startedAt: Date.now() });
      },
    }),
    {
      name: 'pura-telemetry-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only events + startedAt; the action functions are
      // recreated on each load.
      partialize: (state) => ({
        events: state.events,
        startedAt: state.startedAt,
      }),
    }
  )
);

// ---------------------------------------------------------------------------
// Convenience recorders — type-safe wrappers around recordEvent.
// Callers should prefer these so the event shape stays consistent.
// ---------------------------------------------------------------------------

function trimError(err: unknown): string {
  if (!err) return '';
  const msg = err instanceof Error ? err.message : String(err);
  return msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
}

function classifyError(msg: string | null | undefined): AIFailureCategory {
  if (!msg) return 'unknown';
  const m = msg.toLowerCase();
  if (m.includes('client timeout after')) return 'timeout';
  if (m.includes('timed out')) return 'timeout';
  if (m.includes('aivalidation')) return 'validation';
  if (m.includes('failed structural validation')) return 'validation';
  if (m.includes('empty_content') || m.includes('length_cap')) return 'empty';
  if (m.includes('parse')) return 'parse';
  if (m.includes('aigatewayunavailable')) return 'proxy_unreachable';
  if (m.includes('http 0')) return 'proxy_unreachable';
  if (m.includes('aborted') && m.includes('cancel')) return 'ui_cancel';
  return 'unknown';
}

export function recordAICall(args: {
  method: string;
  ok: boolean;
  durationMs: number;
  error?: unknown;
}): void {
  const errSummary = args.ok ? null : trimError(args.error);
  usePersistedTelemetry.getState().recordEvent({
    kind: 'ai_call',
    at: Date.now(),
    method: args.method,
    ok: args.ok,
    durationMs: args.durationMs,
    failureCategory: args.ok ? null : classifyError(errSummary),
    errorSummary: errSummary && errSummary.length > 0 ? errSummary : null,
  });
}

export function recordScanQuality(args: {
  scanId: string;
  confidence: number;
  branch: ScanQualityBranch;
  issues: string[];
}): void {
  usePersistedTelemetry.getState().recordEvent({
    kind: 'scan_quality',
    at: Date.now(),
    ...args,
  });
}

export function recordResultState(args: {
  scanId: string;
  mode: ResultStateMode;
}): void {
  usePersistedTelemetry.getState().recordEvent({
    kind: 'result_state',
    at: Date.now(),
    ...args,
  });
}

export function recordAssistantGrounding(args: {
  groundedFrom: string[];
  hasDisplayName: boolean;
  hasLatestScan: boolean;
  hasTopMatches: boolean;
}): void {
  usePersistedTelemetry.getState().recordEvent({
    kind: 'assistant',
    at: Date.now(),
    ...args,
  });
}

export function recordRecommendation(args: {
  intentMode: string;
  availabilityState: string;
  candidateCount: number;
  hasHero: boolean;
  failureReason: string | null;
}): void {
  usePersistedTelemetry.getState().recordEvent({
    kind: 'recommendation',
    at: Date.now(),
    ...args,
  });
}

export function recordOnboardingMilestone(
  milestone: OnboardingMilestone,
  detail: string | null = null
): void {
  usePersistedTelemetry.getState().recordEvent({
    kind: 'onboarding',
    at: Date.now(),
    milestone,
    detail,
  });
}

export function clearPersistedTelemetry(): void {
  usePersistedTelemetry.getState().clearEvents();
}

// ---------------------------------------------------------------------------
// Read helpers for diagnostics.
// ---------------------------------------------------------------------------

export function summarizePersistedTelemetry(): {
  total: number;
  okCount: number;
  failCount: number;
  byCategory: Record<AIFailureCategory, number>;
  byBranch: Record<ScanQualityBranch, number>;
  byMode: Record<ResultStateMode, number>;
} {
  const events = usePersistedTelemetry.getState().events;
  const byCategory: Record<AIFailureCategory, number> = {
    timeout: 0,
    validation: 0,
    empty: 0,
    proxy_unreachable: 0,
    parse: 0,
    ui_cancel: 0,
    unknown: 0,
  };
  const byBranch: Record<ScanQualityBranch, number> = {
    blocked_retake_required: 0,
    low_confidence_result: 0,
    normal_result: 0,
  };
  const byMode: Record<ResultStateMode, number> = {
    blocked_retake_required: 0,
    low_confidence_result: 0,
    normal_result: 0,
    result_with_products_loading: 0,
    result_with_products_ready: 0,
    result_with_products_unavailable: 0,
  };
  let okCount = 0;
  let failCount = 0;
  for (const e of events) {
    if (e.kind === 'ai_call') {
      if (e.ok) okCount++;
      else {
        failCount++;
        if (e.failureCategory) byCategory[e.failureCategory]++;
      }
    } else if (e.kind === 'scan_quality') {
      byBranch[e.branch]++;
    } else if (e.kind === 'result_state') {
      byMode[e.mode]++;
    }
  }
  return {
    total: events.length,
    okCount,
    failCount,
    byCategory,
    byBranch,
    byMode,
  };
}
