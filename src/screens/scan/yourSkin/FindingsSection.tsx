/**
 * FindingsSection — Section C. Hierarchy that reads as a calm neutral page even
 * at six findings (hue lives ONLY on the level pills + the active map glow):
 *
 *   • HERO (findings[0]) — a RAISED card, always expanded, full anatomy.
 *   • SUPPORTING CAST — flush one-line rows (name + level pill), hairline
 *     separators, NO shadow. Tap expands in place to the same anatomy, lighter.
 *     Capped at 3 visible + "See N more" — never a wall of open cards.
 *   • SKIN AS A SYSTEM — supporting findings that feed the SAME plan move are
 *     grouped adjacently and bound by a quiet neutral connector + a plain
 *     "part of your … focus" eyebrow, so the user sees relationships, not
 *     isolated metrics. (The binding is shape + text, never hue.)
 *   • BIDIRECTIONAL SYNC — tapping the hero or a row SELECTS it (its glow blooms
 *     on the map); the selected finding carries a quiet active tick here.
 *
 * The map and this list are two views of one selection — and this list is the
 * full VoiceOver equivalent of the map (every finding + its place is reachable
 * here without the visual map at all).
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExpandedFinding } from './ExpandedFinding';
import { SUPPORTING, COPY2, TYPE, TYPE2, type ThemeTokens } from './yourSkinMotion';
import type { MetricTint } from '../firstFinding/metricTint';
import type { RoutineFocusMove, SkinReadFinding } from '@/types/skinRead';

export interface FindingsSectionProps {
  hero: SkinReadFinding | null;
  supporting: SkinReadFinding[];
  tintByFinding: Record<string, MetricTint>;
  tokens: ThemeTokens;
  reduceMotion: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  downweighted: Set<string>;
  onAgency: (id: string, verdict: 'confirm' | 'not_me') => void;
  justFindings: boolean;
  moves: RoutineFocusMove[];
  findingToMove: Record<string, string | undefined>;
}

interface GroupedRow {
  finding: SkinReadFinding;
  moveId: string | undefined;
  moveTitle: string | undefined;
  groupSize: number;
  groupStart: boolean;
  groupEnd: boolean;
}

export function FindingsSection(props: FindingsSectionProps) {
  const {
    hero, supporting, tintByFinding, tokens, selectedId, onSelect,
    downweighted, onAgency, justFindings, moves, findingToMove,
  } = props;

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // Order supporting so findings feeding the same plan move sit together.
  const grouped: GroupedRow[] = useMemo(() => {
    const moveIndex = (id: string | undefined) =>
      id ? moves.findIndex((m) => m.id === id) : moves.length;
    const decorated = supporting.map((f, i) => ({ f, i, mId: findingToMove[f.id] }));
    decorated.sort((a, b) => {
      const ga = moveIndex(a.mId);
      const gb = moveIndex(b.mId);
      return ga !== gb ? ga - gb : a.i - b.i;
    });
    // group sizes
    const counts = new Map<string, number>();
    for (const d of decorated) if (d.mId) counts.set(d.mId, (counts.get(d.mId) ?? 0) + 1);
    return decorated.map((d, idx) => {
      const size = d.mId ? counts.get(d.mId)! : 1;
      const prev = decorated[idx - 1];
      const next = decorated[idx + 1];
      const start = d.mId ? prev?.mId !== d.mId : true;
      const end = d.mId ? next?.mId !== d.mId : true;
      return {
        finding: d.f,
        moveId: d.mId,
        moveTitle: d.mId ? moves.find((m) => m.id === d.mId)?.title : undefined,
        groupSize: size,
        groupStart: start,
        groupEnd: end,
      };
    });
  }, [supporting, moves, findingToMove]);

  const visible = justFindings || showAll ? grouped : grouped.slice(0, SUPPORTING.visibleCap);
  const hiddenCount = grouped.length - visible.length;

  const toggleRow = (id: string) => {
    onSelect(id); // bidirectional: selecting drives the map glow
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View>
      {/* HERO — the header is the select target (no whole-card button wrap, so
          the agency buttons inside are never nested interactives). */}
      {hero && (
        <ExpandedFinding
          finding={hero}
          tint={tintByFinding[hero.id]}
          tokens={tokens}
          variant="hero"
          justFindings={justFindings}
          downweighted={downweighted.has(hero.id)}
          onAgency={(v) => onAgency(hero.id, v)}
          onHeaderPress={() => onSelect(hero.id)}
          selected={selectedId === hero.id}
        />
      )}

      {/* SUPPORTING */}
      {grouped.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <Text style={[TYPE2.sectionLabel, { color: tokens.label, marginBottom: 4 }]} maxFontSizeMultiplier={1.6}>
            {justFindings ? 'All findings' : COPY2.supportingHeader}
          </Text>

          {visible.map((row, idx) => {
            const f = row.finding;
            const selected = selectedId === f.id;
            // A map-marker tap selects a finding → its row surfaces (auto-opens).
            const open = justFindings || expandedRows.has(f.id) || selected;
            const groupedMember = row.groupSize >= 2;
            return (
              <View key={f.id}>
                {/* "Part of your … focus" — quiet, neutral, teaches the system. */}
                {groupShouldLabel(row) && (
                  <Text style={[TYPE2.quiet, { color: tokens.faint, fontSize: 12, marginTop: idx === 0 ? 2 : 12, marginBottom: 2 }]} maxFontSizeMultiplier={1.4}>
                    {`Part of your “${row.moveTitle}” focus`}
                  </Text>
                )}
                <View style={styles.rowOuter}>
                  {/* Neutral group connector (shape, not hue). */}
                  {groupedMemberGutter(row, groupedMember, tokens)}
                  <View style={{ flex: 1 }}>
                    <Pressable
                      onPress={() => toggleRow(f.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open, selected }}
                      accessibilityLabel={`${f.name}, ${f.level}${f.spots[0] ? `, ${f.spots[0].place}` : ''}`}
                      style={[
                        styles.row,
                        { borderTopColor: tokens.depth.hairline },
                        idx === 0 && { borderTopWidth: 0 },
                        selected && { borderLeftColor: tokens.accent, borderLeftWidth: 2, paddingLeft: 8, marginLeft: -10 },
                      ]}
                    >
                      <Text style={[TYPE.name, { color: tokens.name, fontSize: 15, flex: 1, opacity: downweighted.has(f.id) ? 0.5 : 1 }]} numberOfLines={open ? undefined : 1} maxFontSizeMultiplier={1.6}>
                        {f.name}
                      </Text>
                      {f.metric !== 'positive' && (
                        <View style={[styles.pill, { backgroundColor: tintByFinding[f.id].pillBg }]}>
                          <Text style={[TYPE.pill, { color: tintByFinding[f.id].pillText }]} maxFontSizeMultiplier={1.3}>
                            {f.level}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.chevron, { color: tokens.faint, transform: [{ rotate: open ? '90deg' : '0deg' }] }]}>›</Text>
                    </Pressable>
                    {open && (
                      <View style={styles.rowExpanded}>
                        <ExpandedFinding
                          finding={f}
                          tint={tintByFinding[f.id]}
                          tokens={tokens}
                          variant="supporting"
                          justFindings={justFindings}
                          downweighted={downweighted.has(f.id)}
                          onAgency={(v) => onAgency(f.id, v)}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {!justFindings && hiddenCount > 0 && (
            <Pressable onPress={() => setShowAll(true)} accessibilityRole="button" style={styles.seeMore}>
              <Text style={[TYPE2.quiet, { color: tokens.accent }]} maxFontSizeMultiplier={1.5}>
                {COPY2.seeMore(hiddenCount)}
              </Text>
            </Pressable>
          )}
          {!justFindings && showAll && grouped.length > SUPPORTING.visibleCap && (
            <Pressable onPress={() => setShowAll(false)} accessibilityRole="button" style={styles.seeMore}>
              <Text style={[TYPE2.quiet, { color: tokens.faint }]} maxFontSizeMultiplier={1.5}>
                {COPY2.seeFewer}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/** Only the FIRST member of a real group (size ≥ 2) shows the focus eyebrow. */
function groupShouldLabel(row: GroupedRow): boolean {
  return row.groupSize >= 2 && row.groupStart && !!row.moveTitle;
}

/** A quiet neutral left connector binding the members of one group. */
function groupedMemberGutter(row: GroupedRow, grouped: boolean, tokens: ThemeTokens) {
  if (!grouped) return <View style={{ width: 14 }} />;
  return (
    <View style={{ width: 14, alignItems: 'center' }}>
      <View
        style={{
          position: 'absolute',
          top: row.groupStart ? 16 : 0,
          bottom: row.groupEnd ? 'auto' : 0,
          height: row.groupEnd ? 16 : undefined,
          width: 1,
          backgroundColor: tokens.depth.hairline,
        }}
      />
      <View style={{ marginTop: 16, width: 5, height: 5, borderRadius: 2.5, backgroundColor: tokens.faint }} />
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {},
  rowOuter: { flexDirection: 'row', alignItems: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth },
  rowExpanded: { paddingBottom: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chevron: { fontSize: 20, fontFamily: 'Inter-Regular', width: 14, textAlign: 'center' },
  seeMore: { paddingVertical: 12, alignItems: 'flex-start' },
});
