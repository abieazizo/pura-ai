import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { palette } from '@/theme';

export interface PuraGlyphProps {
  /** Box (and ring) diameter in px. The glyph is sized relative to this. */
  size?: number;
  /** Letter color. `ink` = primary, `blue` = Pura Blue accent. */
  tone?: 'ink' | 'blue';
  /** Draws a hairline porcelain disc behind the glyph so it reads as a mark. */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * PuraGlyph — the typographic brand mark.
 *
 * A single "P" set in Instrument Serif. This is the deliberate replacement
 * for the raster water-droplet (`PuraMark` → `assets/brand/pura-drop.png`)
 * on the onboarding front door and the post-scan save screen, where a
 * literal droplet reads as decorative clip-art rather than a brand
 * signature. Pure type: no image asset, no emoji.
 *
 * Scope note: this does NOT replace `PuraMark` app-wide. The droplet is
 * still the brand mark on Home, the scanning animation, etc. Swapping it
 * everywhere is a separate debrand task; here we only remove it from the
 * surfaces this onboarding rebuild owns.
 */
export function PuraGlyph({
  size = 56,
  tone = 'ink',
  ring = false,
  style,
}: PuraGlyphProps) {
  const color = tone === 'blue' ? palette.clay : palette.ink;
  const glyphSize = size * 0.72;
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size / 2 },
        ring && styles.ring,
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="Pura"
    >
      <Text
        allowFontScaling={false}
        style={[
          styles.glyph,
          { fontSize: glyphSize, lineHeight: glyphSize, color },
        ]}
      >
        P
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  glyph: {
    fontFamily: 'InstrumentSerif-Regular',
    includeFontPadding: false,
    textAlign: 'center',
    // Optical nudge: the serif "P" sits slightly high in its em box.
    marginTop: 2,
  },
});
