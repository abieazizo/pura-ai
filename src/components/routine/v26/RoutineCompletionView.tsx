import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Check } from 'phosphor-react-native';
import {
  Body,
  HeroHeadline,
  Meta,
  PrimaryAction,
  Surface,
  useReducedMotion,
} from './primitives';
import { TomorrowSPFCard } from './TomorrowSPFCard';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';

interface SummaryItem {
  label: string;
  completed: boolean;
  detail?: string;
}

interface RoutineCompletionViewProps {
  summary: SummaryItem[];
  elapsedMinutes: number;
  onAddSpf: () => void;
  onFindSpf?: () => void;
  onDone: () => void;
}

/**
 * v26 — Completion view.
 *
 * The emotional centerpiece. Calm clay check ring draws in, the
 * editorial headline rises, the routine summary lands honestly
 * (skipped is shown as skipped — never silently rewritten as done),
 * then the TomorrowSPFCard appears. A bold "Done for tonight" exits
 * focused mode and restores the global tab bar.
 */
export function RoutineCompletionView({
  summary,
  elapsedMinutes,
  onAddSpf,
  onFindSpf,
  onDone,
}: RoutineCompletionViewProps) {
  const reduced = useReducedMotion();
  const checkProgress = useSharedValue(reduced ? 1 : 0);
  const headlineOpacity = useSharedValue(reduced ? 1 : 0);
  const headlineTranslate = useSharedValue(reduced ? 0 : 8);
  const bodyOpacity = useSharedValue(reduced ? 1 : 0);
  const summaryOpacity = useSharedValue(reduced ? 1 : 0);
  const morningOpacity = useSharedValue(reduced ? 1 : 0);

  React.useEffect(() => {
    if (reduced) return;
    checkProgress.value = withTiming(1, {
      duration: 620,
      easing: Easing.bezier(0.25, 0.85, 0.25, 1),
    });
    headlineOpacity.value = withDelay(300, withTiming(1, { duration: 320 }));
    headlineTranslate.value = withDelay(
      300,
      withTiming(0, {
        duration: 360,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
    );
    bodyOpacity.value = withDelay(500, withTiming(1, { duration: 280 }));
    summaryOpacity.value = withDelay(620, withTiming(1, { duration: 320 }));
    morningOpacity.value = withDelay(820, withTiming(1, { duration: 320 }));
  }, [
    reduced,
    checkProgress,
    headlineOpacity,
    headlineTranslate,
    bodyOpacity,
    summaryOpacity,
    morningOpacity,
  ]);

  const headlineAnim = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslate.value }],
  }));
  const bodyAnim = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
  }));
  const summaryAnim = useAnimatedStyle(() => ({
    opacity: summaryOpacity.value,
  }));
  const morningAnim = useAnimatedStyle(() => ({
    opacity: morningOpacity.value,
  }));

  return (
    <View style={s.wrap}>
      <Surface tone="surface" hero elevated style={s.hero}>
        <CheckMark progress={checkProgress} />

        <Animated.View style={headlineAnim}>
          <HeroHeadline style={s.headline}>You did enough tonight.</HeroHeadline>
        </Animated.View>

        <Animated.View style={bodyAnim}>
          <Body style={s.body}>
            Your routine is complete. Let your skin settle.
          </Body>
        </Animated.View>

        <Animated.View style={[s.summary, summaryAnim]}>
          <Text style={s.summaryEyebrow} maxFontSizeMultiplier={1.15}>
            TONIGHT
          </Text>
          {summary.map((item, idx) => (
            <View key={`${item.label}-${idx}`} style={s.summaryRow}>
              <View
                style={[
                  s.summaryMark,
                  item.completed ? s.summaryMarkDone : s.summaryMarkSkipped,
                ]}
              >
                {item.completed ? (
                  <Check size={11} color="#FFFFFF" weight="bold" />
                ) : (
                  <View style={s.skipDot} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    s.summaryLabel,
                    !item.completed && s.summaryLabelSkipped,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {item.label}
                </Text>
                {item.detail ? (
                  <Text style={s.summaryDetail} maxFontSizeMultiplier={1.2}>
                    {item.detail}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
          <Meta style={s.meta}>
            {elapsedMinutes} minutes · Routine complete
          </Meta>
        </Animated.View>
      </Surface>

      <Animated.View style={morningAnim}>
        <TomorrowSPFCard onAddSpf={onAddSpf} onFindSpf={onFindSpf} />
      </Animated.View>

      <PrimaryAction
        label="Done for tonight"
        variant="ink"
        onPress={onDone}
        style={s.done}
      />
    </View>
  );
}

function CheckMark({ progress }: { progress: { value: number } }) {
  const SIZE = 76;
  const STROKE = 2;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  void progress; // SVG circle dashoffset is set declaratively for cross-platform reliability.
  return (
    <View style={mark.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill={V26.clayMist}
          stroke={V26.clayTint}
          strokeWidth={STROKE}
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={V26.terracotta}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <Polyline
          points="26,39 36,49 52,30"
          fill="none"
          stroke={V26.terracotta}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const mark = StyleSheet.create({
  wrap: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
});

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingTop: 18,
    gap: V26_SPACE.cardGap,
  },
  hero: {
    paddingVertical: 36,
    alignItems: 'flex-start',
  },
  headline: {
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.7,
    color: V26.ink,
  },
  body: {
    marginTop: 14,
    color: V26.inkSecondary,
    fontSize: 16,
    lineHeight: 23,
  },
  summary: {
    marginTop: V26_SPACE.section,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: V26.border,
    alignSelf: 'stretch',
    gap: 10,
  },
  summaryEyebrow: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    color: V26.terracottaText,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  summaryMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryMarkDone: {
    backgroundColor: V26.terracotta,
  },
  summaryMarkSkipped: {
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.borderStrong,
  },
  skipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: V26.inkFaint,
  },
  summaryLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 15,
    color: V26.ink,
  },
  summaryLabelSkipped: {
    color: V26.inkMuted,
  },
  summaryDetail: {
    fontFamily: V26_TYPE.sans,
    fontSize: 12.5,
    color: V26.inkMuted,
    marginTop: 2,
  },
  meta: {
    marginTop: 10,
    color: V26.inkMuted,
  },
  done: {
    marginTop: V26_SPACE.cardGap,
  },
});

void V26_RADIUS;
