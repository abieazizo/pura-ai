/**
 * skinRead API — the REAL wiring for the plain-language first read (GPT-4V).
 *
 * Architecture (decide-and-justify):
 *   • The screen is NETWORK-DECOUPLED (prop-driven), exactly like the shipped
 *     SeenIntoFocusScreen. This module is the call; a container feeds the screen.
 *   • The model NEVER reaches the screen raw — `normalizeSkinRead` validates +
 *     maps it into the canonical `SkinRead`, with "reject + regenerate once".
 *   • Transport reuses the project's AI proxy (aiGateway.proxyUrl() + the
 *     EXPO_PUBLIC token) via a single named operation `readSkin`. The server
 *     handler imports `SKIN_READ_SYSTEM_PROMPT` + `SKIN_READ_JSON_SCHEMA` from
 *     THIS file (server/tsconfig.json already includes ../api/**), so the
 *     prompt/schema are one source of truth across client + server. Send the
 *     image at detail:"high"; enforce strict structured outputs server-side.
 *
 * Until the `readSkin` server route exists the client call returns a service
 * error (honest — never a fake result). Offline/preview verification uses the
 * exported FIXTURES directly (see the dev harness), so the real path stays real.
 */

import type { RawSkinRead } from '@/screens/scan/firstFinding/normalizeSkinRead';
import { normalizeSkinRead } from '@/screens/scan/firstFinding/normalizeSkinRead';
import { guardRead } from '@/screens/scan/yourSkin/coverageGuard';
import { withPlan, type RawPlanFields } from '@/screens/scan/yourSkin/normalizePlan';
import type { SkinRead, SkinReadOutcome } from '@/types/skinRead';
import { aiGateway } from '@/ai/aiGateway';
import { aiLog } from '@/ai/aiLog';

declare const __DEV__: boolean | undefined;

// ===========================================================================
// THE GPT-4V SYSTEM PROMPT (verbatim from the brief; tuned for strict output).
// ===========================================================================

export const SKIN_READ_SYSTEM_PROMPT = `You are Pura's skin reader. You look at ONE selfie and tell the person what you actually see on their skin — like a kind friend who knows skin well, talking to someone who knows nothing about skincare. This is a beauty/skincare read, NOT medical advice. Never name diseases.

HOW TO TALK (most important rule):
- Use plain, everyday words a teenager would understand. NO skincare or medical jargon, EVER.
- BANNED words (never use these or similar): T-zone, glabella, perioral, periorbital, barrier, sebum, erythema, hyperpigmentation, "texture irregularities," "actives," "exfoliants." Say it in plain words instead.
- Name real places on the face in normal words: forehead, between your eyebrows, nose, around your nose, left cheek, right cheek, under your eyes, around your mouth, chin, jaw. NEVER say "T-zone" or "overall" or "across the face."
- Keep every sentence short and warm. No lectures, no exclamation, no flattery, no fear.

WHAT TO DO:
- Only say what you can actually SEE in this photo. Don't guess or pad. If you can't tell, say so in plain words.
- Be specific by naming the exact spot, and if something is worse on one side, say which side ("a little more on your left cheek"). That asymmetry is what makes it feel real.
- Compare everything to THIS person's own skin, never an outside standard. Redness = areas redder than the rest of THEIR skin. Dark spots = spots darker than THEIR even tone. The person may have ANY skin tone — never treat a natural skin tone or a natural warm flush as a problem, and DO still spot dark marks on deep skin.
- Some things you can SEE (redness, rough or bumpy spots, breakouts, dark marks/uneven tone, big pores, fine lines, under-eye darkness). Some things you can only GUESS from clues (oiliness, dryness, sensitive/stressed skin) — for those, sound less sure and make clear it's a guess.
- First, check the photo: is the light good, is it in focus, is the whole face showing, is there makeup? If the photo's rough, sound less sure and say a clearer photo in good light would help. Do NOT make up exact findings on a bad photo.
- Give 3 to 4 findings, most important first. The app shows findings[0] ALONE first, so findings[0] MUST be the single most important, specific, located, high-confidence thing. If the skin looks great, say so warmly, name what's good, and still give at least 3 helpful notes (good things + small tips).
- "opening_line" MUST lead with one warm, TRUE, plain thing that looks good, then name the ONE main thing to look at, plainly and located. Shape: "Your skin tone's really even — that's the first thing I noticed. The main thing to look at: a bit of redness on your cheeks, a little more on the left."
- For each finding: a short plain "what_i_see", a "level" ("a little"/"some"/"a lot"), "spots" (each a place from the fixed list + strength 0.0-1.0), a plain "what_it_means", an easy "do_this" for tonight needing no product knowledge, and "how_sure".
- Lead with something kind and true. Never leave a worry hanging — always pair it with what to do.

ALSO RETURN (these feed the "Your Skin" full-results screen; keep EVERY rule above — plain words, banned-word ban, only-what-you-see, compare-to-their-OWN-baseline for any skin tone, the coverage cap):
- "skin_summary_line": ONE warm, plain, TRUE sentence summing up the whole picture and referencing the person's GOAL. A kind friend's honest gestalt, not a template. Lead positive, name the main couple of things plainly, signal a plan exists. Never a score, never scary, never generic.
- "horizon_line": ONE bounded, HONEST, calibrated forward-look tied to the plan. Use "should"/"likely", NEVER "will". Concrete but modest, e.g. "Stick with this and in a few weeks your cheeks should look calmer." No miracle claims, no timelines you can't honor.
- "routine_focus": 2 to 3 GENTLE moves that GROUP the findings into a short doable plan (never one task per finding). Combine related findings (redness+sensitivity -> "be gentle"; dryness+dullness -> "bring moisture back"). Each move = {"title" (plain), "why" (one plain line tying to what you saw), "addresses" (the exact finding NAMES it solves)}. Phrase as a supportive partner, not a demanding coach. Every move must be doable with what the person ALREADY owns — do NOT require buying anything. Order by what matters most for the goal.

Output ONLY valid JSON matching the schema (opening_line, findings[], good_things[], photo_check{}, sure_level, skin_summary_line, horizon_line, routine_focus). No text outside the JSON.`;

