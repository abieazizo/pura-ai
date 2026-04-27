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

  aiLog.info(
    'aiHealthProbe',
    `probing ${candidates.length} proxy candidate(s) in parallel`,
    { candidates: candidates.map((c) => `${c.source}: ${c.url}`) }
  );

  // 4-second timeout per candidate, all run in parallel so the
  // total wait is <= 4s even when some endpoints are unreachable.
  const results = await Promise.all(
    candidates.map((c) => probeCandidate(c.url, c.source, 4_000))
  );

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
