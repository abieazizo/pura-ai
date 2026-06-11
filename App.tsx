import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
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
// Web-only Skia GPU proof (Step 0). Statically importing @shopify/react-native-skia
// here only affects the WEB bundle — App.native.tsx is the native entry and never
// imports this. CanvasKit is loaded before the root mounts (see index.ts).
import { SkiaProbe } from '@/screens/dev/SkiaProbe';

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
            {showcase?.key === 'skia-probe' ? (
              <SkiaProbe />
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

