import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hapt } from '@/utils/haptics';
import { plan } from './tokens';

export interface StarterRoutinePreviewProps {
  onStart?: () => void;
  onPersonalize?: () => void;
}

interface StarterRow {
  step: number;
  title: string;
  body: string;
  badge: 'Optional' | 'Helpful' | 'Priority' | 'Required';
}

const ROWS: StarterRow[] = [
  {
    step: 1,
    title: 'Cleanse or rinse',
    body: 'Use a gentle cleanser, or rinse with water if skin feels dry.',
    badge: 'Optional',
  },
  {
    step: 2,
    title: 'Hydrate',
    body: 'Add lightweight hydration if your skin feels tight.',
    badge: 'Helpful',
  },
  {
    step: 3,
    title: 'Moisturize',
    body: 'Lock in hydration and support the barrier.',
    badge: 'Priority',
  },
  {
    step: 4,
    title: 'SPF',
    body: 'Finish with broad-spectrum SPF 30+.',
    badge: 'Required',
  },
];

/**
 * Compact starter-routine card surfaced below the ScanNeededHero.
 *
 * Reads as a preview, not a duplicate of the action cards — four short
 * rows with a calm priority chip per row. The user can start the
 * starter routine directly (becomes the Today plan) or jump straight to
 * scanning to personalize.
 *
 * The SPF row's "Required" pill uses a warm tint (no loud warning) so
 * it pulls attention without screaming.
 */
export function StarterRoutinePreview({
  onStart,
  onPersonalize,
}: StarterRoutinePreviewProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        STARTER ROUTINE
      </Text>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>
        Safe until your first scan
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.25}>
        Pura keeps this simple before reading your skin: protect the barrier,
        avoid harsh changes, and keep SPF consistent.
      </Text>

      <View style={styles.rows}>
        {ROWS.map((r) => (
          <View key={r.step} style={styles.row}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber} maxFontSizeMultiplier={1.1}>
                {r.step}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text
                  style={styles.rowTitle}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}
                >
                  {r.title}
                </Text>
                <BadgePill kind={r.badge} />
              </View>
              <Text
                style={styles.rowBody}
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
              >
                {r.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {onStart || onPersonalize ? (
        <View style={styles.ctaRow}>
          {onStart ? (
            <Pressable
              onPress={() => {
                hapt.tap();
                onStart();
              }}
              accessibilityRole="button"
              accessibilityLabel="Start starter routine"
              style={({ pressed }) => [
                styles.primaryCta,
                pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
              ]}
            >
              <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
                Start starter routine
              </Text>
            </Pressable>
          ) : null}
          {onPersonalize ? (
            <Pressable
              onPress={() => {
                hapt.select();
                onPersonalize();
              }}
              accessibilityRole="button"
              accessibilityLabel="Personalize with scan"
              style={({ pressed }) => [
                styles.secondaryCta,
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={4}
            >
              <Text
                style={styles.secondaryCtaLabel}
                maxFontSizeMultiplier={1.15}
              >
                Personalize with scan
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function BadgePill({ kind }: { kind: StarterRow['badge'] }) {
  const map: Record<
    StarterRow['badge'],
    { bg: string; fg: string }
  > = {
    Optional: { bg: '#F1F5F9', fg: plan.inkMuted },
    Helpful: { bg: plan.softBlue, fg: plan.brand },
    Priority: { bg: plan.successSoft, fg: plan.success },
    Required: { bg: plan.warningSoft, fg: plan.warning },
  };
  const c = map[kind];
  return (
    <View style={[badgeStyles.pill, { backgroundColor: c.bg }]}>
      <Text
        style={[badgeStyles.label, { color: c.fg }]}
        maxFontSizeMultiplier={1.1}
      >
        {kind}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: plan.card,
    borderWidth: 1,
    borderColor: plan.border,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: plan.inkMuted,
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: plan.ink,
    marginTop: 6,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: plan.inkSecondary,
    marginTop: 8,
  },
  rows: {
    marginTop: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: plan.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: plan.brand,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: plan.ink,
    letterSpacing: -0.1,
  },
  rowBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: plan.inkSecondary,
    marginTop: 2,
  },
  ctaRow: {
    marginTop: 18,
    gap: 4,
  },
  primaryCta: {
    height: 48,
    borderRadius: 999,
    backgroundColor: plan.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  secondaryCta: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: plan.inkSecondary,
    textDecorationLine: 'underline',
  },
});

const badgeStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
