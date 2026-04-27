/* eslint-disable @typescript-eslint/no-var-requires */
const { getDefaultConfig } = require('expo/metro-config');
const http = require('node:http');

const config = getDefaultConfig(__dirname);

/**
 * v10.34 — AI proxy routed through Metro's dev server.
 *
 * The bug v10.34 fixes: even with the proxy URL auto-derived from
 * Expo's bundle host (v10.33), real-device AI calls still failed with
 * "Network request failed". Reason: most dev machines firewall TCP
 * port 8787 (the proxy's own port) for inbound LAN traffic — the phone
 * could only reach Metro's port 8081 (whitelisted because that's how
 * the JS bundle loads).
 *
 * The fix: Metro's enhanceMiddleware forwards every request whose path
 * starts with `/__pura_ai__/` to the proxy on `127.0.0.1:8787`.
 * The proxy continues to bind to loopback only (no LAN exposure /
 * firewall hassle), and the phone reaches the AI through the same
 * port that already serves the JS bundle.
 *
 * Net effect on the user:
 *   • `npm run dev` is unchanged (proxy + Metro start together).
 *   • The phone hits `http://<bundle-host>:8081/__pura_ai__/<method>`
 *     instead of `http://<bundle-host>:8787/<method>`.
 *   • No firewall changes needed on the dev machine.
 *
 * The forward is a thin reverse proxy: read req body, POST to proxy,
 * stream response back. Stays under 80 lines so this config file
 * remains a thin shim — the proxy itself owns auth, validation,
 * rate-limiting, and Anthropic SDK access.
 */

const PROXY_TARGET_HOST = '127.0.0.1';
const PROXY_TARGET_PORT = Number(process.env.PURA_AI_PROXY_PORT || 8787);
const AI_PATH_PREFIX = '/__pura_ai__/';

function forwardToProxy(req, res) {
  const targetPath = req.url.slice(AI_PATH_PREFIX.length - 1); // keep leading '/'
  const headers = { ...req.headers };
  // Strip hop-by-hop headers that don't make sense to forward.
  delete headers.host;
  delete headers.connection;

  const upstreamReq = http.request(
    {
      host: PROXY_TARGET_HOST,
      port: PROXY_TARGET_PORT,
      method: req.method,
      path: targetPath,
      headers,
    },
    (upstreamRes) => {
      const respHeaders = { ...upstreamRes.headers };
      // Add CORS so a web preview can also consume this if needed.
      respHeaders['access-control-allow-origin'] = '*';
      res.writeHead(upstreamRes.statusCode || 502, respHeaders);
      upstreamRes.pipe(res);
    }
  );

  upstreamReq.on('error', (err) => {
    // Connection refused = proxy isn't running. Surface a clear,
    // actionable JSON body the client can parse + show.
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

  req.pipe(upstreamReq);
}

const baseEnhanceMiddleware = config.server && config.server.enhanceMiddleware;

config.server = config.server || {};
config.server.enhanceMiddleware = (defaultMiddleware, server) => {
  const wrappedDefault = baseEnhanceMiddleware
    ? baseEnhanceMiddleware(defaultMiddleware, server)
    : defaultMiddleware;
  return (req, res, next) => {
    if (req.url && req.url.startsWith(AI_PATH_PREFIX)) {
      forwardToProxy(req, res);
      return;
    }
    return wrappedDefault(req, res, next);
  };
};

module.exports = config;
