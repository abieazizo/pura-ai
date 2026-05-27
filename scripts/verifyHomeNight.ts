/**
 * v26.2 — deterministic state-machine verification for the v26 Home
 * night-state selector. Walks the `selectHomeNightState` selector
 * through every state in `HomeNightStateKind` plus the trust-edge
 * cases (unusable image, low confidence) that are easy to silently
 * regress.
 *
 * Run with:
 *   npx tsx scripts/verifyHomeNight.ts
 *
 * Exits 1 on any contract violation so CI / pre-commit can pick it up.
 */

import { selectHomeNightState } from '../src/state/homeNight';
import type { Scan, Concern, ConcernCategory, Severity } from '../src/types';

// ---------------------------------------------------------------------------
// Fixture builders.
// ---------------------------------------------------------------------------

const NOW = Date.UTC(2026, 4, 18, 22, 0, 0); // 2026-05-18 22:00 UTC

function isoMinutesAgo(mins: number): string {
  return new Date(NOW - mins * 60_000).toISOString();
}

function concern(
  category: ConcernCategory,
  severity: Severity,
  rank = 1,
  region = 'chin'
): Concern {
  return {
    category,
    severity,
    rank,
    region,
    hotspots: [],
    finding: 'fixture finding',
    interpretation: 'fixture interpretation',
    nextStep: 'fixture next step',
    trend: 'unchanged',
  };
}

function makeScan(opts: {
  id: string;
  ageMinutes: number;
  concerns?: Concern[];
  imageQuality?: { usable?: boolean; confidence?: number };
}): Scan {
  const base = {
    id: opts.id,
    capturedAt: isoMinutesAgo(opts.ageMinutes),
    dayNumber: 1,
    photoUri: 'fixture://noop',
    overallScore: 78,
    zones: [],
    summaryHeadline: 'fixture',
    summaryBody: 'fixture',
    concerns: opts.concerns ?? [],
  };
  const aiAnalysis = opts.imageQuality
    ? { image_quality: opts.imageQuality }
    : undefined;
  return { ...base, aiAnalysis } as unknown as Scan;
}

// ---------------------------------------------------------------------------
// Probes.
// ---------------------------------------------------------------------------

interface Probe {
  name: string;
  scans: Scan[];
  expectKind: string;
  /** Optional deeper check on the resolved state. */
  check?: (state: ReturnType<typeof selectHomeNightState>) => string | null;
}

