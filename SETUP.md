# Pura AI — local setup

## v11.6 — IMPORTANT: this app now requires a custom dev build

As of v11.6 the scan flow uses **real on-device face detection** via
`react-native-vision-camera` + `vision-camera-face-detector`. Those
are native modules that **do not exist in Expo Go**. You need to
produce a custom dev build once:

```bash
npm install
npx expo prebuild --clean
npx expo run:ios     # or `run:android` on Windows / Linux
```

After that first build, day-to-day dev uses:

```bash
npx expo run:ios     # rebuild + launch
# or
npx expo start --dev-client   # skip rebuild, attach to last build
```

**Expo Go fallback**: if you don't run `prebuild` and you launch in
Expo Go, the scan screen detects the missing native modules at
runtime (`useFaceDetection.ts::nativeFaceDetectionAvailable === false`)
and falls back to the legacy `expo-camera` path with manual capture
+ post-capture condition-aware failure (no live face guidance). The
app still runs end-to-end, but the real-time guidance only lights up
in the dev build. This fallback exists so a teammate browsing the
repo can still launch it.

To get the **real AI path live** (assistant + scan + matching +
progress + suggestions all backed by OpenAI / `gpt-5-mini` + `gpt-5`)
you also need:

1. an OpenAI API key in `.env` (the `OPENAI_API_KEY` line)
2. one terminal running **`npm start`** for local dev

## v11.0+ transport modes (one source of truth)

The client gateway is HTTP fetch-only and provider-agnostic. There are
two transport modes the proxy URL can resolve to. Both are supported,
with **different deployment intents**:

| mode | path | when to use | files |
|---|---|---|---|
| **In-process (DEV ONLY)** | Phone → Metro `http://<bundle-host>:8081/__pura_ai__/*` → OpenAI SDK loaded into Metro's Node process | Local dev. `npm start` is sufficient. No second server, no port 8787, no firewall change. | `metro.config.js` |
| **Standalone proxy (PRODUCTION)** | Phone → `https://your-deployed-proxy.example.com/*` → OpenAI | Production deployment. Real HTTPS, behind your own infra (Cloudflare / nginx / Railway / Fly etc). | `server/aiProxy.ts` |

For **local dev**: just `npm start`. Metro answers AI calls directly.

For **production**: deploy `server/aiProxy.ts` somewhere with HTTPS,
set `OPENAI_API_KEY` and `PURA_AI_PROXY_TOKEN` as server env vars,
and set `EXPO_PUBLIC_PURA_AI_PROXY_URL` + `EXPO_PUBLIC_PURA_AI_PROXY_TOKEN`
in the client env to point at it. The standalone proxy carries the
full hardening surface — bearer-token auth, per-IP rate limit, body
size cap, request-id propagation, structured logging, CORS preflight,
graceful shutdown — and is what you actually ship.

The verification script (`npm run verify:ai`) targets whichever URL
`EXPO_PUBLIC_PURA_AI_PROXY_URL` resolves to, so you can prove either
path works against a real OpenAI key end-to-end before shipping.

> v10.34 — the 8 catalog products with real photography are now
> **bundled locally** as `require()`'d assets in `assets/products/`.
> The cards never hit the network for those images, so they paint
> on first frame regardless of the phone's outbound network policy.
> The remaining 16 products render the upgraded `ProductPlaceholderImage`.

If a screen says "AI didn't respond just now, so this answer is a
demo fallback…", check the floating AI badge in the top-right (it
shows `AI` when live, `FALLBACK` when not), tap it for diagnostics —
the diagnostics screen prints the exact proxy URL the client is
trying and pings `/healthz` automatically.

---

## 1. Install dependencies

```bash
npm install
```

This installs both client and server dependencies (`openai`
is in the same `package.json` but is **only** loaded by the server —
the React Native bundle never sees it).

---

## 2. Configure environment

Copy the template:

```bash
cp .env.example .env
```

Open `.env` and fill in:

