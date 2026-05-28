/**
 * AssistantScreen — v27 Decision Room.
 *
 * The AI Assist tab is no longer a chat-first surface. It opens on a
 * single Tonight's Decision card and answers exactly one question:
 *
 *   "Given what Pura knows about my skin today, what should I do
 *    differently tonight?"
 *
 * Two modes coexist inside the screen:
 *
 *   DECISION MODE     default. Decision card + evidence tiles +
 *                     adjustments + suggested prompts.
 *   CONVERSATION MODE entered when the user taps a prompt or sends a
 *                     message. The compressed decision anchor stays
 *                     pinned at the top of the thread so the active
 *                     decision never disappears into stale chat.
 *
 * Reads canonical state from useTonightDecision() — never recomputes
 * the decision inline. Apply / sensation / morning-after writes go
 * through the store actions so state survives a tab switch.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/store/useAppStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import type { RootStackParamList } from '@/navigation/types';
import {
  useTonightDecision,
  useMorningAfterPromptVisible,
  type TonightDecision,
} from '@/state/tonightDecision';

import { AssistantHeader } from './components/AssistantHeader';
import { TonightDecisionCard } from './components/TonightDecisionCard';
import { EvidenceTileRow } from './components/EvidenceTileRow';
import { RoutineAdjustmentRow } from './components/RoutineAdjustmentRow';
import { DecisionPromptList } from './components/DecisionPromptList';
import { AppliedConfirmationPanel } from './components/AppliedConfirmationPanel';
import { CompressedDecisionAnchor } from './components/CompressedDecisionAnchor';
import { StickyComposer } from './components/StickyComposer';
import { SectionEyebrow } from './components/SectionEyebrow';
import { ChallengeResponseCard } from './components/ChallengeResponseCard';
import { ResetNightResponseCard } from './components/ResetNightResponseCard';
import { SubstituteResponseCard } from './components/SubstituteResponseCard';
import { UserMessageBubble } from './components/UserMessageBubble';
import { AssistantGroundingRow } from './components/AssistantGroundingRow';
import { AssistantThinking } from './components/AssistantThinking';
import { MorningAfterPrompt } from './components/MorningAfterPrompt';
import { EmptyStateCard } from './components/EmptyStateCard';
import { EvidenceSheet } from './components/EvidenceSheet';
import { BasedOnLine } from './components/BasedOnLine';
import { SecondaryActionButton } from './components/SecondaryActionButton';

import { dx } from './decisionTokens';
import {
  ADJUSTMENTS,
  CHALLENGE_EXFOLIATE,
  CHALLENGE_RETINOID,
  CHALLENGE_RESTART,
  COMPOSER,
  EVIDENCE,
  PROMPTS,
  NO_SCAN,
  NO_PRODUCTS,
  STABLE_STANDARD,
  PROVENANCE,
  INTENT_GROUNDING,
} from './decisionCopy';
import { classifyDecisionIntent, type DecisionIntent } from './decisionIntent';

// ---------------------------------------------------------------------------
// Local conversation model — kept in-screen so the Decision Room owns its
// own thread without touching the legacy global `messages` array.
// ---------------------------------------------------------------------------

type ConversationEntry =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'thinking'; id: string }
  | {
      kind: 'assistant';
      id: string;
      intent: DecisionIntent;
      sourceText: string;
    };

// ---------------------------------------------------------------------------
// Provenance line builder
// ---------------------------------------------------------------------------

function buildProvenanceLine(decision: TonightDecision): string {
  const p = decision.provenance;
  if (p.usedLatestScan && p.usedPreviousScan && p.usedRoutine && p.usedIngredientCheck) {
    return PROVENANCE.fullData;
  }
  if (p.usedLatestScan && !p.usedRoutine) return PROVENANCE.limitedProducts;
  if (p.usedLatestScan && !p.usedPreviousScan) return PROVENANCE.noPrior;
  if (decision.basedOn.length > 0) {
    return `Based on ${decision.basedOn.map((s) => s.toLowerCase()).join(', ')}.`;
  }
  return PROVENANCE.fullData;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

type ListItem =
  | { kind: 'decision-card' }
  | { kind: 'morning-after' }
  | { kind: 'applied-confirmation' }
  | { kind: 'evidence' }
  | { kind: 'scan-stale'; staleDays: number }
  | { kind: 'adjustments' }
  | { kind: 'provenance' }
  | { kind: 'prompts' }
  | { kind: 'empty-no-scan' }
  | { kind: 'empty-no-products' }
  | { kind: 'stable-standard' }
  | { kind: 'compressed-anchor' }
  | { kind: 'entry'; entry: ConversationEntry; isLast: boolean }
  | { kind: 'bottom-spacer'; height: number };

export function AssistantScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const reduceMotion = useReduceMotion();
  // The AssistantScreen always renders inside a Bottom Tab navigator
  // — this hook is safe to call unconditionally here.
  const tabBarHeight = useBottomTabBarHeight();
  // Composer height: paddingTop(8) + row(44) + paddingBottom(10) = 62px.
  // Add 14px breathing room so the last list row lifts clear of the edge.
  const composerClearance = 76; // 62 + 14

  const decision = useTonightDecision();
  const morningAfterVisible = useMorningAfterPromptVisible();

  const applyTonight = useAppStore((s) => s.applyTonightDecision);
  const undoTonight = useAppStore((s) => s.undoTonightDecision);
  const setSensation = useAppStore((s) => s.setUserSensation);
  const setOverride = useAppStore((s) => s.setTonightDecisionOverride);
  const setMorningAfter = useAppStore((s) => s.setMorningAfterFeedback);
  const morningAfterFeedback = useAppStore((s) => s.morningAfterFeedback);
  const ownedProductCount = useAppStore(
    (s) => s.userRoutineMorning.length + s.userRoutineEvening.length,
  );
  const storedConversation = useAppStore((s) => s.decisionConversation);
  const persistConversation = useAppStore((s) => s.setDecisionConversation);
  const clearPersistedConversation = useAppStore((s) => s.clearDecisionConversation);

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  // Initialize conversation from persisted store so the thread survives
  // tab switches. The cast is safe: stored entries are user/assistant only,
  // which are both valid ConversationEntry shapes.
  const [conversation, setConversation] = useState<ConversationEntry[]>(
    () => storedConversation as ConversationEntry[],
  );
  const [draft, setDraft] = useState('');
  const [composerFocused, setComposerFocused] = useState(false);

  const listRef = useRef<FlatList<ListItem>>(null);

  const conversationActive = conversation.length > 0;

  // Composer placeholder shifts with state.
  const placeholder = useMemo(() => {
    if (decision.applied && decision.state === 'RECOVERY_NIGHT')
      return COMPOSER.placeholderApplied;
    if (decision.state === 'RESET_NIGHT') return COMPOSER.placeholderReset;
    if (decision.state === 'STANDARD_NIGHT') return COMPOSER.placeholderStandard;
    return COMPOSER.placeholderDecision;
  }, [decision.applied, decision.state]);

  const promptsForState = useMemo(() => {
    if (decision.state === 'RECOVERY_NIGHT') return PROMPTS.recovery;
    if (decision.state === 'RESET_NIGHT') return PROMPTS.reset;
    return PROMPTS.standard;
  }, [decision.state]);

  // ---- Navigation helpers ----
  const goRoutine = useCallback(() => {
    // @ts-expect-error nested tab navigation typing
    nav.navigate('Tabs', { screen: 'RoutineTab' });
  }, [nav]);
  const goScan = useCallback(() => {
    nav.navigate('ScanModal');
  }, [nav]);
  const goProducts = useCallback(() => {
    // @ts-expect-error nested tab navigation typing
    nav.navigate('Tabs', { screen: 'ProductsTab' });
  }, [nav]);

  // ---- Conversation actions ----
  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      hapt.tap();
      setDraft('');
      const userId = `u-${Date.now()}`;
      const thinkingId = `t-${Date.now()}`;
      const intent = classifyDecisionIntent(trimmed);
      const assistantId = `a-${Date.now()}`;

      // Append the user bubble + thinking dots immediately.
      setConversation((prev) => [
        ...prev,
        { kind: 'user', id: userId, text: trimmed },
        { kind: 'thinking', id: thinkingId },
      ]);
      // Side-effect: reporting burning sets the sensation override.
      if (intent === 'REPORT_BURNING') {
        setSensation('STINGS_OR_BURNS');
      } else if (intent === 'REPORT_TIGHT') {
        setSensation('TIGHT_OR_DRY');
      }
      // Auto-scroll right after the user bubble lands.
      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd({ animated: !reduceMotion });
        } catch {
          /* not ready yet */
        }
      }, 80);
      // Replace the thinking row with the assistant card after a
      // calm 360ms — short enough to feel decisive, long enough to
      // read intentional. Reduced motion users still see the dots
      // for a single frame so the transition isn't jarring.
      const revealDelay = reduceMotion ? 80 : 360;
      setTimeout(() => {
        setConversation((prev) =>
          prev
            .filter((e) => !(e.kind === 'thinking' && e.id === thinkingId))
            .concat({
              kind: 'assistant',
              id: assistantId,
              intent,
              sourceText: trimmed,
            }),
        );
        setTimeout(() => {
          try {
            listRef.current?.scrollToEnd({ animated: !reduceMotion });
          } catch {
            /* not ready yet */
          }
        }, 60);
      }, revealDelay);
    },
    [reduceMotion, setSensation],
  );

  const onPickPrompt = useCallback(
    (prompt: string) => {
      send(prompt);
    },
    [send],
  );

  const onApply = useCallback(() => {
    applyTonight();
    hapt.success();
  }, [applyTonight]);

  const onAskWhy = useCallback(() => {
    hapt.select();
    setEvidenceOpen(true);
  }, []);

  const onViewDecision = useCallback(() => {
    hapt.select();
    setConversation([]);
    clearPersistedConversation();
  }, [clearPersistedConversation]);

  // Sync non-thinking entries to the store so the thread persists across
  // tab switches. Thinking entries are transient UI — never persisted.
  useEffect(() => {
    const persistable = conversation.filter(
      (e): e is Exclude<ConversationEntry, { kind: 'thinking' }> =>
        e.kind !== 'thinking',
    );
    persistConversation(persistable);
  }, [conversation, persistConversation]);

  const onSensationFromSheet = useCallback(
    (s: 'NORMAL' | 'TIGHT_OR_DRY' | 'STINGS_OR_BURNS') => {
      setSensation(s);
    },
    [setSensation],
  );

  const onSheetApply = useCallback(() => {
    setEvidenceOpen(false);
    applyTonight();
    hapt.success();
  }, [applyTonight]);

  const onMorningAfter = useCallback(
    (a: 'BETTER' | 'SAME' | 'WORSE') => {
      setMorningAfter(a);
    },
    [setMorningAfter],
  );

  const onCheckAnotherProduct = useCallback(() => {
    goProducts();
  }, [goProducts]);

  // ---- List composition ----
  const items: ListItem[] = useMemo(() => {
    const out: ListItem[] = [];

    // Empty / incomplete states get precedence over the decision card.
    if (decision.state === 'CHECK_IN_REQUIRED' && !conversationActive) {
      out.push({ kind: 'empty-no-scan' });
      out.push({
        kind: 'bottom-spacer',
        height: composerClearance + 16,
      });
      return out;
    }

    if (conversationActive) {
      out.push({ kind: 'compressed-anchor' });
      conversation.forEach((entry, i) => {
        out.push({
          kind: 'entry',
          entry,
          isLast: i === conversation.length - 1,
        });
      });
      out.push({
        kind: 'bottom-spacer',
        height: composerClearance + 16,
      });
      return out;
    }

    // Decision Mode.
    if (morningAfterVisible) {
      out.push({ kind: 'morning-after' });
    }

    out.push({ kind: 'decision-card' });

    if (decision.applied) {
      out.push({ kind: 'applied-confirmation' });
    }

    // Scan exists but no products owned — surface the "add my products"
    // affordance underneath the decision card so the user has a clear
    // path to enriching tonight's plan.
    if (
      decision.scanObservation &&
      ownedProductCount === 0 &&
      decision.state === 'RECOVERY_NIGHT'
    ) {
      out.push({ kind: 'empty-no-products' });
    }

    if (decision.scanObservation && decision.state !== 'STANDARD_NIGHT') {
      out.push({ kind: 'evidence' });
      // Surfaced AFTER evidence tiles — the user sees the data first,
      // then the caveat about its age.
      if (decision.scanObservation.scanAgeHours > 48) {
        const staleDays = Math.floor(decision.scanObservation.scanAgeHours / 24);
        out.push({ kind: 'scan-stale', staleDays });
      }
    }
    if (decision.adjustments.length > 0) {
      out.push({ kind: 'adjustments' });
    }
    out.push({ kind: 'provenance' });
    out.push({ kind: 'prompts' });
    out.push({
      kind: 'bottom-spacer',
      height: composerClearance + 16,
    });

    return out;
  }, [
    decision,
    conversationActive,
    conversation,
    morningAfterVisible,
    ownedProductCount,
    composerClearance,
  ]);

  const provenanceLine = buildProvenanceLine(decision);

  // ---- Render entry ----
  const renderEntry = (entry: ConversationEntry) => {
    if (entry.kind === 'user') {
      return <UserMessageBubble text={entry.text} />;
    }
    if (entry.kind === 'thinking') {
      return <AssistantThinking />;
    }
    const intent = entry.intent;
    const heldRow = decision.adjustments.find(
      (a) => a.status === 'HELD_TONIGHT' || a.status === 'AVOID_UNTIL_RECHECK',
    );
    const useInsteadRow = decision.adjustments.find(
      (a) => a.status === 'PRIORITIZED_TONIGHT' || a.status === 'USE_TONIGHT',
    );

    if (intent === 'REPORT_BURNING') {
      return (
        <ResetNightResponseCard
          onPrimary={() => {
            setOverride('RESET_NIGHT');
            applyTonight();
            hapt.success();
          }}
        />
      );
    }

    if (intent === 'CHALLENGE_EXFOLIATE') {
      const held = heldRow ?? {
        productName: 'Paula’s Choice 2% BHA Liquid',
        category: 'Exfoliating acid',
        status: 'HELD_TONIGHT' as const,
      };
      const use = useInsteadRow ?? {
        productName: 'La Roche-Posay Cicaplast Balm B5',
        category: 'Barrier support',
        status: 'PRIORITIZED_TONIGHT' as const,
      };
      return (
        <ChallengeResponseCard
          groundedLabel={CHALLENGE_EXFOLIATE.groundedBadge}
          heading={CHALLENGE_EXFOLIATE.heading}
          body={CHALLENGE_EXFOLIATE.body}
          heldLabel={CHALLENGE_EXFOLIATE.heldLabel}
          heldRow={{
            productName: held.productName,
            status: `${held.category} · Hold tonight only`,
          }}
          useInsteadLabel={CHALLENGE_EXFOLIATE.useInsteadLabel}
          useInsteadRow={{
            productName: use.productName,
            status: `${use.category} · Already in your routine`,
          }}
          whenLabel={CHALLENGE_EXFOLIATE.whenLabel}
          whenBody={CHALLENGE_EXFOLIATE.whenBody}
          primary={CHALLENGE_EXFOLIATE.primary}
          secondary={CHALLENGE_EXFOLIATE.secondary}
          onPrimary={onApply}
          onSecondary={onCheckAnotherProduct}
          followUps={CHALLENGE_EXFOLIATE.followUps}
          onFollowUp={send}
        />
      );
    }

    if (intent === 'CHALLENGE_RETINOID') {
      const held = heldRow ?? {
        productName: 'Differin Gel',
        category: 'Active treatment',
        status: 'HELD_TONIGHT' as const,
      };
      const use = useInsteadRow ?? {
        productName: 'La Roche-Posay Cicaplast Balm B5',
        category: 'Barrier support',
        status: 'PRIORITIZED_TONIGHT' as const,
      };
      return (
        <ChallengeResponseCard
          groundedLabel={CHALLENGE_RETINOID.groundedBadge}
          heading={CHALLENGE_RETINOID.heading}
          body={CHALLENGE_RETINOID.body}
          heldLabel={CHALLENGE_RETINOID.heldLabel}
          heldRow={{
            productName: held.productName,
            status: `${held.category} · Hold tonight only`,
          }}
          useInsteadLabel={CHALLENGE_RETINOID.useInsteadLabel}
          useInsteadRow={{
            productName: use.productName,
            status: `${use.category} · Already in your routine`,
          }}
          whenLabel={CHALLENGE_RETINOID.whenLabel}
          whenBody={CHALLENGE_RETINOID.whenBody}
          primary={CHALLENGE_RETINOID.primary}
          secondary={CHALLENGE_RETINOID.secondary}
          onPrimary={onApply}
          onSecondary={onCheckAnotherProduct}
          followUps={CHALLENGE_RETINOID.followUps}
          onFollowUp={send}
        />
      );
    }

    if (intent === 'CHALLENGE_RESTART') {
      return (
        <ChallengeResponseCard
          groundedLabel={CHALLENGE_RESTART.groundedBadge}
          heading={CHALLENGE_RESTART.heading}
          body={CHALLENGE_RESTART.body}
          heldLabel="HELD UNTIL NEXT CALM SCAN"
          heldRow={{
            productName:
              heldRow?.productName ?? 'Paula’s Choice 2% BHA Liquid',
            status: 'Exfoliating acid · Reassess after next scan',
          }}
          useInsteadLabel="USE TONIGHT INSTEAD"
          useInsteadRow={{
            productName:
              useInsteadRow?.productName ?? 'La Roche-Posay Cicaplast Balm B5',
            status: 'Barrier support · Already in your routine',
          }}
          whenLabel="WHEN PURA WILL CHECK"
          whenBody="Scan again tomorrow evening. If your chin area no longer appears reactive, I can reassess whether an active night makes sense."
          primary={CHALLENGE_RESTART.primary}
          secondary={CHALLENGE_RESTART.secondary}
          onPrimary={onApply}
          onSecondary={onCheckAnotherProduct}
          followUps={CHALLENGE_RESTART.followUps}
          onFollowUp={send}
        />
      );
    }

    if (intent === 'SUBSTITUTE') {
      const pick = useInsteadRow ?? {
        productName: 'La Roche-Posay Cicaplast Balm B5',
        category: 'Barrier support',
        status: 'PRIORITIZED_TONIGHT' as const,
      };
      return (
        <SubstituteResponseCard
          pick={{
            productName: pick.productName,
            status: `${pick.category} · Best fit for a recovery night`,
          }}
          alsoSafe={[
            {
              productName: 'CeraVe PM Facial Moisturizing Lotion',
              status: 'Barrier-support moisturizer · Already in your routine',
            },
          ]}
          onPrimary={onApply}
          onSecondary={onCheckAnotherProduct}
          followUps={[
            'Can I use my BHA tonight?',
            'Why is this one safer?',
            'When can I restart actives?',
          ]}
          onFollowUp={send}
        />
      );
    }

    if (intent === 'EXPLAIN') {
      const obsSentence = decision.scanObservation
        ? decision.scanObservation.changeSummary.charAt(0).toUpperCase() +
          decision.scanObservation.changeSummary.slice(1) + "."
        : "No previous scan to compare against.";
      return (
        <View style={styles.explainCard}>
          <AssistantGroundingRow label={INTENT_GROUNDING.decision} />
          <Text style={styles.explainHeading} maxFontSizeMultiplier={1.2}>
            {obsSentence}
          </Text>
          <Text style={styles.explainBody} maxFontSizeMultiplier={1.3}>
            {decision.explanation}
          </Text>
          <View style={{ marginTop: 12 }}>
            <SectionEyebrow label="WANT THE FULL EVIDENCE?" />
          </View>
          <Text style={styles.explainBody} maxFontSizeMultiplier={1.3}>
            Open the evidence sheet for the side-by-side comparison and the
            routine context behind tonight’s decision.
          </Text>
          <View style={{ marginTop: 8 }}>
            <SecondaryActionButton
              label="Open evidence sheet"
              onPress={() => setEvidenceOpen(true)}
              underline
            />
          </View>
        </View>
      );
    }

    if (intent === 'REPORT_TIGHT') {
      return (
        <View style={styles.explainCard}>
          <AssistantGroundingRow label={INTENT_GROUNDING.safety} />
          <Text style={styles.explainHeading} maxFontSizeMultiplier={1.2}>
            Keep tonight focused on hydration.
          </Text>
          <Text style={styles.explainBody} maxFontSizeMultiplier={1.3}>
            Tightness usually means your barrier needs a quiet night.
            Skip exfoliation and retinoids; layer a familiar gentle
            moisturizer.
          </Text>
        </View>
      );
    }

    // GENERAL — fall back to the explain shape so we never produce a
    // shopping-style answer for a free-form question.
    return (
      <View style={styles.explainCard}>
        <AssistantGroundingRow label={INTENT_GROUNDING.decision} />
        <Text style={styles.explainHeading} maxFontSizeMultiplier={1.2}>
          {decision.decisionStatement}
        </Text>
        <Text style={styles.explainBody} maxFontSizeMultiplier={1.3}>
          {decision.explanation}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.kind) {
      case 'decision-card':
        return (
          <TonightDecisionCard
            decision={decision}
            eyebrow={decision.eyebrowLabel}
            onApply={onApply}
            onAskWhy={onAskWhy}
          />
        );
      case 'morning-after':
        return (
          <MorningAfterPrompt
            onAnswer={onMorningAfter}
            current={morningAfterFeedback}
          />
        );
      case 'applied-confirmation':
        return (
          <AppliedConfirmationPanel
            decision={decision}
            onViewRoutine={goRoutine}
            onUndo={() => undoTonight()}
          />
        );
      case 'evidence': {
        const obs = decision.scanObservation;
        if (!obs) return null;
        return (
          <Pressable
            style={({ pressed }) => [styles.section, pressed && { opacity: 0.88 }]}
            onPress={onAskWhy}
            accessibilityRole="button"
            accessibilityLabel="View evidence details"
            accessibilityHint="Opens the full evidence sheet"
          >
            <SectionEyebrow label={EVIDENCE.sectionLabel} />
            <View style={styles.spacer8} />
            <EvidenceTileRow
              tiles={[
                {
                  primary: String(obs.skinScore),
                  label: EVIDENCE.scoreLabel,
                  trailing: EVIDENCE.scoreDelta(obs.scoreDeltaFromPrevious),
                },
                {
                  primary: obs.keyArea,
                  label: obs.areaChangeLabel,
                  trailing: obs.hasPreviousScan
                    ? EVIDENCE.comparisonLabel
                    : EVIDENCE.noComparisonLabel,
                },
              ]}
            />
          </Pressable>
        );
      }
      case 'adjustments': {
        return (
          <View style={styles.section}>
            <SectionEyebrow label={ADJUSTMENTS.sectionLabel} />
            <View style={styles.spacer8} />
            <View style={styles.adjustmentsList}>
              {decision.adjustments.map((adj, idx) => (
                <RoutineAdjustmentRow
                  key={`${adj.productName}-${idx}`}
                  adjustment={adj}
                  showDivider={idx < decision.adjustments.length - 1}
                />
              ))}
            </View>
          </View>
        );
      }
      case 'scan-stale':
        return (
          <View style={styles.staleWarning}>
            <Text style={styles.staleText} maxFontSizeMultiplier={1.2}>
              {`Scan is ${item.staleDays} ${item.staleDays === 1 ? 'day' : 'days'} old — a new scan will give more accurate guidance.`}
            </Text>
            <SecondaryActionButton
              label="Start a new scan"
              onPress={goScan}
              underline
            />
          </View>
        );
      case 'provenance':
        return (
          <View style={styles.provenanceRow}>
            <BasedOnLine text={provenanceLine} />
          </View>
        );
      case 'prompts':
        return (
          <View style={styles.section}>
            <SectionEyebrow label={PROMPTS.sectionLabel} />
            <View style={styles.spacer10} />
            <DecisionPromptList prompts={promptsForState} onPick={onPickPrompt} />
          </View>
        );
      case 'stable-standard':
        return (
          <View style={styles.section}>
            <SectionEyebrow label="TONIGHT" />
            <View style={styles.spacer8} />
            <EmptyStateCard
              title={STABLE_STANDARD.title}
              body={STABLE_STANDARD.body}
              primary={STABLE_STANDARD.primary}
              onPrimary={goRoutine}
              secondary={STABLE_STANDARD.secondary}
              onSecondary={goProducts}
            />
          </View>
        );
      case 'empty-no-scan':
        return (
          <EmptyStateCard
            title={NO_SCAN.title}
            body={NO_SCAN.body}
            primary={NO_SCAN.primary}
            onPrimary={goScan}
            secondary={NO_SCAN.secondary}
            onSecondary={() => {
              // Free-form general question — open the composer focused.
              setConversation([
                {
                  kind: 'user',
                  id: `u-${Date.now()}`,
                  text: 'What can you do without a scan?',
                },
                {
                  kind: 'assistant',
                  id: `a-${Date.now()}`,
                  intent: 'GENERAL',
                  sourceText: 'What can you do without a scan?',
                },
              ]);
            }}
            showCameraGlyph
            eyebrowLabel="ONE DETAIL NEEDED"
          />
        );
      case 'empty-no-products':
        return (
          <View style={styles.section}>
            <EmptyStateCard
              title={NO_PRODUCTS.title}
              body={NO_PRODUCTS.body}
              primary={NO_PRODUCTS.primary}
              onPrimary={goProducts}
              secondary={NO_PRODUCTS.secondary}
              onSecondary={() => send('What can you do without my products?')}
              provenance={NO_PRODUCTS.provenance}
              eyebrowLabel="SAFER WITH PRODUCT DATA"
            />
          </View>
        );
      case 'compressed-anchor':
        return (
          <CompressedDecisionAnchor
            decision={decision}
            onViewDecision={onViewDecision}
          />
        );
      case 'entry':
        return reduceMotion ? (
          renderEntry(item.entry)
        ) : (
          <Animated.View
            entering={
              item.entry.kind === 'assistant'
                ? FadeInDown.delay(20).springify().damping(18).stiffness(220).mass(0.8)
                : FadeInUp.duration(200).delay(20).springify().damping(20).stiffness(280)
            }
          >
            {renderEntry(item.entry)}
          </Animated.View>
        );
      case 'bottom-spacer':
        return <View style={{ height: item.height }} />;
      default:
        return null;
    }
  };

  const canSend = draft.trim().length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={tabBarHeight}
      >
        <View style={styles.headerWrap}>
          <AssistantHeader
            utility={conversationActive ? 'back' : undefined}
            onUtilityPress={
              conversationActive ? () => setConversation([]) : undefined
            }
            descriptor={
              conversationActive
                ? 'Refining tonight’s decision.'
                : undefined
            }
          />
        </View>
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item, i) => {
            if (item.kind === 'entry') return `entry-${item.entry.id}`;
            return `${item.kind}-${i}`;
          }}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        />
        <StickyComposer
          value={draft}
          onChange={setDraft}
          onSend={() => send(draft)}
          placeholder={placeholder}
          focused={composerFocused}
          onFocusChange={setComposerFocused}
          canSend={canSend}
          applied={decision.applied}
          reduceMotion={reduceMotion}
        />
      </KeyboardAvoidingView>

      <EvidenceSheet
        visible={evidenceOpen}
        decision={decision}
        onClose={() => setEvidenceOpen(false)}
        onSensation={onSensationFromSheet}
        onApply={onSheetApply}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dx.paper },
  flex: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 18,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 4,
  },
  section: {},
  spacer8: { height: 6 },
  spacer10: { height: 8 },
  adjustmentsList: {
    paddingHorizontal: 0,
  },
  provenanceRow: {
    paddingHorizontal: 2,
  },
  explainCard: {
    backgroundColor: dx.surfacePrimary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: dx.line,
    padding: 16,
    gap: 8,
  },
  explainHeading: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: dx.ink,
    letterSpacing: -0.2,
  },
  explainBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: dx.inkSecondary,
  },
  staleWarning: {
    backgroundColor: dx.terracottaSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dx.terracottaTint,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  staleText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: dx.inkSecondary,
  },
});
