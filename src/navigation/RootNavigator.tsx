import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { ScanModalStack } from './ScanModalStack';
import { ProductDetailScreen } from '@/screens/productDetail/ProductDetailScreen';
import { AIDiagnosticsScreen } from '@/components/dev/AIDiagnosticsScreen';
import { ScanResultsStatesGallery } from '@/components/dev/ScanResultsStatesGallery';
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
    </Stack.Navigator>
  );
}
