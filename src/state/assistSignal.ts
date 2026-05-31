/**
 * Assist Signal — the display contract that powers the new Pura Assist
 * Home surface ("Tonight's Signal") and the conversation screen's
 * "Reading your scan" context card.
 *
 * It does NOT recompute scan state. It composes the two canonical
 * readers — `useTonightObservation()` (deterministic nightly truth) and
 * `useSkinState()` (canonical post-scan concern view) — into a small,
 * presentation-ready model so both screens stay thin and never read raw
 * AI output (per CLAUDE.md). Pre-scan, every field degrades to an honest
 * "take a scan" prompt rather than inventing precision.
 */

import { useMemo } from 'react';
import {
  useTonightObservation,
  type ConcernZone,
  type TonightFocusType,
} from '@/state/tonightObservation';
import { useSkinState } from '@/hooks/useCanonical';
import type { SkinState } from '@/types/canonical';
import type { ConcernType, Severity } from '@/ai/ai-contracts';

export type SignalTone = 'blue' | 'green' | 'muted';
export type SignalIcon = 'shield' | 'target' | 'drop';

export interface AssistSignalRow {
  key: 'barrier' | 'focus' | 'routine';
  label: string;
  value: string;
  tone: SignalTone;
  icon: SignalIcon;
}

export interface AssistSignal {
  /** True when a scan exists to ground tonight's read. */
  scanReady: boolean;
  /** Three rows for the Home "Tonight's Signal" card. */
  signalRows: AssistSignalRow[];
  /** 2–3 short insight chips for the conversation context card. */
  scanChips: string[];
  /** Single-line context (chips joined) or the no-scan invitation. */
  scanContextLine: string;
  /** Display name of the focus zone — "Chin", "Forehead", "Overall". */
  focusZoneLabel: string;
  /** Capture time label e.g. "9:41 PM", or undefined pre-scan. */
  timestampLabel?: string;
}

// ---------------------------------------------------------------------------
// Pure derivations (exported for unit reuse / testing).
// ---------------------------------------------------------------------------

export function zoneLabel(zone: ConcernZone): string {
  switch (zone) {
    case 'chin':
      return 'Chin';
    case 'forehead':
      return 'Forehead';
    case 'cheeks':
      return 'Cheeks';
    case 'nose':
      return 'Nose';
    case 'full_face':
    default:
      return 'Overall';
  }
}

function focusValue(zone: ConcernZone): string {
  return zone === 'full_face' ? 'Balanced overall' : `${zoneLabel(zone)} activity`;
}

function routineValue(focus: TonightFocusType | undefined): string {
  switch (focus) {
    case 'barrier_support':
      return 'Lead with moisture';
    case 'localized_breakout':
      return 'Keep it gentle';
    case 'hydration':
      return 'Hydrate first';
    case 'calm_irritation':
      return 'Smooth gently';
    case 'maintain':
    default:
      return 'Keep it steady';
  }
}

/** A concern axis is "flagged" only when its severity is meaningful. */
function isFlagged(severity: Severity): boolean {
  return severity === 'mild' || severity === 'moderate' || severity === 'high';
}

/** Positive read shown ONLY when that axis is not currently flagged. */
const POSITIVE_READS: Array<{ concern: ConcernType; label: string }> = [
  { concern: 'dark_marks', label: 'Even tone' },
  { concern: 'hydration', label: 'Good hydration' },
  { concern: 'texture', label: 'Smooth texture' },
  { concern: 'redness', label: 'Low redness' },
];

function buildScanChips(
  zone: ConcernZone,
  skin: SkinState | null,
): string[] {
  const chips: string[] = [focusValue(zone)];

  const flagged = new Set<ConcernType>(
    (skin?.topConcerns ?? [])
      .filter((c) => isFlagged(c.severity))
      .map((c) => c.concern),
  );

  for (const p of POSITIVE_READS) {
    if (chips.length >= 3) break;
    // Never claim a positive about an axis the scan is actively watching.
    if (flagged.has(p.concern)) continue;
    chips.push(p.label);
  }

  // Guarantee at least a two-chip read even on a fully-flagged scan.
  if (chips.length < 2) chips.push('Low irritation elsewhere');

  return chips.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const NO_SCAN_LINE =
  'No scan yet — take one to personalize your conversation.';

export function useAssistSignal(): AssistSignal {
  const obs = useTonightObservation();
  const skin = useSkinState();

  return useMemo<AssistSignal>(() => {
    const scanReady = obs.scanCompleted;
    const focusZone = obs.zone;

    if (!scanReady) {
      const takeScan = 'Take a scan';
      return {
        scanReady: false,
        signalRows: [
          { key: 'barrier', label: 'Barrier', value: takeScan, tone: 'muted', icon: 'shield' },
          { key: 'focus', label: 'Focus', value: takeScan, tone: 'muted', icon: 'target' },
          { key: 'routine', label: 'Routine', value: takeScan, tone: 'muted', icon: 'drop' },
        ],
        scanChips: [],
        scanContextLine: NO_SCAN_LINE,
        focusZoneLabel: zoneLabel(focusZone),
        timestampLabel: undefined,
      };
    }

    const barrierStressed = obs.focusType === 'barrier_support';
    const signalRows: AssistSignalRow[] = [
      {
        key: 'barrier',
        label: 'Barrier',
        value: barrierStressed ? 'Needs comfort' : 'Mostly calm',
        tone: 'blue',
        icon: 'shield',
      },
      {
        key: 'focus',
        label: 'Focus',
        value: focusValue(focusZone),
        tone: 'blue',
        icon: 'target',
      },
      {
        key: 'routine',
        label: 'Routine',
        value: routineValue(obs.focusType),
        tone: 'green',
        icon: 'drop',
      },
    ];

    const scanChips = buildScanChips(focusZone, skin);

    return {
      scanReady: true,
      signalRows,
      scanChips,
      scanContextLine: scanChips.join(' · '),
      focusZoneLabel: zoneLabel(focusZone),
      timestampLabel: obs.scanTimestamp,
    };
  }, [obs, skin]);
}
