import type { Scan, SkinZone } from '@/types';

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
    return {
      id,
      capturedAt: new Date().toISOString(),
      dayNumber: 1,
      photoUri,
      overallScore: 60,
      summaryHeadline: 'Here\u2019s where we\u2019re starting.',
      summaryBody:
        'Your chin and forehead show early activity. Cheeks look calm. We\u2019ll target the chin first.',
      zones: starterZones(),
    };
  }

  const zones: SkinZone[] = previousScan.zones.map((z) => {
    const delta = z.trend === 'improving' ? 4 : z.trend === 'worsening' ? -3 : 1;
    const nextScore = Math.max(0, Math.min(100, z.score + delta));
    return { ...z, score: nextScore };
  });

  return {
    id,
    capturedAt: new Date().toISOString(),
    dayNumber,
    photoUri,
    overallScore: Math.round(
      zones.reduce((acc, z) => acc + z.score, 0) / Math.max(1, zones.length)
    ),
    summaryHeadline: previousScan.summaryHeadline,
    summaryBody: previousScan.summaryBody,
    zones,
  };
}

export async function analyzeProductScan(): Promise<{
  matchPercent: number;
}> {
  await delay(1800);
  return { matchPercent: 78 };
}

function starterZones(): SkinZone[] {
  return [
    {
      key: 'chin',
      label: 'Chin',
      status: 'active',
      trend: 'stable',
      score: 46,
      shortInsight: 'Active breakouts',
      glow: [{ x: 0.5, y: 0.82, radius: 0.26, intensity: 0.5 }],
    },
    {
      key: 'forehead',
      label: 'Forehead',
      status: 'monitor',
      trend: 'stable',
      score: 62,
      shortInsight: 'Some closed comedones',
      glow: [{ x: 0.5, y: 0.18, radius: 0.28, intensity: 0.4 }],
    },
    {
      key: 'tZone',
      label: 'T-zone',
      status: 'monitor',
      trend: 'stable',
      score: 64,
      shortInsight: 'Visible pores',
      glow: [{ x: 0.5, y: 0.52, radius: 0.22, intensity: 0.32 }],
    },
    {
      key: 'cheeks',
      label: 'Cheeks',
      status: 'calm',
      trend: 'stable',
      score: 78,
      shortInsight: 'Slightly reactive',
    },
  ];
}
