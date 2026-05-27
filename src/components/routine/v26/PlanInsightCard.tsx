import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { Body, SectionHeading, Surface } from './primitives';
import { hapt } from '@/utils/haptics';
import { V26, V26_TYPE } from './tokens';

type InsightTone = 'watch' | 'improving' | 'learning';

interface PlanInsightRow {
  tone: InsightTone;
  label: string;
  title: string;
  body: string;
  onLink?: () => void;
  linkLabel?: string;
}

interface PlanInsightCardProps {
  rows?: PlanInsightRow[];
}

const DEFAULT_ROWS: PlanInsightRow[] = [
  {
    tone: 'watch',
    label: 'WATCH TONIGHT',
    title: 'Chin remains active',
    body: 'We kept strong treatments out.',
    linkLabel: 'Chin',
  },
  {
    tone: 'improving',
    label: 'IMPROVING',
    title: 'Hydration looks calmer',
    body: 'Keep your moisturizer tonight.',
  },
  {
    tone: 'learning',
    label: 'STILL LEARNING',
    title: 'Dark marks',
    body: 'Two more scans before comparisons.',
  },
];

/**
 * v26 — What changed your plan.
 *
 * Each row connects an observable signal to the routine decision it
 * produced. No alert colors — tone is communicated through eyebrow,
 * indicator shape, and typography weight.
 */
export function PlanInsightCard({ rows = DEFAULT_ROWS }: PlanInsightCardProps) {
  return (
    <Surface tone="surface" style={s.card}>
      <SectionHeading style={s.heading}>What changed your plan</SectionHeading>
      <View style={s.list}>
        {rows.map((row, idx) => (
          <View
            key={`${row.label}-${idx}`}
            style={[s.row, idx === rows.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Indicator tone={row.tone} />
            <View style={{ flex: 1 }}>
              <Text style={[s.label, labelColor(row.tone)]} maxFontSizeMultiplier={1.15}>
                {row.label}
              </Text>
              <Text style={s.title} maxFontSizeMultiplier={1.2}>
                {row.title}
              </Text>
              <Body style={s.body}>{row.body}</Body>
              {row.onLink && row.linkLabel ? (
                <Text
                  accessibilityRole="button"
                  accessibilityLabel={row.linkLabel}
                  onPress={() => {
                    hapt.tap();
                    row.onLink?.();
                  }}
                  style={s.link}
                  maxFontSizeMultiplier={1.15}
                >
                  {row.linkLabel}
                  <Text style={s.linkArrow}>  ›</Text>
                </Text>
              ) : null}
            </View>
            {row.onLink ? (
              <CaretRight size={14} color={V26.inkMuted} weight="bold" />
            ) : null}
          </View>
        ))}
      </View>
    </Surface>
  );
}

function Indicator({ tone }: { tone: InsightTone }) {
  if (tone === 'watch') {
    return <View style={[s.dot, { backgroundColor: V26.terracotta }]} />;
  }
  if (tone === 'improving') {
    return (
      <View style={[s.dot, s.dotOutline, { borderColor: V26.positive, backgroundColor: V26.positiveWash }]}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: V26.positive }} />
      </View>
    );
  }
  return <View style={[s.dot, s.dotLearning]} />;
}

function labelColor(tone: InsightTone) {
  if (tone === 'watch') return { color: V26.terracottaText };
  if (tone === 'improving') return { color: V26.positive };
  return { color: V26.inkMuted };
}

const s = StyleSheet.create({
  card: {
    paddingVertical: 16,
  },
  heading: {
    marginBottom: 6,
  },
  list: {
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V26.border,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 6,
  },
  dotOutline: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLearning: {
    backgroundColor: V26.surface,
    borderWidth: 1.5,
    borderColor: V26.borderStrong,
  },
  label: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 16,
    color: V26.ink,
    letterSpacing: -0.1,
    marginTop: 6,
  },
  body: {
    marginTop: 4,
    color: V26.inkSecondary,
    fontSize: 14.5,
    lineHeight: 20,
  },
  link: {
    marginTop: 10,
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13,
    color: V26.terracottaText,
  },
  linkArrow: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13,
  },
});
