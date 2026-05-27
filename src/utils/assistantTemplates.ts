/**
 * Local structured assistant templates.
 *
 * Every assistant answer in the AI Assist tab passes through this module.
 * Even when the AI gateway is available, the gateway's free-form text
 * becomes the `summary` of the chosen template — the structure (steps,
 * avoid, why, CTAs, follow-ups) always comes from here. This keeps the
 * UI consistent and trustworthy regardless of model behaviour or
 * network state.
 *
 * Intent → template mapping is conservative (keyword-based) so the
 * assistant never surfaces routine guidance when the user asked about
 * ingredients, or vice versa.
 */

import type { AiSkinContext } from './aiSkinContext';

export type AiCtaAction = 'routine' | 'products' | 'scan' | 'progress' | 'home';

export interface AiCta {
  label: string;
  action: AiCtaAction;
}

export interface AiStructuredAnswer {
  title: string;
  badge?: string;
  summary: string;
  steps?: string[];
  avoid?: string[];
  why?: string;
  ctas?: AiCta[];
  followUps?: string[];
  /** Internal intent tag — useful for telemetry + thinking-state cycling. */
  intent: AiIntent;
}

export type AiIntent =
  | 'tonight'
  | 'score'
  | 'avoid'
  | 'exfoliate'
  | 'product'
  | 'breakout'
  | 'safety'
  | 'profile'
  | 'general';

/**
 * Conservative keyword-based intent detection. Earlier patterns win.
 *
 * Order matters:
 *   1. SAFETY beats everything — burning / swelling / severe irritation /
 *      bleeding / allergic reactions are not skincare-routine questions
 *      and must never be answered with "add a moisturizer".
 *   2. PROFILE beats general — "what's my name" / "account" / "settings"
 *      questions must never receive skincare advice.
 *   3. Everything else (exfoliation, breakouts, scores, …) preserves the
 *      conservative existing precedence.
 */
