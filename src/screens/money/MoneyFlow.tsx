/**
 * MoneyFlow — the container threading the commerce sub-flow:
 *
 *   tailoring → your routine → confirm (locks) → buy / product-free → account
 *
 * It owns the cross-screen state. The recommendation IS the routine: the engine
 * builds it from the SCAN findings + the tailoring answers (never an LLM, never
 * recomposed inline), and it only LOCKS at Confirm. Network-decoupled and
 * prop-driven — fed a canonical SkinRead so it's fully showcase-able offline.
 *
 * ── Orb continuity ──────────────────────────────────────────────────────────
 * The companion orb is hoisted HERE as a SINGLE persistent instance pinned over
 * the flow (`pointerEvents="none"`), so it never unmounts between stages — its
 * breath and glow phase carry straight through. It simply morphs `state` and
 * glides to each stage's anchor (the spot its old per-screen orb used to sit).
 * Each child screen renders a same-size spacer in place of its own orb
 * (`hideOrb`), so nothing below it shifts. Stage content cross-fades in.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SkinRead } from '@/types/skinRead';
import { buildRecommendation, engineFindingsFromSkinRead } from '@/commerce/engine';
import type { RecommendationSet, TailoringInput } from '@/commerce/types';
import { AssistantAuroraOrb } from '@/screens/assistant/AssistantAuroraOrb';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { money } from './theme';
import { TailoringScreen } from './TailoringScreen';
import { YourRoutineScreen, type SelectedLine } from './YourRoutineScreen';
import { ConfirmScreen } from './ConfirmScreen';
import { AccountScreen } from './AccountScreen';

type Stage = 'tailoring' | 'routine' | 'confirm' | 'account';

/** The persistent orb size + its per-stage anchor (matches the old per-screen
 *  orb tops: tailoring sat at +20, routine/confirm at +18, account lower at
 *  +40). Left gutter is a constant 24 across every screen. */
const ORB_SIZE = 60;
const ORB_LEFT = 24;
const ANCHOR: Record<Stage, number> = {
  tailoring: 20,
  routine: 18,
  confirm: 18,
  account: 40,
};
const ORB_STATE: Record<Stage, 'idle' | 'responding'> = {
  tailoring: 'idle',
  routine: 'responding',
  confirm: 'responding',
  account: 'responding',
};

export interface MoneyFlowProps {
  read: SkinRead;
  goal?: string;
  /** Beginner cap (≤1 active) — defaults true for a first routine. */
  beginner?: boolean;
  /** Does the user already have an account? (Post-scan they almost always do.) */
  hasAccount?: boolean;
  /**
   * Fired at Confirm with the final selection — THIS is the lock. The host
   * commits the chosen products AS the routine here (the recommendation IS the
   * routine). Omitted in the offline showcase, so it touches no store.
   */
  onLock?: (lines: SelectedLine[]) => void;
  /** Flow finished (account created or skipped). */
  onDone?: () => void;
}

export function MoneyFlow({ read, goal, beginner = true, hasAccount = true, onLock, onDone }: MoneyFlowProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [stage, setStage] = useState<Stage>('tailoring');
  const [tailoring, setTailoring] = useState<TailoringInput | null>(null);
  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [bought, setBought] = useState<{ opened: number } | null>(null);

  const findings = useMemo(() => engineFindingsFromSkinRead(read), [read]);

  const recommendation: RecommendationSet | null = useMemo(
    () => (tailoring ? buildRecommendation({ findings, tailoring, beginner }) : null),
    [findings, tailoring, beginner],
  );

  // The single orb glides to each stage's anchor — same instance throughout, so
  // its animation phase is never reset by a stage swap.
  const effectiveStage: Stage = stage === 'tailoring' || !recommendation ? 'tailoring' : stage;
  const anchorY = useSharedValue(ANCHOR.tailoring);
  useEffect(() => {
    const target = ANCHOR[effectiveStage];
    anchorY.value = reduceMotion
      ? target
      : withTiming(target, { duration: 460, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [effectiveStage, reduceMotion, anchorY]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: insets.top + anchorY.value }],
  }));

  const fade = reduceMotion ? undefined : FadeIn.duration(300);

  const content = (() => {
    if (effectiveStage === 'tailoring') {
      return (
        <TailoringScreen
          hideOrb
          goal={goal}
          onComplete={(t) => { setTailoring(t); setStage('routine'); }}
        />
      );
    }
    if (stage === 'routine') {
      return (
        <YourRoutineScreen
          hideOrb
          recommendation={recommendation!}
          depth={tailoring?.depth}
          goalLine={goal ? `Built from your scan, shaped to ${goal}. Each step is one real product, picked for fit.` : undefined}
          onConfirm={(l) => { setLines(l); setStage('confirm'); }}
        />
      );
    }
    if (stage === 'confirm') {
      return (
        <ConfirmScreen
          hideOrb
          lines={lines}
          onLock={() => onLock?.(lines)}
          onBought={(res) => { setBought(res); setStage('account'); }}
          onProductFree={() => { setBought({ opened: 0 }); setStage('account'); }}
        />
      );
    }
    return (
      <AccountScreen
        hideOrb
        bought={(bought?.opened ?? 0) > 0}
        openedCount={bought?.opened ?? 0}
        hasAccount={hasAccount}
        onCreateAccount={() => onDone?.()}
        onMaybeLater={() => onDone?.()}
      />
    );
  })();

  return (
    <View style={{ flex: 1, backgroundColor: money.bg }}>
      <Animated.View key={effectiveStage} entering={fade} style={{ flex: 1 }}>
        {content}
      </Animated.View>

      {/* One orb for the whole flow — pinned, non-interactive, never remounts. */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, left: ORB_LEFT }, orbStyle]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <AssistantAuroraOrb state={ORB_STATE[effectiveStage]} size={ORB_SIZE} scanTone="balanced" />
      </Animated.View>
    </View>
  );
}
