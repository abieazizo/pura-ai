/**
 * ProductsScreen — "The Skin Edit" (v27).
 *
 * The Products tab is no longer a catalog. It opens directly into an
 * editorial recommendation narrative built from today's scan + the
 * user's routine state:
 *
 *   1. Editorial header + scan-state label
 *   2. Editorial statement + three scan evidence markers
 *   3. Hero recommendation (PURA'S NEXT STEP)
 *   4. Honesty interruption ("Excellent later, not first")
 *   5. Tonight's priorities (ranked)
 *   6. The Edit — segmented control (Use tonight / Add next / Keep gentle / Skip for now)
 *   7. Explore another concern (secondary)
 *   8. 84-day product plan
 *
 * Browsing, search, and decision-lens controls remain accessible but
 * never dominate the first viewport.
 *
 * Per the project's "no patch loops" rule: ALL recommendation logic
 * lives in src/state/skinEdit.ts. This screen is a presentation
 * surface only.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MagnifyingGlass, SlidersHorizontal } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import {
  buildConcernEdit,
  buildRoutineState,
  buildSkinEdit,
  buildSkinSnapshot,
  buildComparison,
  DEFAULT_LENS,
  type DecisionLens,
  type EditMode,
  type ConcernExploreOption,
  type ComparisonResult,
} from '@/state/skinEdit';
import {
  ActionConfirmSheet,
  ConcernExplorer,
  DecisionLensSheet,
  EditModeSelector,
  EditorialProductTile,
  HeroRecommendation,
  HonestyInterruption,
  PriorityRanking,
  ProductComparisonSheet,
  ProductPlanTimeline,
  RankingTransition,
  ScanEvidenceMarkers,
  SearchConsultation,
  type ConfirmKind,
} from '@/components/products/skinEdit';
import type { HomeStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export function ProductsScreen() {
  const navigation = useNavigation<Nav>();
  const { scans, userRoutineMorning, userRoutineEvening, wishlist } = useAppStore(
    useShallow((s) => ({
      scans: s.scans,
      userRoutineMorning: s.userRoutineMorning,
      userRoutineEvening: s.userRoutineEvening,
      wishlist: s.wishlist,
    }))
  );
  const addToRoutine = useAppStore((s) => s.addUserRoutineProduct);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);

  const snapshot = useMemo(() => buildSkinSnapshot(scans), [scans]);
  const routine = useMemo(
    () => buildRoutineState({ userRoutineMorning, userRoutineEvening, wishlist }),
    [userRoutineMorning, userRoutineEvening, wishlist]
  );

  const [lens, setLens] = useState<DecisionLens>(DEFAULT_LENS);
  const [exploredConcern, setExploredConcern] = useState<ConcernExploreOption['key'] | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('use_tonight');
  const [reranking, setReranking] = useState<string | null>(null);

  const [lensOpen, setLensOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [compareTarget, setCompareTarget] = useState<ComparisonResult | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; productLabel: string } | null>(null);

  const skinEdit = useMemo(() => {
    if (exploredConcern) {
      return buildConcernEdit(exploredConcern, snapshot, routine);
    }
    return buildSkinEdit(snapshot, routine, lens);
  }, [snapshot, routine, lens, exploredConcern]);

  const triggerRerank = useCallback((label: string, callback: () => void) => {
    setReranking(label);
    setTimeout(() => {
      callback();
      setReranking(null);
    }, 700);
  }, []);

  const handleSelectConcern = useCallback(
    (key: ConcernExploreOption['key']) => {
      const label =
        key === 'breakouts'
          ? 'Ranking breakout options for you'
          : key === 'tone'
          ? 'Ranking mark options for you'
          : key === 'hydration'
          ? 'Ranking hydration options for you'
          : key === 'barrier'
          ? 'Ranking barrier options for you'
          : key === 'texture'
          ? 'Ranking texture options for you'
          : 'Ranking SPF options for you';
      triggerRerank(label, () => setExploredConcern(key));
    },
    [triggerRerank]
  );

  const handleResetConcern = useCallback(() => {
    triggerRerank('Returning to tonight’s edit', () => setExploredConcern(null));
  }, [triggerRerank]);

  const handleApplyLens = useCallback(
    (next: DecisionLens) => {
      setLensOpen(false);
      triggerRerank('Rebuilding your edit', () => setLens(next));
    },
    [triggerRerank]
  );

  const handleOpenDetail = useCallback(
    (productId: string) => {
      hapt.select();
      navigation.navigate('ProductDetail', { productId });
    },
    [navigation]
  );

  const handleAddToTonight = useCallback(
    (productId: string, productLabel: string) => {
      hapt.tap();
      addToRoutine('evening', productId);
      setConfirm({ kind: 'added_tonight', productLabel });
    },
    [addToRoutine]
  );

  const handleSaveForLater = useCallback(
    (productId: string, productLabel: string) => {
      hapt.select();
      // Add to wishlist if not already present.
      if (!wishlist.includes(productId)) toggleWishlist(productId);
      setConfirm({ kind: 'saved_for_later', productLabel });
    },
    [toggleWishlist, wishlist]
  );

  const handleCompare = useCallback(
    (firstId: string, secondId: string) => {
      const comparison = buildComparison([firstId, secondId], snapshot, routine);
      setCompareTarget(comparison);
    },
    [snapshot, routine]
  );

  const visibleTiles = skinEdit.modes[editMode];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <Animated.View
          entering={FadeIn.duration(260).easing(Easing.out(Easing.cubic))}
          style={styles.headerRow}
        >
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            Products
          </Text>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              onPress={() => {
                hapt.select();
                setSearchOpen(true);
              }}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.9 }]}
            >
              <MagnifyingGlass size={18} color={palette.ink} weight="bold" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open decision lens"
              onPress={() => {
                hapt.select();
                setLensOpen(true);
              }}
              style={({ pressed }) => [
                styles.iconBtn,
                lens.priority !== 'auto_from_scan' && styles.iconBtnActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <SlidersHorizontal
                size={18}
                color={lens.priority !== 'auto_from_scan' ? palette.clayDeep : palette.ink}
                weight="duotone"
              />
            </Pressable>
          </View>
        </Animated.View>

        <Text style={styles.scanLabel} maxFontSizeMultiplier={1.1}>
          EDITED FROM TODAY’S SCAN · {snapshot.capturedAtLabel}
        </Text>

        {/* EDITORIAL STATEMENT */}
        <Animated.View
          entering={FadeInDown.duration(340).delay(70).easing(Easing.out(Easing.cubic))}
          style={styles.editorialBlock}
        >
          <Text style={styles.editorialHeadline} maxFontSizeMultiplier={1.15}>
            {skinEdit.snapshot.editorialStatement}
          </Text>
          <Text style={styles.editorialBody} maxFontSizeMultiplier={1.25}>
            {skinEdit.snapshot.editorialExplanation}
          </Text>
        </Animated.View>

        {/* EVIDENCE MARKERS */}
        <Animated.View
          entering={FadeInDown.duration(360).delay(120).easing(Easing.out(Easing.cubic))}
        >
          <ScanEvidenceMarkers snapshot={skinEdit.snapshot} />
        </Animated.View>

        {/* RERANKING TRANSITION OR CONTENT */}
        {reranking ? (
          <Animated.View entering={FadeIn.duration(180)}>
            <RankingTransition label={reranking} />
          </Animated.View>
        ) : (
          <>
            {/* HERO */}
            <Animated.View
              entering={FadeInDown.duration(420).delay(180).easing(Easing.out(Easing.cubic))}
              style={styles.heroWrap}
            >
              <HeroRecommendation
                recommendation={skinEdit.primaryRecommendation}
                onPressDetail={() => handleOpenDetail(skinEdit.primaryRecommendation.productId)}
                onPrimary={() =>
                  handleAddToTonight(
                    skinEdit.primaryRecommendation.productId,
                    `${skinEdit.primaryRecommendation.product.brand} ${skinEdit.primaryRecommendation.product.name}`
                  )
                }
                onSecondary={() => handleOpenDetail(skinEdit.primaryRecommendation.productId)}
              />
            </Animated.View>

            {/* HONESTY INTERRUPTION */}
            {skinEdit.honestyInterruption ? (
              <Animated.View entering={FadeInDown.duration(420).delay(240)}>
                <HonestyInterruption
                  recommendation={skinEdit.honestyInterruption}
                  onSaveForLater={() =>
                    handleSaveForLater(
                      skinEdit.honestyInterruption!.productId,
                      `${skinEdit.honestyInterruption!.product.brand} ${skinEdit.honestyInterruption!.product.name}`
                    )
                  }
                  onCompare={() =>
                    handleCompare(
                      skinEdit.primaryRecommendation.productId,
                      skinEdit.honestyInterruption!.productId
                    )
                  }
                  onPressDetail={() => handleOpenDetail(skinEdit.honestyInterruption!.productId)}
                />
              </Animated.View>
            ) : null}

            {/* PRIORITIES */}
            <PriorityRanking priorities={skinEdit.priorities} />

            {/* THE EDIT */}
            <View style={styles.editSection}>
              <View style={styles.editHeader}>
                <Text style={styles.editHeading} maxFontSizeMultiplier={1.2}>
                  The Edit
                </Text>
                <Text style={styles.editSub} maxFontSizeMultiplier={1.2}>
                  Ranked for what your skin asks for tonight.
                </Text>
              </View>
              <EditModeSelector selected={editMode} onSelect={setEditMode} />
              {visibleTiles.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.editScroll}
                >
                  {visibleTiles.map((rec) => (
                    <EditorialProductTile
                      key={rec.productId}
                      recommendation={rec}
                      timing={timingFor(rec.routinePathway, rec.routinePathwayActiveIndex)}
                      onPress={() => handleOpenDetail(rec.productId)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.editEmpty}>
                  <Text style={styles.editEmptyText} maxFontSizeMultiplier={1.2}>
                    No products in this mode right now. Try a different bucket above.
                  </Text>
                </View>
              )}
            </View>

            {/* EXPLORE ANOTHER CONCERN */}
            <ConcernExplorer
              options={skinEdit.concernOptions}
              selectedKey={exploredConcern}
              onSelect={(k) => {
                if (k === exploredConcern) {
                  handleResetConcern();
                } else {
                  handleSelectConcern(k);
                }
              }}
            />
            {exploredConcern ? (
              <View style={styles.resetWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Return to tonight’s edit"
                  onPress={handleResetConcern}
                  style={({ pressed }) => [pressed && { opacity: 0.94 }]}
                >
                  <Text style={styles.resetText} maxFontSizeMultiplier={1.1}>
                    Return to tonight’s edit →
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* PRODUCT PLAN TIMELINE */}
            <ProductPlanTimeline timeline={skinEdit.timeline} />
          </>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      <DecisionLensSheet
        visible={lensOpen}
        current={lens}
        onApply={handleApplyLens}
        onDismiss={() => setLensOpen(false)}
      />

      <SearchConsultation
        visible={searchOpen}
        snapshot={snapshot}
        routine={routine}
        onDismiss={() => setSearchOpen(false)}
        onSelect={(rec) => {
          setSearchOpen(false);
          handleOpenDetail(rec.productId);
        }}
      />

      <ProductComparisonSheet
        visible={!!compareTarget}
        comparison={compareTarget}
        onAddPick={() => {
          if (!compareTarget) return;
          const pickRec =
            compareTarget.pickProductId === skinEdit.primaryRecommendation.productId
              ? skinEdit.primaryRecommendation
              : skinEdit.honestyInterruption ?? skinEdit.primaryRecommendation;
          setCompareTarget(null);
          handleAddToTonight(
            pickRec.productId,
            `${pickRec.product.brand} ${pickRec.product.name}`
          );
        }}
        onSavePicked={() => {
          if (!compareTarget || !skinEdit.honestyInterruption) {
            setCompareTarget(null);
            return;
          }
          setCompareTarget(null);
          handleSaveForLater(
            skinEdit.honestyInterruption.productId,
            `${skinEdit.honestyInterruption.product.brand} ${skinEdit.honestyInterruption.product.name}`
          );
        }}
        onDismiss={() => setCompareTarget(null)}
      />

      <ActionConfirmSheet
        visible={!!confirm}
        kind={confirm?.kind ?? 'added_tonight'}
        productLabel={confirm?.productLabel ?? ''}
        onPrimary={() => {
          setConfirm(null);
          if (confirm?.kind === 'added_tonight') {
            navigation.navigate('Routine');
          }
        }}
        onSecondary={() => setConfirm(null)}
        onDismiss={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

function timingFor(pathway: string[], activeIndex: number): string {
  if (pathway.includes('SPF') && activeIndex === pathway.indexOf('SPF')) return 'AM · Daily';
  const step = pathway[activeIndex] ?? 'Tonight';
  if (step.toLowerCase().includes('cleanse')) return 'AM / PM · Daily';
  if (step.toLowerCase().includes('treat')) return 'PM · Start 2× weekly';
  if (step.toLowerCase().includes('moistur')) return 'AM / PM · Daily';
  if (step.toLowerCase().includes('tone')) return 'AM / PM · Daily';
  return 'Tonight · PM';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  scroll: {
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: palette.ink,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  iconBtnActive: {
    borderColor: palette.clay,
    backgroundColor: palette.clayPaper,
  },
  scanLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginTop: 6,
  },
  editorialBlock: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  editorialHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 31,
    lineHeight: 35,
    letterSpacing: -0.6,
    color: palette.ink,
    marginBottom: 10,
  },
  editorialBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSecondary,
  },
  heroWrap: {
    marginTop: 26,
  },
  editSection: {
    marginTop: 32,
  },
  editHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  editHeading: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 4,
  },
  editSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
  editScroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
  },
  editEmpty: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  editEmptyText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkTertiary,
  },
  resetWrap: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  resetText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.clayDeep,
  },
});
