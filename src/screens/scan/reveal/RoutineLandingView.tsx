/**
 * Routine Landing — surface 8 of the reveal arc, and the resting home for
 * lifecycle 'active'. Where the build ceremony hands off: a calm, populated
 * routine the user lives in day to day.
 *
 * Two mutually-exclusive modes (they own different gestures, so they never
 * share a render):
 *   • View mode  — a ScrollView of swipe-to-complete cards. Swiping a card
 *     left past the threshold toggles its completion for the day.
 *   • Edit mode  — a DraggableFlatList: drag to reorder, tap the red affordance
 *     to remove, or add a missing pillar from the bottom sheet.
 *
 * The view is presentational: the AM and PM lists, completion ids, and every
 * mutation are owned by the caller (the routine store via PuraRoutineScreen).
 * The two lists are independent — completion and ordering are keyed by
 * (timeOfDay, stepId), never merged.
 */

import React from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  Extrapolation,
  LinearTransition,
  SlideInDown,
  SlideOutLeft,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { CaretLeft, Check, List, Plus, Sparkle, XCircle } from 'phosphor-react-native';
import {
  puraReveal,
  puraRevealLayout,
  puraRevealRadius,
  puraRevealShadow,
  puraRevealType,
} from '@/theme/tokens';
import {
  PILLAR_KEYS,
  stepTypeToPillarKey,
  type CustomRoutine,
  type PillarKey,
  type RoutineProduct,
  type RoutineStep,
  type RoutineTimeOfDay,
} from '@/types/routine';
import { PILLAR_IDENTITY, PillarIcon } from '@/components/routine/pillarIdentity';
import { findShopProduct } from '@/screens/shop/shopCatalog';
import { hapt } from '@/utils/haptics';
import { RevealLink } from './revealChrome';