// ===========================================================================
// Strict JSON schema (OpenAI structured outputs, strict:true).
// ===========================================================================

const PLACE_ENUM = [
  'forehead', 'between your eyebrows', 'nose', 'around your nose',
  'left cheek', 'right cheek', 'under your eyes', 'around your mouth',
  'chin', 'jaw',
];

export const SKIN_READ_JSON_SCHEMA = {
  name: 'pura_skin_read',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'opening_line', 'findings', 'good_things', 'photo_check', 'sure_level',
      'skin_summary_line', 'horizon_line', 'routine_focus',
    ],
    properties: {
      opening_line: { type: 'string' },
      skin_summary_line: { type: 'string' },
      horizon_line: { type: 'string' },
      routine_focus: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'why', 'addresses'],
          properties: {
            title: { type: 'string' },
            why: { type: 'string' },
            addresses: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'what_i_see', 'level', 'spots', 'what_it_means', 'do_this', 'how_sure'],
          properties: {
            name: { type: 'string' },
            what_i_see: { type: 'string' },
            level: { type: 'string', enum: ['a little', 'some', 'a lot'] },
            spots: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['place', 'strength'],
                properties: {
                  place: { type: 'string', enum: PLACE_ENUM },
                  strength: { type: 'number' },
                },
              },
            },
            what_it_means: { type: 'string' },
            do_this: { type: 'string' },
            how_sure: {
              type: 'string',
              enum: ['pretty sure', 'fairly sure', 'not totally sure in this light'],
            },
          },
        },
      },
      good_things: { type: 'array', items: { type: 'string' } },
      photo_check: {
        type: 'object',
        additionalProperties: false,
        required: ['light', 'clear', 'whole_face_shown', 'makeup_on', 'better_photo_would_help'],
        properties: {
          light: { type: 'string', enum: ['good', 'low', 'harsh', 'uneven'] },
          clear: { type: 'boolean' },
          whole_face_shown: { type: 'boolean' },
          makeup_on: { type: 'boolean' },
          better_photo_would_help: { type: 'boolean' },
        },
      },
      sure_level: {
        type: 'string',
        enum: ['pretty sure', 'fairly sure', 'not totally sure in this light'],
      },
    },
  },
} as const;

// ===========================================================================
// Transport — reuse the project proxy. One named op: `readSkin`.
// ===========================================================================

async function readImageAsBase64(photoUri: string): Promise<string> {
  const res = await fetch(photoUri);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('readImageAsBase64: non-string result'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

type RawSkinReadResponse = RawSkinRead & RawPlanFields;

async function postReadSkin(
  imageBase64: string,
  signal?: AbortSignal,
): Promise<RawSkinReadResponse> {
  const base = aiGateway.proxyUrl();
  if (!base) throw new Error('AI proxy not configured');
  const token = process.env.EXPO_PUBLIC_PURA_AI_PROXY_TOKEN ?? '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}/readSkin`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
    signal,
  });
  if (!res.ok) throw new Error(`readSkin proxy error ${res.status}`);
  const json = (await res.json()) as RawSkinReadResponse | { result?: RawSkinReadResponse };
  // Accept either the raw object or a { result } envelope.
  return (json as { result?: RawSkinReadResponse }).result ?? (json as RawSkinReadResponse);
}

