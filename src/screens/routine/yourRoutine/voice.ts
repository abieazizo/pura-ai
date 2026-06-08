/**
 * voice — the orb's voice. The soul of the routine experience.
 *
 * A perceptive, calm friend who happens to know skin: economical, a little dry,
 * deeply kind, never performative. Warmth comes from attention and specificity,
 * never from adjectives. The HARD RULES are enforced by `lintVoice` so they
 * can't quietly rot:
 *   • short sentences, present tense
 *   • NO exclamation marks
 *   • never: glow up · journey · amazing · babe · radiant · transform
 *   • plain language — no T-zone · barrier · sebum · hyperpigmentation ·
 *     actives · exfoliants
 *   • never nag · understate, don't oversell
 *
 * The canonical lines below are LOCKED (from the spec). Generators produce new
 * lines in the same register; every generated line is linted in __DEV__.
 */

/** The locked lines, verbatim. " - " is the voice's spaced hyphen, not a typo. */
export const VOICE = {
  firstReveal:
    "I kept this short on purpose - three small things, built around what I actually saw.",

  /** Stated plainly so the routine works with nothing bought. */
  productFree: 'You can start tonight with what you have.',

  morningGreetings: [
    "Morning. Two steps - I'll keep you company.",
    "There you are. Let's keep those cheeks happy.",
    'Morning. This won’t take long.',
  ],
  /** Surfaced only when rescans show real calm — never invented. */
  morningCalmer: "Morning. Your skin's been calmer lately, by the way.",

  eveningGreetings: [
    "Evening. Two steps, then you're done.",
    "There you are. Let's wind the day down.",
    'Evening. This won’t take long.',
  ],

  /** Welcome back after a gap. Zero guilt, by design. */
  welcomeBack:
    "Been a few days - no harm done. Skin doesn't keep score, and neither do I. Pick it back up?",

  /** Ritual step leads — the canonical trio. */
  leadCleanse: 'Warm water, take your time.',
  leadMoisturise: 'Moisturiser next - less than you think.',
  leadSpf:
    'Last one, the SPF. This is the one that actually changes things in a month.',

  /** Completion benefit lines — benefit, never a cliche. */
  completeSpf:
    "The SPF's the best thing you did for your skin today. Quietly huge.",

  /** Done landing. */
  doneSeeYouTonight: "That's it. I'll see you tonight.",
  doneSeeYouMorning: "That's it. I'll see you in the morning.",
  doneTheTrick: "Small thing, done well. That's the whole trick.",

  /** Honest commerce. The orb never nags to buy. */
  noSerumYet:
    "Honestly? You don't need a serum yet. Save your money - the basics are doing the work.",
  oneUpgradeForRedness:
    "If you want one upgrade, this is the one I'd pick for the redness. Not essential, but it'd help.",

  /** Skip — unbothered, never a mother. */
  skipSpf:
    "Skipping's fine. I'd not skip the SPF - but I'm not your mother. Tomorrow's there.",
  skipGeneric:
    "Skipping's fine. Tomorrow's there - I'm not keeping score.",

  /** Pause / end-early — graceful, guilt-free. */
  paused: "Paused. No rush - I'll wait.",
  endedEarly: "We'll leave it there. What you did still counts.",
} as const;

// ---------------------------------------------------------------------------
// Rotation — greetings vary and never repeat back-to-back.
// ---------------------------------------------------------------------------

/**
 * Pick a greeting that differs from `lastShown`. Deterministic given a seed
 * (e.g. the day number), so it's stable within a day but moves across days.
 * If the user's skin is genuinely calmer lately, that honest line wins the
 * morning slot occasionally — but never two days running.
 */
export function pickMorningGreeting(opts: {
  seed: number;
  lastShown?: string;
  calmerLately?: boolean;
}): string {
  const { seed, lastShown, calmerLately } = opts;
  if (calmerLately && VOICE.morningCalmer !== lastShown && seed % 3 === 0) {
    return VOICE.morningCalmer;
  }
  return rotate(VOICE.morningGreetings, seed, lastShown);
}

