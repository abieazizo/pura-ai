/**
 * Routine Landing — surface 8 of the reveal arc, and the resting home for
 * lifecycle 'active'. This is where the build ceremony hands off: a calm,
 * populated "tonight's routine" the user checks off, NOT an animated build
 * and NOT a guided full-screen session.
 *
 * It is purely presentational — the four pillars are derived from the
 * committed `CustomRoutine` (deduped morning + evening by type in the
 * canonical Cleanse · Treat · Moisturize · Protect order) and per-step
 * completion is owned by the caller via `doneTypes` / `onToggleStep`
 * (the routine store's date-keyed `tonightChecklist`). The view never
 * reaches into the store itself.
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Check, Sparkle } from 'phosphor-react-native';
import type { ImageSourcePropType } from 'react-native';
import {
  puraReveal,
  puraRevealLayout,
  puraRevealRadius,
  puraRevealShadow,
  puraRevealType,
} from '@/theme/tokens';
import type {
  CustomRoutine,
  RoutineProduct,
  RoutineStep,
  RoutineStepType,
} from '@/types/routine';
import { findShopProduct } from '@/screens/shop/shopCatalog';
import { hapt } from '@/utils/haptics';
import { RevealLink } from './revealChrome';

// Canonical pillar order + display names. "Moisturize" (not "Hydrate") so the
// landing page speaks the same language as the build ceremony and reveal arc.
const PILLAR_ORDER: RoutineStepType[] = ['cleanse', 'treat', 'hydrate', 'protect'];
const PILLAR_LABEL: Record<RoutineStepType, string> = {
  cleanse: 'Cleanse',
  treat: 'Treat',
  hydrate: 'Moisturize',
  protect: 'Protect',
};

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatToday(d: Date = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

interface Pillar {
  type: RoutineStepType;
  index: string;
  label: string;
  product?: RoutineProduct;
  packshot?: ImageSourcePropType;
  guidance: string;
}

export interface RoutineLandingViewProps {
  routine: CustomRoutine;
  /** Pillar types checked off for today (from the store's tonightChecklist). */
  doneTypes: RoutineStepType[];
  onToggleStep: (type: RoutineStepType) => void;
  onEdit: () => void;
  onHowItWorks: () => void;
}

