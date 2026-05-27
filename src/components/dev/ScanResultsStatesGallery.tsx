/**
 * Dev-only Scan Results states gallery.
 *
 * Renders fixture-driven previews of every scan-result state so the
 * truth-first contract can be eyeballed end-to-end without driving the
 * camera + AI pipeline each time. Reachable only from AIDiagnostics in
 * __DEV__ builds.
 *
 * The fixtures here are NEVER used by production code paths — they
 * exist only as inputs to the same components production renders.
 * This is the only legitimate place in the project for synthetic scan
 * analyses.
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'phosphor-react-native';
import type {
  FaceLandmarkResult,
  ScanAnalysisResponse,
  ScanInsight,
  VisibleFinding,
} from '@/types/scanResults';
import { scanColors, scanType } from '@/theme/scanResultsTokens';

import { NoClearFindingsScreen } from '@/components/scan-results/NoClearFindingsScreen';
import { ScanServiceErrorScreen } from '@/components/scan-results/ScanServiceErrorScreen';
import { RetakeRequiredScreen } from '@/components/scan-results/RetakeRequiredScreen';
import { ScanResultsPager } from '@/components/scan-results/ScanResultsPager';
import { SkinMapSlide } from '@/components/scan-results/SkinMapSlide';
import { TopFocusAreasSlide } from '@/components/scan-results/TopFocusAreasSlide';
import { PersonalizedInsightsSlide } from '@/components/scan-results/PersonalizedInsightsSlide';

type StateKey =
  | 'index'
  | 'service_error'
  | 'retake_required'
  | 'no_findings'
  | 'no_findings_limited'
  | 'skin_map_texture'
  | 'skin_map_under_eyes'
  | 'skin_map_two'
  | 'focus_one'
  | 'insights_eligible'
  | 'insights_ineligible'
  | 'pager_full_two_findings';

const FIXTURE_PHOTO =
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80';

function makeFixtureGeometry(): FaceLandmarkResult {
  return {
    faceBounds: { x: 0.18, y: 0.14, width: 0.64, height: 0.72 },
    landmarks: {
      leftEye: { x: 0.38, y: 0.4 },
      rightEye: { x: 0.62, y: 0.4 },
      noseTip: { x: 0.5, y: 0.55 },
      mouthCenter: { x: 0.5, y: 0.7 },
      chin: { x: 0.5, y: 0.82 },
      foreheadCenter: { x: 0.5, y: 0.25 },
    },
    orientation: { yaw: 0, pitch: 0, roll: 0 },
    usableForOverlay: true,
  };
}

function makeFinding(
  partial: Partial<VisibleFinding> & {
    type: VisibleFinding['type'];
    zones: VisibleFinding['zones'];
  },
): VisibleFinding {
  const base: VisibleFinding = {
    id: `fix_${partial.type}_${partial.zones.join('_')}`,
    type: partial.type,
    displayName: defaultDisplayName(partial.type),
    present: true,
    supportedByScan: true,
    confidence: 0.78,
    priority: 'high',
    zones: partial.zones,
    shortFinding: defaultShortFinding(partial.type),
    recommendedDirection: defaultDirection(partial.type),
  };
  return { ...base, ...partial };
}

function defaultDisplayName(t: VisibleFinding['type']): string {
  switch (t) {
    case 'texture': return 'Texture';
    case 'under_eye_fatigue': return 'Under-eyes';
    case 'breakouts': return 'Breakouts';
    case 'redness': return 'Redness';
    case 'dryness': return 'Dryness';
    case 'oil_balance': return 'Oil balance';
    case 'dark_marks': return 'Dark marks';
    case 'barrier_stress': return 'Barrier';
  }
}

function defaultShortFinding(t: VisibleFinding['type']): string {
  switch (t) {
    case 'texture': return 'Uneven texture appears most visible across the forehead.';
    case 'under_eye_fatigue': return 'Visible fatigue appears under your eyes.';
    case 'breakouts': return 'Active-looking spots appear concentrated on the chin.';
    case 'redness': return 'Visible redness appears on the left cheek.';
    case 'dryness': return 'Dryness appears on both cheeks.';
    case 'oil_balance': return 'Oil buildup appears across the T-zone.';
    case 'dark_marks': return 'Some dark marks appear on the right cheek.';
    case 'barrier_stress': return 'Slight reactivity appears on the cheeks.';
  }
}

function defaultDirection(t: VisibleFinding['type']): string {
  switch (t) {
    case 'texture': return 'A gentle smoothing step may help.';
    case 'under_eye_fatigue': return 'Gentle hydration is the better lever than aggressive treatment.';
    case 'breakouts': return 'Keep stronger treatment targeted rather than spreading it across calm areas.';
    case 'redness': return 'Calm, simple care while reactivity settles.';
    case 'dryness': return 'Strengthen hydration before adding actives.';
    case 'oil_balance': return 'Lightweight, balancing care may help most.';
    case 'dark_marks': return 'Consistent SPF and gentle brightening can help.';
    case 'barrier_stress': return 'Prioritize gentle, fragrance-free care for a few days.';
  }
}

function makeAnalysis(args: {
  scanId?: string;
  usability: 'full_results' | 'limited_results' | 'retake_required';
  findings: VisibleFinding[];
  insights?: ScanInsight[];
  routineAllowed?: boolean;
}): ScanAnalysisResponse {
  const count = args.findings.length;
  const insights: ScanInsight[] =
    args.insights ??
    (count === 0
      ? []
      : args.findings.slice(0, 1).map((f) => ({
          title: 'Focus treatment',
          text: `Your visible ${f.displayName.toLowerCase()} is concentrated in a specific area — keep treatment targeted.`,
          relatedFindingIds: [f.id],
        })));
  return {
    serviceStatus: 'success',
    scanId: args.scanId ?? 'fixture-scan',
    scanQuality: {
      usability: args.usability,
      status: args.usability,
      confidence: args.usability === 'full_results' ? 0.82 : 0.6,
      issues: args.usability === 'limited_results' ? ['low_light'] : [],
      userMessage:
        args.usability === 'retake_required'
          ? "Let's try another photo so we can map your skin clearly."
          : 'Visible areas analyzed clearly.',
      reasons:
        args.usability === 'limited_results' ? ['Lighting is uneven'] : [],
    },
    findings: args.findings,
    summary: {
      focusAreaCount: count,
      headline:
        count === 1
          ? '1 focus area supported'
          : `${count} focus areas supported`,
      supportingText: 'Here are the areas Pura saw most clearly.',
    },
    insights,
    routineEligibility:
      args.routineAllowed === false
        ? { allowed: false, reason: 'Fixture: routine not allowed.' }
        : count > 0 && args.usability !== 'retake_required'
          ? { allowed: true }
          : { allowed: false, reason: 'No supported findings.' },
  };
}

export function ScanResultsStatesGallery() {
  const nav = useNavigation();
  const [state, setState] = useState<StateKey>('index');

  const goBack = () => setState('index');
  const noop = () => {};

  // ── Fixtures ────────────────────────────────────────────────────
  const textureFinding = makeFinding({
    type: 'texture',
    zones: ['forehead'],
    priority: 'high',
    confidence: 0.82,
  });
  const underEyeFinding = makeFinding({
    type: 'under_eye_fatigue',
    zones: ['under_eye_left', 'under_eye_right'],
    priority: 'medium',
    confidence: 0.74,
  });
  const breakoutsFinding = makeFinding({
    type: 'breakouts',
    zones: ['chin'],
    priority: 'high',
    confidence: 0.86,
  });
  const rednessFinding = makeFinding({
    type: 'redness',
    zones: ['left_cheek'],
    priority: 'medium',
    confidence: 0.7,
  });

  const geometry = makeFixtureGeometry();

  const textureOnly = makeAnalysis({
    usability: 'full_results',
    findings: [textureFinding],
  });
  const underEyesOnly = makeAnalysis({
    usability: 'full_results',
    findings: [underEyeFinding],
  });
  const twoFindings = makeAnalysis({
    usability: 'full_results',
    findings: [breakoutsFinding, rednessFinding],
    insights: [
      {
        title: 'Focus treatment',
        text: 'Your visible breakout activity is concentrated around the chin, so keep stronger treatment targeted rather than spreading it across calm areas.',
        relatedFindingIds: [breakoutsFinding.id],
      },
      {
        title: 'Keep support simple',
        text: 'Use barrier-friendly hydration alongside targeted care.',
        relatedFindingIds: [breakoutsFinding.id, rednessFinding.id],
      },
    ],
  });
  const eligibleAnalysis = twoFindings;
  const ineligibleAnalysis = makeAnalysis({
    usability: 'limited_results',
    findings: [textureFinding],
    routineAllowed: false,
  });

  // ── Index ───────────────────────────────────────────────────────
  if (state === 'index') {
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
            <ArrowLeft size={18} weight="bold" color={scanColors.ink} />
          </Pressable>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.1}>
            Scan Results · Dev Gallery
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {GALLERY_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setState(item.key)}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: scanColors.coralWash },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              nativeID={`dev-state-${item.key}`}
            >
              <Text style={styles.rowLabel} maxFontSizeMultiplier={1.15}>
                {item.label}
              </Text>
              <Text style={styles.rowHint} maxFontSizeMultiplier={1.15}>
                {item.hint}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── State previews ──────────────────────────────────────────────
  if (state === 'service_error') {
    return (
      <PreviewWrap onBack={goBack}>
        <ScanServiceErrorScreen
          photoUri={FIXTURE_PHOTO}
          errorCode="network_error"
          onTryAgain={goBack}
          onRetakePhoto={goBack}
        />
      </PreviewWrap>
    );
  }
  if (state === 'retake_required') {
    return (
      <PreviewWrap onBack={goBack}>
        <RetakeRequiredScreen
          photoUri={FIXTURE_PHOTO}
          detail="We need a clearer view before mapping visible areas."
          onRetake={goBack}
        />
      </PreviewWrap>
    );
  }
  if (state === 'no_findings') {
    return (
      <PreviewWrap onBack={goBack}>
        <NoClearFindingsScreen onRetake={goBack} onReturnHome={goBack} />
      </PreviewWrap>
    );
  }
  if (state === 'no_findings_limited') {
    return (
      <PreviewWrap onBack={goBack}>
        <NoClearFindingsScreen
          onRetake={goBack}
          onReturnHome={goBack}
          limitedScan
        />
      </PreviewWrap>
    );
  }
  if (state === 'skin_map_texture') {
    return (
      <PreviewWrap onBack={goBack}>
        <SkinMapSlide
          photoUri={FIXTURE_PHOTO}
          geometry={geometry}
          visibleFindings={[textureFinding]}
          selectedFindingId={textureFinding.id}
          onSelectFinding={noop}
          onBack={goBack}
          onContinue={noop}
          limitedScan={false}
        />
      </PreviewWrap>
    );
  }
  if (state === 'skin_map_under_eyes') {
    return (
      <PreviewWrap onBack={goBack}>
        <SkinMapSlide
          photoUri={FIXTURE_PHOTO}
          geometry={geometry}
          visibleFindings={[underEyeFinding]}
          selectedFindingId={underEyeFinding.id}
          onSelectFinding={noop}
          onBack={goBack}
          onContinue={noop}
          limitedScan={false}
        />
      </PreviewWrap>
    );
  }
  if (state === 'skin_map_two') {
    return (
      <PreviewWrap onBack={goBack}>
        <SkinMapSlide
          photoUri={FIXTURE_PHOTO}
          geometry={geometry}
          visibleFindings={[breakoutsFinding, rednessFinding]}
          selectedFindingId={breakoutsFinding.id}
          onSelectFinding={noop}
          onBack={goBack}
          onContinue={noop}
          limitedScan
        />
      </PreviewWrap>
    );
  }
  if (state === 'focus_one') {
    return (
      <PreviewWrap onBack={goBack}>
        <TopFocusAreasSlide
          photoUri={FIXTURE_PHOTO}
          geometry={geometry}
          visibleFindings={[textureFinding]}
          summary={textureOnly.summary}
          onBack={goBack}
          onContinue={noop}
          limitedScan={false}
        />
      </PreviewWrap>
    );
  }
  if (state === 'insights_eligible') {
    return (
      <PreviewWrap onBack={goBack}>
        <PersonalizedInsightsSlide
          analysis={eligibleAnalysis}
          visibleFindings={[breakoutsFinding, rednessFinding]}
          supportedInsights={eligibleAnalysis.insights}
          limitedScan={false}
          onBack={goBack}
          onBuildRoutine={noop}
          onRetake={noop}
        />
      </PreviewWrap>
    );
  }
  if (state === 'insights_ineligible') {
    return (
      <PreviewWrap onBack={goBack}>
        <PersonalizedInsightsSlide
          analysis={ineligibleAnalysis}
          visibleFindings={[textureFinding]}
          supportedInsights={ineligibleAnalysis.insights}
          limitedScan
          onBack={goBack}
          onBuildRoutine={noop}
          onRetake={noop}
        />
      </PreviewWrap>
    );
  }
  if (state === 'pager_full_two_findings') {
    return (
      <PreviewWrap onBack={goBack}>
        <ScanResultsPager
          photoUri={FIXTURE_PHOTO}
          analysis={twoFindings}
          visibleFindings={[breakoutsFinding, rednessFinding]}
          supportedInsights={twoFindings.insights}
          geometry={geometry}
          selectedFindingId={breakoutsFinding.id}
          onSelectFinding={noop}
          limitedScan={false}
          onBuildRoutine={noop}
          onRetake={noop}
          onExit={goBack}
        />
      </PreviewWrap>
    );
  }

  return null;
}

interface GalleryItem {
  key: StateKey;
  label: string;
  hint: string;
}

const GALLERY_ITEMS: ReadonlyArray<GalleryItem> = [
  { key: 'service_error',     label: 'Service error',          hint: 'STATE A · ScanServiceErrorScreen' },
  { key: 'retake_required',   label: 'Retake required',        hint: 'STATE B · RetakeRequiredScreen' },
  { key: 'no_findings',       label: 'No clear findings',      hint: 'STATE C · NoClearFindingsScreen' },
  { key: 'no_findings_limited', label: 'No findings · limited', hint: 'STATE C with limitedScan flag' },
  { key: 'skin_map_texture',  label: 'Skin Map · texture only', hint: 'STATE E · 1 supported finding' },
  { key: 'skin_map_under_eyes', label: 'Skin Map · under-eyes',  hint: 'STATE E · 1 supported finding' },
  { key: 'skin_map_two',      label: 'Skin Map · 2 findings',  hint: 'STATE D · limited + 2 supported' },
  { key: 'focus_one',         label: 'Top Focus · 1 finding',  hint: 'Single high-priority card' },
  { key: 'insights_eligible', label: 'Insights · routine OK',  hint: 'CTA = Build custom routine' },
  { key: 'insights_ineligible', label: 'Insights · ineligible', hint: 'CTA = Retake for a complete plan' },
  { key: 'pager_full_two_findings', label: 'Full pager · 2 findings', hint: 'Skin map → Focus → Insights' },
];

function PreviewWrap({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack(): void;
}) {
  return (
    <View style={styles.previewWrap}>
      <View style={styles.previewBack}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.backChip}
          accessibilityRole="button"
          accessibilityLabel="Back to gallery"
          nativeID="dev-state-back"
        >
          <ArrowLeft size={14} weight="bold" color={scanColors.coralDark} />
          <Text style={styles.backChipText} maxFontSizeMultiplier={1.1}>
            Gallery
          </Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: scanColors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: scanColors.line,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: scanColors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: scanColors.ink,
    letterSpacing: 0.2,
  },
  list: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: scanColors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
  },
  rowLabel: {
    ...scanType.cardTitle,
  },
  rowHint: {
    ...scanType.caption,
    marginTop: 2,
  },
  previewWrap: {
    flex: 1,
    backgroundColor: scanColors.background,
  },
  previewBack: {
    position: 'absolute',
    zIndex: 10,
    top: 50,
    left: 12,
  },
  backChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: scanColors.coralWash,
    borderWidth: 1,
    borderColor: scanColors.coral,
  },
  backChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: scanColors.coralDark,
  },
});
