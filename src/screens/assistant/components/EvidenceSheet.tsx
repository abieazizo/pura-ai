import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { X } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionEyebrow } from './SectionEyebrow';
import { PrimaryDecisionButton } from './PrimaryDecisionButton';
import { FaceRegionPreview } from './FaceRegionPreview';

type Region = 'chin' | 'forehead' | 'cheeks' | 'tZone' | 'nose' | 'jawline';

/** Maps the canonical scan-observation `keyArea` string (which is
 *  human-readable: "Chin area", "Forehead", etc.) to the closed
 *  Region union the FaceRegionPreview understands. Defaults to chin
 *  — the most common recovery-night region. */
function mapRegion(keyArea: string | undefined): Region {
  if (!keyArea) return 'chin';
  const k = keyArea.toLowerCase();
  if (k.includes('forehead')) return 'forehead';
  if (k.includes('cheek')) return 'cheeks';
  if (k.includes('t-zone') || k.includes('tzone')) return 'tZone';
  if (k.includes('nose')) return 'nose';
  if (k.includes('jaw')) return 'jawline';
  return 'chin';
}
import { dx, dRadius } from '../decisionTokens';
import { EVIDENCE_SHEET } from '../decisionCopy';
import type { TonightDecision, UserSensation } from '@/state/tonightDecision';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface Props {
  visible: boolean;
  decision: TonightDecision;
  onClose: () => void;
  onSensation: (s: 'NORMAL' | 'TIGHT_OR_DRY' | 'STINGS_OR_BURNS') => void;
  onApply: () => void;
}

/**
 * The "Why tonight changed" sheet.
 *
 * Lays out the evidence behind tonight's decision in five distinct
 * sections (state badge, observed change, contributing routine,
 * Pura's reasoning, refinement). When the user picks "Stings or
 * burns" the decision escalates to RESET_NIGHT, the primary CTA
 * label switches, and a corresponding response is shown.
 */
