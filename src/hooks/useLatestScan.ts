import { useAppStore } from '@/store/useAppStore';
import type { Scan } from '@/types';

export function useLatestScan(): Scan | undefined {
  return useAppStore((s) => s.scans[s.scans.length - 1]);
}

export function useFirstScan(): Scan | undefined {
  return useAppStore((s) => s.scans[0]);
}
