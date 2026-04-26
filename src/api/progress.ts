/**
 * Progress API — v10.26.
 *
 * Bridges the Progress sub-tab to the AI gateway's
 * `buildProgressBundle` method. Returns null when AI is unavailable
 * or when the call fails; the UI falls back to the deterministic
 * `ProgressNarrative` component in that case.
 *
 * Persists results onto the store (`aiProgress`, `aiScoreExplanation`)
 * so a returning user sees the AI narrative without a re-fetch.
 */

import { aiGateway, tryAi } from '@/ai/aiGateway';
import { aiTelemetry } from '@/ai/aiTelemetry';
import { useAppStore } from '@/store/useAppStore';
import { computeSkinScore } from '@/utils/skinScore';
import type { Scan } from '@/types';
import type {
  ProgressExplanation,
  SkinScoreExplanation,
} from '@/ai/ai-contracts';

function summarizeScan(scan: Scan): string {
  if (scan.aiAnalysis) {
    return JSON.stringify({
      score: scan.aiAnalysis.skin_score.value,
      band: scan.aiAnalysis.skin_score.band,
      primary_concern: scan.aiAnalysis.primary_concern,
      secondary_concerns: scan.aiAnalysis.secondary_concerns,
      score_factors: scan.aiAnalysis.score_factors,
    });
  }
  return JSON.stringify({
    score: scan.overallScore,
    headline: scan.summaryHeadline,
    concerns: (scan.concerns ?? []).map((c) => ({
      category: c.category,
      severity: c.severity,
    })),
  });
}

function buildConcernMovementsJson(scans: Scan[]): string {
  const first = scans[0];
  const latest = scans[scans.length - 1];
  if (!first || !latest) return JSON.stringify({});
  if (first.aiAnalysis && latest.aiAnalysis) {
    return JSON.stringify({
      first_factors: first.aiAnalysis.score_factors,
      latest_factors: latest.aiAnalysis.score_factors,
      first_findings: first.aiAnalysis.findings.map((f) => ({
        concern: f.concern,
        severity: f.severity,
      })),
      latest_findings: latest.aiAnalysis.findings.map((f) => ({
        concern: f.concern,
        severity: f.severity,
        direction_vs_previous: f.direction_vs_previous,
      })),
    });
  }
  return JSON.stringify({
    first_concerns: (first.concerns ?? []).map((c) => ({
      category: c.category,
      severity: c.severity,
    })),
    latest_concerns: (latest.concerns ?? []).map((c) => ({
      category: c.category,
      severity: c.severity,
      trend: c.trend,
    })),
  });
}

export async function getProgressBundle(): Promise<{
  progress: ProgressExplanation;
  score: SkinScoreExplanation;
} | null> {
  if (!aiGateway.isAvailable()) {
    aiTelemetry.setFeatureSource(
      'progress',
      'fallback',
      'no AI proxy configured; deterministic narrative used'
    );
    return null;
  }
  const scans = useAppStore.getState().scans;
  if (scans.length < 2) return null;
  const first = scans[0];
  const latest = scans[scans.length - 1];
  const score = computeSkinScore(scans);

  const result = await tryAi(() =>
    aiGateway.buildProgressBundle({
      baselineSummary: summarizeScan(first),
      latestSummary: summarizeScan(latest),
      concernMovementsJson: buildConcernMovementsJson(scans),
      score: score.value,
      deltaValue: score.deltaSinceFirst,
    })
  );

  if (result) {
    try {
      useAppStore
        .getState()
        .setAiProgressBundle(result.progress, result.score);
    } catch {
      /* non-fatal */
    }
    aiTelemetry.setFeatureSource(
      'progress',
      'ai',
      `progress narrative + score explanation generated (band=${result.score.band})`
    );
  } else {
    aiTelemetry.countFallback('explainProgress');
    aiTelemetry.setFeatureSource(
      'progress',
      'fallback',
      'AI progress call failed; deterministic narrative used'
    );
  }
  return result;
}