export function EvidenceSheet({
  visible,
  decision,
  onClose,
  onSensation,
  onApply,
}: Props) {
  const reduceMotion = useReduceMotion();
  const ty = useSharedValue(reduceMotion ? 0 : 24);
  const op = useSharedValue(reduceMotion ? 1 : 0);
  const [activeSensation, setActiveSensation] = useState<UserSensation>(
    decision.userSensation,
  );

  useEffect(() => {
    if (visible) {
      setActiveSensation(decision.userSensation);
      if (reduceMotion) {
        ty.value = 0;
        op.value = 1;
      } else {
        ty.value = withTiming(0, {
          duration: 280,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        });
        op.value = withTiming(1, { duration: 280 });
      }
    } else {
      if (reduceMotion) {
        ty.value = 24;
        op.value = 0;
      } else {
        ty.value = withTiming(24, { duration: 220 });
        op.value = withTiming(0, { duration: 220 });
      }
    }
  }, [visible, reduceMotion, ty, op, decision.userSensation]);

  const animated = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  const pickSensation = (s: 'NORMAL' | 'TIGHT_OR_DRY' | 'STINGS_OR_BURNS') => {
    hapt.select();
    setActiveSensation(s);
    onSensation(s);
  };

  const isReset = activeSensation === 'STINGS_OR_BURNS';

  let sensationResponse: string | null = null;
  if (activeSensation === 'NORMAL') sensationResponse = EVIDENCE_SHEET.responseNormal;
  else if (activeSensation === 'TIGHT_OR_DRY') sensationResponse = EVIDENCE_SHEET.responseTight;
  else if (activeSensation === 'STINGS_OR_BURNS') sensationResponse = EVIDENCE_SHEET.responseBurns;

  const primaryLabel = isReset ? EVIDENCE_SHEET.primaryReset : EVIDENCE_SHEET.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          accessibilityHint="Closes the evidence sheet"
        />
        <Animated.View style={[styles.sheet, animated]}>
          <SafeAreaView edges={['bottom']} style={styles.sheetInner}>
            <View style={styles.handleBar} />
            <View style={styles.headerRow}>
              <Text
                style={styles.title}
                accessibilityRole="header"
                maxFontSizeMultiplier={1.2}
              >
                {EVIDENCE_SHEET.title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={EVIDENCE_SHEET.closeA11y}
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.86 }]}
                hitSlop={6}
              >
                <X size={18} color={dx.ink} weight="bold" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stateBadge} maxFontSizeMultiplier={1.1}>
                {decision.state === 'RESET_NIGHT'
                  ? 'RESET NIGHT'
                  : decision.state === 'STANDARD_NIGHT'
                    ? 'STANDARD NIGHT'
                    : decision.state === 'TREATMENT_NIGHT'
                      ? 'TREATMENT NIGHT'
                      : 'RECOVERY NIGHT'}
              </Text>
              <Text style={styles.observation} maxFontSizeMultiplier={1.2}>
                {decision.scanObservation?.changeSummary
                  ? decision.scanObservation.changeSummary.charAt(0).toUpperCase() +
                    decision.scanObservation.changeSummary.slice(1) + "."
                  : EVIDENCE_SHEET.observation}
              </Text>

              <View style={styles.section}>
                <SectionEyebrow label={EVIDENCE_SHEET.sectionObserved} />
                <View style={styles.observedCard}>
                  <View style={styles.observedHero}>
                    <FaceRegionPreview
                      region={mapRegion(decision.scanObservation?.keyArea)}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.areaName} maxFontSizeMultiplier={1.25}>
                        {decision.scanObservation?.keyArea ?? 'Chin area'}
                      </Text>
                      <Text style={styles.areaSub} maxFontSizeMultiplier={1.25}>
                        {decision.scanObservation?.areaChangeLabel ?? 'Irritation increased'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.comparisonRow}>
                    <View style={styles.comparisonCol}>
                      <Text style={styles.comparisonLabel} maxFontSizeMultiplier={1.2}>
                        {EVIDENCE_SHEET.todayLabel}
                      </Text>
                      <Text style={styles.comparisonText} maxFontSizeMultiplier={1.25}>
                        {EVIDENCE_SHEET.todayText}
                      </Text>
                    </View>
                    <View style={styles.comparisonDivider} />
                    <View style={styles.comparisonCol}>
                      <Text style={styles.comparisonLabel} maxFontSizeMultiplier={1.2}>
                        {EVIDENCE_SHEET.yesterdayLabel}
                      </Text>
                      <Text style={styles.comparisonText} maxFontSizeMultiplier={1.25}>
                        {EVIDENCE_SHEET.yesterdayText}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <SectionEyebrow label={EVIDENCE_SHEET.sectionContrib} />
                <Text style={styles.bodyText} maxFontSizeMultiplier={1.3}>
                  {EVIDENCE_SHEET.contribBody}
                </Text>
                <View style={styles.contribList}>
                  {decision.adjustments
                    .filter(
                      (a) =>
                        a.status === 'HELD_TONIGHT' ||
                        a.status === 'AVOID_UNTIL_RECHECK',
                    )
                    .map((a) => (
                      <View key={a.productName} style={styles.contribItem}>
                        <Text
                          style={styles.contribName}
                          maxFontSizeMultiplier={1.25}
                        >
                          {a.productName}
                        </Text>
                        <Text
                          style={styles.contribKind}
                          maxFontSizeMultiplier={1.25}
                        >
                          {a.category}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>

              <View style={styles.section}>
                <SectionEyebrow label={EVIDENCE_SHEET.sectionWhy} />
                <Text style={styles.bodyText} maxFontSizeMultiplier={1.3}>
                  {EVIDENCE_SHEET.whyBody}
                </Text>
              </View>

              <View style={styles.section}>
                <SectionEyebrow label={EVIDENCE_SHEET.sectionRefine} />
                <Text style={styles.refinePrompt} maxFontSizeMultiplier={1.25}>
                  {EVIDENCE_SHEET.refinePrompt}
                </Text>
                <View style={styles.sensationRow}>
                  <SensationButton
                    label={EVIDENCE_SHEET.sensationNormal}
                    active={activeSensation === 'NORMAL'}
                    onPress={() => pickSensation('NORMAL')}
                  />
                  <SensationButton
                    label={EVIDENCE_SHEET.sensationTight}
                    active={activeSensation === 'TIGHT_OR_DRY'}
                    onPress={() => pickSensation('TIGHT_OR_DRY')}
                  />
                  <SensationButton
                    label={EVIDENCE_SHEET.sensationBurns}
                    active={activeSensation === 'STINGS_OR_BURNS'}
                    onPress={() => pickSensation('STINGS_OR_BURNS')}
                  />
                </View>
                {sensationResponse ? (
                  <View
                    style={[
                      styles.sensationResponse,
                      isReset && styles.sensationResponseReset,
                    ]}
                  >
                    <Text style={styles.sensationResponseText} maxFontSizeMultiplier={1.3}>
                      {sensationResponse}
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <PrimaryDecisionButton label={primaryLabel} onPress={onApply} />
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SensationButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sensationBtn,
        active && styles.sensationBtnActive,
        pressed && { opacity: 0.9 },
      ]}
      hitSlop={4}
    >
      {active ? <View style={styles.sensationDot} /> : null}
      <Text
        style={[
          styles.sensationLabel,
          active && styles.sensationLabelActive,
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(37, 25, 19, 0.34)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: dx.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  sheetInner: { paddingHorizontal: 0 },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: dx.borderStrong,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: dx.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: dx.surfaceSecondary,
    borderWidth: 1,
    borderColor: dx.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 16 },
  stateBadge: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: dx.terracottaText,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  observation: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: dx.ink,
    letterSpacing: -0.2,
    marginTop: 6,
  },
  section: {
    marginTop: 24,
    gap: 8,
  },
  observedCard: {
    backgroundColor: dx.surfacePrimary,
    borderRadius: dRadius.evidenceTile,
    borderWidth: 1,
    borderColor: dx.line,
    overflow: 'hidden',
  },
  observedHero: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    alignItems: 'center',
  },
  areaName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: dx.ink,
    letterSpacing: -0.1,
  },
  areaSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    color: dx.inkSecondary,
    lineHeight: 18,
  },
  comparisonRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: dx.hairline,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  comparisonCol: { flex: 1, gap: 2 },
  comparisonDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: dx.hairline,
    marginHorizontal: 12,
  },
  comparisonLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: dx.inkMuted,
  },
  comparisonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: dx.ink,
    lineHeight: 18,
  },
  bodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: dx.inkSecondary,
  },
  contribList: { gap: 8, marginTop: 6 },
  contribItem: { gap: 1 },
  contribName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: dx.ink,
  },
  contribKind: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: dx.inkSecondary,
  },
  refinePrompt: {
    fontFamily: 'Inter-Medium',
    fontSize: 14.5,
    lineHeight: 19,
    color: dx.ink,
    marginTop: 4,
  },
  sensationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  sensationBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: dRadius.pill,
    borderWidth: 1,
    borderColor: dx.line,
    backgroundColor: dx.surfacePrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sensationBtnActive: {
    borderColor: dx.terracotta,
    backgroundColor: dx.terracottaSoft,
  },
  sensationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: dx.terracotta,
  },
  sensationLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: dx.ink,
    letterSpacing: -0.05,
  },
  sensationLabelActive: {
    color: dx.terracottaText,
    fontFamily: 'Inter-SemiBold',
  },
  sensationResponse: {
    marginTop: 10,
    backgroundColor: dx.surfacePrimary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dx.line,
    padding: 14,
  },
  sensationResponseReset: {
    backgroundColor: dx.clayHold,
    borderColor: dx.terracottaTint,
  },
  sensationResponseText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: dx.ink,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dx.hairline,
    backgroundColor: dx.paper,
  },
});
