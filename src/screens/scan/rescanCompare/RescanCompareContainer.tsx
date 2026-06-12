/**
 * RescanCompareContainer — the store seam for the before/after (habit step 4).
 * Reads the persisted scans ONCE per render, projects them through the pure
 * model, and renders the presentational screen. Navigation: keep-going lands
 * on the Routine tab (the habit), restock lands on Shop (earned, quiet).
 */

import React, { useCallback, useMemo } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import type { HomeStackParamList, TabParamList } from '@/navigation/types';
import { buildRescanCompare, rescanInputFromScans } from './model';
import { RescanCompareScreen } from './RescanCompareScreen';

export function RescanCompareContainer() {
  const nav = useNavigation<NavigationProp<HomeStackParamList>>();
  const scans = useAppStore((s) => s.scans);

  const model = useMemo(
    () => buildRescanCompare(rescanInputFromScans(Array.isArray(scans) ? scans : [])),
    [scans],
  );

  const onKeepGoing = useCallback(() => {
    hapt.tap();
    nav.getParent<NavigationProp<TabParamList>>()?.navigate('RoutineTab');
  }, [nav]);

  const onRestock = useCallback(() => {
    hapt.tap();
    nav.getParent<NavigationProp<TabParamList>>()?.navigate('ProductsTab');
  }, [nav]);

  const onClose = useCallback(() => nav.goBack(), [nav]);

  // The container only mounts behind a scanCount >= 2 gate (the Home link),
  // but render the honest gate anyway — never a blank on a deep link.
  return (
    <RescanCompareScreen
      model={model}
      onKeepGoing={onKeepGoing}
      onRestock={onRestock}
      onClose={onClose}
    />
  );
}
