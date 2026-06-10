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

/**
 * URL deep-link escape hatch — Vercel-safe, NOT gated on __DEV__.
 *
 * On web (Vercel deploy or local), if the URL carries `?screen=<key>` and the
 * key is in our ALLOWLIST, we navigate there after the container is ready. This
 * is the public, production-safe way to land on a dev-harness screen by URL
 * (e.g. `https://<vercel-url>/?screen=your-skin`) without exposing the full
 * navigation ref to arbitrary scripts on the deployed page.
 *
 * The allowlist is small + explicit — only screens that are SELF-CONTAINED dev
 * harnesses with no side effects beyond rendering can land here. Adding a
 * screen to the allowlist is a deliberate code change. Nothing on the public
 * tab/onboarding flow is exposed this way (those have their own URLs).
 */
const URL_SCREEN_ALLOWLIST: Readonly<Record<string, string>> = {
  'your-skin': 'YourSkinDev',
  'first-finding': 'FirstFindingDev',
  'reveal': 'ScanRevealDev',
  'cold-open': 'OnboardingColdOpenDev',
  'shop-cards': 'ShopCardDevGallery',
};

function applyUrlScreenHatch() {
  if (Platform.OS !== 'web') return;
  try {
    const loc = (globalThis as unknown as { location?: { search?: string } }).location;
    const params = new URLSearchParams(loc?.search ?? '');
    const explicitKey = params.get('screen');
    // DEFAULT TO "your-skin" SETTLED for every bare web visit. The Vercel deploy
    // is a Your-Skin showcase: hitting https://<host>/ with no params lands on
    // the editorial scan-results experience directly, no scan / onboarding /
    // tab traversal required. Explicit ?screen=<other> still wins (allowlist).
    const key = explicitKey || 'your-skin';
    const target = URL_SCREEN_ALLOWLIST[key];
    if (!target) return;
    // ?settle=1 — OR a bare URL with no explicit screen — flips the dev
    // gallery's static-preview flag BEFORE the gallery mounts. With this on,
    // the gallery defaults Reduce Motion ON, so the orb + reveals settle to a
    // clean still frame instead of looping animations on first paint. Explicit
    // ?screen=your-skin (without &settle=1) still gets the full animated
    // experience as authored.
    if (params.get('settle') === '1' || !explicitKey) {
      (globalThis as unknown as { __puraStaticPreview__?: boolean }).__puraStaticPreview__ = true;
    }
    // The container takes ~1 frame to be "ready" — poll briefly, then bail.
    const tryNav = (attempt = 0) => {
      if (!navigationRef.isReady()) {
        if (attempt < 60) {
          setTimeout(() => tryNav(attempt + 1), 50);
        }
        return;
      }
      // @ts-expect-error — navigate signature is screen-name-strict; allowlist guarantees a registered route.
      navigationRef.navigate(target);
    };
    tryNav();
  } catch {
    /* URL parsing or nav threw — silently no-op; the home shell still works. */
  }
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

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={styles.fill}>
            <StatusBar style="dark" />
            {(introDone || webBypassSplash) ? (
              <NavigationContainer ref={navigationRef} theme={navTheme} onReady={applyUrlScreenHatch}>
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

