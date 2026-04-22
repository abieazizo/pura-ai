import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { ScanModalStack } from './ScanModalStack';
import { ProfileSheet } from '@/screens/profile/ProfileSheet';
import { ProductDetailScreen } from '@/screens/productDetail/ProductDetailScreen';
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
        name="ProfileSheet"
        component={ProfileSheet}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          animationDuration: 260,
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
    </Stack.Navigator>
  );
}
