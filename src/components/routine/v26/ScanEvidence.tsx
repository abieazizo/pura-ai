import React from 'react';
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
import { X } from 'phosphor-react-native';
import {
  Body,
  Eyebrow,
  SectionHeading,
  SecondaryAction,
  Supporting,
  Surface,
} from './primitives';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';
import { hapt } from '@/utils/haptics';
import type { ScanEvidence as ScanEvidenceData } from '@/state/v26/routineSession';

interface ScanEvidenceModuleProps {
  evidence: ScanEvidenceData;
  /** When false (default), shows the focused single-region view. */
  comparisonUnlockMessage?: string;
  onViewSkinMap?: () => void;
}

/**
 * v26 — Scan Evidence module.
 *
 * The Progress experience must visually prove the scan saw something
 * before describing it. This component renders a tasteful framed crop
 * of the latest scan with ONE restrained focus region. Comparison is
 * hidden behind a clear unlock condition.
 */
export function ScanEvidenceModule({
  evidence,
  comparisonUnlockMessage,
  onViewSkinMap,
}: ScanEvidenceModuleProps) {
  const [mapOpen, setMapOpen] = React.useState(false);

  const handleOpenMap = () => {
    hapt.tap();
    setMapOpen(true);
    onViewSkinMap?.();
  };

  return (
    <Surface tone="surface" style={s.card}>
      <Eyebrow style={s.eyebrow}>TODAY’S FOCUS</Eyebrow>
      <SectionHeading style={s.headline}>Chin breakouts</SectionHeading>

      <View style={s.imageWrap}>
        <FaceFrame
          imageUri={evidence.latestImageUri}
          annotation={evidence.annotation}
        />
      </View>

      <Body style={s.observation}>{evidence.observation}</Body>
      {evidence.secondaryObservation ? (
        <Supporting style={s.secondary}>
          {evidence.secondaryObservation}
        </Supporting>
      ) : null}

      <View style={s.actions}>
        <SecondaryAction
          label="View skin map"
          tone="terracotta"
          onPress={handleOpenMap}
        />
        {evidence.comparisonAvailable ? (
          <SecondaryAction
            label="Compare scans"
            tone="muted"
            onPress={handleOpenMap}
          />
        ) : (
          <Supporting style={s.compareUnlock}>
            {comparisonUnlockMessage ?? 'Comparison unlocks after 2 more scans'}
          </Supporting>
        )}
      </View>

      <ScanMapSheet
        visible={mapOpen}
        evidence={evidence}
        onClose={() => setMapOpen(false)}
      />
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// Framed face placeholder
// ---------------------------------------------------------------------------

function FaceFrame({
  imageUri,
  annotation,
}: {
  imageUri?: string;
  annotation?: { x: number; y: number; width: number; height: number };
}) {
  const SIZE = 240;
  const source: ImageSourcePropType | null = imageUri ? { uri: imageUri } : null;

  return (
    <View style={[s.frame, { width: SIZE, height: SIZE }]}>
      {source ? (
        <Image source={source} style={s.frameImage} resizeMode="cover" />
      ) : (
        <FacePlaceholder />
      )}
      {annotation ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: annotation.x * SIZE - 22,
            top: annotation.y * SIZE - 22,
            width: 44,
            height: 44,
          }}
        >
          <FocusMarker />
        </View>
      ) : null}
    </View>
  );
}

function FocusMarker() {
  return (
    <Svg width={44} height={44}>
      <Defs>
        <RadialGradient id="focusGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={V26.terracotta} stopOpacity={0.22} />
          <Stop offset="60%" stopColor={V26.terracotta} stopOpacity={0.08} />
          <Stop offset="100%" stopColor={V26.terracotta} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={22} cy={22} r={22} fill="url(#focusGlow)" />
      <Circle
        cx={22}
        cy={22}
        r={16}
        stroke={V26.terracotta}
        strokeWidth={1.2}
        fill="none"
      />
    </Svg>
  );
}

function FacePlaceholder() {
  // Tasteful warm placeholder so the module never renders empty. Real
  // scan images replace this as data lands.
  return (
    <View style={s.placeholder}>
      <Svg width={120} height={140} viewBox="0 0 120 140">
        <Defs>
          <RadialGradient id="warmFace" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="#F8E6DC" stopOpacity={1} />
            <Stop offset="100%" stopColor="#E9D4C6" stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Circle cx={60} cy={62} r={48} fill="url(#warmFace)" />
        <Circle cx={45} cy={58} r={2.2} fill={V26.inkMuted} opacity={0.35} />
        <Circle cx={75} cy={58} r={2.2} fill={V26.inkMuted} opacity={0.35} />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skin map bottom sheet
// ---------------------------------------------------------------------------

interface ScanMapSheetProps {
  visible: boolean;
  evidence: ScanEvidenceData;
  onClose: () => void;
}

function ScanMapSheet({ visible, evidence, onClose }: ScanMapSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.sheetRoot}>
        <Pressable
          accessibilityLabel="Close skin map"
          onPress={onClose}
          style={s.sheetBackdrop}
        />
        <View style={s.sheetCard}>
          <View style={s.sheetHandleWrap}>
            <View style={s.sheetHandle} />
          </View>
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Eyebrow>SKIN MAP</Eyebrow>
              <SectionHeading style={s.sheetTitle}>
                Watching this area
              </SectionHeading>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={10}
              style={s.sheetClose}
            >
              <X size={18} color={V26.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.sheetContent}>
            <View style={s.sheetImageWrap}>
              <FaceFrame
                imageUri={evidence.latestImageUri}
                annotation={evidence.annotation}
              />
            </View>
            <Text style={s.sheetRegion} maxFontSizeMultiplier={1.2}>
              Chin area
            </Text>
            <Body style={s.sheetBody}>
              We detected mild breakout activity around your chin. Keep
              tonight’s routine gentle while we gather more consistent scans.
            </Body>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  eyebrow: {
    color: V26.terracottaText,
  },
  headline: {
    marginTop: 8,
    fontSize: 20,
    lineHeight: 25,
  },
  imageWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  frame: {
    borderRadius: V26_RADIUS.card,
    overflow: 'hidden',
    backgroundColor: V26.clayMist,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: V26.border,
  },
  frameImage: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  observation: {
    marginTop: 18,
  },
  secondary: {
    marginTop: 8,
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 18,
  },
  compareUnlock: {
    color: V26.inkFaint,
  },

  sheetRoot: {
    flex: 1,
    backgroundColor: V26.overlay,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetCard: {
    backgroundColor: V26.surface,
    borderTopLeftRadius: V26_RADIUS.hero,
    borderTopRightRadius: V26_RADIUS.hero,
    paddingHorizontal: V26_SPACE.gutter,
    paddingBottom: 36,
    paddingTop: 14,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: V26.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sheetTitle: {
    marginTop: 4,
    fontSize: 22,
    lineHeight: 26,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: V26.paper,
    borderWidth: 1,
    borderColor: V26.border,
  },
  sheetContent: {
    paddingTop: 18,
    paddingBottom: 16,
  },
  sheetImageWrap: {
    alignItems: 'center',
  },
  sheetRegion: {
    marginTop: 18,
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13,
    color: V26.terracottaText,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  sheetBody: {
    marginTop: 14,
    textAlign: 'center',
  },
});