// Swipe-to-complete geometry. RESISTANCE keeps the card trailing the finger
// so the gesture feels weighted; THRESHOLD is the travel that arms a commit.
const SWIPE_RESISTANCE = 0.7;
const SWIPE_THRESHOLD = 80;

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatToday(d: Date = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

interface Row {
  step: RoutineStep;
  pillar: PillarKey;
  label: string;
  product?: RoutineProduct;
  packshot?: ImageSourcePropType;
  guidance: string;
}

function toRow(step: RoutineStep): Row {
  const pillar = stepTypeToPillarKey(step.type);
  const product = step.product;
  const catalog = product ? findShopProduct(product.id) : undefined;
  return {
    step,
    pillar,
    label: PILLAR_IDENTITY[pillar].label,
    product,
    packshot: catalog?.catalogPackshot,
    guidance: step.purpose,
  };
}

export interface RoutineLandingViewProps {
  routine: CustomRoutine;
  timeOfDay: RoutineTimeOfDay;
  onChangeTimeOfDay: (next: RoutineTimeOfDay) => void;
  /** Step ids completed today for the active time of day. */
  doneIds: string[];
  onToggleComplete: (stepId: string) => void;
  onReorder: (from: number, to: number) => void;
  onRemoveStep: (stepId: string) => void;
  onAddStep: (pillar: PillarKey) => void;
  onHowItWorks: () => void;
}

export function RoutineLandingView({
  routine,
  timeOfDay,
  onChangeTimeOfDay,
  doneIds,
  onToggleComplete,
  onReorder,
  onRemoveStep,
  onAddStep,
  onHowItWorks,
}: RoutineLandingViewProps) {
  const insets = useSafeAreaInsets();
  const { width: vw } = useWindowDimensions();
  const contentW =
    Math.min(vw, puraRevealLayout.maxContentWidth) - puraRevealLayout.screenPadding * 2;

  const [editing, setEditing] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);

  const steps = timeOfDay === 'morning' ? routine.morningSteps : routine.eveningSteps;
  const rows = React.useMemo(() => steps.map(toRow), [steps]);

  const isMorning = timeOfDay === 'morning';
  const total = steps.length;
  const doneCount = steps.filter((s) => doneIds.includes(s.id)).length;
  const allDone = total > 0 && doneCount === total;
  const minutes = Math.max(1, Math.round(total * 1.5));

  const sectionTitle = isMorning ? 'Morning routine' : "Tonight's routine";
  const completeTitle = isMorning
    ? 'Morning routine complete.'
    : "Tonight's routine complete.";

  const present = React.useMemo(
    () => new Set(steps.map((s) => stepTypeToPillarKey(s.type))),
    [steps],
  );
  const bottomPad = insets.bottom + puraRevealLayout.dockClearance;

  const handleRemove = React.useCallback(
    (row: Row) => {
      Alert.alert(
        'Remove step',
        `Remove ${row.label} from your routine?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              hapt.medium();
              onRemoveStep(row.step.id);
            },
          },
        ],
      );
    },
    [onRemoveStep],
  );

  const handlePickPillar = React.useCallback(
    (pillar: PillarKey) => {
      hapt.tap();
      onAddStep(pillar);
      setAddOpen(false);
    },
    [onAddStep],
  );

  const renderEditItem = React.useCallback(
    ({ item, drag, isActive }: RenderItemParams<RoutineStep>) => {
      const row = toRow(item);
      return (
        <ScaleDecorator activeScale={1.02}>
          <Animated.View
            layout={LinearTransition.duration(300)}
            exiting={SlideOutLeft.duration(250)}
            style={[styles.editRow, isActive && styles.editRowActive]}
          >
            <Pressable
              onPressIn={drag}
              disabled={isActive}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Reorder ${row.label}`}
              style={styles.dragHandle}
            >
              <List size={20} weight="bold" color={puraReveal.veryMuted} />
            </Pressable>

            <View style={styles.editCardWrap}>
              <CardBody row={row} done={false} rightNode={null} />
            </View>

            <Pressable
              onPress={() => handleRemove(row)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${row.label}`}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressedDim]}
            >
              <XCircle size={26} weight="fill" color={puraReveal.dangerSoft} />
            </Pressable>
          </Animated.View>
        </ScaleDecorator>
      );
    },
    [handleRemove],
  );

  const header = (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={[puraRevealType.displayTitle, { color: puraReveal.ink }]}>
            Routine
          </Text>
          <Sparkle size={20} weight="fill" color={puraReveal.blue} style={styles.titleSparkle} />
        </View>
        <RevealLink
          label={editing ? 'Done' : 'Edit'}
          onPress={() => setEditing((v) => !v)}
          tone="blue"
        />
      </View>
      <Text style={[puraRevealType.dateLabel, styles.dateLabel, { color: puraReveal.muted }]}>
        {formatToday()}
      </Text>

      <AmPmToggle value={timeOfDay} onChange={onChangeTimeOfDay} />
    </View>
  );

  const sectionHead = (
    <View style={styles.sectionHead}>
      <Text style={[puraRevealType.focusPhrase, { color: puraReveal.ink }]}>
        {sectionTitle}
      </Text>
      {total > 0 ? (
        <Text style={[puraRevealType.stepMeta, styles.sectionMeta, { color: puraReveal.veryMuted }]}>
          {total} {total === 1 ? 'step' : 'steps'} · ~{minutes}{' '}
          {minutes === 1 ? 'minute' : 'minutes'}
        </Text>
      ) : null}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <RevealLink label="How Pura works" onPress={onHowItWorks} tone="muted" />
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.frame, { maxWidth: puraRevealLayout.maxContentWidth }]}>
        <View style={styles.headerDock}>{header}</View>

        {total === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollBody, { paddingBottom: bottomPad }]}
            showsVerticalScrollIndicator={false}
          >
            {sectionHead}
            <EmptyState onAdd={() => setAddOpen(true)} />
            {footer}
          </ScrollView>
        ) : editing ? (
          <DraggableFlatList
            data={steps}
            keyExtractor={(s) => s.id}
            renderItem={renderEditItem}
            onDragBegin={() => hapt.tap()}
            onDragEnd={({ from, to }) => {
              if (from !== to) {
                hapt.tap();
                onReorder(from, to);
              }
            }}
            activationDistance={8}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomPad }}
            ListHeaderComponent={sectionHead}
            ListFooterComponent={
              <View>
                <AddStepCard onPress={() => setAddOpen(true)} />
                {footer}
              </View>
            }
          />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollBody, { paddingBottom: bottomPad }]}
            showsVerticalScrollIndicator={false}
          >
            {sectionHead}

            <View style={styles.cards}>
              {rows.map((row) => (
                <SwipeStepCard
                  key={row.step.id}
                  row={row}
                  done={doneIds.includes(row.step.id)}
                  cardW={contentW}
                  onCommit={() => onToggleComplete(row.step.id)}
                />
              ))}
            </View>

            <CompletionSection
              doneCount={doneCount}
              total={total}
              allDone={allDone}
              completeTitle={completeTitle}
            />

            {routine.explanation.length > 0 ? (
              <View style={styles.whyCard}>
                <Text style={[puraRevealType.cardTitle, styles.whyTitle, { color: puraReveal.ink }]}>
                  Why these products?
                </Text>
                {routine.explanation.map((line) => (
                  <View key={line} style={styles.whyRow}>
                    <View style={styles.whyDot} />
                    <Text style={[puraRevealType.body, styles.whyText, { color: puraReveal.muted }]}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {footer}
          </ScrollView>
        )}
      </View>

      <AddStepSheet
        visible={addOpen}
        present={present}
        onPick={handlePickPillar}
        onClose={() => setAddOpen(false)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// AM / PM segmented control — Pura Blue fill slides under the active half.
// ---------------------------------------------------------------------------

function AmPmToggle({
  value,
  onChange,
}: {
  value: RoutineTimeOfDay;
  onChange: (next: RoutineTimeOfDay) => void;
}) {
  const isMorning = value === 'morning';
  const p = useSharedValue(isMorning ? 0 : 1);
  const [trackW, setTrackW] = React.useState(0);
  const half = trackW > 0 ? (trackW - 8) / 2 : 0;

  React.useEffect(() => {
    p.value = withTiming(isMorning ? 0 : 1, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMorning]);

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(p.value, [0, 1], [0, half], Extrapolation.CLAMP) }],
  }));
  const morningText = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [puraReveal.white, puraReveal.muted]),
  }));
  const eveningText = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [puraReveal.muted, puraReveal.white]),
  }));

  return (
    <View
      style={styles.toggleTrack}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
    >
      {half > 0 ? (
        <Animated.View style={[styles.toggleHighlight, { width: half }, highlightStyle]} />
      ) : null}
      <Pressable
        style={styles.toggleHalf}
        onPress={() => onChange('morning')}
        accessibilityRole="button"
        accessibilityState={{ selected: isMorning }}
        accessibilityLabel="Morning"
      >
        <Animated.Text style={[puraRevealType.cta, styles.toggleLabel, morningText]}>
          Morning
        </Animated.Text>
      </Pressable>
      <Pressable
        style={styles.toggleHalf}
        onPress={() => onChange('evening')}
        accessibilityRole="button"
        accessibilityState={{ selected: !isMorning }}
        accessibilityLabel="Evening"
      >
        <Animated.Text style={[puraRevealType.cta, styles.toggleLabel, eveningText]}>
          Evening
        </Animated.Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card body — the shared product card (pillar name · product · guidance ·
// thumbnail). Used at rest in both modes; the swipe + drag chrome wrap it.
// ---------------------------------------------------------------------------

function CardBody({
  row,
  done,
  rightNode,
}: {
  row: Row;
  done: boolean;
  rightNode: React.ReactNode;
}) {
  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={styles.cardTopRow}>
        <Text style={[puraRevealType.link, { color: puraReveal.muted }]}>{row.label}</Text>
        {rightNode}
      </View>

      <View style={styles.cardBodyRow}>
        <View style={styles.cardText}>
          {row.product ? (
            <>
              <Text
                style={[puraRevealType.productName, { color: puraReveal.ink }]}
                numberOfLines={2}
              >
                {row.product.name}
              </Text>
              <Text style={[puraRevealType.brandCaps, styles.brand, { color: puraReveal.muted }]}>
                {row.product.brand}
              </Text>
            </>
          ) : (
            <Text style={[puraRevealType.productName, { color: puraReveal.muted }]}>
              Choose a product
            </Text>
          )}
          <Text style={[puraRevealType.guidance, styles.guidance, { color: puraReveal.muted }]}>
            {row.guidance}
          </Text>
        </View>

        {row.packshot ? (
          <Image source={row.packshot} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]} />
        )}
      </View>
    </View>
  );
}

function CheckCircle() {
  return (
    <View style={styles.checkCircle}>
      <Check size={16} weight="bold" color={puraReveal.white} />
    </View>
  );
}

function SwipeHint() {
  return (
    <View style={styles.swipeHint} pointerEvents="none">
      <CaretLeft size={13} weight="bold" color={puraReveal.veryMuted} />
      <CaretLeft size={13} weight="bold" color={puraReveal.ringTrack} style={styles.swipeHintGhost} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Swipe-to-complete card (view mode). Drag left to reveal the Pura Blue
// action zone; release past the threshold to toggle completion for the day.
// ---------------------------------------------------------------------------

function SwipeStepCard({
  row,
  done,
  cardW,
  onCommit,
}: {
  row: Row;
  done: boolean;
  cardW: number;
  onCommit: () => void;
}) {
  const tx = useSharedValue(0);
  const prog = useSharedValue(0);
  const pop = useSharedValue(1);
  const armed = useSharedValue(false);

  const maxSlide = Math.max(120, cardW * 0.42);

  const commit = React.useCallback(() => {
    if (done) hapt.tap();
    else hapt.success();
    onCommit();
  }, [done, onCommit]);

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-14, 14])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          const dx = Math.max(-maxSlide, Math.min(0, e.translationX * SWIPE_RESISTANCE));
          tx.value = dx;
          const ratio = Math.min(1, -dx / SWIPE_THRESHOLD);
          prog.value = ratio;
          const nowArmed = ratio >= 1;
          if (nowArmed !== armed.value) {
            armed.value = nowArmed;
            if (nowArmed) runOnJS(hapt.tap)();
          }
        })
        .onEnd(() => {
          if (-tx.value >= SWIPE_THRESHOLD) {
            pop.value = withSequence(
              withTiming(1.04, { duration: 130 }),
              withTiming(1, { duration: 220 }),
            );
            tx.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
            prog.value = withTiming(0, { duration: 200 });
            runOnJS(commit)();
          } else {
            tx.value = withSpring(0, { stiffness: 240, damping: 26 });
            prog.value = withTiming(0, { duration: 160 });
          }
          armed.value = false;
        }),
    [maxSlide, commit],
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { scale: pop.value }],
  }));
  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(prog.value, [0.35, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(prog.value, [0.35, 1], [0.9, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={styles.swipeOuter}>
      <View style={styles.reveal}>
        <Animated.View style={[styles.revealInner, revealStyle]}>
          <Check size={17} weight="bold" color={puraReveal.white} />
          <Text style={[puraRevealType.stepMeta, styles.revealLabel]}>
            {done ? 'Release to undo' : 'Release to complete'}
          </Text>
        </Animated.View>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>
          <CardBody row={row} done={done} rightNode={done ? <CheckCircle /> : <SwipeHint />} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Completion meter + all-done celebration.
// ---------------------------------------------------------------------------

function CompletionSection({
  doneCount,
  total,
  allDone,
  completeTitle,
}: {
  doneCount: number;
  total: number;
  allDone: boolean;
  completeTitle: string;
}) {
  return (
    <View style={styles.completion}>
      <View style={styles.meterTrack}>
        <View
          style={[
            styles.meterFill,
            { width: total > 0 ? `${(doneCount / total) * 100}%` : '0%' },
          ]}
        />
      </View>
      <View style={styles.completionLabelRow}>
        {allDone ? (
          <Sparkle size={18} weight="fill" color={puraReveal.blue} />
        ) : null}
        <Text
          style={[
            allDone ? puraRevealType.focusPhrase : puraRevealType.stepMeta,
            { color: allDone ? puraReveal.ink : puraReveal.muted },
          ]}
        >
          {allDone ? completeTitle : `${doneCount} of ${total} complete`}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty state + add-step affordances.
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyDisc}>
        <Sparkle size={30} weight="fill" color={puraReveal.blue} />
      </View>
      <Text style={[puraRevealType.focusPhrase, styles.emptyTitle, { color: puraReveal.ink }]}>
        No steps yet
      </Text>
      <Text style={[puraRevealType.body, styles.emptyBody, { color: puraReveal.muted }]}>
        Add your first step to get started.
      </Text>
      <Pressable
        onPress={() => {
          hapt.tap();
          onAdd();
        }}
        accessibilityRole="button"
        accessibilityLabel="Add step"
        style={({ pressed }) => [styles.emptyPill, pressed && styles.pressedDim]}
      >
        <Plus size={16} weight="bold" color={puraReveal.onInk} />
        <Text style={[puraRevealType.cta, { color: puraReveal.onInk }]}>Add step</Text>
      </Pressable>
    </View>
  );
}

function AddStepCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        hapt.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Add step"
      style={({ pressed }) => [styles.addCard, pressed && styles.pressedDim]}
    >
      <Plus size={17} weight="bold" color={puraReveal.blue} />
      <Text style={[puraRevealType.cta, { color: puraReveal.blue }]}>Add step</Text>
    </Pressable>
  );
}

function AddStepSheet({
  visible,
  present,
  onPick,
  onClose,
}: {
  visible: boolean;
  present: Set<PillarKey>;
  onPick: (pillar: PillarKey) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.sheetRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <Animated.View
          entering={SlideInDown.duration(300).easing(Easing.out(Easing.cubic))}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}
        >
          <View style={styles.grabber} />
          <Text style={[puraRevealType.focusPhrase, styles.sheetTitle, { color: puraReveal.ink }]}>
            Add a step
          </Text>
          <Text style={[puraRevealType.body, styles.sheetSub, { color: puraReveal.muted }]}>
            Pura will find a product for it.
          </Text>

          <View style={styles.sheetList}>
            {PILLAR_KEYS.map((key) => {
              const id = PILLAR_IDENTITY[key];
              const added = present.has(key);
              return (
                <Pressable
                  key={key}
                  disabled={added}
                  onPress={() => onPick(key)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: added }}
                  accessibilityLabel={`Add ${id.label}`}
                  style={({ pressed }) => [
                    styles.sheetRow,
                    added && styles.sheetRowDisabled,
                    !added && pressed && styles.pressedDim,
                  ]}
                >
                  <PillarIcon pillar={key} size={40} dim={added} />
                  <View style={styles.sheetRowText}>
                    <Text style={[puraRevealType.focusPhrase, { color: puraReveal.ink }]}>
                      {id.label}
                    </Text>
                    <Text style={[puraRevealType.pillarDesc, { color: puraReveal.muted }]}>
                      {id.description}
                    </Text>
                  </View>
                  {added ? (
                    <Text style={[puraRevealType.stepMeta, { color: puraReveal.veryMuted }]}>
                      Added
                    </Text>
                  ) : (
                    <Plus size={18} weight="bold" color={puraReveal.blue} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraReveal.bg,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  headerDock: {
    paddingHorizontal: puraRevealLayout.screenPadding,
    paddingTop: 6,
  },
  scrollBody: {
    paddingHorizontal: puraRevealLayout.screenPadding,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleSparkle: {
    marginLeft: 8,
  },
  dateLabel: {
    marginTop: 2,
  },

  // AM/PM toggle
  toggleTrack: {
    flexDirection: 'row',
    height: 40,
    marginTop: 18,
    borderRadius: puraRevealRadius.pill,
    backgroundColor: puraReveal.porcelain,
    padding: 4,
    position: 'relative',
  },
  toggleHighlight: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: puraRevealRadius.pill,
    backgroundColor: puraReveal.blue,
  },
  toggleHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    letterSpacing: 0,
  },

  // Section head
  sectionHead: {
    marginTop: 24,
    marginBottom: 14,
  },
  sectionMeta: {
    marginTop: 4,
  },

  // Cards
  cards: {
    gap: puraRevealLayout.cardGap,
  },
  swipeOuter: {
    borderRadius: puraRevealRadius.card,
    overflow: 'hidden',
  },
  reveal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: puraReveal.blue,
    borderRadius: puraRevealRadius.card,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 22,
  },
  revealInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  revealLabel: {
    color: puraReveal.white,
  },
  card: {
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...puraRevealShadow.card,
  },
  cardDone: {
    backgroundColor: puraReveal.porcelainDeep,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 14,
  },
  cardText: {
    flex: 1,
  },
  brand: {
    marginTop: 5,
  },
  guidance: {
    marginTop: 8,
  },
  thumb: {
    width: puraRevealLayout.thumb,
    height: puraRevealLayout.thumb,
    borderRadius: puraRevealRadius.thumb,
    backgroundColor: puraReveal.porcelain,
  },
  thumbEmpty: {
    borderWidth: 1,
    borderColor: puraReveal.border,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: puraReveal.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeHintGhost: {
    marginLeft: -5,
  },

  // Edit rows
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: puraRevealLayout.cardGap,
  },
  editRowActive: {
    opacity: 0.97,
  },
  dragHandle: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: 6,
  },
  editCardWrap: {
    flex: 1,
  },
  deleteBtn: {
    width: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 6,
  },

  // Add affordances
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: puraRevealRadius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: puraReveal.blue,
    marginTop: 2,
  },

  // Completion
  completion: {
    marginTop: 22,
  },
  meterTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    backgroundColor: puraReveal.divider,
    overflow: 'hidden',
  },
  meterFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: puraReveal.blue,
  },
  completionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },

  // Why these products
  whyCard: {
    marginTop: 24,
    backgroundColor: puraReveal.porcelain,
    borderRadius: puraRevealRadius.cardLg,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  whyTitle: {
    marginBottom: 12,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  whyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: puraReveal.blue,
    marginTop: 9,
    marginRight: 10,
  },
  whyText: {
    flex: 1,
  },

  footer: {
    alignItems: 'center',
    marginTop: 18,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 8,
  },
  emptyDisc: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: puraReveal.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 18,
  },
  emptyBody: {
    marginTop: 6,
    textAlign: 'center',
  },
  emptyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    height: 50,
    paddingHorizontal: 24,
    borderRadius: puraRevealRadius.pill,
    backgroundColor: puraReveal.ctaInk,
    ...puraRevealShadow.cta,
  },

  // Add-step sheet
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 22, 56, 0.28)',
  },
  sheet: {
    backgroundColor: puraReveal.porcelain,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: puraRevealLayout.screenPadding,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: puraReveal.ringTrack,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22,
    lineHeight: 27,
  },
  sheetSub: {
    marginTop: 4,
  },
  sheetList: {
    marginTop: 18,
    gap: 10,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  sheetRowDisabled: {
    opacity: 0.55,
  },
  sheetRowText: {
    flex: 1,
    gap: 3,
  },

  pressedDim: {
    opacity: 0.7,
  },
});
