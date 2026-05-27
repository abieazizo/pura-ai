/**
 * AnalysisLoadingSlide — slide 1 of 4.
 *
 * v30.3 — production-ready edition. Photo is the centerpiece. Status
 * card is slim, elevated, and animated. Every stage transition lands
 * a small check-bounce so progress feels real, not theatrical. A live
 * subtitle changes with the current stage so the user always knows
 * what Pura is doing right now.
 */

import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { X, Check } from 'phosphor-react-native';
import {
  scanColors,
  scanLayout,
  scanRadius,
  scanShadows,
  scanType,
} from '@/theme/scanResultsTokens';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { ResultsHeaderBar } from './ResultsHeaderBar';
import { CapturedFaceFrame } from './CapturedFaceFrame';

export type LoadingStage =
  | 'image_ready'
  | 'quality_validated'
  | 'ai_result_returned'
  | 'geometry_ready'
  | 'normalized';

export interface AnalysisLoadingSlideProps {
  photoUri: string;
  stage: LoadingStage;
  onCancel?(): void;
}

const STAGE_PROGRESS: Record<LoadingStage, number> = {
  image_ready: 0.12,
  quality_validated: 0.36,
  ai_result_returned: 0.64,
  geometry_ready: 0.84,
  normalized: 1.0,
};

const STAGE_RANK: Record<LoadingStage, number> = {
  image_ready: 0,
  quality_validated: 1,
  ai_result_returned: 2,
  geometry_ready: 3,
  normalized: 4,
};

const STAGE_SUBTITLE: Record<LoadingStage, string> = {
  image_ready: 'Looking at your lighting',
  quality_validated: 'Reading visible areas',
  ai_result_returned: 'Mapping focus zones',
  geometry_ready: 'Finishing your skin map',
  normalized: 'Ready',
};

interface Task {
  label: string;
  completedAt: number;
}

const TASKS: ReadonlyArray<Task> = [
  { label: 'Checking image quality', completedAt: 1 },
  { label: 'Mapping visible areas', completedAt: 2 },
  { label: 'Identifying focus areas', completedAt: 3 },
  { label: 'Preparing results', completedAt: 4 },
];

