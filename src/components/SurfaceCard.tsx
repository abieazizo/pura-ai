import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LayeredShadow } from './LayeredShadow';
import { colors, radius, shadow, space } from '@/theme';

export type SurfaceTone =
  | 'plain'     // hairline border on bg, no shadow
  | 'elevated' // bg with layered card shadow
  | 'subtle'   // bgDeep surface
  | 'accent'   // clayPaper tint
  | 'success'  // mossLight tint
  | 'warning'; // amberLight tint

export interface SurfaceCardProps {
  tone?: SurfaceTone;
  padding?: keyof typeof space;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * v5 card. Defaults to a hairline-bordered bg surface. `elevated` wraps with
 * `LayeredShadow` for a premium two-layer shadow. Radius md (12), padding
 * comes from the `space` tokens — spec §11.2 specifies 20pt so pass
 * `padding="lg"` (24) or `"md"` (16) depending on density.
 */
export function SurfaceCard({
  tone = 'plain',
  padding = 'lg',
  children,
  style,
}: SurfaceCardProps) {
  const body = (
    <View
      style={[
        { borderRadius: radius.md, padding: space[padding] },
        toneStyles[tone],
        style,
      ]}
    >
      {children}
    </View>
  );

  if (tone === 'elevated') {
    return (
      <LayeredShadow preset={shadow.card} borderRadius={radius.md}>
        {body}
      </LayeredShadow>
    );
  }
  return body;
}

const toneStyles = StyleSheet.create({
  plain: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  elevated: {
    backgroundColor: colors.bg,
  },
  subtle: {
    backgroundColor: colors.bgDeep,
  },
  accent: {
    backgroundColor: colors.accentPaper,
    borderWidth: 1,
    borderColor: colors.clayLight,
  },
  success: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.moss,
  },
  warning: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.amber,
  },
});
