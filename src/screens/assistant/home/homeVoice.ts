/**
 * homeVoice — the orb's Home greetings.
 *
 * Same register as the routine voice (economical, a little dry, deeply kind,
 * never performative) and linted by the same `lintVoice` rules. Home greets;
 * it never starts the ritual — that's the focus card's job.
 *
 * Two kinds of line:
 *   • Pool greetings — generic but warm, rotated by a day seed so the line
 *     VARIES day to day and never repeats two days running.
 *   • Callbacks — specific lines the orb may only say when the data makes
 *     them true (a real scan delta, a real scan count). Never invented.
 */

import { assertVoice } from '@/screens/routine/yourRoutine/voice';

const MORNING = [
  'Morning. Ready when you are.',
  'There you are. Gently does it today.',
  'Morning. One small thing before the day starts.',
  'Slow start or quick one - both work.',
] as const;

/**
 * The routine period stays 'morning' until late afternoon (you can still do
 * the morning steps), but a greeting that says "Morning." at 2pm reads
 * broken. These lines stay honest about the hour without a hint of guilt.
 */
const AFTERNOON = [
  'Afternoon. No rush - the morning steps still count.',
  'There you are. The day’s moving, this won’t.',
  'Afternoon. Still time for the small stuff.',
] as const;

const EVENING = [
  'Evening. Let’s wind the day down.',
  'There you are. The day can end now.',
  'Evening. Two quiet minutes, then rest.',
  'However today went, this part’s easy.',
] as const;

/** Plain-word zones the calmer callback may name. */
export type CalmZoneWord = 'cheeks' | 'forehead' | 'chin';

export interface GreetingFacts {
  /** Stable per-day seed (e.g. local day number). Drives rotation. */
  seed: number;
  timeOfDay: 'morning' | 'evening';
  /** Local hour 0–23 — greetings are honest about the actual hour. */
  hour: number;
  /** True only when rescans show a real improvement vs the first scan. */
  calmerSinceFirstScan: boolean;
  /** The top concern's zone in plain words, when one resolves. */
  calmZone: CalmZoneWord | null;
  /** Total scans taken — grounds the "starting to know you" callback. */
  scanCount: number;
}

function calmerLine(zone: CalmZoneWord | null): string {
  if (zone === 'cheeks') return 'Your cheeks are calmer than your first scan.';
  if (zone === 'forehead') return 'Your forehead is calmer than your first scan.';
  if (zone === 'chin') return 'Your chin is calmer than your first scan.';
  return 'Your skin reads calmer than your first scan.';
}

/** Pick from `list` by seed. Seed increments daily, so consecutive days differ. */
function rotate(list: readonly string[], seed: number): string {
  const idx = ((seed % list.length) + list.length) % list.length;
  return list[idx];
}

/**
 * The greeting for today. Deterministic: same facts → same line. Callbacks
 * surface roughly every third day WHEN their data is true, so the specific
 * lines stay an occasional, earned moment rather than wallpaper.
 */
export function pickHomeGreeting(facts: GreetingFacts): string {
  const { seed, timeOfDay, hour, calmerSinceFirstScan, calmZone, scanCount } =
    facts;

  if (calmerSinceFirstScan && seed % 3 === 0) {
    return assertVoice('home.calmer', calmerLine(calmZone));
  }
  if (scanCount >= 3 && seed % 3 === 1) {
    return assertVoice(
      'home.knownYou',
      `${scanCount} scans in - I’m starting to know your skin.`,
    );
  }
  const pool =
    timeOfDay === 'evening'
      ? EVENING
      : hour >= 12
        ? AFTERNOON
        : MORNING;
  return assertVoice('home.pool', rotate(pool, seed));
}

/** Every static Home line, for the dev lint sweep. */
export function allHomeVoiceLines(): { label: string; text: string }[] {
  return [
    ...MORNING.map((t, i) => ({ label: `home.morning[${i}]`, text: t })),
    ...AFTERNOON.map((t, i) => ({ label: `home.afternoon[${i}]`, text: t })),
    ...EVENING.map((t, i) => ({ label: `home.evening[${i}]`, text: t })),
    { label: 'home.calmer.cheeks', text: calmerLine('cheeks') },
    { label: 'home.calmer.forehead', text: calmerLine('forehead') },
    { label: 'home.calmer.chin', text: calmerLine('chin') },
    { label: 'home.calmer.generic', text: calmerLine(null) },
  ];
}
