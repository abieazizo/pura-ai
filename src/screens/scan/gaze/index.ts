/**
 * THE GAZE — the redesigned Face Scan experience.
 *
 * The scan is the moment Pura looks at the user with care. The live
 * feed is the canvas; the companion appears as the living framing
 * guide (GazeFrame), responding fluidly to the REAL useScanQuality
 * signals. Composed by ScanOverlay (face mode only).
 */

export { GazeFrame } from './GazeFrame';
export { GuidanceLine } from './GuidanceLine';
export { ReadinessSegments } from './ReadinessSegments';
export { ApertureEntry } from './ApertureEntry';
export { FillLight } from './FillLight';
export { CaptureBloom, type CapturePhase } from './CaptureBloom';
export { gaze, FRAME, frameGeometry } from './gazeTokens';
export { MOTION } from './gazeMotion';