// ===========================================================================
// Public: read the skin, validate, regenerate once, return a canonical outcome.
// ===========================================================================

export async function readSkinFromPhoto(args: {
  photoUri: string;
  signal?: AbortSignal;
}): Promise<SkinReadOutcome> {
  const { photoUri, signal } = args;

  if (!aiGateway.isAvailable()) {
    return { status: 'service_error', message: 'No analysis service is configured.' };
  }

  let imageBase64: string;
  try {
    imageBase64 = await readImageAsBase64(photoUri);
  } catch (e) {
    return {
      status: 'service_error',
      message: 'I couldn’t read that photo — let’s try once more.',
    };
  }

  // First pass.
  let raw: RawSkinRead;
  try {
    raw = await postReadSkin(imageBase64, signal);
  } catch (e) {
    aiLog.warn('readSkinFromPhoto', 'first pass failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    return {
      status: 'service_error',
      message: 'I couldn’t quite finish that read — let’s try once more.',
    };
  }

  let { read, needsRegen, reasons } = finalizeRead(raw);

  // Reject + regenerate ONCE, then accept best-effort. The regenerate signal now
  // fires on a plain-language / stranger-test failure OR a COVERAGE-CAP wash (a
  // finding the model spread across the whole face) — so a face-wide wash never
  // survives to the screen on a clean second pass.
  if (needsRegen) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Pura SkinRead] regenerating once:', reasons.join('; '));
    }
    try {
      const raw2 = await postReadSkin(imageBase64, signal);
      const second = finalizeRead(raw2);
      if (second.read) read = second.read;
    } catch {
      /* keep first read if the regen failed */
    }
  }

  return outcomeFromRead(read);
}

/**
 * The full validation pipeline for ONE raw response — shared by the first pass
 * and the single regenerate, so both go through the same three gates in order:
 *
 *   1. `normalizeSkinRead` — plain-language + stranger-test on the hero, mapping
 *      the model's words onto the canonical read (and its reject/regen signal).
 *   2. `guardRead` — the COVERAGE-CAP guard: drop any spot whose region is too
 *      large, and EMPTY any finding that tried to wash the whole face (advising a
 *      regenerate). A face-wide wash is therefore structurally unable to render,
 *      and `hasRealConcerns` is recomputed from what actually survived.
 *   3. `withPlan` — fold in the screen-2 plan fields (skin_summary_line,
 *      horizon_line, routine_focus) off the SAME response, each move's
 *      `addresses` resolved onto finding ids. The screen reads ONLY this result —
 *      never the raw model output, and never an unguarded read.
 */
function finalizeRead(raw: RawSkinReadResponse): {
  read: SkinRead | null;
  needsRegen: boolean;
  reasons: string[];
} {
  const base = normalizeSkinRead(raw);
  if (!base.read) return base;

  const guarded = guardRead(base.read);
  const concernsLeft = guarded.findings.some(
    (f) => f.metric !== 'positive' && f.spots.length > 0,
  );
  const guardedRead: SkinRead = {
    ...base.read,
    findings: guarded.findings,
    hasRealConcerns: concernsLeft,
  };

  const read = withPlan(guardedRead, raw);
  const reasons = guarded.report.regenerateAdvised
    ? [...base.reasons, `coverage wash → regenerate (${guarded.report.rejectedIds.join(', ')})`]
    : base.reasons;
  return {
    read,
    needsRegen: base.needsRegen || guarded.report.regenerateAdvised,
    reasons,
  };
}

/** Map a validated read → the outcome the screen branches on. */
export function outcomeFromRead(read: SkinRead | null): SkinReadOutcome {
  if (!read) {
    return {
      status: 'service_error',
      message: 'I couldn’t quite finish that read — let’s try once more.',
    };
  }
  if (read.photoCheck.betterPhotoWouldHelp) {
    return { status: 'bad_photo', read };
  }
  return { status: 'ready', read };
}

// ===========================================================================
// FIXTURES — offline/preview ONLY (the dev harness uses these directly). Each
// is a realistic, validated-by-construction `SkinRead`. NEVER used by the real
// path above.
// ===========================================================================

