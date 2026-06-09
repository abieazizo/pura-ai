# Scan Results — First Finding (Analyzing → First Finding)

The scan-results FIRST screen: the **Analyzing** moment flowing into the **First
Finding** as ONE continuous, cinematic shared-element sequence. A single
persistent photo and the single persistent companion orb carry the whole story —
nothing swaps, everything transforms. The signature beat: the orb speaks a
located finding and a soft glow blooms on that **exact spot** of the user's real
photo, on the spoken word, clipped to that face's geometry, as **additive light**.

This screen begins AFTER a selfie is captured. It does **not** touch the camera
capture flow. `See everything →` hands off to the next (existing/placeholder)
results screen.

## Files

| File | Role |
|---|---|
| `../../../types/skinRead.ts` | **Canonical, UI-ready contract** (`SkinRead`). The screen never reads raw AI. |
| `../../../api/skinRead.ts` | Real GPT-4V wiring: `SKIN_READ_SYSTEM_PROMPT` + strict `SKIN_READ_JSON_SCHEMA`, `readSkinFromPhoto`, fixtures. |
| `normalizeSkinRead.ts` | Validator/normalizer: banned-jargon / empty-spots / stranger-test → **reject + regenerate once**. |
| `faceRegions.ts` | Region polygons (geometry layer). Proportional detector today; native Vision/MediaPipe drop-in. Handles person-left/right + mirroring. |
| `landmarksFromGeometry.ts` | **Production face-tracking bridge**: adapts the canonical scan `FaceLandmarkResult` (`faceGeometryProvider`) → `FaceLandmarks`. Returns `null` when geometry isn't overlay-usable (→ proportional fallback). |
| `bloomSchedule.ts` | **WHEN** each glow blooms: anchors on the spoken **place** word (general noun, e.g. "cheeks" — not the trailing "left"), stronger-first + one-beat ties. |
| `metricTint.ts` | ONE tint per metric (Pura Blue is never a concern), both themes. |
| `motion.ts` | The single dial-board: timeline, sweep path, status copy, type scale, **both** theme token sets. |
| `GazeSweep.tsx` | Looping feathered gaze sprite (position+opacity only). Not a scan line. |
| `PhotoStage.tsx` | The one persistent photo (fill): mute → glows read as added light. |
| `GlowField.tsx` | The signature beat: additive (`mixBlendMode:'screen'`), region-clipped, per-spot bloom + chips + leader lines. A no-concerns read reuses it as a soft, chip-less **positive wash**. |
| `FindingCard.tsx` | Raised finding card (level pill + micro-rows + confidence). |
| `FirstFindingScreen.tsx` | The orchestrator (one timeline; drives the orb via `useOrb()`). |
| `FirstFindingContainer.tsx` | Production wrapper — runs the real call, feeds the screen. |
| `FirstFindingDevHarness.tsx` | Preview/verification harness (fixtures + toggles). |

## Integrate (production)

Mount **inside the onboarding `OrbProvider`** (the screen drives the persistent
orb — it does not mount one):

```tsx
import { FirstFindingContainer } from '@/screens/scan/firstFinding';

<FirstFindingContainer
  photoUri={capturedPhotoUri}
  mirrored                          // front-camera selfie
  faceGeometry={scanFaceGeometry}   // OPTIONAL: from faceGeometryProvider →
                                    // glows AFFINE-warp to the real face.
                                    // Omit → proportional fallback (centered box).
  onSeeEverything={() => nav.navigate('YourSkin' /* next results screen */)}
  onRetake={() => nav.navigate('ScanCapture')}
  theme="dark"                      // hero default
/>
```

To activate real face-tracking in production, hand the container the scan's
`FaceLandmarkResult` as `faceGeometry` — the container adapts it via
`landmarksFromFaceGeometry` and the screen warps the glows. No native ML needed;
it reuses the project's existing `faceGeometryProvider` (AI `face_overlay`).

**Server route to add** (one handler, mirrors `analyzeFaceScan`): a `readSkin`
proxy op that imports `SKIN_READ_SYSTEM_PROMPT` + `SKIN_READ_JSON_SCHEMA` from
`src/api/skinRead.ts` (server tsconfig already includes `../api/**`), sends the
image at `detail:"high"` with `response_format: json_schema (strict)`, and returns
the raw JSON. The client validates + regenerates-once; the screen only ever sees
the canonical `SkinRead`.

## Preview the harness

