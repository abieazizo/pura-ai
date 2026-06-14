import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { LogBox, StyleSheet, View, Platform, Text } from 'react-native';

// v11.11 — silence known-safe non-critical noise from optional AI
// surfaces (search suggestions, etc.). These calls fail gracefully
// in our code path (tryAi returns null, surface degrades to default
// copy), but RN's underlying networking module emits a console-level
// log on aborted/timeout fetches that LogBox amplifies as a yellow
// or red overlay in dev. The overlays are pure noise — they describe
// behavior we already designed for.
//
// We DO NOT silence anything that could mask a real bug. The patterns
// here are restricted to the known-non-critical AI proxy paths.
LogBox.ignoreLogs([
  // matches: "[ai:aiGateway.call] buildSearchSuggestions skipped..."
  /\[ai:aiGateway\..*\] buildSearchSuggestions /,
  // matches: "AIProxyError: buildSearchSuggestions -> HTTP 0 (req=...): Aborted"
  /AIProxyError: buildSearchSuggestions/,
  // generic abort warnings emitted by the platform networking layer
  // when our timeout fires for non-critical methods
  /Aborted.*buildSearchSuggestions/,
]);
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { RootNavigator } from '@/navigation/RootNavigator';
import { SplashScreen } from '@/screens/splash/SplashScreen';
import { useAppStore } from '@/store/useAppStore';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors, palette } from '@/theme';
import { installDevConsole } from '@/utils/devConsole';
import { ContextualProvider } from '@/components/contextual/ContextualProvider';
import { probeProxyHealthz } from '@/ai/aiHealthProbe';
import { YourSkinScreen } from '@/screens/scan/yourSkin/YourSkinScreen';
import { FIXTURE_BY_KEY, YOUR_SKIN_FIXTURES } from '@/screens/scan/yourSkin/fixtures';
import { OrbProvider } from '@/screens/onboarding/orb/OrbHost';
import { FirstFindingScreen } from '@/screens/scan/firstFinding';
import { buildRescanCompare } from '@/screens/scan/rescanCompare/model';
import { RescanCompareScreen } from '@/screens/scan/rescanCompare/RescanCompareScreen';
import { Pressable, ScrollView } from 'react-native';
import { YourRoutineExperience } from '@/screens/routine/yourRoutine/YourRoutineExperience';
import { buildYourRoutineModel } from '@/screens/routine/yourRoutine/model';
import {
  demoRoutine,
  demoFindings,
  demoMoves,
  recentCompletionDates,
} from '@/screens/routine/yourRoutine/fixtures';
import type { RoutinePeriod } from '@/theme/routineAtmosphere';
import { ProductsStackScreen } from '@/navigation/TabNavigator';
import { MoneyFlow } from '@/screens/money/MoneyFlow';
// TEMP — `?screen=shop-debug` renders the raw useSkinShop model readout (proof
// the Shop engine is real). Remove with the Shop redesign.
import { SkinShopDebugScreen } from '@/screens/shop/skinShop/SkinShopDebugScreen';
// Web-only Skia GPU proof (Step 0). ⚠️ MUST be a DEFERRED import: RNSkia's web
// entry snapshots `global.CanvasKit` at module-evaluation time, so a static
// import here (the boot graph) would evaluate it before LoadSkiaWeb resolves
// and permanently dead-wire every Skia call. SkiaProbeGate below only triggers
// the import once useSkiaReady() reports CanvasKit is actually loaded.
import { useSkiaReady } from '@/skia/useSkiaReady';
const SkiaProbeLazy = React.lazy(() =>
  import('@/screens/dev/SkiaProbe').then((m) => ({ default: m.SkiaProbe })),
);

// Dev-only navigation ref. Exposed on `window.__pura_nav__` in dev
// builds so the preview harness can navigate to dev-only routes
// (e.g. ScanResultsStatesDev) without touching production navigation.
const navigationRef = createNavigationContainerRef();

declare const __DEV__: boolean | undefined;
if (typeof __DEV__ !== 'undefined' && __DEV__ && typeof globalThis !== 'undefined') {
  (globalThis as unknown as {
    __pura_nav__?: typeof navigationRef;
  }).__pura_nav__ = navigationRef;
}