export const SKIN_READ_FIXTURES: Record<string, SkinRead> = {
  // The canonical normal read — redness on both cheeks, stronger on the left.
  normal: {
    openingLine:
      'Your skin tone’s really even — that’s the first thing I noticed. The main thing to look at: a bit of redness on your cheeks, a little more on the left.',
    findings: [
      {
        id: 'read-finding-0',
        name: 'A little redness',
        metric: 'redness',
        whatISee:
          'Your cheeks look a touch warmer and pinker than the rest of your skin, a little more on the left.',
        level: 'a little',
        spots: [
          { region: 'left_cheek', place: 'Left cheek', strength: 0.72 },
          { region: 'right_cheek', place: 'Right cheek', strength: 0.46 },
        ],
        whatItMeans:
          'Skin that warms up like this is usually just a bit sensitive that day — nothing to worry about.',
        doThis:
          'Tonight, rinse with cool (not hot) water and keep things gentle and simple.',
        howSure: 'pretty sure',
        lowConfidence: false,
        strongestRegion: 'left_cheek',
      },
      {
        id: 'read-finding-1',
        name: 'A few small bumps',
        metric: 'breakouts',
        whatISee: 'A couple of tiny raised spots near your chin.',
        level: 'a little',
        spots: [{ region: 'chin', place: 'Chin', strength: 0.4 }],
        whatItMeans: 'Small spots like these usually settle on their own in a few days.',
        doThis: 'Leave them be tonight — try not to touch or pick.',
        howSure: 'fairly sure',
        lowConfidence: false,
        strongestRegion: 'chin',
      },
    ],
    goodThings: ['Your skin tone looks really even', 'Good natural glow'],
    photoCheck: {
      light: 'good',
      clear: true,
      wholeFaceShown: true,
      makeupOn: false,
      betterPhotoWouldHelp: false,
    },
    sureLevel: 'pretty sure',
    hasRealConcerns: true,
  },

  // Same finding, but low confidence — the glow halves + the line/chip hedge.
  lowConfidence: {
    openingLine:
      'Your skin looks healthy and even. One thing I’m not totally sure about in this light: maybe a little redness on your left cheek.',
    findings: [
      {
        id: 'read-finding-0',
        name: 'Maybe a little redness',
        metric: 'redness',
        whatISee: 'There might be a slightly warmer patch on your left cheek, but the light makes it hard to be sure.',
        level: 'a little',
        spots: [{ region: 'left_cheek', place: 'Left cheek', strength: 0.55 }],
        whatItMeans: 'If it’s there, it’s the kind of warmth that comes and goes.',
        doThis: 'Take another photo in soft daylight sometime and I’ll get a clearer look.',
        howSure: 'not totally sure in this light',
        lowConfidence: true,
        strongestRegion: 'left_cheek',
      },
    ],
    goodThings: ['Skin looks healthy', 'Tone looks even'],
    photoCheck: {
      light: 'uneven',
      clear: true,
      wholeFaceShown: true,
      makeupOn: false,
      betterPhotoWouldHelp: false,
    },
    sureLevel: 'not totally sure in this light',
    hasRealConcerns: true,
  },

  // No real concerns — a positive wash + a "keep it up" note.
  positive: {
    openingLine:
      'Honestly, your skin looks happy and even today — really nice. Nothing’s jumping out as something to fix.',
    findings: [
      {
        id: 'read-finding-0',
        name: 'Looking good',
        metric: 'positive',
        whatISee: 'Even tone, a healthy glow, and your skin looks calm and comfortable.',
        level: 'a little',
        spots: [],
        whatItMeans: 'Whatever you’re doing is working — this is a good baseline to keep.',
        doThis: 'Keep it simple tonight and drink some water before bed.',
        howSure: 'pretty sure',
        lowConfidence: false,
        strongestRegion: null,
      },
    ],
    goodThings: ['Even tone', 'Healthy glow', 'Skin looks calm'],
    photoCheck: {
      light: 'good',
      clear: true,
      wholeFaceShown: true,
      makeupOn: false,
      betterPhotoWouldHelp: false,
    },
    sureLevel: 'pretty sure',
    hasRealConcerns: false,
  },

  // Bad photo — honest path. No invented findings.
  badPhoto: {
    openingLine: 'It’s a little dark for me to read your skin clearly.',
    findings: [],
    goodThings: [],
    photoCheck: {
      light: 'low',
      clear: false,
      wholeFaceShown: true,
      makeupOn: false,
      betterPhotoWouldHelp: true,
    },
    sureLevel: 'not totally sure in this light',
    hasRealConcerns: false,
  },
};
