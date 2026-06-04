/**
 * Dev-only Pura Shop card gallery.
 *
 * Two modes, both driven by the real `buildShopHomeModel` output so the craft
 * can be eyeballed in isolation before the full screen is assembled:
 *
 *   • "Cards" — every model card laid out in a scroll, each floating over a band
 *     of its routine pillar's atmospheric gradient. Good for reviewing each
 *     variant (pick / budget / splurge / missing / in-routine / end) side by
 *     side.
 *   • "Stack" — the real `CardStack` swipe mechanic over a single living
 *     backdrop that shifts to the top card's pillar as you advance. Back / Next
 *     / Reset drive the imperative handle so the deck is verifiable on web
 *     (where a real drag gesture is awkward to synthesize) in addition to the
 *     gesture itself.
 *
 * The synthetic profile below is the ONLY input here; it never touches a
 * production code path (this gallery is reachable only via the dev nav ref).
 */

import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'phosphor-react-native';

import { puraShopHome } from '@/theme';
import {
  buildShopHomeModel,
  type BuildShopHomeInput,
  type StackCard,
} from '@/screens/shop/shopStackModel';
import type { UserProfileSnapshot } from '@/screens/shop/personalization';
import { StackCardView } from '@/screens/shop/components/StackCard';
import {
  CardStack,
  type CardStackHandle,
} from '@/screens/shop/components/CardStack';
import { FeedHeader } from '@/screens/shop/components/FeedHeader';
import { ConcernsTonight } from '@/screens/shop/components/ConcernsTonight';
import { ShopFeed } from '@/screens/shop/components/ShopFeed';
import type { SkinState } from '@/types/canonical';

// ── Synthetic, dev-only fixture ─────────────────────────────────────
const FIXTURE_PROFILE: UserProfileSnapshot = {
  primaryConcern: 'breakouts',
  concerns: ['breakouts', 'dark marks'],
  skinType: 'combination',
  sensitivity: 'somewhat',
  goal: 'clear, even skin',
  routineTiming: 'pm',
  avoidIngredients: [],
  fragranceSensitive: false,
  hasScan: true,
};

const FIXTURE_SAVED = ['the-ordinary-niacinamide'];
const FIXTURE_ROUTINE = ['cerave-hydrating-cleanser'];

// A realistic post-scan reading — three concerns with varied severity AND
// movement (worse / better / same) so the concerns row exercises every trend.
const FIXTURE_SKIN_STATE: SkinState = {
  scanId: 'dev-scan-1',
  createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  imageQuality: { usable: true, confidence: 0.82, issues: [] },
  score: 72,
  scoreBand: 'good',
  scoreDelta: 3,
  summaryHeadline: 'Steady, with a little congestion at the jaw.',
  summaryBody: 'Breakouts along the jaw are the main thing to watch; old marks are fading.',
  topConcerns: [
    {
      concern: 'breakouts',
      severity: 'moderate',
      rank: 1,
      confidence: 0.78,
      regions: ['chin', 'jaw'],
      summary: 'A small cluster along the jaw.',
      direction: 'worse',
    },
    {
      concern: 'dark_marks',
      severity: 'mild',
      rank: 2,
      confidence: 0.64,
      regions: ['left cheek'],
      summary: 'Older marks are lightening.',
      direction: 'better',
    },
    {
      concern: 'hydration',
      severity: 'mild',
      rank: 3,
      confidence: 0.6,
      regions: ['forehead'],
      summary: 'A touch of tightness up top.',
      direction: 'same',
    },
  ],
  severityByConcern: { breakouts: 'moderate', dark_marks: 'mild', hydration: 'mild' },
  zoneFindings: [],
  confidenceByConcern: { breakouts: 0.78, dark_marks: 0.64, hydration: 0.6 },
  trendSummary: { direction: 'improving', deltaSinceFirst: 5 },
  nextStepCategory: 'serum',
  routineHints: ['Keep actives gentle', 'Spot-treat the jaw at night'],
  riskFlags: [],
  overallConfidence: 'high',
  source: 'ai',
};

function makeInput(over: Partial<BuildShopHomeInput> = {}): BuildShopHomeInput {
  const now = Date.now();
  return {
    hasScan: true,
    skinState: null,
    profile: FIXTURE_PROFILE,
    greetingName: 'Alex',
    savedIds: new Set(FIXTURE_SAVED),
    routineIds: new Set(FIXTURE_ROUTINE),
    aiMatches: [],
    scanCount: 2,
    latestScanAtIso: new Date(now - 2 * 86_400_000).toISOString(),
    previousScanAtIso: new Date(now - 9 * 86_400_000).toISOString(),
    scoreDelta: 3,
    now,
    ...over,
  };
}

function buildFixtureInput(): BuildShopHomeInput {
  return makeInput();
}

