// The 7 mounted scan-first onboarding screens (Welcome / CameraTrust /
// GuidedFirstScan / ScanReview / BaselineReveal / TonightRoutine /
// SaveProgress) were removed when the question-first onboarding was
// restored. The screens below remain on disk but are not mounted.
export { PrimaryGoalV2, type PrimaryGoalV2Props } from './PrimaryGoalV2';
export {
  ProcessingV2,
  type ProcessingV2Props,
  type ProcessingOutcome,
} from './ProcessingV2';
export {
  SafetyCalibrationV2,
  type SafetyCalibrationV2Props,
} from './SafetyCalibrationV2';
export {
  RoutineSimplicityV2,
  type RoutineSimplicityV2Props,
} from './RoutineSimplicityV2';
export { PlanRevealV2, type PlanRevealV2Props } from './PlanRevealV2';
