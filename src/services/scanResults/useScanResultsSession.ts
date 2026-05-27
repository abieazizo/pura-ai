/**
 * Scan-results session state.
 *
 * A small in-memory state container for the active scan-results
 * slideshow. The persisted `useAppStore` already owns the long-lived
 * scan record; this store owns only the transient UI session — current
 * slide index, geometry resolution status, the user-selected concern.
 *
 * Intentionally NOT persisted: a results slideshow is a single in-app
 * journey; once the user closes it we don't want to resurrect their
 * scroll position next launch.
 */

import { create } from 'zustand';
import type {
  FaceLandmarkResult,
  ScanAnalysisResponse,
  VisibleFinding,
} from '@/types/scanResults';

export type AnalysisStatus =
  | 'idle'
  | 'quality_checking'
  | 'analyzing'
  | 'mapping'
  | 'ready'
  | 'failed';

interface ScanResultsSession {
  scanId: string | null;
  originalImageUri: string | null;
  originalImageDimensions: { width: number; height: number } | null;
  capturedAt: string | null;
  analysisStatus: AnalysisStatus;
  analysis: ScanAnalysisResponse | null;
  geometry: FaceLandmarkResult | null;
  currentSlide: number;
  selectedFindingId: string | null;
}

interface ScanResultsSessionActions {
  startSession(args: {
    scanId: string;
    originalImageUri: string;
    capturedAt: string;
  }): void;
  setImageDimensions(dims: { width: number; height: number }): void;
  setAnalysisStatus(status: AnalysisStatus): void;
  setAnalysis(analysis: ScanAnalysisResponse): void;
  setGeometry(geometry: FaceLandmarkResult | null): void;
  setCurrentSlide(index: number): void;
  setSelectedFindingId(id: string | null): void;
  resetSession(): void;
}

const initial: ScanResultsSession = {
  scanId: null,
  originalImageUri: null,
  originalImageDimensions: null,
  capturedAt: null,
  analysisStatus: 'idle',
  analysis: null,
  geometry: null,
  currentSlide: 0,
  selectedFindingId: null,
};

export const useScanResultsSession = create<
  ScanResultsSession & ScanResultsSessionActions
>((set) => ({
  ...initial,
  startSession: ({ scanId, originalImageUri, capturedAt }) =>
    set({
      ...initial,
      scanId,
      originalImageUri,
      capturedAt,
      analysisStatus: 'quality_checking',
      currentSlide: 0,
    }),
  setImageDimensions: (dims) => set({ originalImageDimensions: dims }),
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setAnalysis: (analysis) =>
    set((state) => ({
      analysis,
      selectedFindingId:
        state.selectedFindingId ?? pickInitialFinding(analysis)?.id ?? null,
    })),
  setGeometry: (geometry) => set({ geometry }),
  setCurrentSlide: (index) => set({ currentSlide: index }),
  setSelectedFindingId: (id) => set({ selectedFindingId: id }),
  resetSession: () => set(initial),
}));

function pickInitialFinding(
  analysis: ScanAnalysisResponse
): VisibleFinding | null {
  const visible = analysis.findings.filter(
    (f) => f.present && f.supportedByScan
  );
  if (visible.length === 0) return null;
  return visible[0];
}
