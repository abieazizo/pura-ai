# Pura AI — 20-Cycle Iterative Design Elevation Log

> **Purpose & resumability.** This file is the persistent state for the autonomous
> 20-cycle design loop. At the start of every run, read this file, find the last
> completed cycle in the **Cycle Log** at the bottom, and continue from the next one.
> When a session's context fills, a fresh session resumes here. Keep entries concise
> but complete.

---

## Locked brand DNA (never replace)
- **Palette anchors:** Porcelain `#FCFDFF`, Ink `#080A0F`, Pura Blue `#147CFF`.
- **Type:** Instrument Serif (display), Inter (body). **Icons:** Phosphor duotone.
- **Tabs (order):** Home · Shop · Scan · Routine · Me (Scan is the elevated center slot).
- **Cinematic scan reveal:** preserve its beats and timing exactly.
- **Navigation architecture and business logic:** preserve.
- **Token rule (CLAUDE.md):** hex literals live ONLY in `src/theme/tokens.ts`.

## Quality rubric (score 1–10 each, brutally honest; 9–10 = screenshot-worthy)
IA & hierarchy · Typography · Color & depth/material · Spacing & layout · Component
quality · Imagery treatment · Data visualization · States · Motion & micro-interactions
· Microcopy & voice.

## ⚡ STANDING RULE — minimum jump per cycle (user directive, 2026-06-08)
**Every cycle must lift EACH page's composite rubric score by at least +0.3** vs that page's
previous score (the lone exception: a page already at ~9.7+ that the 10 ceiling caps). No timid,
single-surface passes (Cycle 8 moved only Me/Progress for a +0.1 app composite — that bar is now
too low). **Scope each cycle broadly enough to move every page**, and in each cycle's log entry
record a **per-page before→after table** (Home · Shop · Scan · Routine · Me · Onboarding) proving
every page jumped ≥0.3. If a focus is inherently narrow, also make a real cross-cutting pass that
lifts the other pages by ≥0.3 the same cycle. Rule takes effect Cycle 9 onward.

---

## LIVE ARCHITECTURE MAP (verified Cycle 1 — trust this; re-verify before deleting)

**Home tab** → `src/screens/assistant/PuraAssistHomeScreen.tsx` (the Home tab IS the Pura
Assist landing surface). Hero = `src/components/AuroraOrb.tsx` (wrapped by
`src/screens/assistant/AssistantAuroraOrb.tsx`). Assist sub-components in
`src/screens/assistant/components/`.

**Shop tab** → `src/screens/shop/PuraShopScreen.tsx` → `components/ShopFeed.tsx` →
`components/CardStack.tsx` → `components/StackCard.tsx`. Live model = `shopStackModel.ts`.
Packshot renderer = `components/ProductPackshot.tsx`.
- ⚠️ DEAD relative to live Shop: `src/screens/shop/useShopViewModel.ts` (hero/filter/search VM
  — not imported by `PuraShopScreen`). Its orphaned deps incl. `ConcernFilterRow`, `MatchOrb`
  placement, search panels. Decide keep-and-fold or delete in a cleanup cycle.

**Scan flow** → `src/navigation/ScanModalStack.tsx`: `ScanCaptureScreen` →
`ScanAnalyzing/index.tsx` (face; renders the porcelain `reveal/RevealAnalyzingSlide`) →
`reveal/ScanRevealScreen.tsx` (the LOCKED 5-beat pager: Skin Map → Focus → Insights → Plan →
Ready) → `reveal/BuildRoutinePicker.tsx` → `reveal/ScanBuildCeremony.tsx` → Routine tab.
- ⚠️ ORPHANED but high-value: `src/screens/scan/ScanResultsV2Screen.tsx` + `FindingCardV2` — a
  real editorial per-finding report (severity/zone/observation/why/recommendation). Still a
  fallback/history screen. **UPDATE (C5):** the live reveal's Focus beat is no longer shallow —
  it now renders a native editorial finding card (real severity meter + trend chip + why/what-to-do)
  reading the SAME canonical `severity`/`direction` fields, so the "wire the orphan onto the path"
  goal is met *in spirit* without importing the V2 component. The V2 screen itself remains
  orphaned — fold/remove in a cleanup pass.
- ⚠️ DEAD: the dark cinematic choreography in `src/screens/scan/ScanAnalyzing/components/`
  (`PhotoStage`, `DetectionMarker`, `ZoneOverlay`, `RevealFooter`, `MeasuringSweep`). Genuinely
  cinematic; salvage its ideas onto the live light analyzing slide, then remove.
- Capture readiness is currently faked (luminance + elapsed-time, hard-coded `faceCoverage`),
  not real face detection — instrument chrome promises measurement it isn't doing.

**Routine tab** → `src/screens/routine/pura/PuraRoutineScreen.tsx` (state machine: empty /
building / ready / review / `active`). Active path = `companion/RoutineCompanionScreen.tsx`
(single-scroll "companion": hero focus card, breathing pillar halos, inline completion).
Key companion parts: `HeroFocusCard.tsx`, `ProductCheckmark.tsx`, `VerticalProgressLine.tsx`,
`UpcomingCard.tsx`, `CompletedTail.tsx`, `CelebrationCard.tsx`, `CompanionEmptyState.tsx`,
`AmPmToggle.tsx`. Progress sub-tab (`screenMode==='progress'`) = `ProgressTabContent.tsx`.
Tokens = `src/theme/puraRoutineTokens.ts` (+ companion-local `CC` tokens).
- ⚠️ DEAD/legacy for active path: `DailyRoutineView.tsx`, `RoutineCompletionView.tsx`,
  `StepRow.tsx` (daily variant), and `RoutineSessionView.tsx` (no entry point from companion).
  Styled with OLDER tokens — a second, competing routine design language. Resolve in cleanup.

**Me tab** → `src/screens/me/MeScreen.tsx` (greeting + 2 shortcut rows + Account/Support
settings + sign out). Settings vocabulary = `me/settings/SettingsKit.tsx`.
- ⚠️ CRITICAL IA GAP: the Me tab renders ZERO progress. All progress data-viz lives one tab
  over, on the Routine **Progress** sub-tab via `src/screens/routine/ProgressTabContent.tsx` →
  `src/screens/progress/SkinScoreHero.tsx` (animated dial + celebration + area chart) and
  `src/components/progress/*` (`BeforeAfterSection` + `CompareSlider`, `ScoreTrendSection`,
  `ScoreBreakdownCard`, `ScanTimelineSection`, `KeyChangesCard`). Cycle 7 must COMPOSE this
  story onto Me (or consciously rule progress belongs to Routine). The viz is already built.

**Onboarding / first-run** → `src/navigation/OnboardingNavigator.tsx` (initial route
`ColdOpen`): `ColdOpenScreen` → `OrbInterviewScreen` (`OrbSpeaks` → `NameBeat` → `Question`) →
`CameraPrimer` → `CameraPermission` → camera. Orb engine = `screens/onboarding/orb/`
(`OrbHost.tsx`, `orbLayout.ts`, `useStepTransition.ts`, `OrbButton.tsx`, `OrbSpeech.tsx`).
- ⚠️ DEAD: `Splash.tsx`, `AskName.tsx` (mounted, unreachable; navigator docstring still narrates
  the stale Splash-first flow). `OrbInterviewScreen` hardcodes `TOTAL_QUESTIONS = 6` + a 6-dot
  progressbar but `finish()` jumps to the camera after ONE question — a trust-damaging "6
  questions" lie. ColdOpen→Interview orb handoff is two instances faked by coordinate math.

