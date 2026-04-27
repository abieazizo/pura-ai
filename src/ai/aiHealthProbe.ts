/**
 * Startup AI proxy health probe.
 *
 * v10.36 — multi-candidate probe.
 * Tries every URL in `aiGateway.getProxyCandidates()` in parallel
 * and promotes the first one that returns a valid `/healthz` JSON
 * (status 200 + body.ok === true) to the active proxy URL via
 * `setActiveProxyCandidate(...)`. All subsequent AI calls then go
 * through that URL.
 *
 * Why this matters: depending on what the user did to start the dev
 * server (full restart vs reload-only) and how their firewall is
 * configured, exactly one of the candidates is usually live:
 *   • metro-middleware — works when Metro restarted with the new
 *     metro.config.js. No firewall change needed.
 *   • direct-port      — works when port 8787 is reachable from the
 *     phone (firewall allowed it, or simulator/emulator).
 *   • localhost-fallback — works only on simulator/emulator.
 *
 * The probe surfaces the result on `aiTelemetry.healthz` so the
 * AISourceBadge / AIStatusBanner / AIDiagnostics screen all show a
 * single coherent state ("AI live via metro-middleware" vs
 * "Unreachable, tried 4 URLs").
 */

import {
  aiGateway,
  getProxyCandidates,
  setActiveProxyCandidate,
} from './aiGateway';
import { aiLog } from './aiLog';
import { aiTelemetry } from './aiTelemetry';

let _hasProbed = false;

/**
 * v10.38 — middleware-loaded state. Exposed for the diagnostics
 * screen so the user gets a definitive "Metro middleware: LOADED"
 * vs "NOT LOADED — restart Metro" answer, separate from the
 * /healthz reachability state.
 */
let _middlewareLoaded: 'unknown' | 'loaded' | 'not-loaded' = 'unknown';
let _middlewareDetail = '';

export function getMiddlewareLoadedState(): {
  state: 'unknown' | 'loaded' | 'not-loaded';
  detail: string;
} {
  return { state: _middlewareLoaded, detail: _middlewareDetail };
}

interface CandidateResult {
  url: string;
  source: string;
  ok: boolean;
  status?: number;
  latencyMs?: number;
  detail: string;
}

async function probeCandidate(
  url: string,
  source: string,
  timeoutMs: number
): Promise<CandidateResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${url}/healthz`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      /* non-JSON response — treat as a miss */
    }
    const ok = res.ok && body.ok === true;
    return {
      url,
      source,
      ok,
      status: res.status,
      latencyMs,
      detail: ok
        ? `transport=${body.transport ?? 'unknown'}, uptime_s=${body.uptime_s ?? '?'}`
        : `HTTP ${res.status} (body.ok=${body.ok ?? '<missing>'})`,
    };
  } catch (e) {
    return {
      url,
      source,
      ok: false,
      latencyMs: Date.now() - start,
      detail: e instanceof Error ? e.message : 'network error',
    };
  }
}

/**
 * v10.38 — probe the Metro-middleware marker. Tells us definitively
 * whether the metro.config.js middleware is loaded. Returns true if
 * the marker URL responds with the expected `middleware_alive: true`
 * shape; false otherwise.
 */
async function probeMiddlewareMarker(): Promise<{
  loaded: boolean;
  detail: string;
}> {
  // Build the marker URL from the metro-middleware candidate's URL
  // (strip the trailing /__pura_ai__ and append /__pura_ai__/_metro_marker).
  const candidates = getProxyCandidates();
  const middleware = candidates.find((c) => c.source === 'metro-middleware');
  if (!middleware) return { loaded: false, detail: 'no metro-middleware candidate' };
  const url = `${middleware.url}/_metro_marker`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        loaded: false,
        detail: `marker URL returned HTTP ${res.status}`,
      };
    }
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (body.middleware_alive === true) {
      return {
        loaded: true,
        detail: `version=${body.version ?? '?'}, target=${body.proxy_target ?? '?'}`,
      };
    }
    return {
      loaded: false,
      detail: 'marker URL returned 200 but body.middleware_alive !== true',
    };
  } catch (e) {
    return {
      loaded: false,
      detail: e instanceof Error ? e.message : 'network error',
    };
  }
}

export async function probeProxyHealthz(): Promise<void> {
  if (_hasProbed) return;
  _hasProbed = true;

  const candidates = getProxyCandidates();
  if (candidates.length === 0 || !aiGateway.isAvailable()) {
    aiLog.info('aiHealthProbe', 'no proxy candidates; skipping probe');
    aiTelemetry.setHealthz({
      ok: false,
      pingedAt: Date.now(),
      latencyMs: null,
      detail: 'no proxy URL configured',
    });
    return;
  }

  // v10.38 — first, probe the marker so we know definitively whether
  // the Metro middleware is installed. This runs in parallel with the
  // healthz probes below.
  const markerPromise = probeMiddlewareMarker().then((m) => {
    _middlewareLoaded = m.loaded ? 'loaded' : 'not-loaded';
    _middlewareDetail = m.detail;
    aiLog.info(
      'aiHealthProbe.marker',
      m.loaded
        ? `Metro middleware LOADED — ${m.detail}`
        : `Metro middleware NOT LOADED — ${m.detail}`
    );
    return m;
  });

  aiLog.info(
    'aiHealthProbe',
    `probing ${candidates.length} proxy candidate(s) in parallel`,
    { candidates: candidates.map((c) => `${c.source}: ${c.url}`) }
  );

  // 4-second timeout per candidate, all run in parallel so the
  // total wait is <= 4s even when some endpoints are unreachable.
  const [results] = await Promise.all([
    Promise.all(candidates.map((c) => probeCandidate(c.url, c.source, 4_000))),
    markerPromise,
  ]);

  // Log every candidate's result so the diagnostics screen renders
  // a clear picture of which transports are live.
  for (const r of results) {
    aiLog.info(
      'aiHealthProbe.candidate',
      `${r.ok ? 'OK ' : 'FAIL'} [${r.source}] ${r.url} — ${r.detail}`
    );
  }

  // Promote the first OK candidate to active. Order matters: the
  // candidate list is built so the most-preferred URLs come first
  // (override → metro-middleware → direct-port → localhost).
  const winner = results.find((r) => r.ok);
  if (winner) {
    setActiveProxyCandidate({
      url: winner.url,
      source: winner.source as ReturnType<typeof aiGateway.proxyUrlSource>,
    });
    aiTelemetry.setHealthz({
      ok: true,
      pingedAt: Date.now(),
      latencyMs: winner.latencyMs ?? null,
      detail: `live via ${winner.source} — ${winner.detail}`,
    });
    aiLog.info(
      'aiHealthProbe',
      `proxy live via ${winner.source} (${winner.latencyMs}ms)`
    );
    return;
  }

  // Nothing worked. Surface the most informative failure detail —
  // an HTTP-status response is more diagnostic than "network error".
  const ranked = results
    .slice()
    .sort((a, b) => (b.status ?? 0) - (a.status ?? 0));
  const top = ranked[0] ?? results[0];
  aiTelemetry.setHealthz({
    ok: false,
    pingedAt: Date.now(),
    latencyMs: top?.latencyMs ?? null,
    detail: `${candidates.length} URL(s) tried; closest: [${top?.source}] ${top?.detail}`,
  });
  aiLog.warn(
    'aiHealthProbe',
    `proxy unreachable on every candidate (${candidates.length} tried)`
  );
}

/** Exposed for the diagnostics screen / banner so the dev can re-ping. */
export async function rePingProxyHealthz(): Promise<void> {
  _hasProbed = false;
  await probeProxyHealthz();
}
