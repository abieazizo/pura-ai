import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  X,
  Sun,
  HandPointing,
  CameraSlash,
  Scan,
  Lock,
  ClockClockwise,
  Record,
  Timer,
  Sparkle,
  PencilSimple,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { DeviceFrame } from '@/components/scan/DeviceFrame';
import { TutorialTextBlock, type TutorialBullet } from '@/components/scan/TutorialTextBlock';
import { PuraMark } from '@/components/PuraMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapt } from '@/utils/haptics';
import { palette, space } from '@/theme';

export interface ScanTutorialProps {
  /** Called when user presses "Start scanning." on page 4. */
  onComplete: () => void;
  /** Called when user taps × or swipes down. Does NOT mark tutorial seen. */
  onDismiss: () => void;
}

const PAGE_COUNT = 4;

type PageIndex = 0 | 1 | 2 | 3;

/**
 * First-run scan tutorial (§3). Four horizontally paged slides. Own dots,
 * own Next button, own × exit. Pages 2 and 4 render real React animations
 * inside a DeviceFrame. Page 3 is meant to play a looping video of the scan
 * in progress; if the asset is missing the placeholder is a pulsing capture
 * ring over a warm scrim — clearly called out in the delivery message.
 */
export function ScanTutorial({ onComplete, onDismiss }: ScanTutorialProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<PageIndex>>(null);
  const [page, setPage] = useState<PageIndex>(0);

  const pages: PageIndex[] = [0, 1, 2, 3];

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width) as PageIndex;
    if (next !== page) {
      setPage(next);
      hapt.select();
    }
  };

  const next = () => {
    if (page === 3) {
      hapt.success();
      onComplete();
      return;
    }
    const target = (page + 1) as PageIndex;
    listRef.current?.scrollToIndex({ index: target, animated: true });
  };

  const renderItem = ({ item }: { item: PageIndex }) => (
    <View style={{ width }}>
      <TutorialPage index={item} width={width} />
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top-right × — dismisses WITHOUT setting the seen flag (§3.1). */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              hapt.select();
              onDismiss();
            }}
            accessibilityRole="button"
            accessibilityLabel="Close tutorial"
            hitSlop={10}
            style={styles.closeBtn}
          >
            <X size={20} color={palette.ink} weight="regular" />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={pages}
          keyExtractor={(p) => `tut-${p}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          renderItem={renderItem}
          style={styles.pager}
        />

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(40, insets.bottom + 16) },
          ]}
        >
          <Dots page={page} />
          <View style={{ height: 20 }} />
          <PrimaryButton
            label={page === 3 ? 'Start scanning.' : 'Next'}
            onPress={next}
            serif={page === 3}
            tone="accent"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

// ---------- Pages ----------

function TutorialPage({ index, width }: { index: PageIndex; width: number }) {
  const body = PAGE_BODIES[index];
  return (
    <View style={styles.page}>
      <View style={styles.stage}>
        {index === 0 ? <StageLighting width={width} /> : null}
        {index === 1 ? <StageFourZones /> : null}
        {index === 2 ? <StageVideoPlaceholder /> : null}
        {index === 3 ? <StageTapToAdjust /> : null}
      </View>
      <TutorialTextBlock
        headline={body.headline}
        subhead={body.subhead}
        bullets={body.bullets}
      />
    </View>
  );
}

// ---------- Page bodies ----------

const PAGE_BODIES: Array<{
  headline: string;
  subhead: string;
  bullets: TutorialBullet[];
}> = [
  {
    headline: 'Good light. Clean lens. Thirty seconds.',
    subhead: 'The better the scan, the better I can read you.',
    bullets: [
      { Icon: Sun as React.FC<PhosphorIconProps>, label: 'Soft, natural light' },
      { Icon: HandPointing as React.FC<PhosphorIconProps>, label: 'Steady hand for thirty seconds' },
      { Icon: CameraSlash as React.FC<PhosphorIconProps>, label: "Wipe the lens if it's smudged" },
    ],
  },
  {
    headline: 'I read four zones.',
    subhead: 'Chin, T-zone, forehead, cheeks — each scored and tracked.',
    bullets: [
      { Icon: Scan as React.FC<PhosphorIconProps>, label: 'Zones are identified' },
      { Icon: Lock as React.FC<PhosphorIconProps>, label: 'Everything stays on your device' },
      { Icon: ClockClockwise as React.FC<PhosphorIconProps>, label: 'Results in under a minute' },
    ],
  },
  {
    headline: "Here's how it works.",
    subhead: "Tap the ring. Hold still. I'll handle the rest.",
    bullets: [
      { Icon: Record as React.FC<PhosphorIconProps>, label: 'Tap the ring to capture' },
      { Icon: Timer as React.FC<PhosphorIconProps>, label: 'Hold for thirty seconds' },
      { Icon: Sparkle as React.FC<PhosphorIconProps>, label: 'I score each zone in seconds' },
    ],
  },
  {
    headline: 'Adjust if I miss.',
    subhead: 'Tap any zone to refine. I learn from your edits.',
    bullets: [
      { Icon: HandPointing as React.FC<PhosphorIconProps>, label: 'Tap a zone to review' },
      { Icon: PencilSimple as React.FC<PhosphorIconProps>, label: 'Edit if I got it wrong' },
      { Icon: Sparkle as React.FC<PhosphorIconProps>, label: 'The next scan gets sharper' },
    ],
  },
];

// ---------- MediaStages ----------

/**
 * Page 1 — lighting stage. Asset `assets/images/tutorial-lighting.jpg`
 * isn't shipped; the placeholder is a warm sand panel with the Mark
 * centered at 80pt, per §3.3.
 */
function StageLighting({ width }: { width: number }) {
  return (
    <View style={[styles.lighting, { width: Math.min(320, width - 48) }]}>
      <PuraMark variant="idle" size="lg" glow />
    </View>
  );
}

/**
 * Page 2 — four-zone animation inside a DeviceFrame. Zone labels pulse in
 * sequence (opacity 0→1→0.7→1, scale 0.96→1), one per 800ms.
 */
function StageFourZones() {
  return (
    <DeviceFrame>
      <View style={deviceStyles.photoStage}>
        {/* Ambient "face area" — warm neutral panel, no actual photo. */}
        <View style={deviceStyles.facePanel} />
        {/* Four pulsing zone labels anchored around the face panel. */}
        <ZonePulse label="FOREHEAD" top="14%" left="34%" delay={0} />
        <ZonePulse label="T-ZONE" top="34%" left="38%" delay={800} />
        <ZonePulse label="CHIN" top="76%" left="40%" delay={1600} />
        <ZonePulse label="CHEEKS" top="48%" left="14%" delay={2400} />
      </View>
    </DeviceFrame>
  );
}

function ZonePulse({
  label,
  top,
  left,
  delay,
}: {
  label: string;
  top: string;
  left: string;
  delay: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay }),
        withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
        withTiming(0.7, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 3200 - delay })
      ),
      -1,
      false
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.96 + 0.04 * progress.value }],
  }));

  return (
    <Animated.View
      style={[
        zoneStyles.chip,
        { top: top as any, left: left as any },
        style,
      ]}
    >
      <Text style={zoneStyles.chipText}>{label}</Text>
    </Animated.View>
  );
}

/**
 * Page 3 — video placeholder. Real asset is `assets/videos/scan-demo.mp4`
 * (not shipped). Until the asset exists we render a pulsing capture-ring
 * demo inside a DeviceFrame — enough to teach the interaction without
 * pretending to play a video.
 */
function StageVideoPlaceholder() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + 0.08 * pulse.value }],
    opacity: 0.4 + 0.4 * pulse.value,
  }));

  return (
    <DeviceFrame>
      <View style={deviceStyles.videoBg}>
        <View style={deviceStyles.videoFacePanel} />
        <Animated.View
          style={[
            deviceStyles.captureRing,
            { borderColor: palette.clay },
            ringStyle,
          ]}
        />
        <View style={deviceStyles.captureInner} />
      </View>
    </DeviceFrame>
  );
}

/**
 * Page 4 — tap-to-adjust loop. A finger glyph slides to a zone row, the row
 * expands, collapses, and the finger retracts. 4-second loop.
 */
function StageTapToAdjust() {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400 }),
        withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }), // finger arrives
        withTiming(2, { duration: 600, easing: Easing.out(Easing.cubic) }), // row expands
        withTiming(3, { duration: 1400 }), // hold expanded
        withTiming(4, { duration: 500, easing: Easing.inOut(Easing.ease) }), // collapse
        withTiming(5, { duration: 500 }) // finger leaves
      ),
      -1,
      false
    );
    return () => cancelAnimation(phase);
  }, [phase]);

  const fingerStyle = useAnimatedStyle(() => {
    // Clamp movement between 0 and 1 ("arrived") and back to 0.
    const arrived = Math.min(1, Math.max(0, phase.value));
    const leaving = phase.value >= 4 ? Math.min(1, phase.value - 4) : 0;
    const visible = arrived - leaving;
    return {
      opacity: Math.max(0, Math.min(1, visible)),
      transform: [
        { translateX: (1 - arrived) * 120 + leaving * 60 },
        { translateY: (1 - arrived) * 40 + leaving * 20 },
      ],
    };
  });

  const expandStyle = useAnimatedStyle(() => {
    const expanded =
      phase.value < 2
        ? 0
        : phase.value < 4
        ? Math.min(1, phase.value - 2)
        : Math.max(0, 1 - (phase.value - 3));
    return {
      height: 60 + expanded * 120,
      opacity: 1,
    };
  });

  return (
    <DeviceFrame>
      <View style={deviceStyles.tapBg}>
        <Animated.View style={[deviceStyles.zoneRow, expandStyle]}>
          <Text style={deviceStyles.zoneRowLabel}>CHIN</Text>
          <View style={deviceStyles.zoneRowBody}>
            <Text style={deviceStyles.zoneRowText} numberOfLines={3}>
              A little more oily than yesterday. Keep the BHA steady.
            </Text>
          </View>
        </Animated.View>
        <Animated.View style={[deviceStyles.fingerWrap, fingerStyle]}>
          <View style={deviceStyles.fingerTip} />
        </Animated.View>
      </View>
    </DeviceFrame>
  );
}

// ---------- Dots ----------

function Dots({ page }: { page: PageIndex }) {
  return (
    <View style={dotsStyles.row}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            dotsStyles.dot,
            i === page ? dotsStyles.dotActive : dotsStyles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: { flex: 1 },
  page: {
    flex: 1,
  },
  stage: {
    flex: 0.55,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  footer: {
    paddingHorizontal: 20,
  },
  lighting: {
    aspectRatio: 1,
    backgroundColor: palette.sandPaper,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const deviceStyles = StyleSheet.create({
  photoStage: {
    flex: 1,
    backgroundColor: palette.clayPaper,
    position: 'relative',
  },
  facePanel: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    width: '56%',
    height: '64%',
    borderRadius: 100,
    backgroundColor: palette.sandPaper,
    opacity: 0.7,
  },
  videoBg: {
    flex: 1,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoFacePanel: {
    position: 'absolute',
    top: '20%',
    width: '60%',
    height: '55%',
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(250,247,244,0.5)',
    backgroundColor: 'rgba(250,247,244,0.05)',
  },
  captureRing: {
    position: 'absolute',
    bottom: '12%',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  captureInner: {
    position: 'absolute',
    bottom: '12%',
    marginBottom: 12,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: palette.bg,
  },
  tapBg: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  zoneRow: {
    backgroundColor: palette.sandPaper,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  zoneRowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.32,
    color: palette.clay,
  },
  zoneRowBody: { marginTop: 12 },
  zoneRowText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: palette.ink,
  },
  fingerWrap: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    width: 40,
    height: 56,
    alignItems: 'center',
  },
  fingerTip: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: palette.clay,
    backgroundColor: palette.bg,
  },
});

const zoneStyles = StyleSheet.create({
  chip: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: palette.ink,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.bg,
  },
});

const dotsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: { backgroundColor: palette.clay },
  dotInactive: { backgroundColor: 'rgba(198,93,72,0.2)' },
});
