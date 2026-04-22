import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { X } from 'phosphor-react-native';
import { Pressable } from 'react-native';
import { PuraMark } from '@/components/PuraMark';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { palette, space, type as typography } from '@/theme';
import { scan } from '@/copy/strings';
import type { ScanStackParamList } from '@/navigation/types';

export interface ScanAnalyzingScreenProps {
  onDone: (photoUri: string, mode: 'face' | 'product') => void;
  onCancel: () => void;
}

/**
 * v5 analyzing: radial gradient (clayPaper top → bg bottom), captured photo
 * vignetted inside a 280×360 frame, Mark overlaid at md in `scanning`
 * variant, italic serif cycling text. 3.5 seconds total — deliberately
 * stretched to feel like a process, not a spinner.
 */
export function ScanAnalyzingScreen({ onDone, onCancel }: ScanAnalyzingScreenProps) {
  const route = useRoute<RouteProp<ScanStackParamList, 'ScanAnalyzing'>>();
  const { photoUri, mode } = route.params;
  // §4.6 — a single quiet line. The Mark's scanning pulse carries the
  // loading feedback; we don't cycle progress captions or show a spinner.
  const line =
    mode === 'face'
      ? scan.analyzing.singleFaceLine
      : scan.analyzing.singleProductLine;
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    const t = setTimeout(() => {
      doneRef.current = true;
      onDone(photoUri, mode);
    }, 3500);
    return () => clearTimeout(t);
  }, [onDone, photoUri, mode]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <RadialGradientBg />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onCancel}
            hitSlop={10}
            accessibilityLabel="Cancel scan"
            style={styles.closeBtn}
          >
            <X size={20} color={palette.ink} weight="regular" />
          </Pressable>
        </View>

        <View style={styles.center}>
          <View style={styles.photoFrame}>
            <Image
              source={photoUri}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
            <View style={styles.vignette} pointerEvents="none" />
            <View style={styles.markOverlay} pointerEvents="none">
              <PuraMark variant="scanning" size="md" />
            </View>
          </View>

          <Text style={styles.step} maxFontSizeMultiplier={1.2}>
            {line}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function RadialGradientBg() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
      <Defs>
        <RadialGradient id="analyze-bg" cx="0.5" cy="0.25" r="0.9">
          <Stop offset="0" stopColor={palette.clayPaper} />
          <Stop offset="1" stopColor={palette.bg} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#analyze-bg)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26,22,20,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: space.xxl,
  },
  photoFrame: {
    width: 280,
    height: 360,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,22,20,0.2)',
  },
  markOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    ...typography.italicLead,
    color: palette.ink,
    textAlign: 'center',
    fontSize: 22,
  },
});
