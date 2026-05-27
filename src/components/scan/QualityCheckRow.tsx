/**
 * QualityCheckRow — small pill row that surfaces the per-mode
 * quality checks. Collapses to a single "N checks passed" pill
 * 700ms after every check turns "passed" (spec §16).
 *
 * Consumed by face / product / barcode overlays. Each mode supplies
 * its own check set via the controller; the row only renders.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Aperture,
  Barcode,
  CheckCircle,
  CircleHalf,
  Sparkle,
  Sun,
  Tag,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import type { CheckStatus, QualityCheck } from '@/screens/scan/scanController';

const TONES = {
  neutral: {
    bg: 'rgba(8,17,31,0.52)',
    border: 'rgba(255,255,255,0.14)',
    text: 'rgba(255,255,255,0.62)',
    icon: 'rgba(255,255,255,0.48)',
  },
  checking: {
    bg: 'rgba(8,17,31,0.62)',
    border: 'rgba(255,255,255,0.24)',
    text: 'rgba(255,255,255,0.86)',
    icon: 'rgba(255,255,255,0.78)',
  },
  passed: {
    bg: 'rgba(12,43,69,0.76)',
    border: 'rgba(104,216,255,0.34)',
    text: '#BFEAFF',
    icon: '#7EF2C2',
  },
  warning: {
    bg: 'rgba(54,38,18,0.76)',
    border: 'rgba(245,184,92,0.34)',
    text: '#FFD39A',
    icon: '#F5B85C',
  },
  failed: {
    bg: 'rgba(60,18,24,0.76)',
    border: 'rgba(255,122,122,0.32)',
    text: '#FFC0C0',
    icon: '#FF7A7A',
  },
} as const satisfies Record<CheckStatus, { bg: string; border: string; text: string; icon: string }>;

const ICON_BY_ID: Record<string, React.FC<PhosphorIconProps>> = {
  face: CircleHalf as React.FC<PhosphorIconProps>,
  label: Tag as React.FC<PhosphorIconProps>,
  barcode: Barcode as React.FC<PhosphorIconProps>,
  light: Sun as React.FC<PhosphorIconProps>,
  still: Sparkle as React.FC<PhosphorIconProps>,
  focus: Aperture as React.FC<PhosphorIconProps>,
};

export interface QualityCheckRowProps {
  checks: ReadonlyArray<QualityCheck>;
  /** Replace the row with a single collapsed pill once all checks pass. */
  collapsedLabel: string | null;
  /** Hide entirely when there's nothing meaningful to surface (permission/error states). */
  hidden?: boolean;
}

const COLLAPSE_DELAY_MS = 700;

export function QualityCheckRow({
  checks,
  collapsedLabel,
  hidden,
}: QualityCheckRowProps) {
  const allPassed = checks.length > 0 && checks.every((c) => c.status === 'passed');
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!allPassed || !collapsedLabel) {
      setCollapsed(false);
      return;
    }
    const t = setTimeout(() => setCollapsed(true), COLLAPSE_DELAY_MS);
    return () => clearTimeout(t);
  }, [allPassed, collapsedLabel]);

  const wrapOpacity = useSharedValue(1);
  useEffect(() => {
    wrapOpacity.value = withTiming(hidden ? 0 : 1, {
      duration: 220,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [hidden, wrapOpacity]);
  const wrapStyle = useAnimatedStyle(() => ({ opacity: wrapOpacity.value }));

  if (hidden) {
    return null;
  }

  if (collapsed && collapsedLabel) {
    return (
      <Animated.View style={[styles.row, wrapStyle]} pointerEvents="none">
        <View
          style={[
            styles.pill,
            {
              backgroundColor: TONES.passed.bg,
              borderColor: TONES.passed.border,
            },
          ]}
        >
          <CheckCircle size={13} weight="fill" color={TONES.passed.icon} />
          <Text
            style={[styles.label, { color: TONES.passed.text }]}
            maxFontSizeMultiplier={1.1}
            allowFontScaling={false}
          >
            {collapsedLabel}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.row, wrapStyle]} pointerEvents="none">
      {checks.map((check) => {
        const tone = TONES[check.status] ?? TONES.neutral;
        const Icon = ICON_BY_ID[check.id] ?? CircleHalf;
        return (
          <View
            key={check.id}
            style={[
              styles.pill,
              {
                backgroundColor: tone.bg,
                borderColor: tone.border,
              },
            ]}
          >
            <Icon size={12} weight="fill" color={tone.icon} />
            <Text
              style={[styles.label, { color: tone.text }]}
              maxFontSizeMultiplier={1.1}
              allowFontScaling={false}
            >
              {check.label}
            </Text>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
