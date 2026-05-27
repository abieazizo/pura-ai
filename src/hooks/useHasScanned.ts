import { useAppStore } from '@/store/useAppStore';

export function useHasScanned(): boolean {
  return useAppStore((s) => s.scans.length > 0);
}
