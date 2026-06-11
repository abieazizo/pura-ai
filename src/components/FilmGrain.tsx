import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/**
 * FilmGrain — the ~4% photographic grain the dark cinematic screens wear.
 *
 * A deterministic 64×64 luminance-noise tile (assets/textures/noise64.png,
 * generated once, committed) tiled across the surface at very low opacity.
 * Plain RN Image with resizeMode="repeat" — works on iOS, Android, and
 * react-native-web; zero per-frame cost (it's a static texture, not an
 * animation, so Reduce Motion needs no branch).
 *
 * Mount LAST inside a screen's root so it sits over the content:
 *   <View style={root}>…<FilmGrain /></View>
 */
export function FilmGrain({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Image
        source={require('../../assets/textures/noise64.png')}
        style={styles.fill}
        resizeMode="repeat"
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});