export function RoutineLandingView({
  routine,
  doneTypes,
  onToggleStep,
  onEdit,
  onHowItWorks,
}: RoutineLandingViewProps) {
  const insets = useSafeAreaInsets();
  const { width: vw } = useWindowDimensions();
  const contentW = Math.min(vw, puraRevealLayout.maxContentWidth);

  const pillars: Pillar[] = React.useMemo(() => {
    const byType = new Map<RoutineStepType, RoutineStep>();
    for (const s of [...routine.morningSteps, ...routine.eveningSteps]) {
      if (!byType.has(s.type)) byType.set(s.type, s);
    }
    return PILLAR_ORDER
      .map((type) => byType.get(type))
      .filter((s): s is RoutineStep => Boolean(s))
      .map((step, i) => {
        const product = step.product;
        const catalog = product ? findShopProduct(product.id) : undefined;
        return {
          type: step.type,
          index: String(i + 1).padStart(2, '0'),
          label: PILLAR_LABEL[step.type],
          product,
          packshot: catalog?.catalogPackshot,
          guidance: step.purpose,
        };
      });
  }, [routine]);

  const total = pillars.length;
  const doneCount = pillars.filter((p) => doneTypes.includes(p.type)).length;
  const allDone = total > 0 && doneCount === total;
  const minutes = Math.round(total * 1.5);

  const handleToggle = React.useCallback(
    (type: RoutineStepType, wasDone: boolean) => {
      if (wasDone) hapt.tap();
      else hapt.stepComplete();
      onToggleStep(type);
    },
    [onToggleStep],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { width: contentW, paddingBottom: insets.bottom + puraRevealLayout.dockClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={[puraRevealType.displayTitle, { color: puraReveal.ink }]}>
              Routine
            </Text>
            <Sparkle size={20} weight="fill" color={puraReveal.blue} style={styles.titleSparkle} />
          </View>
          <RevealLink label="Edit" onPress={onEdit} tone="blue" />
        </View>
        <Text style={[puraRevealType.dateLabel, styles.dateLabel, { color: puraReveal.muted }]}>
          {formatToday()}
        </Text>

        {/* Tonight's routine */}
        <View style={styles.sectionHead}>
          <Text style={[puraRevealType.pillarName, { color: puraReveal.ink }]}>
            Tonight's routine
          </Text>
          <Text style={[puraRevealType.stepMeta, styles.sectionMeta, { color: puraReveal.veryMuted }]}>
            {total} steps · ~{minutes} minutes
          </Text>
        </View>

        {/* Pillar timeline */}
        <View style={styles.timeline}>
          {pillars.map((p, i) => {
            const done = doneTypes.includes(p.type);
            return (
              <View
                key={p.type}
                style={[styles.timelineRow, i < total - 1 && styles.timelineRowGap]}
              >
                <View style={styles.rail}>
                  <View style={[styles.railLine, i === 0 && styles.railLineHidden]} />
                  <Text
                    style={[puraRevealType.pillarNumber, styles.railNumber, { color: puraReveal.blue }]}
                  >
                    {p.index}
                  </Text>
                  <View style={[styles.railLine, i === total - 1 && styles.railLineHidden]} />
                </View>

                <View style={[styles.pillarCard, done && styles.pillarCardDone]}>
                  <View style={styles.pillarCardTop}>
                    <Text style={[puraRevealType.pillarName, { color: puraReveal.ink }]}>
                      {p.label}
                    </Text>
                    <DoneToggle done={done} onPress={() => handleToggle(p.type, done)} />
                  </View>

                  <View style={styles.pillarCardBody}>
                    <View style={styles.pillarText}>
                      {p.product ? (
                        <>
                          <Text
                            style={[puraRevealType.productName, { color: puraReveal.ink }]}
                            numberOfLines={2}
                          >
                            {p.product.name}
                          </Text>
                          <Text
                            style={[puraRevealType.brandCaps, styles.brand, { color: puraReveal.muted }]}
                          >
                            {p.product.brand}
                          </Text>
                        </>
                      ) : (
                        <Text style={[puraRevealType.productName, { color: puraReveal.muted }]}>
                          Choose a product
                        </Text>
                      )}
                      <Text style={[puraRevealType.guidance, styles.guidance, { color: puraReveal.muted }]}>
                        {p.guidance}
                      </Text>
                    </View>

                    {p.packshot ? (
                      <Image source={p.packshot} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]} />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Completion meter */}
        <View style={styles.completion}>
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                { width: total > 0 ? `${(doneCount / total) * 100}%` : '0%' },
              ]}
            />
          </View>
          <View style={styles.completionLabelRow}>
            {allDone ? (
              <View style={styles.completeBadge}>
                <Check size={13} weight="bold" color={puraReveal.white} />
              </View>
            ) : null}
            <Text
              style={[
                allDone ? puraRevealType.focusPhrase : puraRevealType.stepMeta,
                { color: allDone ? puraReveal.ink : puraReveal.muted },
              ]}
            >
              {allDone ? 'Tonight’s routine complete.' : `${doneCount} of ${total} complete`}
            </Text>
          </View>
        </View>

        {/* Why these products */}
        {routine.explanation.length > 0 ? (
          <View style={styles.whyCard}>
            <Text style={[puraRevealType.cardTitle, styles.whyTitle, { color: puraReveal.ink }]}>
              Why these products?
            </Text>
            {routine.explanation.map((line) => (
              <View key={line} style={styles.whyRow}>
                <View style={styles.whyDot} />
                <Text style={[puraRevealType.body, styles.whyText, { color: puraReveal.muted }]}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <RevealLink label="How Pura works" onPress={onHowItWorks} tone="muted" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Done toggle — a checkbox that pops a green check on completion.
// ---------------------------------------------------------------------------

function DoneToggle({ done, onPress }: { done: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={done ? 'Mark step not done' : 'Mark step done'}
      style={({ pressed }) => [
        styles.doneToggle,
        done && styles.doneToggleOn,
        pressed && { opacity: 0.7 },
      ]}
    >
      <DoneDot done={done} />
      <Text
        style={[puraRevealType.stepMeta, { color: done ? puraReveal.done : puraReveal.muted }]}
      >
        Done
      </Text>
    </Pressable>
  );
}

function DoneDot({ done }: { done: boolean }) {
  const scale = useSharedValue(done ? 1 : 0.7);
  const op = useSharedValue(done ? 1 : 0);

  React.useEffect(() => {
    if (done) {
      scale.value = 0.7;
      scale.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.back(1.5)) });
      op.value = withTiming(1, { duration: 180 });
    } else {
      op.value = withTiming(0, { duration: 120 });
      scale.value = withTiming(0.7, { duration: 120 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.dot, done ? styles.dotOn : styles.dotOff]}>
      <Animated.View style={checkStyle}>
        <Check size={13} weight="bold" color={puraReveal.white} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraReveal.bg,
    alignItems: 'center',
  },
  scroll: {
    alignSelf: 'center',
    paddingHorizontal: puraRevealLayout.screenPadding,
    paddingTop: 6,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleSparkle: {
    marginLeft: 8,
  },
  dateLabel: {
    marginTop: 2,
  },

  // Section head
  sectionHead: {
    marginTop: 26,
    marginBottom: 14,
  },
  sectionMeta: {
    marginTop: 4,
  },

  // Timeline
  timeline: {
    width: '100%',
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineRowGap: {
    marginBottom: puraRevealLayout.cardGap,
  },
  rail: {
    width: 46,
    alignItems: 'center',
  },
  railLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    backgroundColor: puraReveal.connector,
  },
  railLineHidden: {
    backgroundColor: 'transparent',
  },
  railNumber: {
    paddingVertical: 6,
    backgroundColor: puraReveal.bg,
  },

  pillarCard: {
    flex: 1,
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    borderWidth: 1,
    borderColor: puraReveal.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...puraRevealShadow.card,
  },
  pillarCardDone: {
    backgroundColor: puraReveal.porcelainDeep,
    borderColor: 'transparent',
  },
  pillarCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillarCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 14,
  },
  pillarText: {
    flex: 1,
  },
  brand: {
    marginTop: 5,
  },
  guidance: {
    marginTop: 8,
  },
  thumb: {
    width: puraRevealLayout.thumb,
    height: puraRevealLayout.thumb,
    borderRadius: puraRevealRadius.thumb,
    backgroundColor: puraReveal.porcelain,
  },
  thumbEmpty: {
    borderWidth: 1,
    borderColor: puraReveal.border,
  },

  // Done toggle
  doneToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 4,
  },
  doneToggleOn: {
    opacity: 1,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOff: {
    borderWidth: 1.5,
    borderColor: puraReveal.veryMuted,
    backgroundColor: 'transparent',
  },
  dotOn: {
    backgroundColor: puraReveal.done,
  },

  // Completion meter
  completion: {
    marginTop: 22,
  },
  meterTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    backgroundColor: puraReveal.divider,
    overflow: 'hidden',
  },
  meterFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: puraReveal.done,
  },
  completionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  completeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: puraReveal.done,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Why these products
  whyCard: {
    marginTop: 24,
    backgroundColor: puraReveal.porcelain,
    borderRadius: puraRevealRadius.cardLg,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  whyTitle: {
    marginBottom: 12,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  whyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: puraReveal.blue,
    marginTop: 9,
    marginRight: 10,
  },
  whyText: {
    flex: 1,
  },

  footer: {
    alignItems: 'center',
    marginTop: 18,
  },
});
