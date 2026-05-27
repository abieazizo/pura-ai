import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';
import {
  useV25Dev,
  type AssistFixture,
  type ProductDetailFixture,
  type ProductsFixture,
  type ProgressFixture,
  type RoutineFixture,
} from '@/state/v25/devSwitch';
import type { DailyScanState } from '@/state/v25/types';
import { T, TYPE, RADIUS } from './tokens';

/**
 * v25 — Review-mode panel.
 *
 * Hidden by default. Opens via the long-press affordance on the redesigned
 * Home / Routine / Progress / Products headers. Lets reviewers cycle
 * through every documented state without exercising the backend.
 *
 * Designed to look quiet enough to be ignored in screenshots, but
 * functional enough to drive a full demo.
 */
export function ReviewPanel() {
  const open = useV25Dev((s) => s.panelOpen);
  const setOpen = useV25Dev((s) => s.setPanelOpen);
  const dailyScan = useV25Dev((s) => s.dailyScan);
  const setDailyScan = useV25Dev((s) => s.setDailyScan);
  const routine = useV25Dev((s) => s.routine);
  const setRoutine = useV25Dev((s) => s.setRoutine);
  const progress = useV25Dev((s) => s.progress);
  const setProgress = useV25Dev((s) => s.setProgress);
  const products = useV25Dev((s) => s.products);
  const setProducts = useV25Dev((s) => s.setProducts);
  const productDetail = useV25Dev((s) => s.productDetail);
  const setProductDetail = useV25Dev((s) => s.setProductDetail);
  const assist = useV25Dev((s) => s.assist);
  const setAssist = useV25Dev((s) => s.setAssist);

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => setOpen(false)}
    >
      <View style={s.scrim}>
        <Pressable style={s.scrimDismiss} onPress={() => setOpen(false)} />
        <SafeAreaView edges={['bottom']} style={s.sheet}>
          <View style={s.topRow}>
            <Text style={s.eyebrow}>REVIEW MODE</Text>
            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={10}
              accessibilityLabel="Close review panel"
              style={({ pressed }) => [s.close, pressed && { opacity: 0.6 }]}
            >
              <X size={16} color={T.ink} weight="bold" />
            </Pressable>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            <Section title="Home">
              {(
                [
                  ['no-valid-scan-today', 'No scan today'],
                  ['valid-scan-today', 'Valid scan today'],
                  ['failed-scan-today', 'Failed scan today'],
                  ['tonight-complete', 'Routine complete tonight'],
                ] as ReadonlyArray<[DailyScanState, string]>
              ).map(([v, l]) => (
                <Chip
                  key={v}
                  label={l}
                  selected={dailyScan === v}
                  onPress={() => setDailyScan(v)}
                />
              ))}
            </Section>

            <Section title="Routine · Today">
              {(
                [
                  ['in-progress-no-product', 'Step 2 missing product'],
                  ['in-progress-assigned-product', 'Step 2 assigned product'],
                  ['complete', 'All complete'],
                ] as ReadonlyArray<[RoutineFixture, string]>
              ).map(([v, l]) => (
                <Chip
                  key={v}
                  label={l}
                  selected={routine === v}
                  onPress={() => setRoutine(v)}
                />
              ))}
            </Section>

            <Section title="Routine · Progress">
              {(
                [
                  ['baseline-only', 'Baseline only'],
                  ['two-reliable', '2 reliable scans'],
                  ['failed-latest', 'Failed latest scan'],
                  ['four-plus', '4+ scans · chart'],
                ] as ReadonlyArray<[ProgressFixture, string]>
              ).map(([v, l]) => (
                <Chip
                  key={v}
                  label={l}
                  selected={progress === v}
                  onPress={() => setProgress(v)}
                />
              ))}
            </Section>

            <Section title="Products">
              {(
                [
                  ['empty', 'Empty'],
                  ['partial', 'Partial · missing SPF'],
                  ['populated', 'Populated · safe + paused'],
                ] as ReadonlyArray<[ProductsFixture, string]>
              ).map(([v, l]) => (
                <Chip
                  key={v}
                  label={l}
                  selected={products === v}
                  onPress={() => setProducts(v)}
                />
              ))}
            </Section>

            <Section title="Product detail">
              {(
                [
                  ['safe', 'Safe'],
                  ['conflict', 'Avoid now'],
                ] as ReadonlyArray<[ProductDetailFixture, string]>
              ).map(([v, l]) => (
                <Chip
                  key={v}
                  label={l}
                  selected={productDetail === v}
                  onPress={() => setProductDetail(v)}
                />
              ))}
            </Section>

            <Section title="AI Assist context">
              {(
                [
                  ['none', 'None · standalone'],
                  ['routine', 'From routine'],
                  ['product', 'From product'],
                  ['progress', 'From progress'],
                  ['failed-scan', 'From failed scan'],
                ] as ReadonlyArray<[AssistFixture, string]>
              ).map(([v, l]) => (
                <Chip
                  key={v}
                  label={l}
                  selected={assist === v}
                  onPress={() => setAssist(v)}
                />
              ))}
            </Section>

            <View style={{ height: 18 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{title}</Text>
      <View style={s.chips}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.chip,
        selected && s.chipOn,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[s.chipLabel, selected && s.chipLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: T.overlayDark, justifyContent: 'flex-end' },
  scrimDismiss: { flex: 1 },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    maxHeight: '78%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eyebrow: {
    fontFamily: TYPE.sansSemi,
    fontSize: 11,
    letterSpacing: 1.5,
    color: T.inkMuted,
    textTransform: 'uppercase',
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
  },
  scroll: { maxHeight: 520 },
  section: { marginTop: 14 },
  sectionLabel: {
    fontFamily: TYPE.sansSemi,
    fontSize: 12,
    color: T.ink,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
  },
  chipOn: {
    backgroundColor: T.terracottaSoft,
    borderColor: T.terracotta,
  },
  chipLabel: {
    fontFamily: TYPE.sansSemi,
    fontSize: 12.5,
    color: T.inkSecondary,
  },
  chipLabelOn: { color: T.terracottaDeep },
});
