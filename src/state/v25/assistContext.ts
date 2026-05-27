/**
 * v25 — assistant context store.
 *
 * Captures the contextual entry payload from Routine / Products /
 * Progress / failed-Scan into AI Assist so the assistant opens with
 * meaningful context, not a blank chat.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { AIAssistContext } from './types';

interface AssistContextState {
  context: AIAssistContext;
  setContext: (ctx: AIAssistContext) => void;
  clear: () => void;
}

const EMPTY: AIAssistContext = { kind: 'none' };

export const useAssistContext = create<AssistContextState>((set) => ({
  context: EMPTY,
  setContext: (context) => set({ context }),
  clear: () => set({ context: EMPTY }),
}));

export const useAssistContextShape = () =>
  useAssistContext(useShallow((s) => s.context));
