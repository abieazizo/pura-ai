/**
 * v25 — review-mode state switch.
 *
 * The post-onboarding redesign needs every reviewable state to be
 * viewable without forcing the backend through specific failure
 * paths. This module exposes a zustand slice that drives all v25
 * screens. A small "Review mode" panel can be opened via a long-press
 * on the v25 Home / Routine / Progress / Products screen header (so
 * the production presentation stays clean — there is no permanent
 * floating dev pill).
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { DailyScanState } from './types';

export type RoutineFixture =
  | 'in-progress-no-product'
  | 'in-progress-assigned-product'
  | 'complete';

export type ProgressFixture =
  | 'baseline-only'
  | 'two-reliable'
  | 'failed-latest'
  | 'four-plus';

export type ProductsFixture = 'empty' | 'partial' | 'populated';

export type ProductDetailFixture = 'safe' | 'conflict';

export type AssistFixture = 'none' | 'routine' | 'product' | 'progress' | 'failed-scan';

export interface V25DevState {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  dailyScan: DailyScanState;
  setDailyScan: (s: DailyScanState) => void;
  routine: RoutineFixture;
  setRoutine: (s: RoutineFixture) => void;
  progress: ProgressFixture;
  setProgress: (s: ProgressFixture) => void;
  products: ProductsFixture;
  setProducts: (s: ProductsFixture) => void;
  productDetail: ProductDetailFixture;
  setProductDetail: (s: ProductDetailFixture) => void;
  assist: AssistFixture;
  setAssist: (s: AssistFixture) => void;
  resetReview: () => void;
}

const DEFAULTS = {
  panelOpen: false,
  dailyScan: 'no-valid-scan-today' as DailyScanState,
  routine: 'in-progress-assigned-product' as RoutineFixture,
  progress: 'two-reliable' as ProgressFixture,
  products: 'populated' as ProductsFixture,
  productDetail: 'safe' as ProductDetailFixture,
  assist: 'none' as AssistFixture,
};

export const useV25Dev = create<V25DevState>((set) => ({
  ...DEFAULTS,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setDailyScan: (dailyScan) => set({ dailyScan }),
  setRoutine: (routine) => set({ routine }),
  setProgress: (progress) => set({ progress }),
  setProducts: (products) => set({ products }),
  setProductDetail: (productDetail) => set({ productDetail }),
  setAssist: (assist) => set({ assist }),
  resetReview: () => set({ ...DEFAULTS }),
}));

export const useV25Fixtures = () =>
  useV25Dev(
    useShallow((s) => ({
      dailyScan: s.dailyScan,
      routine: s.routine,
      progress: s.progress,
      products: s.products,
      productDetail: s.productDetail,
      assist: s.assist,
    }))
  );
