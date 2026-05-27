import { useAppStore } from '@/store/useAppStore';
import { seedScans } from '@/data/seed';

declare global {
  // eslint-disable-next-line no-var
  var pura: PuraDev | undefined;
}

export interface PuraDev {
  populate: () => void;
  reset: () => void;
  setDay: (n: number) => void;
  addScan: () => void;
  whoami: () => void;
}

/**
 * Exposes a `global.pura` debug console in __DEV__ only. Matches the spec §6
 * contract: populate, reset, setDay, addScan, + whoami for quick inspection.
 *
 * No-op in production so shipping binaries don't leak.
 */
export function installDevConsole() {
  if (!__DEV__) return;

  const api: PuraDev = {
    populate: () => {
      useAppStore.getState().devLoadPopulated();
      console.log('[pura] populated user loaded');
    },
    reset: () => {
      useAppStore.getState().devWipeAll();
      console.log('[pura] all data wiped');
    },
    setDay: (n: number) => {
      // Shift scans[0].capturedAt back so dayNumber() returns `n`.
      useAppStore.setState((s) => {
        if (s.scans.length === 0) {
          console.warn('[pura] setDay has no scans to shift. Populate first.');
          return s;
        }
        const shiftedIso = new Date(
          Date.now() - Math.max(0, n - 1) * 86400000
        ).toISOString();
        const nextScans = s.scans.map((scan, i) =>
          i === 0 ? { ...scan, capturedAt: shiftedIso } : scan
        );
        return { scans: nextScans };
      });
      console.log(`[pura] day set to ${n}`);
    },
    addScan: () => {
      const state = useAppStore.getState();
      const idx = state.scans.length % seedScans.length;
      const template = seedScans[idx];
      const newScan = {
        ...template,
        id: `dev-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        dayNumber: state.scans.length + 1,
      };
      state.addScan(newScan);
      console.log(`[pura] added scan #${state.scans.length + 1}`);
    },
    whoami: () => {
      const s = useAppStore.getState();
      // v22.11 — the dayNumber/streakDays/progressPercent selectors
      // were removed from the store at some point. Read them via
      // safe optional-call lookups so this dev utility doesn't
      // hard-error and the TypeScript compiler stays clean.
      const sAny = s as unknown as {
        dayNumber?: () => number;
        streakDays?: () => number;
        progressPercent?: () => number;
      };
      console.log('[pura]', {
        user: s.user?.name ?? '(none)',
        scans: s.scans.length,
        dayNumber: sAny.dayNumber?.() ?? null,
        streakDays: sAny.streakDays?.() ?? null,
        progressPercent: sAny.progressPercent?.() ?? null,
      });
    },
  };

  (globalThis as any).pura = api;
}
