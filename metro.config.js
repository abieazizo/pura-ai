/* eslint-disable @typescript-eslint/no-var-requires */
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('node:fs');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

/**
 * v10.39 — IN-PROCESS AI HANDLERS.
 *
 * The previous architectures all had the same fragility: the phone
 * had to reach a SECOND server beyond Metro (a separate proxy on
 * port 8787, or Metro itself acting as a forwarding middleware).
 * That depended on either firewall configuration OR a fully-loaded
 * metro.config.js, both of which kept failing in real-world dev
 * environments.
 *
 * v10.39 collapses the architecture to ONE process: Metro itself
 * answers AI calls. When a request to `/__pura_ai__/<method>` lands
 * on Metro's HTTP server, this middleware loads the same handlers
 * that `server/lib/handlers.ts` uses, calls them in-process, and
 * writes the response directly. The OpenAI SDK runs inside
 * Metro's Node process. The phone only ever reaches Metro on its
 * already-firewall-allowed port (8081).
 *
 * Net effect on the user
 *   • `npm start` is now sufficient — no `npm run dev` required.
 *   • No port 8787 firewall issue — there's no second server.
 *   • No proxy process management — ANTHROPIC_API_KEY is loaded
 *     here directly from .env.
 *   • The standalone proxy at `server/aiProxy.ts` still exists for
 *     end-to-end testing scripts (`npm run verify:ai`) but is no
 *     longer on the phone's request path.
 */

// ---------------------------------------------------------------------------
// .env loader.
//
// EXPO_PUBLIC_* vars are inlined into the bundle by Expo's CLI.
// Server-side vars like ANTHROPIC_API_KEY aren't loaded automatically
// when running `npm start`, so we read .env manually here. This runs
// in the Metro/Node process, NOT in the bundle that ships to the
// phone — the API key never leaves the dev machine.
// ---------------------------------------------------------------------------

function loadEnvFromFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  // Strip a UTF-8 BOM if present (Windows editors sometimes add one).
  let raw = fs.readFileSync(envPath, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // EXPLICIT OVERRIDE: .env wins over whatever the shell exported,
    // matching what `tsx --env-file=.env` does for the standalone
    // proxy. Without this, a stale shell var would silently take
    // priority and cause "401 invalid api key" with no clear cause.
    process.env[key] = value;
  }
}

loadEnvFromFile();

// ---------------------------------------------------------------------------
// TS loader for the in-process handlers.
//
// metro.config.js is plain JS, but server/lib/handlers.ts is
// TypeScript. tsx/cjs registers a require()-time TS transformer so
// we can `require()` TS files directly. Lazy — we only load on the
// first AI request so a dev who never makes one pays no startup
// cost.
// ---------------------------------------------------------------------------

let _handlersBundle = null;

function loadHandlersBundle() {
  if (_handlersBundle) return _handlersBundle;
  // eslint-disable-next-line no-console
  console.log('[pura-ai] loading in-process handlers (first AI request)...');
  // tsx/cjs is a runtime TypeScript loader; the project already has
  // it as a dev dep (used by the `npm run server:ai` script).
  require('tsx/cjs');
  const startedAt = Date.now();
  const handlersMod = require('./server/lib/handlers');
  const clientMod = require('./server/openai/openai-client');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      'OPENAI_API_KEY is missing in .env. Add OPENAI_API_KEY=sk-... ' +
        'to .env at the project root and restart Metro.'
    );
  }
  const client = new clientMod.OpenAIClient({ apiKey });
  _handlersBundle = {
    HANDLERS: handlersMod.HANDLERS,
    HandlerError: handlersMod.HandlerError,
    client,
    startedAt: Date.now(),
  };
  // eslint-disable-next-line no-console
  console.log(
    `[pura-ai] in-process handlers loaded in ${Date.now() - startedAt}ms`
  );
  return _handlersBundle;
}

// ---------------------------------------------------------------------------
// HTTP request body reader.
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const MAX = 24 * 1024 * 1024; // 24MB — generous for face-scan images
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX) {
        req.destroy();
        reject(new Error('request body too large (>24MB)'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function writeJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(text);
}

// ---------------------------------------------------------------------------
// Per-request handler.
// ---------------------------------------------------------------------------

const PROCESS_STARTED_AT = Date.now();
const AI_PATH_PREFIX = '/__pura_ai__/';
const MARKER_VERSION = 'v10.39';

async function handleAi(req, res) {
  const fullPath = req.url.split('?')[0];
  const method = fullPath.slice(AI_PATH_PREFIX.length);

  // ---- /healthz: must work even if the handlers haven't loaded
  // yet, so the diagnostics screen returns reachable at boot.
  if (method === 'healthz') {
    writeJson(res, 200, {
      ok: true,
      transport: 'in-process',
      uptime_s: Math.round((Date.now() - PROCESS_STARTED_AT) / 1000),
      handlers_loaded: !!_handlersBundle,
      version: MARKER_VERSION,
    });
    return;
  }

  // ---- Marker endpoint — the v10.38 diagnostic uses this to
  // confirm the middleware is actually running.
  if (method === '_metro_marker') {
    writeJson(res, 200, {
      middleware_alive: true,
      version: MARKER_VERSION,
      mode: 'in-process',
      proxy_target: 'in-process (OpenAI SDK loaded inside Metro)',
      time: Date.now(),
    });
    return;
  }

  // ---- Real AI request. Read body, dispatch to handler.
  let body;
  try {
    const buf = await readBody(req);
    body = buf.length > 0 ? JSON.parse(buf.toString('utf8')) : {};
  } catch (e) {
    writeJson(res, 400, {
      message: 'invalid request body: ' + e.message,
    });
    return;
  }

  let bundle;
  try {
    bundle = loadHandlersBundle();
  } catch (e) {
    writeJson(res, 500, {
      message: 'handler load failed: ' + e.message,
    });
    return;
  }

  const handler = bundle.HANDLERS[method];
  if (!handler) {
    writeJson(res, 404, {
      message: `unknown AI method: ${method}`,
    });
    return;
  }

  try {
    const result = await handler(bundle.client, body);
    writeJson(res, 200, result);
  } catch (e) {
    if (e && e.name === 'HandlerError' && typeof e.status === 'number') {
      writeJson(res, e.status, { message: e.message });
      return;
    }
    // eslint-disable-next-line no-console
    console.error(`[pura-ai] handler ${method} threw`, e);
    writeJson(res, 500, {
      message: e instanceof Error ? e.message : 'internal error',
    });
  }
}

// ---------------------------------------------------------------------------
// Wire into Metro's middleware chain.
// ---------------------------------------------------------------------------

const baseEnhanceMiddleware =
  config.server && config.server.enhanceMiddleware;

config.server = config.server || {};
config.server.enhanceMiddleware = (defaultMiddleware, server) => {
  const wrapped = baseEnhanceMiddleware
    ? baseEnhanceMiddleware(defaultMiddleware, server)
    : defaultMiddleware;
  return (req, res, next) => {
    if (req.url && req.url.startsWith(AI_PATH_PREFIX)) {
      // eslint-disable-next-line no-console
      console.log(`[pura-ai] in-process ${req.method} ${req.url}`);
      handleAi(req, res).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[pura-ai] middleware error', e);
        if (!res.headersSent) {
          writeJson(res, 500, {
            message: 'middleware error: ' + (e && e.message),
          });
        }
      });
      return;
    }
    return wrapped(req, res, next);
  };
};

module.exports = config;
