/**
 * Build Routine Picker — reveal-arc surface 6.5.
 *
 * Sits between the Ready screen (surface 6) and the Build Ceremony
 * (surface 7). The user chooses which of the four pillars to include;
 * the selection is carried into the ceremony, which builds and animates
 * only the chosen pillars. All four are on by default, because a
 * complete routine is the recommended starting point — turning one off
 * is a deliberate, reversible choice (steps can be added later on the
 * routine page).
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'phosphor-react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Extrapolation,
} from 'react-native-reanimated';
import {
  puraReveal,
  puraRevealLayout,
  puraRevealRadius,
  puraRevealShadow,
  puraRevealType,
} from '@/theme/tokens';
import { PILLAR_KEYS, type PillarKey, type PillarSelection } from '@/types/routine';
import { PILLAR_IDENTITY, PillarIcon } from '@/components/routine/pillarIdentity';
import { hapt } from '@/utils/haptics';
import { RevealCTA } from './revealChrome';

// Spring used for the toggle thumb + dimming. Overshoot-clamped so the
// track colour and content opacity never extrapolate past their ends.
const TOGGLE_SPRING = {
  damping: 26,
  stiffness: 220,
  mass: 0.7,
  overshootClamping: true,
} as const;

// Toggle geometry (≈52×30, 26px thumb, 2px inset).
const SW_W = 52;
const SW_H = 30;
const SW_THUMB = 26;
const SW_PAD = 2;
const SW_ON_X = SW_W - SW_THUMB - SW_PAD; // 24
const SW_OFF_X = SW_PAD; // 2

const ALL_ON: PillarSelection = {
  cleanse: true,
  treat: true,
  moisturize: true,
  protect: true,
};

export interface BuildRoutinePickerProps {
  scanId: string;
  onBack: () => void;
  onBuild: (selection: PillarSelection) => void;
}

export function BuildRoutinePicker({ onBack, onBuild }: BuildRoutinePickerProps) {
  const { width: vw } = useWindowDimensions();
  const contentW =
    Math.min(vw, puraRevealLayout.maxContentWidth) - puraRevealLayout.screenPadding * 2;

  const [selection, setSelection] = React.useState<PillarSelection>(ALL_ON);

  const toggle = React.useCallback((key: PillarKey) => {
    hapt.tap();
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const anyOn = PILLAR_KEYS.some((k) => selection[k]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={[styles.frame, { maxWidth: puraRevealLayout.maxContentWidth }]}>
        {/* Header — back arrow circle + PURA eyebrow */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              hapt.tap();
              onBack();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backCircle, pressed && styles.pressedDim]}
          >
            <ArrowLeft size={18} weight="bold" color={puraReveal.ink} />
          </Pressable>
          <Text style={[puraRevealType.eyebrow, { color: puraReveal.blue }]}>PURA</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollBody, { width: contentW }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={[puraRevealType.displayTitle, { color: puraReveal.ink }]}>
              Build your routine.
            </Text>
            <Text style={[puraRevealType.displayTitle, { color: puraReveal.ink }]}>
              Choose what{' '}
              <Text style={[puraRevealType.displayItalic, { color: puraReveal.blue }]}>
                to include
              </Text>
            </Text>
          </View>

          <Text style={[puraRevealType.body, styles.subhead]}>
            All four are on by default. Turn off anything you don&rsquo;t need — Pura matches a
            real product to each one you keep.
          </Text>

          {/* Pillar cards */}
          <View style={styles.cards}>
            {PILLAR_KEYS.map((key) => (
              <PillarToggleCard
                key={key}
                pillar={key}
                value={selection[key]}
                onToggle={() => toggle(key)}
              />
            ))}
          </View>

          <Text style={[puraRevealType.tip, styles.footerNote]}>
            You can add more steps later.
          </Text>
        </ScrollView>

        <View style={styles.ctaDock}>
          <RevealCTA
            label="Build my routine"
            onPress={() => onBuild(selection)}
            disabled={!anyOn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Pillar toggle card — whole card is the toggle target; the switch is a
// visual indicator. Content (icon + text) dims to 0.55 when off.
// ---------------------------------------------------------------------------

function PillarToggleCard({
  pillar,
  value,
  onToggle,
}: {
  pillar: PillarKey;
  value: boolean;
  onToggle: () => void;
}) {
  const id = PILLAR_IDENTITY[pillar];
  const p = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    p.value = withSpring(value ? 1 : 0, TOGGLE_SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.55, 1], Extrapolation.CLAMP),
  }));
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [puraReveal.veryMuted, puraReveal.blue]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 1], [SW_OFF_X, SW_ON_X], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${id.label} — ${value ? 'on' : 'off'}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Animated.View style={[styles.cardContent, contentStyle]}>
        <PillarIcon pillar={pillar} size={44} />
        <View style={styles.cardText}>
          <Text style={[puraRevealType.focusPhrase, { color: puraReveal.ink }]}>
            {id.label}
          </Text>
          <Text style={[puraRevealType.pillarDesc, { color: puraReveal.muted }]}>
            {id.description}
          </Text>
        </View>
      </Animated.View>

      {/* Switch — visual only; taps fall through to the card. */}
      <View pointerEvents="none" style={styles.switchWrap}>
        <Animated.View style={[styles.track, trackStyle]}>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraReveal.bg,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    paddingHorizontal: puraRevealLayout.screenPadding,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    marginTop: 6,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: puraReveal.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedDim: {
    opacity: 0.6,
    transform: [{ scale: 0.96 }],
  },
  scroll: {
    flex: 1,
  },
  scrollBody: {
    alignSelf: 'center',
    paddingTop: 20,
    paddingBottom: 14,
  },
  hero: {
    gap: 2,
  },
  subhead: {
    color: puraReveal.muted,
    marginTop: 14,
    marginBottom: 24,
  },
  cards: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    ...puraRevealShadow.card,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  switchWrap: {
    paddingLeft: 14,
  },
  track: {
    width: SW_W,
    height: SW_H,
    borderRadius: SW_H / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: SW_THUMB,
    height: SW_THUMB,
    borderRadius: SW_THUMB / 2,
    backgroundColor: puraReveal.white,
    position: 'absolute',
    // soft thumb shadow
    shadowColor: '#0A1A2F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  footerNote: {
    color: puraReveal.veryMuted,
    textAlign: 'center',
    marginTop: 20,
  },
  ctaDock: {
    paddingTop: 10,
    paddingBottom: 4,
  },
});