// PUBLIC WEB SHOWCASE — `?screen=your-skin` renders the REAL `YourSkinScreen`
// (the production scan-results "Your Skin" surface), NOT a dev harness/gallery:
// there is NO fixture toolbar / chips / replay controls. It is fed a single
// representative OFFLINE fixture purely so the finished screen is viewable on the
// Vercel deploy without a live camera scan (the web build can't run the native
// camera flow). `&settle=1` holds it on a clean still frame; without it the orb
// breathes and the sections reveal as authored. The bare URL and every other
// path are untouched — the normal onboarding/tab app loads exactly as before.
// Web-only; native iOS/Android are unaffected. This is a TOP-LEVEL render (not a
// navigation deep-link), so there is no nav-timing race and no dev screen is
// reachable by URL.
function webShowcase(): { key: string; settle: boolean } | null {
  if (Platform.OS !== 'web') return null;
  try {
    const search =
      (globalThis as unknown as { location?: { search?: string } }).location?.search ?? '';
    const params = new URLSearchParams(search);
    const key = params.get('screen');
    if (!key) return null;
    return { key, settle: params.get('settle') === '1' };
  } catch {
    return null;
  }
}

/**
 * `?screen=analyzing` — the post-scan ANALYZING moment, held in its loop
 * forever (outcome stays pending) so the experience is viewable on the deploy
 * without a live camera scan: the persistent companion orb gaze-sweeping the
 * photo + honest plain-language status lines. No donut, no skeleton, no
 * numbers. `&photo=deep` swaps in the deep-skin test portrait.
 */
function AnalyzingWebShowcase() {
  const photo =
    (() => {
      try {
        const p = new URLSearchParams(
          (globalThis as unknown as { location?: { search?: string } }).location?.search ?? '',
        ).get('photo');
        return p === 'deep'
          ? 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=640&q=80'
          : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&q=80';
      } catch {
        return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&q=80';
      }
    })();
  return (
    <OrbProvider reduceMotion={false} birth={false} dark>
      <FirstFindingScreen
        photoUri={photo}
        outcome={{ status: 'pending' }}
        theme="dark"
        mirrored
        onSeeEverything={() => {}}
        onTryBetterLight={() => {}}
        onTryAgain={() => {}}
      />
    </OrbProvider>
  );
}

/**
 * `?screen=rescan` — the real before/after (habit step 4) on a fixture pair:
 * the SAME portrait as Day 1 and Today (never a different face), factor deltas
 * that clear the honest ±3 bar. `&steady=1` shows the no-visible-change path —
 * true and motivating, never blank. Viewable on the deploy without two real
 * scans 30 days apart.
 */
function RescanWebShowcase() {
  const steady = (() => {
    try {
      return new URLSearchParams(
        (globalThis as unknown as { location?: { search?: string } }).location?.search ?? '',
      ).get('steady') === '1';
    } catch {
      return false;
    }
  })();
  const FACE = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&q=80';
  const model = buildRescanCompare({
    first: {
      capturedAt: '2026-05-13T09:00:00.000Z',
      photoUri: FACE,
      overallScore: 64,
      factors: steady
        ? { redness: 60, hydration: 62, texture: 70 }
        : { redness: 58, hydration: 60, texture: 70, breakouts: 62 },
    },
    latest: {
      capturedAt: '2026-06-12T09:00:00.000Z',
      photoUri: FACE,
      overallScore: steady ? 65 : 70,
      factors: steady
        ? { redness: 61, hydration: 63, texture: 71 }
        : { redness: 66, hydration: 64, texture: 71, breakouts: 58 },
    },
  });
  return (
    <RescanCompareScreen
      model={model}
      onKeepGoing={() => {}}
      onRestock={() => {}}
    />
  );
}

/**
 * `?screen=ritual` — the GUIDED RITUAL (habit step 2), fixture-driven, no dev
 * chrome. Drops straight into the dark immersive ritual: breathing orb, STEP n
 * OF m, the product in hand, the orb flooding GOLD on Done. `&period=` picks
 * the atmosphere (dawn/midday/dusk/night, default night). Self-contained — the
 * experience brings its own OrbProvider and reads no store.
 */
function RitualWebShowcase() {
  const now = useMemo(() => new Date(), []);
  const period = (() => {
    try {
      const p = new URLSearchParams(
        (globalThis as unknown as { location?: { search?: string } }).location?.search ?? '',
      ).get('period');
      return (['dawn', 'midday', 'dusk', 'night'].includes(p ?? '') ? p : 'night') as RoutinePeriod;
    } catch {
      return 'night';
    }
  })();
  const model = useMemo(() => {
    const built = buildYourRoutineModel({
      routine: demoRoutine,
      findings: demoFindings,
      moves: demoMoves,
      timeOfDay: 'evening',
      now,
      streak: { count: 5, includesToday: true },
      doneIds: [],
      daysSinceLastUse: 0,
      calmerLately: false,
    });
    return { ...built, period };
  }, [now, period]);
  return (
    <YourRoutineExperience
      model={model}
      reduceMotion={false}
      initialMode="ritual"
      devModeOverride="ritual"
      now={now}
      completionDates={recentCompletionDates(now)}
      streak={{ count: 5, includesToday: true }}
      adaptive={null}
      onRitualComplete={() => {}}
      onQuickDone={() => {}}
    />
  );
}

