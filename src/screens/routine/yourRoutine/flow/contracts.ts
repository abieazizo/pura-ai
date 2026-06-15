/**
 * flow/contracts — the LOCKED interfaces every Phase-1 team builds against.
 *
 * Coherence comes from one locked plan + these contracts: each aspect team owns
 * DISJOINT files and imports ONLY these prop shapes (plus the existing data
 * view-model in `../model`), so the five teams compile independently and
 * integration is wiring, not reconciliation. Do NOT widen a contract to dodge a
 * build error — surface it; the orchestrator owns cross-team shape changes.
 *
 * Pure types (no Reanimated / no hex) → headless-safe.
 */

import type {
  FocusVM,
  RoutineCardVM,
  StepVM,
  YourRoutineModel,
} from '../model';

// ---------------------------------------------------------------------------
// Flow state machine (owned by TEAM SCAFFOLD's RoutineFlow host)
// ---------------------------------------------------------------------------

/** The two acts + the transitions between them. */
export type FlowAct = 'overview' | 'descending' | 'ritual' | 'returning';

/** The per-step lifecycle inside the ritual. */
export type RitualPhase =
  | 'active' // the step is live; Done / Skip available
  | 'doneBeat' // Done tapped: gold bloom + check draw
  | 'care' // a meaningful step's completion-as-care hold
  | 'skipBeat' // Skip tapped: the muted dim
  | 'completed' // last step done: the calm completion moment
  | 'ended'; // ended early — only what was done counts

/** A measured rect for the shared-element handoff (the Start card → theater). */
export interface FlowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The orb's resting target in screen coords (for the shared-element carry). */
export interface OrbTargetXY {
  cx: number;
  cy: number;
  size: number;
}

// ---------------------------------------------------------------------------
// ACT 1 — THE OVERVIEW (light)
// ---------------------------------------------------------------------------

/** TEAM SCAFFOLD — `flow/OverviewScreen.tsx`. The light Porcelain plan surface:
 *  header + step list + Start CTA + done-for-today rest state + ambient light. */
export interface OverviewScreenProps {
  model: YourRoutineModel;
  reduceMotion: boolean;
  now: Date;
  /** Start the ritual. `rect` (the Start card's measured surface) lets the host
   *  run the shared-element descent; absent under reduce-motion. */
  onStart: (rect?: FlowRect) => void;
  /** Quiet bridge when everything's done today (e.g. open the next rescan). */
  onRescanBridge?: () => void;
}

/** TEAM SCAFFOLD — `flow/components/OverviewHeader.tsx`. Eyebrow TODAY · the
 *  time-aware serif title · a small calm orb anchor (44px) · the total-time
 *  subline. The orb itself is the shared OrbHost instance; this renders its
 *  layout anchor + measures where it should rest. */
export interface OverviewHeaderProps {
  /** "Your morning, in three steps" — time-aware. */
  title: string;
  /** "About 4 minutes." — total time, muted. */
  subline: string;
  reduceMotion: boolean;
  /** Report the orb anchor's screen position so the host can park the orb. */
  onOrbAnchor?: (xy: OrbTargetXY) => void;
}

/** TEAM SCAFFOLD — `flow/components/StartCTA.tsx`. The single confident action.
 *  `restState` swaps to the calm "Done for today" + rescan bridge. */
export interface StartCTAProps {
  label: string; // "Start morning routine" / "Start evening routine"
  /** When true, everything's done today: render the calm rest state instead. */
  restState: boolean;
  doneLine: string; // "Done for today."
  bridgeLine: string; // the quiet bridge to the next rescan
  reduceMotion: boolean;
  onStart: () => void;
  onRescanBridge?: () => void;
}

// ---------------------------------------------------------------------------
// ACT 1 — THE STEP LIST (the hero)
// ---------------------------------------------------------------------------

/** TEAM STEPLIST — `flow/components/StepList.tsx`. The routine as an ordered
 *  vertical sequence, AM and PM grouped under slim section labels. Renders the
 *  whole plan so it FEELS short and doable — never a checklist dashboard. */
export interface StepListProps {
  am: RoutineCardVM;
  pm: RoutineCardVM;
  /** Which group is "now" (for the calm emphasis); the other reads as upcoming. */
  activeTimeOfDay: 'morning' | 'evening';
  reduceMotion: boolean;
  /** Index offset so set-down stagger continues from the header (header = 0). */
  staggerBase?: number;
}

