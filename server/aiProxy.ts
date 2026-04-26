/**
 * Pura AI — production proxy server.
 *
 * Receives JSON from the RN client, calls the centralized
 * ClaudeClient with a server-held API key, validates the structured
 * output, and returns it. The client-side gateway (see
 * `src/ai/aiGateway.ts`) targets this server in proxy mode.
 *
 * Run:
 *   npm run server:ai
 *
 * Required env:
 *   ANTHROPIC_API_KEY            — Anthropic API key (held server-side)
 *
 * Optional env:
 *   PURA_AI_PROXY_PORT           — listen port (default 8787)
 *   PURA_AI_PROXY_HOST           — bind host (default 127.0.0.1)
 *   PURA_AI_PROXY_TOKEN          — required bearer token; if set,
 *                                  every request must include
 *                                  `Authorization: Bearer <token>`
 *                                  matching this value
 *   PURA_AI_PROXY_RATE_PER_MIN   — per-IP requests/minute, default 60
 *   PURA_AI_PROXY_BODY_LIMIT_MB  — max JSON body size, default 12
 *
 * Endpoints (all POST, JSON in/JSON out, see lib/handlers.ts):
 *   /analyzeFaceScan
 *   /identifyProductFromImage
 *   /normalizeBarcodeResolution
 *   /matchProductsForUser
 *   /generateRoutineRecommendation
 *   /explainSkinScore
 *   /explainProgress
 *   /buildSearchSuggestions
 *   /answerAssistant
 *   /analyzeScannedProductAgainstUser
 *   /buildFullScanToPlanBundle
 *   /buildProgressBundle
 *
 *   GET /healthz   -> { ok: true, transport: 'proxy' }
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { URL } from 'node:url';

// ---------------------------------------------------------------------------
// .env loader — runs BEFORE any module that reads process.env.
//
// Node's `--env-file` flag does NOT override variables that are
// already set in the parent shell. So an empty `ANTHROPIC_API_KEY=""`
// inherited from a parent process beats the value we wrote to `.env`,
// silently. This loader explicitly overrides whatever was in the
// shell with whatever the local `.env` has, which is the right
// behaviour for a "the .env file is the source of truth for this
// machine" workflow.
//
// No new npm dep required: KEY=VALUE lines, blank lines, and `# ...`
// comments are the only syntax we need.
// ---------------------------------------------------------------------------

(function loadDotenvWithOverride() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  let raw: string;
  try {
    raw = fs.readFileSync(envPath, 'utf8');
  } catch {
    return;
  }
  // Strip BOM if present.
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if any.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
})();

import {
  createClaudeClientFromEnv,
  type ClaudeClient,
} from './anthropic/claude-client';
import { aiLog } from '../src/ai/aiLog';
import { HandlerError, HANDLERS } from './lib/handlers';

// ---------------------------------------------------------------------------
// Config from env.
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PURA_AI_PROXY_PORT ?? 8787);
const HOST = process.env.PURA_AI_PROXY_HOST ?? '127.0.0.1';
const TOKEN = (process.env.PURA_AI_PROXY_TOKEN ?? '').trim();
const RATE_PER_MIN = Number(process.env.PURA_AI_PROXY_RATE_PER_MIN ?? 60);
const BODY_LIMIT_BYTES =
  Number(process.env.PURA_AI_PROXY_BODY_LIMIT_MB ?? 12) * 1024 * 1024;

// ---------------------------------------------------------------------------
// Per-IP rate limiter. Token-bucket-ish: each IP gets RATE_PER_MIN
// tokens that refill linearly each second.
// ---------------------------------------------------------------------------

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}
const buckets: Map<string, Bucket> = new Map();

function consumeRateToken(ip: string): boolean {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: RATE_PER_MIN, lastRefillMs: now };
    buckets.set(ip, bucket);
  }
  // Refill since last call.
  const elapsedMs = now - bucket.lastRefillMs;
  const refill = (elapsedMs / 60_000) * RATE_PER_MIN;
  bucket.tokens = Math.min(RATE_PER_MIN, bucket.tokens + refill);
  bucket.lastRefillMs = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

// Periodically prune cold buckets so memory doesn't grow unbounded.
{
  const handle = setInterval(() => {
    const cutoff = Date.now() - 5 * 60_000;
    for (const [ip, bucket] of buckets.entries()) {
      if (bucket.lastRefillMs < cutoff) buckets.delete(ip);
    }
  }, 60_000);
  // Node's setInterval returns a Timeout with `.unref()`; the DOM
  // typing returns a number. Cast to access the Node method.
  (handle as unknown as { unref?: () => void }).unref?.();
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function clientIp(req: http.IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function requestIdOf(req: http.IncomingMessage): string {
  const header = req.headers['x-request-id'];
  if (typeof header === 'string' && header.length > 0) return header;
  return `proxy-${Date.now().toString(36)}-${Math.floor(
    Math.random() * 0xffffff
  )
    .toString(16)
    .padStart(6, '0')}`;
}

function writeJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
  requestId: string
): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'x-request-id': requestId,
  });
  res.end(text);
}

function writeError(
  res: http.ServerResponse,
  status: number,
  message: string,
  requestId: string
): void {
  writeJson(res, status, { message }, requestId);
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > BODY_LIMIT_BYTES) {
        req.destroy();
        reject(new HandlerError(413, 'request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', (e) => reject(e));
  });
}

// ---------------------------------------------------------------------------
// Main handler.
// ---------------------------------------------------------------------------

let _client: ClaudeClient | null = null;
function getClient(): ClaudeClient {
  if (!_client) _client = createClaudeClientFromEnv();
  return _client;
}

async function dispatch(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const requestId = requestIdOf(req);
  const start = Date.now();
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  // CORS preflight — accept everywhere; the auth header check is the
  // real gate.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-request-id',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // Health check — open, no auth.
  if (req.method === 'GET' && url.pathname === '/healthz') {
    writeJson(
      res,
      200,
      { ok: true, transport: 'proxy', uptime_s: Math.round(process.uptime()) },
      requestId
    );
    return;
  }

  // All other routes are POST under the AI prefix.
  if (req.method !== 'POST') {
    writeError(res, 405, 'method not allowed', requestId);
    return;
  }

  // Auth.
  if (TOKEN.length > 0) {
    const auth = req.headers['authorization'];
    if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
      aiLog.warn('proxy.auth', 'missing or malformed Authorization header', {
        requestId,
      });
      writeError(res, 401, 'unauthorized', requestId);
      return;
    }
    const provided = auth.slice('Bearer '.length).trim();
    if (provided !== TOKEN) {
      aiLog.warn('proxy.auth', 'token mismatch', { requestId });
      writeError(res, 401, 'unauthorized', requestId);
      return;
    }
  }

  // Rate limit.
  const ip = clientIp(req);
  if (!consumeRateToken(ip)) {
    aiLog.warn('proxy.rate', `rate limit exceeded for ${ip}`, { requestId });
    writeError(res, 429, 'rate limit exceeded', requestId);
    return;
  }

  // Method dispatch.
  const method = url.pathname.replace(/^\//, '');
  const handler = HANDLERS[method];
  if (!handler) {
    writeError(res, 404, `unknown method: ${method}`, requestId);
    return;
  }

  // Read + parse body.
  let body: Record<string, unknown>;
  try {
    const text = await readBody(req);
    if (text.length === 0) {
      body = {};
    } else {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        writeError(res, 400, 'body must be a JSON object', requestId);
        return;
      }
      body = parsed as Record<string, unknown>;
    }
  } catch (e) {
    if (e instanceof HandlerError) {
      writeError(res, e.status, e.message, requestId);
      return;
    }
    writeError(
      res,
      400,
      `invalid JSON body: ${e instanceof Error ? e.message : 'parse error'}`,
      requestId
    );
    return;
  }

  // Run handler.
  aiLog.info('proxy.dispatch', `${method} start`, { requestId, ip });
  try {
    const client = getClient();
    const result = await handler(client, body);
    aiLog.info('proxy.dispatch', `${method} ok`, {
      requestId,
      durationMs: Date.now() - start,
    });
    writeJson(res, 200, result, requestId);
  } catch (e) {
    if (e instanceof HandlerError) {
      aiLog.warn('proxy.dispatch', `${method} -> ${e.status}: ${e.message}`, {
        requestId,
        durationMs: Date.now() - start,
      });
      writeError(res, e.status, e.message, requestId);
      return;
    }
    aiLog.error('proxy.dispatch', `${method} unexpected failure`, {
      requestId,
      durationMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    });
    writeError(
      res,
      502,
      e instanceof Error ? e.message : 'upstream failure',
      requestId
    );
  }
}

// ---------------------------------------------------------------------------
// Boot.
// ---------------------------------------------------------------------------

function main(): void {
  // Fail fast if the API key is missing — better here than on the
  // first request.
  try {
    createClaudeClientFromEnv();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      `[pura-ai-proxy] cannot start: ${e instanceof Error ? e.message : String(e)}`
    );
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    void dispatch(req, res).catch((e) => {
      aiLog.error('proxy.fatal', 'unhandled dispatch error', {
        error: e instanceof Error ? e.message : String(e),
      });
      try {
        if (!res.headersSent) {
          writeError(res, 500, 'internal error', requestIdOf(req));
        } else {
          res.end();
        }
      } catch {
        /* swallow */
      }
    });
  });

  server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[pura-ai-proxy] listening on http://${HOST}:${PORT} ` +
        `(token=${TOKEN.length > 0 ? 'on' : 'off'}, rate=${RATE_PER_MIN}/min, ` +
        `bodyLimit=${(BODY_LIMIT_BYTES / 1024 / 1024).toFixed(1)}MB)`
    );
  });

  const shutdown = () => {
    // eslint-disable-next-line no-console
    console.log('[pura-ai-proxy] shutting down');
    server.close(() => process.exit(0));
    // Force exit if close hangs.
    const t = setTimeout(() => process.exit(0), 5_000);
    (t as unknown as { unref?: () => void }).unref?.();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
