# Pura — Vercel mobile-web deployment

The local migration is complete and verified. This document covers the
**three things only you can do** (GitHub auth, Vercel auth, env vars), and
the **future-update workflow** that runs entirely from your machine.

---

## What this deployment is

- The existing Expo / React Native app is built for web via
  `react-native-web` and shipped as a static SPA at `dist/`.
- A single Vercel **serverless function** at `/api/__pura_ai__/[method].ts`
  wraps the same `HANDLERS` map the local `server/aiProxy.ts` already
  uses. Same OpenAI proxy logic, same validation, same auth — just
  hosted instead of running in Metro.
- A `vercel.json` rewrite makes `<origin>/__pura_ai__/<method>` resolve
  to that function, so the existing `aiGateway` code paths keep
  working unchanged.
- iOS/Android Expo Go builds are **not touched** — the only client
  change is one extra proxy candidate that only fires in a browser
  context (`typeof window !== 'undefined'`).

---

## One-time setup (you do these once)

### 1. Create a GitHub repo and push

The repository has no `origin` remote yet and the branch is `master`.
Pick one of the two approaches below.

**Option A — using GitHub CLI** (one command, recommended):
```bash
cd C:/Users/abiea/Downloads/pura-ai
gh repo create pura-ai --private --source=. --remote=origin
git branch -M main
git add .
git commit -m "chore(deploy): Vercel migration — web build + api proxy"
git push -u origin main
```

**Option B — via the GitHub website**:
1. Go to https://github.com/new
2. Create a private repo named `pura-ai` (no README, no .gitignore — repo is already populated)
3. Copy the SSH or HTTPS clone URL
4. Run locally:
   ```bash
   cd C:/Users/abiea/Downloads/pura-ai
   git remote add origin <the-url-you-copied>
   git branch -M main
   git add .
   git commit -m "chore(deploy): Vercel migration — web build + api proxy"
   git push -u origin main
   ```

> Branch rename: Vercel defaults its production branch to `main`. The
> local branch is currently `master` — `git branch -M main` renames it.

### 2. Connect the repo to Vercel

1. Go to https://vercel.com/new
2. Sign in with the GitHub account that owns the repo
3. Click **Import** next to `pura-ai`
4. **Framework Preset:** leave as "Other" (Vercel will read `vercel.json`)
5. **Build & Output Settings:** leave defaults — `vercel.json` already
   sets `buildCommand: npx expo export -p web` and `outputDirectory: dist`
6. **Environment Variables** (add these now, before the first build):

   | Name                          | Value                                       | Scope               | Required? |
   |-------------------------------|---------------------------------------------|---------------------|-----------|
   | `OPENAI_API_KEY`              | your OpenAI key                             | Production, Preview | **YES**   |
   | `PURA_AI_ALLOWED_ORIGINS`     | leave empty (same-origin only)              | Production, Preview | No        |
   | `PURA_AI_PROXY_TOKEN`         | leave empty on web                          | Production, Preview | No        |

   - **`OPENAI_API_KEY`** stays on the server. It is read by the
     serverless function only. It is NEVER bundled into the web
     client. Confirmed by grep on the produced bundle: 0 occurrences
     of the literal `OPENAI_API_KEY`, 0 matches of the `sk-*` prefix,
     0 mentions of `OpenAI` or `openai.com`.
   - **`PURA_AI_PROXY_TOKEN`** is intentionally NOT mirrored to any
     `EXPO_PUBLIC_*` client variable. Any client token would be
     visible in the browser bundle and DevTools — it is **not a
     security boundary on web**. Leave it unset; rely on the real
     server-side defenses (method allowlist, body cap, in-memory
     per-IP rate limit, narrow CORS) instead.
   - **`PURA_AI_ALLOWED_ORIGINS`** only matters if you point a
     non-Vercel client (e.g. local Expo Go via `npm start`) at the
     deployed API. Same-origin web calls never trigger CORS.

7. Click **Deploy**. The first build takes 3-6 minutes.

### 3. **MANDATORY before sharing the URL publicly — Vercel Firewall / WAF rate limit**

The in-memory rate limit inside the serverless function is **best-
effort and incomplete** on serverless infrastructure: Vercel may
spin up multiple instances for the same function, so a single
attacker can split traffic across instances and exceed the
in-memory 60-req/min ceiling. The OpenAI API key is paid; an
unrate-limited public endpoint can be drained in minutes.

