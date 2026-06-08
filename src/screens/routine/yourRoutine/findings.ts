/**
 * findings — the throughline engine.
 *
 * Turns a scan finding (a concern + the face zones it sits on) into plain,
 * in-voice language so EVERY routine step can trace to something the orb
 * actually saw. No jargon ever leaves this file: `t_zone` becomes "the middle
 * of your face", a concern is named in human words, and the calming clause is
 * present-tense and understated.
 */

import type { ConcernType, SemanticFaceZone, VisibleFinding } from '@/types/scanResults';
import type { RoutineStepType } from '@/types/routine';
import { composeThroughline, VOICE } from './voice';

/** Zones → a plain location phrase, collapsing pairs ("cheeks", "under your eyes"). */
export function zonesToPlain(zones: SemanticFaceZone[]): { text: string; prepositioned: boolean } {
  const set = new Set(zones);
  const bothCheeks = set.has('left_cheek') && set.has('right_cheek');
  const bothUnderEyes = set.has('under_eye_left') && set.has('under_eye_right');

  if (bothUnderEyes) return { text: 'under your eyes', prepositioned: true };
  if (set.has('under_eye_left')) return { text: 'under your left eye', prepositioned: true };
  if (set.has('under_eye_right')) return { text: 'under your right eye', prepositioned: true };
  if (bothCheeks) return { text: 'cheeks', prepositioned: false };

  const single: Partial<Record<SemanticFaceZone, string>> = {
    forehead: 'forehead',
    t_zone: 'the middle of your face',
    left_cheek: 'left cheek',
    right_cheek: 'right cheek',
    nose: 'nose',
    chin: 'chin',
  };
  const first = zones.find((z) => single[z]);
  if (first === 't_zone') return { text: single.t_zone!, prepositioned: false };
  return { text: first ? single[first]! : 'skin', prepositioned: false };
}

/** The noun the orb uses for a concern — kind, plain, never clinical. */
export function findingNoun(concern: ConcernType): string {
  switch (concern) {
    case 'redness':
      return 'redness';
    case 'dryness':
      return 'dryness';
    case 'breakouts':
      return 'breakouts';
    case 'oil_balance':
      return 'shine';
    case 'dark_marks':
      return 'dark marks';
    case 'texture':
      return 'rough patches';
    case 'under_eye_fatigue':
      return 'tiredness';
    case 'barrier_stress':
      return 'the sensitivity';
    default:
      return 'what I saw';
  }
}

/** "the redness", "the dryness" — for commerce + skip lines. */
export function concernThe(concern: ConcernType): string {
  const noun = findingNoun(concern);
  return noun.startsWith('the ') ? noun : `the ${noun}`;
}

/** Full finding phrase: "redness on your left cheek", "tiredness under your eyes". */
export function findingPhrase(finding: VisibleFinding): string {
  const noun = findingNoun(finding.type);
  const where = zonesToPlain(finding.zones ?? []);
  if (!where.text || where.text === 'skin') return noun;
  return where.prepositioned ? `${noun} ${where.text}` : `${noun} on your ${where.text}`;
}

/** The present-tense, understated clause that closes a throughline. */
export function calmingClause(concern: ConcernType): string {
  switch (concern) {
    case 'redness':
      return 'nothing harsh while we calm that down';
    case 'dryness':
      return 'we put the moisture back, gently';
    case 'breakouts':
      return 'keeping things clear without stripping';
    case 'oil_balance':
      return 'evening things out, not stripping';
    case 'dark_marks':
      return 'slow and steady is how these fade';
    case 'texture':
      return 'smoothing it out over time, no rush';
    case 'under_eye_fatigue':
      return 'a little care where you look tired';
    case 'barrier_stress':
      return 'we go soft while things settle';
    default:
      return 'small and steady, that is the whole idea';
  }
}

/** The action lead that opens a throughline, by step type. */
export function stepLead(type: RoutineStepType): string {
  switch (type) {
    case 'cleanse':
      return 'Gentle cleanser first.';
    case 'treat':
      return 'A thin layer of treatment.';
    case 'hydrate':
      return 'Moisturiser to finish.';
    case 'protect':
      return 'Then the SPF.';
    default:
      return '';
  }
}

/**
 * Build the full throughline for a step against its primary finding. If no
 * finding resolves, it still traces to the concern the step targets, so the
 * line is never empty and never generic-feeling.
 */
export function buildThroughline(args: {
  type: RoutineStepType;
  finding?: VisibleFinding | null;
  fallbackConcern?: ConcernType | null;
}): string {
  const { type, finding, fallbackConcern } = args;
  const lead = stepLead(type);
  if (finding) {
    return composeThroughline({
      lead,
      phrase: findingPhrase(finding),
      clause: calmingClause(finding.type),
    });
  }
  if (fallbackConcern) {
    return composeThroughline({
      lead,
      phrase: findingNoun(fallbackConcern),
      clause: calmingClause(fallbackConcern),
    });
  }
  // Last resort — still honest: it's part of the calm-down plan.
  return `${lead} It's part of keeping things calm and simple.`.trim();
}

/** The spoken ritual lead — canonical for the trio, in-voice for the rest. */
export function ritualLead(type: RoutineStepType, isLast: boolean): string {
  if (type === 'protect') return VOICE.leadSpf;
  if (type === 'hydrate') return VOICE.leadMoisturise;
  if (type === 'cleanse') return VOICE.leadCleanse;
  // treat / anything else
  return isLast ? 'Last one - a thin layer is plenty.' : 'A thin layer of treatment. A little does it.';
}

/** Completion-as-care benefit line — what this step actually did today. */
export function completionBenefit(args: {
  type: RoutineStepType;
  concern?: ConcernType | null;
}): string {
  if (args.type === 'protect') return VOICE.completeSpf;
  switch (args.concern) {
    case 'redness':
      return "That's the redness handled for today.";
    case 'dryness':
      return "That's the dryness looked after.";
    case 'breakouts':
      return "That's the breakouts getting their due.";
    case 'oil_balance':
      return "That's the shine evened out for today.";
    case 'dark_marks':
      return "That's another quiet day toward fading those.";
    case 'texture':
      return "That's the smoothing nudged along.";
    case 'under_eye_fatigue':
      return "That's a little care banked under your eyes.";
    case 'barrier_stress':
      return "That's the sensitivity given some room.";
    default:
      return "That's today's part done.";
  }
}
