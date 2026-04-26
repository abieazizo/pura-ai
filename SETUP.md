# Pura AI — local setup

You have a working app shell out of the box. To get the **real AI path
live** (assistant + scan + matching + progress + suggestions all
backed by Claude) you need three things:

1. an Anthropic API key
2. the proxy server running on `localhost:8787`
3. the Expo client pointed at the proxy

The whole thing takes about two minutes.

---

## 1. Install dependencies

```bash
npm install
```

This installs both client and server dependencies (`@anthropic-ai/sdk`
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
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXX

# Client. Default works for `npm run dev` on the same machine.
EXPO_PUBLIC_PURA_AI_PROXY_URL=http://localhost:8787
EXPO_PUBLIC_PURA_AI_PROXY_TOKEN=   # leave blank for local dev
```

**Critical security rule:** `ANTHROPIC_API_KEY` must NOT be prefixed
with `EXPO_PUBLIC_`. The `EXPO_PUBLIC_` prefix is the Expo babel
plugin's signal to inline a value into the React Native JavaScript
bundle. A key inlined into the bundle can be extracted from any
shipped build and used until rate-limited or revoked. **Keep the
prefix off the API key.** The proxy server reads `ANTHROPIC_API_KEY`
directly from `process.env` at server start.

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

## 7. Network notes

- `localhost` works in **web preview** (`npx expo start --web`) and
  on iOS / Android **simulators** that share a localhost with the dev
  machine.
- For **Expo Go on a phone**, the phone's `localhost` is the phone
  itself. Set `EXPO_PUBLIC_PURA_AI_PROXY_URL` to your dev machine's
  LAN IP (e.g. `http://192.168.1.42:8787`) and start the proxy bound
  to `0.0.0.0` so the phone can reach it:

  ```bash
  PURA_AI_PROXY_HOST=0.0.0.0 npm run server:ai
  ```

  Then in `.env`:

  ```dotenv
  EXPO_PUBLIC_PURA_AI_PROXY_URL=http://192.168.1.42:8787
  ```

- For deployed environments, the proxy lives at a real HTTPS hostname.
  Set `EXPO_PUBLIC_PURA_AI_PROXY_TOKEN` (matched on the server) so
  every request carries an `Authorization: Bearer <token>` header.

---

## 8. Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Home banner: **AI proxy not configured** | `EXPO_PUBLIC_PURA_AI_PROXY_URL` is empty | Set it in `.env` and restart Expo |
| Home banner: **AI proxy unreachable** | Proxy not running, or wrong URL | `npm run server:ai`; check the URL points at it |
| `verify:ai` 401 errors | Token mismatch | Ensure `EXPO_PUBLIC_PURA_AI_PROXY_TOKEN` (client) matches `PURA_AI_PROXY_TOKEN` (server) |
| All replies start with "Live AI isn't connected…" | Same as above; gateway is in fallback | Check `/healthz` from the host first |
| Server logs `cannot start: ANTHROPIC_API_KEY is missing` | The key isn't exported in the shell that launched the proxy | `export ANTHROPIC_API_KEY=sk-ant-…` then re-run |
| Phone can't reach proxy | Bound to `127.0.0.1` only | `PURA_AI_PROXY_HOST=0.0.0.0 npm run server:ai` |