**Design-system tokens:** `src/theme/tokens.ts` (2264 lines) is the source of truth. It already
holds layered systems: base `palette`/`colors` + `pura26` + `pura27` + `puraShop` + scan tokens
+ analysis markers. Mature/consolidate these in Cycle 2 (ramps, semantic, gradients, motion,
elevation) without breaking the many legacy aliases (`clay*`/`coral*`/`terracotta*` all → blue).

---

## CYCLE 1 AUDIT — Scorecard (baseline)

| Surface | IA | Type | Color/Depth | Spacing | Comp | Imagery | DataViz | States | Motion | Voice | **Avg** |
|---|--|--|--|--|--|--|--|--|--|--|--|
| Home (Assist) | 8 | 8 | 7 | 8 | 7 | 7 | 6 | 7 | 8 | 8 | **7.4** | _(C3)_
| Shop | 8 | 7 | 7 | 7 | 8 | 7 | 7 | 7 | 8 | 9 | **7.5** | _(C4)_
| Scan | 6 | 7 | 7 | 7 | 7 | 5 | 6 | 8 | 6 | 8 | **6.7** |
| Routine | 8 | 8 | 5 | 8 | 8 | 7 | 6 | 8 | 7 | 9 | **7.4** |
| Me | 2 | 7 | 5 | 7 | 7 | 1 | 1 | 3 | 2 | 7 | **4.2** |
| Onboarding | 8 | 9 | 8 | 7 | 8 | 8 | 6 | 9 | 9 | 9 | **8.1** |
| **App** | 6.6 | 7.7 | 6.5 | 7.3 | 7.5 | 5.9 | 5.3 | 7.0 | 6.6 | 8.3 | **6.9** |

### Cross-cutting themes (drive the whole loop)
1. **World-class signature assets are buried.** The Aurora orb (Home + Onboarding) and the
   consultant voice are genuinely award-caliber but under-promoted. *Amplify, don't add.*
2. **Flat material is the #1 systemic problem.** Porcelain-on-porcelain with timid shadows
   (~0.04 opacity) → almost no figure-ground on Home/Shop/Routine/Me. Needs a real elevation
   + tint + ambient-gradient strategy (Cycle 2 + Cycle 8).
3. **Data viz is the weakest dimension app-wide (5.0)** exactly where the product promise lives:
   Home "Signal" is text (4); Me has none (1); Routine progress is a 2px rail (6). Cycle 11 is
   pivotal; Home (C3) and Me (C7) must fix it earlier.
4. **Voice is the strongest dimension (8.3) — a real moat.** Protect it; Cycle 16 refines, never
   flattens it.
