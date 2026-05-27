import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { V26, V26_RADIUS, V26_TYPE } from './tokens';

interface ScanDecisionPreviewProps {
  scanImageUri?: string;
  /** PLAN ADJUSTED / READING / WATCHING — eyebrow above the decision. */
  decisionLabel: string;
  /** Short decision sentence — "Skip strong treatment tonight". */
  decision: string;
}

/**
 * v26 — Scan → Decision Preview.
 *
 * The proof artefact on the Today landing. A small framed scan crop on
 * the left, a clay focus ring over the chin region, and the routine
 * decision derived from that observation on the right. Communicates
 * causality in one glance: "observed chin activity → gentler plan."
 *
 * When no scan image is available, renders a calm warm placeholder
 * rather than a fake mannequin face.
 */
export function ScanDecisionPreview({
  scanImageUri,
  decisionLabel,
  decision,
}: ScanDecisionPreviewProps) {
  return (
    <View style={s.row}>
      <ThumbWithFocus uri={scanImageUri} />

      <View style={s.divider} />

      <View style={s.copy}>
        <Text style={s.label} maxFontSizeMultiplier={1.15}>
          {decisionLabel}
        </Text>
        <Text style={s.decision} maxFontSizeMultiplier={1.2}>
          {decision}
        </Text>
      </View>
    </View>
  );
}

function ThumbWithFocus({ uri }: { uri?: string }) {
  const size = 74;
  const source: ImageSourcePropType | null = uri ? { uri } : null;
  return (
    <View
      style={[s.thumb, { width: size, height: size }]}
      accessibilityLabel={
        uri
          ? 'Latest scan crop with chin area highlighted'
          : 'Scan preview unavailable'
      }
    >
      {source ? (
        <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <PrivacyPlaceholder />
      )}
      {/* Chin focus marker — small, restrained */}
      <View pointerEvents="none" style={s.focusWrap}>
        <Svg width={26} height={26}>
          <Defs>
            <RadialGradient id="claySmall" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={V26.terracotta} stopOpacity={0.32} />
              <Stop offset="55%" stopColor={V26.terracotta} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={V26.terracotta} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={13} cy={13} r={13} fill="url(#claySmall)" />
          <Circle
            cx={13}
            cy={13}
            r={9}
            stroke={V26.terracotta}
            strokeWidth={1.1}
            fill="none"
          />
        </Svg>
      </View>
    </View>
  );
}

function PrivacyPlaceholder() {
  return (
    <View style={s.placeholder}>
      <Svg width={36} height={42} viewBox="0 0 36 42">
        <Defs>
          <RadialGradient id="warmTone" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="#F2DDD2" stopOpacity={1} />
            <Stop offset="100%" stopColor="#E5CFC3" stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Circle cx={18} cy={20} r={14} fill="url(#warmTone)" />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: V26_RADIUS.cardSmall,
    backgroundColor: V26.warmScan,
  },
  thumb: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: V26.clayMist,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: V26.border,
  },
  focusWrap: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    marginLeft: -13,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: V26.borderStrong,
    marginVertical: 4,
    opacity: 0.55,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    color: V26.terracottaText,
    textTransform: 'uppercase',
  },
  decision: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 16,
    lineHeight: 22,
    color: V26.ink,
    letterSpacing: -0.1,
  },
});