/**
 * `?screen=shop` — the SHOP feed (habit step 5), the real ProductsStack mounted
 * in its own NavigationContainer so the storefront, concern filters, and
 * product-detail sheets all work. Cross-tab links (Re-scan etc.) no-op here.
 */
function ShopWebShowcase() {
  return (
    <NavigationContainer theme={navTheme}>
      <BottomSheetModalProvider>
        <ProductsStackScreen />
      </BottomSheetModalProvider>
    </NavigationContainer>
  );
}

/**
 * `?screen=money` — the full purchase flow (tailoring → routine → confirm →
 * buy → account) on a representative offline scan fixture, so the whole flow is
 * tappable on the deploy without a live scan. The PRODUCTION path
 * (MoneyFlowContainer, reached from "Build my routine") additionally commits
 * the chosen products as the routine; this demo omits onLock, so it touches no
 * store.
 */
function MoneyWebShowcase() {
  const fx = FIXTURE_BY_KEY['redness'] ?? YOUR_SKIN_FIXTURES[0];
  return <MoneyFlow read={fx.read} goal="calmer, clearer skin" onDone={() => {}} />;
}

/**
 * `?screen=index` — the discoverability hub. Every built surface, one tap away,
 * because a fresh visitor lands on onboarding and would never reach the tabs.
 */
const SHOWCASE_LINKS: { label: string; note: string; q: string }[] = [
  { label: 'Your Skin — full findings', note: 'dark · plain-word pills · on-skin glow', q: 'your-skin' },
  { label: 'Analyzing — orb gaze-sweep', note: 'dark · no donut/skeleton/numbers', q: 'analyzing' },
  { label: 'Analyzing — deep-skin face', note: 'glow sits on spots, not a whole-face wash', q: 'analyzing&photo=deep' },
  { label: 'Rescan — look what changed', note: 'before/after · wins first', q: 'rescan' },
  { label: 'Rescan — holding steady', note: 'honest no-change path, never blank', q: 'rescan&steady=1' },
  { label: 'Money flow — tailoring → buy', note: 'light · the recommendation IS the routine', q: 'money' },
  { label: 'Guided ritual', note: 'dark · gold-on-Done · no tab bar', q: 'ritual' },
  { label: 'Shop — concern feed', note: 'light · scan-language filters', q: 'shop' },
  { label: 'Shop — useSkinShop debug', note: 'raw engine readout · picks/restock/honesty', q: 'shop-debug' },
  { label: 'Skia GPU probe', note: 'additive blend + SkSL proof', q: 'skia-probe' },
];

function ShowcaseIndex() {
  const go = (q: string) => {
    try {
      (globalThis as unknown as { location: { search: string } }).location.search = `?screen=${q}`;
    } catch {
      /* noop */
    }
  };
  const openFullApp = () => {
    try {
      const g = globalThis as unknown as { localStorage?: Storage; location: { href: string } };
      g.localStorage?.setItem(
        'pura-app-state-v1',
        JSON.stringify({ state: { user: { id: 'demo', name: 'You', goal: 'calmer skin' }, onboardingComplete: true }, version: 0 }),
      );
      g.location.href = '/';
    } catch {
      /* noop */
    }
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0A0B12' }}
      contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 60 }}
    >
      <Text style={{ fontFamily: 'InstrumentSerif-Regular', fontSize: 40, lineHeight: 46, color: '#EAF0FA' }}>
        Pura — every surface
      </Text>
      <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20, color: 'rgba(214,224,240,0.6)', marginTop: 8, marginBottom: 28 }}>
        Each screen below is the real build. The normal app starts at onboarding, so these are the direct doors.
      </Text>
      {SHOWCASE_LINKS.map((l) => (
        <Pressable
          key={l.q}
          onPress={() => go(l.q)}
          accessibilityRole="button"
          accessibilityLabel={l.label}
          style={({ pressed }) => ({
            backgroundColor: pressed ? 'rgba(20,124,255,0.16)' : 'rgba(214,224,240,0.06)',
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 18,
            marginBottom: 12,
          })}
        >
          <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#EAF0FA' }}>{l.label}</Text>
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: 'rgba(156,197,255,0.85)', marginTop: 3 }}>{l.note}</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={openFullApp}
        accessibilityRole="button"
        accessibilityLabel="Open the full app"
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#0E63CC' : '#147CFF',
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: 'center',
          marginTop: 16,
        })}
      >
        <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#FFFFFF' }}>Open the full app (skip onboarding)</Text>
      </Pressable>
      <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 17, color: 'rgba(214,224,240,0.4)', marginTop: 14 }}>
        The full app drops you on Home with the tabs unlocked — wander Home · Shop · Routine · Me. The ritual needs an
        active routine, so use its direct door above.
      </Text>
    </ScrollView>
  );
}

