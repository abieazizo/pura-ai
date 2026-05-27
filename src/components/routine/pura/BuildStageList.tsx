/**
 * BuildStageList — premium four-stage indicator.
 *
 * Each stage has three visual states:
 *   • complete — filled coral disc with a white check
 *   • active   — coral outlined ring with a soft luminous halo
 *   • idle     — neutral dashed outline
 *
 * The labels live directly under each marker; the connector lines
 * between markers fill as stages move forward, giving the rail a
 * continuous, satisfying "fill" arc.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  puraRoutineColors as C,
  puraRoutineType as T,
} from '@/theme';
import {
  ROUTINE_BUILD_STAGES,
  type RoutineBuildStage,
} from '@/types/routine';

interface BuildStageListProps {
  activeStage: RoutineBuildStage;
  completedStages: RoutineBuildStage[];
}

const ALL_STAGES: RoutineBuildStage[] = [
  'reading_focus_areas',
  'matching_step_types',
  'checking_shelf',
  'matching_products',
  'finalizing_plan',
  'complete',
];

export function BuildStageList({
  activeStage,
  completedStages,
}: BuildStageListProps) {
  // The four display stages map onto the more granular service stages:
  //   • Reading scan        → reading_focus_areas
  //   • Choosing steps      → matching_step_types
  //   • Matching products   → matching_products OR checking_shelf
  //   • Finalizing plan     → finalizing_plan
  const isDisplayStageComplete = (
    key: RoutineBuildStage,
  ): boolean => {
    const activeIdx = ALL_STAGES.indexOf(activeStage);
    const keyIdx = ALL_STAGES.indexOf(key);
    if (completedStages.includes(key)) return true;
    if (key === 'matching_products' && completedStages.includes('checking_shelf')) {
      // checking_shelf precedes matching_products — only flip the
      // display marker after matching itself is done.
      return false;
    }
    return keyIdx < activeIdx;
  };

  const isDisplayStageActive = (key: RoutineBuildStage): boolean => {
    if (key === activeStage) return true;
    if (key === 'matching_products' && activeStage === 'checking_shelf') return true;
    return false;
  };

  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      {ROUTINE_BUILD_STAGES.map((stage, i) => {
        const done = isDisplayStageComplete(stage.key);
        const active = !done && isDisplayStageActive(stage.key);
        const prevDone =
          i > 0 && isDisplayStageComplete(ROUTINE_BUILD_STAGES[i - 1].key);

        return (
          <View key={stage.key} style={styles.column}>
            {i > 0 ? (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: prevDone ? C.coralStrong : C.lineStrong },
                ]}
              />
            ) : null}

            <StageDot done={done} active={active} />

            <Text
              maxFontSizeMultiplier={1.2}
              numberOfLines={2}
              style={[
                styles.label,
                {
                  color: done || active ? C.coralDeep : C.muted,
                  fontFamily:
                    done || active ? 'Inter-SemiBold' : 'Inter-Regular',
                },
              ]}
            >
              {stage.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const DOT_SIZE = 26;

function StageDot({ done, active }: { done: boolean; active: boolean }) {
  const halo = useSharedValue(0.85);
  useEffect(() => {
    if (active) {
      halo.value = withRepeat(
        withTiming(1.18, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(halo);
      halo.value = 1;
    }
    return () => {
      cancelAnimation(halo);
    };
  }, [active, halo]);
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: halo.value }],
    opacity: active ? 0.55 : 0,
  }));

  if (done) {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Svg width={12} height={12} viewBox="0 0 16 16">
          <Path
            d="M3 9 L7 12 L13 4"
            stroke="#FFFFFF"
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  }

  if (active) {
    return (
      <View style={styles.dotWrap}>
        <Animated.View
          style={[
            styles.haloRing,
            haloStyle,
          ]}
        />
        <View style={[styles.dot, styles.dotActive]}>
          <Svg width={DOT_SIZE} height={DOT_SIZE} viewBox="0 0 28 28">
            <Circle cx={14} cy={14} r={4} fill={C.coralStrong} />
          </Svg>
        </View>
      </View>
    );
  }

  // Idle
  return (
    <View style={styles.dotWrap}>
      <View style={[styles.dot, styles.dotIdle]}>
        <Svg width={DOT_SIZE} height={DOT_SIZE} viewBox="0 0 28 28">
          <Circle cx={14} cy={14} r={3} fill={C.lineStrong} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  column: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: DOT_SIZE / 2 - 0.5,
    left: '-50%',
    right: '50%',
    height: 1.5,
    borderRadius: 1,
  },
  dotWrap: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: C.coralStrong,
    borderColor: C.coralStrong,
  },
  dotActive: {
    backgroundColor: C.coralWash,
    borderColor: C.coralStrong,
  },
  dotIdle: {
    backgroundColor: C.surface,
    borderColor: C.line,
    borderStyle: 'dashed',
  },
  haloRing: {
    position: 'absolute',
    width: DOT_SIZE + 16,
    height: DOT_SIZE + 16,
    borderRadius: (DOT_SIZE + 16) / 2,
    borderWidth: 1.5,
    borderColor: C.coral,
  },
  label: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.1,
    paddingHorizontal: 2,
  },
});
