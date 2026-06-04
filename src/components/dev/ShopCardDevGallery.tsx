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

function buildFixtureInput(): BuildShopHomeInput {
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
  };
}

type GalleryMode = 'cards' | 'stack';

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
        {(['stack', 'cards'] as GalleryMode[]).map((m) => {
          const active = mode === m;
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
                {m === 'stack' ? 'Stack' : 'Cards'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'stack' ? (
        <StackMode
          cards={cards}
          onToggleSave={toggleSave}
          onAdd={addRoutine}
        />
      ) : (
        <CardsMode
          cards={cards}
          onToggleSave={toggleSave}
          onAdd={addRoutine}
        />
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
});