// Header specimens — each exercises a distinct branch of the model's header
// logic (acknowledgment kind, freshness, staleness) so FeedHeader can be
// reviewed across every state it must handle.
const HEADER_FIXTURES: { label: string; input: BuildShopHomeInput }[] = (() => {
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86_400_000).toISOString();
  return [
    {
      label: 'POST-SCAN · WITH CONCERNS (reactive)',
      input: makeInput({
        skinState: FIXTURE_SKIN_STATE,
        scoreDelta: 3,
        scanCount: 2,
        latestScanAtIso: days(2),
      }),
    },
    {
      label: 'POST-SCAN · FRESH · NAMED (improving)',
      input: makeInput({ scoreDelta: 3, scanCount: 2, latestScanAtIso: days(2) }),
    },
    {
      label: 'POST-SCAN · STALE · BANNER',
      input: makeInput({ scoreDelta: 0, scanCount: 3, latestScanAtIso: days(40) }),
    },
    {
      label: 'POST-SCAN · NO NAME',
      input: makeInput({ greetingName: null, latestScanAtIso: days(2) }),
    },
    {
      label: 'FIRST SCAN · TODAY',
      input: makeInput({ scanCount: 1, scoreDelta: null, latestScanAtIso: days(0) }),
    },
    {
      label: 'REACTIVE (skin needs support)',
      input: makeInput({ scoreDelta: -3, scanCount: 2, latestScanAtIso: days(3) }),
    },
    {
      label: 'PRE-SCAN (no scan yet)',
      input: makeInput({
        hasScan: false,
        scanCount: 0,
        scoreDelta: null,
        latestScanAtIso: null,
      }),
    },
  ];
})();

type GalleryMode = 'cards' | 'stack' | 'header' | 'feed';