export function detectIntent(text: string): AiIntent {
  const t = (text ?? '').toLowerCase();
  if (!t.trim()) return 'general';

  // 1. SAFETY — medical-leaning words win first. We're explicit about
  // burning, swelling, severe rashes, spreading rashes, bleeding,
  // anaphylaxis, infection. The match is conservative so plain
  // "redness" still routes to routine guidance.
  if (
    /(burning|stinging severe|stings badly|stinging won.t stop|swell|swollen|hives|rash spread|rash all over|allergic reaction|anaphylax|chemical burn|bleeding|infect(ed|ion)|won.t stop|emergency|throat|tongue swell|breathing|severe pain|pus|oozing|spreading rapidly)/.test(
      t
    )
  ) {
    return 'safety';
  }

  // 2. PROFILE — anything that's clearly an account / identity question
  // must NEVER be answered with skincare advice. Includes the exact
  // failing case "what's my name" plus account / settings / login.
  if (
    /(what.?s my name|whats my name|what is my name|my name is|change my name|my profile|my account|account settings|sign out|log out|delete (my )?account|privacy|data settings)/.test(
      t
    )
  ) {
    return 'profile';
  }

  // 3. exfoliation has to be checked before "product" / "avoid" because
  // "should i exfoliate" contains "should".
  if (/(exfoliat|\bbha\b|\baha\b|\bglycolic\b|\blactic acid\b)/.test(t)) {
    return 'exfoliate';
  }
  if (/(breakout|pimple|acne|zit|cystic|whitehead|blackhead|irritat|flare|inflam)/.test(t)) {
    return 'breakout';
  }
  if (/(score|moved|change(d)?|why.*up|why.*down|trend|progress)/.test(t)) {
    return 'score';
  }
  if (/(tonight|do tonight|routine|evening|night routine|am i overdoing|am ok|should i keep)/.test(t)) {
    return 'tonight';
  }
  if (/(avoid|safe|harsh|too much|too many|sting|sensitive|retin|fragrance|ingredient)/.test(t)) {
    return 'avoid';
  }
  if (/(product|recommend|match|cleanser|serum|moisturiz|moisturis|spf|toner|cream|use first|which one)/.test(t)) {
    return 'product';
  }
  return 'general';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a fully-populated structured answer for a given intent + context.
 *
 * If an `enrichedSummary` is supplied (e.g. from a successful AI gateway
 * call), it replaces the template's default summary. The rest of the
 * structure (badge, steps, avoid, CTAs, follow-ups) ALWAYS comes from the
 * template so the UI rhythm stays consistent.
 */
export function buildLocalAnswer(
  intent: AiIntent,
  context: AiSkinContext,
  enrichedSummary?: string | null
): AiStructuredAnswer {
  const base = TEMPLATES[intent](context);
  const summary =
    enrichedSummary && enrichedSummary.trim().length > 0
      ? enrichedSummary.trim()
      : base.summary;
  const ctas = filterCtas(base.ctas, context);
  return {
    ...base,
    summary,
    ctas,
  };
}

/**
 * Convenience: detect + build in one call.
 */
export function buildLocalAnswerFor(
  userText: string,
  context: AiSkinContext,
  enrichedSummary?: string | null
): AiStructuredAnswer {
  return buildLocalAnswer(detectIntent(userText), context, enrichedSummary);
}

// ---------------------------------------------------------------------------
// CTA helpers
// ---------------------------------------------------------------------------

function filterCtas(ctas: AiCta[] | undefined, ctx: AiSkinContext): AiCta[] | undefined {
  if (!ctas || ctas.length === 0) return undefined;
  const out: AiCta[] = [];
  for (const c of ctas) {
    if (c.action === 'progress' && !ctx.hasMultipleScans) continue;
    if (c.action === 'scan' && ctx.hasScan && (c.label ?? '').toLowerCase().includes('first')) {
      // skip "Start first scan" when a scan exists
      continue;
    }
    out.push(c);
  }
  return out.length > 0 ? out : undefined;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type TemplateFn = (ctx: AiSkinContext) => AiStructuredAnswer;

const TEMPLATES: Record<AiIntent, TemplateFn> = {
  tonight: tonightTemplate,
  score: scoreTemplate,
  avoid: avoidTemplate,
  exfoliate: exfoliateTemplate,
  product: productTemplate,
  breakout: breakoutTemplate,
  safety: safetyTemplate,
  profile: profileTemplate,
  general: generalTemplate,
};

// v23.1 — tightened every template. One-sentence summary, 3-step
// max, 3-avoid max, short why, two CTAs, three follow-ups. Reads as
// a coach reply on a phone, not a wall of editorial text.
function tonightTemplate(ctx: AiSkinContext): AiStructuredAnswer {
  const hasFresh = ctx.hasScan;
  const direction =
    ctx.scoreDelta !== undefined && ctx.scoreDelta >= 0
      ? 'trending well'
      : 'asking for steadier care';
  return {
    intent: 'tonight',
    title: 'Tonight: keep it calm',
    badge: hasFresh ? 'Based on latest scan' : 'General guidance',
    summary: hasFresh
      ? `Your skin is ${direction} — lean on barrier care, not new actives.`
      : 'Run a simple barrier-first routine until your next scan.',
    steps: ['Gentle cleanse', 'Hydrate', 'Moisturize'],
    avoid: ['Strong acids', 'Retinoid + acid combos', 'A brand-new active'],
    why: 'Consistency usually beats adding something new.',
    ctas: [
      { label: 'Open routine', action: 'routine' },
      { label: 'Show product matches', action: 'products' },
    ],
    followUps: ['Can I exfoliate?', 'Which moisturizer?', 'Explain my T-zone'],
  };
}

function scoreTemplate(ctx: AiSkinContext): AiStructuredAnswer {
  const delta = ctx.scoreDelta;
  let summary: string;
  if (delta === undefined) {
    summary = 'Take a second scan and Pura will explain what moved.';
  } else if (delta > 0) {
    summary = `Up ${delta} since last scan — calmer, more balanced areas this round.`;
  } else if (delta < 0) {
    summary = `Down ${Math.abs(delta)} since last scan — a bit more redness, texture or irritation this round.`;
  } else {
    summary = 'Holding steady — your routine is doing its job.';
  }

  return {
    intent: 'score',
    title: 'Why your score moved',
    badge: 'Progress insight',
    summary,
    steps: buildScoreBreakdown(ctx),
    why:
      delta !== undefined && delta < 0
        ? 'Short dips are normal — sleep and weather both move the reading.'
        : 'One scan is a snapshot. The multi-scan trend tells you more.',
    ctas: [
      { label: 'View progress', action: 'progress' },
      { label: 'Open routine', action: 'routine' },
    ],
    followUps: ['What changed most?', 'How do I improve faster?', 'What should I avoid?'],
  };
}

function buildScoreBreakdown(ctx: AiSkinContext): string[] {
  const out: string[] = [];
  if (ctx.improvedAreas.length > 0) {
    out.push(`Improving: ${ctx.improvedAreas.join(', ')}`);
  } else {
    out.push('Improving: nothing flagged this round');
  }
  if (ctx.activeConcerns.length > 0) {
    out.push(`Still focusing on: ${ctx.activeConcerns.join(', ')}`);
  } else {
    out.push('Still focusing on: no active concerns right now');
  }
  out.push('Best next step: keep the routine steady for the next few nights');
  return out;
}

function avoidTemplate(_ctx: AiSkinContext): AiStructuredAnswer {
  return {
    intent: 'avoid',
    title: 'Be careful with strong actives',
    badge: 'Routine safety',
    summary:
      'Skip the harsh stack if your skin looks active — go barrier-first until it settles.',
    steps: ['Gentle cleanser', 'Hydrating serum', 'Barrier moisturizer'],
    avoid: [
      'High-strength AHA/BHA',
      'Retinoid + acid combos',
      'Harsh physical scrubs',
    ],
    why: 'Stacking actives compounds irritation. The barrier needs simplicity to recover.',
    ctas: [
      { label: 'Open routine', action: 'routine' },
      { label: 'Show product matches', action: 'products' },
    ],
    followUps: ['Can I use BHA?', 'Can I use retinol?', 'What is safe tonight?'],
  };
}

function exfoliateTemplate(_ctx: AiSkinContext): AiStructuredAnswer {
  return {
    intent: 'exfoliate',
    title: 'Exfoliate only if skin feels calm',
    badge: 'Actives check',
    summary:
      'Helpful for texture, easy to overdo. Skip tonight if anything feels off.',
    steps: [
      'No stinging or tightness',
      'No visible irritation',
      'No retinoid in the same routine',
    ],
    avoid: [
      'Redness is elevated',
      'Breakouts feel inflamed',
      'You used a strong active in the last 24 hours',
    ],
    why: 'Restraint is the goal — support turnover, don’t strip the barrier.',
    ctas: [
      { label: 'Open routine', action: 'routine' },
      { label: 'Show product matches', action: 'products' },
    ],
    followUps: ['BHA or AHA?', 'How often should I exfoliate?', 'What should I use instead?'],
  };
}

function productTemplate(ctx: AiSkinContext): AiStructuredAnswer {
  return {
    intent: 'product',
    title: 'Pick products that support your skin today',
    badge: ctx.hasScan ? 'Product guidance' : 'General guidance',
    summary:
      'Fewer moving parts is easier to read — lean into barrier support, not active stacking.',
    steps: ['Lightweight moisturizer', 'Gentle cleanser', 'Hydrating serum'],
    avoid: ['Harsh scrubs', 'Multiple exfoliants stacked', 'Strong actives used together'],
    why: ctx.hasScan
      ? 'Your scan points toward a gentle, barrier-first approach.'
      : 'Without a scan, simpler is safer. Pura gets specific once it sees your skin.',
    ctas: [
      { label: 'Show product matches', action: 'products' },
      { label: 'Open routine', action: 'routine' },
    ],
    followUps: ['Best moisturizer?', 'Best cleanser?', 'What ingredients are safe?'],
  };
}

function breakoutTemplate(_ctx: AiSkinContext): AiStructuredAnswer {
  return {
    intent: 'breakout',
    title: 'Calm first, treat second',
    badge: 'Breakout support',
    summary:
      'Active breakout? Pull back the routine and protect the barrier before adding more actives.',
    steps: ['Gentle cleanse', 'Simple moisturizer', 'Spot-treat only the active area'],
    avoid: ['Multiple acne treatments at once', 'Harsh scrubbing', 'Skipping moisturizer'],
    why: 'Inflammation calms faster with consistency than with intensity.',
    ctas: [
      { label: 'Open routine', action: 'routine' },
      { label: 'Show product matches', action: 'products' },
    ],
    followUps: ['Should I spot treat?', 'What caused this?', 'Can I exfoliate?'],
  };
}

/**
 * SAFETY template — fires when the user describes a possible adverse
 * reaction (burning, swelling, severe pain, spreading rash, allergic
 * reaction). Pura is NOT a medical product; this template gives
 * immediate safe-action guidance and points at professional care.
 *
 * Hard rules: stop actives, no skincare-shopping CTA, no "spot treat
 * tonight". Disclaimer is explicit.
 */
function safetyTemplate(_ctx: AiSkinContext): AiStructuredAnswer {
  return {
    intent: 'safety',
    title: 'Pause actives and prioritise safety',
    badge: 'Safety check',
    summary:
      "If you're experiencing burning, swelling, severe pain, a spreading rash, or trouble breathing — stop active products and consider contacting a medical professional.",
    steps: [
      'Stop all active ingredients (acids, retinoids, vitamin C, BHA/AHA)',
      'Rinse gently with cool water — no rubbing, no soap',
      'Apply a plain barrier moisturiser; nothing else',
    ],
    avoid: [
      'Adding any new product to the affected area',
      'Spot-treating with anything stronger than water',
      'Heat, sunlight, or makeup over the affected skin',
    ],
    why:
      "Pura provides general skincare guidance, not a medical diagnosis. If symptoms are severe, persistent, or spreading, a clinician can rule out an allergic reaction or infection.",
    ctas: [
      { label: 'Show gentle routine', action: 'routine' },
    ],
    followUps: [
      'When should I see a dermatologist?',
      'What does a barrier-repair routine look like?',
    ],
  };
}

/**
 * PROFILE template — answers identity / account questions HONESTLY,
 * using the saved displayName when present. Critically does NOT push
 * skincare advice for these questions (the exact failure mode the
 * brief flagged: "what's my name" returning routine guidance).
 */
function profileTemplate(ctx: AiSkinContext): AiStructuredAnswer {
  const name = (ctx.displayName ?? '').trim();
  const hasName = name.length > 0;
  return {
    intent: 'profile',
    title: hasName ? `Your saved name is ${name}` : "I don't have your name on file yet",
    badge: 'Profile',
    summary: hasName
      ? `I'll use "${name}" in your check-ins and progress notes. You can change it in your profile at any time.`
      : "Add your name in your profile and I'll use it in check-ins and progress notes. Your scan data stays private either way.",
    why:
      "Your scans, routine, and saved products stay on your device unless you choose to back them up. You can delete scan history any time from settings.",
    ctas: hasName
      ? [{ label: 'Open profile', action: 'home' }]
      : [{ label: 'Add my name', action: 'home' }],
    followUps: [
      'How is my data stored?',
      'Where do I delete scan history?',
      hasName ? 'Change my name' : 'Add a goal',
    ],
  };
}

function generalTemplate(ctx: AiSkinContext): AiStructuredAnswer {
  return {
    intent: 'general',
    title: 'Here’s the safest next step',
    badge: ctx.hasScan ? 'Based on your skin profile' : 'General guidance',
    summary: ctx.hasScan
      ? 'Keep it simple. Change one thing at a time, and let your next scan confirm whether it’s working.'
      : 'Four pillars: gentle cleanse, hydrate, moisturize, SPF in the morning. Scan to make every answer specific.',
    steps: ['Stay consistent', 'Adjust one product at a time', 'Re-scan to confirm'],
    why: 'Steady inputs beat aggressive routines.',
    ctas: ctx.hasScan
      ? [
          { label: 'Open routine', action: 'routine' },
          { label: 'Show product matches', action: 'products' },
        ]
      : [
          { label: 'Start first scan', action: 'scan' },
          { label: 'Show product matches', action: 'products' },
        ],
    followUps: [
      'What should I do tonight?',
      'What should I avoid?',
      'Which product should I use?',
    ],
  };
}
