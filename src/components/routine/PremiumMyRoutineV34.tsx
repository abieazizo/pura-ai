/**
 * PremiumMyRoutineV34 — clean My Routine view.
 *
 * AM/PM toggle. Vertical step list. Each step card shows:
 *   • step number badge
 *   • step type label (Cleanse / Treat / Moisturize / Protect)
 *   • product name when present
 *   • short use instruction (frequency + tip)
 *   • optional duration
 *
 * No clutter. Designed to feel like the final, calm output of the
 * whole scan flow.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CaretLeft, Clock, Drop, Leaf, Shield, Sun, Sparkle } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CustomRoutine, RoutineStep } from '@/types/routine';
import type { ScanFlowViewModel } from '@/state/scanFlowV34';
import { premiumPalette as C, premiumType as T } from '../scan-results/PremiumScanResultsV34';

export interface PremiumMyRoutineV34Props {
  routine: CustomRoutine;
  vm: ScanFlowViewModel;
  onBack(): void;
  onStartSession?(time: 'morning' | 'evening'): void;
}

export function PremiumMyRoutineV34({
  routine,
  vm,
  onBack,
  onStartSession,
}: PremiumMyRoutineV34Props) {
  const [time, setTime] = useState<'morning' | 'evening'>('morning');
  const steps = time === 'morning' ? routine.morningSteps : routine.eveningSteps;
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.headerBtn}>
          <CaretLeft size={18} weight="bold" color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>My Routine</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={T.eyebrow}>BUILT FROM YOUR SCAN</Text>
          <Text style={[T.serifHeadline, { marginTop: 8 }]}>
            Your daily{'\n'}
            <Text style={[T.serifHeadline, { fontFamily: 'InstrumentSerif-Italic', color: C.coral }]}>
              routine
            </Text>
          </Text>
          <Text style={[T.body, { marginTop: 8 }]}>
            {vm.routineSeed.skinNeeds.join(' · ')}
          </Text>
        </View>

        <Toggle time={time} onChange={setTime} />

        {steps.length === 0 ? (
          <EmptyState time={time} />
        ) : (
          <View style={styles.stepList}>
            {steps.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i + 1}
                tagline={
                  vm.routineSeed.stepTaglines[
                    stepTypeKey(step.type)
                  ] ?? step.purpose
                }
              />
            ))}
          </View>
        )}

        {routine.explanation.length > 0 ? (
          <View style={styles.whyCard}>
            <Text style={T.label}>WHY THIS ROUTINE</Text>
            {routine.explanation.slice(0, 3).map((line, i) => (
              <View key={`why-${i}`} style={styles.whyRow}>
                <View style={styles.whyDot} />
                <Text style={[T.body, { flex: 1, color: C.ink }]}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {onStartSession ? (
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.startBtn}
            onPress={() => onStartSession(time)}
          >
            <Text style={styles.startLabel}>
              Start {time === 'morning' ? 'AM' : 'PM'} routine
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Toggle({
  time,
  onChange,
}: {
  time: 'morning' | 'evening';
  onChange(t: 'morning' | 'evening'): void;
}) {
  return (
    <View style={styles.toggle}>
      <Pressable
        style={[styles.toggleBtn, time === 'morning' && styles.toggleBtnActive]}
        onPress={() => onChange('morning')}
      >
        <Sun
          size={14}
          weight="duotone"
          color={time === 'morning' ? '#FFFFFF' : C.ink}
        />
        <Text
          style={[
            styles.toggleLabel,
            time === 'morning' && styles.toggleLabelActive,
          ]}
        >
          Morning
        </Text>
      </Pressable>
      <Pressable
        style={[styles.toggleBtn, time === 'evening' && styles.toggleBtnActive]}
        onPress={() => onChange('evening')}
      >
        <Sparkle
          size={14}
          weight="duotone"
          color={time === 'evening' ? '#FFFFFF' : C.ink}
        />
        <Text
          style={[
            styles.toggleLabel,
            time === 'evening' && styles.toggleLabelActive,
          ]}
        >
          Evening
        </Text>
      </Pressable>
    </View>
  );
}

function StepCard({
  step,
  index,
  tagline,
}: {
  step: RoutineStep;
  index: number;
  tagline: string;
}) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeNum}>{index}</Text>
        </View>
        <View style={styles.stepIcon}>{stepIcon(step.type)}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepKicker}>{stepTypeLabel(step.type)}</Text>
        </View>
        <View style={styles.freqPill}>
          <Clock size={11} color={C.muted} weight="duotone" />
          <Text style={styles.freqLabel}>{step.frequency}</Text>
        </View>
      </View>

      {step.product ? (
        <View style={styles.productBlock}>
          <Text style={styles.productBrand}>{step.product.brand}</Text>
          <Text style={styles.productName} numberOfLines={2}>
            {step.product.name}
          </Text>
        </View>
      ) : null}

      <Text style={[T.body, styles.stepBody]}>{tagline}</Text>
      {step.directions ? (
        <Text style={[T.caption, { marginTop: 6 }]}>{step.directions}</Text>
      ) : null}
    </View>
  );
}

function EmptyState({ time }: { time: 'morning' | 'evening' }) {
  return (
    <View style={styles.empty}>
      <Text style={T.label}>NO STEPS YET</Text>
      <Text style={[T.body, { marginTop: 8 }]}>
        Your {time === 'morning' ? 'morning' : 'evening'} routine will appear
        here once the build completes.
      </Text>
    </View>
  );
}

function stepIcon(type: RoutineStep['type']) {
  const props = { size: 16, color: C.coral, weight: 'duotone' as const };
  switch (type) {
    case 'cleanse':
      return <Drop {...props} />;
    case 'treat':
      return <Sparkle {...props} />;
    case 'hydrate':
      return <Leaf {...props} />;
    case 'protect':
      return <Shield {...props} />;
  }
}

function stepTypeKey(
  type: RoutineStep['type'],
): 'cleanse' | 'treat' | 'moisturize' | 'protect' {
  if (type === 'hydrate') return 'moisturize';
  return type;
}

function stepTypeLabel(type: RoutineStep['type']): string {
  if (type === 'hydrate') return 'Moisturize';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.cardElevated,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: C.ink,
    letterSpacing: 0.5,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 110,
  },
  titleBlock: {
    marginTop: 4,
    marginBottom: 18,
  },

  toggle: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    backgroundColor: C.bgSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 18,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  toggleBtnActive: {
    backgroundColor: C.coral,
  },
  toggleLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: C.ink,
    letterSpacing: -0.1,
  },
  toggleLabelActive: { color: '#FFFFFF' },

  stepList: { gap: 12 },
  stepCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.line,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.bgSoft,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: C.muted,
  },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.coralBgVeil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    color: C.ink,
    letterSpacing: -0.2,
  },
  stepKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.5,
    color: C.coral,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  freqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.bgSoft,
    borderWidth: 1,
    borderColor: C.line,
  },
  freqLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
    color: C.muted,
    letterSpacing: 0.2,
  },
  productBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  productBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: C.muted,
    textTransform: 'uppercase',
  },
  productName: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: C.ink,
    marginTop: 4,
  },
  stepBody: {
    marginTop: 10,
  },
  empty: {
    padding: 22,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
  },

  whyCard: {
    marginTop: 16,
    padding: 18,
    backgroundColor: C.bgSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    gap: 10,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  whyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.coral,
    marginTop: 7,
  },

  bottomBar: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 22,
  },
  startBtn: {
    backgroundColor: C.coral,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
