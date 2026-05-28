import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SlideEntry } from '@/components/onboarding/SlideEntry';
import {
  WelcomeV2,
  CameraTrustV2,
  GuidedFirstScanV2,
  ScanReviewV2,
  BaselineRevealV2,
  TonightRoutineV2,
  SaveProgressV2,
} from '@/screens/onboarding/v2';
import { SignIn } from '@/screens/onboarding/SignIn';
import { useAppStore } from '@/store/useAppStore';
import { useOnboardingV2 } from '@/state/onboardingV2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * v25 — scan-first onboarding navigator.
 *
 *   WelcomeV2
 *     → PrimaryGoalV2
 *     → CameraTrustV2          (permission requested on CTA)
 *     → GuidedFirstScanV2      (camera + capture + Use / Retake)
 *     → ProcessingV2           (runs analyzeFaceScan; honest stages)
 *     → BaselineRevealV2       (signals derived from real Scan)
 *     → SafetyCalibrationV2    (product reactivity, warm clay)
 *     → RoutineSimplicityV2    (no "Advanced" first-run option)
 *     → PlanRevealV2           (real starting routine)
 *     → SaveProgressV2         (Apple / Google / Email / Guest)
 *         on success → finishOnboarding → root resets to Tabs
 *
 * Returning user: WelcomeV2 → SignIn → Tabs.
 *
 * Legacy routes (AskGoal / AskConcerns / AskSkinBehavior / AskEffort /
 * AskLifestyle / AskAge / Processing / PlanReveal / AuthChoice /
 * FirstScanInvitation / Splash) are NO LONGER REACHABLE from this
 * navigator. The files remain on disk so legacy diagnostics can compile,
 * but the active onboarding entry point is WelcomeV2.
 */
export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={STACK_OPTIONS}
      initialRouteName="WelcomeV2"
    >
      <Stack.Screen name="WelcomeV2" options={{ gestureEnabled: false }}>
        {({ navigation }) => (
          <SlideEntry>
            <WelcomeV2
              onStartFirstScan={() => navigation.navigate('CameraTrustV2')}
              onSignIn={() => navigation.navigate('SignIn')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="SignIn">
        {({ navigation }) => <SignInHost nav={navigation} />}
      </Stack.Screen>

      <Stack.Screen name="CameraTrustV2">
        {({ navigation }) => (
          <SlideEntry>
            <CameraTrustV2
              onPermissionGranted={() =>
                navigation.navigate('GuidedFirstScanV2')
              }
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="GuidedFirstScanV2"
        options={{ gestureEnabled: false, animation: 'fade' }}
      >
        {({ navigation }) => (
          <GuidedFirstScanV2
            onCancel={() => navigation.goBack()}
            onCaptured={() => navigation.navigate('ScanReviewV2')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ScanReviewV2"
        options={{ gestureEnabled: false }}
      >
        {({ navigation }) => (
          <SlideEntry>
            <ScanReviewV2
              onApproved={() => navigation.navigate('BaselineRevealV2')}
              onRetake={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'GuidedFirstScanV2' }],
                })
              }
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="BaselineRevealV2"
        options={{ gestureEnabled: false }}
      >
        {({ navigation }) => (
          <SlideEntry>
            <BaselineRevealV2
              onContinue={() => navigation.navigate('TonightRoutineV2')}
              onRetake={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'GuidedFirstScanV2' }],
                })
              }
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="TonightRoutineV2"
        options={{ gestureEnabled: false }}
      >
        {({ navigation }) => (
          <SlideEntry>
            <TonightRoutineV2
              onContinue={() => navigation.navigate('SaveProgressV2')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="SaveProgressV2"
        options={{ gestureEnabled: false }}
      >
        {() => <SaveProgressHost />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

/**
 * Returning-user sign-in handoff. Successful auth bypasses the new
 * onboarding because the backend already carries the user's profile
 * and scan history.
 */
function SignInHost({ nav }: { nav: NativeStackNavigationProp<OnboardingStackParamList> }) {
  const rootNav = useNavigation<NavigationProp<any>>();
  const finish = useAppStore((s) => s.finishOnboarding);

  const completeSignIn = useCallback(() => {
    finish();
    rootNav.reset?.({ index: 0, routes: [{ name: 'Tabs' as never }] });
  }, [finish, rootNav]);

  return (
    <SlideEntry>
      <SignIn
        onBack={() => nav.goBack()}
        onAppleSignIn={completeSignIn}
        onGoogleSignIn={completeSignIn}
        onEmailSignIn={completeSignIn}
        onForgotPassword={() => {
          Alert.alert(
            'Reset your password',
            'Password reset is launching soon. In the meantime, email support@puraskin.com and we\'ll get you back in.',
            [{ text: 'OK', style: 'default' }],
          );
        }}
        onCreateAccount={() => nav.replace('WelcomeV2')}
      />
    </SlideEntry>
  );
}

/**
 * Save Progress host — commits the captured Scan to history and
 * finalises the onboarding completion. Guest path follows the same
 * commit path without provider auth; the only difference is `withAuth`
 * on the terminal analytics event.
 */
function SaveProgressHost() {
  const rootNav = useNavigation<NavigationProp<any>>();
  const finish = useAppStore((s) => s.finishOnboarding);
  const addScan = useAppStore((s) => s.addScan);
  const setScanResult = useAppStore((s) => s.setScanResult);
  const setHasSeenScanTutorial = useAppStore((s) => s.setHasSeenScanTutorial);
  const resetOnboardingV2 = useOnboardingV2((s) => s.resetOnboardingV2);

  const commitAndComplete = useCallback(
    (withAuth: boolean) => {
      const v2 = useOnboardingV2.getState();
      // Commit the real Scan to history. The post-scan AI hydration
      // pipeline (product matcher, routine recommendation) fires
      // through addScan as usual — same path as a Home-tab scan.
      if (v2.scanAnalysisResult) {
        addScan(v2.scanAnalysisResult);
        // Surface a minimal ScanResult so the post-onboarding screens
        // can read latestResult without extra hydration.
        const s = v2.scanAnalysisResult;
        setScanResult({
          photoUri: s.photoUri,
          overallScore: s.overallScore,
          zoneScores: {
            forehead: 0,
            tZone: 0,
            chin: 0,
            cheeks: 0,
          },
          findings: [],
          aiReadout: s.summaryHeadline ?? '',
          timestamp: s.capturedAt,
          scanId: s.id,
        });
      }
      setHasSeenScanTutorial(true);
      finish();
      onboardingV2.onboardingCompleted({ withAuth });
      useOnboardingV2.getState().markOnboardingCompleted();
      resetOnboardingV2();
      rootNav.reset?.({ index: 0, routes: [{ name: 'Tabs' as never }] });
    },
    [
      addScan,
      setScanResult,
      finish,
      setHasSeenScanTutorial,
      resetOnboardingV2,
      rootNav,
    ]
  );

  return (
    <SlideEntry>
      <SaveProgressV2
        onAuthCompleted={() => commitAndComplete(true)}
        onContinueAsGuest={() => commitAndComplete(false)}
        onSignIn={() => {
          // Bounce to provider sign-in. The returning-user host owns
          // the reset to Tabs on its own success path.
          rootNav.navigate('SignIn' as never);
        }}
      />
    </SlideEntry>
  );
}

const STACK_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 320,
  gestureEnabled: true,
};
