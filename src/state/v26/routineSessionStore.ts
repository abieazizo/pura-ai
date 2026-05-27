/**
 * v26 — Dedicated routine session store.
 *
 * Self-contained zustand slice with AsyncStorage persistence so the
 * Routine experience owns its own completion state without depending
 * on the shared `useAppStore`. A user who finishes the ritual and
 * re-launches lands directly in the completion view until the day
 * rolls over.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RoutineSessionStatus = 'notStarted' | 'active' | 'complete';

export interface PersistedRoutineSession {
  date: string;
  status: RoutineSessionStatus;
  currentStepIndex: number;
  completedStepIds: string[];
  skippedStepIds: string[];
  completedAt: string | null;
}

interface RoutineSessionStore {
  session: PersistedRoutineSession | null;
  setSession: (next: PersistedRoutineSession | null) => void;
  clearIfStale: (today: string) => void;
}

export const useRoutineSessionStore = create<RoutineSessionStore>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearIfStale: (today) => {
        const current = get().session;
        if (current && current.date !== today) {
          set({ session: null });
        }
      },
    }),
    {
      name: 'pura-routine-session-v26',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