export function AnalysisLoadingSlide({
  photoUri,
  stage,
  onCancel,
}: AnalysisLoadingSlideProps) {
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width: vw, height: vh } = useWindowDimensions();

  // Adaptive sizing: photo claims the visual majority but never
  // crowds the bottom status card or the top title.
  const availableHeight = vh - insets.top - insets.bottom;
  const photoWidth = Math.min(
    310,
    Math.max(244, vw - scanLayout.pageHorizontalPadding * 2 - 24)
  );
  const targetRatio = 1.34; // ~3:4 portrait
  const photoHeight = Math.min(
    Math.round(photoWidth * targetRatio),
    Math.round(availableHeight * 0.5)
  );

  const currentRank = STAGE_RANK[stage];
  const targetProgress = STAGE_PROGRESS[stage];

  const progress = useSharedValue(targetProgress);
  useEffect(() => {
    progress.value = withTiming(targetProgress, {
      duration: 540,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [targetProgress, progress]);

  // Slide-level entrance fade so the screen doesn't pop.
  const slideOpacity = useSharedValue(0);
  useEffect(() => {
    slideOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [slideOpacity]);
  const slideStyle = useAnimatedStyle(() => ({ opacity: slideOpacity.value }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.page, slideStyle]}>
        <View style={styles.topRow}>
          <View style={styles.headerCol}>
            <ResultsHeaderBar current={0} showBrand />
          </View>
          {onCancel ? (
            <Pressable
              onPress={onCancel}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Cancel scan"
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
              ]}
            >
              <X size={15} weight="bold" color={scanColors.inkSoft} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.titleBlock}>
          <View>
            <Text style={scanType.heroTitleSerif} maxFontSizeMultiplier={1.05}>
              AI Skin Analysis
            </Text>
            <Text style={scanType.heroAccentSerif} maxFontSizeMultiplier={1.05}>
              in progress
            </Text>
          </View>
          <Text style={[scanType.body, styles.subtext]} maxFontSizeMultiplier={1.15}>
            Mapping visible areas from your scan.
          </Text>
        </View>

        <View style={[styles.photoBlock, { marginTop: photoHeight < 360 ? 4 : 12 }]}>
          <CapturedFaceFrame
            photoUri={photoUri}
            width={photoWidth}
            height={photoHeight}
            scanning={stage !== 'normalized'}
            glow
            showLandmarkDots={currentRank >= 2}
          />
        </View>

        <View
          style={[
            styles.statusCard,
            { bottom: Math.max(insets.bottom + 6, 22) },
          ]}
        >
          <View style={styles.statusHeader}>
            <View>
              <Text
                style={[scanType.bodyStrong, { color: scanColors.ink }]}
                maxFontSizeMultiplier={1.15}
              >
                Analyzing…
              </Text>
              <Text style={styles.statusSubtitle} maxFontSizeMultiplier={1.15}>
                {STAGE_SUBTITLE[stage]}
              </Text>
            </View>
            <ProgressPercent progress={progress} />
          </View>
          <View style={styles.divider} />
          {TASKS.map((task, idx) => (
            <TaskRow
              key={task.label}
              label={task.label}
              currentRank={currentRank}
              completedAt={task.completedAt}
              reduceMotion={reduceMotion}
              isActive={
                currentRank < task.completedAt &&
                currentRank + 1 === task.completedAt
              }
              index={idx}
            />
          ))}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// ProgressPercent — animated integer counter.
// ---------------------------------------------------------------------------

function ProgressPercent({
  progress,
}: {
  progress: SharedValue<number>;
}) {
  const [text, setText] = React.useState('12');

  useEffect(() => {
    let raf: number | null = null;
    let alive = true;
    let last = -1;
    const tick = () => {
      if (!alive) return;
      const v = Math.round(progress.value * 100);
      if (v !== last) {
        last = v;
        setText(String(v).padStart(2, '0'));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [progress]);

  return (
    <View style={styles.percentWrap}>
      <Text style={styles.percent} maxFontSizeMultiplier={1.1}>
        {text}
      </Text>
      <Text style={styles.percentSign} maxFontSizeMultiplier={1.1}>%</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// TaskRow — animated state dot, satisfying check-bounce on completion.
// ---------------------------------------------------------------------------

function TaskRow({
  label,
  currentRank,
  completedAt,
  reduceMotion,
  isActive,
  index,
}: {
  label: string;
  currentRank: number;
  completedAt: number;
  reduceMotion: boolean;
  isActive: boolean;
  index: number;
}) {
  const done = currentRank >= completedAt;

  // Pulse the active dot.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!isActive || done || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [isActive, done, reduceMotion, pulse]);

  // Bounce the check on the moment a task completes.
  const checkScale = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    if (done) {
      checkScale.value = 0;
      checkScale.value = withSpring(1, { damping: 11, stiffness: 220, mass: 0.7 });
    } else {
      checkScale.value = withTiming(0, { duration: 160 });
    }
  }, [done, checkScale]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isActive && !done ? pulse.value : 1 }],
  }));

  const checkStyleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  // Row entrance.
  const rowOpacity = useSharedValue(0);
  const rowOffset = useSharedValue(6);
  useEffect(() => {
    rowOpacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
    rowOffset.value = withDelay(
      index * 80,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
    // intentionally only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rowStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
    transform: [{ translateY: rowOffset.value }],
  }));

  return (
    <Animated.View style={[styles.taskRow, rowStyle]}>
      <View style={styles.dotWell}>
        {/* Always-mounted check (animates in via spring); animated dot fades out under it. */}
        <Animated.View style={[styles.taskCheck, checkStyleAnim]}>
          <Check size={11} weight="bold" color={scanColors.white} />
        </Animated.View>
        {!done && (
          <Animated.View
            style={[
              styles.taskDot,
              isActive && styles.taskDotActive,
              dotStyle,
            ]}
          />
        )}
      </View>
      <Text
        style={[
          styles.taskText,
          done && styles.taskTextDone,
          isActive && styles.taskTextActive,
        ]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: scanColors.background,
  },
  page: {
    flex: 1,
    paddingHorizontal: scanLayout.pageHorizontalPadding,
    paddingTop: scanLayout.pageTopGutter,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCol: {
    flex: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: scanColors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
    marginLeft: 10,
    marginTop: 2,
  },
  titleBlock: {
    marginTop: 14,
    marginBottom: 4,
  },
  subtext: {
    marginTop: 10,
    maxWidth: 300,
  },
  photoBlock: {
    alignItems: 'center',
    flex: 1,
  },
  statusCard: {
    position: 'absolute',
    left: scanLayout.pageHorizontalPadding,
    right: scanLayout.pageHorizontalPadding,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: scanRadius.largeCard,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
    ...scanShadows.softLift,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: scanColors.body,
    marginTop: 2,
  },
  percentWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  percent: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: scanColors.coralDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  percentSign: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: scanColors.coralDark,
    marginLeft: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: scanColors.line,
    marginVertical: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 5,
  },
  dotWell: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: scanColors.line,
  },
  taskDotActive: {
    backgroundColor: scanColors.coral,
    shadowColor: '#E98973',
    shadowOpacity: 0.55,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  taskCheck: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: scanColors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: scanColors.body,
  },
  taskTextDone: {
    color: scanColors.inkSoft,
    fontFamily: 'Inter-Medium',
  },
  taskTextActive: {
    color: scanColors.ink,
    fontFamily: 'Inter-Medium',
  },
});
