import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { ScanModalStack } from './ScanModalStack';
import { PuraAssistConversationScreen } from '@/screens/assistant/PuraAssistConversationScreen';
import { ProductDetailScreen } from '@/screens/productDetail/ProductDetailScreen';
import { AIDiagnosticsScreen } from '@/components/dev/AIDiagnosticsScreen';
import { ScanResultsStatesGallery } from '@/components/dev/ScanResultsStatesGallery';
import { RevealDevGallery } from '@/components/dev/RevealDevGallery';
import { ShopCardDevGallery } from '@/components/dev/ShopCardDevGallery';
import { ColdOpenDevGallery } from '@/screens/onboarding/dev/ColdOpenDevGallery';
import { YourSkinDevGallery } from '@/screens/scan/yourSkin/dev/YourSkinDevGallery';
import { FirstFindingDevHarness } from '@/screens/scan/firstFinding/FirstFindingDevHarness';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * v5 uses a 340ms base transition — slower than the react-navigation default
 * (250ms) because deliberate feels more premium. Native-stack inherits
 * platform timing for forward/back, so this is a preference we set on
 * individual screen options where a specific feel is required.
 */
export function RootNavigator() {
  // v7 onboarding gate — flips to true when Welcome fires `finishOnboarding()`.
  // Dev helpers (`devLoadPopulated`, `devResetToNewUser`) also set it.
  const hasOnboarded = useAppStore((s) => s.onboardingComplete);

  // Dev-only: seed a fresh pre-scan state when the browser has no
  // persisted store (new preview context). Prevents the Onboarding
  // Splash from blocking Playwright's JS execution via camera init.
  // No-op in production (__DEV__ is tree-shaken).
  React.useEffect(() => {
    if (__DEV__ && !hasOnboarded) {
      // Escape hatch: set localStorage '__pura_show_onboarding__' = '1' to
      // PREVIEW the onboarding flow in dev (the orb cold open + interview don't
      // touch the camera, so they don't block headless JS). Default behavior is
      // unchanged — without the flag we still auto-seed a completed state.
      try {
        if (
          (globalThis as any)?.localStorage?.getItem?.('__pura_show_onboarding__') ===
          '1'
        ) {
          return;
        }
      } catch {}
      useAppStore.getState().devResetToNewUser();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 340,
      }}
    >
      {hasOnboarded ? (
        <Stack.Screen name="Tabs" component={TabNavigator} />
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      )}

      <Stack.Screen
        name="ScanModal"
        component={ScanModalStack}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          animationDuration: 340,
        }}
      />

      {/* v32 — Pura Assist conversation. Root-level so it covers the
          floating tab dock (the reference shows no tab bar in
          conversation). Opened from the Home tab's input dock.

          v33 Fix 4 — premium "expand into AI Assist" transition. The Home ask
          dock and the conversation composer occupy the same place, so a
          cross-fade (rather than a horizontal push) reads as the SAME bar
          staying put while the conversation assembles around it: the header
          and context card slide down into place and the prompt cards rise up,
          via the screen's Reanimated entering animations. Shared-element
          libraries aren't available in this environment, so this is the
          Reanimated-only Option C. The fade reverses on back automatically. */}
      <Stack.Screen
        name="AssistChat"
        component={PuraAssistConversationScreen}
        options={{
          animation: 'fade',
          animationDuration: 340,
        }}
      />

      <Stack.Screen
        name="ProductDetailModal"
        component={ProductDetailScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          animationDuration: 340,
        }}
      />

      {/* v10.25 — dev-only AI diagnostics surface. Always registered
          so the AISourceBadge can navigate to it when present; in
          production the badge never renders so the route is unreachable. */}
      <Stack.Screen
        name="AIDiagnostics"
        component={AIDiagnosticsScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          animationDuration: 280,
        }}
      />

      {/* Dev-only scan-result state gallery. Reachable from
          AIDiagnostics in dev builds. No user-facing entry point. */}
      <Stack.Screen
        name="ScanResultsStatesDev"
        component={ScanResultsStatesGallery}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          animationDuration: 280,
        }}
      />

      {/* Dev-only reveal-arc gallery (screens 1–6). Param-driven; reachable
          from AIDiagnostics and the preview harness. No prod entry point. */}
      <Stack.Screen
        name="ScanRevealDev"
        component={RevealDevGallery}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          animationDuration: 280,
        }}
      />

      {/* Dev-only Pura Shop card gallery. Reachable only via the dev nav ref
          (window.__pura_nav__) for isolated card review. No prod entry. */}
      <Stack.Screen
        name="ShopCardDevGallery"
        component={ShopCardDevGallery}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          animationDuration: 280,
        }}
      />

      {/* Dev-only onboarding cold-open (Screen 1) harness. Reachable only via
          window.__pura_nav__; never linked from a user surface. */}
      <Stack.Screen
        name="OnboardingColdOpenDev"
        component={ColdOpenDevGallery}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
          animationDuration: 200,
        }}
      />

      {/* Dev-only "Your Skin" (scan-results screen 2) harness. Reachable only via
          window.__pura_nav__; never linked from a user surface. */}
      <Stack.Screen
        name="YourSkinDev"
        component={YourSkinDevGallery}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
          animationDuration: 200,
        }}
      />

      {/* Dev-only "First Finding" (scan-results screen 1 / Analyzing) harness.
          Reachable only via window.__pura_nav__; never linked from a user surface. */}
      <Stack.Screen
        name="FirstFindingDev"
        component={FirstFindingDevHarness}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
          animationDuration: 200,
        }}
      />
    </Stack.Navigator>
  );
}
