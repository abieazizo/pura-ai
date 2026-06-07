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
- ⚠️ ORPHANED but high-value (salvage onto path): `src/screens/scan/ScanResultsV2Screen.tsx` +
  `FindingCardV2` — a real editorial per-finding report (severity/zone/observation/why/
  recommendation). Only a fallback/history screen today; the live reveal shows the *shallow*
  "Focus Areas" cards (name + priority pill + one phrase).
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
| Shop | 8 | 7 | 6 | 7 | 8 | 6 | 7 | 7 | 6 | 9 | **7.1** |
| Scan | 6 | 7 | 7 | 7 | 7 | 5 | 6 | 8 | 6 | 8 | **6.7** |
| Routine | 8 | 8 | 5 | 8 | 8 | 7 | 6 | 8 | 7 | 9 | **7.4** |
| Me | 2 | 7 | 5 | 7 | 7 | 1 | 1 | 3 | 2 | 7 | **4.2** |
| Onboarding | 8 | 9 | 8 | 7 | 8 | 8 | 6 | 9 | 9 | 9 | **8.1** |
| **App** | 6.6 | 7.7 | 6.3 | 7.3 | 7.5 | 5.7 | 5.3 | 7.0 | 6.3 | 8.3 | **6.8** |

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