Before sharing the production URL anywhere outside your phone,
configure a Vercel Firewall rule. (Vercel → your project →
Firewall → Rate Limiting → Add Rule.)

Suggested rule:
- **Match:** Path is `/api/__pura_ai__/*` AND Path is `/__pura_ai__/*`
  (the rewrite means both paths can reach the function)
- **Action:** Rate limit
- **Threshold:** 60 requests per 60 seconds per IP
- **Action when exceeded:** Block, 1-minute soft ban
- Optional: add a Bot Filter rule on the same paths to block
  known scrapers.

For the Hobby/Pro plans the Firewall UI is at:
`https://vercel.com/<your-team>/pura-ai/settings/firewall`

Do not skip this step. The in-app rate limit is an honest first
line of defence, not the only one.

### 4. Confirm the URL

Vercel hands you a stable production URL like
`https://pura-ai-<random>.vercel.app`. Open it in iPhone Safari. You
should see the splash, then Home. If the AI proxy reaches OpenAI,
scanning works end-to-end.

---

## How future updates work

After this initial setup:

1. I edit code locally.
2. I run `npx tsc --noEmit` and `npx expo export -p web` to verify.
3. I commit with a clear message.
4. **You decide when to ship.** When you say "push to production," I run:
   ```bash
   git push origin main
   ```
5. Vercel auto-rebuilds and redeploys to the same stable URL.
6. You refresh on your iPhone. Done.

I will not push to `main` without you asking — that rule is in the
project memory.

---

## Local sanity check (any time)

```bash
npm install
npx tsc --noEmit
npx tsc --noEmit -p server/tsconfig.json
npx expo export -p web
```

All four should exit 0. Output lives in `dist/`.

---

## Files this migration added or changed

- **New** `vercel.json` — build command, output dir, rewrite for `/__pura_ai__/*` → `/api/__pura_ai__/*`
- **New** `api/__pura_ai__/[method].ts` — Vercel Node serverless function wrapping `HANDLERS` from `server/lib/handlers.ts`
- **New** `.vercelignore` — keeps `.bak`, `tsc-*.txt`, recovery snapshots, `verification/`, `pura-loop/`, `design-reference/` out of the upload
- **New** `VERCEL_DEPLOY.md` — this document
- **Modified** `package.json` — added `build:web` and `vercel-build` scripts
- **Modified** `server/tsconfig.json` — include `../api/**/*.ts` so the new function typechecks
- **Modified** `src/ai/aiGateway.ts` — when the bundle runs in a browser (Vercel), prefer `window.location.origin + '/__pura_ai__'` as the proxy URL. Native (Expo Go / iOS / Android) candidates are unchanged.

---

## What works on web today

- **Home, Shop, Routine, Me tabs** — render via `react-native-web`
- **Scan analyzing screen** — warm cream UI + animated dots + percent counter
- **Scan results V2** — score dial, breakdown bars, skin map (now Expo-Go safe), findings, CTA
- **Build custom routine** — wired through the same hard gate
- **Image upload fallback** — `expo-image-picker` on web renders a hidden `<input type="file" accept="image/*" capture="user">` which on iOS Safari opens the camera or photo picker. No live `getUserMedia` viewfinder, but real photos still reach the AI proxy.

## What is still rough on web

- **`react-native-view-shot`** silent-fails on web (used to capture analyzing photo composite) — affects timeline thumbnails only, not the scan flow.
- **`expo-haptics`** is a no-op on web — no haptic feedback on button taps. Visual press states still fire.
- **Reanimated v4 on web** is solid for `Animated.View` patterns, which is what the v32 SkinMap uses. The legacy V1 `FaceOverlayCanvas` (only reached when `scan.v2Analysis` is missing) still uses `AnimatedG` with `useAnimatedProps` and may be jittery on Safari — irrelevant in practice since fresh scans always carry v2Analysis.
- **Web bundle is 9.4 MB** unsplit — first load is slow on cell data, fine on Wi-Fi. Code splitting is a follow-up optimization.

## What is NOT safe on web

- **`expo-secure-store`** is listed in `package.json` but **not actually imported anywhere** in the codebase (verified by grep). If you start using it, wrap it in a `.web.ts` shim that falls back to `localStorage`.
