/**
 * questionConfig — the content/config layer for the orb interview.
 *
 * Every question screen is a DATA object the QuestionScreen renders; copy and
 * calibration are tunable here without touching component logic.
 *
 * v22 — the momentum rebuild. The interview collects ONLY what the scan, the
 * recommendation engine, or safety actually consume:
 *
 *   goal          → store.goal           → selectUserProfileContext().goals
 *   age range     → store.ageRange       → stored (engine read is a known gap
 *                                          in src/state/canonical.ts — out of
 *                                          this rebuild's scope)
 *   skin type     → store.skinType       → selectUserProfileContext().skinType
 *   sensitivities → store.sensitivity / fragranceSensitive / skinConditions /
 *                   avoidIngredients     → buildSafetyProfile() → engine
 *   pregnancy     → store.pregnancyCaution → buildSafetyProfile() → engine
 *
 * The guidance + routine-depth questions were cut (not core; their store
 * fields remain and default gracefully downstream). The name beat was cut
 * (typing, and no engine consumer).
 *
 * Voice rules: questionText + reactionLine are the orb's VOICE (Instrument
 * Serif). No exclamation marks, slang, or emoji; competence is matter-of-fact.
 * Reactions are SHORT — the next question arriving quickly IS the warmth.
 */

import {
  Compass,
  Drop,
  Hourglass,
  Leaf,
  Lightning,
  Plant,
  Shield,
  Sparkle,
  Star,
  Sun,
  Wind,
} from 'phosphor-react-native';

export type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}>;

// Phosphor (duotone) glyphs referenced by name in the configs.
export const ICONS: Record<string, IconComponent> = {
  Sparkle,
  Hourglass,
  Sun,
  Compass,
  Plant,
  Leaf,
  Lightning,
  Star,
  Drop,
  Wind,
  Shield,
};

export type Weight = 'high' | 'mid' | 'low';
export type Verbosity = 'terse' | 'normal' | 'full';
export type ReactionArchetype = 'warm' | 'competent' | 'validating';

export interface QuestionOption {
  id: string;
  label: string;
  sublabel?: string;
  icon: string; // Phosphor duotone name (see ICONS); ignored by compact cards
  value: string; // the canonical stored answer
  reactionExpression: ReactionArchetype;
  reactionLine: string;
  reactionLineVariants?: string[]; // alternates to defeat a scripted feel
  competenceWeight: Weight;
  warmthWeight: Weight;
  reactionVerbosity: Verbosity;
}

export interface QuestionConfig {
  id: string;
  questionText: string;
  questionFallback: string;
  /** Optional framing line above the rail (Inter caps). Used ONLY when it
   *  carries real meaning (the safety benefit) — never as a step counter. */
  eyebrow?: string;
  options: QuestionOption[];
  emotionalWeight: 'light' | 'moderate' | 'peak';
  orbAuraTheme: 'violet-cool' | 'blue-warm';
  singleSelect: boolean;
  /** Multi-select only: the exclusive "none" option — tapping it clears the
   *  rest and auto-advances like a single-select answer. */
  exclusiveOptionId?: string;
  /** Multi-select only: label for the continue CTA once ≥1 is selected. */
  continueLabel?: string;
  /** Multi-select only: the orb's line when the user continues. */
  multiReactionLine?: string;
  /** Compact cards: no icon well, tighter rows — for dense sets (age). */
  compact?: boolean;
}

export interface ResolvedQuestion {
  text: string;
  /** Words that should carry the whisper-of-distinction accent. */
  accentWords: string[];
}

/** Resolve a config's question (kept as a seam for future interpolation). */
export function resolveQuestion(config: QuestionConfig): ResolvedQuestion {
  return { text: config.questionText, accentWords: [] };
}

/** Pick a reaction line (base + variants) — varied, to defeat a scripted feel. */
export function pickReactionLine(option: QuestionOption): string {
  const pool = [option.reactionLine, ...(option.reactionLineVariants ?? [])];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? option.reactionLine;
}

// ---------------------------------------------------------------------------
// Verbosity — reaction LENGTH/PACE. Short lines delivered quickly keep the
// flow's momentum; the orb proves it listens by NOT slowing the user down.
// ---------------------------------------------------------------------------
const VERBOSITY_TIMING: Record<Verbosity, { wordStagger: number; wordDuration: number }> = {
  terse: { wordStagger: 55, wordDuration: 240 },
  normal: { wordStagger: 78, wordDuration: 300 },
  full: { wordStagger: 92, wordDuration: 350 },
};

