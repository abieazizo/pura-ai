/**
 * questionConfig — the content/config layer for the orb interview.
 *
 * Every question screen is a DATA object the QuestionScreen renders; copy and
 * calibration are tunable here (and eventually remotely) without touching
 * component logic. This is also where the two opposite psychologies are tuned:
 * warmth and competence move INVERSELY across an option set, and verbosity is
 * threaded so a "be fast" picker gets a fast reaction.
 *
 * Voice rules: questionText + reactionLine are the orb's VOICE (Instrument
 * Serif). No exclamation marks, slang, or emoji; competence is matter-of-fact.
 */

import {
  Books,
  Compass,
  Crosshair,
  Hourglass,
  Leaf,
  Lightning,
  Plant,
  Sparkle,
  Star,
  Sun,
} from 'phosphor-react-native';

export type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}>;

// Phosphor (duotone) glyphs referenced by name in the configs. 'Plant' stands
// in for Seedling, 'Sparkle' for Sparkles (neither ships in this build).
export const ICONS: Record<string, IconComponent> = {
  Sparkle,
  Crosshair,
  Hourglass,
  Sun,
  Compass,
  Plant,
  Leaf,
  Books,
  Lightning,
  Star,
};

export type Weight = 'high' | 'mid' | 'low';
export type Verbosity = 'terse' | 'normal' | 'full';
export type ReactionArchetype = 'warm' | 'competent' | 'validating';

export interface QuestionOption {
  id: string;
  label: string;
  sublabel?: string;
  icon: string; // Phosphor duotone name (see ICONS)
  value: string; // the canonical stored answer
  reactionExpression: ReactionArchetype;
  reactionLine: string; // may contain {goal}
  reactionLineVariants?: string[]; // alternates to defeat a scripted feel
  competenceWeight: Weight;
  warmthWeight: Weight;
  reactionVerbosity: Verbosity;
}

export interface QuestionConfig {
  id: string;
  questionText: string; // may contain {goal}
  questionFallback: string; // used if interpolation would read awkwardly
  eyebrow?: string;
  options: QuestionOption[];
  reactionStyle: 'full' | 'light'; // light = SHORTER spoken, never silent
  emotionalWeight: 'light' | 'moderate' | 'peak';
  orbAuraTheme: 'violet-cool' | 'blue-warm';
  threadingFrom?: string; // id of a prior answer used to frame this question
  /** Per-prior-answer question rewrites (e.g. terser when minimal-guidance). */
  threadedVariants?: Record<string, string>;
  singleSelect: boolean;
}

// ---------------------------------------------------------------------------
// Goal interpolation — turn the stored goal into a natural {goal} phrase.
// Only phrases that read naturally in "To get your {goal} sorted" are mapped;
// everything else falls back so the orb NEVER says broken grammar.
// ---------------------------------------------------------------------------
const GOAL_PHRASE: Record<string, string | null> = {
  clear: 'breakouts',
  bright: 'dark spots',
  smoother: 'signs of aging',
  barrier: 'barrier',
  calm: null, // "your skin calmer sorted" reads awkward → fallback
  simpler: null,
};

export interface ResolvedQuestion {
  text: string;
  /** Words that should carry the whisper-of-distinction accent. */
  accentWords: string[];
}

/** Resolve a config's question for the current context (goal + threading). */
export function resolveQuestion(
  config: QuestionConfig,
  ctx: { goal?: string | null; threadKey?: string | null },
): ResolvedQuestion {
  // Threading first (a prior answer reframes the whole question).
  if (config.threadedVariants && ctx.threadKey) {
    const threaded = config.threadedVariants[ctx.threadKey];
    if (threaded) return { text: threaded, accentWords: [] };
  }
  if (!config.questionText.includes('{goal}')) {
    return { text: config.questionText, accentWords: [] };
  }
  const phrase = ctx.goal ? GOAL_PHRASE[ctx.goal] : null;
  if (!phrase) return { text: config.questionFallback, accentWords: [] };
  return {
    text: config.questionText.replace('{goal}', phrase),
    accentWords: phrase.split(' '),
  };
}

/** Interpolate {goal} inside a reaction line (graceful — never broken). */
export function resolveLine(line: string, goal?: string | null): string {
  if (!line.includes('{goal}')) return line;
  const phrase = (goal ? GOAL_PHRASE[goal] : null) ?? 'skin';
  return line.replace(/\{goal\}/g, phrase);
}