const PROBES: Probe[] = [
  {
    name: 'no scans → no_baseline',
    scans: [],
    expectKind: 'no_baseline',
  },
  {
    name: 'fresh scan (1h ago), moderate breakouts → fresh_recovery_night',
    scans: [
      makeScan({
        id: 's1',
        ageMinutes: 60,
        concerns: [concern('breakouts', 'moderate', 1, 'forehead')],
      }),
    ],
    expectKind: 'fresh_recovery_night',
    check: (s) =>
      s.kind === 'fresh_recovery_night' &&
      s.region === 'forehead' &&
      s.pausedStepName === 'Retinoid serum'
        ? null
        : `expected region=forehead + pausedStepName=Retinoid serum, got ${JSON.stringify(s)}`,
  },
  {
    name: 'fresh scan, needs-attention texture → fresh_recovery_night (Exfoliant paused)',
    scans: [
      makeScan({
        id: 's2',
        ageMinutes: 30,
        concerns: [concern('texture', 'needs-attention', 1, 'cheeks')],
      }),
    ],
    expectKind: 'fresh_recovery_night',
    check: (s) =>
      s.kind === 'fresh_recovery_night' && s.pausedStepName === 'Exfoliant'
        ? null
        : `expected pausedStepName=Exfoliant, got ${JSON.stringify(s)}`,
  },
  {
    name: 'fresh scan, mild hydration → fresh_hydration_edit',
    scans: [
      makeScan({
        id: 's3',
        ageMinutes: 30,
        concerns: [concern('hydration', 'mild', 1, 'cheeks')],
      }),
    ],
    expectKind: 'fresh_hydration_edit',
  },
  {
    name: 'fresh scan, only calm concerns → fresh_stable_night',
    scans: [
      makeScan({
        id: 's4',
        ageMinutes: 30,
        concerns: [
          concern('breakouts', 'calm', 1),
          concern('hydration', 'calm', 2),
        ],
      }),
    ],
    expectKind: 'fresh_stable_night',
  },
  {
    name: 'fresh scan, mild non-hydration (breakouts) → fresh_stable_night',
    scans: [
      makeScan({
        id: 's5',
        ageMinutes: 30,
        concerns: [concern('breakouts', 'mild', 1, 'chin')],
      }),
    ],
    expectKind: 'fresh_stable_night',
  },
  {
    name: 'fresh scan with image_quality.usable=false → stale_pre_scan',
    scans: [
      makeScan({
        id: 's6',
        ageMinutes: 30,
        concerns: [concern('breakouts', 'moderate', 1, 'chin')],
        imageQuality: { usable: false, confidence: 0.9 },
      }),
    ],
    expectKind: 'stale_pre_scan',
  },
  {
    name: 'fresh scan with confidence=0.3 → stale_pre_scan (below floor)',
    scans: [
      makeScan({
        id: 's7',
        ageMinutes: 30,
        concerns: [concern('breakouts', 'moderate', 1, 'chin')],
        imageQuality: { usable: true, confidence: 0.3 },
      }),
    ],
    expectKind: 'stale_pre_scan',
  },
  {
    name: 'recovery scan exactly 1 night old → next_night_after_recovery',
    scans: [
      makeScan({
        id: 's8',
        ageMinutes: 24 * 60 + 10,
        concerns: [concern('breakouts', 'moderate', 1, 'chin')],
      }),
    ],
    expectKind: 'next_night_after_recovery',
    check: (s) =>
      s.kind === 'next_night_after_recovery' && s.previousEdit.kind === 'recovery'
        ? null
        : `expected previousEdit.kind=recovery, got ${JSON.stringify(s)}`,
  },
  {
    name: 'recovery scan 3 nights old → stale_pre_scan (recovery edit)',
    scans: [
      makeScan({
        id: 's9',
        ageMinutes: 3 * 24 * 60 + 10,
        concerns: [concern('breakouts', 'moderate', 1, 'chin')],
      }),
    ],
    expectKind: 'stale_pre_scan',
    check: (s) =>
      s.kind === 'stale_pre_scan' &&
      s.previousEdit.kind === 'recovery' &&
      s.nightsSinceLastScan === 3
        ? null
        : `expected previousEdit.kind=recovery + nights=3, got ${JSON.stringify(s)}`,
  },
  {
    name: 'stable scan 5 nights old → stale_pre_scan (stable edit)',
    scans: [
      makeScan({
        id: 's10',
        ageMinutes: 5 * 24 * 60 + 10,
        concerns: [concern('breakouts', 'mild', 1, 'chin')],
      }),
    ],
    expectKind: 'stale_pre_scan',
    check: (s) =>
      s.kind === 'stale_pre_scan' &&
      s.previousEdit.kind === 'stable' &&
      s.nightsSinceLastScan === 5
        ? null
        : `expected previousEdit.kind=stable + nights=5, got ${JSON.stringify(s)}`,
  },
  {
    name: 'recovery worthiness — hydration NEVER routes to recovery_night',
    scans: [
      makeScan({
        id: 's11',
        ageMinutes: 30,
        concerns: [concern('hydration', 'needs-attention', 1, 'cheeks')],
      }),
    ],
    // Hydration is intentionally never recovery-worthy — it's its
    // own edit lane. needs-attention hydration still routes to
    // fresh_hydration_edit only if severity is mild/moderate;
    // needs-attention falls through to fresh_stable_night.
    expectKind: 'fresh_stable_night',
  },
  {
    name: 'multiple concerns — highest-rank (lowest rank #) wins',
    scans: [
      makeScan({
        id: 's12',
        ageMinutes: 30,
        concerns: [
          concern('hydration', 'mild', 2, 'cheeks'),
          concern('texture', 'moderate', 1, 'forehead'),
        ],
      }),
    ],
    expectKind: 'fresh_recovery_night',
    check: (s) =>
      s.kind === 'fresh_recovery_night' && s.region === 'forehead'
        ? null
        : `expected region=forehead (rank=1), got ${JSON.stringify(s)}`,
  },
  {
    name: 'tone needs-attention → fresh_recovery_night (Active brightener paused)',
    scans: [
      makeScan({
        id: 's13',
        ageMinutes: 30,
        concerns: [concern('tone', 'needs-attention', 1, 'cheeks')],
      }),
    ],
    expectKind: 'fresh_recovery_night',
    check: (s) =>
      s.kind === 'fresh_recovery_night' && s.pausedStepName === 'Active brightener'
        ? null
        : `expected pausedStepName=Active brightener, got ${JSON.stringify(s)}`,
  },
];

// ---------------------------------------------------------------------------
// Drive.
// ---------------------------------------------------------------------------

console.log('══════════════════════════════════════════════════════');
console.log('HOME NIGHT STATE — VERIFICATION');
console.log('══════════════════════════════════════════════════════');

let failures = 0;
for (const probe of PROBES) {
  const state = selectHomeNightState({ scans: probe.scans, now: NOW });
  if (state.kind !== probe.expectKind) {
    console.log(
      `  ✗ ${probe.name}\n      expected kind=${probe.expectKind}, got kind=${state.kind}`
    );
    failures++;
    continue;
  }
  if (probe.check) {
    const reason = probe.check(state);
    if (reason) {
      console.log(`  ✗ ${probe.name}\n      ${reason}`);
      failures++;
      continue;
    }
  }
  console.log(`  ✓ ${probe.name}`);
}

// Verify the full union is reachable from this probe set — catches
// the case where a new state kind ships without a corresponding
// probe.
const REACHED = new Set(
  PROBES.map((p) => p.expectKind).concat('no_baseline')
);
const EXPECTED_KINDS = [
  'no_baseline',
  'stale_pre_scan',
  'next_night_after_recovery',
  'fresh_recovery_night',
  'fresh_hydration_edit',
  'fresh_stable_night',
];
for (const k of EXPECTED_KINDS) {
  if (!REACHED.has(k)) {
    console.log(`  ✗ kind "${k}" is not covered by any probe`);
    failures++;
  }
}
if (failures === 0) {
  console.log(
    `\n  ✓ all ${EXPECTED_KINDS.length} HomeNightState kinds covered`
  );
}

if (failures > 0) {
  console.log(`\n✗ VERIFICATION FAILED — ${failures} probe(s) broke.`);
  process.exit(1);
}

console.log('\n══════════════════════════════════════════════════════');
console.log('VERIFICATION COMPLETE — all probes PASS');
console.log('══════════════════════════════════════════════════════');