export function verbosityTiming(v: Verbosity) {
  return VERBOSITY_TIMING[v];
}

/** Estimated spoken duration (ms) — lets the orb time its blink to the line. */
export function estimateLineMs(line: string, v: Verbosity): number {
  const { wordStagger, wordDuration } = VERBOSITY_TIMING[v];
  const words = line.split(' ').length;
  return words * wordStagger + wordDuration;
}

// ===========================================================================
// 1 · GOAL — "What do you want to see change?" The emotional peak: the user
// names the thing they came here for, and the orb takes it seriously.
// ===========================================================================
export const GOAL_QUESTION: QuestionConfig = {
  id: 'goal',
  questionText: 'What do you want to see change?',
  questionFallback: 'What do you want to see change?',
  emotionalWeight: 'peak',
  orbAuraTheme: 'violet-cool',
  singleSelect: true,
  options: [
    {
      id: 'calm',
      label: 'Calmer, less redness',
      icon: 'Leaf',
      value: 'calm',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'normal',
      reactionLine: 'Calm we can do. I’ll look for what’s stirring it.',
    },
    {
      id: 'clear',
      label: 'Fewer breakouts',
      icon: 'Sparkle',
      value: 'clear',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      reactionLine: 'Then let’s get ahead of them.',
    },
    {
      id: 'barrier',
      label: 'Less dryness',
      icon: 'Drop',
      value: 'barrier',
      reactionExpression: 'competent',
      warmthWeight: 'mid',
      competenceWeight: 'high',
      reactionVerbosity: 'terse',
      reactionLine: 'Noted. We’ll bring the moisture back.',
    },
    {
      id: 'bright',
      label: 'A brighter, more even tone',
      icon: 'Sun',
      value: 'bright',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'normal',
      reactionLine: 'Even tone takes patience — I’ll set the pace.',
    },
    {
      id: 'unsure',
      label: 'I’m not sure — you tell me',
      icon: 'Compass',
      value: 'unsure',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'normal',
      reactionLine: 'That’s what the scan is for. We’ll see what your skin says.',
    },
  ],
};

// ===========================================================================
// 2 · AGE — one tap, compact rows. The why is in the question itself.
// ===========================================================================
export const AGE_QUESTION: QuestionConfig = {
  id: 'age',
  questionText: 'So I can read your skin in context — your age?',
  questionFallback: 'So I can read your skin in context — your age?',
  emotionalWeight: 'light',
  orbAuraTheme: 'violet-cool',
  singleSelect: true,
  compact: true,
  options: [
    {
      id: 'under_18',
      label: 'Under 18',
      icon: 'Star',
      value: 'under_18',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'terse',
      reactionLine: 'Then we keep everything gentle.',
    },
    {
      id: '18-24',
      label: '18–24',
      icon: 'Star',
      value: '18-24',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      reactionLine: 'Good years to get this right.',
    },
    {
      id: '25-34',
      label: '25–34',
      icon: 'Star',
      value: '25-34',
      reactionExpression: 'competent',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      reactionLine: 'Noted — that shapes the read.',
    },
    {
      id: '35-44',
      label: '35–44',
      icon: 'Star',
      value: '35-44',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'high',
      reactionVerbosity: 'terse',
      reactionLine: 'That focuses the read.',
    },
    {
      id: '45-54',
      label: '45–54',
      icon: 'Star',
      value: '45-54',
      reactionExpression: 'competent',
      warmthWeight: 'mid',
      competenceWeight: 'high',
      reactionVerbosity: 'terse',
      reactionLine: 'Noted — that sets my baseline.',
    },
    {
      id: '55+',
      label: '55 and up',
      icon: 'Star',
      value: '55+',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      reactionLine: 'Then I’ll read with that in mind.',
    },
    {
      id: 'prefer_not',
      label: 'I’d rather not say',
      icon: 'Compass',
      value: 'prefer_not',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'terse',
      reactionLine: 'No problem at all.',
    },
  ],
};

