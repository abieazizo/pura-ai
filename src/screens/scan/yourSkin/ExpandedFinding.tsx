/**
 * ExpandedFinding — the full anatomy of one finding, shared by the HERO
 * (raised, always open) and by a SUPPORTING row when it expands in place
 * (lighter, no big shadow). Anatomy: name + plain-word level pill, the model's
 * own rows (What I see / What it means / THE MOVE), an italic confidence line,
 * and PER-FINDING AGENCY — a quiet "Sound right?" with soft confirm / "Not me".
 *
 * "Not me" never gates anything; it gently down-weights the finding (the parent
 * persists it), which clears its map emphasis AND its plan influence. The card
 * then reads as eased-off, with a quiet undo.
 *
 * "Just the findings" strips the warm scaffolding (the reassuring "what it
 * means" line + the agency prompt) for bluntness-seekers — the content was
 * already direct; gentleness lived in the framing, so only the framing goes.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { LAYOUT, TYPE, COPY2, TYPE2, type ThemeTokens } from './yourSkinMotion';
import type { MetricTint } from '../firstFinding/metricTint';
import type { SkinReadFinding } from '@/types/skinRead';

export interface ExpandedFindingProps {
  finding: SkinReadFinding;
  tint: MetricTint;
  tokens: ThemeTokens;
  variant: 'hero' | 'supporting';
  justFindings: boolean;
  downweighted: boolean;
  onAgency: (verdict: 'confirm' | 'not_me') => void;
}

export function ExpandedFinding({
  finding, tint, tokens, variant, justFindings, downweighted, onAgency,
}: ExpandedFindingProps) {
  const isPositive = finding.metric === 'positive';
  const hero = variant === 'hero';

  const body = (
    <View style={hero ? styles.heroBody : styles.supBody} accessible accessibilityRole="summary">
      {/* Header — name + level pill (plain word, no number). */}
      <View style={styles.header}>
        <Text
          style={[hero ? TYPE.name : TYPE2.tag, { color: tokens.name, flex: 1, fontSize: hero ? 17 : 15 }]}
          maxFontSizeMultiplier={1.6}
          accessibilityRole="header"
        >
          {finding.name}
        </Text>
        {!isPositive && (
          <View style={[styles.pill, { backgroundColor: tint.pillBg }]}>
            <Text style={[TYPE.pill, { color: tint.pillText }]} maxFontSizeMultiplier={1.3}>
              {finding.level}
            </Text>
          </View>
        )}
      </View>

      {!!finding.whatISee && (
        <Row label="What I see" value={finding.whatISee} tokens={tokens} />
      )}
      {!justFindings && !!finding.whatItMeans && (
        <Row label="What it means" value={finding.whatItMeans} tokens={tokens} />
      )}
      {!!finding.doThis && (
        <View style={styles.move}>
          <Text style={[TYPE.moveLabel, { color: tint.pillText }]} maxFontSizeMultiplier={1.4}>
            The move
          </Text>
          <Text style={[TYPE.body, { color: tokens.body, marginTop: 2 }]} maxFontSizeMultiplier={1.8}>
            {finding.doThis}
          </Text>
        </View>
      )}

      <Text style={[TYPE.confidence, { color: tokens.label, marginTop: LAYOUT.cardRowGap }]} maxFontSizeMultiplier={1.6}>
        {finding.howSure}
      </Text>

      {/* Per-finding agency. */}
      {!justFindings && (
        downweighted ? (
          <View style={[styles.agencyRow, { marginTop: LAYOUT.cardRowGap + 2 }]}>
            <Text style={[TYPE2.quiet, { color: tokens.label, flex: 1 }]} maxFontSizeMultiplier={1.5}>
              {COPY2.downweighted}
            </Text>
            <AgencyChip label="Undo" tokens={tokens} onPress={() => onAgency('confirm')} subtle />
          </View>
        ) : (
          <View style={[styles.agencyRow, { marginTop: LAYOUT.cardRowGap + 2 }]}>
            <Text style={[TYPE2.quiet, { color: tokens.label, marginRight: 8 }]} maxFontSizeMultiplier={1.5}>
              {COPY2.soundRight}
            </Text>
            <AgencyChip label={COPY2.confirmYes} tokens={tokens} onPress={() => onAgency('confirm')} />
            <AgencyChip label={COPY2.confirmNo} tokens={tokens} onPress={() => onAgency('not_me')} subtle />
          </View>
        )
      )}
    </View>
  );

  if (!hero) {
    return <View style={{ opacity: downweighted ? 0.55 : 1 }}>{body}</View>;
  }

  // Hero — raised card (two shadows + hairline + 1% surface + inner highlight).
  return (
    <View
      style={[
        styles.heroCard,
        {
          borderRadius: LAYOUT.cardRadius,
          borderColor: tokens.depth.hairline,
          opacity: downweighted ? 0.6 : 1,
          boxShadow: [
            { offsetX: 0, offsetY: tokens.depth.contact.offsetY, blurRadius: tokens.depth.contact.blur, spreadDistance: 0, color: tokens.depth.contact.color },
            { offsetX: 0, offsetY: tokens.depth.ambient.offsetY, blurRadius: tokens.depth.ambient.blur, spreadDistance: 0, color: tokens.depth.ambient.color },
          ],
        } as ViewStyle,
      ]}
    >
      <LinearGradient colors={tokens.depth.surface} style={[StyleSheet.absoluteFill, { borderRadius: LAYOUT.cardRadius }]} pointerEvents="none" />
      <LinearGradient colors={[tokens.depth.innerHighlight, 'transparent']} style={styles.innerHighlight} pointerEvents="none" />
      {body}
    </View>
  );
}

function Row({ label, value, tokens }: { label: string; value: string; tokens: ThemeTokens }) {
  return (
    <Text style={[TYPE.body, { color: tokens.body, marginTop: LAYOUT.cardRowGap }]} maxFontSizeMultiplier={1.8}>
      <Text style={[TYPE.rowLabel, { color: tokens.label }]}>{label}: </Text>
      {value}
    </Text>
  );
}

function AgencyChip({ label, tokens, onPress, subtle }: { label: string; tokens: ThemeTokens; onPress: () => void; subtle?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[
        styles.agencyChip,
        {
          borderColor: tokens.depth.hairline,
          backgroundColor: subtle ? 'transparent' : (tokens.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(8,10,15,0.04)'),
        },
      ]}
    >
      <Text style={[TYPE2.quiet, { color: subtle ? tokens.label : tokens.body, fontSize: 13 }]} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroCard: { width: '100%', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  innerHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 28 },
  heroBody: { padding: LAYOUT.cardPadding },
  supBody: { paddingTop: 12, paddingBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  move: { marginTop: LAYOUT.cardRowGap + 2 },
  agencyRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  agencyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
