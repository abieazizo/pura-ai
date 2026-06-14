/**
 * useSkinShop — the ONE reactive hook the Shop tab binds to.
 *
 * Reads canonical state (the last scan via `selectSkinState`, the kept routine,
 * and any confirmed-got dates) and hands the pure engine everything it needs.
 * The screen renders only this model — never the store, the catalog, or the
 * scorer directly (CLAUDE.md canonical-state law).
 *
 * Sourcing (answering "where does each input come from?"):
 *   • findings        — `selectSkinState(latest, prev, scans).topConcerns`
 *   • kept routine    — `userRoutineMorning` + `userRoutineEvening` (the ids the
 *                       user placed in their routine; this IS "what they kept")
 *   • confirmed-got   — `productGotConfirmedAt` (id → ISO), written ONLY by an
 *                       explicit "did you get this?" confirmation. Empty until
 *                       that affordance ships, so restock stays honestly off.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import { selectSkinState } from '@/state/canonical';
import { buildSkinShop } from './engine';
import type { SkinShopModel } from './types';

export function useSkinShop(): SkinShopModel {
  const s = useAppStore(
    useShallow((st) => ({
      scans: st.scans,
      morning: st.userRoutineMorning,
      evening: st.userRoutineEvening,
      // Defensive read: the field is additive; tolerate older persisted state.
      confirmedGotAt:
        (st as { productGotConfirmedAt?: Record<string, string> })
          .productGotConfirmedAt ?? {},
    })),
  );

  return useMemo<SkinShopModel>(() => {
    const scans = Array.isArray(s.scans) ? s.scans : [];
    const skinState =
      scans.length > 0
        ? selectSkinState(
            scans[scans.length - 1],
            scans[scans.length - 2],
            scans,
          )
        : null;

    return buildSkinShop({
      skinState,
      routineMorning: Array.isArray(s.morning) ? s.morning : [],
      routineEvening: Array.isArray(s.evening) ? s.evening : [],
      confirmedGotAt: s.confirmedGotAt ?? {},
      now: Date.now(),
    });
  }, [s]);
}