// ===========================================================================
// 3 · SKIN TYPE — concrete and answerable ("by midday"), with an honest out.
// ===========================================================================
export const SKIN_TYPE_QUESTION: QuestionConfig = {
  id: 'skinType',
  questionText: 'By midday, how does your skin usually feel?',
  questionFallback: 'By midday, how does your skin usually feel?',
  emotionalWeight: 'light',
  orbAuraTheme: 'violet-cool',
  singleSelect: true,
  options: [
    {
      id: 'oily',
      label: 'Shiny or oily',
      icon: 'Sun',
      value: 'oily',
      reactionExpression: 'competent',
      warmthWeight: 'mid',
      competenceWeight: 'high',
      reactionVerbosity: 'terse',
      reactionLine: 'Useful — that changes my picks.',
    },
    {
      id: 'dry',
      label: 'Tight or flaky',
      icon: 'Wind',
      value: 'dry',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      reactionLine: 'Then comfort comes first.',
    },
    {
      id: 'combination',
      label: 'Oily in places, dry in others',
      icon: 'Sparkle',
      value: 'combination',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      reactionLine: 'Most skin is — I’ll read each zone on its own.',
    },
    {
      id: 'not_sure',
      label: 'Honestly, not sure',
      icon: 'Compass',
      value: 'not_sure',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'terse',
      reactionLine: 'The scan will settle it. No guessing.',
    },
  ],
};

// ===========================================================================
// 4 · SENSITIVITIES — multi-select + an exclusive "none". Framed as the
// benefit (safe picks), never as a medical form.
// ===========================================================================
export const SENSITIVITIES_QUESTION: QuestionConfig = {
  id: 'sensitivities',
  questionText: 'Does your skin react to anything?',
  questionFallback: 'Does your skin react to anything?',
  eyebrow: 'SO EVERY PICK IS SAFE FOR YOU',
  emotionalWeight: 'moderate',
  orbAuraTheme: 'violet-cool',
  singleSelect: false,
  exclusiveOptionId: 'none',
  continueLabel: 'That’s everything',
  // Number-safe for one OR many selections, and the steering IS the
  // acknowledgment — no repeated "Good to know" opener.
  multiReactionLine: 'I’ll steer around all of it.',
  options: [
    {
      id: 'fragrance',
      label: 'Fragrance',
      icon: 'Leaf',
      value: 'fragrance',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      reactionLine: 'Good to know — I’ll steer around it.',
    },
    {
      id: 'actives',
      label: 'Strong actives',
      sublabel: 'Retinol, acids',
      icon: 'Lightning',
      value: 'actives',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'high',
      reactionVerbosity: 'terse',
      reactionLine: 'Good to know — I’ll steer around them.',
    },
    {
      id: 'eczema',
      label: 'Eczema or dermatitis',
      icon: 'Plant',
      value: 'eczema',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      reactionLine: 'Good to know — I’ll be careful there.',
    },
    {
      id: 'rosacea',
      label: 'Rosacea or easy flushing',
      icon: 'Sparkle',
      value: 'rosacea',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      reactionLine: 'Good to know — I’ll be careful there.',
    },
    {
      id: 'none',
      label: 'Nothing I know of',
      icon: 'Star',
      value: 'none',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'terse',
      reactionLine: 'Good — I’ll still keep every pick gentle.',
    },
  ],
};

// ===========================================================================
// 5 · SAFETY — pregnancy/breastfeeding. Gates the engine. Calm, never
// alarmist; "Last one" signals the end is in sight. No eyebrow: the safety
// refrain lives ONCE on the section opener (sensitivities) — a near-identical
// caps line on consecutive screens read as a template, not a companion.
// ===========================================================================
export const SAFETY_QUESTION: QuestionConfig = {
  id: 'safety',
  questionText: 'Last one — are you pregnant or breastfeeding?',
  questionFallback: 'Last one — are you pregnant or breastfeeding?',
  emotionalWeight: 'moderate',
  orbAuraTheme: 'blue-warm',
  singleSelect: true,
  compact: true,
  options: [
    {
      id: 'yes',
      label: 'Yes',
      icon: 'Plant',
      value: 'yes',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'mid',
      reactionVerbosity: 'normal',
      reactionLine: 'Then I’ll only suggest what’s safe for both of you.',
    },
    {
      id: 'no',
      label: 'No',
      icon: 'Star',
      value: 'no',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'terse',
      // NOT a closing line: the SynthesisBeat that immediately follows is the
      // close (it names the goal back). "That's everything I need" here made
      // the dominant path say "I'm done" twice in two seconds.
      reactionLine: 'Good to know.',
    },
    {
      id: 'prefer-not-to-say',
      label: 'I’d rather not say',
      icon: 'Compass',
      value: 'prefer-not-to-say',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'terse',
      reactionLine: 'That’s fine. I’ll choose carefully all the same.',
    },
  ],
};
