/**
 * Pura AI — `/searchProducts` client wrapper (v19.25).
 *
 * Calls the backend-owned live product search endpoint via the
 * SAME proxy URL the AI methods use (Metro middleware in dev,
 * standalone proxy in production). Auth header + bearer token
 * + request-id correlation match `aiGateway.proxyFetch`'s
 * conventions exactly.
 *
 * Why a separate client (instead of adding a method to
 * aiGateway): `searchProducts` is NOT an AI call. It does not
 * use the gateway's AI-specific telemetry, retry-on-AI-error
 * logic, or runStrictStructured envelope. Routing it through a
 * dedicated wrapper keeps the AI gateway clean.
 *
 * Failure modes:
 *   • network failure / non-2xx → throws (caller falls back to
 *     seed catalog)
 *   • timeout (8 s default) → throws
 *   • parse failure → throws
 *
 * The shared engine in `liveProducts.ts` catches and falls back
 * to seed when this wrapper rejects.
 */

import Constants from 'expo-constants';
import { aiLog } from '@/ai/aiLog';
import {
  SEARCH_PRODUCTS_METHOD,
  type SearchProductsRequest,
  type SearchProductsResponse,
} from './searchProductsContract';

// ---------------------------------------------------------------------------
// Proxy URL discovery — mirrors aiGateway's listProxyCandidates.
// ---------------------------------------------------------------------------

function envString(name: string): string {
  return (process.env[name] ?? '').trim();
}

function pickProxyBaseUrl(): string {
  // (1) Explicit override.
  const override = envString('EXPO_PUBLIC_PURA_AI_PROXY_URL').replace(
    /\/+$/,
    ''
  );
  if (override.length > 0 && !/\/\/(localhost|127\.0\.0\.1)\b/.test(override)) {
    return override;
  }

  // (2) Auto-derive from Expo bundle host (Metro middleware path).
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
      return `http://${host}:${metroPort}/__pura_ai__`;
    }
  }

  // (3) Final localhost fallback (simulator / emulator).
  if (override.length > 0) return override;
  return 'http://127.0.0.1:8081/__pura_ai__';
}

const PROXY_TOKEN = envString('EXPO_PUBLIC_PURA_AI_PROXY_TOKEN');

// ---------------------------------------------------------------------------
// Request-id generator (same shape as aiGateway).
// ---------------------------------------------------------------------------

function newRequestId(): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `pura-${t}-${r}`;
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 8_000;

export interface SearchProductsBackendOpts {
  /** Override the bounded timeout (ms). Default 8_000. */
  timeoutMs?: number;
}

/**
 * POST `{baseUrl}/searchProducts` and return the canonical
 * `SearchProductsResponse`. Throws on network / timeout / parse
 * failure — caller falls back to seed catalog.
 */
export async function searchProductsBackend(
  req: SearchProductsRequest,
  opts: SearchProductsBackendOpts = {}
): Promise<SearchProductsResponse> {
  const baseUrl = pickProxyBaseUrl();
  if (baseUrl.length === 0) {
    throw new Error('searchProducts: no proxy base URL configured');
  }
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const requestId = newRequestId();
  const url = `${baseUrl}/${SEARCH_PRODUCTS_METHOD}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
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
      body: JSON.stringify(req),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const detail = timedOut
      ? `client timeout after ${timeoutMs}ms`
      : e instanceof Error
      ? e.message
      : 'network error';
    aiLog.warn('searchProducts', `request failed: ${detail}`, {
      requestId,
      url,
    });
    throw new Error(`searchProducts: ${detail}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === 'string' && body.message.length > 0) {
        message = body.message;
      }
    } catch {
      /* keep statusText */
    }
    aiLog.warn('searchProducts', `HTTP ${res.status}: ${message}`, {
      requestId,
    });
    throw new Error(`searchProducts: HTTP ${res.status}: ${message}`);
  }

  const body = (await res.json()) as SearchProductsResponse;
  // Light shape validation — the server is trusted but a
  // mis-routed response would corrupt downstream logic.
  if (
    !body ||
    typeof body !== 'object' ||
    typeof body.query !== 'string' ||
    !Array.isArray(body.candidates)
  ) {
    throw new Error('searchProducts: malformed response');
  }
  return body;
}
