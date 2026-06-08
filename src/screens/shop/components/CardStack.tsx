/**
 * CardStack — the swipeable deck that is the Pura Shop home's centerpiece
 * (Step 2). It renders the model's `cards` as a stack of `StackCardView`s: one
 * resting top card (the only one that breathes), with the next two peeking
 * beneath it for depth.
 *
 * Interaction — a forward-discard deck:
 *   • Drag the top card past `swipeCommitFraction` of its width (or flick past
 *     `swipeVelocityCommit`) in EITHER horizontal direction → it tilts like a
 *     dealt card, flies off in the drag direction, and the next card rises into
 *     its place. This advances through "tonight's edit."
 *   • Going back is a discrete `prev()` (an undo affordance the screen supplies
 *     later) — the previous card re-enters with a gentle settle. Keeping back
 *     off the swipe axis means the deck only ever discards forward, so the
 *     render window is monotonic and every card owns its own gesture state
 *     (no shared-value bleed between the outgoing and incoming top card).
 *
 * The component owns only the mechanic. All copy, scoring, and price framing is
 * already resolved in each `StackCard`; the escape-hatch content for the
 * terminal card is injected via `endActions`. Motion is gated by
 * `useReduceMotion()`: under reduced motion the tilt, entrance, and breathing
 * fall away but the deck still advances.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  clamp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { success, neutral, puraShopHome, puraShopSpace } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

// Cycle-10 stamp legibility: the KEEP / SKIP labels keep their existing reveal
// TINTS (success-green wash for keep, quiet-neutral wash for skip — already
// drawn from the shared ramps) but ink their text one ramp step deeper so each
// word clears AA over its own pale pill. Semantics unchanged: keep = success,
// skip = neutral.
const STAMP_INK = {
  keep: success[700],
  skip: neutral[700],
} as const;
import { hapt } from '@/utils/haptics';
import { shopHomeMotion } from '../shopHomeTokens';
import type { StackCard } from '../shopStackModel';
import { StackCardView } from './StackCard';

const SCREEN_W = Dimensions.get('window').width;

/** How many cards are mounted at once: the top + two peeking beneath. */
const WINDOW = 3;

export interface CardStackHandle {
  next(): void;
  prev(): void;
  reset(): void;
}

export interface CardStackProps {
  cards: StackCard[];
  /** Card + stage width. Defaults to the screen minus the home gutter. */
  width?: number;
  onPressProduct?: (productId: string) => void;
  onToggleSave?: (productId: string) => void;
  onAdd?: (productId: string) => void;
  /** Fires whenever the resting top card changes (drives the screen's rail). */
  onIndexChange?: (index: number) => void;
  /** Escape-hatch content rendered inside the terminal card. */
  endActions?: React.ReactNode;
}

export const CardStack = forwardRef<CardStackHandle, CardStackProps>(
  function CardStack(
    {
      cards,
      width = SCREEN_W - puraShopSpace.gutter * 2,
      onPressProduct,
      onToggleSave,
      onAdd,
      onIndexChange,
      endActions,
    },
    ref,
  ) {
    const reduceMotion = useReduceMotion();
    const [top, setTop] = useState(0);
    // Direction of the last index change — drives the re-entry animation when
    // stepping back (forward cards rise from beneath, so they need no entrance).
    const [dir, setDir] = useState<-1 | 0 | 1>(0);

    // A single shared value the top card writes during a drag and the card
    // beneath it reads, so the next card rises in step with the pull.
    const dragProgress = useSharedValue(0);

    const total = cards.length;

    const goNext = useCallback(() => {
      setTop((i) => {
        if (i >= total - 1) return i;
        const n = i + 1;
        setDir(1);
        dragProgress.value = 0;
        // Commit haptic is fired directionally in the gesture's onEnd
        // (swipeKeep / swipeSkip) so the feel matches the swipe direction.
        onIndexChange?.(n);
        return n;
      });
    }, [total, onIndexChange, dragProgress]);

    const goPrev = useCallback(() => {
      setTop((i) => {
        if (i <= 0) return i;
        const n = i - 1;
        setDir(-1);
        dragProgress.value = 0;
        hapt.select();
        onIndexChange?.(n);
        return n;
      });
    }, [onIndexChange, dragProgress]);

    useImperativeHandle(
      ref,
      () => ({
        next: goNext,
        prev: goPrev,
        reset: () => {
          setDir(0);
          dragProgress.value = 0;
          setTop(0);
          onIndexChange?.(0);
        },
      }),
      [goNext, goPrev, onIndexChange, dragProgress],
    );

    const canNext = top < total - 1;

    // Deepest-first so the resting top card paints last (on top of the deck).
    const slots: number[] = [];
    const deepest = Math.min(WINDOW - 1, total - 1 - top);
    for (let d = deepest; d >= 0; d--) slots.push(top + d);

    if (total === 0) return null;

    return (
      <View style={[styles.stage, { width }]} pointerEvents="box-none">
        {slots.map((idx) => {
          const depth = idx - top;
          const isTop = depth === 0;
          return (
            <SwipeCard
              key={cards[idx].key}
              card={cards[idx]}
              depth={depth}
              isTop={isTop}
              width={width}
              reduceMotion={reduceMotion}
              canCommit={canNext}
              playEntrance={isTop && dir === -1}
              dragProgress={dragProgress}
              onCommit={goNext}
              onPressProduct={onPressProduct}
              onToggleSave={onToggleSave}
              onAdd={onAdd}
              endActions={isTop ? endActions : undefined}
            />
          );
        })}
      </View>
    );
  },
);

