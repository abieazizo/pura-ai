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
import { ScanResultsProductScreen } from '@/screens/scan/ScanResultsProductScreen';
import { ScanTutorial } from '@/screens/scan/ScanTutorial';
import { BarcodeAnalyzingScreen } from '@/screens/scan/BarcodeAnalyzingScreen';
import { BarcodeResultScreen } from '@/screens/scan/BarcodeResultScreen';
import { useAppStore } from '@/store/useAppStore';
import type { RootStackParamList, ScanStackParamList } from './types';

const Stack = createNativeStackNavigator<ScanStackParamList>();

/**
 * v6 scan modal stack. First-time users land on ScanTutorial. Once the
 * tutorial is complete the next scan opens directly to ScanCapture. The
 * help button on the camera can re-open ScanTutorial; that path does not
 * alter the seen flag.
 */
export function ScanModalStack({ route }: any) {
  const initialMode = route?.params?.initialMode ?? 'face';
  const hasSeenScanTutorial = useAppStore((s) => s.hasSeenScanTutorial);
  const initialRouteName: keyof ScanStackParamList = hasSeenScanTutorial
    ? 'ScanCapture'
    : 'ScanTutorial';

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="ScanTutorial" options={{ animation: 'fade' }}>
        {() => <TutorialScreenHost />}
      </Stack.Screen>

      <Stack.Screen name="ScanCapture" initialParams={{ initialMode }}>
        {() => <CaptureScreenHost />}
      </Stack.Screen>

      <Stack.Screen name="ScanAnalyzing">
        {() => <AnalyzingScreenHost />}
      </Stack.Screen>

      <Stack.Screen name="ScanResultsFace">
        {({ route: r }) => <ScanResultsFaceScreen scanId={r.params.scanId} />}
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
 * Tutorial host. "Start scanning." marks the tutorial seen and replaces to
 * the camera. × / swipe-down dismiss closes the whole ScanModal without
 * marking seen, per §3.1.
 */
function TutorialScreenHost() {
  const scanNav = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const setHasSeenScanTutorial = useAppStore((s) => s.setHasSeenScanTutorial);

  const handleComplete = useCallback(() => {
    setHasSeenScanTutorial(true);
    scanNav.replace('ScanCapture');
  }, [scanNav, setHasSeenScanTutorial]);

  const handleDismiss = useCallback(() => {
    // Do NOT set the flag here (§3.1). Simply close the whole scan modal.
    rootNav.getParent()?.goBack();
  }, [rootNav]);

  return <ScanTutorial onComplete={handleComplete} onDismiss={handleDismiss} />;
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
      onCaptured={(photoUri, mode) => {
        scanNav.navigate('ScanAnalyzing', { photoUri, mode });
      }}
      // v10.32 — barcode mode auto-fires onBarcodeScanned when
      // expo-camera detects a code. Skip ScanAnalyzing (which is
      // for face/product image analysis) and go straight to the
      // barcode-specific lookup screen.
      onBarcodeScanned={(barcodeValue) => {
        scanNav.replace('BarcodeAnalyzing', { barcodeValue });
      }}
      // ? button on the camera — opens the tutorial without resetting the
      // seen flag (§3.1). Uses `push` so the camera stays in the stack and
      // a dismiss returns to it.
      onOpenHelp={() => scanNav.navigate('ScanTutorial')}
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
  const { photoUri, mode } = route.params;

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
      scanNav.replace('ScanResultsFace', { scanId });
    },
    [scanNav]
  );
  const handleRetry = useCallback(() => {
    scanNav.replace('ScanCapture');
  }, [scanNav]);

  if (mode === 'face') {
    const { previous, dayNumber } = initialScansRef.current;
    return (
      <ScanAnalyzingFaceScreen
        photoUri={photoUri}
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
