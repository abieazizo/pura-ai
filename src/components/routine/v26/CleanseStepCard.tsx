import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Check, Timer } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import {
  Body,
  Eyebrow,
  PrimaryAction,
  StepTitle,
  Supporting,
  Surface,
  useReducedMotion,
} from './primitives';
import { OwnedProductPreview } from './OwnedProductPreview';
import { QuietTextButton } from './QuietTextButton';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';
import type { OwnedRoutineProduct } from '@/state/v26/routineSession';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CleanseStepCardProps {
  ownedProduct?: OwnedRoutineProduct;
  ownedProductImageUri?: string;
  ownedProductBrand?: string;
  onMarkComplete: () => void;
  onSkip: () => void;
  onChangeProduct?: () => void;
  onAddOwned?: () => void;
}

/**
 * v26 — Step 1: Cleanse gently.
 *
 * Owned-product row if the user has a cleanser saved, otherwise a
 * compact "Add my cleanser" quiet button. An optional 30-second timer
 * is offered but never blocks completion.
 */
export function CleanseStepCard({
  ownedProduct,
  ownedProductImageUri,
  ownedProductBrand,
  onMarkComplete,
  onSkip,
  onChangeProduct,
  onAddOwned,
}: CleanseStepCardProps) {
  return (
    <Surface tone="surface" hero elevated style={s.card}>
      <Eyebrow>STEP 1 OF 3</Eyebrow>
      <StepTitle style={s.title}>Cleanse gently</StepTitle>
      <Body style={s.body}>Keep pressure light around your chin.</Body>

      {ownedProduct ? (
        <View style={s.product}>
          <OwnedProductPreview
            eyebrow="USING TONIGHT"
            brand={ownedProductBrand}
            name={ownedProduct.name}
            status="Suitable for gentle cleansing tonight"
            imageUri={ownedProductImageUri}
          />
          {onChangeProduct ? (
            <QuietTextButton
              label="Change"
              tone="muted"
              withArrow={false}
              onPress={onChangeProduct}
              style={s.inlineAction}
            />
          ) : null}
        </View>
      ) : (
        <View style={s.missing}>
          <Eyebrow style={{ color: V26.inkMuted }}>GENTLE CLEANSER</Eyebrow>
          <Body style={s.missingBody}>
            Use one without scrubs or acids.
          </Body>
          {onAddOwned ? (
            <QuietTextButton
              label="Add my cleanser"
              tone="clay"
              onPress={onAddOwned}
              style={s.inlineAction}
            />
          ) : null}
        </View>
      )}

      <CleanseTimer />

      <Supporting style={s.guidance}>
        Avoid scrubbing the highlighted area.
      </Supporting>

      <PrimaryAction
        label="Mark cleanse complete"
        variant="ink"
        onPress={onMarkComplete}
        style={s.primary}
      />
      <QuietTextButton
        label="Skip step"
        tone="muted"
        withArrow={false}
        onPress={onSkip}
        style={s.skip}
      />
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// CleanseTimer — 30-second circular progress, optional + cancellable
// ---------------------------------------------------------------------------

function CleanseTimer() {
  const reduced = useReducedMotion();
  const DURATION = 30; // seconds
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const progress = useSharedValue(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTick(), [clearTick]);

  const start = useCallback(() => {
    hapt.tap();
    setSecondsLeft(DURATION);
    setState('running');
    progress.value = 0;
    progress.value = withTiming(
      1,
      reduced
        ? { duration: 0 }
        : { duration: DURATION * 1000, easing: Easing.linear },
    );
    clearTick();
    const started = Date.now();
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      const remaining = Math.max(0, DURATION - Math.floor(elapsed));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearTick();
        setState('done');
        hapt.success();
      }
    }, 250);
  }, [clearTick, progress, reduced]);

  const stop = useCallback(() => {
    hapt.tap();
    clearTick();
    setState('idle');
    setSecondsLeft(DURATION);
    progress.value = 0;
  }, [clearTick, progress]);

  return (
    <View style={tStyles.row}>
      <RingProgress progress={progress} size={48} stroke={3} />
      <View style={{ flex: 1 }}>
        <Text style={tStyles.label} maxFontSizeMultiplier={1.15}>
          {state === 'idle'
            ? 'Optional 30-second cleanse'
            : state === 'running'
            ? `Cleansing gently · ${secondsLeft}s`
            : 'Cleanse timer complete'}
        </Text>
        <Text style={tStyles.sub} maxFontSizeMultiplier={1.2}>
          {state === 'idle'
            ? 'A calm timer if you want one.'
            : state === 'running'
            ? 'Take your time. Move gently.'
            : 'You can mark the step complete now.'}
        </Text>
      </View>
      {state === 'running' ? (
        <Pressable
          onPress={stop}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Stop cleanse timer"
          style={({ pressed }) => [tStyles.pill, pressed && { opacity: 0.6 }]}
        >
          <Text style={tStyles.pillLabel}>Stop</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={start}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={
            state === 'done' ? 'Restart cleanse timer' : 'Start cleanse timer'
          }
          style={({ pressed }) => [tStyles.pillClay, pressed && { opacity: 0.7 }]}
        >
          <Timer size={14} color="#FFFFFF" weight="bold" />
          <Text style={tStyles.pillLabelClay}>
            {state === 'done' ? 'Restart' : 'Start'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function RingProgress({
  progress,
  size,
  stroke,
}: {
  progress: { value: number };
  size: number;
  stroke: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.value),
  }));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={V26.trackNeutral}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={V26.terracotta}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={ringStyles.inner} pointerEvents="none">
        {/* The ring is the indicator on its own — no inner glyph. */}
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  inner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const tStyles = StyleSheet.create({
  row: {
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: V26_RADIUS.inset,
    backgroundColor: V26.clayMist,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  label: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13.5,
    color: V26.ink,
  },
  sub: {
    fontFamily: V26_TYPE.sans,
    fontSize: 12,
    color: V26.inkMuted,
    marginTop: 2,
  },
  pill: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: V26_RADIUS.pill,
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 12.5,
    color: V26.ink,
  },
  pillClay: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: V26_RADIUS.pill,
    backgroundColor: V26.terracotta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillLabelClay: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
});

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  title: {
    marginTop: 12,
  },
  body: {
    marginTop: 10,
  },
  product: {
    marginTop: 18,
    gap: 6,
  },
  missing: {
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: V26_RADIUS.inset,
    backgroundColor: V26.warmScan,
    gap: 4,
  },
  missingBody: {
    marginTop: 4,
    color: V26.inkSecondary,
  },
  guidance: {
    marginTop: 18,
  },
  primary: {
    marginTop: V26_SPACE.section,
  },
  skip: {
    marginTop: 4,
    alignSelf: 'center',
  },
  inlineAction: {
    marginTop: 2,
  },
});
