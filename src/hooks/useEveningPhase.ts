/**
 * useEveningPhase — derives the current phase of the user's evening.
 *
 * The home screen's meta header reads "TONIGHT · MAY 23" by default,
 * but a great product knows when to shift its voice. Past midnight is
 * not really "tonight" anymore; before evening it isn't yet. Returning
 * a discriminated phase lets callers shape copy honestly.
 *
 * Phases:
 *   - 'early'     : 12:00 – 17:00 (afternoon — the user is rare here)
 *   - 'evening'   : 17:00 – 22:00 (the standard tonight check-in)
 *   - 'late'      : 22:00 – 02:00 (late tonight)
 *   - 'overnight' : 02:00 – 12:00 (early morning the next day)
 *
 * The hook refreshes whenever the host re-renders; for a long-lived
 * screen, the phase will simply update on its next render. For
 * minute-level accuracy (which the home does not need), wrap with a
 * setInterval at the caller.
 */

export type EveningPhase = 'early' | 'evening' | 'late' | 'overnight';

export interface EveningPhaseMeta {
  phase: EveningPhase;
  /** Editorial phrase to lead the meta header eyebrow. */
  eyebrow: 'EARLY' | 'TONIGHT' | 'LATE TONIGHT' | 'OVERNIGHT';
  /** The Date the meta header should label — overnight references the
   *  previous calendar day's evening, not the current calendar day. */
  referenceDate: Date;
}

export function evaluateEveningPhase(now: Date): EveningPhaseMeta {
  const hour = now.getHours();
  if (hour >= 2 && hour < 12) {
    // Overnight refers to the *previous* evening.
    const prev = new Date(now);
    prev.setDate(now.getDate() - 1);
    return { phase: 'overnight', eyebrow: 'OVERNIGHT', referenceDate: prev };
  }
  if (hour >= 12 && hour < 17) {
    return { phase: 'early', eyebrow: 'EARLY', referenceDate: now };
  }
  if (hour >= 17 && hour < 22) {
    return { phase: 'evening', eyebrow: 'TONIGHT', referenceDate: now };
  }
  // 22:00 – 02:00
  return { phase: 'late', eyebrow: 'LATE TONIGHT', referenceDate: now };
}

export function useEveningPhase(): EveningPhaseMeta {
  return evaluateEveningPhase(new Date());
}
