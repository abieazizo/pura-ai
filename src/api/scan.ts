import type { Scan, SkinZone } from '@/types';
import { buildSummaryHeadline, deriveConcerns } from '@/utils/concerns';

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function analyzeFaceScan(args: {
  photoUri: string;
  previousScan?: Scan;
  dayNumber: number;
}): Promise<Scan> {
  await delay(1800);
  const { photoUri, previousScan, dayNumber } = args;
  const id = `scan-${Date.now()}`;

  if (!previousScan) {
    const baseScan: Scan = {
      id,
      capturedAt: new Date().toISOString(),
      dayNumber: 1,
      photoUri,
      overallScore: 60,
      summaryHeadline: '',
      summaryBody: '',
      zones: starterZones(),
    };
    const concerns = deriveConcerns(baseScan);
    return {
      ...baseScan,
      concerns,
      summaryHeadline: buildSummaryHeadline(concerns),
      summaryBody: concerns
        .slice(0, 2)
        .map((c) => c.finding)
        .join(' '),
    };
  }

  const zones: SkinZone[] = previousScan.zones.map((z) => {
    const delta = z.trend === 'improving' ? 4 : z.trend === 'worsening' ? -3 : 1;
    const nextScore = Math.max(0, Math.min(100, z.score + delta));
    return { ...z, score: nextScore };
  });

  const baseScan: Scan = {
    id,
    capturedAt: new Date().toISOString(),
    dayNumber,
    photoUri,
    overallScore: Math.round(
      zones.reduce((acc, z) => acc + z.score, 0) / Math.max(1, zones.length)
    ),
    summaryHeadline: '',
    summaryBody: '',
    zones,
  };
  const concerns = deriveConcerns(baseScan, previousScan);
  return {
    ...baseScan,
    concerns,
    summaryHeadline: buildSummaryHeadline(concerns),
    summaryBody: concerns
      .slice(0, 2)
      .map((c) => c.finding)
      .join(' '),
  };
}

export async function analyzeProductScan(): Promise<{
  matchPercent: number;
}> {
  await delay(1800);
  return { matchPercent: 78 };
}

// Zone labels retained for internal mapping; the user never sees "T-zone"
// directly — concern copy translates to plain English ("nose and center
// forehead").
function starterZones(): SkinZone[] {
  return [
    {
      key: 'chin',
      label: 'Chin',
      status: 'active',
      trend: 'stable',
      score: 46,
      shortInsight: 'Active breakout',
      glow: [{ x: 0.5, y: 0.82, radius: 0.26, intensity: 0.5 }],
    },
    {
      key: 'forehead',
      label: 'Forehead',
      status: 'monitor',
      trend: 'stable',
      score: 62,
      shortInsight: 'Small clogged bumps',
      glow: [{ x: 0.5, y: 0.18, radius: 0.28, intensity: 0.4 }],
    },
    {
      key: 'tZone',
      label: 'Nose and center forehead',
      status: 'monitor',
      trend: 'stable',
      score: 64,
      shortInsight: 'Pores reading more visible',
      glow: [{ x: 0.5, y: 0.52, radius: 0.22, intensity: 0.32 }],
    },
    {
      key: 'cheeks',
      label: 'Cheeks',
      status: 'calm',
      trend: 'stable',
      score: 72,
      shortInsight: 'Slightly low on moisture',
    },
  ];
}
