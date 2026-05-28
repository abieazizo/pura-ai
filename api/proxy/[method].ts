/**
 * Vercel serverless function — production AI proxy.
 *
 * Mirrors the dispatcher in `server/aiProxy.ts` but as a Vercel
 * Node serverless function so the deployed web build can reach the
 * same AI methods via `<origin>/__pura_ai__/<method>` (Vercel
 * rewrites that public path to `/api/proxy/<method>` per
 * vercel.json — the underlying file is at `api/proxy/[method].ts`).
 *
 * Why the file moved out of `api/__pura_ai__/`: Vercel treats files
 * and folders whose name starts with `_` as PRIVATE and refuses to
 * register them as serverless functions, so the original
 * `api/__pura_ai__/[method].ts` was never deployed. The vercel.json
 * rewrite keeps the public URL identical (`/__pura_ai__/<method>`),
 * so no client change is required.
 *
 * Security model:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ OPENAI_API_KEY              server-only env, never bundled. │
 *   │ Method allowlist            only HANDLERS map keys ever     │
 *   │                              dispatched.                    │
 *   │ HTTP method allowlist       POST + OPTIONS only.            │
 *   │ Body size cap               12 MB. Anything larger 413.     │
 *   │ Per-IP rate limit           60 req/min sliding window.      │
 *   │ Error sanitization          internal stacks never reach the │
 *   │                              client; HandlerError + AIError │
 *   │                              are the only structured types  │
 *   │                              that surface useful detail.    │
 *   │ CORS                        narrow allowlist via env var    │
 *   │                              `PURA_AI_ALLOWED_ORIGINS`      │
 *   │                              (comma-separated). Same-origin │
 *   │                              calls don't need CORS at all,  │
 *   │                              so the production app never    │
 *   │                              triggers it.                   │
 *   │ Bearer token (optional)     `PURA_AI_PROXY_TOKEN`. NOT a    │
 *   │                              security boundary by itself —  │
 *   │                              the matching client token is   │
 *   │                              `EXPO_PUBLIC_PURA_AI_PROXY_…`  │
 *   │                              which is browser-visible. The  │
 *   │                              token only deters trivial      │
 *   │                              scraping; rate limit + method  │
 *   │                              allowlist + per-handler        │
 *   │                              validation are the real        │
 *   │                              guardrails.                    │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Why a single dynamic `[method].ts` file: Vercel routes
 * `/api/proxy/<method>` (for every method) into this handler
 * with `req.query.method = '<method>'`. One file, one cold start to
 * warm up.
 */

import { HANDLERS, HandlerError } from '../../server/lib/handlers';
import { createOpenAIClientFromEnv, AIError } from '../../server/openai/openai-client';

declare const process: { env: Record<string, string | undefined> };

// ---------------------------------------------------------------------------
// Method allowlist — recompute from HANDLERS at startup.
// ---------------------------------------------------------------------------

const ALLOWED_METHODS: ReadonlySet<string> = new Set(Object.keys(HANDLERS));

// ---------------------------------------------------------------------------
// Body size cap — refuse payloads larger than this without parsing them.
// 12 MB matches the local proxy default (face-scan base64 images are
// the largest legit payload, ~3-5 MB).
// ---------------------------------------------------------------------------

const MAX_BODY_BYTES = 12 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Per-IP rate limit. Sliding window, in-memory.
//
// Vercel serverless functions don't share memory between cold starts
// or between instances, so this is best-effort — it stops a single
// hot instance from being hammered. Long-term abuse protection
// requires Vercel's edge rate-limiting product, but this floor is
// enough to block trivial scraping loops.
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 60;
const rateBuckets = new Map<string, number[]>();

function rateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const bucket = rateBuckets.get(ip) ?? [];
  // Drop timestamps outside the window.
  let i = 0;
  while (i < bucket.length && bucket[i] < cutoff) i++;
  const recent = i === 0 ? bucket : bucket.slice(i);
  if (recent.length >= RATE_MAX_PER_WINDOW) {
    const oldest = recent[0];
    return { allowed: false, retryAfter: Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000) };
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return { allowed: true, retryAfter: 0 };
}

