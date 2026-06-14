import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScanCaptureScreen } from '@/screens/scan/ScanCaptureScreen';
import { ScanAnalyzingScreen } from '@/screens/scan/ScanAnalyzingScreen';
import { ScanAnalyzingFaceScreen } from '@/screens/scan/ScanAnalyzing';
import { ScanResultsFaceScreen } from '@/screens/scan/ScanResultsFaceScreen';
import { ScanRevealScreen } from '@/screens/scan/reveal/ScanRevealScreen';
import { YourSkinContainer } from '@/screens/scan/yourSkin/YourSkinContainer';
import { BuildRoutinePicker } from '@/screens/scan/reveal/BuildRoutinePicker';
import { MoneyFlowContainer } from '@/screens/money/MoneyFlowContainer';
import { ScanBuildCeremony } from '@/screens/scan/reveal/ScanBuildCeremony';
import { ScanResultDetailScreen } from '@/screens/scan/ScanResultDetailScreen';
import { ScanResultsProductScreen } from '@/screens/scan/ScanResultsProductScreen';
import { BarcodeAnalyzingScreen } from '@/screens/scan/BarcodeAnalyzingScreen';
import { BarcodeResultScreen } from '@/screens/scan/BarcodeResultScreen';
import { AuthChoice } from '@/screens/onboarding/AuthChoice';
import { useAppStore } from '@/store/useAppStore';
import { selectSkinState } from '@/state/canonical';
import type { RootStackParamList, ScanStackParamList } from './types';

const Stack = createNativeStackNavigator<ScanStackParamList>();

/**
 * v6 scan modal stack. Tapping the Scan tab opens directly to
 * ScanCapture — the camera viewfinder is the whole interaction. There is
 * no first-run interstitial in front of the camera.
 */
