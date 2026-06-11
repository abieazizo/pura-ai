/**
 * routineFocusMoves — the canonical bridge for screen-2 → routine continuity.
 *
 * The YourSkin screen (screen 2) renders the scan's 2–3 routine_focus "moves"
 * from a SkinRead held in COMPONENT state — it dies when the scan modal pops.
 * The Your Routine reveal needs those exact cards (same titles, same whys) so
 * the morph is a true continuation of what the user just saw, not a re-derived
 * approximation. This tiny persisted slice carries them across the teardown,
 * keyed by scanId.
 *
 * INTEGRATION POINT (one line, in the scan flow): where the YourSkin read
 * lands (its outcome turns 'ready'), call
 *
 *   useRoutineFocusMoves.getState().setMoves(scanId, read.routineFocus ?? []);
 *
 * Until that write ships, `movesForScan` returns null and the routine model
 * falls back to its derived buckets — the experience is never empty.
 *
 * Also home to the experience's own small memory: the last shown greeting (so
 * rotation provably never repeats back-to-back) and the last-opened day (so
 * the welcome-back line is about PRESENCE, not completion — the orb never
 * claims "been a few days" to someone who opened the app yesterday).
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredFocusMove {
  title: string;
  why: string;
  /** Scan finding ids this move addresses. */
  addresses: string[];
}

interface RoutineFocusMovesState {
  /** Bounded: only the most recent few scans are kept. */
  byScanId: Record<string, StoredFocusMove[]>;
  scanOrder: string[];
  /** Local date key (YYYY-MM-DD) of the previous routine-home open. */
  lastOpenDate: string | null;
  /** The greeting shown on the previous open — rotation's no-repeat guard. */
  lastGreeting: string | null;

  setMoves: (scanId: string, moves: StoredFocusMove[]) => void;
  /** Stamp today's open; returns the PREVIOUS open date (for gap math). */
  markOpened: (dateKey: string) => string | null;
  setLastGreeting: (greeting: string) => void;
}

export const useRoutineFocusMoves = create<RoutineFocusMovesState>()(
  persist(
    (set, get) => ({
      byScanId: {},
      scanOrder: [],
      lastOpenDate: null,
      lastGreeting: null,

      setMoves: (scanId, moves) =>
        set((state) => {
          const order = [scanId, ...state.scanOrder.filter((id) => id !== scanId)].slice(0, 5);
          const byScanId: Record<string, StoredFocusMove[]> = {};
          for (const id of order) {
            byScanId[id] = id === scanId ? moves : state.byScanId[id];
          }
          return { byScanId, scanOrder: order };
        }),

      markOpened: (dateKey) => {
        const prev = get().lastOpenDate;
        if (prev !== dateKey) set({ lastOpenDate: dateKey });
        return prev;
      },

      setLastGreeting: (greeting) => {
        if (get().lastGreeting !== greeting) set({ lastGreeting: greeting });
      },
    }),
    {
      name: 'pura-routine-focus-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Async hydration can land AFTER the routine screen already stamped
      // today's open — merge keeps the NEWER open date so that write is never
      // clobbered back to yesterday (which would fake a welcome-back gap).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RoutineFocusMovesState>;
        const newerOpen =
          p.lastOpenDate && current.lastOpenDate
            ? p.lastOpenDate > current.lastOpenDate
              ? p.lastOpenDate
              : current.lastOpenDate
            : p.lastOpenDate ?? current.lastOpenDate;
        return {
          ...current,
          ...p,
          lastOpenDate: newerOpen ?? null,
          lastGreeting: p.lastGreeting ?? current.lastGreeting,
        };
      },
    },
  ),
);

/** The moves screen 2 showed for this scan, or null when none were captured. */
export function movesForScan(
  byScanId: Record<string, StoredFocusMove[]>,
  scanId: string | null | undefined,
): StoredFocusMove[] | null {
  if (!scanId) return null;
  const moves = byScanId[scanId];
  return moves && moves.length > 0 ? moves : null;
}