/** TEAM STEPLIST — `flow/components/OverviewStepRow.tsx`. One step as a row
 *  card: step glyph · the REAL product photo BLEEDING 12–20px past the card
 *  edge (soft contact shadow) · step name (serif 22) · product (muted 13) ·
 *  duration chip. Done steps read calmly checked — never guilt for undone. */
export interface OverviewStepRowProps {
  step: StepVM;
  /** 1-based position within its AM/PM group, for the step glyph. */
  position: number;
  /** Set-down stagger index across the whole list. */
  staggerIndex: number;
  reduceMotion: boolean;
}

/** TEAM STEPLIST — `flow/components/SectionLabel.tsx` (AM/PM eyebrow) and
 *  `flow/components/DurationChip.tsx` (per-step time). */
export interface SectionLabelProps {
  /** "MORNING" / "EVENING". */
  label: string;
  /** Total time for the group, e.g. "About 2 minutes". */
  timeLine?: string;
}
export interface DurationChipProps {
  /** "30s" / "1 min" / "+60s to settle". */
  text: string;
}

// ---------------------------------------------------------------------------
// ACT 2 — THE RITUAL (dark) — the orb, the stage, progress + completion
// ---------------------------------------------------------------------------

/** TEAM ORB — `flow/orb/RitualBreathingRing.tsx`. A slow breathing ring around
 *  the orb's resting position (the companion presence). Driven by Reanimated;
 *  reduce-motion renders it still. The orb itself is the shared OrbHost
 *  instance, driven through `flow/motion.ts` choreography. */
export interface RitualBreathingRingProps {
  /** Diameter of the ring (sits just outside the orb). */
  size: number;
  reduceMotion: boolean;
  /** Center in screen coords (tracks the orb's ritual rest position). */
  cx: number;
  cy: number;
  color: string;
}

/** TEAM STEP — `flow/RitualStage.tsx`. ONE step at a time: STEP n OF m eyebrow ·
 *  the serif step moment (40) · ONE short kind instruction · the per-step
 *  product (real image + name) · Done (pinned, prominent) · Skip (quiet) ·
 *  Pause/End (top). Advances one step at a time with a smooth transition. */
export interface RitualStageProps {
  step: StepVM;
  index: number; // 0-based
  total: number;
  reduceMotion: boolean;
  paused: boolean;
  onDone: () => void;
  onSkip: () => void;
  onTogglePause: () => void;
  onEndEarly: () => void;
}

/** TEAM PROGRESS — `flow/components/ProgressTrail.tsx`. A quiet progress
 *  indication across steps — NOT a gamey bar/score/streak. */
export interface ProgressTrailProps {
  total: number;
  index: number; // 0-based current
  /** Step ids already completed this run (calmly filled). */
  doneCount: number;
  reduceMotion: boolean;
  color?: string;
}

/** TEAM PROGRESS — `flow/CompletionMoment.tsx`. On finishing the LAST step: a
 *  calm completion (orb warm, a gentle "That's it for tonight.") framed as
 *  care/rest — NOT confetti/points — with a soft bridge toward the next rescan,
 *  then returns to the overview. */
export interface CompletionMomentProps {
  /** The calm closing line ("That's it for tonight."). */
  line: string;
  /** The soft rescan bridge. */
  bridge: string;
  reduceMotion: boolean;
  /** Called after the rest beat to return to the overview/home. */
  onReturn: () => void;
}

// ---------------------------------------------------------------------------
// Shared selectors — small pure helpers teams may reuse (no duplication of
// the model; these read the existing VM the orchestrator already locked).
// ---------------------------------------------------------------------------

/** Total seconds for a card's steps (30s of doing + absorb settle), and a
 *  human phrase. Kept here so overview + ritual agree on "how long". */
export function cardSeconds(card: RoutineCardVM): number {
  return card.steps.reduce((acc, s) => acc + 30 + s.absorbSeconds, 0);
}

/** Per-step duration text for the chip ("30s", "1 min", "+60s to settle"). */
export function stepDurationText(step: StepVM): string {
  if (step.absorbSeconds >= 60) return `${Math.round(step.absorbSeconds / 60)} min to settle`;
  if (step.absorbSeconds > 0) return `+${step.absorbSeconds}s to settle`;
  return '30s';
}

/** A short human phrase for a block of seconds ("About 4 minutes."). */
export function phraseMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (seconds <= 75) return 'About a minute.';
  if (mins <= 1) return 'About 90 seconds.';
  return `About ${mins} minutes.`;
}

export type { FocusVM, RoutineCardVM, StepVM, YourRoutineModel };