export function ShopCardDevGallery() {
  const nav = useNavigation();
  const model = useMemo(() => buildShopHomeModel(buildFixtureInput()), []);

  const [mode, setMode] = useState<GalleryMode>('stack');

  // Live overrides so save/add affordances are interactive in the gallery.
  const [saved, setSaved] = useState<Set<string>>(() => new Set(FIXTURE_SAVED));
  const [routine, setRoutine] = useState<Set<string>>(
    () => new Set(FIXTURE_ROUTINE),
  );

  const toggleSave = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const addRoutine = (id: string) =>
    setRoutine((prev) => new Set(prev).add(id));

  const cards: StackCard[] = model.cards.map((c) =>
    c.product
      ? {
          ...c,
          isSaved: saved.has(c.product.id),
          isInRoutine: routine.has(c.product.id),
        }
      : c,
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} weight="bold" color={puraShopHome.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Pura Shop · Card Gallery</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.modeRow}>
        {(['feed', 'stack', 'cards', 'header'] as GalleryMode[]).map((m) => {
          const active = mode === m;
          const label =
            m === 'stack'
              ? 'Stack'
              : m === 'cards'
                ? 'Cards'
                : m === 'header'
                  ? 'Header'
                  : 'Feed';
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeChip, active && styles.modeChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[styles.modeChipText, active && styles.modeChipTextActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'feed' ? (
        <FeedMode
          saved={saved}
          routine={routine}
          onToggleSave={toggleSave}
          onAdd={addRoutine}
        />
      ) : mode === 'stack' ? (
        <StackMode cards={cards} onToggleSave={toggleSave} onAdd={addRoutine} />
      ) : mode === 'cards' ? (
        <CardsMode cards={cards} onToggleSave={toggleSave} onAdd={addRoutine} />
      ) : (
        <HeaderMode />
      )}
    </SafeAreaView>
  );
}

// ── Stack mode — the real swipe mechanic over a living backdrop ─────
function StackMode({
  cards,
  onToggleSave,
  onAdd,
}: {
  cards: StackCard[];
  onToggleSave: (id: string) => void;
  onAdd: (id: string) => void;
}) {
  const stackRef = useRef<CardStackHandle>(null);
  const [topIdx, setTopIdx] = useState(0);

  const topCard = cards[topIdx];
  const corners = topCard?.pillarTheme?.corners ?? [
    puraShopHome.canvas,
    puraShopHome.canvasDeep,
  ];

  return (
    <LinearGradient
      colors={[corners[0], corners[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.stackBackdrop}
    >
      <View style={styles.stackArea} pointerEvents="box-none">
        <CardStack
          ref={stackRef}
          cards={cards}
          onIndexChange={setTopIdx}
          onPressProduct={() => {}}
          onToggleSave={onToggleSave}
          onAdd={onAdd}
        />
      </View>

      <View style={styles.controls}>
        <CtrlButton
          label="‹ Back"
          disabled={topIdx <= 0}
          onPress={() => stackRef.current?.prev()}
        />
        <Text style={styles.counter}>
          {topIdx + 1} / {cards.length}
        </Text>
        <CtrlButton
          label="Next ›"
          disabled={topIdx >= cards.length - 1}
          onPress={() => stackRef.current?.next()}
        />
        <CtrlButton label="Reset" onPress={() => stackRef.current?.reset()} />
      </View>
    </LinearGradient>
  );
}

function CtrlButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.ctrl, disabled && styles.ctrlDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.ctrlText}>{label}</Text>
    </Pressable>
  );
}

// ── Cards mode — every variant in a scroll over its pillar band ─────
function CardsMode({
  cards,
  onToggleSave,
  onAdd,
}: {
  cards: StackCard[];
  onToggleSave: (id: string) => void;
  onAdd: (id: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {cards.map((card) => {
        const corners = card.pillarTheme?.corners ?? [
          puraShopHome.canvas,
          puraShopHome.canvasDeep,
        ];
        return (
          <LinearGradient
            key={card.key}
            colors={[corners[0], corners[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.band}
          >
            <Text style={styles.typeTag}>{card.type.toUpperCase()}</Text>
            <StackCardView
              card={card}
              animate={card.key === cards[0]?.key}
              onPressProduct={() => {}}
              onToggleSave={onToggleSave}
              onAdd={onAdd}
            />
          </LinearGradient>
        );
      })}
    </ScrollView>
  );
}

// ── Feed mode — the fully assembled post-scan ShopFeed ─────────────
function FeedMode({
  saved,
  routine,
  onToggleSave,
  onAdd,
}: {
  saved: Set<string>;
  routine: Set<string>;
  onToggleSave: (id: string) => void;
  onAdd: (id: string) => void;
}) {
  const model = useMemo(
    () =>
      buildShopHomeModel(
        makeInput({
          skinState: FIXTURE_SKIN_STATE,
          savedIds: saved,
          routineIds: routine,
        }),
      ),
    [saved, routine],
  );
  return (
    <View style={styles.feedHost}>
      <ShopFeed
        model={model}
        onPressProduct={() => {}}
        onToggleSave={onToggleSave}
        onAdd={onAdd}
        onScan={() => {}}
        onBrowseAll={() => {}}
        onBrowseConcern={() => {}}
        onPressConcern={() => {}}
        bottomInset={28}
      />
    </View>
  );
}

// ── Header mode — every FeedHeader branch over the page canvas ─────
function HeaderMode() {
  return (
    <ScrollView contentContainerStyle={styles.headerScroll}>
      {HEADER_FIXTURES.map(({ label, input }) => {
        const m = buildShopHomeModel(input);
        return (
          <View key={label} style={styles.headerSpecimen}>
            <Text style={styles.specimenLabel}>{label}</Text>
            <View style={styles.specimenStage}>
              <FeedHeader
                state={m.state}
                greetingName={m.greetingName}
                acknowledgment={m.acknowledgment}
                scanFreshness={m.scanFreshness}
                showRescanBanner={m.showRescanBanner}
                onRescan={() => {}}
              />
              <ConcernsTonight
                concerns={m.concernsTonight}
                onPressConcern={() => {}}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraShopHome.canvas,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraShopHome.hairline,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: puraShopHome.canvasDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: puraShopHome.ink,
    letterSpacing: 0.2,
  },

  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modeChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: puraShopHome.canvasDeep,
  },
  modeChipActive: {
    backgroundColor: puraShopHome.ink,
  },
  modeChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: puraShopHome.quietInk,
    letterSpacing: 0.2,
  },
  modeChipTextActive: {
    color: puraShopHome.canvas,
  },

  // Stack mode
  stackBackdrop: {
    flex: 1,
  },
  stackArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  counter: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: puraShopHome.ink,
    minWidth: 52,
    textAlign: 'center',
  },
  ctrl: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: puraShopHome.cardEdge,
  },
  ctrlDisabled: {
    opacity: 0.4,
  },
  ctrlText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: puraShopHome.ink,
  },

  // Cards mode
  scroll: {
    paddingVertical: 18,
    paddingBottom: 60,
    gap: 22,
  },
  band: {
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  typeTag: {
    alignSelf: 'flex-start',
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    color: puraShopHome.quietInk,
    marginBottom: 12,
  },

  // Feed mode
  feedHost: {
    flex: 1,
  },

  // Header mode
  headerScroll: {
    paddingVertical: 18,
    paddingBottom: 60,
    gap: 18,
  },
  headerSpecimen: {
    marginHorizontal: 16,
  },
  specimenLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    color: puraShopHome.quietInk,
    marginBottom: 8,
    marginLeft: 4,
  },
  specimenStage: {
    borderRadius: 24,
    backgroundColor: puraShopHome.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraShopHome.hairline,
    paddingVertical: 10,
    overflow: 'hidden',
  },
});
