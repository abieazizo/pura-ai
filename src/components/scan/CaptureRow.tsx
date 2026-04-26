import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  Lightning,
  Image as ImageIcon,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { hapt } from '@/utils/haptics';
import { palette, spring } from '@/theme';

export type FlashMode = 'off' | 'on' | 'auto';

export interface CaptureRowProps {
  flashMode: FlashMode;
  onChangeFlash: (next: FlashMode) => void;
  onCapture: () => void;
  onGalleryPick: (uri: string) => void;
  /** True while the native capture is in-flight — drives the ring draw. */
  analyzing?: boolean;
  /**
   * v10.32 — when true, the centre CaptureButton is replaced with a
   * passive "scanning" indicator. Used by the barcode mode where the
   * camera auto-fires on detection and a manual shutter would be
   * confusing.
   */
  autoMode?: boolean;
  /** Status copy rendered inside the auto-mode chip. Default: "Scanning…". */
  autoModeLabel?: string;
}

/**
 * Bottom capture dock (§2.3). Three floating elements: FlashButton (left),
 * CaptureButton (center), GalleryButton (right). Not nested in any card.
 *
 * v10.32 — when `autoMode` is true (barcode mode), the centre slot
 * swaps to a `ScanningIndicator` and the manual shutter is disabled.
 * The flash + gallery buttons stay live (a torch helps barcode
 * detection in low light; gallery may carry a barcode-bearing photo).
 */
export function CaptureRow({
  flashMode,
  onChangeFlash,
  onCapture,
  onGalleryPick,
  analyzing = false,
  autoMode = false,
  autoModeLabel = 'Scanning…',
}: CaptureRowProps) {
  return (
    <View style={styles.row}>
      <FlashButton mode={flashMode} onPress={onChangeFlash} />
      {autoMode ? (
        <ScanningIndicator label={autoModeLabel} />
      ) : (
        <CaptureButton onPress={onCapture} analyzing={analyzing} />
      )}
      <GalleryButton onPick={onGalleryPick} />
    </View>
  );
}

// ---------------- Flash ----------------

const FLASH_NEXT: Record<FlashMode, FlashMode> = {
  off: 'on',
  on: 'auto',
  auto: 'off',
};

function FlashButton({
  mode,
  onPress,
}: {
  mode: FlashMode;
  onPress: (next: FlashMode) => void;
}) {
  // v10 — frosted-ink chip. Icon sits on paper white; the "on" state flips
  // the icon to amber (the warm-signal token) instead of clay so flash reads
  // as an attention cue, not a brand accent.
  const iconColor =
    mode === 'on' ? palette.amber : 'rgba(248,250,252,0.85)';
  const handle = () => {
    hapt.select();
    onPress(FLASH_NEXT[mode]);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Flash ${mode}`}
      accessibilityState={{ selected: mode === 'on' }}
      onPress={handle}
      style={({ pressed }) => [styles.sideBtn, pressed && styles.sideBtnPressed]}
      hitSlop={8}
    >
      <Lightning
        size={18}
        color={iconColor}
        weight={mode === 'on' ? 'fill' : 'duotone'}
      />
      {mode === 'on' ? <View style={styles.onDot} /> : null}
      {mode === 'auto' ? <Text style={styles.autoLabel}>A</Text> : null}
    </Pressable>
  );
}

// ---------------- Capture ----------------

const OUTER = 84;
const INNER = 72;
const RING_R = (OUTER - 2) / 2; // stroke width 2
const RING_C = 2 * Math.PI * RING_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CaptureButton({
  onPress,
  analyzing,
}: {
  onPress: () => void;
  analyzing: boolean;
}) {
  const innerScale = useSharedValue(1);
  const analyzeProgress = useSharedValue(0);

  useEffect(() => {
    if (analyzing) {
      analyzeProgress.value = 0;
      analyzeProgress.value = withTiming(1, {
        duration: 2000,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      cancelAnimation(analyzeProgress);
      analyzeProgress.value = 0;
    }
  }, [analyzing, analyzeProgress]);

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - analyzeProgress.value),
  }));

  const handlePress = () => {
    innerScale.value = withSpring(0.92, spring.default, () => {
      innerScale.value = withSpring(1, spring.default);
    });
    hapt.medium();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Capture"
      onPress={handlePress}
      style={styles.captureWrap}
      hitSlop={8}
      disabled={analyzing}
    >
      <Svg width={OUTER} height={OUTER} style={StyleSheet.absoluteFillObject}>
        {/* Resting ring — 2pt terracotta border */}
        <Circle
          cx={OUTER / 2}
          cy={OUTER / 2}
          r={RING_R}
          stroke={palette.clay}
          strokeWidth={2}
          fill="transparent"
          opacity={analyzing ? 0 : 1}
        />
        {/* During analysis — animated stroke draws 360° over 2s */}
        {analyzing ? (
          <AnimatedCircle
            cx={OUTER / 2}
            cy={OUTER / 2}
            r={RING_R}
            stroke={palette.clay}
            strokeWidth={2}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${RING_C} ${RING_C}`}
            animatedProps={arcProps}
            transform={`rotate(-90 ${OUTER / 2} ${OUTER / 2})`}
          />
        ) : null}
      </Svg>

      <Animated.View style={[styles.inner, innerStyle]} />
    </Pressable>
  );
}

// ---------------- Scanning indicator (v10.32 barcode mode) ----------------

/**
 * Replaces the manual shutter when the camera is auto-firing. Reads
 * "Scanning…" with a slow pulse on the dot — clearly NOT a button,
 * which is what barcode mode wants. Same OUTER footprint as the
 * shutter so the dock alignment doesn't shift between modes.
 */
function ScanningIndicator({ label }: { label: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + 0.45 * pulse.value,
  }));
  return (
    <View style={styles.scanningWrap}>
      <View style={styles.scanningChip}>
        <Animated.View style={[styles.scanningDot, dotStyle]} />
        <Text style={styles.scanningLabel} maxFontSizeMultiplier={1.1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

// ---------------- Gallery ----------------

function GalleryButton({ onPick }: { onPick: (uri: string) => void }) {
  const handle = async () => {
    hapt.select();
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.85,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        onPick(res.assets[0].uri);
      }
    } catch {
      // swallow — no toast chrome on camera overlay
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pick from gallery"
      onPress={handle}
      style={({ pressed }) => [styles.sideBtn, pressed && styles.sideBtnPressed]}
      hitSlop={8}
    >
      <ImageIcon
        size={18}
        color="rgba(248,250,252,0.85)"
        weight="duotone"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  // v10 — frosted-ink chips. Matches the top-bar close / help treatment in
  // ScanOverlay so the entire camera chrome is one material: cool ink @ 45%
  // with a 1pt white hairline. Warm sand has been fully retired from the
  // camera surface.
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11,18,32,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  onDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.amber,
  },
  autoLabel: {
    position: 'absolute',
    bottom: 4,
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.8,
    color: 'rgba(248,250,252,0.85)',
  },
  captureWrap: {
    width: OUTER,
    height: OUTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    backgroundColor: palette.bg,
  },
  // v10.32 — barcode-mode auto-scanning indicator
  scanningWrap: {
    width: OUTER,
    height: OUTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: 'rgba(11,18,32,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.clay,
  },
  scanningLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
    color: 'rgba(248,250,252,0.92)',
  },
});
