/**
 * Build Ceremony — the transitional surface between the reveal arc's
 * "Build my routine" CTA and the populated Routine page.
 *
 * It is a deterministic ~13.3s choreography: four product cards walk
 * idle → building → done in sequence (Cleanse · Treat · Moisturize ·
 * Protect). Each card builds for 3s with a thin progress bar and cycling
 * status lines, completes with a light haptic, and resolves to a REAL
 * catalog product (brand + name + packshot). After the fourth card a
 * 700ms "ready" beat fires a success haptic, the routine is committed to
 * the routine store (lifecycle → active), and `onComplete` hands off to
 * the Routine page.
 *
 * The routine is built up-front by `buildCeremonyRoutine` (pure, no
 * network) so the ceremony can never hang on a dead AI proxy, and the
 * cards animated here are derived from the exact object that gets
 * committed — animation and committed data can never disagree.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Check, Lock } from 'phosphor-react-native';
import type { ImageSourcePropType } from 'react-native';
import {
  puraReveal,
  puraRevealLayout,
  puraRevealRadius,
  puraRevealShadow,
  puraRevealType,
} from '@/theme/tokens';
import type {
  CustomRoutine,
  PillarSelection,
  RoutineProduct,
  RoutineStepType,
} from '@/types/routine';
import { stepTypeToPillarKey } from '@/types/routine';
import { PillarIcon } from '@/components/routine/pillarIdentity';
import { buildCeremonyRoutine } from '@/services/routine/routineBuilderService';
import { useRoutineStore } from '@/state/routine/routineStore';
import { findShopProduct } from '@/screens/shop/shopCatalog';
import { hapt } from '@/utils/haptics';
import { RevealLink } from './revealChrome';

// ---------------------------------------------------------------------------
// Choreography constants — see file header for the full timeline.
// ---------------------------------------------------------------------------

const CARD_BUILD_MS = 3000;
const CARD_GAP_MS = 200;
const FINAL_BEAT_MS = 700;
/** Six status phrases per pillar, crossfading once every 500ms across the 3s build. */
const STATUS_STEP_MS = 500;
const STATUS_COUNT = 6;

/** Card i begins building at i * (build + gap). */
function cardStartMs(i: number): number {
  return i * (CARD_BUILD_MS + CARD_GAP_MS);
}

type CardState = 'idle' | 'building' | 'done';

interface PillarMeta {
  type: RoutineStepType;
  /** Hero lead-in shown while this pillar builds (uniform across pillars). */
  heroLead: string;
  /** Hero key noun, rendered in Pura Blue italic. */
  heroNoun: string;
  /** Pillar name shown on the building card (serif). */
  buildingName: string;
  /** Six rolling status lines with concrete numbers — never generic "Searching…". */
  status: readonly string[];
}

const PILLAR_ORDER: RoutineStepType[] = ['cleanse', 'treat', 'hydrate', 'protect'];

const PILLAR_META: Record<RoutineStepType, PillarMeta> = {
  cleanse: {
    type: 'cleanse',
    heroLead: 'Choosing your ',
    heroNoun: 'cleanser',
    buildingName: 'Cleanse',
    status: [
      'Reading your barrier profile...',
      'Filtering 847 cleansers...',
      'Cross-checking pH range...',
      'Matching to your sensitivity...',
      'Checking ingredient compatibility...',
      'Found your match.',
    ],
  },
  treat: {
    type: 'treat',
    heroLead: 'Choosing your ',
    heroNoun: 'treatment',
    buildingName: 'Treat',
    status: [
      'Reading your focus areas...',
      'Filtering 1,240 treatments...',
      'Matching to your texture goals...',
      'Calibrating to your barrier strength...',
      'Checking actives compatibility...',
      'Found your match.',
    ],
  },
  hydrate: {
    type: 'hydrate',
    heroLead: 'Choosing your ',
    heroNoun: 'moisturizer',
    buildingName: 'Moisturize',
    status: [
      'Reading your hydration signal...',
      'Filtering 612 moisturizers...',
      'Matching to your skin type...',
      'Cross-checking with treatment layer...',
      'Checking texture preference...',
      'Found your match.',
    ],
  },
  protect: {
    type: 'protect',
    heroLead: 'Choosing your ',
    heroNoun: 'SPF',
    buildingName: 'Protect',
    status: [
      'Reading your sun exposure profile...',
      'Filtering 318 SPFs...',
      'Matching to your skin tone...',
      'Checking texture compatibility...',
      'Verifying daily wearability...',
      'Found your match.',
    ],
  },
};