/** Pick a reaction line (base + variants) — varied, to defeat a scripted feel. */
export function pickReactionLine(option: QuestionOption, goal?: string | null): string {
  const pool = [option.reactionLine, ...(option.reactionLineVariants ?? [])];
  const idx = Math.floor(Math.random() * pool.length);
  return resolveLine(pool[idx] ?? option.reactionLine, goal);
}

// ---------------------------------------------------------------------------
// Verbosity threading — reaction LENGTH/PACE matches the stated appetite. The
// fast picker's line is delivered FAST (the orb proves it heard "be fast").
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

// ---------------------------------------------------------------------------
// Guidance fork — the live API other surfaces consume so explanation depth is
// NOT a dead value. (Within scope it's consumed by Screen 5 threading + the orb
// vocabulary; scan-reveal / routine descriptions adopt it via pickByGuidance —
// a one-line call — without this build touching those out-of-scope files.)
// ---------------------------------------------------------------------------
export type ExplanationDepth = 'full' | 'some' | 'minimal';

export function explanationDepth(
  guidance: 'full-guidance' | 'some-guidance' | 'minimal-guidance' | null | undefined,
): ExplanationDepth {
  if (guidance === 'minimal-guidance') return 'minimal';
  if (guidance === 'some-guidance') return 'some';
  // null = Screen 4 skipped (goal was "guide me") → default to walk-me-through.
  return 'full';
}

/** Fork any copy/behavior on the guidance preference in one call. */
export function pickByGuidance<T>(
  guidance: Parameters<typeof explanationDepth>[0],
  options: { full: T; some: T; minimal: T },
): T {
  return options[explanationDepth(guidance)];
}

// ===========================================================================
// SCREEN 3 — the goal (expressed as a config; no regression). FULL reaction.
// ===========================================================================
export const GOAL_QUESTION: QuestionConfig = {
  id: 'goal',
  questionText: "What are you hoping we'll work on together?",
  questionFallback: "What are you hoping we'll work on together?",
  eyebrow: 'STEP 1',
  reactionStyle: 'full',
  emotionalWeight: 'peak',
  orbAuraTheme: 'violet-cool',
  singleSelect: true,
  options: [
    {
      id: 'calmClear',
      label: 'Calmer, clearer skin overall',
      icon: 'Sparkle',
      value: 'calm',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'normal',
      reactionLine: "Calm and clear. That's a good place to aim.",
    },
    {
      id: 'breakouts',
      label: 'Get my breakouts under control',
      icon: 'Crosshair',
      value: 'clear',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'normal',
      reactionLine: "Let's get ahead of them together, [Name].",
    },
    {
      id: 'aging',
      label: 'Slow the signs of aging',
      icon: 'Hourglass',
      value: 'smoother',
      reactionExpression: 'competent',
      warmthWeight: 'low',
      competenceWeight: 'high',
      reactionVerbosity: 'normal',
      reactionLine: "Smart. We'll work on this gently, starting tonight.",
    },
    {
      id: 'darkSpots',
      label: 'Fade dark spots and even tone',
      icon: 'Sun',
      value: 'bright',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'normal',
      reactionLine: "Got it. Even tone takes patience — I'll guide the pace.",
    },
    {
      id: 'unsure',
      label: "Honestly? I'm not sure — guide me",
      icon: 'Compass',
      value: 'unsure',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'full',
      reactionLine: "That's completely okay. That's exactly what I'm here for.",
    },
  ],
};

