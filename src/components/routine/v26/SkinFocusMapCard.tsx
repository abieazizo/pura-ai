import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Eye, EyeSlash, ImageSquare, X } from 'phosphor-react-native';
import {
  Body,
  Eyebrow,
  SectionHeading,
  Supporting,
  Surface,
} from './primitives';
import { QuietTextButton } from './QuietTextButton';
import { hapt } from '@/utils/haptics';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';

interface SkinFocusMapCardProps {
  scanImageUri?: string;
  spotsDetected?: number;
  comparisonAvailable: boolean;
  /** "Mild redness remains around your chin." */
  body?: string;
  onViewFullMap?: () => void;
}

/**
 * v26 — Skin Focus Map.
 *
 * Honest replacement for the v25 abstract face graphic. If we have a
 * real scan image, it renders in a softened privacy-friendly frame
 * with a single restrained chin focus marker. If we don't, it shows
 * an explicit "Scan preview unavailable" state — never a fake face.
 */
export function SkinFocusMapCard({
  scanImageUri,
  spotsDetected,
  comparisonAvailable,
  body,
  onViewFullMap,
}: SkinFocusMapCardProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    hapt.tap();
    setOpen(true);
    onViewFullMap?.();
  };

  return (
    <Surface tone="surface" style={s.card}>
      <Eyebrow>TODAY’S FOCUS</Eyebrow>
      <SectionHeading style={s.headline}>Chin area</SectionHeading>

      <View style={s.frameWrap}>
        <ScanFrame uri={scanImageUri} privacy={!scanImageUri} />
      </View>

      <View style={s.findings}>
        <Text style={s.finding} maxFontSizeMultiplier={1.2}>
          {typeof spotsDetected === 'number'
            ? `${spotsDetected} active spot${spotsDetected === 1 ? '' : 's'} detected`
            : 'Mild activity detected'}
        </Text>
        <Body style={s.body}>
          {body ?? 'Mild redness remains around your chin.'}
        </Body>
      </View>

      <QuietTextButton
        label="View full skin map"
        tone="clay"
        onPress={handleOpen}
        style={{ marginTop: 6 }}
      />

      <SkinMapDetailSheet
        visible={open}
        onClose={() => setOpen(false)}
        scanImageUri={scanImageUri}
        comparisonAvailable={comparisonAvailable}
        spotsDetected={spotsDetected}
      />
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// ScanFrame — actual scan with focus ring OR honest "unavailable" state
// ---------------------------------------------------------------------------

function ScanFrame({ uri, privacy }: { uri?: string; privacy?: boolean }) {
  if (!uri) {
    return (
      <View style={frame.unavailable}>
        <View style={frame.iconRing}>
          <ImageSquare size={20} color={V26.inkMuted} weight="duotone" />
        </View>
        <Text style={frame.unavailableTitle} maxFontSizeMultiplier={1.2}>
          Scan preview unavailable
        </Text>
        <Text style={frame.unavailableBody} maxFontSizeMultiplier={1.2}>
          Complete your next scan to view your skin map.
        </Text>
      </View>
    );
  }
  const source: ImageSourcePropType = { uri };
  return (
    <View style={frame.image}>
      <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {/* Soft warm overlay for privacy without losing detail */}
      <View style={frame.softOverlay} />
      {/* Chin focus marker */}
      <View pointerEvents="none" style={frame.markerWrap}>
        <Svg width={62} height={62}>
          <Defs>
            <RadialGradient id="bigClay" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={V26.terracotta} stopOpacity={0.32} />
              <Stop offset="65%" stopColor={V26.terracotta} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={V26.terracotta} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={31} cy={31} r={31} fill="url(#bigClay)" />
          <Circle
            cx={31}
            cy={31}
            r={22}
            stroke={V26.terracotta}
            strokeWidth={1.25}
            fill="none"
          />
        </Svg>
      </View>
      <View style={frame.label}>
        <Text style={frame.labelText} maxFontSizeMultiplier={1.15}>
          Mild activity
        </Text>
      </View>
      {/* privacy field is reserved for future blur toggle wiring */}
      {privacy ? null : null}
    </View>
  );
}

const frame = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: V26_RADIUS.card,
    overflow: 'hidden',
    backgroundColor: V26.warmScan,
    borderWidth: 1,
    borderColor: V26.border,
  },
  softOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 243, 240, 0.28)',
  },
  markerWrap: {
    position: 'absolute',
    left: '50%',
    bottom: '12%',
    marginLeft: -31,
  },
  label: {
    position: 'absolute',
    left: '50%',
    bottom: '4%',
    marginLeft: -52,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: V26_RADIUS.pill,
    backgroundColor: 'rgba(23, 21, 20, 0.72)',
  },
  labelText: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11.5,
    color: '#FFFFFF',
    letterSpacing: 0.4,
    width: 84,
    textAlign: 'center',
  },
  unavailable: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: V26_RADIUS.card,
    backgroundColor: V26.paper,
    borderWidth: 1,
    borderColor: V26.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 8,
  },
  iconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  unavailableTitle: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 15,
    color: V26.ink,
    textAlign: 'center',
  },
  unavailableBody: {
    fontFamily: V26_TYPE.sans,
    fontSize: 13,
    color: V26.inkMuted,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// SkinMapDetailSheet — full modal with photo/map toggle + region detail
// ---------------------------------------------------------------------------

interface SkinMapDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  scanImageUri?: string;
  comparisonAvailable: boolean;
  spotsDetected?: number;
}

