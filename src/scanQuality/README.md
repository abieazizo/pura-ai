# scanQuality — real camera-quality detection engine

One reactive hook (`useScanQuality`) that genuinely measures the live
camera feed and exposes, ~12–15×/sec:

- **Continuous smoothed 0–1 signals** — `framingScore`, `lightScore`,
  `sharpnessScore`, `poseScore`, `stillnessScore`, plus raw `lightLevel`
  (for the screen fill-light decision).
- **Hysteresis booleans** — `faceDetected`, `faceDistanceOk`,
  `faceCentered`, `facePoseOk`, `lightOk`, `sharpnessOk`, `allPass`.
- **`primaryHint`** — the single most actionable, kind instruction.
- **Geometry** — `faceBox` + 478 landmarks live, and a
  `CaptureQualitySnapshot` frozen at the shutter moment that travels
  with the photo (`ScanAnalyzing` route param `captureQuality`).

## Architecture

```
useScanQuality.ts        — the hook (platform-agnostic)
engine.web.ts            — WEB provider: MediaPipe FaceLandmarker (VIDEO
                           mode, rAF loop @ ~15 Hz) on expo-camera's
                           <video>; luma/Laplacian stats on an offscreen
                           ~192px canvas @ ~7.5 Hz
engine.ts                — NATIVE provider: honest 'unavailable' stub
                           (swap point for the real native engine)
signalMath.ts            — PURE decision layer: targets → smoothing →
                           hysteresis booleans → hint ladder.
                           Verified by scripts/verifyScanQuality.ts
thresholds.ts            — every tunable, shared across platforms
types.ts                 — canonical contracts
```

Trust contract: nothing here fabricates a check. If the detector can't
load, `detectorStatus` is `'unavailable'`, every signal stays 0, and the
capture screen falls back to its advisory flow (countdown +
post-capture preflight).

Assets are vendored in `public/mediapipe/` (wasm + face_landmarker.task,
~15 MB total) so dev, offline, and Vercel all work without a CDN; the
CDN is only a 404 fallback.

## Coordinates

Landmarks and `faceBox` are normalized 0–1 in **raw, un-mirrored video
frame coordinates**. The front-camera *preview* is mirrored by
expo-camera CSS (`mirroredPreview: true`); flip x when projecting onto
the preview. The captured photo matches the raw video frame.

## Native plan (do NOT fake it before this lands)

Needs a dev build (not Expo Go). Swap `engine.ts` for a real provider:

1. **Detection** — `react-native-vision-camera` + an MLKit face-detection
   frame processor (e.g. `react-native-vision-camera-face-detector`),
   `performanceMode: 'fast'`, ~15 Hz. MLKit gives a face box + yaw/pitch/roll
   (`headEulerAngleY/X/Z`) directly → `presence`, `distanceScore`
   (box height ÷ frame height), `centerScore`, `poseScore` through the
   SAME `signalMath.computeTargets` ladder. MLKit has no 478-landmark mesh;
   forward its contour points in the snapshot and let firstFinding's
   `landmarksFromGeometry` densify until a mesh source lands.
2. **Stillness** — `expo-sensors` `DeviceMotion` rotationRate + landmark/box
   velocity, normalized into the same `MOTION_*` thresholds. (On web,
   camera is static and the face moves; on a phone both move — DeviceMotion
   catches hand shake the box velocity misses.)
3. **Light + sharpness** — small frame-processor plugin sampling the frame
   to a ~192px luma buffer, then reuse `computeFrameStats` verbatim
   (it's pure — runs anywhere).
4. **Thresholds** — reuse `thresholds.ts` unchanged so both platforms gate
   identically. Tune only `SHARP_VAR_*` if the camera pipeline's noise
   profile differs (document any delta here).

## Verification

- Pure layer: `npx tsx scripts/verifyScanQuality.ts` (synthetic landmark
  grids through the full decision pipeline).
- Live layer: `verification/scan-quality/` — getUserMedia is replaced
  with a canvas stream rendering a controllable real-face test card
  (move / scale / rotate / dim / blur / cover), and each manipulation
  must drive the matching signal down, flip the matching boolean, and
  surface the matching hint. See the session log for the rig script.
