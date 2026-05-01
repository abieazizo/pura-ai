/**
 * Mid-flight caption strip. Left-aligned with the photo's left edge.
 *
 * Style variants:
 *   italic  → Instrument Serif Italic 22pt, ink 85%  ("Mapping your face.")
 *   roman   → Instrument Serif SemiBold 28pt, ink 100%  ("Your reading is ready.")
 *   waiting → Instrument Serif Italic 17pt, ink 70%  ("Finishing your reading…")
 *
 * On text change: fade out 150ms, swap, fade in 350ms — gives each new
 * caption room to land instead of snapping.
 *
 * Trailing pulsing dot is only rendered in 'italic' and 'waiting' variants
 * (mirrors the "•" that appears in the mockups).
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette, scanTypography } from '@/theme';
import type { CaptionStyle } from '../hooks/useAnalysisChoreography';
import { PHOTO_MARGIN_H } from '../constants';

export interface AnalysisCaptionProps {
  text: string;
  variant: CaptionStyle;
  /** Top offset relative to the parent — caller anchors to photo bottom. */
  topOffset: number;
  reduceMotion: boolean;
}

export function AnalysisCaption({
  text,
  variant,
  topOffset,
  reduceMotion,
}: AnalysisCaptionProps) {
  const opacity = useSharedValue(1);
  const dotOpacity = useSharedValue(0.4);
  const [displayedText, setDisplayedText] = useState(text);
  const [displayedVariant, setDisplayedVariant] = useState<CaptionStyle>(variant);
  const prevText = useRef(text);
  const prevVariant = useRef<CaptionStyle>(variant);

  // On text change: fade out, swap, fade in.
  useEffect(() => {
    if (text === prevText.current && variant === prevVariant.current) return;

    if (reduceMotion) {
      setDisplayedText(text);
      setDisplayedVariant(variant);
      opacity.value = 1;
      prevText.current = text;
      prevVariant.current = variant;
      return;
    }

    opacity.value = withTiming(
      0,
      { duration: 150, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (!finished) return;
      }
    );
    // Swap after the fade-out finishes.
    const swapTimer = setTimeout(() => {
      setDisplayedText(text);
      setDisplayedVariant(variant);
      opacity.value = withTiming(1, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    }, 160);

    prevText.current = text;
    prevVariant.current = variant;

    return () => clearTimeout(swapTimer);
  }, [text, variant, reduceMotion, opacity]);

  // Dot pulse (only shown in italic/waiting variants).
  useEffect(() => {
    if (reduceMotion) {
      dotOpacity.value = 0.7;
      return;
    }
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [reduceMotion, dotOpacity]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const textStyle =
    displayedVariant === 'roman'
      ? styles.textRoman
      : displayedVariant === 'waiting'
      ? styles.textWaiting
      : styles.textItalic;

  const showDot = displayedVariant !== 'roman';
  const dotSize = displayedVariant === 'waiting' ? 4 : 5;
  // v18.4 — pulse dot picks up the cyan/pearl analyzing tone.
  const dotColor = '#7CB0FF';

  return (
    <View
      style={[styles.wrap, { top: topOffset }]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={displayedText}
    >
      <Animated.View style={[styles.inner, wrapStyle]}>
        <Text
          style={textStyle}
          maxFontSizeMultiplier={1.2}
          allowFontScaling
        >
          {displayedText}
        </Text>
        {showDot && displayedText ? (
          <Animated.View
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: dotColor,
              },
              dotStyle,
            ]}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: PHOTO_MARGIN_H,
    right: PHOTO_MARGIN_H,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  // v18.4 — caption typography inverts for the deep analyzing
  // surface. Italic + waiting variants use a pearl tone; the roman
  // reveal "Reading complete." goes full inverse ink for emphasis.
  textItalic: {
    ...scanTypography.captionItalic,
    color: 'rgba(248, 250, 252, 0.82)',
  },
  textRoman: {
    ...scanTypography.captionRoman,
    color: palette.inkInverse,
  },
  textWaiting: {
    ...scanTypography.captionWaiting,
    color: 'rgba(248, 250, 252, 0.6)',
  },
  dot: {
    marginBottom: 8,
  },
});
