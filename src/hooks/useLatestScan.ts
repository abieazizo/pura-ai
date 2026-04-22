import { useAppStore } from '@/store/useAppStore';
import { useHasScanned, useLatestScan, useFirstScan, useDayNumber, useStreakDays, useProgressPercent } from '@/store/selectors';
import { useShallow } from 'zustand/react/shallow';
import type { Scan } from '@/types';

export function useLatestScan(): Scan | undefined {
  return useAppStore((s) => s.scans[s.scans.length - 1]);
}

export function useFirstScan(): Scan | undefined {
  return useAppStore((s) => s.scans[0]);
}