// ===========================================================================
// SCREEN 4 — guidance / explanation depth. LIGHT reaction; emotional valley.
// Two opposite psychologies → warmth (unsure) vs competence-proof (skeptic),
// inversely calibrated. Skipped entirely if the goal was "guide me".
// ===========================================================================
export const GUIDANCE_QUESTION: QuestionConfig = {
  id: 'guidance',
  questionText: 'To get your {goal} sorted — how much do you want me to explain along the way?',
  questionFallback: 'How much do you want me to explain along the way?',
  eyebrow: 'STEP 2',
  reactionStyle: 'light',
  emotionalWeight: 'light',
  orbAuraTheme: 'violet-cool',
  threadingFrom: 'goal',
  singleSelect: true,
  options: [
    {
      id: 'full-guidance',
      label: 'Walk me through everything',
      sublabel: "I'm starting from scratch",
      icon: 'Plant',
      value: 'full-guidance',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'full',
      reactionLine:
        "Then I'll explain as we go — no question is too basic. Most skincare confusion comes from steps nobody bothered to explain.",
    },
    {
      id: 'some-guidance',
      label: 'Hit the highlights',
      sublabel: 'I know a bit already',
      icon: 'Leaf',
      value: 'some-guidance',
      reactionExpression: 'validating',
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'normal',
      reactionLine:
        "Good instinct — that's how I'd want it too. Enough to understand each choice, none of the noise.",
    },
    {
      id: 'minimal-guidance',
      label: 'Just the essentials, fast',
      sublabel: "I know what I'm doing",
      icon: 'Books',
      value: 'minimal-guidance',
      reactionExpression: 'competent',
      warmthWeight: 'low',
      competenceWeight: 'high',
      reactionVerbosity: 'terse',
      // CONTRACT: "never actually looked at your skin" is a promise the
      // scan-first product keeps (the scan produces real findings). Delivered
      // terse/fast — the orb proves it heard "be fast" by being fast.
      reactionLine:
        "Done — I'll skip the lectures and show you the why behind each pick for your {goal}. The part most apps can't, because they never actually looked at your skin.",
      reactionLineVariants: [
        'Done — straight to the why behind each pick for your {goal}. The part most apps skip, because they never actually read your skin.',
        "Understood. The reasoning behind each choice, fast — the part that needs an app that looks at your skin, not just your age.",
      ],
    },
  ],
};

// ===========================================================================
// SCREEN 5 — routine depth (current behavior + direction). LIGHT reaction.
// ALWAYS asked. Aura warms violet-cool → blue-warm. Each reaction NAMES the
// concrete consequence (a focused / a real / the full routine).
// ===========================================================================
export const ROUTINE_DEPTH_QUESTION: QuestionConfig = {
  id: 'routineDepth',
  questionText: 'Be honest — what does your routine actually look like most days?',
  questionFallback: 'Be honest — what does your routine actually look like most days?',
  eyebrow: 'STEP 3',
  reactionStyle: 'light',
  emotionalWeight: 'light',
  orbAuraTheme: 'blue-warm',
  threadingFrom: 'guidance',
  threadedVariants: {
    // Terser framing for the user who asked to keep it fast on Screen 4.
    'minimal-guidance': 'And your routine day to day — minimal, building, or full?',
  },
  singleSelect: true,
  options: [
    {
      id: 'minimal',
      label: 'I keep it minimal',
      sublabel: 'And I want to stay efficient',
      icon: 'Lightning',
      value: 'minimal',
      reactionExpression: 'validating', // leaning warm
      warmthWeight: 'mid',
      competenceWeight: 'mid',
      reactionVerbosity: 'normal',
      // Validates efficiency as SMART; names the consequence (focused routine).
      reactionLine:
        "Good — efficient is underrated. I'll find you the few things that genuinely move the needle, and build you a focused routine. Nothing else.",
    },
    {
      id: 'building',
      label: "I'm building the habit",
      sublabel: 'Ready for a real routine',
      icon: 'Sparkle',
      value: 'building',
      reactionExpression: 'warm',
      warmthWeight: 'high',
      competenceWeight: 'low',
      reactionVerbosity: 'normal',
      // Honors aspiration; not trapped in "nothing"; guards overwhelm; growth path.
      reactionLine:
        "Then let's build something you'll actually keep. I'll start you with a real routine that won't overwhelm — we can always add more later.",
    },
    {
      id: 'full',
      label: 'I already do a lot',
      sublabel: 'I enjoy the full process',
      icon: 'Star',
      value: 'full',
      reactionExpression: 'competent',
      warmthWeight: 'low',
      competenceWeight: 'high',
      reactionVerbosity: 'full',
      // "I'll watch the interactions" is BACKED: ai-contracts conflict flags +
      // the DecisionLens "products that conflict with tonight's routine". The
      // guard is a QUALITY STANDARD ("I don't do filler"), not doubt.
      reactionLine:
        "Then I won't water it down — you'll get the full picture. But a longer routine has more ways for products to conflict, so I'll watch the interactions and cut any step that isn't earning its place. I don't do filler.",
      reactionLineVariants: [
        'Then you\'ll get the full picture — no watering down. More steps means more room to clash, so I\'ll watch the interactions and keep only what earns its place. No filler.',
        'Understood — the full process, done properly. A longer routine has more ways to conflict, so I\'ll track the interactions and cut anything that isn\'t pulling its weight. I don\'t do filler.',
      ],
    },
  ],
};
