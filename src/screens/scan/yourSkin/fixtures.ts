/**
 * fixtures — offline/preview ONLY full reads for the "Your Skin" screen. Each is
 * a realistic, validated-by-construction `SkinRead` WITH the screen-2 plan
 * fields (skinSummaryLine, horizonLine, routineFocus with addressesIds already
 * resolved). The real path never uses these — it runs `readSkinFromPhoto` +
 * `normalizeSkinRead` + `normalizeRoutineFocus`. They exist so the dev harness
 * can render every hard case (incl. a deep-skin multi-finding face) with no
 * network, and so the choreography can be reviewed in isolation.
 *
 * Every line obeys the same rules as production: plain words only, no jargon,
 * everything compared to THIS person's OWN baseline, dark marks caught on deep
 * skin WITHOUT washing the face or framing natural depth as a flaw.
 */

import type { SkinRead } from '@/types/skinRead';
import type { ToneBackdrop } from './SkinMapCard';
import type { ScreenTheme } from '../firstFinding/metricTint';

export interface YourSkinFixture {
  key: string;
  label: string;
  read: SkinRead;
  toneBackdrop: ToneBackdrop;
  goal: string;
  mirrored: boolean;
  /** Suggested theme to open in (both are fully designed). */
  theme: ScreenTheme;
}