export function pickEveningGreeting(opts: { seed: number; lastShown?: string }): string {
  return rotate(VOICE.eveningGreetings, opts.seed, opts.lastShown);
}

/** Pick from `list` by seed, skipping `avoid` so it never repeats back-to-back. */
function rotate(list: readonly string[], seed: number, avoid?: string): string {
  if (list.length === 0) return '';
  let idx = ((seed % list.length) + list.length) % list.length;
  if (list[idx] === avoid && list.length > 1) idx = (idx + 1) % list.length;
  return list[idx];
}

/** Done-landing line, contextual to the time of day, alternating with the trick. */
export function doneLanding(opts: { timeOfDay: 'morning' | 'evening'; seed: number }): string {
  if (opts.seed % 2 === 1) return VOICE.doneTheTrick;
  return opts.timeOfDay === 'morning' ? VOICE.doneSeeYouTonight : VOICE.doneSeeYouMorning;
}

/**
 * Assemble a throughline from its parts. The grammar lives here; the skin
 * specifics (which finding, which side, which calming clause) come from
 * `findings.ts`. Shape: "{lead} It's here because of the {phrase} - {clause}."
 */
export function composeThroughline(parts: {
  lead: string;
  phrase: string;
  clause: string;
}): string {
  const lead = parts.lead.trim().replace(/\s*$/, '');
  const tail = `It's here because of the ${parts.phrase} - ${parts.clause}.`;
  return lead ? `${lead} ${tail}` : tail;
}

// ---------------------------------------------------------------------------
// The linter — the hard rules, enforced.
// ---------------------------------------------------------------------------

const BANNED_WORDS = ['glow up', 'glow-up', 'journey', 'amazing', 'babe', 'radiant', 'transform'];
const JARGON = [
  't-zone',
  't zone',
  'barrier',
  'sebum',
  'hyperpigmentation',
  'actives',
  'exfoliant',
  'comedogenic',
];

export interface VoiceViolation {
  rule: 'exclamation' | 'banned-word' | 'jargon';
  detail: string;
}

/** Return every voice-rule violation in a single line of copy (empty = clean). */
export function lintVoice(text: string): VoiceViolation[] {
  const out: VoiceViolation[] = [];
  const lower = text.toLowerCase();
  if (text.includes('!')) out.push({ rule: 'exclamation', detail: 'contains "!"' });
  for (const w of BANNED_WORDS) {
    if (lower.includes(w)) out.push({ rule: 'banned-word', detail: `"${w}"` });
  }
  for (const j of JARGON) {
    if (lower.includes(j)) out.push({ rule: 'jargon', detail: `"${j}"` });
  }
  return out;
}

/** Dev-only guard: throws if a line breaks voice, so regressions fail loud. */
export function assertVoice(label: string, text: string): string {
  if (__DEV__) {
    const v = lintVoice(text);
    if (v.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[voice] "${label}" breaks the voice: ${v.map((x) => `${x.rule} ${x.detail}`).join(', ')} → ${JSON.stringify(text)}`,
      );
    }
  }
  return text;
}

/** Every static line + a sample of generators, for the harness lint panel. */
export function allStaticVoiceLines(): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [];
  for (const [k, v] of Object.entries(VOICE)) {
    if (typeof v === 'string') out.push({ label: k, text: v });
    else if (Array.isArray(v)) v.forEach((t, i) => out.push({ label: `${k}[${i}]`, text: t }));
  }
  return out;
}

export const VOICE_RULES = [
  'Short sentences, present tense',
  'No exclamation marks',
  'Never: glow up, journey, amazing, babe, radiant, transform',
  'Plain language: no T-zone, barrier, sebum, hyperpigmentation, actives, exfoliants',
  'Warmth from attention + specificity, never adjectives',
  'Never nag; understate, do not oversell',
] as const;
