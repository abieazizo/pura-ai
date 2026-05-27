/**
 * ProgressHeroSection — passes canonical `insight.heroReason` into
 * `SkinScoreHero` so the hero card itself renders the single
 * source-of-truth why-line. No duplicate or competing explanation —
 * the hero is canonical, not "corrected" by an external caption.
 */

import React from 'react';
import { SkinScoreHero } from '@/screens/progress/SkinScoreHero';
import { computeSkinScore } from '@/utils/skinScore';
import type { Scan } from '@/types';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';

interface Props {
  scans: Scan[];
  insight: ProgressRoutineInsight;
}

export function ProgressHeroSection({ scans, insight }: Props) {
  // Synthesised SkinScore keeps SkinScoreHero's API stable.
  const score = computeSkinScore(scans);
  return (
    <SkinScoreHero
      score={score}
      scans={scans}
      heroReason={insight.heroReason}
    />
  );
}
