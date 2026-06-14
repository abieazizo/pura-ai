/**
 * MoneyFlow — the container threading the commerce sub-flow:
 *
 *   tailoring → your routine → confirm (locks) → buy / product-free → account
 *
 * It owns the cross-screen state. The recommendation IS the routine: the engine
 * builds it from the SCAN findings + the tailoring answers (never an LLM, never
 * recomposed inline), and it only LOCKS at Confirm. Network-decoupled and
 * prop-driven — fed a canonical SkinRead so it's fully showcase-able offline.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { SkinRead } from '@/types/skinRead';
import { buildRecommendation, engineFindingsFromSkinRead } from '@/commerce/engine';
import type { RecommendationSet, TailoringInput } from '@/commerce/types';
import { TailoringScreen } from './TailoringScreen';
import { YourRoutineScreen, type SelectedLine } from './YourRoutineScreen';
import { ConfirmScreen } from './ConfirmScreen';
import { AccountScreen } from './AccountScreen';

type Stage = 'tailoring' | 'routine' | 'confirm' | 'account';

export interface MoneyFlowProps {
  read: SkinRead;
  goal?: string;
  /** Beginner cap (≤1 active) — defaults true for a first routine. */
  beginner?: boolean;
  /**
   * Fired at Confirm with the final selection — THIS is the lock. The host
   * commits the chosen products AS the routine here (the recommendation IS the
   * routine). Omitted in the offline showcase, so it touches no store.
   */
  onLock?: (lines: SelectedLine[]) => void;
  /** Flow finished (account created or skipped). */
  onDone?: () => void;
}

export function MoneyFlow({ read, goal, beginner = true, onLock, onDone }: MoneyFlowProps) {
  const [stage, setStage] = useState<Stage>('tailoring');
  const [tailoring, setTailoring] = useState<TailoringInput | null>(null);
  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [bought, setBought] = useState<{ opened: number } | null>(null);

  const findings = useMemo(() => engineFindingsFromSkinRead(read), [read]);

  const recommendation: RecommendationSet | null = useMemo(
    () => (tailoring ? buildRecommendation({ findings, tailoring, beginner }) : null),
    [findings, tailoring, beginner],
  );

  if (stage === 'tailoring' || !recommendation) {
    return (
      <TailoringScreen
        goal={goal}
        onComplete={(t) => { setTailoring(t); setStage('routine'); }}
      />
    );
  }

  if (stage === 'routine') {
    return (
      <YourRoutineScreen
        recommendation={recommendation}
        goalLine={goal ? `Built from your scan, shaped to ${goal}. Each step is one real product, picked for fit.` : undefined}
        onConfirm={(l) => { setLines(l); setStage('confirm'); }}
      />
    );
  }

  if (stage === 'confirm') {
    return (
      <ConfirmScreen
        lines={lines}
        onLock={() => onLock?.(lines)}
        onBought={(res) => { setBought(res); setStage('account'); }}
        onProductFree={() => { setBought({ opened: 0 }); setStage('account'); }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AccountScreen
        bought={(bought?.opened ?? 0) > 0}
        openedCount={bought?.opened ?? 0}
        onCreateAccount={() => onDone?.()}
        onMaybeLater={() => onDone?.()}
      />
    </View>
  );
}