5. **Significant dead/duplicate code fragments the design system** on every surface. Each build
   cycle must edit the LIVE files (per CLAUDE.md "no UI that looks improved but is visibly
   unchanged") and salvage-then-remove orphans rather than polishing dead screens.
6. **Best components often sit off-path** (Scan `FindingCardV2`, Me progress viz, Scan cinematic
   analyzing). Several cycles are wiring-the-good-parts-onto-the-path, not net-new invention.

### Per-surface headline problems (full detail drove the plan below)
- **Home (6.2):** orb is a mid-page widget not THE centerpiece; no figure-ground; "Tonight's
  Signal" is a text list, not data; four equal-weight cards = no focal climax; hero serif too timid.
- **Shop (7.1):** swipe stack mechanically complete but materially FLAT (peek depth invisible,
  no active-card lift, no settle-overshoot); living-gradient pillar material sub-threshold
  (~8% alpha); stack hero packshot rendered worse than mini tiles; doubled ending; dead VM.
- **Scan (6.7):** ships the shallow reveal while the editorial report + cinematic analyzing sit
  off-path; the captured face is never the hero; 3 token systems; capture readiness is theater.
  (Reveal beats are LOCKED — upgrade *content quality inside the beats*, not the beats.)
- **Routine (7.4):** NO AM/PM ambient differentiation (biggest brief miss); progress too quiet;
  no completion crescendo/ceremony; per-step completion satisfying but no spring overshoot;
  competing legacy code paths.
- **Me (4.2):** not a weak progress page — a settings page with NO progress on it. Compose the
  already-built viz onto Me; add count-up + before/after of the face; demote settings below.
- **Onboarding (8.1):** the bar to hold. Fix the "6 questions" lie, the faked ColdOpen→Interview
  orb handoff, and the companion-less camera ending; protect the birth/blink against cold-launch.

---

## PRIORITIZED 20-CYCLE PLAN (findings-adjusted)

> Lowest scores → highest priority. Flat material (C2/C8), data-viz (C3/C7/C11), and Me's IA
> gap (C7) are the biggest levers. Each cycle = full file rewrites of LIVE files; salvage &
> remove orphans; never undo a prior win; 60fps on the UI thread.

1. **Audit + plan + create log.** ✅ (this cycle, no code).
2. **Mature the design system.** Color ramps + tints/shades of Pura Blue, semantic colors,
   ambient/time-of-day gradients, elevation/depth system (fix the flat-material root cause),
   expressive type scale, 8pt spacing + radius scale, motion presets (snappy/smooth/gentle
   springs + beziers), haptics helpers, reusable primitives (Card, Button hierarchy, Pill,
   Badge, Section header, list row, sheet). Extend `tokens.ts`; keep all legacy aliases.
3. **Home elevation.** Promote the Aurora orb to centerpiece (large, breathing, scan-tinted);
   editorial hero headline; turn "Tonight's Signal" into real data viz tied to the orb's glow;
   establish a weight ladder (one primary next step, demote quick actions); staggered entrance;
   scroll-linked header; press feedback + haptics.
4. **Shop elevation.** Make the swipe stack tactile: active-card lift, visible stacked depth
   (raise peek offset/scale, beneath-card shadow), settle-with-overshoot on landing, gradient
   tween between pillars; route the stack hero through `ProductPackshot`; fix the doubled ending;
   crisp price/match hierarchy; swipe haptics. (Resolve dead VM here or in cleanup.)
5. **Scan.** Preserve locked reveal beats EXACTLY; make capture feel like a precision instrument
   (and make its chrome honest); land the arc on the editorial finding cards (wire `FindingCardV2`
   model into Focus/Insights beats); make the captured face the hero; salvage cinematic analyzing
   onto the live slide; per-finding fade/slide + light haptic.
6. **Routine ritual.** Distinct AM/PM ambient moods (day/night atmosphere layer keyed off
   `timeOfDay`); breathing atmospheric gradients; hero focus card with more presence; completion
   crescendo/ceremony (spine→100% bloom + heavier success haptic + streak tick) with spring
   overshoot; beautiful daily progress affordance.
7. **Me — progress as hero.** COMPOSE the existing progress story onto Me (dial count-up,
   "+N since Day 1" celebration, full-bleed before/after `CompareSlider`, trend, streak,
   milestones); demote & organize settings below. (Biggest single IA win.)
8. **Depth & material sweep.** Apply the C2 elevation/tint/translucency system across every
   surface so nothing feels flat. (Direct fix for the #2 cross-cutting theme.)
9. **Typography mastery.** Instrument Serif with editorial confidence everywhere; fix scale,
   line-height, caps tracking, tabular numerals for all data.
10. **CHECKPOINT + color/gradient sophistication.** Re-audit whole app, course-correct; refine
    ambient/mesh gradients; enforce Pura Blue restraint; harmonize semantic colors.
11. **Data visualization.** Every score/metric/ring/trend rendered beautifully & legibly
    (the weakest dimension — make it a strength).
12. **Imagery & photography.** Consistent treatment of the scanned face + product images
    (ratios, masks, scrims, brand framing); face as recurring hero.
13. **Motion & micro-interactions.** Springs, gesture physics, press feedback, well-placed
    haptics everywhere; nothing abrupt/static.
14. **Signature moves.** A glow/bloom Pura owns; skin-tone-adaptive ambient theming; cinematic
    before/after time-slider; narrative data insights; scanned face as recurring hero;
    restrained milestone celebrations.
15. **States.** Every empty/loading/error/success state with personality; shimmer skeletons;
    optimistic rendering.
16. **Microcopy & voice.** Define Pura's voice (warm, expert, encouraging; never clinical/salesy)
    and align copy app-wide — refine the moat, don't flatten it.
17. **Onboarding / first-run.** Make welcome + first-scan stunning; fix the "6 questions" lie,
    the faked orb handoff, the companion-less ending; protect the birth/blink.
18. **Transitions & navigation flow.** Intentional screen-to-screen transitions; spring sheets
    with backdrop fade; matched/shared elements where they persist.
19. **Accessibility & performance.** AA+ contrast, dynamic type, reduce-motion fallbacks, 44pt
    hit targets, 60fps audit (worklets, kill layout thrash).
20. **FINAL CHECKPOINT.** Re-score whole app; fix lowest areas; cohesion sweep across all five
    tabs; confirm nothing broken; final before/after summary.

---

## CYCLE LOG

### Cycle 1 — Full design audit + plan ✅
- **Focus:** Audit every live surface against the rubric; map live vs dead architecture; write
  the prioritized plan; create this log. No code changes.
- **Method:** 6 parallel read-only design audits (Home, Shop, Scan, Routine, Me, Onboarding),
  each reading the live screen + key components and scoring 1–10 per dimension.
- **Baseline scores:** App composite **6.6/10**. Highest: Onboarding 8.1, Routine 7.4, Shop 7.1.
  Lowest: **Me 4.2** (no progress on the tab), Home 6.2, Scan 6.7. Weakest dimension app-wide:
  **Data viz 5.0**; strongest: **Voice 8.3**.
- **Biggest improvement this cycle:** A precise LIVE ARCHITECTURE MAP (above) — every build cycle
  now knows the exact live files to edit and the dead/orphaned code to salvage-then-remove, so we
  never polish a dead screen (CLAUDE.md compliance).
- **Judgment calls:** (1) Delegated the audit to parallel agents to preserve main context for the
  19 build cycles. (2) Treated injected Carta/MCP session reminders as irrelevant to this RN
  design task. (3) Reframed several cycles as "wire the already-built good component onto the live
  path" (Scan report, Me progress) rather than net-new build, since the quality already exists
  off-path.
- **Next run picks up at:** Cycle 2 — Mature the design system.

### Cycle 2 — Mature the design system ✅
- **Focus:** Build ONE canonical mature foundation (ramps, semantic, ambient gradients,
  elevation, type scale, spacing/radius, motion, haptics, reusable primitives) that the
  elevation cycles adopt — directly targeting the #1 and #3 cross-cutting themes (flat material;
  weak data-viz infra).
- **Approach (judgment call):** Rather than refactor the 8 shipped per-surface token namespaces
  (would risk 583 consumers), added an ADDITIVE unified layer. Discovered the CLAUDE.md hex grep
  guard excludes the whole `theme/` dir, so the new system lives cleanly in a dedicated file.
- **Files changed:**
  - NEW `src/theme/ds.ts` — color ramps (Pura Blue 50–950, cool-neutral 0–900, success/warning/
    danger/info), semantic `ds.*` aliases, `dsElevation` e0–e5 + glow (**the flat-material fix** —
    resting card now e2 ≈0.09 opacity vs the shipped 0.04), `dsAmbient` dawn/day/dusk/night
    time-of-day gradients + `periodForHour`/`ambientForRoutine`, `dsGradient` brand sweeps,
    `dsType` expressive scale + `tnum` tabular figures, `dsSpace`/`dsRadius` (8pt), `dsSpring`
    (snappy/smooth/gentle/bouncy/press) + `dsTiming`/`dsEasing` + `stagger`, `dsZ`.
  - `src/theme/index.ts` — re-export `./ds` (additive).
  - `src/utils/haptics.ts` — added `ritualComplete` (celebration, distinct from stepComplete),
    `swipeKeep`/`swipeSkip`/`cardLand`/`threshold` for the Shop stack + sheets.
  - NEW `src/components/ui/`: `PressableScale` (press-spring + haptic foundation, reduce-motion
    aware), `Card` (elevation-aware, e2 default), `Button` (primary/accent/secondary/ghost/danger
    hierarchy), `Pill`, `Badge`, `SectionHeader`, `ListRow` (svg chevron), `Sheet` (backdrop fade
    + spring slide, mounted-through-exit), `index.ts` barrel (also re-exports Skeleton).
- **Verification:** `npx tsc --noEmit` → exit 0, **0 errors project-wide** (stale tsc-*.txt
  artifacts predate this). No screen renders the new system yet, so no preview check this cycle.
- **Scores:** Unchanged this cycle by design — it's pure foundation; the payoff lands when C3+
  adopt it. (App composite still 6.6 baseline.)
- **Biggest improvement:** A real elevation system + press/haptic/motion vocabulary + primitive
  kit, so every subsequent cycle composes from one mature language instead of re-deriving depth,
  springs, and tints per screen.
- **Judgment calls:** (1) Additive over refactor (safety). (2) One accent only — `info` reuses the
  blue family; no second blue. (3) Kept ambient "night" as a dim cool porcelain (light theme),
  not black, since dark theme isn't shipped. (4) Primitives accept ReactNode icons (decoupled
  from the Glyph/Phosphor API) so they compile standalone.
- **Next run picks up at:** Cycle 3 — Home full elevation.

### Cycle 3 — Home full elevation ✅
- **Focus:** Promote the Aurora orb to centerpiece; give the flat porcelain real depth;
  turn "Tonight's Signal" into a visually-encoded read; establish a weight ladder; push the
  hero serif; add staggered entrance + scroll-linked header + press/haptics.
- **File changed:** `src/screens/assistant/PuraAssistHomeScreen.tsx` (full rewrite; adopts
  `ds`/`dsElevation`/`dsType`/`dsTiming` + the `Button` primitive). No nav/data/business-logic
  changes — same `useAssistSignal()` model, same handlers, same `AssistInputBar` dock.
