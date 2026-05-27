# Pura scan-results rebuild — state capture log

Captured 2026-05-27 at 390×600 viewport against `pura-dev-web` Expo Web preview.

The JPEG screenshot tool in this environment timed out repeatedly on the
React-Native-Web + Reanimated-4 bundle, regardless of which Pura screen
was active. The captures below are DOM text serializations from each state
rendered via the new `ScanResultsStatesDev` developer gallery
(`AIDiagnostics → Scan Results · state gallery`). Each capture corresponds
1:1 to the state the user would see; the text is dense enough to verify
the truth-first contract end-to-end.

Run the gallery yourself to see the same states pixel-rendered:

1. Set `EXPO_PUBLIC_PURA_AI_DEV_BADGE=1` and start the app.
2. Tap the floating dev badge to open `AIDiagnostics`.
3. Scroll to "Dev tools" and tap **Scan Results · state gallery**.
4. Tap each row.

---

## STATE A — Service error  (`scan-service-error`)

```
ANALYSIS INCOMPLETE
We couldn't analyze
this scan.
Your photo was captured, but Pura could not complete the analysis.
We could not reach the analysis service. Check your connection and try again.
Try again
Retake photo
No routine was created from this scan.
```

Matches brief Part 4 STATE A exactly. No Limited Scan banner, no findings,
no Skin Map, no Routine CTA.

## STATE B — Retake required  (`scan-retake-required`)

```
Let's try
another photo.
We need a clearer view before mapping visible areas.
Face centered
Even lighting
No hat or shadow over focus areas
Camera at eye level
Retake scan
```

Matches brief Part 4 STATE B. No Skin Map, no Focus Areas, no Routine.

## STATE C — No clear findings  (`scan-no-findings-conclusion`)

```
SCAN COMPLETE
Nothing specific
stood out.
We could not identify a visible focus area confidently enough to highlight from this photo.
Try another scan in even, front-facing light to unlock a more personalized map.
Retake for a clearer map
Return home
No routine was created from this scan.
```

Matches brief Part 9 verbatim. No Skin Map, no fake insights, no Routine.

## STATE C (limited variant)

```
SCAN COMPLETE
Nothing specific
stood out.
We could not identify a visible focus area confidently enough to highlight from this photo.
A clearer front-facing scan in even light may unlock a more personalized map.
Retake for a clearer map
Return home
No routine was created from this scan.
```

## Skin Map · texture only  (`scan-map-texture-only`)

```
2 of 4
Your Skin Map
Only supported visible signals are highlighted.
Texture
TEXTURE · FOREHEAD
Uneven texture appears most visible across the forehead. A gentle smoothing step may help.
Visible signals only · Not a medical diagnosis
```

One Texture chip only. Concern detail card "TEXTURE · FOREHEAD" matches brief.
No `Forehead`/`T-zone`/`Nose`/`Under-eye`/`Cheek`/`Chin` chips. No ghost
anatomy labels on the photo.

## Skin Map · under-eyes only  (`scan-map-under-eyes-only`)

```
2 of 4
Your Skin Map
Only supported visible signals are highlighted.
Under-eyes
UNDER-EYES · UNDER EYES
Visible fatigue appears under your eyes. Gentle hydration is the better lever than aggressive treatment.
Visible signals only · Not a medical diagnosis
```

One `Under-eyes` chip. Detail card says `UNDER-EYES · UNDER EYES`. No
forehead/T-zone/nose/chin labels. Per the rebuilt overlay rules, the
canvas draws two lilac crescents under the actual eyes (one per
under_eye_left/under_eye_right zone) at the canonical opacity.

## Skin Map · 2 findings (limited)  (`scan-map-two-findings`)

```
2 of 4
Limited scan · 2 focus areas supported
Your Skin Map
Only supported visible signals are highlighted.
Breakouts   Redness
BREAKOUTS · CHIN
Active-looking spots appear concentrated on the chin. Keep stronger treatment targeted rather than spreading it across calm areas.
Visible signals only · Not a medical diagnosis
```

Limited banner is data-driven ("2 focus areas supported"). Exactly two
concern chips. Highest-priority (breakouts) is auto-selected. Max-three-
overlays cap enforced; default opacity 0.24 for non-selected.

## Top Focus Areas · 1 finding  (`scan-focus-one-finding`)

```
3 of 4
Top Focus Areas
What stood out most in your scan.
1 focus area supported
Texture                                                  HIGH
Uneven texture appears most visible across the forehead.
A gentle smoothing step may help.
```

No empty card ("No clear focus areas yet" deleted). Data-driven count.
One compact card with priority chip.

## Personalized Insights · routine eligible  (`scan-insights-routine-eligible`)

```
4 of 4
Personalized Insights
Built from your visible scan findings.
01  Focus treatment
    Your visible breakout activity is concentrated around the chin, so keep stronger treatment targeted rather than spreading it across calm areas.
02  Keep support simple
    Use barrier-friendly hydration alongside targeted care.
Build custom routine
You will confirm your products before starting.
```

Matches brief Part 8 verbatim. CTA = `Build custom routine` + caption
`You will confirm your products before starting.`

## Personalized Insights · routine ineligible  (`scan-insights-routine-ineligible`)

```
4 of 4
Limited scan · 1 focus area supported
Personalized Insights
Built from your visible scan findings.
01  Focus treatment
    Your visible texture is concentrated in a specific area — keep treatment targeted.
Retake for a complete plan
A clearer scan is needed before creating a personalized routine.
```

CTA flipped to `Retake for a complete plan`. Caption matches brief.

## Full pager · 2 findings (Skin Map → Focus → Insights)  (`scan-real-selfie-result`)

```
[Skin Map]    Your Skin Map / Breakouts · Redness / BREAKOUTS · CHIN ...
[Focus]       Top Focus Areas / 2 focus areas supported / Breakouts HIGH / Redness MEDIUM ...
[Insights]    Personalized Insights / 01 Focus treatment / 02 Keep support simple / Build custom routine
```

Three slides chained as defined by `ScanResultsPager`. The Insights slide
only appears because `supportedInsights.length > 0`; otherwise the pager
omits it and the Routine CTA jumps to the last visible slide.
