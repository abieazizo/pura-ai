/**
 * "Your Routine" — the calming ritual a present companion walks you through.
 * Three first-class modes: the first-time reveal morph (A), the serene daily
 * home (B), and the orb-led guided ritual (C). Every step traces to a scan
 * finding; the orb is a persistent shared element; consistency is what works.
 */

export { YourRoutineTabScreen } from './YourRoutineTabScreen';
export { YourRoutineExperience } from './YourRoutineExperience';
export type { YourRoutineExperienceProps, ExperienceMode } from './YourRoutineExperience';
export { YourRoutineDevHarness } from './YourRoutineDevHarness';
export { buildYourRoutineModel } from './model';
export type { YourRoutineModel, StepVM, MoveVM, FocusVM, BundleVM } from './model';
export { lintVoice, VOICE, VOICE_RULES } from './voice';
export { getHapticLog, beginHapticLog } from './ritualHaptics';
