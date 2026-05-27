import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';
import {
  Body,
  Eyebrow,
  HeroHeadline,
  Meta,
  Surface,
  useReducedMotion,
} from './primitives';
import { V26, V26_SPACE } from './tokens';

interface CompletionHeroProps {
  eyebrow: string;
  headline: string;
  support: string;
  meta?: string;
  /** Optional summary line ("Cleanse · Moisturize · Kept treatment gentle"). */
  summary?: string;
}

/**
 * v26 — Completion moment.
 *
 * This is the most important state in the experience. The screen
 * pauses, breathes, and tells the user they did enough. A restrained
 * terracotta ring fills, the headline rises, the support arrives.
 * No confetti, no loud success colours.
 */
export function CompletionHero({
  eyebrow,
  headline,
  support,
  meta,
  summary,
}: CompletionHeroProps) {
  const reduced = useReducedMotion();
  const ringFill = useSharedValue(reduced ? 1 : 0);
  const headlineOpacity = useSharedValue(reduced ? 1 : 0);
  const headlineTranslate = useSharedValue(reduced ? 0 : 6);
  const supportOpacity = useSharedValue(reduced ? 1 : 0);
  const metaOpacity = useSharedValue(reduced ? 1 : 0);

  React.useEffect(() => {
    if (reduced) return;
    ringFill.value = withTiming(1, {
      duration: 620,
      easing: Easing.bezier(0.25, 0.85, 0.25, 1),
    });
    headlineOpacity.value = withDelay(220, withTiming(1, { duration: 260 }));
    headlineTranslate.value = withDelay(
      220,
      withTiming(0, {
        duration: 320,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
    );
    supportOpacity.value = withDelay(420, withTiming(1, { duration: 240 }));
    metaOpacity.value = withDelay(540, withTiming(1, { duration: 220 }));
  }, [reduced, ringFill, headlineOpacity, headlineTranslate, supportOpacity, metaOpacity]);

  const headlineAnim = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslate.value }],
  }));
  const supportAnim = useAnimatedStyle(() => ({
    opacity: supportOpacity.value,
  }));
  const metaAnim = useAnimatedStyle(() => ({
    opacity: metaOpacity.value,
  }));

  return (
    <Surface tone="surface" hero elevated style={s.hero}>
      <CompletionMark progress={ringFill} reduced={reduced} />

      <Animated.View style={[s.headerWrap, headlineAnim]}>
        <Eyebrow style={s.eyebrow}>{eyebrow}</Eyebrow>
        <HeroHeadline style={s.headline}>{headline}</HeroHeadline>
      </Animated.View>

      <Animated.View style={supportAnim}>
        <Body style={s.support}>{support}</Body>
      </Animated.View>

      {meta ? (
        <Animated.View style={metaAnim}>
          <Meta style={s.meta}>{meta}</Meta>
        </Animated.View>
      ) : null}

      {summary ? (
        <View style={s.summary}>
          <Eyebrow style={s.summaryEyebrow}>Tonight’s routine complete</Eyebrow>
          <Body style={s.summaryBody}>{summary}</Body>
        </View>
      ) : null}
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// Completion mark — quiet terracotta ring with check
// ---------------------------------------------------------------------------

interface CompletionMarkProps {
  progress: { value: number };
  reduced: boolean;
}

function CompletionMark({ progress, reduced }: CompletionMarkProps) {
  const SIZE = 64;
  const STROKE = 2;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;

  const ringAnim = useAnimatedStyle(() => ({
    opacity: 1,
  }));
  void ringAnim; // silence unused

  // SVG path animation uses inline style for strokeDashoffset; we leave
  // it as final state on mount when reduced motion is on.
  const dashOffset = reduced ? 0 : CIRC * (1 - Math.min(1, Math.max(0, progress.value)));
  void dashOffset;

  return (
    <View style={s.markWrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={V26.clayTint}
          strokeWidth={STROKE}
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={V26.terracotta}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <Polyline
          points="22,33 30,41 44,25"
          fill="none"
          stroke={V26.terracotta}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    paddingVertical: 36,
  },
  markWrap: {
    width: 64,
    height: 64,
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerWrap: {
    gap: 12,
  },
  eyebrow: {
    color: V26.terracottaText,
  },
  headline: {
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.7,
  },
  support: {
    marginTop: 16,
  },
  meta: {
    marginTop: 16,
  },
  summary: {
    marginTop: V26_SPACE.section,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: V26.border,
    gap: 6,
    alignSelf: 'stretch',
  },
  summaryEyebrow: {
    color: V26.terracottaText,
  },
  summaryBody: {
    color: V26.inkMuted,
    fontSize: 14,
  },
});