/**
 * Holds the probe behind CanvasKit readiness. In production web CanvasKit boots
 * automatically; in the dev preview pass `?skia=1` (see index.ts boot policy).
 */
function SkiaProbeGate() {
  const ready = useSkiaReady();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0B12', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9FB3CC', fontSize: 13 }}>
          loading CanvasKit (WASM)… — in the dev preview, add &skia=1 to the URL
        </Text>
      </View>
    );
  }
  return (
    <React.Suspense fallback={null}>
      <SkiaProbeLazy />
    </React.Suspense>
  );
}

function YourSkinWebShowcase({ settle }: { settle: boolean }) {
  const fx = FIXTURE_BY_KEY['redness'] ?? YOUR_SKIN_FIXTURES[0];
  return (
    <YourSkinScreen
      read={fx.read}
      toneBackdrop={fx.toneBackdrop}
      mirrored={fx.mirrored}
      theme="dark"
      goal={fx.goal}
      forceReduceMotion={settle}
      onBuildRoutine={() => {}}
      onDoLater={() => {}}
      onRescan={() => {}}
      onShareDayOne={() => {}}
      onDownweightFinding={() => {}}
    />
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    primary: palette.clay,
    text: colors.textPrimary,
    border: colors.borderLight,
    notification: palette.clay,
  },
};

export default function App() {
  // FONT LOADING (v7.7)
  // All seven TTFs ship under assets/fonts/. Family-name keys MUST match the
  // strings referenced by `theme/tokens.ts fontFamily` / inline
  // `fontFamily: 'InstrumentSerif-SemiBold'` literals one-to-one — renaming a
  // key here without updating tokens will silently fall back to the platform
  // serif/sans. Hence: no indirection, literal require paths.
  const [fontsLoaded] = useFonts({
    'InstrumentSerif-Regular':  require('./assets/fonts/InstrumentSerif-Regular.ttf'),
    'InstrumentSerif-Italic':   require('./assets/fonts/InstrumentSerif-Italic.ttf'),
    'InstrumentSerif-SemiBold': require('./assets/fonts/InstrumentSerif-SemiBold.ttf'),
    'Inter-Regular':            require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium':             require('./assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold':           require('./assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold':               require('./assets/fonts/Inter-Bold.ttf'),
  });

  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    installDevConsole();
    // v10.28 — fire one /healthz probe at boot. Result lands on
    // aiTelemetry.healthz so the Home banner + diagnostics screen can
    // show whether the configured proxy actually answers.
    void probeProxyHealthz();
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // AppIntro plays on every launch. It holds on its settled frame until BOTH
  // its own minimum hold has elapsed AND systemReady is true (hydration +
  // fonts resolved). Once it dismisses, we never show it again this session.
  const systemReady = hydrated && (fontsLoaded || fontsLoaded === undefined);
  const webBypassSplash = Platform.OS === 'web';
  const showcase = webShowcase();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={styles.fill}>
            <StatusBar style="dark" />
            {showcase?.key === 'index' ? (
              <ShowcaseIndex />
            ) : showcase?.key === 'money' ? (
              <MoneyWebShowcase />
            ) : showcase?.key === 'ritual' ? (
              <RitualWebShowcase />
            ) : showcase?.key === 'shop' ? (
              <ShopWebShowcase />
            ) : showcase?.key === 'shop-debug' ? (
              <SkinShopDebugScreen />
            ) : showcase?.key === 'skia-probe' ? (
              <SkiaProbeGate />
            ) : showcase?.key === 'analyzing' ? (
              <AnalyzingWebShowcase />
            ) : showcase?.key === 'rescan' ? (
              <RescanWebShowcase />
            ) : showcase?.key === 'your-skin' ? (
              <YourSkinWebShowcase settle={showcase.settle} />
            ) : (introDone || webBypassSplash) ? (
              <NavigationContainer ref={navigationRef} theme={navTheme}>
                <BottomSheetModalProvider>
                  <ContextualProvider>
                    <RootNavigator />
                  </ContextualProvider>
                </BottomSheetModalProvider>
              </NavigationContainer>
            ) : (
              <SplashScreen
                systemReady={systemReady}
                onReady={() => setIntroDone(true)}
              />
            )}
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1, backgroundColor: colors.bg },
});

