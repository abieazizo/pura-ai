# CLAUDE.md — Pura AI master execution context

> Read this file FIRST in every Claude Code session for this project.
> It encodes the product thesis, non-negotiable rules, and the master
> execution plan. The full prompt that originally created this file
> is reproduced verbatim below so context is preserved across
> sessions and across compactions.

## Product thesis

**Pura AI = a trusted skin coach with a shopping engine underneath.**

Core user promise:
1. Tell me what matters about my skin today
2. Tell me what to do next
3. Tell me what to buy, if anything

## Non-negotiable principles

- Trust-first
- Confidence-aware
- Recovery-resilient
- Deterministic-first recommendations, AI-second
- One clear next step
- No fake precision
- No fake/demo products in normal flow
- No contradictory timeout layers
- No screen reading scattered raw AI output when it should read canonical state
- No hallucinated user identity/profile facts
- No UI layer that looks "technically improved" but visibly unchanged

## File rule

Do NOT assume filenames. For every file you need, search for it first.
- "Find the file that contains the scan capture screen — do not assume the filename. Search for it first."
- "Find the file that contains the result summary screen — do not assume the filename. Search for it first."
- "Find the file that contains the assistant context builder — do not assume the filename. Search for it first."

## Canonical state

Three canonical objects every important screen, the assistant, and
the recommendation engine must read FROM (not recompose inline):

- `SkinState` (`src/types/canonical.ts`, populated by `src/state/canonical.ts::selectSkinState`)
- `UserProfileContext` (same module pair, `selectUserProfileContext`)
- `RecommendationContext` (same module pair, `buildRecommendationContext`)

Plus a single canonical result-state resolver:
- `resolveScanResultState` / `buildResultViewModel` in `src/state/resultResolver.ts`

## Required micro-copy constants

Defined as exported literals in `src/copy/scanMicroCopy.ts`:

```ts
export const LOADING_MESSAGES = [
  "Mapping your skin zones...",
  "Identifying your top concerns...",
  "Finding products matched to your skin...",
  "Building your personalized plan..."
] as const;

export const SLOW_LOADING_MESSAGE = "Almost there — finding the best matches for you...";
export const SCAN_BLOCKED_MESSAGE = "We need a clearer photo to analyze your skin.";
export const SCAN_LOW_CONFIDENCE_MESSAGE = "Results based on partial scan. Retake for higher accuracy.";
```

## Scan-quality branching (centralized)

Three branches, single source of truth:

- **Branch A — Hard block**: `imageQuality.confidence < 0.4` → block normal results, show retake recovery state with `SCAN_BLOCKED_MESSAGE`.
- **Branch B — Soft warning**: `0.4 ≤ imageQuality.confidence < 0.7` → allow ResultScreen with confidence-adjusted copy + `SCAN_LOW_CONFIDENCE_MESSAGE` banner.
- **Branch C — Normal flow**: `imageQuality.confidence ≥ 0.7` → standard ResultScreen.

Implemented in `src/state/resultResolver.ts`. Do NOT duplicate this logic across screens.

## Result state modes

Resolver output, one of:
1. `blocked_retake_required`
2. `low_confidence_result`
3. `normal_result`
4. `result_with_products_loading`
5. `result_with_products_ready`
6. `result_with_products_unavailable`

## ResultScreen render contract

Top to bottom, no exceptions:
1. Score Hero (large score, one-line headline)
2. Hero Product Card (image, brand, name, why-it-fits, ONE CTA)
3. Skin Concerns Row (2–3 chips)
4. Tonight's Plan (collapsed, 2–3 steps)
5. Alternative Products (horizontal scroll)
6. Scan Quality Note (only if `confidence < 0.7`)

Above-the-fold rule: ONLY items 1 and 2. Max 1 CTA above the fold.

## Persistent telemetry

`src/ai/aiTelemetry.ts` persists structured events via AsyncStorage,
including:
- request timings per AI method
- failure categories (timeout, validation, empty, proxy_unreachable, parse, ui_cancel)
- imageQuality confidence
- scan branch outcome (blocked / low / normal)
- hero product resolved / unavailable / error
- assistant grounding success / failure
- onboarding flow milestones
- result-screen state mode

Bounded ring buffer, no raw face image data, surfaced in diagnostics.

## Stack reference

- React Native + Expo (Expo Go compatibility matters)
- Zustand store with `persist` middleware (AsyncStorage)
- AI proxy via Metro middleware
- gpt-4o-mini for `lookupLiveProducts` (fast); gpt-5-mini for analysis
- All v19.x decisions retained (see `git log --oneline | grep -E '^[a-f0-9]{7} \[v19'`)

---

# Original master prompt (verbatim, for context preservation)

If a CLAUDE.md file does not exist in the project root, CREATE it and write this entire prompt document into it. Before taking any action in this session, READ CLAUDE.md first. This ensures full context persists across all Claude Code sessions.

You are working inside the existing Pura AI codebase.

This is the FINAL COMPLETE MASTER EXECUTION PROMPT. This is not a brainstorm. This is not a design memo. This is not a planning-only pass. This is not a partial patch.

You must:
- audit the real repo first
- map the real architecture first
- identify the real data contracts first
- then implement a disciplined rebuild in the correct order
- verify each phase before moving on
- persist telemetry across sessions
- produce a final PASS/FAIL checklist for every acceptance criterion

(See sections above for the canonical state, scan-quality branching, ResultScreen render contract, persistent telemetry, micro-copy constants, and stack reference. The full multi-phase plan that drove these decisions is preserved in commit messages from v19.0 through v19.16+.)
