/**
 * GuidanceCard (v11.10).
 *
 * v11.7–v11.9 rendered all three pre-capture tips at once. The user
 * called this out as cluttered: when there's nothing to coach, the
 * UI was shouting three things in parallel.
 *
 * v11.10 collapses to ONE active message at a time, chosen by a
 * priority ladder so the message that gets surfaced is always the
 * most relevant for the current state:
 *
 *   priority 0 — preparing       ("Hold still — checking image quality…")
 *   priority 1 — capture-blocked (gateway unavailable, etc.)
 *   priority 2 — first-scan      (welcome line, only on the first run)
 *   priority 3 — neutral framing instruction (default; rotates between
 *               the three honest tips on a slow 6s cadence so the
 *               surface still feels alive)
 *
 * Because Expo Go cannot give us live framing/lighting/motion signals,
 * the app cannot truthfully decide "show 'fix lighting' vs 'fix
 * framing'" before capture. The honest answer is to default to a
 * single neutral framing instruction and let the post-capture
 * preflight call do the actual diagnosis.
 *
 * Visually: a short single-line capsule. Lots of breathing room. No
 * stacked rows. Reads as ONE thing the user is supposed to do right
 * now.
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
  CircleHalf,
  Sun,
  Sparkle,
  Barcode,
  Drop,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { palette } from '@/theme';
import type { ReticleMode, FrameState } from './Reticle';
import { useAppStore } from '@/store/useAppStore';

interface GuidanceMessage {
  id: string;
  Icon: React.FC<PhosphorIconProps>;
  text: string;
  tone: 'neutral' | 'preparing' | 'attention';
}

// Priority ladder. The first message whose predicate returns true is
// the one rendered.
//
// FACE-MODE neutral pool. We rotate through these on a slow cadence
// (6s) so the surface feels alive without ever being noisy: at any
// given second exactly ONE of them is on screen.
const FACE_NEUTRAL_TIPS: ReadonlyArray<GuidanceMessage> = [
  {
    id: 'face-center',
    Icon: CircleHalf as React.FC<PhosphorIconProps>,
    text: 'Center your full face in the oval',
    tone: 'neutral',
  },
  {
    id: 'face-light',
    Icon: Sun as React.FC<PhosphorIconProps>,
    text: 'Use even, soft light',
    tone: 'neutral',
  },
  {
    id: 'face-still',
    Icon: Sparkle as React.FC<PhosphorIconProps>,
    text: 'Hold still — we’ll check the photo',
    tone: 'neutral',
  },
];

const PRODUCT_NEUTRAL: GuidanceMessage = {
  id: 'product',
  Icon: Drop as React.FC<PhosphorIconProps>,
  text: 'Frame the front label clearly',
  tone: 'neutral',
};

const BARCODE_NEUTRAL: GuidanceMessage = {
  id: 'barcode',
  Icon: Barcode as React.FC<PhosphorIconProps>,
  text: 'Center the barcode — it scans automatically',
  tone: 'neutral',
};

const PREPARING_MSG: GuidanceMessage = {
  id: 'preparing',
  Icon: Sparkle as React.FC<PhosphorIconProps>,
  text: 'Hold still — checking image quality…',
  tone: 'preparing',
};

const FIRST_SCAN_MSG: GuidanceMessage = {
  id: 'first-scan',
  Icon: CircleHalf as React.FC<PhosphorIconProps>,
  text: 'Your first scan — center your full face',
  tone: 'neutral',
};

const TIP_ROTATE_MS = 6000;

export interface GuidanceCardProps {
  mode: ReticleMode;
  frameState?: FrameState;
}

export function GuidanceCard({ mode, frameState = 'idle' }: GuidanceCardProps) {
  const hasNeverScanned = useAppStore((s) => s.scans.length === 0);

  // Slow rotation through the face-mode neutral pool. Resets to 0
  // when the mode changes or the user enters preparing.
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    if (mode !== 'face') return;
    if (frameState === 'preparing') return;
    if (hasNeverScanned) return; // first-scan message takes priority
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % FACE_NEUTRAL_TIPS.length);
    }, TIP_ROTATE_MS);
    return () => clearInterval(id);
  }, [mode, frameState, hasNeverScanned]);

  // Resolve the single message to render based on the priority ladder.
  let message: GuidanceMessage;
  if (frameState === 'preparing') {
    message = PREPARING_MSG;
  } else if (mode === 'product') {
    message = PRODUCT_NEUTRAL;
  } else if (mode === 'barcode') {
    message = BARCODE_NEUTRAL;
  } else if (hasNeverScanned) {
    // Face mode, first run: a one-time welcome before the rotation
    // pool kicks in. After the user has scanned once, we drop into
    // the rotation.
    message = FIRST_SCAN_MSG;
  } else {
    message = FACE_NEUTRAL_TIPS[tipIndex];
  }

  // Crossfade on message change.
  const fade = useSharedValue(1);
  const [renderedId, setRenderedId] = useState(message.id);
  const [rendered, setRendered] = useState(message);
  useEffect(() => {
    if (message.id === renderedId) return;
    fade.value = withTiming(0, {
      duration: 160,
      easing: Easing.in(Easing.cubic),
    });
    const t = setTimeout(() => {
      setRendered(message);
      setRenderedId(message.id);
      fade.value = withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    }, 170);
    return () => clearTimeout(t);
  }, [message, renderedId, fade]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 4 }],
  }));

  const Icon = rendered.Icon;
  const isPreparing = rendered.tone === 'preparing';

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.pill,
          isPreparing && styles.pillPreparing,
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            isPreparing && styles.iconWrapPreparing,
          ]}
        >
          <Icon
            size={14}
            weight="duotone"
            color={isPreparing ? palette.mossLight : 'rgba(255,255,255,0.95)'}
          />
        </View>
        <Text
          style={[styles.text, isPreparing && styles.textPreparing]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
        >
          {rendered.text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  // Single capsule, sized to its content. Fixed height = 36pt.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    maxWidth: '100%',
  },
  pillPreparing: {
    backgroundColor: 'rgba(11,18,32,0.65)',
    borderColor: palette.mossDeep,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapPreparing: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  text: {
    flexShrink: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0.05,
    color: 'rgba(255,255,255,0.95)',
  },
  textPreparing: {
    fontFamily: 'Inter-SemiBold',
    color: palette.mossLight,
    letterSpacing: 0.4,
  },
});
