/**
 * Pura Routine — progress comparison.
 *
 * Honest data only: returns a comparison object that the Progress
 * screen can render. Until at least two reliable scans exist, the
 * service explicitly reports `canCompare: false` and the screen
 * renders a baseline state.
 */

import type { ProgressComparison } from '@/types/routine';
import type { Scan } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useRoutineStore, todayDateKey } from '@/state/routine/routineStore';

const RELIABLE_QUALITY_MIN = 0.7;

interface ReliableScanRecord {
  id: string;
  capturedAt: string;
  score: number;
  qualityConfidence: number;
}

function reliableScansFromStore(): ReliableScanRecord[] {
  const scans = useAppStore.getState().scans;
  const out: ReliableScanRecord[] = [];
  for (const s of scans as Array<Scan & {
    capturedAt?: string;
    createdAt?: string;
    aiAnalysis?: { image_quality?: { confidence?: number } };
    overallScore?: number;
  }>) {
    const stamp = s.capturedAt ?? s.createdAt;
    if (!stamp) continue;
    const score = (s as { overallScore?: number }).overallScore;
    const confidence = s.aiAnalysis?.image_quality?.confidence;
    if (typeof score !== 'number') continue;
    if (typeof confidence === 'number' && confidence < RELIABLE_QUALITY_MIN) {
      continue;
    }
    out.push({
      id: s.id,
      capturedAt: stamp,
      score,
      qualityConfidence: confidence ?? RELIABLE_QUALITY_MIN,
    });
  }
  out.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  return out;
}

function weekSessionCount(): number {
  const recents = useRoutineStore.getState().recentSessions;
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  return recents.filter(
    (s) => s.status === 'complete' && new Date(s.startedAt) >= start,
  ).length;
}

function weekDayLabel(iso: string): string {
  const d = new Date(iso);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

export function getProgressComparison(): ProgressComparison {
  const consistency = {
    completedThisWeek: weekSessionCount(),
    targetThisWeek: 7,
  };

  const reliable = reliableScansFromStore();
  if (reliable.length === 0) {
    return {
      canCompare: false,
      reason: 'no_scan',
      focusAreaRows: [],
      consistency,
      reliableScanCount: 0,
    };
  }
  if (reliable.length === 1) {
    return {
      canCompare: false,
      reason: 'one_scan_only',
      focusAreaRows: [],
      consistency,
      reliableScanCount: 1,
    };
  }

  const last = reliable[reliable.length - 1];
  const prev = reliable[reliable.length - 2];
  const delta = last.score - prev.score;
  // Express as % improvement vs prev score.
  const safePrev = prev.score === 0 ? 1 : prev.score;
  const improvementPercent = Math.round((delta / safePrev) * 100);

  // Trend points — use up to seven most recent reliable scans.
  const recent = reliable.slice(-7);
  const trendPoints = recent.map((s) => ({
    label: weekDayLabel(s.capturedAt),
    score: s.score,
  }));

  // Qualitative focus-area rows (deliberately conservative — only
  // labels we can derive from the latest scan's findings).
  const focusAreaRows = buildFocusAreaRowsFromLatest();

  return {
    canCompare: true,
    overallImprovementPercent: improvementPercent,
    comparedAgainstLabel: 'your previous scan',
    trendPoints,
    focusAreaRows,
    consistency,
    reliableScanCount: reliable.length,
  };
}

function buildFocusAreaRowsFromLatest(): ProgressComparison['focusAreaRows'] {
  const latest = useAppStore.getState().latestResult;
  const fallback: ProgressComparison['focusAreaRows'] = [
    { label: 'Texture', status: 'measuring' },
    { label: 'Hydration', status: 'measuring' },
    { label: 'Tone', status: 'measuring' },
  ];
  if (!latest) return fallback;
  if (!latest.findings || latest.findings.length === 0) return fallback;
  return latest.findings.slice(0, 4).map((f) => {
    const labelMap: Record<string, string> = {
      dryness: 'Hydration',
      texture: 'Texture',
      barrier: 'Barrier',
      hydration: 'Hydration',
      redness: 'Tone',
      clarity: 'Clarity',
    };
    return {
      label: labelMap[f.type] ?? f.label ?? 'Focus area',
      status: 'measuring' as const,
    };
  });
}

// Re-export today key for any caller that wants a stable date.
export { todayDateKey };