```dotenv
# Server-only — never expose this to the client.
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXX

# Client. Default works for `npm run dev` on the same machine.
EXPO_PUBLIC_PURA_AI_PROXY_URL=http://localhost:8787
EXPO_PUBLIC_PURA_AI_PROXY_TOKEN=   # leave blank for local dev
```

**Critical security rule:** `OPENAI_API_KEY` must NOT be prefixed
with `EXPO_PUBLIC_`. The `EXPO_PUBLIC_` prefix is the Expo babel
plugin's signal to inline a value into the React Native JavaScript
bundle. A key inlined into the bundle can be extracted from any
shipped build and used until rate-limited or revoked. **Keep the
prefix off the API key.** The proxy server (or Metro middleware in
local dev) reads `OPENAI_API_KEY` directly from `process.env` at
boot. There is exactly one place the key is read; nothing under
`src/` ever sees it.

---

## 3. Start everything

One command boots the proxy and Expo together:

```bash
npm run dev
```

You'll see two log streams:

```
[PROXY] [pura-ai-proxy] listening on http://127.0.0.1:8787 ...
[EXPO]  Metro waiting on exp://...
```

Or boot them separately if you prefer:

```bash
# terminal 1
npm run server:ai

# terminal 2
npm start
```

---

## 4. Verify live AI is actually working

There are three ways to confirm the live path is alive end-to-end.

### A. `/healthz` from the host

```bash
curl http://localhost:8787/healthz
# {"ok":true,"transport":"proxy","uptime_s":12}
```

If `ok` is `false`, the server failed to start. Check `ANTHROPIC_API_KEY`.

### B. The verification script

```bash
EXPO_PUBLIC_PURA_AI_PROXY_URL=http://localhost:8787 npm run verify:ai
```

This exercises every public AI flow against the running proxy:
first scan, repeat scan, product image scan, barcode lookup, matching,
routine recommendation, score + progress explanation, grounded
assistant answer, search suggestions. Each line either ends in `PASS`
or `FAIL`; the process exits non-zero on any failure for CI.

### C. The in-app dev banner + diagnostics

If you want a visual confirmation inside the app:

```bash
EXPO_PUBLIC_PURA_AI_DEV_BADGE=1 npm run dev
```

This turns on:

- a small AI/FALLBACK pill on the AI-driven screens (Scan Result,
  Products, Routine, Assistant)
- a Home-screen banner when the proxy is unconfigured or unreachable
- the in-app diagnostics screen (tap any pill or banner)

The diagnostics screen shows transport mode, `/healthz` ping with
latency, per-feature surface state, per-method last call (status,
duration, request id), recent log buffer, and a one-tap smoke test
that fires two cheap text-only AI calls and reports pass/fail.

The dev badge is **off by default** — the user-facing app should
never show it. Only opt in when actively diagnosing.

---

## 5. Verify the assistant is answering for real

1. Boot with `npm run dev`.
2. Open the AI Assist tab.
3. Type "What should I do tonight?" and send.

If the AI path is alive, the answer will:

- be specific to your latest scan + routine + matches
- end with a `Grounded in: latest scan · routine · …` line under the
  bubble (this attribution is only stamped on AI-derived replies, so
  its presence is a strong signal the AI ran)

If the AI path **isn't** alive, the answer starts with one of:

> Live AI isn't connected on this device — this answer is a demo
> response, not a personalised AI reply…

> AI didn't respond just now, so this answer is a demo fallback
> rather than a live read of your skin data…

The banner is unmissable. If you ever see it, the answer below is
**not** a real Claude reply.

---

## 6. Verify scan is running live

1. From any tab, tap the SCAN tab and complete a scan with the
   on-screen choreography.
2. The result screen should show the dial + findings.

If the AI ran, you'll see:

- the AI's structured **TONIGHT** numbered list and (when the model
  chose to surface them) **AVOID** items
- an **IMAGE QUALITY** amber banner only if the model flagged your
  photo as low-confidence

If the deterministic fallback ran, you'll see a clearly-labelled
**DEMO READING** banner at the top of the result screen explaining
that the findings are a demo response, not a real read of your photo.

