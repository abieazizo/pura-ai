/**
 * ritualHaptics — the composed haptic language, over the shared `hapt` kit.
 *
 * The spec scores haptics like a small piece of music:
 *   • Light impact      → ritual-enter, step-start, each morph header locking
 *   • Soft double-tick  → step-complete (light-light, ~90ms apart)
 *   • One fuller         → the reveal assembly finishing
 *   • One medium warm    → the done-landing. The ONLY fuller beat in the ritual.
 *   • Silence            → the absorb-wait and the morning greeting. Logged as a
 *                          marker so the silence is provable, not just absent.
 *
 * Every beat is recorded to an in-memory log so the deliverable can show the
 * composition actually fired in order. `hapt` already honors the global haptics
 * toggle, so these wrappers inherit it.
 */

import { hapt } from '@/utils/haptics';

export type HapticBeat =
  | 'reveal-enter'
  | 'header-lock'
  | 'assembly-done'
  | 'ritual-enter'
  | 'step-start'
  | 'step-complete'
  | 'gold-bloom'
  | 'done-landing'
  | 'silence';

export interface HapticLogEntry {
  i: number;
  beat: HapticBeat;
  weight: 'light' | 'light-light' | 'medium' | 'none';
  note?: string;
  atMs: number;
}

const _log: HapticLogEntry[] = [];
let _t0 = 0;

function nowMs(): number {
  // Date.now is fine here (not a workflow script). Falls back to 0 if absent.
  return typeof Date !== 'undefined' && Date.now ? Date.now() : 0;
}

function record(beat: HapticBeat, weight: HapticLogEntry['weight'], note?: string): void {
  _log.push({ i: _log.length, beat, weight, note, atMs: nowMs() - _t0 });
}

/** Reset the log at the start of a flow you want to prove. */
export function beginHapticLog(): void {
  _log.length = 0;
  _t0 = nowMs();
}

export function getHapticLog(): readonly HapticLogEntry[] {
  return _log;
}

export const ritualHaptics = {
  /** Mode A — the morph entering. */
  revealEnter(): void {
    hapt.tap();
    record('reveal-enter', 'light');
  },
  /** Mode A — a move's header locking into place. Under reduce-motion the
   *  beats are logged but not fired (`physical: false`) so an rm user never
   *  gets the whole stack's taps machine-gunned in one tick. */
  headerLock(title?: string, opts?: { physical?: boolean }): void {
    if (opts?.physical !== false) hapt.tap();
    record('header-lock', 'light', title);
  },
  /** Mode A — the routine fully assembled. The reveal's single fuller beat. */
  assemblyDone(): void {
    hapt.medium();
    record('assembly-done', 'medium');
  },

  /** Mode C — entering the guided ritual. */
  ritualEnter(): void {
    hapt.tap();
    record('ritual-enter', 'light');
  },
  /** Mode C — a step beginning. */
  stepStart(label?: string): void {
    hapt.tap();
    record('step-start', 'light', label);
  },
  /**
   * Mode C — a step completing: the soft double-tick, composed across the
   * advance. The FIRST light tick fires on the Done tap (call this then); the
   * SECOND lands ~180ms later, mid checkmark-draw (call `stepCompleteMidDraw`
   * from the draw's 180ms callback). Together: "light-light".
   */
  stepComplete(label?: string): void {
    hapt.tap();
    record('step-complete', 'light-light', label);
  },
  /** The double-tick's second beat — the single light haptic mid-draw. */
  stepCompleteMidDraw(): void {
    hapt.tap();
  },
  /** The gold bloom — fires ON the Done tap, WITH the orb's warm beat.
   *  Medium by spec: the moment of completed care is a felt acknowledgement,
   *  not a tick. (The checkmark's light mid-draw tick still plays after it.) */
  goldBloom(label?: string): void {
    hapt.medium();
    record('gold-bloom', 'medium', label);
  },
  /** Mode C — the done-landing. The closing medium warm beat of the ritual. */
  doneLanding(): void {
    hapt.medium();
    record('done-landing', 'medium');
  },

  /** A deliberate silence window (absorb-wait, morning greeting). No haptic. */
  silence(note: string): void {
    record('silence', 'none', note);
  },
};
