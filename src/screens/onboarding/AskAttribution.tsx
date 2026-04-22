import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  Users,
  DotsThree,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';

export interface AskAttributionProps {
  onNext: () => void;
}

/**
 * Monochrome brand marks (§3.8). All single-stroke or single-fill ink
 * shapes — never color logos. Fall back to a Phosphor glyph if a custom
 * mark isn't available. Each implements the PhosphorIconProps shape so it
 * can slot into `ChoiceRow` without wrappers.
 */
const GlyphWrapper =
  (Draw: React.FC<{ size: number; color: string }>): React.FC<PhosphorIconProps> =>
  ({ size = 24, color = palette.ink, style }) =>
    <View style={style as any}><Draw size={size} color={color as string} /></View>;

const GoogleG = GlyphWrapper(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {/* Single-stroke "G" — stylized, monochrome. Not the color logo. */}
    <Path
      d="M12 4 A 8 8 0 1 0 20 12 H 12"
      stroke={color}
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
));

const TikTokNote = GlyphWrapper(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {/* Stylized music-note mark — monochrome. */}
    <Path
      d="M14 4 V 15 A 3 3 0 1 1 11 12 V 8 L 17 4"
      stroke={color}
      strokeWidth={1.5}
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
));

const InstagramOutline = GlyphWrapper(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M6 4 H 18 A 2 2 0 0 1 20 6 V 18 A 2 2 0 0 1 18 20 H 6 A 2 2 0 0 1 4 18 V 6 A 2 2 0 0 1 6 4 Z"
      stroke={color}
      strokeWidth={1.5}
      fill="none"
    />
    <Path
      d="M12 8 A 4 4 0 1 0 12 16 A 4 4 0 1 0 12 8 Z"
      stroke={color}
      strokeWidth={1.5}
      fill="none"
    />
    <Path d="M17 7 L 17 7.001" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
));

const AppStoreA = GlyphWrapper(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {/* Monochrome "A" inside a rounded square — represents App Store without color. */}
    <Path
      d="M5 4 H 19 A 2 2 0 0 1 21 6 V 18 A 2 2 0 0 1 19 20 H 5 A 2 2 0 0 1 3 18 V 6 A 2 2 0 0 1 5 4 Z"
      stroke={color}
      strokeWidth={1.5}
      fill="none"
    />
    <Path
      d="M8 17 L 12 8 L 16 17 M 9.5 14 H 14.5"
      stroke={color}
      strokeWidth={1.5}
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
));

const ROWS: {
  value: string;
  Icon: React.FC<PhosphorIconProps>;
  label: string;
}[] = [
  { value: 'google', Icon: GoogleG, label: 'Google' },
  { value: 'friend', Icon: Users as React.FC<PhosphorIconProps>, label: 'Friend or family' },
  { value: 'tiktok', Icon: TikTokNote, label: 'TikTok' },
  { value: 'instagram', Icon: InstagramOutline, label: 'Instagram' },
  { value: 'app_store', Icon: AppStoreA, label: 'App Store' },
  { value: 'other', Icon: DotsThree as React.FC<PhosphorIconProps>, label: 'Other' },
];

export function AskAttribution({ onNext }: AskAttributionProps) {
  const attribution = useAppStore((s) => s.attribution);
  const setAttribution = useAppStore((s) => s.setAttribution);

  const onSkip = () => {
    // Skip preserves any existing selection; don't overwrite.
    onNext();
  };

  return (
    <QuestionLayout
      step={10}
      totalSteps={11}
      headline="Where did you hear about us?"
      subhead="Optional — but it helps me know what's working."
      showSkip
      onSkip={onSkip}
      onCta={() => onNext()}
    >
      <ChoiceList>
        {ROWS.map((r) => (
          <ChoiceRow
            key={r.value}
            Icon={r.Icon}
            label={r.label}
            selected={attribution === r.value}
            onToggle={() => setAttribution(r.value)}
          />
        ))}
      </ChoiceList>
    </QuestionLayout>
  );
}

// styles kept minimal — layout is handled by shared components.
const styles = StyleSheet.create({});