export function ScanModalStack({ route }: any) {
  const initialMode = route?.params?.initialMode ?? 'face';

  return (
    <Stack.Navigator
      initialRouteName="ScanCapture"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="ScanCapture" initialParams={{ initialMode }}>
        {() => <CaptureScreenHost />}
      </Stack.Screen>

      <Stack.Screen name="ScanAnalyzing">
        {() => <AnalyzingScreenHost />}
      </Stack.Screen>

      <Stack.Screen name="ScanResultsFace">
        {({ route: r }) => <ScanResultsFaceScreen scanId={r.params.scanId} />}
      </Stack.Screen>

      {/* Post-scan reveal arc — surfaces 2–6 pager, then surface 7 ceremony.
          The face analyze step hands off into ScanReveal (see
          AnalyzingScreenHost.handleComplete). */}
      <Stack.Screen name="ScanReveal">
        {() => <RevealScreenHost />}
      </Stack.Screen>
      {/* scan-results screen 2 — the FINAL "Your Skin" full results, the
          production destination after a face analyze (see handleComplete). */}
      <Stack.Screen name="YourSkin">
        {() => <YourSkinResultsHost />}
      </Stack.Screen>
      <Stack.Screen name="BuildRoutinePicker">
        {() => <BuildRoutinePickerHost />}
      </Stack.Screen>
      <Stack.Screen name="MoneyFlow">
        {() => <MoneyFlowHost />}
      </Stack.Screen>
      <Stack.Screen name="ScanCeremony">
        {() => <CeremonyScreenHost />}
      </Stack.Screen>

      {/* Post-scan account save — offered once after the first scan. */}
      <Stack.Screen name="SaveProfile">
        {() => <SaveProfileHost />}
      </Stack.Screen>

      {/* v19.0 — Layer 2 detail screen reached from "See full skin map". */}
      <Stack.Screen name="ScanResultDetail">
        {({ route: r }) => <ScanResultDetailScreen scanId={r.params.scanId} />}
      </Stack.Screen>

      <Stack.Screen name="ScanResultsProduct">
        {({ route: r }) => (
          <ScanResultsProductScreen
            product={r.params.product}
            matchPercent={r.params.matchPercent}
          />
        )}
      </Stack.Screen>

      {/* v10.32 — barcode flow */}
      <Stack.Screen name="BarcodeAnalyzing">
        {() => <BarcodeAnalyzingHost />}
      </Stack.Screen>
      <Stack.Screen name="BarcodeResult">
        {() => <BarcodeResultHost />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// v10.32 — Barcode hosts
// ---------------------------------------------------------------------------

function BarcodeAnalyzingHost() {
  const scanNav = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ScanStackParamList, 'BarcodeAnalyzing'>>();
  const { barcodeValue } = route.params;

  return (
    <BarcodeAnalyzingScreen
      barcodeValue={barcodeValue}
      onComplete={(resolution) => {
        scanNav.replace('BarcodeResult', { barcodeValue, resolution });
      }}
      onCancel={() => {
        // User backed out mid-lookup — return them to the camera.
        scanNav.replace('ScanCapture', { initialMode: 'barcode' });
      }}
    />
  );
}

function BarcodeResultHost() {
  const scanNav = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ScanStackParamList, 'BarcodeResult'>>();
  const { barcodeValue, resolution } = route.params;

  return (
    <BarcodeResultScreen
      barcodeValue={barcodeValue}
      resolution={resolution}
      onCloseModal={() => {
        rootNav.getParent()?.goBack();
      }}
      onScanAgain={() => {
        scanNav.replace('ScanCapture', { initialMode: 'barcode' });
      }}
    />
  );
}

/**
 * Post-scan "Save your skin profile" host. Offered once, after the user's
 * first scan results (gated in ScanResultsFaceScreen). With no real auth
 * backend in this build, every account action — and "Continue without
 * saving" — marks the offer consumed and closes the modal to Home; real
 * Apple / Google / email account link-up is a backend follow-up.
 */
function SaveProfileHost() {
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const markOffered = useAppStore((s) => s.markAccountSaveOffered);

  const finishToHome = useCallback(() => {
    markOffered();
    rootNav.getParent()?.goBack();
  }, [markOffered, rootNav]);

  return (
    <AuthChoice
      onAppleContinue={finishToHome}
      onGoogleContinue={finishToHome}
      onEmailContinue={finishToHome}
      onSignIn={finishToHome}
      onContinueAsGuest={finishToHome}
    />
  );
}

function CaptureScreenHost() {
  const scanNav = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ScanStackParamList, 'ScanCapture'>>();
  const initialMode = route.params?.initialMode ?? 'face';

  return (
    <ScanCaptureScreen
      initialMode={initialMode}
      onClose={() => rootNav.getParent()?.goBack()}
      onCaptured={(photoUri, mode, captureQuality) => {
        // v27 — captureQuality carries the landmarks + quality signals
        // frozen at the shutter moment (undefined for gallery picks /
        // platforms without the detection engine).
        scanNav.navigate('ScanAnalyzing', { photoUri, mode, captureQuality });
      }}
      // v10.32 — barcode mode auto-fires onBarcodeScanned when
      // expo-camera detects a code. Skip ScanAnalyzing (which is
      // for face/product image analysis) and go straight to the
      // barcode-specific lookup screen.
      onBarcodeScanned={(barcodeValue) => {
        scanNav.replace('BarcodeAnalyzing', { barcodeValue });
      }}
      // The camera's "?" control used to re-open the first-run tutorial,
      // which has been removed. No-op for now; the control itself is slated
      // for removal from the camera screen in a follow-up (out of scope for
      // this routing fix, which must not modify the camera screen).
      onOpenHelp={() => {}}
    />
  );
}

/**
 * Dispatches the analyzing step.
 *
 *   mode === 'face'    → new cinematic `ScanAnalyzingFaceScreen` (v7.7)
 *   mode === 'product' → legacy `ScanAnalyzingScreen` (unchanged; rebuild
 *                        tracked as a follow-up ticket)
 *
 * The face path now owns the real AI call + store mutations internally; it
 * reaches back into the host for navigation via props. The product path is
 * preserved verbatim against scope creep — product-scan analysis is slated
 * for its own rebuild and the flow it drives still works end-to-end.
 */
function AnalyzingScreenHost() {
  const scanNav = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ScanStackParamList, 'ScanAnalyzing'>>();
  const { photoUri, mode, captureQuality } = route.params;

  // v12.4 — STABILITY: snapshot the previousScan + dayNumber at MOUNT
  // time, not on every render.
  //
  // Bug fix: previously this read `scans[scans.length - 1]` inline on
  // every render and passed it as `previousScan` to ScanAnalyzingFaceScreen.
  // After a successful analyze fired `addScan(scan)`, the scans array
  // updated → AnalyzingScreenHost re-rendered → `previous` was a NEW
  // reference → ScanAnalyzingFaceScreen received a new `previousScan`
  // prop → its Stage-2 useEffect deps changed → cleanup fired (the
  // just-completed analyze) → effect re-ran → kicked off a SECOND
  // analyzeFaceScan with the just-added scan as the new previousScan.
  //
  // That second analyze added a duplicate scan to the store and could
  // race with the auto-nav timeout. Snapshotting at mount stabilises
  // the props for the lifetime of the analyzing screen — exactly what
  // we want, since the "previous scan" for THIS run is fixed when the
  // user takes the photo.
  const initialScansRef = React.useRef<{
    previous: ReturnType<typeof useAppStore.getState>['scans'][number] | undefined;
    dayNumber: number;
  } | null>(null);
  if (initialScansRef.current === null) {
    const snapshotScans = useAppStore.getState().scans;
    const prev = snapshotScans[snapshotScans.length - 1];
    initialScansRef.current = {
      previous: prev,
      dayNumber: prev ? prev.dayNumber + 1 : 1,
    };
  }

  const handleCancel = useCallback(() => {
    rootNav.getParent()?.goBack();
  }, [rootNav]);

  // v12.4 — onComplete + onRetry stabilised with useCallback so the
  // child's auto-nav effect (which depends on `onComplete`'s ref via
  // an internal ref capture in v12.1) gets a single stable reference.
  // Avoids any subtle re-run risk if the v12.1 ref-capture is removed
  // in the future.
  const handleComplete = useCallback(
    (scanId: string) => {
      // Face analyze complete → the FINAL results screen 2 ("Your Skin"). The
      // host runs the real plain-language read (readSkinFromPhoto) on the
      // captured frame and renders YourSkinScreen; if that service genuinely
      // fails it falls back to the proven reveal arc, which itself falls back to
      // ScanResultsFace — so a saved scan is never stranded on a blank.
      // `captureQuality` rides along so the skin map keeps tracking the REAL
      // face landmarks frozen at the shutter (absent for gallery/native).
      scanNav.replace('YourSkin', { scanId, photoUri, captureQuality });
    },
    [scanNav, photoUri, captureQuality]
  );
  const handleRetry = useCallback(() => {
    scanNav.replace('ScanCapture');
  }, [scanNav]);

  if (mode === 'face') {
    const { previous, dayNumber } = initialScansRef.current;
    return (
      <ScanAnalyzingFaceScreen
        photoUri={photoUri}
        captureQuality={captureQuality}
        previousScan={previous}
        dayNumber={dayNumber}
        onComplete={handleComplete}
        onRetry={handleRetry}
        onCancel={handleCancel}
      />
    );
  }

  // ---- Product-mode legacy path (unchanged behaviour; product literal
  //      expanded to the v7.6 Product shape so the new tint/rating fields
  //      resolve without a type error).
  const onDone = async (photoUri_: string, _mode: 'face' | 'product') => {
    scanNav.replace('ScanResultsProduct', {
      product: {
        id: 'scanned-product',
        brand: 'The Ordinary',
        name: 'Natural Moisturizing Factors + HA',
        category: 'moisturizer',
        imageUri: 'https://picsum.photos/seed/pura-scanned/400/400',
        ingredients: ['hyaluronic acid', 'amino acids', 'ceramides'],
        keyIngredients: ['Hyaluronic Acid', 'Amino Acids'],
        priceUsd: 9,
        description:
          'A straightforward moisturizer with skin-identical lipids and HA.',
        // v7.6 additive fields
        tint: 'sand',
        rating: 4.4,
        reviewCount: 2200,
        matchScore: 78,
        tags: ['sensitive-safe', 'fragrance-free'],
        addedDate: new Date().toISOString(),
        price: 9,
      },
      matchPercent: 78,
    });
    // photoUri_ captured in closure for parity with the legacy signature
    // even though the product preview uses a seeded image.
    void photoUri_;
  };

  return <ScanAnalyzingScreen onDone={onDone} onCancel={handleCancel} />;
}

// ---------------------------------------------------------------------------
// scan-results screen 2 ("Your Skin") host — the production results screen.
// Runs the real plain-language read on the captured frame and renders
// YourSkinScreen; on a genuine service failure it hands the saved scan to the
// reveal arc (which itself falls back to ScanResultsFace), so a face scan is
// never stranded on a blank. "Build my routine" continues into the existing
// routine builder.
// ---------------------------------------------------------------------------

function YourSkinResultsHost() {
  const scanNav = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ScanStackParamList, 'YourSkin'>>();
  const { scanId, photoUri, captureQuality } = route.params;

  const closeToHome = useCallback(() => {
    rootNav.getParent()?.goBack();
  }, [rootNav]);

  return (
    <YourSkinContainer
      photoUri={photoUri}
      captureQuality={captureQuality}
      scanId={scanId}
      onBuildRoutine={() => scanNav.navigate('MoneyFlow', { scanId, photoUri })}
      onClose={closeToHome}
      onRescan={() => scanNav.replace('ScanCapture')}
      onFallbackToReveal={() => scanNav.replace('ScanReveal', { scanId })}
    />
  );
}

// ---------------------------------------------------------------------------
// Reveal arc hosts — surfaces 2–6 (pager) and surface 7 (ceremony).
// ---------------------------------------------------------------------------

/**
 * Post-analysis reveal pager (surfaces 2–6: Skin Map → Focus → Insights →
 * Plan → Ready). Resolves the canonical SkinState from the just-saved scan
 * (per CLAUDE.md: screens read FROM canonical state, never recompose AI
 * output inline) and feeds it — plus the captured photo — to
 * ScanRevealScreen.
 *
 *   • "Build my routine" → ScanCeremony (surface 7)
 *   • "Skip for now" / header exit → close the modal to Home. The scan is
 *     already saved to history; the reveal arc IS the post-scan results
 *     experience, so skipping just declines the routine build.
 *
 * Defensive fallback: a freshly-added scan always resolves a SkinState, but
 * if it somehow can't (e.g. corrupted persisted state), we replace into the
 * legacy ScanResultsFace screen so the user is never stranded on a blank.
 */
function RevealScreenHost() {
  const scanNav = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ScanStackParamList, 'ScanReveal'>>();
  const { scanId } = route.params;

  // Resolve canonical SkinState + the captured photo from the store once.
  const resolved = React.useMemo(() => {
    const scans = useAppStore.getState().scans;
    const idx = scans.findIndex((s) => s.id === scanId);
    if (idx < 0) {
      return { skinState: null, photoUri: undefined as string | undefined };
    }
    const scan = scans[idx];
    const previous = idx > 0 ? scans[idx - 1] : undefined;
    return {
      skinState: selectSkinState(scan, previous, scans),
      photoUri: scan.photoUri,
    };
  }, [scanId]);

  const closeToHome = useCallback(() => {
    rootNav.getParent()?.goBack();
  }, [rootNav]);

  // Defensive fallback — no canonical state → legacy results screen.
  React.useEffect(() => {
    if (!resolved.skinState) {
      scanNav.replace('ScanResultsFace', { scanId });
    }
  }, [resolved.skinState, scanNav, scanId]);

  if (!resolved.skinState) return null;

  return (
    <ScanRevealScreen
      skinState={resolved.skinState}
      photoUri={resolved.photoUri}
      initialStep={0}
      onExit={closeToHome}
      onBuildRoutine={() => scanNav.navigate('BuildRoutinePicker', { scanId })}
      onSkip={closeToHome}
    />
  );
}

/**
 * Pre-build pillar picker host (surface 6.5). The Ready screen's "Build
 * my routine" lands here; the picker's CTA carries the user's pillar
 * selection into the ceremony. Back returns to the reveal pager.
 */
function BuildRoutinePickerHost() {
  const scanNav = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const route = useRoute<RouteProp<ScanStackParamList, 'BuildRoutinePicker'>>();
  const { scanId } = route.params;

  return (
    <BuildRoutinePicker
      scanId={scanId}
      onBack={() => scanNav.goBack()}
      onBuild={(selection) => scanNav.navigate('ScanCeremony', { scanId, selection })}
    />
  );
}

/**
 * MoneyFlow host (the post-scan "Build my routine" destination). Runs the
 * tailoring → routine → confirm → buy → account flow; on Confirm-lock the
 * chosen products are committed AS the canonical routine (inside the
 * container), so finishing lands on the Routine tab with a populated routine —
 * one atomic dispatch that dismisses this modal and focuses Routine.
 */
function MoneyFlowHost() {
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ScanStackParamList, 'MoneyFlow'>>();
  const { scanId, photoUri } = route.params;

  const goToRoutineTab = useCallback(() => {
    rootNav.getParent()?.navigate('Tabs', { screen: 'RoutineTab' });
  }, [rootNav]);

  return <MoneyFlowContainer scanId={scanId} photoUri={photoUri} onDone={goToRoutineTab} />;
}

/**
 * Build Ceremony host (surface 7). The deterministic ~13s build commits the
 * routine + flips routine lifecycle to 'active' internally; on completion we
 * navigate the ROOT to Tabs/RoutineTab — one atomic dispatch that both
 * dismisses this modal and focuses the Routine tab, where PuraRoutineScreen
 * renders the populated landing page (surface 8) for the freshly-built
 * routine.
 *
 * `onHowItWorks` is the footer "How Pura chooses" link; it opens the
 * assistant rather than the tab handoff, so tapping it mid-build can't
 * short-circuit the ceremony into the routine page.
 */
function CeremonyScreenHost() {
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ScanStackParamList, 'ScanCeremony'>>();
  const { scanId, selection } = route.params;

  const goToRoutineTab = useCallback(() => {
    // Navigating the root to Tabs/RoutineTab pops this modal off the root
    // stack and focuses the Routine tab in one move (same nested-navigation
    // pattern as BarcodeResultScreen's jump to ProductsTab).
    rootNav.getParent()?.navigate('Tabs', { screen: 'RoutineTab' });
  }, [rootNav]);

  const openHowItWorks = useCallback(() => {
    rootNav.getParent()?.navigate('AssistChat', {
      initialMessage: 'How does Pura choose my products?',
    });
  }, [rootNav]);

  return (
    <ScanBuildCeremony
      scanId={scanId}
      selection={selection}
      onComplete={goToRoutineTab}
      onHowItWorks={openHowItWorks}
    />
  );
}
