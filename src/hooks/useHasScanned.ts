import { useAppStore } from '@/store/useAppStore';
import { useHasScanned, useLatestScan, useFirstScan, useDayNumber, useStreakDays, useProgressPercent } from '@/store/selectors';
import { useShallow } from 'zustand/react/shallow';

export function useHasScanned(): boolean {
  return useAppStore((s) => s.scans.length > 0);
}
