import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ZoneCard } from './ZoneCard';
import type { SkinZone, SkinZoneKey, Scan } from '@/types';

export interface ZoneRowProps {
  /** Scans history, oldest → newest. Used for sparklines and current score. */
  scans: Scan[];
  onZonePress?: (key: SkinZoneKey) => void;
}

const ORDER: {
  key: SkinZoneKey;
  label: string;
  tint: 'chinSand' | 'tZoneClay' | 'cheeksMoss';
}[] = [
  { key: 'chin', label: 'Chin', tint: 'chinSand' },
  { key: 'tZone', label: 'T-Zone', tint: 'tZoneClay' },
  { key: 'cheeks', label: 'Cheeks', tint: 'cheeksMoss' },
];

/**
 * Three zone cards in a row (§4.4). Each fades + translates up 8pt on mount,
 * staggered 80ms, starting 400ms after the hero has begun its count-up.
 */
export function ZoneRow({ scans, onZonePress }: ZoneRowProps) {
  const latest = scans[scans.length - 1];
  return (
    <View style={styles.row}>
      {ORDER.map((z, i) => {
        const zone = latest?.zones.find((x) => x.key === z.key);
        const history = scans
          .map((s) => s.zones.find((x) => x.key === z.key)?.score)
          .filter((v): v is number => typeof v === 'number');
        return (
          <AnimatedSlot key={z.key} index={i}>
            <ZoneCard
              label={z.label}
              tint={z.tint}
              score={zone ? zone.score : null}
              status={zone ? zone.status : null}
              history={history}
              onPress={() => onZonePress?.(z.key)}
            />
          </AnimatedSlot>
        );
      })}
    </View>
  );
}

function AnimatedSlot({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  React.useEffect(() => {
    const delay = 400 + index * 80;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
  }, [index, opacity, translateY]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.slot, animated]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  slot: { flex: 1 },
});