interface CeremonyCard {
  meta: PillarMeta;
  product?: RoutineProduct;
  packshot?: ImageSourcePropType;
}

export interface ScanBuildCeremonyProps {
  scanId: string;
  limitedByScan?: boolean;
  /** Pillars the user chose in the picker. Omitted = all four. The
   *  ceremony builds, animates, and commits ONLY these pillars. */
  selection?: PillarSelection;
  /** Called after the routine is committed to the store. */
  onComplete: () => void;
  onHowItWorks?: () => void;
}

export function ScanBuildCeremony({
  scanId,
  limitedByScan,
  selection,
  onComplete,
  onHowItWorks,
}: ScanBuildCeremonyProps) {
  const { width: vw } = useWindowDimensions();
  const contentW = Math.min(vw, puraRevealLayout.maxContentWidth) - puraRevealLayout.screenPadding * 2;

  // Build once. The committed routine and the animated cards share this.
  const routineRef = React.useRef<CustomRoutine | null>(null);
  if (!routineRef.current) {
    routineRef.current = buildCeremonyRoutine({ scanId, limitedByScan, selection });
  }
  const routine = routineRef.current;

  // The pillars to animate, in canonical order, filtered to the user's
  // selection. Defensive fallback to all four if somehow empty.
  const selectedTypes = React.useMemo<RoutineStepType[]>(() => {
    const list = PILLAR_ORDER.filter(
      (t) => !selection || selection[stepTypeToPillarKey(t)] !== false,
    );
    return list.length > 0 ? list : PILLAR_ORDER;
  }, [selection]);
  const cardCount = selectedTypes.length;

  // Timeline derived from the number of selected pillars (3s per card).
  const finalAt = cardStartMs(cardCount - 1) + CARD_BUILD_MS;
  const navigateAt = finalAt + FINAL_BEAT_MS;

  const cards: CeremonyCard[] = React.useMemo(() => {
    const byType = new Map<RoutineStepType, RoutineProduct | undefined>();
    for (const s of [...routine.morningSteps, ...routine.eveningSteps]) {
      if (!byType.has(s.type)) byType.set(s.type, s.product);
    }
    return selectedTypes.map((type) => {
      const product = byType.get(type);
      const catalog = product ? findShopProduct(product.id) : undefined;
      return { meta: PILLAR_META[type], product, packshot: catalog?.catalogPackshot };
    });
  }, [routine, selectedTypes]);

  const [states, setStates] = React.useState<CardState[]>(() => selectedTypes.map(() => 'idle'));
  const [statusStep, setStatusStep] = React.useState(0);
  const [heroIndex, setHeroIndex] = React.useState(0);
  const [finalBeat, setFinalBeat] = React.useState(false);

  const progress = useSharedValue(0);
  const heroOp = useSharedValue(1);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedRef = React.useRef(false);

  // ---- The scheduler. All timing relative to mount; cleaned up on exit. ----
  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    selectedTypes.forEach((_type, i) => {
      const start = cardStartMs(i);
      timers.push(
        setTimeout(() => {
          setStates((prev) => prev.map((s, idx) => (idx === i ? 'building' : s)));
          setHeroIndex(i);
          setStatusStep(0);
          progress.value = 0;
          progress.value = withTiming(1, {
            duration: CARD_BUILD_MS - 120,
            easing: Easing.out(Easing.cubic),
          });
        }, start),
      );
      // Roll the six status phrases, one crossfade every 500ms.
      for (let j = 1; j < STATUS_COUNT; j += 1) {
        timers.push(setTimeout(() => setStatusStep(j), start + j * STATUS_STEP_MS));
      }
      timers.push(
        setTimeout(() => {
          setStates((prev) => prev.map((s, idx) => (idx === i ? 'done' : s)));
          hapt.stepComplete();
        }, start + CARD_BUILD_MS),
      );
    });

    timers.push(
      setTimeout(() => {
        setFinalBeat(true);
        hapt.scanComplete();
        const store = useRoutineStore.getState();
        store.completeBuild(routine);
        store.setLifecycle('active');
      }, finalAt),
    );

    timers.push(
      setTimeout(() => {
        if (firedRef.current) return;
        firedRef.current = true;
        onCompleteRef.current();
      }, navigateAt),
    );

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(progress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fade the hero whenever the active pillar (or the final beat) changes.
  React.useEffect(() => {
    heroOp.value = 0;
    heroOp.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroIndex, finalBeat]);

  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOp.value }));
  const heroMeta = PILLAR_META[selectedTypes[Math.min(heroIndex, cardCount - 1)]];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={[styles.frame, { maxWidth: puraRevealLayout.maxContentWidth }]}>
        <Text style={[puraRevealType.eyebrow, styles.eyebrow]}>PURA</Text>

        <Animated.View style={[styles.heroWrap, heroStyle]}>
          {finalBeat ? (
            <Text style={[puraRevealType.ceremonyHero, { color: puraReveal.ink }]}>
              Your routine is{' '}
              <Text style={[puraRevealType.ceremonyHeroItalic, { color: puraReveal.blue }]}>
                ready.
              </Text>
            </Text>
          ) : (
            <Text style={[puraRevealType.ceremonyHero, { color: puraReveal.ink }]}>
              {heroMeta.heroLead}
              <Text style={[puraRevealType.ceremonyHeroItalic, { color: puraReveal.blue }]}>
                {heroMeta.heroNoun}
              </Text>
            </Text>
          )}
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.list, { width: contentW }]}
          showsVerticalScrollIndicator={false}
        >
          {cards.map((card, i) => (
            <BuildCard
              key={card.meta.type}
              card={card}
              state={states[i]}
              statusStep={statusStep}
              progress={progress}
            />
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <RevealLink label="How Pura chooses" onPress={onHowItWorks ?? noop} tone="muted" />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Build card — one of four. Height + dimming animate on state change; the
// progress bar binds to the shared `progress` value while building.
// ---------------------------------------------------------------------------

const HEIGHT_FOR: Record<CardState, number> = {
  idle: puraRevealLayout.buildCardIdle,
  building: puraRevealLayout.buildCardActive,
  done: puraRevealLayout.buildCardDone,
};

function BuildCard({
  card,
  state,
  statusStep,
  progress,
}: {
  card: CeremonyCard;
  state: CardState;
  statusStep: number;
  progress: SharedValue<number>;
}) {
  const { meta, product, packshot } = card;

  const h = useSharedValue(HEIGHT_FOR.idle);
  const dim = useSharedValue(0.5);

  React.useEffect(() => {
    h.value = withTiming(HEIGHT_FOR[state], { duration: 220, easing: Easing.out(Easing.cubic) });
    dim.value = withTiming(state === 'idle' ? 0.5 : 1, { duration: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cardStyle = useAnimatedStyle(() => ({ height: h.value, opacity: dim.value }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const isBuilding = state === 'building';
  const isDone = state === 'done';

  const containerTone = isBuilding
    ? { backgroundColor: puraReveal.blue08, borderColor: puraReveal.blue15 }
    : isDone
      ? { backgroundColor: puraReveal.porcelainDeep, borderColor: 'transparent' }
      : { backgroundColor: puraReveal.surface, borderColor: puraReveal.border };

  const isIdleState = state === 'idle';
  const statusIdx = Math.min(statusStep, meta.status.length - 1);
  const statusDone = statusIdx >= STATUS_COUNT - 1;

  return (
    <Animated.View style={[styles.card, containerTone, cardStyle]}>
      <View style={styles.cardRow}>
        <View style={styles.cardIcon}>
          <PillarIcon pillar={stepTypeToPillarKey(meta.type)} size={44} />
        </View>

        {isIdleState ? (
          <>
            <View style={styles.idleBody}>
              <Text style={[puraRevealType.productName, { color: puraReveal.muted }]}>
                {meta.buildingName}
              </Text>
            </View>
            <Lock size={16} weight="regular" color={puraReveal.veryMuted} />
          </>
        ) : null}

        {isBuilding ? (
          <View style={styles.buildingBody}>
            <Text style={[puraRevealType.productName, { color: puraReveal.ink }]}>
              {meta.buildingName}
            </Text>
            <View style={styles.statusWrap}>
              <Animated.Text
                key={statusIdx}
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(160)}
                numberOfLines={1}
                style={[
                  puraRevealType.buildStatusLine,
                  styles.statusAbs,
                  { color: statusDone ? puraReveal.done : puraReveal.muted },
                ]}
              >
                {meta.status[statusIdx]}
              </Animated.Text>
            </View>
          </View>
        ) : null}

        {isDone ? (
          <>
            <View style={styles.doneBody}>
              <Text
                style={[puraRevealType.productName, { color: puraReveal.ink }]}
                numberOfLines={2}
              >
                {product?.name ?? meta.buildingName}
              </Text>
              {product?.brand ? (
                <Text style={[puraRevealType.brandCaps, { color: puraReveal.muted }, styles.brand]}>
                  {product.brand}
                </Text>
              ) : null}
            </View>
            <View style={styles.doneRight}>
              {packshot ? (
                <Image source={packshot} style={styles.thumb} contentFit="cover" />
              ) : null}
              <DoneCheck />
            </View>
          </>
        ) : null}
      </View>

      {isBuilding ? (
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, fillStyle]} />
        </View>
      ) : null}
    </Animated.View>
  );
}

/** Blue checkmark badge — scales 0.7 → 1.0 on appearance. */
function DoneCheck() {
  const scale = useSharedValue(0.7);
  const op = useSharedValue(0);
  React.useEffect(() => {
    scale.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.back(1.4)) });
    op.value = withTiming(1, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.check, style]}>
      <Check size={15} weight="bold" color={puraReveal.white} />
    </Animated.View>
  );
}

const noop = () => {};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraReveal.bg,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    paddingHorizontal: puraRevealLayout.screenPadding,
    alignSelf: 'center',
  },
  eyebrow: {
    color: puraReveal.blue,
    marginTop: 8,
  },
  heroWrap: {
    marginTop: 18,
    marginBottom: 22,
    minHeight: 64,
  },
  scroll: {
    flex: 1,
  },
  list: {
    gap: puraRevealLayout.cardGap,
    alignSelf: 'center',
    paddingBottom: 12,
  },
  card: {
    borderRadius: puraRevealRadius.card,
    borderWidth: 1,
    paddingHorizontal: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    ...puraRevealShadow.card,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 14,
  },
  idleBody: {
    flex: 1,
  },
  buildingBody: {
    flex: 1,
    gap: 8,
  },
  statusWrap: {
    height: 18,
    justifyContent: 'center',
  },
  statusAbs: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  doneBody: {
    flex: 1,
    paddingRight: 12,
  },
  brand: {
    marginTop: 4,
  },
  doneRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: puraRevealLayout.ceremonyThumb,
    height: puraRevealLayout.ceremonyThumb,
    borderRadius: puraRevealRadius.thumb,
    backgroundColor: puraReveal.porcelain,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: puraReveal.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    backgroundColor: puraReveal.blue12,
    marginTop: 16,
  },
  barFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: puraReveal.blue,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
});