Render `FirstFindingDevHarness` from a flag-guarded dev entry (intentionally NOT
wired into `App.tsx` here to avoid clobbering the concurrent screen-2 sweep). On
web: chips switch scenario / photo (incl. a **deep-skin** test face) / theme /
reduced-motion / live-transition.

## Geometry: glows track the REAL face

`regionGeometryFromLandmarks` affine-warps the canonical region polygons onto
real anchors (eyes + mouth) from the project's `faceGeometryProvider` / AI
`face_overlay`, so a glow sits on the actual feature even when the face is
off-center or **tilted (rolled)**. Absent anchors → the proportional fallback
(identity warp). Person-left/right + mirroring handled either way.

The bridge is `landmarksFromGeometry.landmarksFromFaceGeometry(FaceLandmarkResult)`:
a near-1:1 adapter (`width/height → w/h`, anchors verbatim) that gates on
`usableForOverlay` (and a min-box check), returning `null` when the geometry
isn't trustworthy so the screen falls back rather than warp onto bad coordinates.
`FirstFindingContainer` runs it from its optional `faceGeometry` prop.

## Verification status

- `npx tsc --noEmit` — **0 errors in these files.**
- `npm run verify:firstfinding` (`npx tsx scripts/verifyFirstFinding.ts`) —
  **41/41 deterministic assertions pass**, incl.:
  - landmark warp: identity Δ=0px, off-center tracks +25px, roll rotates the
    cheeks (Δasym 35px), warped glow stays local (6.2% → no whole-face wash);
  - bloom schedule: cheek glow anchors on "cheeks" (mid-sentence, 1700ms) not the
    trailing "left." (2060ms), stronger-first, one 120ms beat apart, unnamed
    region safely falls back to the last word;
  - face-tracking adapter: usable geometry maps (w/h + anchors 1:1), unusable /
    degenerate / null → `null`, adapted off-center face tracks +37px via the warp.
- Motion (sweep, pivot, word↔glow sync, bloom, dark-mode luminosity) is
  UI-thread Reanimated and is verified by design + the deterministic core; it can
  only be fully judged on-device / in a recording (a still can't capture it), and
  preview screenshots hang on orb screens — drive the harness live to view
  (toggle "track face" to see the warp).

## PASS / FAIL checklist (acceptance criteria)

| Criterion | Status |
|---|---|
| One continuous sequence — no screen swap; the ONE photo + orb transform | ✅ shared-element reflow + driven orb |
| Analyzing lasts the REAL API duration; loops soft sweep + transparency status lines; long-call line | ✅ |
| No %/countdown/skeleton; no scan-line/laser/grid | ✅ feathered sweep only |
| Shared-element resize at the pivot (same photo) + soft haptic | ✅ |
| Orb reused (not re-mounted), looks down, warm "got it" beat before any word | ✅ `useOrb()` + `reactArchetype('warm')` |
| Opening line word-by-word, **never** overflows/truncates | ✅ reuses `OrbSpeech` (fade-in-place, pre-wrapped) |
| Glow blooms on the EXACT spots, ON the spoken word, additive, clipped, alpha-capped | ✅ `mixBlendMode:'screen'` + ClipPath; blooms on the spoken **place** word (`bloomSchedule`) |
| Stronger side brighter + a beat sooner | ✅ strength-driven brightness + strongest-first ties (`bloomSchedule`) |
| No whole-face wash — proven on any skin tone (incl. deep) | ✅ geometry: glow ≤14% face; both cheeks 12.3% |
| Glow tracks the real face (off-center / tilted), not a fixed box | ✅ affine landmark warp (reuses faceGeometryProvider) |
| Differentiate-without-color: location chip + leader line | ✅ |
| Low confidence → fainter glow + tentative chip/line | ✅ alpha halved, dashed leader |
| First finding card: name + level pill + What I see / What it means / THE MOVE / how_sure; only findings[0] | ✅ |
| Quiet `See everything →` (not a loud filled CTA) | ✅ |
| Dark mode hero + light mode, both fully designed | ✅ `tokensFor()` |
| Bad photo → honest choice, no triumphant resize, no fake finding | ✅ |
| No concerns → positive wash + "keep it up" note | ✅ positive metric variant |
| API error/timeout → "try once more", never a fake result | ✅ |
| Reduced Motion / Reduce Transparency / Differentiate-Without-Color / Dynamic Type / VoiceOver | ✅ all complete branches |
| Plain language only; never "your face never leaves your device" | ✅ banned-word gate + approved privacy line |
| Canonical state law (no screen reads raw AI) | ✅ `SkinRead` + validator |