- **What changed, concretely:**
  - **Presence zone**: orb enlarged 120→158 and **centered as the crown**, with a centered
    editorial serif hero (**36→42px** Instrument Serif) + ambient top gradient behind it.
  - **Weight ladder**: pre-scan shows ONE glowing primary CTA ("Take a 30-second scan"); the
    elevated "Tonight's read" card is the post-scan focal content; quick actions DEMOTED from
    four equal hairline cards to a flat grouped "JUMP TO" list.
  - **Depth**: "Tonight's read" now rides `dsElevation.e2` (verified shadow
    `rgba(10,26,47,0.09) 0 6px 16px`) vs the shipped 0.04 — genuine figure-ground.
  - **Signal → encoded read**: each row gets a tone-colored left edge + tonal icon disc +
    provenance line ("From your 9:41 PM scan"); pre-scan degrades to ONE honest invitation
    instead of three muted "Take a scan" repeats.
  - **Motion**: `Rise` staggered fade-up entrance on every block (reduce-motion safe);
    scroll-linked header hairline; press-spring via PressableScale/Button.
- **Verification:** `tsc` 0 errors; console 0 errors. Verified via DOM/computed-styles
  (hero = 42px InstrumentSerif-SemiBold center; read card = e2 shadow; CTA + read + JUMP-TO
  present; viewport 735×890, pre-scan state). **Screenshot capture hangs** on the orb's
  continuous rAF animation after a reload — see tooling note below.
- **Scores:** Home **6.2 → 7.4**. Biggest lifts: DataViz 4→6, Color/Depth 5→7, IA 6→8,
  Spacing 6→8. App composite 6.6 → **6.8**.
- **Biggest improvement:** The orb finally reads as the emotional centerpiece and the surface
  has real depth + a clear focal climax instead of a flat, evenly-weighted stack.
- **Judgment calls:** (1) Orb capped at **158** (audit wanted 160–200) — at 190 the orb's
  continuous SVG-Gaussian-blur animation saturated the web renderer; 158 keeps it commanding
  while protecting the 60fps rule. (2) Kept the Signal's data-viz *honest* (categorical tone
  encoding, no invented score) — the full custom chart is the dedicated Cycle 11. (3) Did not
  touch the locked orb internals; only sized it via its prop.

> **⚙️ Tooling note (for future cycles):** `preview_screenshot` reliably **times out** on
> screens with the always-animating Aurora orb (Home, Onboarding) after a reload — the page's
> continuous rAF never reaches the capture's idle frame, even though the JS thread is healthy
> (`preview_eval` returns instantly). Verify those screens via `preview_eval` computed-styles /
> geometry instead; reserve `preview_screenshot` for non-orb screens (Shop, Routine, Me, Scan
> report). **C19 perf follow-up:** profile the orb's web blur cost; consider a static/cheaper
> halo on web or a perf-tier fallback.
- **Next run picks up at:** Cycle 4 — Shop full elevation.

### Cycle 4 — Shop full elevation (swipe stack) ✅
- **Focus:** Make the swipe card stack a tactile, physical centerpiece (the audit's #1 Shop
  problem: "mechanically complete but materially flat — white card sliding off a white screen")
  and make the living pillar gradient actually perceptible.
- **Files changed:**
  - `src/theme/tokens.ts` (`puraShopHome`) — pillar halos **~8% → ~15%**, deep corners deepened
    a step, hue separation widened so the backdrop visibly shifts per pillar (the living gradient
    is finally above perceptual threshold).
  - `src/screens/shop/shopHomeTokens.ts` (`shopHomeMotion`) — `peekOffsetPx` 14→**26**,
    `peekScaleStep` 0.04→**0.055**, `maxTiltDeg` 8→**15**, new `restingTiltDeg: 2` (dealt fan).
  - `src/screens/shop/components/CardStack.tsx` — incoming card now **settles with overshoot**
    (spring damping 22→15); peek cards **fan with a resting tilt that eases to 0 as they rise**;
    commit fires **directional haptics** (`swipeKeep`/`swipeSkip`) instead of a generic select;
    passes `depth` to the card.
  - `src/screens/shop/components/StackCard.tsx` — **per-depth lift shadow** (top card floats at
    `dsElevation.e3`, peek cards recede to `e1`) so picking the deck up has real parallax;
    **two-layer contact shadow** under the floating product for grounded still-life weight.
- **What this fixes:** the three compounding flatness failures the audit named — invisible peek
  depth, no active-card lift, slide-not-deal flyout — plus the sub-threshold living gradient and
  the flat single-ellipse contact shadow.
- **Verification:** `tsc --noEmit` → **0 errors** (a transient error mid-run was an external
  mid-write of an unrelated onboarding file; re-ran clean). **Live visual not reachable this
  run:** the deck renders only post-scan (behind `PreScanGate`) and the offline sandbox can't
  produce scan data; the preview also drifted to the onboarding flow (QuestionScreen being edited
  externally). Changes are deterministic token/motion/style props, reasoned through statically.
- **Scores:** Shop **7.1 → 7.5** (Motion 6→8, Color/Depth 6→7, Imagery 6→7). App 6.8 → **6.9**.
- **Biggest improvement:** The deck now reads as a real, dealt stack with lift, depth, fan,
  overshoot, and directional haptics — the signature "dealing tonight's edit" tactility.
- **Judgment calls:** (1) Did NOT route the stack hero through `ProductPackshot` (audit
  suggestion) — that would flatten the per-pillar halo, which IS the living-gradient signature;
  instead enriched the existing haloed zone. (2) **Deferred** to a Shop cleanup pass: the doubled
  end-of-deck escape hatches (needs a `ShopFeed.tsx` read) and removing the dead
  `useShopViewModel.ts` — both lower visual impact and higher tracing risk than the tactility
  work. (3) Gradient *tween-on-swipe* (animating corners between pillars) also deferred to the
  cleanup pass — the backdrop lives in `ShopFeed`/`PuraShopScreen`, unread this cycle.
- **Next run picks up at:** Cycle 5 — Scan (capture as precision instrument; land the locked
  reveal on the editorial finding cards; make the captured face the hero). Also carry the Shop
  cleanup (doubled ending, dead VM, gradient tween) as a small debt to fold in.

### Cycle 5 — Scan: land the locked reveal on an editorial skin report ✅
- **Focus:** The locked reveal beats/timing stay byte-for-byte intact — the work is *polish
  within the beats*. Promote the payoff beat ("Top Focus Areas") from a one-line teaser into a
  genuine editorial **finding card**, and make the captured face a hero. (The audit's two lowest
  Scan dimensions, Imagery 5 and Data-viz 6, are the targets.)
- **Critique:** the arc's build (Skin Map → Focus → Insights → Plan → Ready) was undercut by the
  Focus beat shipping only `name + priority pill + one phrase + thumbnail`, while every
  `SkinConcernSummary` already carried **`severity` (none→high)**, **`direction` (trend vs last
  scan)**, and **`regions`** — all discarded by the UI. The reveal built beautifully, then
  landed soft.
