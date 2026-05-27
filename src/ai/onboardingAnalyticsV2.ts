/**
 * v25 — scan-first onboarding analytics.
 *
 * Thin event adapter on top of the existing persisted telemetry ring
 * buffer (`recordOnboardingMilestone`) so analytics are recorded
 * through the established abstraction rather than scattered console
 * calls. The spec's required events are mapped to one of:
 *
 *   • the persisted milestone enum (high-frequency, dashboard-grade)
 *   • a generic `detail` string under a milestone (lower-frequency)
 *
 * Privacy:
 *   • No raw face image data, no photo URIs, no PII, no asset references.
 *   • Properties are limited to short enum-like strings and integers.
 *   • Failure categories are pre-classified (poor_quality / network /
 *     timeout / unknown). Raw error messages are NOT recorded here.
 */

import {
  recordOnboardingMilestone,
  type OnboardingMilestone,
} from './persistedTelemetry';

export type V2GoalLabel =
  | 'breakouts'
  | 'redness'
  | 'dryness'
  | 'texture'
  | 'darkSpots';

export type V2ReactivityLabel =
  | 'often'
  | 'sometimes'
  | 'rarely'
  | 'unsure';

export type V2SimplicityLabel =
  | 'essential'
  | 'balanced'
  | 'decideForMe';

export type V2AuthProvider = 'apple' | 'google' | 'email' | 'guest';

export type V2GuidanceState =
  | 'searching'
  | 'too_dark'
  | 'too_close'
  | 'too_far'
  | 'off_center'
  | 'ready'
  | 'captured';

export type V2ScanFailureCategory =
  | 'poor_quality'
  | 'timeout'
  | 'network'
  | 'unknown';

// ---------------------------------------------------------------------------
// Event recorders
// ---------------------------------------------------------------------------

function record(milestone: OnboardingMilestone, detail: string | null = null) {
  recordOnboardingMilestone(milestone, detail);
}

export const onboardingV2 = {
  // Welcome
  viewWelcome() {
    record('entered_onboarding', 'welcome:view');
  },
  tapFirstScan() {
    record('entered_onboarding', 'welcome:tap_first_scan');
  },

  // Goal
  viewGoal() {
    record('entered_onboarding', 'goal:view');
  },
  goalSelected(goal: V2GoalLabel) {
    record('entered_onboarding', `goal:selected:${goal}`);
  },

  // Camera trust + permission
  viewCameraTrust() {
    record('entered_onboarding', 'camera_trust:view');
  },
  cameraPermissionPrompted() {
    record('entered_onboarding', 'camera:prompted');
  },
  cameraPermissionAllowed() {
    record('granted_camera', 'camera:allowed');
  },
  cameraPermissionDenied() {
    record('entered_onboarding', 'camera:denied');
  },

  // Guided first scan
  firstScanStarted() {
    record('first_scan_attempted', 'scan:started');
  },
  guidanceStateChanged(state: V2GuidanceState) {
    record('entered_onboarding', `scan:guidance:${state}`);
  },
  firstScanCaptured() {
    record('first_scan_attempted', 'scan:captured');
  },
  firstScanRetake() {
    record('entered_onboarding', 'scan:retake');
  },
  firstScanAccepted() {
    record('first_scan_attempted', 'scan:accepted');
  },

  // Processing
  firstScanProcessingStarted() {
    record('entered_onboarding', 'processing:started');
  },
  firstScanProcessingFailed(category: V2ScanFailureCategory) {
    record('first_scan_blocked', `processing:failed:${category}`);
  },

  // Baseline reveal
  baselineViewed(args: {
    goal: V2GoalLabel;
    confidenceTier: 'low' | 'medium' | 'high';
  }) {
    record(
      'first_result_shown',
      `baseline:viewed:${args.goal}:${args.confidenceTier}`
    );
  },
  baselineRetakeSelected() {
    record('entered_onboarding', 'baseline:retake');
  },

  // Safety calibration
  safetyCalibrationViewed() {
    record('entered_onboarding', 'safety:view');
  },
  safetyCalibrationSelected(value: V2ReactivityLabel) {
    record('entered_onboarding', `safety:selected:${value}`);
  },

  // Routine simplicity
  routineSimplicitySelected(value: V2SimplicityLabel) {
    record('entered_onboarding', `simplicity:selected:${value}`);
  },

  // Routine creation + reveal
  routineCreated(args: {
    tone: string;
    stepCount: number;
  }) {
    record(
      'entered_onboarding',
      `routine:created:${args.tone}:${args.stepCount}`
    );
  },
  routineRevealViewed() {
    record('entered_onboarding', 'routine_reveal:view');
  },
  start84DayPlanTapped() {
    record('entered_onboarding', 'plan:start_tapped');
  },

  // Auth conversion
  authViewedPostValue() {
    record('entered_onboarding', 'auth:view');
  },
  authProviderSelected(provider: V2AuthProvider) {
    record('entered_onboarding', `auth:selected:${provider}`);
  },
  authCompleted(provider: V2AuthProvider) {
    record('completed_onboarding', `auth:completed:${provider}`);
  },
  continueWithoutSavingSelected() {
    record('entered_onboarding', 'auth:guest_selected');
  },

  // Terminal
  onboardingCompleted(args: { withAuth: boolean }) {
    record(
      'completed_onboarding',
      `onboarding:completed:auth=${args.withAuth ? 'yes' : 'no'}`
    );
  },
};
