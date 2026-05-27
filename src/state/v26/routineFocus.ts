/**
 * v26 — Focused-routine mode flag.
 *
 * Set to true while the user is mid-ritual on the Today tab. The
 * FloatingTabBar reads this and quietly collapses its bar so the
 * routine becomes a full-focus surface. Cleared when the user finishes,
 * exits, or returns to landing.
 */

import { create } from 'zustand';

interface RoutineFocusState {
  focused: boolean;
  setFocused: (next: boolean) => void;
}

export const useRoutineFocus = create<RoutineFocusState>((set) => ({
  focused: false,
  setFocused: (focused) => set({ focused }),
}));
