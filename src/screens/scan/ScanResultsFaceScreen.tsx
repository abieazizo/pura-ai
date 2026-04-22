import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X } from 'phosphor-react-native';
import Animated, {
  Easing as RnEasing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const AnimatedView = Animated.View;
const motionEasing = {
  decelerate: RnEasing.bezier(0, 0, 0.2, 1),
  backEaseOut: RnEasing.bezier(0.22, 1, 0.36, 1),
};

/**
 * §4.3 — photo reveal. Scale 1.05 → 1.0 + opacity 0 → 1 over 600ms easeOutCubic.
 * Wraps any photo element that needs to settle into place on mount.
 */
function PhotoReveal({ children }: { children: React.ReactNode }) {
  const scale = useSharedValue(1.05);
  const opacity = useSharedValue(0);
  React.useEffect(() => {
    scale.value = withTiming(1, {
      duration: 600,
      easing: motionEasing.backEaseOut,
    });
    opacity.value = withTiming(1, { duration: 600, easing: motionEasing.decelerate });
  }, [scale, opacity]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return <AnimatedView style={aStyle}>{children}</AnimatedView>;
}
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { PillBadge } from '@/components/PillBadge';
import { EditorialRule } from '@/components/EditorialRule';
import { ScreenChrome } from '@/components/ScreenChrome';
import { AIChip } from '@/components/AIChip';
import { ZoneGlowOverlay } from '@/components/ZoneGlowOverlay';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { colors, palette, space, type as typography } from '@/theme';
import { common, scan, zoneStatusLabel, zoneTrendLabel } from '@/copy/strings';
import type { RootStackParamList } from '@/navigation/types';
import type { SkinZone } from '@/types';

export interface ScanResultsFaceScreenProps {
  scanId: string;
}

/**
 * Editorial face-scan results. No card containers — zones render as raw rows
 * with small clay divider lines between them. Photo is full-bleed horizontally.
 * Hero "Here's what *I see*." with italic emphasis on "I see."
 */
export function ScanResultsFaceScreen({ scanId }: ScanResultsFaceScreenProps) {
  const scans = useAppStore((s) => s.scans);
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const scanRecord = scans.find((s) => s.id === scanId) ?? scans[scans.length - 1];
  const [photoSize, setPhotoSize] = useState({ w: 0, h: 0 });

  if (!scanRecord) return null;

  const photoHeight = Math.round(width * 1.25);
  const glows = scanRecord.zones.flatMap((z) => z.glow ?? []);

  const close = () => rootNav.goBack();
  const compare = () => rootNav.goBack();

  const canCompare = scans.length >= 2;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* §2.5 — Mark stays top-left; the AI chip + X close button share
            the top-right cluster, rendered as a row so they never stack or
            collide. */}
        <ScreenChrome
          markVariant="complete"
          onMarkPress={close}
          chip="none"
        />

        <View style={styles.topRight}>
          <AIChip />
          <Pressable
            onPress={close}
            hitSlop={10}
            accessibilityLabel={common.close}
            style={[styles.closeBtn, { marginLeft: 8 }]}
          >
            <X size={20} color={palette.ink} weight="regular" />
          </Pressable>
        </View>

        <View style={styles.header}>
          {/* §2.2 — pill's left origin shifted past the Mark + 12pt clearance.
              Mark is 28pt at left:20, so first readable column sits at 60pt
              from the screen edge (scroll has 24pt pad → extra 36pt here). */}
          <View style={styles.pillRow}>
            <PillBadge
              label={`SCAN \u00b7 DAY ${scanRecord.dayNumber}`}
              tone="dark"
            />
          </View>
          <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
            {`Here's what `}
            <Text style={styles.headlineItalic}>{`I see`}</Text>.
          </Text>
        </View>

        {/* §3.1 — photo left 58%, annotations right 42%. Leader lines
            terminate at the photo edge, NEVER on the face. No labels
            painted onto the selfie. */}
        <FaceAnnotations
          photoUri={scanRecord.photoUri}
          zones={scanRecord.zones}
          totalWidth={width - space.lg * 2}
          onPhotoLayout={(e) =>
            setPhotoSize({
              w: e.nativeEvent.layout.width,
              h: e.nativeEvent.layout.height,
            })
          }
          glows={glows}
          photoSize={photoSize}
        />

        <View style={styles.zonesBlock}>
          <EditorialRule label="ZONES" />
          {scanRecord.zones.map((zone, i) => (
            <React.Fragment key={zone.key}>
              <ZoneRow zone={zone} />
              {i < scanRecord.zones.length - 1 ? (
                <View style={styles.rowDivider} />
              ) : null}
            </React.Fragment>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
        {/* §2.6 — editorial link row, not a giant serif button. Full-width
            56pt tap target; left-aligned 22pt serif; terracotta arrow;
            hairline divider above. */}
        <Pressable
          onPress={compare}
          disabled={!canCompare}
          accessibilityRole="button"
          accessibilityLabel={
            canCompare ? scan.resultsFaceCompare : 'Scan again tomorrow to compare'
          }
          style={({ pressed }) => [
            styles.compareRow,
            !canCompare && { opacity: 0.4 },
            pressed && canCompare && { backgroundColor: palette.bgDeep },
          ]}
        >
          <Text style={styles.compareLabel} maxFontSizeMultiplier={1.15}>
            {canCompare ? scan.resultsFaceCompare : 'Scan again tomorrow to compare'}
          </Text>
          {canCompare ? (
            <CompareArrow />
          ) : null}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

/**
 * §3.1 — editorial face annotations. Photo occupies 58% width, annotations
 * flow down the right 42% as typographic labels. Each label anchors a
 * horizontal leader line terminating at the photo edge (never on the face).
 * No pill chrome. Labels are Inter micro uppercase tracked +120, terracotta.
 *
 * Motion: photo scales 1.05 → 1.0 over 600ms easeOutCubic (handled via
 * `<PhotoReveal>`). Leader lines fade in with 80ms stagger after photo
 * settles (handled inline here).
 */
function FaceAnnotations({
  photoUri,
  zones,
  totalWidth,
  onPhotoLayout,
  glows,
  photoSize,
}: {
  photoUri: string;
  zones: SkinZone[];
  totalWidth: number;
  onPhotoLayout: (e: any) => void;
  glows: { x: number; y: number; radius: number; intensity: number }[];
  photoSize: { w: number; h: number };
}) {
  const photoWidth = Math.round(totalWidth * 0.58);
  const photoHeight = Math.round(photoWidth * 1.25);
  const rightWidth = totalWidth - photoWidth - 8;

  return (
    <View style={annot.row}>
      <PhotoReveal>
        <View
          style={[annot.photo, { width: photoWidth, height: photoHeight }]}
          onLayout={onPhotoLayout}
        >
          <Image
            source={photoUri}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          {photoSize.w > 0 ? (
            <ZoneGlowOverlay
              glows={glows}
              width={photoSize.w}
              height={photoSize.h}
            />
          ) : null}
        </View>
      </PhotoReveal>

      <View style={[annot.rightCol, { width: rightWidth }]}>
        {zones.map((z, i) => (
          <AnnotationRow key={z.key} zone={z} delay={i * 80 + 600} />
        ))}
      </View>
    </View>
  );
}

function AnnotationRow({ zone, delay }: { zone: SkinZone; delay: number }) {
  const opacity = useSharedValue(0);
  React.useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 240, easing: motionEasing.decelerate })
    );
  }, [delay, opacity]);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <AnimatedView style={[annot.row2, aStyle]}>
      <View style={annot.leader} />
      <View style={annot.labelCol}>
        <Text style={annot.label}>{zone.label.toUpperCase()}</Text>
      </View>
    </AnimatedView>
  );
}

