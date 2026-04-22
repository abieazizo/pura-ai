import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import {
  QuestionHeadline,
  QuestionSubhead,
} from '@/components/onboarding/Headline';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface AskAgeProps {
  onNext: () => void;
}

const AGE_MIN = 13;
const AGE_MAX = 80;
const ITEM_HEIGHT = 60;
const VISIBLE_ITEMS = 4; // snapper must have even visible rows for clean symmetry

const AGES: number[] = Array.from(
  { length: AGE_MAX - AGE_MIN + 1 },
  (_, i) => AGE_MIN + i
);

/**
 * AskAge (§3.3). Custom scroll-wheel picker built from FlatList with
 * snap-to-interval. Center item is large clay tabular serif; neighbours fade
 * back in opacity and size.
 */
export function AskAge({ onNext }: AskAgeProps) {
  const insets = useSafeAreaInsets();
  const storedAge = useAppStore((s) => s.age);
  const setAge = useAppStore((s) => s.setAge);
  const listRef = useRef<FlatList<number>>(null);

  const [current, setCurrent] = useState<number>(storedAge ?? 25);
  const initialIndex = useMemo(
    () => AGES.indexOf(storedAge ?? 25),
    [storedAge]
  );

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(AGES.length - 1, idx));
    const nextAge = AGES[clamped];
    if (nextAge !== current) {
      setCurrent(nextAge);
      hapt.select();
    }
  };

  const submit = () => {
    setAge(current);
    onNext();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <OnboardingHeader currentStep={2} totalSteps={11} />

      <QuestionHeadline>How old are you?</QuestionHeadline>
      <QuestionSubhead>
        Hormonal context matters. Skin at 17 is different from skin at 47.
      </QuestionSubhead>

      <View style={styles.pickerWrap}>
        <View style={styles.highlight} pointerEvents="none" />
        <FlatList
          ref={listRef}
          data={AGES}
          keyExtractor={(n) => String(n)}
          getItemLayout={(_, i) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * i,
            index: i,
          })}
          initialScrollIndex={Math.max(0, initialIndex)}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={onMomentumScrollEnd}
          contentContainerStyle={{
            paddingVertical: ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT,
          }}
          renderItem={({ item }) => <AgeRow age={item} current={current} />}
        />
      </View>

      <View style={styles.spacer} />

      <View style={{ paddingBottom: insets.bottom + 40 }}>
        <OnboardingPrimaryButton label="Continue" onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

function AgeRow({ age, current }: { age: number; current: number }) {
  const delta = Math.abs(age - current);
  const { size, opacity, color } =
    delta === 0
      ? { size: 44, opacity: 1, color: palette.clay }
      : delta === 1
      ? { size: 32, opacity: 0.4, color: palette.ink }
      : { size: 28, opacity: 0.15, color: palette.ink };

  return (
    <View style={styles.row}>
      <Text
        style={{
          fontFamily: 'InstrumentSerif-Regular',
          fontSize: size,
          color,
          opacity,
          fontVariant: ['tabular-nums'],
        }}
        maxFontSizeMultiplier={1.1}
      >
        {age}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  pickerWrap: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    top: (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(198,93,72,0.06)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(198,93,72,0.15)',
  },
  row: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
});