---

## 7. Network notes — phone testing

`localhost` works in web preview and on iOS / Android simulators that
share a localhost with the dev machine. For **Expo Go on a real
phone over the same Wi-Fi**, the phone's `localhost` is the phone
itself, so you have to point the client at the dev machine's LAN IP.

v10.30 onward, the proxy:
- **Defaults to binding `0.0.0.0`** (every interface), so it's
  reachable from the LAN out of the box. You no longer have to set
  `PURA_AI_PROXY_HOST=0.0.0.0` manually.
- **Prints every reachable URL** on boot so you can see exactly
  which one to put in `.env`. Sample output:

  ```
  [pura-ai-proxy] listening on http://0.0.0.0:8787 ...
  [pura-ai-proxy] reachable at:
                    http://localhost:8787
                    http://192.168.1.42:8787
  [pura-ai-proxy] for a phone on the same Wi-Fi, set:
                    EXPO_PUBLIC_PURA_AI_PROXY_URL=http://192.168.1.42:8787
  ```

For convenience, a one-shot helper prints the same recommendation
without booting the proxy:

```bash
npm run lanip
```

Output:

```
LAN IP: 192.168.1.42  (interface: en0)
For phone testing, set in .env:
  EXPO_PUBLIC_PURA_AI_PROXY_URL=http://192.168.1.42:8787
```

If you're on multiple networks (e.g. Wi-Fi + Docker bridge), the
helper lists all candidates so you can pick the one matching your
phone's network.

To restrict the proxy to loopback only (e.g. CI):

```bash
PURA_AI_PROXY_HOST=127.0.0.1 npm run server:ai
```

For deployed environments, the proxy lives at a real HTTPS hostname.
Set `EXPO_PUBLIC_PURA_AI_PROXY_TOKEN` (matched on the server) so
every request carries an `Authorization: Bearer <token>` header.

## 8. Barcode flow

The barcode resolution path (`POST /normalizeBarcodeResolution` →
two-step provider tool loop → server-side product lookup) is wired
to the **Open Beauty Facts** public API
(`https://world.openbeautyfacts.org/api/v2/product/<barcode>.json`).

What this means in practice:
- A real product barcode (UPC/EAN, 6–14 digits) is looked up against
  the OBF database server-side. Brand, product name, category, and
  ingredient claims come from the real entry.
- If OBF doesn't have the barcode, the server falls back to a small
  local dev catalog (3 entries used by the smoke test).
- If neither has it, the AI marks the resolution as
  `fallback_needed: true` and the client UX nudges the user to take
  a product image instead.

The request to OBF has a 4-second timeout so a slow lookup can't hang
a barcode scan. The server is identified to OBF via a `User-Agent`
header.

---

## 9. Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Home banner: **AI proxy not configured** | `EXPO_PUBLIC_PURA_AI_PROXY_URL` is empty | Set it in `.env` and restart Expo |
| Home banner: **AI proxy unreachable** | Proxy not running, or wrong URL | `npm run server:ai`; check the URL points at it |
| `verify:ai` 401 errors | Token mismatch | Ensure `EXPO_PUBLIC_PURA_AI_PROXY_TOKEN` (client) matches `PURA_AI_PROXY_TOKEN` (server) |
| All replies start with "Live AI isn't connected…" | Same as above; gateway is in fallback | Check `/healthz` from the host first |
| Server logs `cannot start: ANTHROPIC_API_KEY is missing` | The key isn't exported in the shell launching the proxy AND `.env` hasn't been loaded | Put the key in `.env` (auto-loaded by the proxy at boot) |
| Phone can't reach proxy | Wrong proxy URL on the client (still pointing at localhost) | `npm run lanip` to get the LAN URL, paste into `.env`, restart Expo |
| Barcode scan returns "no match" for a real product barcode | Open Beauty Facts doesn't have it indexed | Expected — the AI surfaces `fallback_needed: true` and the UX nudges the user to take a product image instead |