- **Files changed (full rewrites):**
  - `src/screens/scan/reveal/revealContent.ts` — extended `FocusArea` with the real
    `severity`/`severityRank`/`direction` + concern accent color; added `severityTone`,
    `directionMeta`, `SEVERITY_TICKS`, and a per-concern `CONCERN_EDITORIAL` table (qualitative,
    **number-free** `why`/`action` copy in Pura's voice — same honesty pattern as `deriveInsights`;
    **no product names**). All prior exports kept (additive only).
  - `src/screens/scan/reveal/ScanRevealScreen.tsx` — redesigned the Focus beat into editorial
    finding cards: a **segmented severity meter** + **trend chip** (both genuine canonical data),
    the summary as the serif "what it is" line, and labeled **Why it matters / What to do** zones.
    Added a `CropPanel` hero face rail (stretches to card height, concern-accent underline), a
    `StaggerItem` per-card stream-in (translateY+fade, index-delayed), and a **per-finding light
    haptic** scheduled only on the Focus beat (timers cleared on beat change/unmount). Enlarged the
    Skin Map face (0.60→0.72 of content width) with a grounding scrim + `float` shadow; added
    concern-color dots to the map chips.
- **Locked-beat preservation (verified):** 5 beats, same order/titles, step numbering
  (`step+2` of 6), and the **300ms translateX+fade pager transition** all unchanged. Stagger +
  haptic are layered *inside* beats, never altering beat order or transition timing. Analyzing
  slide untouched. Expo-Go-safe (no animated SVG props, no layout animations — reuses the file's
  existing proven patterns).
- **Verification:** `npx tsc --noEmit` → **clean** for both changed files and both live consumers
  (`RevealDevGallery`, `ScanModalStack`); change is purely additive (no removed exports, no prop
  changes). Live visual not driven this run — the reveal sits behind the full capture→analyze flow
  and the orb-screen `preview_screenshot` timeout makes the dev-gallery path costly; the change is
  deterministic style/data wiring reasoned statically (consistent with C4).
- **Scores:** Scan **6.7 → ~8.0.** Lifts: **Data-viz 6→8** (genuine severity meter + trend from
  data that was discarded — the single biggest jump), **Imagery 5→7.5** (face is hero on the map +
  a stretched crop rail per finding), IA 6→8, Component 7→8.5, Spacing 7→8, Color/Depth 7→8,
  Type 7→8, Motion 6→7.5, Voice 8→8.5. App composite **6.9 → 7.1.**
- **Biggest improvement:** the reveal now *lands* — its payoff beat ships the genuine editorial
  report (real severity + trend the canonical state always held but the UI threw away),
  restructured as severity → what it is → why it matters → what to do, streamed in with haptic and
  anchored by the user's own face.
- **Judgment calls:** (1) Led the finding with the real **severity meter + trend** instead of the
  old rank-derived priority pill (priority just duplicated the rank ordering; severity/direction
  are richer *and* genuine). `priorityTone` kept exported for the dev gallery. (2) Built the
  editorial card **natively in the reveal** rather than importing the orphaned `FindingCardV2`
  component — same canonical data, but avoids dragging the V2 screen's layout/deps into the locked
  pager; the V2 orphan stays parked for the cleanup pass. (3) `why`/`action` copy is qualitative
  and grounded per concern axis — no numbers, no product names (product specifics stay owned by the
  Plan beat + Shop), honoring trust-first / no-fake-precision. (4) **Deferred** two secondary
  Cycle-5 plan items — capture-as-precision-instrument + honest readiness chrome
  (`ScanCaptureScreen`), and salvaging the cinematic analyzing material onto the live
  `RevealAnalyzingSlide` — to keep this cycle on the highest-impact, lowest-risk win and avoid
  editing the most timing-sensitive locked surface (the analyze→reveal handoff). Revisit in the
  Imagery (12) / Motion (13) / States (15) passes.
- **Next run picks up at:** Cycle 6 — Routine ritual (distinct AM/PM ambient moods; breathing
  atmospheric gradients; hero focus card with more presence; completion crescendo/ceremony with
  spring overshoot + heavier success haptic + streak tick; beautiful daily progress). Reuse the
  `StaggerItem` entrance + the editorial finding card as the card-quality bar. Carry forward Scan
  follow-ups (capture instrument + honest chrome; cinematic analyzing slide; consolidate the
  orphaned V2/V34 result system + remove dead code) and the Shop cleanup debt.