function clientIp(headers: VercelReq['headers']): string {
  // Vercel populates x-forwarded-for; fall back to x-real-ip.
  const fwd = headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  const real = headers['x-real-ip'];
  if (typeof real === 'string' && real.length > 0) return real;
  return 'unknown';
}

// ---------------------------------------------------------------------------
// CORS allowlist. Same-origin calls never trigger CORS, so this only
// applies to cross-origin development scenarios. Default is empty (no
// cross-origin allowed). Set `PURA_AI_ALLOWED_ORIGINS` in Vercel env
// (comma-separated) to widen it.
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  (process.env.PURA_AI_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0),
);

function resolveCorsOrigin(reqOrigin: string | undefined): string | null {
  if (!reqOrigin) return null;
  return ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : null;
}

// ---------------------------------------------------------------------------
// Optional bearer token. NOT a security boundary on its own — the
// matching client token is `EXPO_PUBLIC_PURA_AI_PROXY_TOKEN` which is
// shipped in the browser bundle. Use it only if you want to deter
// trivial bots from hitting the route from random scripts; rotate it
// when you rotate clients.
// ---------------------------------------------------------------------------

const TOKEN = (process.env.PURA_AI_PROXY_TOKEN ?? '').trim();

function readBearer(headers: VercelReq['headers']): string {
  const raw = headers['authorization'] ?? headers['Authorization'];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string') return '';
  const m = /^Bearer\s+(.+)$/.exec(v.trim());
  return m ? m[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Lazy OpenAI client so cold starts only pay the cost once.
// ---------------------------------------------------------------------------

let cachedClient: ReturnType<typeof createOpenAIClientFromEnv> | null = null;
function getClient() {
  if (cachedClient) return cachedClient;
  cachedClient = createOpenAIClientFromEnv();
  return cachedClient;
}

// ---------------------------------------------------------------------------
// Loose Vercel Node req/res shapes — we only use the bits we need.
// ---------------------------------------------------------------------------

interface VercelReq {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelRes {
  status(code: number): VercelRes;
  setHeader(name: string, value: string): void;
  json(payload: unknown): void;
  send(payload: string): void;
  end(): void;
}

function methodFromQuery(query: VercelReq['query']): string {
  const v = query.method;
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length > 0) return String(v[0]);
  return '';
}

function approximateBodySize(body: unknown): number {
  // Vercel has typically already parsed JSON for us. Approximating
  // size from the parsed representation is good enough to enforce a
  // cap — the bigger concern is the raw upload, which Vercel itself
  // caps separately (Hobby: 4.5MB; Pro: 50MB body for serverless).
  if (body == null) return 0;
  if (typeof body === 'string') return body.length;
  try {
    return JSON.stringify(body).length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Handler.
// ---------------------------------------------------------------------------

export default async function handler(req: VercelReq, res: VercelRes) {
  // ── CORS (narrow allowlist) ────────────────────────────────────
  const requestOrigin = (() => {
    const o = req.headers['origin'];
    return Array.isArray(o) ? o[0] : o;
  })();
  const requestedHandler = methodFromQuery(req.query);
  const contentLengthHeader = (() => {
    const c = req.headers['content-length'];
    return Array.isArray(c) ? c[0] : c;
  })();
  // [Pura AI Production QA] — safe metadata-only log per request.
  // NEVER logs the API key value, the photo payload, or system prompts.
  // eslint-disable-next-line no-console
  console.log('[Pura AI Production QA] request received', {
    method: req.method,
    handler: requestedHandler,
    origin: requestOrigin ?? null,
    contentLength: contentLengthHeader ?? null,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    allowedOriginsConfigured: ALLOWED_ORIGINS.size,
  });
  const allowed = resolveCorsOrigin(requestOrigin);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Request-Id',
    );
  }

  // ── HTTP method allowlist ──────────────────────────────────────
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ error: 'POST required' });
    return;
  }

  // ── Per-IP rate limit ──────────────────────────────────────────
  const ip = clientIp(req.headers);
  const rl = rateLimit(ip);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  // ── Optional bearer token (non-security metadata) ──────────────
  if (TOKEN.length > 0) {
    const supplied = readBearer(req.headers);
    if (supplied !== TOKEN) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  // ── Method allowlist ───────────────────────────────────────────
  const method = methodFromQuery(req.query);
  if (!ALLOWED_METHODS.has(method)) {
    // [Pura AI Production QA] — record unknown method attempts so a
    // mis-deployed client surfaces visibly in logs.
    // eslint-disable-next-line no-console
    console.log('[Pura AI Production QA] unknown method rejected', {
      method,
      allowedCount: ALLOWED_METHODS.size,
    });
    res.status(404).json({ error: 'Unknown method' });
    return;
  }
  const handlerFn = HANDLERS[method];

  // ── Body parsing + size cap ────────────────────────────────────
  let body: unknown = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_BYTES) {
      // eslint-disable-next-line no-console
      console.log('[Pura AI Production QA] payload too large (string)', {
        method,
        bytes: body.length,
        cap: MAX_BODY_BYTES,
      });
      res.status(413).json({ error: 'Payload too large' });
      return;
    }
    try {
      body = JSON.parse(body);
    } catch {
      // eslint-disable-next-line no-console
      console.log('[Pura AI Production QA] invalid JSON body', { method });
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
  } else if (body && typeof body === 'object') {
    if (approximateBodySize(body) > MAX_BODY_BYTES) {
      // eslint-disable-next-line no-console
      console.log('[Pura AI Production QA] payload too large (object)', {
        method,
        approxBytes: approximateBodySize(body),
        cap: MAX_BODY_BYTES,
      });
      res.status(413).json({ error: 'Payload too large' });
      return;
    }
  }
  if (body === undefined || body === null) body = {};

  // [Pura AI Production QA] — body parsed; only metadata, never content.
  const parsedBody = body as Record<string, unknown>;
  const hasImagePayload =
    typeof parsedBody.imageBase64 === 'string' &&
    (parsedBody.imageBase64 as string).length > 0;
  const imagePayloadApproxBytes = hasImagePayload
    ? (parsedBody.imageBase64 as string).length
    : 0;
  // eslint-disable-next-line no-console
  console.log('[Pura AI Production QA] request parsed', {
    handler: method,
    hasImagePayload,
    imagePayloadApproxBytes,
    topLevelKeys: Object.keys(parsedBody),
  });

  // ── Dispatch ───────────────────────────────────────────────────
  const dispatchStart = Date.now();
  let openAiCompleted = false;
  try {
    const client = getClient();
    const result = await handlerFn(client, parsedBody);
    openAiCompleted = true;
    // eslint-disable-next-line no-console
    console.log('[Pura AI Production QA] openai call status', {
      handler: method,
      started: true,
      completed: openAiCompleted,
      durationMs: Date.now() - dispatchStart,
      topLevelKeysReturned:
        result && typeof result === 'object'
          ? Object.keys(result as Record<string, unknown>)
          : [],
    });
    res.status(200).json(result);
  } catch (err) {
    const safeErrorType =
      err instanceof HandlerError
        ? 'handler_error'
        : err instanceof AIError
          ? 'ai_error'
          : err instanceof Error
            ? err.constructor.name
            : 'unknown';
    // eslint-disable-next-line no-console
    console.log('[Pura AI Production QA] openai call status', {
      handler: method,
      started: true,
      completed: openAiCompleted,
      durationMs: Date.now() - dispatchStart,
      errorType: safeErrorType,
      // err.message is author-curated for HandlerError/AIError; for
      // unknown errors it's still useful for debugging and contains
      // no secrets (the OpenAI client strips key from messages).
      safeErrorMessage:
        err instanceof Error ? err.message.slice(0, 200) : null,
    });
    if (err instanceof HandlerError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof AIError) {
      // [Pura AI Production QA] — schema validation failure category.
      // eslint-disable-next-line no-console
      console.log('[Pura AI Production QA] response validation', {
        handler: method,
        valid: false,
        reason: err.reason,
        schemaName: err.schemaName,
      });
      res.status(502).json({
        error: 'AI response invalid',
        reason: err.reason,
        schemaName: err.schemaName,
      });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[api/proxy]', method, 'internal error:', message);
    res.status(500).json({ error: 'Internal error' });
  }
}

export const config = {
  // Vercel Node runtime — needed for the OpenAI SDK.
  runtime: 'nodejs20.x',
  // Most AI calls finish well under 60s; cap matches the local
  // proxy's hard timeout.
  maxDuration: 90,
};