// ── 1 · The canonical two-finding read ─────────────────────────────────────
const redness: SkinRead = {
  openingLine:
    'Your skin tone’s really even — that’s the first thing I noticed. The main thing to look at is a bit of redness on your cheeks, a little more on the left.',
  skinSummaryLine:
    'Your skin looks healthy and even — there’s just a little warmth on your cheeks we can calm down, which lines up with the calmer skin you’re after.',
  horizonLine:
    'Stick with a gentle few days and your cheeks should look calmer by the end of next week.',
  findings: [
    {
      id: 'read-finding-0',
      name: 'A little redness',
      metric: 'redness',
      whatISee: 'Your cheeks look a touch warmer and pinker than the rest of your skin, a little more on the left.',
      level: 'a little',
      spots: [
        { region: 'left_cheek', place: 'Left cheek', strength: 0.72 },
        { region: 'right_cheek', place: 'Right cheek', strength: 0.46 },
      ],
      whatItMeans: 'Skin that warms up like this is usually just a bit sensitive that day — nothing to worry about.',
      doThis: 'Tonight, rinse with cool (not hot) water and keep things gentle and simple.',
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
  photoCheck: { light: 'good', clear: true, wholeFaceShown: true, makeupOn: false, betterPhotoWouldHelp: false },
  sureLevel: 'pretty sure',
  hasRealConcerns: true,
  routineFocus: [
    {
      id: 'move-0',
      title: 'Be gentle for a few days',
      why: 'Cooling things down is the quickest way to calm that warmth on your cheeks.',
      addresses: ['A little redness'],
      addressesIds: ['read-finding-0'],
    },
    {
      id: 'move-1',
      title: 'Let those little bumps settle',
      why: 'They clear fastest when they’re left alone — no picking.',
      addresses: ['A few small bumps'],
      addressesIds: ['read-finding-1'],
    },
  ],
};

// ── 2 · Five-to-six findings — must feel CALMER than a naive 2-finding page ──
const sixFindings: SkinRead = {
  openingLine:
    'Honestly your skin’s in good shape — the main thing is a little warmth on your cheeks, with a few smaller things we can fold into the same simple plan.',
  skinSummaryLine:
    'There’s a lot going right here — a few small things to tidy up, and they group into just three easy moves toward the clearer skin you want.',
  horizonLine:
    'Keep this up and over the next few weeks your cheeks should look calmer and your skin a little more even.',
  findings: [
    {
      id: 'read-finding-0',
      name: 'A little redness',
      metric: 'redness',
      whatISee: 'Your cheeks run a bit warmer and pinker than the rest of your skin, more on the left.',
      level: 'some',
      spots: [
        { region: 'left_cheek', place: 'Left cheek', strength: 0.74 },
        { region: 'right_cheek', place: 'Right cheek', strength: 0.5 },
      ],
      whatItMeans: 'Usually a sign your skin felt a little sensitive that day.',
      doThis: 'Keep tonight gentle — cool water, nothing harsh.',
      howSure: 'pretty sure',
      lowConfidence: false,
      strongestRegion: 'left_cheek',
    },
    {
      id: 'read-finding-1',
      name: 'Some dryness',
      metric: 'dryness',
      whatISee: 'Your cheeks and the edges of your forehead look a little tight and flaky up close.',
      level: 'some',
      spots: [
        { region: 'right_cheek', place: 'Right cheek', strength: 0.55 },
        { region: 'forehead', place: 'Forehead', strength: 0.4 },
      ],
      whatItMeans: 'Thirsty skin shows redness more, so this and the warmth go together.',
      doThis: 'Put on your moisturizer while your skin’s still a bit damp tonight.',
      howSure: 'fairly sure',
      lowConfidence: false,
      strongestRegion: 'right_cheek',
    },
    {
      id: 'read-finding-2',
      name: 'A little dullness',
      metric: 'dryness',
      whatISee: 'Your skin looks a touch flat under the eyes and across the forehead, like it could use water.',
      level: 'a little',
      spots: [{ region: 'under_eyes', place: 'Under your eyes', strength: 0.42 }],
      whatItMeans: 'Dullness and dryness usually clear up together once skin’s happier.',
      doThis: 'A glass of water before bed honestly helps here.',
      howSure: 'fairly sure',
      lowConfidence: false,
      strongestRegion: 'under_eyes',
    },
    {
      id: 'read-finding-3',
      name: 'A few small bumps',
      metric: 'breakouts',
      whatISee: 'A couple of tiny raised spots near your chin.',
      level: 'a little',
      spots: [{ region: 'chin', place: 'Chin', strength: 0.45 }],
      whatItMeans: 'The kind that pass on their own in a few days.',
      doThis: 'Leave them alone tonight — no picking.',
      howSure: 'fairly sure',
      lowConfidence: false,
      strongestRegion: 'chin',
    },
    {
      id: 'read-finding-4',
      name: 'A little shine',
      metric: 'oil',
      whatISee: 'Your nose looks a bit shinier than the rest of your face.',
      level: 'a little',
      spots: [{ region: 'nose', place: 'Nose', strength: 0.4 }],
      whatItMeans: 'Totally normal, and it often eases once dry skin is looked after.',
      doThis: 'A light blot is all you need — don’t over-wash it.',
      howSure: 'fairly sure',
      lowConfidence: false,
      strongestRegion: 'nose',
    },
    {
      id: 'read-finding-5',
      name: 'A little darkness under the eyes',
      metric: 'dark_marks',
      whatISee: 'The skin just under your eyes looks a shade darker than your cheeks.',
      level: 'a little',
      spots: [{ region: 'under_eyes', place: 'Under your eyes', strength: 0.38 }],
      whatItMeans: 'Often just tiredness or thin skin there — very common.',
      doThis: 'Some extra sleep this week is the real fix.',
      howSure: 'not totally sure in this light',
      lowConfidence: true,
      strongestRegion: 'under_eyes',
    },
  ],
  goodThings: ['Even tone overall', 'No deep or lasting marks', 'Skin looks comfortable'],
  photoCheck: { light: 'good', clear: true, wholeFaceShown: true, makeupOn: false, betterPhotoWouldHelp: false },
  sureLevel: 'fairly sure',
  hasRealConcerns: true,
  routineFocus: [
    {
      id: 'move-0',
      title: 'Be gentle for a few days',
      why: 'Calming the warmth and the sensitivity behind it settles your cheeks.',
      addresses: ['A little redness', 'A few small bumps'],
      addressesIds: ['read-finding-0', 'read-finding-3'],
    },
    {
      id: 'move-1',
      title: 'Bring moisture back',
      why: 'Most of what you’re seeing — the dryness, the dullness, even some shine — eases once your skin’s less thirsty.',
      addresses: ['Some dryness', 'A little dullness', 'A little shine'],
      addressesIds: ['read-finding-1', 'read-finding-2', 'read-finding-4'],
    },
    {
      id: 'move-2',
      title: 'Rest up this week',
      why: 'The under-eye shadow is more about sleep than skincare.',
      addresses: ['A little darkness under the eyes'],
      addressesIds: ['read-finding-5'],
    },
  ],
};

// ── 3 · Deep skin, multi-finding — the visible Skan-beater ──────────────────
const deepSkin: SkinRead = {
  openingLine:
    'Your skin tone is beautifully rich and even — the main thing I’d look at is a couple of darker marks where past spots have healed.',
  skinSummaryLine:
    'Your skin looks healthy and your tone is lovely and even — there are just a few darker marks left from old spots, and those are exactly what this plan helps with.',
  horizonLine:
    'With sun protection and patience these marks should fade and even out over the next couple of months — slowly, but they do.',
  findings: [
    {
      id: 'read-finding-0',
      name: 'A couple of darker marks',
      metric: 'dark_marks',
      whatISee: 'A few small spots on your left cheek and near your mouth look a little darker than the skin around them, where older spots have healed.',
      level: 'some',
      spots: [
        { region: 'left_cheek', place: 'Left cheek', strength: 0.7 },
        { region: 'around_mouth', place: 'Around your mouth', strength: 0.5 },
      ],
      whatItMeans: 'This is your skin’s normal way of healing after a spot — it fades, it just takes time.',
      doThis: 'The big one is sunlight — wearing sun protection on these spots is what helps them fade.',
      howSure: 'pretty sure',
      lowConfidence: false,
      strongestRegion: 'left_cheek',
    },
    {
      id: 'read-finding-1',
      name: 'A little warmth',
      metric: 'redness',
      whatISee: 'The skin high on your cheeks looks a touch warmer than the rest, more on the right.',
      level: 'a little',
      spots: [
        { region: 'right_cheek', place: 'Right cheek', strength: 0.5 },
        { region: 'left_cheek', place: 'Left cheek', strength: 0.34 },
      ],
      whatItMeans: 'Just a sign of a little sensitivity that day — nothing lasting.',
      doThis: 'Keep things cool and gentle tonight.',
      howSure: 'fairly sure',
      lowConfidence: false,
      strongestRegion: 'right_cheek',
    },
    {
      id: 'read-finding-2',
      name: 'A few small bumps',
      metric: 'breakouts',
      whatISee: 'A couple of small raised spots along your jaw.',
      level: 'a little',
      spots: [{ region: 'jaw', place: 'Jaw', strength: 0.42 }],
      whatItMeans: 'The kind that come and go — best left alone so they don’t leave a mark.',
      doThis: 'Hands off these ones, so they heal clean.',
      howSure: 'fairly sure',
      lowConfidence: false,
      strongestRegion: 'jaw',
    },
  ],
  goodThings: ['Rich, even skin tone', 'Healthy natural glow', 'No dryness at all'],
  photoCheck: { light: 'good', clear: true, wholeFaceShown: true, makeupOn: false, betterPhotoWouldHelp: false },
  sureLevel: 'pretty sure',
  hasRealConcerns: true,
  routineFocus: [
    {
      id: 'move-0',
      title: 'Protect those marks from the sun',
      why: 'Sunlight is what keeps old marks dark — covering them is what lets them fade.',
      addresses: ['A couple of darker marks'],
      addressesIds: ['read-finding-0'],
    },
    {
      id: 'move-1',
      title: 'Be gentle so new spots don’t leave marks',
      why: 'Calming the warmth and leaving bumps alone keeps fresh marks from forming.',
      addresses: ['A little warmth', 'A few small bumps'],
      addressesIds: ['read-finding-1', 'read-finding-2'],
    },
  ],
};

// ── 4 · Great skin — hero is a STRENGTH, still ends on a plan ────────────────
const greatSkin: SkinRead = {
  openingLine:
    'Honestly, your skin looks happy and even today — really nice. Nothing’s jumping out as something to fix.',
  skinSummaryLine:
    'Your skin looks genuinely healthy today — even tone, calm, and glowing. This is a great baseline, and the plan is just about keeping it.',
  horizonLine:
    'Keep doing what you’re doing and your skin should stay this calm and even — protecting it now is what keeps it here.',
  findings: [
    {
      id: 'read-finding-0',
      name: 'Calm, even, and glowing',
      metric: 'positive',
      whatISee: 'Even tone, a healthy glow, and your skin looks calm and comfortable all over.',
      level: 'a little',
      spots: [],
      whatItMeans: 'Whatever you’re doing is working — this is a strong place to be.',
      doThis: 'Keep it simple tonight and drink some water before bed.',
      howSure: 'pretty sure',
      lowConfidence: false,
      strongestRegion: null,
    },
  ],
  goodThings: ['Even tone', 'Healthy glow', 'Skin looks calm', 'No dryness or redness'],
  photoCheck: { light: 'good', clear: true, wholeFaceShown: true, makeupOn: false, betterPhotoWouldHelp: false },
  sureLevel: 'pretty sure',
  hasRealConcerns: false,
  routineFocus: [
    {
      id: 'move-0',
      title: 'Protect what’s working',
      why: 'A little sun protection in the day is what keeps even, calm skin even and calm.',
      addresses: ['Calm, even, and glowing'],
      addressesIds: ['read-finding-0'],
    },
    {
      id: 'move-1',
      title: 'Keep it simple',
      why: 'Your skin’s happy — there’s no need to add more and risk upsetting it.',
      addresses: [],
      addressesIds: [],
    },
  ],
};

// ── 5 · Bad photo, shown anyway — tentative read, gentle starting point ──────
const badPhotoCarry: SkinRead = {
  openingLine:
    'It’s a little dark for me to be sure, but your skin looks healthy — maybe a touch of warmth on your left cheek.',
  skinSummaryLine:
    'The light makes this a soft read, but your skin looks healthy — the one thing I think I see is a little warmth on your left cheek.',
  horizonLine:
    'A clearer photo in daylight would let me be sure — but if this holds up, a few gentle days should calm it.',
  findings: [
    {
      id: 'read-finding-0',
      name: 'Maybe a little redness',
      metric: 'redness',
      whatISee: 'There might be a slightly warmer patch on your left cheek, but the light makes it hard to be sure.',
      level: 'a little',
      spots: [{ region: 'left_cheek', place: 'Left cheek', strength: 0.5 }],
      whatItMeans: 'If it’s there, it’s the kind of warmth that comes and goes.',
      doThis: 'Take another photo in soft daylight sometime and I’ll get a clearer look.',
      howSure: 'not totally sure in this light',
      lowConfidence: true,
      strongestRegion: 'left_cheek',
    },
  ],
  goodThings: ['Skin looks healthy', 'Tone looks even'],
  photoCheck: { light: 'low', clear: false, wholeFaceShown: true, makeupOn: false, betterPhotoWouldHelp: true },
  sureLevel: 'not totally sure in this light',
  hasRealConcerns: true,
  routineFocus: [
    {
      id: 'move-0',
      title: 'A gentle few days',
      why: 'Cool water and keeping things simple calms warmth, whether or not it’s really there.',
      addresses: ['Maybe a little redness'],
      addressesIds: ['read-finding-0'],
    },
  ],
};

export const YOUR_SKIN_FIXTURES: YourSkinFixture[] = [
  { key: 'redness', label: 'Redness (2)', read: redness, toneBackdrop: 'medium', goal: 'Calmer, less red skin', mirrored: true, theme: 'dark' },
  { key: 'six', label: 'Six findings', read: sixFindings, toneBackdrop: 'medium', goal: 'Clearer, more even skin', mirrored: true, theme: 'dark' },
  { key: 'deep', label: 'Deep skin (3)', read: deepSkin, toneBackdrop: 'deep', goal: 'Fade old marks, even tone', mirrored: true, theme: 'dark' },
  { key: 'great', label: 'Great skin', read: greatSkin, toneBackdrop: 'light', goal: 'Keep my skin healthy', mirrored: true, theme: 'dark' },
  { key: 'badphoto', label: 'Bad photo', read: badPhotoCarry, toneBackdrop: 'light', goal: 'Calmer skin', mirrored: true, theme: 'dark' },
];

export const FIXTURE_BY_KEY: Record<string, YourSkinFixture> = Object.fromEntries(
  YOUR_SKIN_FIXTURES.map((f) => [f.key, f]),
);