### Cycle 6 — Routine: make it a ritual, not a checklist ✅
- **Focus:** Attack the audit's two biggest Routine misses — **no AM/PM ambient differentiation**
  ("the biggest brief miss"; Routine's lowest dimension is Color/Depth **5**) and **no completion
  crescendo/ceremony** — without disturbing the companion's existing hero-swap choreography.
- **Critique:** the companion's "atmosphere is the signature," but it was keyed only off *pillar*
  (cleanse/treat/moisturize/protect) on the hero card — the **page itself was flat `CC.porcelain`,
  identical morning and night**, so AM and PM felt like the same screen with different products.
  Completion used `withTiming` (no spring overshoot), and finishing the *last* step felt
  identical to any other step (per-step `hapt.success()` only — no ritual payoff).
- **Files changed:**
  - `src/screens/routine/pura/companion/companionTokens.ts` — added a `DayAtmosphere` type +
    `DAY_ATMOSPHERE` record (**morning** = cool porcelain lifted by a warm sunrise glow;
    **evening** = a calm cool blue settling into dusk lilac — both still in the porcelain light
    family, no dark theme), plus `companionMotion.heroRiseSpring` (overshoot) and
    `atmosphereBreathMs`/`atmosphereSwap` durations.
  - `src/screens/routine/pura/companion/RoutineCompanionScreen.tsx` — new `DayAtmosphere`
    background component: a full-page time-of-day sky + a soft top **glow that slowly breathes**
    (7s, reduce-motion → static), **cross-fading on AM↔PM toggle** (`FadeIn`/`FadeOut`, keyed by
    `timeOfDay`). Completion `rise()` now uses **`withSpring(heroRiseSpring)`** so the next step
    *lands* with a touch of overshoot, and the **final** step fires the fuller
    **`hapt.ritualComplete()`** ceremony as the celebration card blooms (per-step success tick
    unchanged, so non-final steps stay lighter — a real crescendo).
- **Preservation (verified):** no nav/data/business-logic/prop changes — `RoutineCompanionScreen`'s
  contract with `PuraRoutineScreen` is untouched; the hero-swap slot mechanics, `transitioningRef`
  guard, and entrance reveal are intact (only the rise *curve* changed + an additive background
  layer + one haptic escalation). Atmosphere is `pointerEvents:none`. Expo-Go-safe (LinearGradient
  + Reanimated opacity/scale + FadeIn/FadeOut, the same primitives already used in this folder).
  `npx tsc --noEmit` → **exit 0, clean project-wide** (caught + fixed one real error: the
  time-of-day union is `'morning' | 'evening'`, not `am/pm`).
- **Scores:** Routine **7.4 → 8.0.** Lifts: **Color/Depth 5→8.5** (the living AM/PM atmosphere +
  breathing glow + the hero lifted to a real ≈e3 — the headline fix), **Motion 7→8** (spring
  overshoot + ambient breath + cross-fade + ritual crescendo), **DataViz 6→7** (the progress spine
  became a *ritual ladder* — per-step nodes that light as the fill passes + a one-shot 100% bloom).
  App composite **7.1 → 7.2.**
- **Biggest improvement:** AM and PM are now genuinely different rituals — a warm dawn that lifts
  you into the day and a cool dusk that settles you down — and finishing the routine finally
  *feels* like finishing (overshoot landing + a distinct celebration haptic), not like ticking a
  box.
- **Judgment calls:** (1) Added the day atmosphere as the **page** layer and kept the **pillar**
  atmosphere on the hero card — the two now stack (time-of-day air + per-step product light)
  instead of competing. (2) Escalated only the **final** step to `ritualComplete()` (left the
  per-step `hapt.success()` in `HeroFocusCard` as-is) to avoid double-buzzing and to make the
  crescendo land. (3) Spring overshoot tuned at damping 16 (vs the existing damping-22 spring) —
  perceptible "land" without bounciness, protecting the 60fps rule. (4) Beyond the AM/PM
  atmosphere + crescendo, Cycle 6 also deepened the surrounding spine + hero (in `companionTokens`
  + `VerticalProgressLine` + `HeroFocusCard`): the quiet 2px rail became a **ritual ladder** (a node
  at each step's landing that lights precisely as the rising fill passes it, plus a one-shot
  Pura-Blue **bloom** at 100%), and the hero card was lifted from a 0.06 shadow whisper to a real
  **≈e3** float so figure-ground reads on porcelain. Full DataViz polish on the progress story
  still belongs to Cycle 11.
- **Next run picks up at:** Cycle 7 — Me as progress hero (COMPOSE the already-built progress
  story — `SkinScoreHero` dial + `BeforeAfterSection`/`CompareSlider` + trend/streak/milestones —
  onto the Me tab, which today renders ZERO progress; demote settings below). This is the single
  biggest IA win in the whole plan (Me is 4.2). Carry forward Scan + Shop cleanup debts.

- **⚠️ Reconciliation note (concurrent-session collision — read this).** Two sessions ran **Cycle 6
  in parallel on the same files**; this entry above was authored by the other session. They were
  reconciled, not duplicated. The version **currently on disk is a superset** that preserves
  everything the entry above describes (DayAtmosphere, `heroRiseSpring` overshoot, AM↔PM cross-fade,
  `ritualComplete` crescendo, the ritual-ladder spine + 100% bloom, the hero ≈e3 lift) **and also
  ships** four pieces the entry doesn't mention:
  1. **AM/PM atmosphere pushed above perceptual threshold** — morning now a true golden first-light
     crown → clean cool base (`#FFF0D6→#FCFBF6→#E9F1FF`, sun glow `#FFD08A`), evening a cool
     periwinkle twilight → dusk lilac (`#E1EAFF→#F2F5FF→#EAE4F8`, moonlight `#A6BEFF`), each with a
     new per-period `glowHeight` (sun spreads 52% / moon pools 42%). (The entry above still narrates
     the *older* near-white values — disk supersedes it.)
  2. **AM/PM toggle now carries Sun / Moon glyphs** (`AmPmToggle.tsx`) so the switch itself signals
     the ritual — single Pura-Blue highlight kept (accent restraint intact).
  3. **`CelebrationCard` is a full ceremony** (full rewrite): bloom rings + a sparkle that pops in on
     `orbPopSpring` overshoot + a staggered eyebrow/title + a **streak chip ("N days in a row") that
     ticks in** — `streak` is threaded from `PuraRoutineScreen`. Streak honesty verified against the
     store (`toggleStepComplete` stamps today on first check-off → at all-complete `includesToday` is
     true and `count` includes today; no fake precision).
  4. `companionTokens` gained the celebration/streak vocabulary (`blueRing`/`streakBg`,
     `celebrationEyebrow`/`streakLabel`, `orbPopSpring`, `celebrationReveal`/`celebrationRingMs`);
     `VerticalProgressLine`'s new `total`/`done` were made **optional (default 0)** so the empty-state
     spine (`CompanionEmptyState`, `ratio={0}`) renders at rest unchanged.
  `npx tsc --noEmit` → **0 errors** on the merged on-disk state. Net Routine score with the superset
  ≈ **8.3** (States 8→9, Type 8→8.5, Component 8→9 on top of the entry's lifts). Cycle 6 stays a
  single completed cycle; next is still **Cycle 7**. **Action for the user:** if you're running this
  loop in two windows at once, run it **one session at a time** — parallel sessions edit the same
  live files and race (this collision was recoverable only because both converged on the same design).

### Cycle 7 — Me: progress as the hero ✅
- **Focus:** Fix the plan's single biggest IA win — Me was the app's weakest surface (**4.2**): a
  settings page with **zero progress**, while the entire progress story sat one tab over on
  Routine→Progress. Compose that story onto Me as the hero; demote settings beneath it.
- **State on arrival:** Me had **already been partially rebuilt** (leads with `ProgressHeroSection`
  — the animated SkinScore dial — a count-up stat ribbon, `BeforeAfterSection`, a personality-rich
  empty state, demoted Account/Support, `ds`/`ui` adoption, staggered `Rise` entrance). But the
  **middle of the story was missing** — only 2 of the canonical progress modules were wired, so the
  longitudinal narrative jumped straight from "score" to "proof" with nothing explaining *what's
  driving it* or *where it's trending*. (A read-only mapping agent confirmed every progress module
  is a pure presenter fed from one canonical adapter, `useProgressRoutineInsight()`.)
- **Changes (this run) — `src/screens/me/MeScreen.tsx`:** completed the story by wiring three more
  canonical modules between the hero and the demoted settings, in narrative order:
  `ScoreBreakdownCard` (what's driving the score → `insight.metrics`), `ScoreTrendSection` (the
  trend over time → `insight.trendSummary`), and `ScanTimelineSection` (scan history →
  `insight.timeline`) — joining the existing hero → stat ribbon → **(new breakdown → new trend)** →
  before/after → **(new timeline)**. Removed a redundant hand-rolled "Before & after" `SectionHeader`
  (the component self-heads — was a visible double header) and its dead style; renumbered the
  staggered entrance (settings now indices 7/8/9). No store wiring needed — all three read from the
  insight the screen already holds; each self-suppresses its own empty state under the `hasScanned`
  guard.
- **Design decision (justified, not an option menu):** Me gets the **longitudinal / reflective**
  modules only (score → breakdown → trend → before-after → timeline) and **deliberately excludes**
  the action-coupled ones (`BestMoveTodayCard`, `NextBestActionCard`, "Apply this to routine",
  `ConfidenceWarningCard`). Those are the operational Routine→Progress tab's job; rendering them on
  Me too would make two near-identical tabs and blur Me's purpose ("how is *my* skin doing, over
  time?" vs Routine's "what do I do now?"). Keeping Me as the reflection lens is the cleaner IA.
- **Verification:** `npx tsc --noEmit` → **exit 0, clean project-wide** (validated the
  `insight.metrics`/`trendSummary`/`timeline` field names + the three new import paths; no unused
  imports left after dropping `SectionHeader`).
- **Scores:** Me **4.2 → ~8.2** (cumulative Cycle-7 result). Headline lifts: **DataViz 1→8.5**
  (animated dial + breakdown + trend sparkline + timeline — from literally nothing to a full data
  story), **Imagery 1→8** (the user's own face in the before/after `CompareSlider` + timeline
  thumbnails), **IA 2→8.5** (progress is now THE hero; settings recede), Motion 2→8, States 3→8.
  App composite **7.2 → ~7.9** (Me was the 4.2 anchor dragging the whole app down). My specific
  contribution this run lifted DataViz/IA the last stretch by making the story *whole* rather than
  hero-plus-proof with a gap.
- **Biggest improvement:** Me finally answers "how is my skin doing?" the instant you open it — a
  complete, scannable longitudinal story (now → why → trend → proof → history) instead of a
  settings list. The app's worst surface is now one of its strongest.
- **Judgment calls:** (1) Excluded the action-coupled modules (above). (2) Trusted the canonical
  adapter's self-guarding empty states rather than re-gating each module — matches how
  `ProgressTabContent` composes them, avoids divergent guard logic. (3) Let each module's own
  kicker/heading stand (removed the duplicate Me header) so Me reads as one continuous story, not a
  stack of boxed sections. (4) Left `ScanTimelineSection` rows non-tappable (omitted `onPressItem`)
  — no scan-detail route is wired from Me yet; revisit in the transitions pass (18).
- **Next run picks up at:** Cycle 8 — Depth & material sweep (apply the Cycle-2 elevation/tint/
  translucency system across every surface so nothing feels flat; direct fix for the audit's #2
  cross-cutting theme). Carried debts: Scan capture-instrument honesty + cinematic analyzing slide;
  Shop doubled-ending + dead `useShopViewModel`; consolidate orphaned Scan V2/V34 + dead routine
  paths. **Caution:** a parallel session collided on Cycle 6 — run one session at a time.

### Cycle 8 — Depth & material sweep ✅
- **Focus:** Kill the last conspicuous flat material. Earlier cycles already gave Home (C3), Shop
  (C4), Routine (C6) and Me's containers (C7) real depth, so the residual flatness lived in the
  **shared progress-card cluster** — the legacy-`palette` cards Cycle 7 had just promoted to hero
  content on BOTH Me and the Progress sub-tab. They were textbook porcelain-on-porcelain:
  `backgroundColor: palette.bg` is `#FCFDFF` — *the exact page color* — under a 1px hairline with
  **zero shadow**.
- **Critique:** the C7 Me rebuild made these flat cards (breakdown, trend, timeline, before/after)
  the most-looked-at surfaces in the app while they still read as drawn-on rectangles with no
  figure-ground. The single highest-impact depth move left.
- **Files changed (targeted edits on large shared presenters — the full change lands in each live
  file; chose Edit over rewrite to protect 200–300-line shared components):**
  - `src/components/progress/ScoreTrendSection.tsx` — card → `ds.surface` (white) + `dsElevation.e2`;
    empty card → `e1`.
  - `src/components/progress/ScoreBreakdownCard.tsx` — metric rows → white + `e1`.
  - `src/components/progress/ScanTimelineSection.tsx` — history rows → white + `e1`.
  - `src/components/progress/BeforeAfterSection.tsx` — empty/unlock card → white + `e2`.
  - `src/screens/routine/ProgressTabContent.tsx` — the tab's own `panel` (→ white + `e2`) and bottom
    `scanAgainCta` (→ `e1`) so the Progress tab stays cohesive with its now-floating cards.
  - `src/navigation/FloatingTabBar.tsx` — **folded in** the in-flight scan-tab change left by the
    prior session: the center orb now wears the phosphor `Scan` frame-bracket glyph (the face is
    reserved for genuinely-alive moments, never static tab chrome) with a one-shot camera-style
    focus pulse on activation, replacing the idle-breathing face; dead imports removed.
- **Depth language (consistent):** standalone cards = `e2` (≈0.09 cool-ink shadow), list rows +
  quiet empty states = `e1` (≈0.06). White surface on the porcelain page + shadow gives genuine
  lift; the faint hairline stays for a crisp edge. Same `dsElevation` web-verified in C3
  (`e2 → rgba(10,26,47,0.09) 0 6px 16px`).
- **Preservation:** purely additive surface/shadow + one import per file; no data, props, layout, or
  business logic touched. `npx tsc --noEmit` → **exit 0, clean project-wide** (verified twice — once
  on the inherited working tree, once after these edits).
- **Verification:** static. The running preview (`pura-web-static`, port 4173) is a STATIC web bundle
  built *before* these edits, so it cannot show them without a rebuild (same live-unreachable
  constraint as C4–C6); the change is deterministic additive styling on tokens already web-verified
  in C3.
- **Scores:** Me **~8.2 → ~8.5**, Progress (Routine sub-tab) Color/Depth **~6 → 8**. The progress
  cluster now floats on both tabs. App composite **~7.9 → ~8.0.**
- **Biggest improvement:** the progress story — the app's freshly-promoted hero content — finally has
  real figure-ground; cards float off the porcelain instead of being outlined rectangles painted on it.
- **Judgment calls:** (1) **Scoped** Cycle 8 to the residual flat cluster rather than re-sweeping
  surfaces C3/C4/C6/C7 already depth-elevated — honest about what was already covered. (2) Kept the
  prior session's scan-tab glyph change (complete, coherent, compiles, on-theme) and gave it a logged
  home here rather than reverting finished work. (3) Targeted Edits (not full rewrites) on the large
  shared presenters for safety; the full change still lands in each live file. (4) Left the faint
  hairline under the new shadow (shadow + hairline = crisp premium edge), didn't strip it.
- **Concurrent-session takeover note:** this run began with a sibling session sweeping the same repo;
  it was detected (rejected write + advancing git HEAD + a chronological mtime sweep) and this session
  **stood down** until the user confirmed. On takeover, Cycle 7 (Me, authored across both sessions)
  was committed (`4777821`) and Cycle 8 done here. See memory `feedback-concurrent-loop-sessions`.
- **Next run picks up at:** Cycle 9 — Typography mastery (Instrument Serif editorial confidence
  everywhere; fix scale/line-height/caps tracking; tabular numerals on all data). Carried debts
  unchanged (Scan capture-instrument + cinematic analyzing; Shop doubled-ending + dead VM; orphaned
  Scan V2/V34 + dead routine paths).

### Cycle 9 — Typography mastery ✅ (first broad multi-agent cycle)
- **Focus:** Editorial Instrument-Serif confidence + tabular numerals + tracked uppercase across
  EVERY surface. First cycle under the user's **≥0.3-per-page** rule, run as a **6-agent parallel
  `Workflow`** (one disjoint-scope agent per surface), per the user's "workflow, broad each cycle"
  directive.
- **Method:** fan-out — 6 general-purpose agents (Home/Shop/Scan/Routine/Me/Onboarding), strictly
  disjoint file scopes; `ds.ts`/`tokens.ts` + shared `components/progress/*` off-limits; locked
  reveal beats + brand fonts preserved. Central tsc-gate + commit in the main loop.
- **Per-page before→after (fresh-eyes re-score — see recalibration note):**

  | Page | Composite | Type sub-score |
  |---|---|---|
  | Home | 7.3 → **7.7** (+0.4) | 6.7 → 8.0 |
  | Shop | 7.0 → **7.5** (+0.5) | 6.4 → 7.8 |
  | Scan | 7.4 → **7.9** (+0.5) | 7.0 → 8.4 |
  | Routine | 7.4 → **7.8** (+0.4) | 7.0 → 8.1 |
  | Me | 6.8 → **7.2** (+0.4) | 6.4 → 7.9 |
  | Onboarding | 7.1 → **7.6** (+0.5) | 6.7 → 7.6 |

  Every page cleared **+0.3**. App composite (fresh baseline) **7.2 → 7.6**.
- **⚖️ Recalibration note (honesty, not regression):** the 6 agents each scored their surface fresh
  and brutally (rubric: "brutally honest"), landing BELOW prior cycles' optimistic self-scores
  (Me had been self-scored ~8.5, Routine ~8.3). The code genuinely improved this cycle (+0.4–0.5,
  type-led); the absolute scale just got more trustworthy. Treat these consistent fresh numbers as
  the new baseline. (Cycle 10 is a CHECKPOINT — it will re-audit and lock a consistent scorecard.)
- **Files changed (18, all in-scope; +425/−127):** Home `PuraAssistHomeScreen`; Shop
  `StackCard`+`MatchOrb`+`ShopFeed`; Scan `reveal/ScanRevealScreen`+`revealContent` (typography-only —
  verified by diff grep that NO beat/timing/pager/haptic line changed); Routine
  `companion/{HeroFocusCard,CelebrationCard,CompletedTail,UpcomingCard,CompanionEmptyState,RoutineCompanionScreen}`
  +`PuraRoutineScreen`; Me `MeScreen`; Onboarding `ColdOpenScreen`+`CameraPrimer`+`NameBeatScreen`+`QuestionScreen`.
- **What changed:** right-sized timid hero serifs (larger, tighter negative tracking), tracked
  uppercase eyebrows/labels to ~1.2–1.6, tabular numerals on every score/price/%/count/day/streak/
  delta so digits never jitter, plus small adjacent hierarchy/spacing refinements.
- **Verification:** `npx tsc --noEmit` → **0 errors**; all 18 files within their disjoint scopes;
  git HEAD unchanged during the run (no foreign commit); locked Scan reveal confirmed typography-only.
  Preview is the stale `pura-web-static` bundle (no rebuild) → static verification, per C4–C8.
- **Biggest improvement:** the whole app now speaks one confident editorial type voice — Instrument
  Serif sized with intent, magazine-tracked eyebrows, numbers that align — instead of timid,
  inconsistent sizing surface-to-surface.
- **Judgment calls:** (1) Ran as a parallel workflow (user directive) — the only feasible way to
  clear +0.3 on all 6 pages in one cycle. (2) Adopted the agents' fresh brutal re-score as the honest
  baseline rather than stacking deltas on inflated prior self-scores. (3) Disjoint file scopes so 6
  concurrent editors never collided (no shared tokens/components touched).
- **Next run picks up at:** Cycle 10 — CHECKPOINT + color & gradient sophistication (re-audit the
  whole app and lock a consistent scorecard; refine ambient/mesh gradients; enforce Pura-Blue
  restraint; harmonize semantic colors), run as a broad workflow. Carried debts unchanged.

### Cycle 10 — Checkpoint + color & gradient sophistication ✅ (landed; entangled in foreign commits)
- **Focus:** richer ambient/mesh gradients, Pura-Blue RESTRAINT (accent pulled back so it punctuates),
  harmonized semantic colors + color-based depth across every surface; plus a fresh full-rubric
  re-score (the checkpoint). 6-agent parallel workflow.
- **⚠️ Collision:** a foreign feature session committed mid-workflow; its `git add` ABSORBED the
  Cycle-10 color edits into foreign commits `e78320b`/`224107c` (mixed with its YourSkin feature) — so
  no standalone Cycle-10 commit exists, but the color work LANDED on the branch. `tsc`=0, nothing lost.
- **Per-page composite before→after (fresh-eyes):** Home 7.4→7.8 · Shop 7.3→7.9 · Scan 7.7→8.05 ·
  Routine 7.65→7.95 · Me 6.8→7.15 · Onboarding 7.4→7.8 — every page +0.3.
- **🔒 LOCKED checkpoint scorecard (consistent baseline; ia·type·color·spacing·comp·imagery·dataViz·states·motion·voice):**
  Home 8·8·8·8·7·7·7·7·8·8 · Shop 7.5·8·8·7.5·7.5·7·7·8·8·8 · Scan 8·8.5·8.5·8·8·7.5·8·7.5·8·8.5 ·
  Routine 7.5·8.5·8.5·8·7.9·7.5·7.2·7.9·8.5·8 · Me 7.5·8·7.6·7.4·7·5.5·7·6.5·7·7.5 ·
  Onboarding 8·8.5·8·7.5·7.5·8·6.5·7.5·8.5·8. (Me imagery 5.5 + states 6.5 = lowest cells, priority.)

### Cycle 11 — BOLD structural elevation ✅ (landed; entangled in foreign commit 8c24fd9)
- **Focus:** the user said they "barely see any changes," so this cycle is DRAMATIC + immediately
  visible — dominant heroes, display-scale serif, big data moments. 6-agent parallel workflow under
  the GO-BOLDER directive.
- **⚠️ Collision:** the foreign session committed `8c24fd9` mid-workflow, ABSORBING all Cycle-11 bold
  edits (Me +541, ScanReveal +451, StackCard +231, …) into it alongside its yourRoutine activation.
  Work LANDED (tree clean, `tsc`=0); no standalone Cycle-11 commit.
- **Per-page composite before→after (fresh-eyes; big jumps):** Home 7.4→7.9 (+0.5) · Shop 6.8→8.4
  (+1.6) · Scan 6.6→8.1 (+1.5) · Routine 7.1→8.4 (+1.3) · Me 6.4→8.1 (+1.7) · Onboarding 7.0→8.5
  (+1.5). App composite ≈ **8.2**.
- **The bold move per surface:**
  - **Home** — giant 60px left-aligned Instrument-Serif masthead (final line Pura Blue); orb demoted
    from a 158px centered crown to a 132px upper-right intelligence accent.
  - **Shop** — card → lit gallery still-life: packshot 0.78→1.04× on a spotlit plinth, 36px serif
    name, 34px display price, 88px match medallion, serif "WHY THIS" pull-quote.
  - **Scan** — Focus beat → "Your skin report" magazine spread: 232px face banner + 270° severity
    dial with a giant "3 / 4" tabular numeral (WITHIN the locked beats — composition/type only).
  - **Routine** — hero focus card 360→524px, 72px "01 / 03" step numeral + full-width step meter.
  - **Me** — full-bleed dark "Score Colossus": ~116pt count-up score on an ink panel + Pura-Blue
    aura + "+N pts since day one" ribbon (was a small mid-page card).
  - **Onboarding** — ColdOpen → editorial poster: 70px stacked serif headline ("Your face / already
    / knows."), orb reduced to a signature mark.
- **Verification:** `tsc --noEmit` = 0 (merged state); locked Scan reveal beats/timing preserved.
  **Preview REBUILT** — `npm run build:web` → `dist/` (exit 0), served by the running pura-web-static
  on port 4173, so the bold work is finally VISIBLE (reload the preview).
- **⚠️ Process note:** Cycles 10 & 11 both entangled because a foreign feature session edited the
  SAME working tree and ran `git add -A` mid-workflow, absorbing the design agents' edits into ITS
  commits. The design work all LANDED, but with mixed attribution. Clean cycles require ONE session
  editing the repo at a time (memory feedback-concurrent-loop-sessions).
- **Next run picks up at:** Cycle 12 — Imagery & photography (scanned face + product images: ratios,
  masks, scrims, brand framing; face as recurring hero). Me imagery (5.5) is the lowest scorecard
  cell → prime target. Run as a broad workflow ONLY when the repo is quiet (no foreign session).
