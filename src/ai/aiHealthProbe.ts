/**
 * Startup AI proxy health probe.
 *
 * v10.28 — when the gateway has a proxy URL configured, fire one
 * `GET /healthz` at app boot and record the result on
 * `aiTelemetry.healthz`. The Home banner and the diagnostics screen
 * read from this so a developer can immediately see whether the
 * configured proxy is actually reachable, without having to scan or
 * send an assistant message first.
 *
 * Design rules:
 *   • Fire-and-forget: the probe never blocks app boot.
 *   • Bounded by a 4-second AbortController timeout so a hung proxy
 *     can't keep the probe pending forever.
 *   • No retries — if the first ping fails, the user can re-trigger
 *     it from the diagnostics screen.
 *   • Skips entirely when the gateway transport is `'none'`. In that
 *     case the diagnostic banner reads off `aiGateway.isAvailable()`
 *     instead.
 */

import { aiGateway } from './aiGateway';
import { aiLog } from './aiLog';
import { aiTelemetry } from './aiTelemetry';

let _hasProbed = false;

export async function probeProxyHealthz(): Promise<void> {
  if (_hasProbed) return;
  _hasProbed = true;

  const proxyUrl = (process.env.EXPO_PUBLIC_PURA_AI_PROXY_URL ?? '')
    .trim()
    .replace(/\/+$/, '');

  if (proxyUrl.length === 0 || !aiGateway.isAvailable()) {
    aiLog.info('aiHealthProbe', 'no proxy configured; skipping /healthz probe');
    aiTelemetry.setHealthz({
      ok: false,
      pingedAt: Date.now(),
      latencyMs: null,
      detail: 'EXPO_PUBLIC_PURA_AI_PROXY_URL is not set',
    });
    return;
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);
    const res = await fetch(`${proxyUrl}/healthz`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const ok = res.ok && body.ok === true;
    aiTelemetry.setHealthz({
      ok,
      pingedAt: Date.now(),
      latencyMs,
      detail: ok
        ? `transport=${body.transport ?? 'unknown'}`
        : `HTTP ${res.status} ${res.statusText}`,
    });
    if (ok) {
      aiLog.info('aiHealthProbe', `proxy healthy in ${latencyMs}ms`);
    } else {
      aiLog.warn('aiHealthProbe', `proxy responded but unhealthy: HTTP ${res.status}`);
    }
  } catch (e) {
    aiTelemetry.setHealthz({
      ok: false,
      pingedAt: Date.now(),
      latencyMs: null,
      detail: e instanceof Error ? e.message : 'network error',
    });
    aiLog.warn(
      'aiHealthProbe',
      'proxy unreachable',
      e instanceof Error ? { error: e.message } : undefined
    );
  }
}

/** Exposed for the diagnostics screen / banner so the dev can re-ping. */
export async function rePingProxyHealthz(): Promise<void> {
  _hasProbed = false;
  await probeProxyHealthz();
}
