import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { hapt } from '@/utils/haptics';
import { palette, space } from '@/theme';

export interface DateStripDay {
  /** Calendar date (midnight-normalised). */
  date: Date;
  /** True if a scan exists for this calendar day. */
  scanned: boolean;
  /** True if this day is "today" in the user's local timezone. */
  isToday: boolean;
}

export interface DateStripProps {
  days: DateStripDay[];
  selectedIso: string;
  onSelect: (isoDate: string) => void;
}

const DAY_WIDTH = 44;
const DAY_HEIGHT = 64;
const DAY_GAP = 12;
const CIRCLE_DEFAULT = 32;
const CIRCLE_TODAY = 40;

const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * 7-day horizontal date strip (§4.2). Today is the standout — larger, filled
 * terracotta. Past scanned days are filled sand with terracotta numerals.
 * Unscanned days render as dashed terracotta rings. On mount we scroll so
 * today sits as close to horizontal center as the strip's natural bounds
 * allow.
 */
export function DateStrip({ days, selectedIso, onSelect }: DateStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [stripWidth, setStripWidth] = useState(0);
  const contentWidth = days.length * DAY_WIDTH + (days.length - 1) * DAY_GAP;
  const todayIndex = useMemo(() => days.findIndex((d) => d.isToday), [days]);

  useEffect(() => {
    if (!scrollRef.current || stripWidth === 0 || todayIndex < 0) return;
    const todayX = todayIndex * (DAY_WIDTH + DAY_GAP) + DAY_WIDTH / 2;
    const target = Math.max(0, todayX - stripWidth / 2);
    scrollRef.current.scrollTo({
      x: target,
      y: 0,
      animated: true,
    });
  }, [stripWidth, todayIndex]);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setStripWidth(e.nativeEvent.layout.width)}
      style={styles.wrap}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        // If the strip can scroll horizontally at all we want that to work,
        // but on devices where 7 days fit, the content centers naturally.
        decelerationRate="fast"
      >
        {days.map((d) => (
          <DayCell
            key={d.date.toISOString()}
            day={d}
            selected={d.date.toISOString() === selectedIso}
            onPress={() => {
              hapt.select();
              onSelect(d.date.toISOString());
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DayCell({
  day,
  selected,
  onPress,
}: {
  day: DateStripDay;
  selected: boolean;
  onPress: () => void;
}) {
  const abbr = DAY_ABBR[day.date.getDay()];
  const num = day.date.getDate();
  const size = day.isToday ? CIRCLE_TODAY : CIRCLE_DEFAULT;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${abbr} ${num}${
        day.isToday ? ', today' : day.scanned ? ', scanned' : ''
      }`}
      accessibilityState={{ selected }}
      style={styles.cell}
      hitSlop={4}
    >
      <Text style={styles.abbr}>{abbr}</Text>
      <View style={[styles.circle, getCircleStyle(day), { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.num, getNumStyle(day)]} maxFontSizeMultiplier={1.1}>
          {num}
        </Text>
      </View>
    </Pressable>
  );
}

function getCircleStyle(day: DateStripDay) {
  if (day.isToday) {
    return day.scanned ? circles.todayScanned : circles.todayUnscanned;
  }
  return day.scanned ? circles.pastScanned : circles.pastUnscanned;
}

function getNumStyle(day: DateStripDay) {
  if (day.isToday) {
    return day.scanned ? nums.todayScanned : nums.todayUnscanned;
  }
  return day.scanned ? nums.pastScanned : nums.pastUnscanned;
}

const styles = StyleSheet.create({
  wrap: {
    height: 80,
    paddingVertical: 12,
  },
  content: {
    paddingHorizontal: 20,
    gap: DAY_GAP,
    alignItems: 'center',
  },
  cell: {
    width: DAY_WIDTH,
    height: DAY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  abbr: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.32, // +120‰ tracking at 11pt ≈ 1.32
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)', // ink @ 60%
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
});

// Circle background/border variants.
const circles = StyleSheet.create({
  pastScanned: { backgroundColor: palette.sand },
  pastUnscanned: {
    borderWidth: 1,
    borderColor: 'rgba(198,93,72,0.3)', // clay @ 30%
    borderStyle: 'dashed',
  },
  todayScanned: { backgroundColor: palette.clay },
  todayUnscanned: {
    borderWidth: 1.5,
    borderColor: palette.clay,
  },
});

const nums = StyleSheet.create({
  pastScanned: { color: palette.clay },
  pastUnscanned: { color: 'rgba(26,22,20,0.4)' }, // ink @ 40%
  todayScanned: { color: palette.bg, fontSize: 17, lineHeight: 20 },
  todayUnscanned: { color: palette.clay, fontSize: 17, lineHeight: 20 },
});