function SkinMapDetailSheet({
  visible,
  onClose,
  scanImageUri,
  comparisonAvailable,
  spotsDetected,
}: SkinMapDetailSheetProps) {
  const [mode, setMode] = useState<'photo' | 'map'>('map');
  const [hidePhoto, setHidePhoto] = useState(false);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="formSheet"
    >
      <View style={sheet.root}>
        <View style={sheet.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close skin map"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [sheet.close, pressed && { opacity: 0.6 }]}
          >
            <X size={18} color={V26.ink} />
          </Pressable>
          <View style={sheet.titleWrap}>
            <Eyebrow>SKIN MAP</Eyebrow>
            <Text style={sheet.title} maxFontSizeMultiplier={1.2}>
              Today’s scan · Tonight
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={sheet.body} showsVerticalScrollIndicator={false}>
          <View style={sheet.modeRow}>
            <ModeChip
              label="Photo"
              selected={mode === 'photo'}
              onPress={() => setMode('photo')}
            />
            <ModeChip
              label="Skin map"
              selected={mode === 'map'}
              onPress={() => setMode('map')}
            />
            <View style={{ flex: 1 }} />
            {scanImageUri ? (
              <Pressable
                onPress={() => setHidePhoto((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={hidePhoto ? 'Show photo' : 'Hide photo'}
                style={sheet.privacyChip}
              >
                {hidePhoto ? (
                  <EyeSlash size={14} color={V26.inkSecondary} />
                ) : (
                  <Eye size={14} color={V26.inkSecondary} />
                )}
                <Text style={sheet.privacyChipLabel}>
                  {hidePhoto ? 'Show photo' : 'Hide photo'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={sheet.imageWrap}>
            <ScanFrame
              uri={hidePhoto ? undefined : scanImageUri}
              privacy={hidePhoto}
            />
          </View>

          <View style={sheet.region}>
            <Eyebrow style={{ color: V26.terracottaText }}>SELECTED REGION</Eyebrow>
            <Text style={sheet.regionTitle} maxFontSizeMultiplier={1.2}>
              Chin
            </Text>
            <Body style={{ marginTop: 6 }}>
              {typeof spotsDetected === 'number'
                ? `${spotsDetected} active spot${spotsDetected === 1 ? '' : 's'} detected.`
                : 'Mild activity detected.'}
              {' '}
              Routine kept gentle tonight.
            </Body>
          </View>

          <View style={sheet.insights}>
            <InsightRow label="Hydration" status="May be improving" detail="Needs more scans to confirm." tone="positive" />
            <InsightRow label="Dark marks" status="Still measuring" detail="Comparison unlocks soon." />
          </View>

          <View style={sheet.compareWrap}>
            <Supporting style={sheet.compareLabel}>
              {comparisonAvailable
                ? 'Compare baseline vs today'
                : 'Compare after baseline unlocks'}
            </Supporting>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ModeChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        hapt.select();
        onPress();
      }}
      style={[chip.base, selected && chip.baseOn]}
    >
      <Text
        style={[chip.label, selected && chip.labelOn]}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function InsightRow({
  label,
  status,
  detail,
  tone,
}: {
  label: string;
  status: string;
  detail: string;
  tone?: 'positive';
}) {
  return (
    <View style={sheet.insightRow}>
      <Text style={sheet.insightLabel} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <Text
        style={[
          sheet.insightStatus,
          tone === 'positive' && { color: V26.positive },
        ]}
        maxFontSizeMultiplier={1.2}
      >
        {status}
      </Text>
      <Supporting style={sheet.insightDetail}>{detail}</Supporting>
    </View>
  );
}

const chip = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: V26_RADIUS.pill,
    borderWidth: 1,
    borderColor: V26.borderStrong,
    marginRight: 8,
  },
  baseOn: {
    backgroundColor: V26.ink,
    borderColor: V26.ink,
  },
  label: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13,
    color: V26.ink,
  },
  labelOn: {
    color: '#FFFFFF',
  },
});

const sheet = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: V26.paper,
  },
  header: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14,
    color: V26.ink,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingBottom: 36,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  privacyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: V26_RADIUS.pill,
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.border,
  },
  privacyChipLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 12,
    color: V26.inkSecondary,
  },
  imageWrap: {
    width: '100%',
  },
  region: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: V26.border,
  },
  regionTitle: {
    fontFamily: V26_TYPE.serif,
    fontSize: 26,
    lineHeight: 30,
    color: V26.ink,
    marginTop: 8,
  },
  insights: {
    marginTop: 18,
    gap: 14,
  },
  insightRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: V26_RADIUS.inset,
    borderWidth: 1,
    borderColor: V26.border,
    backgroundColor: V26.surface,
  },
  insightLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14.5,
    color: V26.ink,
  },
  insightStatus: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 12.5,
    color: V26.inkMuted,
    marginTop: 4,
  },
  insightDetail: {
    marginTop: 4,
  },
  compareWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  compareLabel: {
    color: V26.inkMuted,
  },
});

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  headline: {
    marginTop: 8,
    fontSize: 22,
    lineHeight: 26,
  },
  frameWrap: {
    marginTop: 18,
    width: '100%',
  },
  findings: {
    marginTop: 18,
  },
  finding: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 15,
    color: V26.ink,
    letterSpacing: -0.05,
  },
  body: {
    marginTop: 8,
  },
});
