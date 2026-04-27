/* eslint-disable @typescript-eslint/no-var-requires */
const { getDefaultConfig } = require('expo/metro-config');
const http = require('node:http');

const config = getDefaultConfig(__dirname);

/**
 * v10.35 — AI proxy routed through Metro's dev server (hardened).
 *
 * History
 *   • v10.34 added an `enhanceMiddleware` that intercepted
 *     `/__pura_ai__/*` requests and reverse-proxied them to the
 *     proxy on `127.0.0.1:8787`. That eliminated the port-firewall
 *     issue on 8787 — phones reach Metro on 8081 (already
 *     whitelisted because the JS bundle loads through it), Metro
 *     forwards to the loopback proxy.
 *   • v10.35 fixes two regressions seen in production:
 *       1. Some Expo middleware ahead of ours buffers/consumes the
 *          POST body before our handler runs, so `req.pipe(upstreamReq)`
 *          forwarded an empty body — proxy returned 400 "missing
 *          imageBase64", client logged it as a validation failure.
 *          Fix: read the entire request body into a buffer FIRST,
 *          then send it with an explicit Content-Length to the
 *          proxy. No piping race.
 *       2. Default Connection: keep-alive caused the response to
 *          hang on some Node versions when the upstream sets
 *          `Content-Length` and the middleware's pipe doesn't
 *          terminate cleanly. Fix: explicitly request close on the
 *          upstream connection.
 *
 * Net effect on the user
 *   • `npm run dev` is unchanged.
 *   • Phone hits `http://<bundle-host>:8081/__pura_ai__/<method>`.
 *   • Middleware buffers the body, re-sends it with proper Content-
 *     Length, streams the response back without piping mid-flight.
 */

const PROXY_TARGET_HOST = '127.0.0.1';
const PROXY_TARGET_PORT = Number(process.env.PURA_AI_PROXY_PORT || 8787);
const AI_PATH_PREFIX = '/__pura_ai__/';

/**
 * v10.38 — middleware-loaded marker.
 *
 * The marker URL returns an unmistakable JSON response that ONLY
 * this middleware can produce. The client probes for it on boot;
 * if it comes back, the middleware is definitively loaded. If it
 * doesn't (or returns something else), the diagnostic banner
 * instructs the user to fully restart Metro.
 *
 * This is the crucial bit the v10.34-v10.37 iterations were missing:
 * we could only see "the proxy is unreachable" in aggregate. With
 * the marker we can split that into "the middleware is loaded but
 * the proxy is dead" vs "the middleware itself isn't loaded".
 */
const MARKER_PATH = '/__pura_ai__/_metro_marker';
const MARKER_VERSION = 'v10.38';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const MAX = 24 * 1024 * 1024; // 24MB, generous for image uploads
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX) {
        req.destroy();
        reject(new Error('request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (e) => reject(e));
  });
}

async function forwardToProxy(req, res) {
  const targetPath = req.url.slice(AI_PATH_PREFIX.length - 1); // keep leading '/'

  // 1. Buffer the request body. If something upstream already
  //    consumed the body, this resolves to an empty Buffer and we
  //    forward an empty body (the proxy will then 400 with a clear
  //    field-missing message — better than silent failure).
  let bodyBuf;
  try {
    bodyBuf = await readBody(req);
  } catch (e) {
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'request body too large' }));
    return;
  }

  // 2. Build the headers to send upstream. Strip hop-by-hop and
  //    length headers that we'll rewrite from the buffer length.
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];
  delete headers['transfer-encoding'];
  if (bodyBuf.length > 0) {
    headers['content-length'] = String(bodyBuf.length);
  }

  // 3. Issue the upstream request and pipe the response back.
  const upstreamReq = http.request(
    {
      host: PROXY_TARGET_HOST,
      port: PROXY_TARGET_PORT,
      method: req.method,
      path: targetPath,
      headers,
      timeout: 120_000,
    },
    (upstreamRes) => {
      const respHeaders = { ...upstreamRes.headers };
      respHeaders['access-control-allow-origin'] = '*';
      // Drop content-length if upstream uses chunked; let pipe
      // handle the streaming.
      if (
        respHeaders['transfer-encoding'] &&
        String(respHeaders['transfer-encoding']).toLowerCase().includes('chunked')
      ) {
        delete respHeaders['content-length'];
      }
      res.writeHead(upstreamRes.statusCode || 502, respHeaders);
      upstreamRes.pipe(res);
    }
  );

  upstreamReq.on('timeout', () => {
    upstreamReq.destroy(new Error('upstream timeout'));
  });

  upstreamReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(
      JSON.stringify({
        message:
          'Pura AI proxy is unreachable on the dev machine. Run `npm run dev` (NOT `npm start`) — that starts the proxy and Expo together. Underlying error: ' +
          err.message,
      })
    );
  });

  // 4. Send the buffered body and end the request.
  if (bodyBuf.length > 0) upstreamReq.write(bodyBuf);
  upstreamReq.end();
}

const baseEnhanceMiddleware =
  config.server && config.server.enhanceMiddleware;

config.server = config.server || {};
config.server.enhanceMiddleware = (defaultMiddleware, server) => {
  const wrappedDefault = baseEnhanceMiddleware
    ? baseEnhanceMiddleware(defaultMiddleware, server)
    : defaultMiddleware;
  return (req, res, next) => {
    // v10.38 — marker endpoint. Returns a fixed JSON shape ONLY this
    // middleware can produce, so the client can definitively tell
    // whether Metro was started with the new metro.config.js.
    if (req.url && req.url.startsWith(MARKER_PATH)) {
      // eslint-disable-next-line no-console
      console.log(`[pura-ai-middleware] marker ping ${req.url}`);
      const body = JSON.stringify({
        middleware_alive: true,
        version: MARKER_VERSION,
        proxy_target: `http://${PROXY_TARGET_HOST}:${PROXY_TARGET_PORT}`,
        time: Date.now(),
      });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Access-Control-Allow-Origin': '*',
      });
      res.end(body);
      return;
    }
    if (req.url && req.url.startsWith(AI_PATH_PREFIX)) {
      // eslint-disable-next-line no-console
      console.log(`[pura-ai-middleware] ${req.method} ${req.url}`);
      forwardToProxy(req, res).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[pura-ai-middleware] forward failed', e);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'middleware error: ' + e.message }));
        }
      });
      return;
    }
    return wrappedDefault(req, res, next);
  };
};

module.exports = config;
