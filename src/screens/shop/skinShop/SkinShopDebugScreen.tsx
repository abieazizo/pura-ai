/**
 * SkinShopDebugScreen — TEMPORARY readout that proves `useSkinShop` is real.
 *
 * Not a designed surface (the redesign is the next prompt). It renders the raw
 * engine model as plain text so the wiring is verifiable on-device / in the web
 * preview: every pick + the finding it's tied to + its label + whether its
 * restock data is REAL or ABSENT, plus the collection, the concern filter, and
 * the honesty flags. The dev buttons let you watch the model react: seed a
 * scan + routine, then "confirm" a product to see restock turn real (the only
 * honest way it ever does).
 *
 * Reached via `?screen=shop-debug` on web (App.tsx). Delete with the redesign.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { useSkinShop } from './useSkinShop';
import type { ConcernPick, CollectionItem } from './types';

const DEMO_ROUTINE: { id: string; slot: 'morning' | 'evening' }[] = [
  { id: 'cerave-hydrating-cleanser', slot: 'morning' },
  { id: 'paulas-choice-2-bha', slot: 'evening' },
  { id: 'beauty-of-joseon-relief-sun', slot: 'morning' },
];

const ink = '#EAF0FA';
const dim = 'rgba(214,224,240,0.62)';
const good = '#74D6A8';
const warn = '#F2C879';
const bg = '#0A0B12';

export function SkinShopDebugScreen() {
  const model = useSkinShop();
  const devLoadPopulated = useAppStore((s) => s.devLoadPopulated);
  const addUserRoutineProduct = useAppStore((s) => s.addUserRoutineProduct);
  const confirmProductObtained = useAppStore((s) => s.confirmProductObtained);
  const clearProductObtained = useAppStore((s) => s.clearProductObtained);
  const [, force] = useState(0);

  const seed = useCallback(() => {
    devLoadPopulated();
    for (const r of DEMO_ROUTINE) addUserRoutineProduct(r.slot, r.id);
    force((n) => n + 1);
  }, [devLoadPopulated, addUserRoutineProduct]);

  const simulateGot = useCallback(() => {
    const iso = new Date(Date.now() - 80 * 86_400_000).toISOString();
    confirmProductObtained('paulas-choice-2-bha', iso);
    force((n) => n + 1);
  }, [confirmProductObtained]);

  const clearConfirms = useCallback(() => {
    for (const r of DEMO_ROUTINE) clearProductObtained(r.id);
    force((n) => n + 1);
  }, [clearProductObtained]);

  const restockSummary = useMemo(() => {
    const real = model.collection.filter((c) => c.restock.isReal).length;
    return `${real}/${model.collection.length} items have REAL restock data`;
  }, [model.collection]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>useSkinShop — debug readout</Text>
      <Text style={styles.status}>
        status: <Text style={{ color: model.status === 'ready' ? good : warn }}>{model.status}</Text>
      </Text>

      <View style={styles.row}>
        <Btn label="Seed scan + routine" onPress={seed} />
        <Btn label="Simulate: got BHA 80d ago" onPress={simulateGot} />
        <Btn label="Clear confirmations" onPress={clearConfirms} />
      </View>

      {model.status === 'notScanned' ? (
        <Section title="EMPTY STATE">
          <Text style={styles.dim}>No scan → notScanned. Zero products (never a catalog). Tap “Seed scan + routine”.</Text>
        </Section>
      ) : null}

      <Section title={`CONCERNS (scan language) · ${model.concerns.length}`}>
        {model.concerns.length === 0 ? <Text style={styles.dim}>—</Text> : null}
        {model.concerns.map((c) => (
          <Text key={c.concern} style={styles.line}>
            <Swatch hex={c.tintHex} /> {c.label}{' '}
            <Text style={styles.dim}>({c.concern} · {c.count} pick{c.count === 1 ? '' : 's'})</Text>
          </Text>
        ))}
      </Section>

      <Section title={`FOR-YOUR-CONCERNS PICKS · ${model.picks.length}`}>
        {model.picks.length === 0 ? <Text style={styles.dim}>—</Text> : null}
        {model.picks.map((p) => (
          <PickRow key={`${p.forFindingId}:${p.product.id}`} p={p} />
        ))}
      </Section>

      <Section title={`THE COLLECTION (kept routine) · ${model.collection.length}`}>
        <Text style={styles.dim}>{restockSummary}</Text>
        {model.featuredRestock ? (
          <Text style={[styles.line, { color: warn }]}>
            ★ featuredRestock: {model.featuredRestock.product.name} ({model.featuredRestock.restock.daysLeft}d left)
          </Text>
        ) : (
          <Text style={styles.dim}>featuredRestock: none (no real restock estimate)</Text>
        )}
        {model.collection.map((c) => (
          <CollectionRow key={c.product.id} c={c} />
        ))}
      </Section>

      <Section title="CONCERN FILTER (proof)">
        {model.concerns.map((c) => {
          const subset = model.filterPicksByConcern(c.concern);
          return (
            <Text key={c.concern} style={styles.line}>
              filter “{c.label}” → {subset.length} pick(s): {' '}
              <Text style={styles.dim}>{subset.map((p) => p.product.id).join(', ') || '—'}</Text>
            </Text>
          );
        })}
      </Section>

      <Section title="HONESTY FLAGS (always true)">
        <Text style={styles.line}>• {model.honesty.worksWithoutBuying}</Text>
        <Text style={styles.line}>• {model.honesty.affiliateDisclosure}</Text>
        <Text style={styles.line}>• {model.honesty.restockHonesty}</Text>
      </Section>
    </ScrollView>
  );
}

function PickRow({ p }: { p: ConcernPick }) {
  return (
    <View style={styles.card}>
      <Text style={styles.line}>
        <Swatch hex={p.echo.tintHex} /> {p.product.brand} — {p.product.name}
      </Text>
      <Text style={styles.dim}>
        for finding: {p.forFindingId} · {p.echo.label} · strength {p.echo.strength.toFixed(2)}
        {p.echo.direction ? ` · ${p.echo.direction}` : ''}
      </Text>
      <Text style={styles.meta}>
        why: <Text style={{ color: ink }}>{p.whyLine}</Text>
      </Text>
      <Text style={styles.meta}>
        label: <Label v={p.label} />
        {'  '}price: {p.priceUsd != null ? `$${p.priceUsd}` : '—'} ({p.product.priceTier})
        {'  '}fit: {p.fitScore}
        {p.lessNeededNow ? '   ⤵ less needed now' : ''}
      </Text>
      <Text style={styles.meta}>
        budget alt:{' '}
        {p.budgetAlternative
          ? <Text style={{ color: good }}>{p.budgetAlternative.name} (${p.budgetAlternative.priceUsd})</Text>
          : <Text style={styles.dim}>none (pick is budget)</Text>}
      </Text>
    </View>
  );
}

function CollectionRow({ c }: { c: CollectionItem }) {
  const r = c.restock;
  return (
    <View style={styles.card}>
      <Text style={styles.line}>{c.product.brand} — {c.product.name} <Text style={styles.dim}>({c.slot})</Text></Text>
      <Text style={styles.meta}>
        restock data:{' '}
        {r.isReal
          ? <Text style={{ color: r.restockSoon ? warn : good }}>REAL · {r.restockSoon ? 'running low' : 'stocked'} · {r.daysLeft}d left</Text>
          : <Text style={styles.dim}>ABSENT · plain reorder · restockSoon={String(r.restockSoon)}</Text>}
      </Text>
      <Text style={styles.meta}>lifespan: {r.typicalLifespanDays ?? '—'}d · gotAt: {r.confirmedGotAt ?? '—'}</Text>
      <Text style={styles.meta}>{r.reason}</Text>
    </View>
  );
}

function Label({ v }: { v: ConcernPick['label'] }) {
  const color = v === 'good_match' ? good : v === 'optional' ? ink : dim;
  const text = v === 'good_match' ? 'good match' : v === 'optional' ? 'optional' : 'you can skip this for now';
  return <Text style={{ color }}>{text}</Text>;
}

function Swatch({ hex }: { hex: string }) {
  return <Text style={{ color: hex }}>●</Text>;
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && { backgroundColor: 'rgba(20,124,255,0.28)' }]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  content: { padding: 18, paddingTop: 56, paddingBottom: 80 },
  h1: { color: ink, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  status: { color: dim, fontSize: 13, marginBottom: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  section: { marginTop: 18 },
  h2: { color: '#9CC5FF', fontSize: 12, letterSpacing: 1, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: 'rgba(214,224,240,0.05)', borderRadius: 10, padding: 11, marginBottom: 8 },
  line: { color: ink, fontSize: 14, lineHeight: 20, marginBottom: 2 },
  meta: { color: dim, fontSize: 12.5, lineHeight: 18 },
  dim: { color: dim, fontSize: 13 },
  btn: { backgroundColor: 'rgba(20,124,255,0.16)', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
  btnText: { color: '#9CC5FF', fontSize: 12.5, fontWeight: '600' },
});