// ===========================================================================
// SwipeCard — one card in the deck. Owns its own gesture + transform state so
// the outgoing and incoming top cards never share a shared value.
// ===========================================================================

interface SwipeCardProps {
  card: StackCard;
  /** 0 = resting top, 1 = next, 2 = deeper. */
  depth: number;
  isTop: boolean;
  width: number;
  reduceMotion: boolean;
  /** False on the terminal card — the deck can't advance past it. */
  canCommit: boolean;
  playEntrance: boolean;
  dragProgress: SharedValue<number>;
  onCommit: () => void;
  onPressProduct?: (productId: string) => void;
  onToggleSave?: (productId: string) => void;
  onAdd?: (productId: string) => void;
  endActions?: React.ReactNode;
}

function SwipeCard({
  card,
  depth,
  isTop,
  width,
  reduceMotion,
  canCommit,
  playEntrance,
  dragProgress,
  onCommit,
  onPressProduct,
  onToggleSave,
  onAdd,
  endActions,
}: SwipeCardProps) {
  const tx = useSharedValue(0);
  // Animated depth so cards spring between slots when the index changes.
  const depthV = useSharedValue(depth);
  // Re-entry on back-step: 0 → 1 settle. 1 (no entrance) otherwise.
  const enter = useSharedValue(playEntrance && !reduceMotion ? 0 : 1);

  const isNext = depth === 1;
  // Primitives the gesture worklet closes over (never the whole card object).
  const productId = card.product?.id ?? null;
  const alreadySaved = card.isSaved;
  const isProductCard = card.product != null;

  // JS-thread haptic callbacks fired from the gesture worklet on commit.
  const fireKeep = useCallback(() => hapt.swipeKeep(), []);
  const fireSkip = useCallback(() => hapt.swipeSkip(), []);

  useEffect(() => {
    // A touch of overshoot (lower damping) so the incoming card SETTLES into
    // the top slot instead of stopping dead — the "dealt" landing.
    depthV.value = reduceMotion
      ? depth
      : withSpring(depth, { damping: 15, stiffness: 190, mass: 0.9 });
  }, [depth, reduceMotion, depthV]);

  useEffect(() => {
    if (playEntrance && !reduceMotion) {
      enter.value = 0;
      enter.value = withSpring(1, { damping: 16, stiffness: 170 });
    } else {
      enter.value = 1;
    }
  }, [playEntrance, reduceMotion, enter]);

  const commitDist = width * shopHomeMotion.swipeCommitFraction;
  const flyout = width * shopHomeMotion.flyoutFraction;

  const pan = Gesture.Pan()
    .enabled(isTop)
    .activeOffsetX([-12, 12])
    .failOffsetY([-18, 18])
    .onChange((e) => {
      tx.value += e.changeX;
      dragProgress.value = clamp(Math.abs(tx.value) / commitDist, 0, 1);
    })
    .onEnd((e) => {
      const past =
        Math.abs(tx.value) > commitDist ||
        Math.abs(e.velocityX) > shopHomeMotion.swipeVelocityCommit;
      if (past && canCommit) {
        // Right = keep (ensure saved), left = skip (just advance).
        const keep = tx.value > 0;
        runOnJS(keep ? fireKeep : fireSkip)();
        if (keep && productId && !alreadySaved && onToggleSave) {
          runOnJS(onToggleSave)(productId);
        }
        tx.value = withTiming(
          keep ? flyout : -flyout,
          { duration: 240, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(onCommit)();
          },
        );
      } else {
        tx.value = withSpring(0, { damping: 18, stiffness: 240 });
        dragProgress.value = withTiming(0, { duration: 180 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    // The next card rises in step with the top card's pull; deeper cards hold.
    // Cards stay fully opaque (a deck doesn't ghost) — depth reads from scale +
    // each card's own shadow.
    const rise = isNext ? dragProgress.value : 0;
    const dEff = isTop ? 0 : Math.max(0, depthV.value - rise);

    const ty = dEff * shopHomeMotion.peekOffsetPx;
    const baseScale = 1 - dEff * shopHomeMotion.peekScaleStep;

    const dragRot =
      isTop && !reduceMotion
        ? interpolate(
            tx.value,
            [-width, 0, width],
            [-shopHomeMotion.maxTiltDeg, 0, shopHomeMotion.maxTiltDeg],
            Extrapolation.CLAMP,
          )
        : 0;
    // Peek cards fan by a small resting tilt that eases to 0 as they rise to
    // the top — so the deck reads as "dealt", not perfectly squared.
    const restRot = !isTop && !reduceMotion ? dEff * shopHomeMotion.restingTiltDeg : 0;
    const rot = dragRot + restRot;

    // Back-step entrance: settle down + scale up + fade in.
    const entranceTy = (1 - enter.value) * 10;
    const entranceScale = 0.96 + 0.04 * enter.value;

    return {
      opacity: enter.value,
      transform: [
        { translateX: isTop ? tx.value : 0 },
        { translateY: ty + entranceTy },
        { scale: baseScale * entranceScale },
        { rotateZ: `${rot}deg` },
      ],
    };
  });

  // Directional reveal stamps — KEEP on a right pull, SKIP on a left pull.
  const keepStampStyle = useAnimatedStyle(() => {
    const o = isTop ? clamp(tx.value / (commitDist * 0.7), 0, 1) : 0;
    return { opacity: o, transform: [{ rotate: '-11deg' }, { scale: 0.9 + 0.12 * o }] };
  });
  const skipStampStyle = useAnimatedStyle(() => {
    const o = isTop ? clamp(-tx.value / (commitDist * 0.7), 0, 1) : 0;
    return { opacity: o, transform: [{ rotate: '11deg' }, { scale: 0.9 + 0.12 * o }] };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[isTop ? styles.topCard : styles.beneathCard, animatedStyle]}
        pointerEvents={isTop ? 'auto' : 'none'}
      >
        <StackCardView
          card={card}
          width={width}
          depth={depth}
          animate={isTop && !reduceMotion}
          onPressProduct={onPressProduct}
          onToggleSave={onToggleSave}
          onAdd={onAdd}
          endActions={endActions}
        />

        {isTop && isProductCard ? (
          <>
            <Animated.View
              style={[styles.stamp, styles.stampKeep, keepStampStyle]}
              pointerEvents="none"
            >
              <Text style={[styles.stampText, { color: STAMP_INK.keep }]}>
                KEEP
              </Text>
            </Animated.View>
            <Animated.View
              style={[styles.stamp, styles.stampSkip, skipStampStyle]}
              pointerEvents="none"
            >
              <Text style={[styles.stampText, { color: STAMP_INK.skip }]}>
                SKIP
              </Text>
            </Animated.View>
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    alignSelf: 'center',
  },
  topCard: {
    // In normal flow so it dictates the stage height; painted last (on top).
  },
  beneathCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  stamp: {
    // Bolder dealt-card stamps to match the larger hero card — bigger pill, a
    // touch lower so they punch across the product zone on a committed swipe.
    position: 'absolute',
    top: 78,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 3,
  },
  stampKeep: {
    left: 28,
    backgroundColor: puraShopHome.saveReveal,
    borderColor: puraShopHome.saveRevealInk,
  },
  stampSkip: {
    right: 28,
    backgroundColor: puraShopHome.skipReveal,
    borderColor: puraShopHome.skipRevealInk,
  },
  stampText: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    letterSpacing: 3,
  },
});