function ZoneRow({ zone }: { zone: SkinZone }) {
  const tone =
    zone.status === 'active' ? 'active' : zone.status === 'monitor' ? 'monitor' : 'calm';
  const trendColor =
    zone.trend === 'improving'
      ? palette.moss
      : zone.trend === 'worsening'
      ? palette.amber
      : palette.inkTertiary;
  const trendArrow =
    zone.trend === 'improving' ? '↑' : zone.trend === 'worsening' ? '↓' : '→';

  return (
    <View style={styles.zoneRow}>
      <View style={styles.zoneHead}>
        <Text style={styles.zoneLabel}>{zone.label.toUpperCase()}</Text>
        <PillBadge label={zoneStatusLabel[zone.status]} tone={tone} size="sm" />
      </View>
      <Text style={styles.zoneInsight}>{zone.shortInsight}</Text>
      <View style={styles.zoneMeta}>
        <Text style={styles.zoneScore}>Score {zone.score}</Text>
        <Text style={[styles.zoneTrend, { color: trendColor }]}>
          {`${trendArrow}  ${zoneTrendLabel[zone.trend]}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingTop: 64,
    paddingHorizontal: space.lg,
  },

  topRight: {
    position: 'absolute',
    top: 44,
    right: space.lg,
    zIndex: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    marginBottom: space.lg,
  },
  pillRow: {
    // §2.2 — the pill starts 36pt right of the scroll's own 24pt padding,
    // giving 60pt from the screen edge = past the Mark + 12pt clearance.
    marginLeft: 36,
  },
  headline: {
    ...typography.heroSerif,
    color: palette.ink,
    marginTop: space.md,
  },
  headlineItalic: {
    fontFamily: 'InstrumentSerif-Italic',
  },

  // §3.1 replaced photoWrap + zoneFloatLabel with `annot.*` styles below.
  photoWrap: {
    backgroundColor: palette.bgDeep,
    marginTop: space.md,
    marginBottom: space.xl,
  },

  zonesBlock: {},
  zoneRow: {
    paddingVertical: space.md,
  },
  zoneHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  zoneLabel: {
    ...typography.micro,
    color: palette.ink,
    letterSpacing: 2,
  },
  zoneInsight: {
    ...typography.body,
    color: palette.ink,
  },
  zoneMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  zoneScore: { ...typography.caption, color: palette.inkTertiary },
  zoneTrend: { ...typography.captionMed, fontWeight: '600' },
  rowDivider: {
    width: 48,
    height: 1,
    backgroundColor: palette.hairline,
    marginLeft: 0,
  },

  footerSafe: {
    backgroundColor: colors.bg,
    // §2.6 — the hairline now lives on the row itself (tinted clay at 20%)
    // rather than a neutral border.
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(198,93,72,0.2)',
  },
  compareLabel: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 24,
    color: palette.ink,
  },
});

// §3.1 — FaceAnnotations styles
const annot = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: space.md,
    marginBottom: space.xl,
  },
  photo: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
  },
  rightCol: {
    marginLeft: 8,
    paddingTop: space.sm,
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  leader: {
    width: 20,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.clay,
    marginRight: space.sm,
    opacity: 0.5,
  },
  labelCol: {
    flex: 1,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    lineHeight: 12,
    color: palette.clay,
    textTransform: 'uppercase',
  },
});

function CompareArrow() {
  return (
    <View
      style={{
        width: 20,
        height: 2,
        backgroundColor: palette.clay,
        position: 'relative',
      }}
    >
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: -3,
          width: 8,
          height: 2,
          backgroundColor: palette.clay,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 3,
          width: 8,
          height: 2,
          backgroundColor: palette.clay,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}
