import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SlideEntry } from '@/components/onboarding/SlideEntry';
import { Splash } from '@/screens/onboarding/Splash';
import { AskName } from '@/screens/onboarding/AskName';
import { CameraPrimer } from '@/screens/onboarding/CameraPrimer';
import { CameraPermission } from '@/screens/onboarding/CameraPermission';
import { CameraDenied } from '@/screens/onboarding/CameraDenied';
import { SignIn } from '@/screens/onboarding/SignIn';
import { useAppStore } from '@/store/useAppStore';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Scan-first onboarding navigator (rebuild).
 *
 * Exactly three screens stand between launch and the camera. The face scan
 * auto-detects skin type, concerns, dryness, redness and texture, so the
 * old 11-question quiz — which manually asked what the scan already reads —
 * was deleted. The deferred-but-useful context (age, gender, sun, effort,
 * goal) now lives as optional fields in Me → Skin profile, and account
 * creation moved to AFTER the first scan.
 *
 *   Splash             (Screen 1 — Welcome; one promise, one action)
 *     → AskName        (Screen 2 — optional name, skippable)
 *     → CameraPrimer   (Screen 3 — "Now, the scan." privacy promise)
 *     → CameraPermission   (fires the real system prompt; renders no UI)
 *         • granted → finishOnboarding + root reset to [Tabs, ScanModal]
 *                     so the user lands directly in the camera
 *         • denied  → CameraDenied (calm fallback: Open Settings / Skip)
 *
 * Returning user: Splash → SignIn → Tabs.
 *
 * The questionnaire arc (AuthChoice / AskAge / AskGender / AskSkinType /
 * AskConcerns / AskSensitivity / AskSunExposure / AskEffort / AskGoal /
 * AskAttribution / Processing / ProfileSummary / Tutorial) was removed in
 * this rebuild. AuthChoice survives off-stack — it is repurposed as the
 * post-scan "Save your skin profile" screen.
 */
export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS} initialRouteName="Splash">
      <Stack.Screen name="Splash" options={{ gestureEnabled: false }}>
        {({ navigation }) => (
          <SlideEntry>
            <Splash
              onGetStarted={() => navigation.navigate('AskName')}
              onSignIn={() => navigation.navigate('SignIn')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskName">
        {({ navigation }) => (
          <SlideEntry>
            <AskName onNext={() => navigation.navigate('CameraPrimer')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="CameraPrimer">
        {({ navigation }) => (
          <SlideEntry>
            <CameraPrimer
              onContinue={() => navigation.navigate('CameraPermission')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="CameraPermission" options={{ gestureEnabled: false }}>
        {({ navigation }) => <CameraPermissionHost nav={navigation} />}
      </Stack.Screen>

      <Stack.Screen name="CameraDenied" options={{ gestureEnabled: false }}>
        {() => <CameraDeniedHost />}
      </Stack.Screen>

      <Stack.Screen name="SignIn">
        {({ navigation }) => <SignInHost nav={navigation} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

/**
 * Camera-permission step. `CameraPermission` renders no UI — it fires the
 * system prompt on mount, records `cameraDenied` in the store, then calls
 * `onDone`. We branch on the freshly-written flag (read imperatively so the
 * closure never goes stale):
 *
 *   • granted → finish onboarding and reset the root into the scan camera.
 *               `setHasSeenScanTutorial(true)` is preserved for parity with
 *               the old hand-off (no live consumer gates on it today).
 *   • denied  → replace with the CameraDenied fallback, so the blank
 *               permission screen never lingers in the back stack.
 */
function CameraPermissionHost({
  nav,
}: {
  nav: NativeStackNavigationProp<OnboardingStackParamList>;
}) {
  const rootNav = useNavigation<NavigationProp<any>>();
  const finish = useAppStore((s) => s.finishOnboarding);
  const markScanTutorialSeen = useAppStore((s) => s.setHasSeenScanTutorial);

  const handleDone = useCallback(() => {
    if (useAppStore.getState().cameraDenied) {
      nav.replace('CameraDenied');
      return;
    }
    finish();
    markScanTutorialSeen(true);
    rootNav.reset?.({
      index: 1,
      routes: [{ name: 'Tabs' as never }, { name: 'ScanModal' as never }],
    });
  }, [nav, finish, markScanTutorialSeen, rootNav]);

  return (
    <SlideEntry replayOnFocus={false}>
      <CameraPermission onDone={handleDone} />
    </SlideEntry>
  );
}

/**
 * Camera-denied fallback host. "Skip for now" finishes onboarding with no
 * scan and lands the user on Home; if they later grant access from Settings,
 * a future scan works without re-prompting (the OS permission persists).
 */
function CameraDeniedHost() {
  const rootNav = useNavigation<NavigationProp<any>>();
  const finish = useAppStore((s) => s.finishOnboarding);

  const skip = useCallback(() => {
    finish();
    rootNav.reset?.({ index: 0, routes: [{ name: 'Tabs' as never }] });
  }, [finish, rootNav]);

  return (
    <SlideEntry>
      <CameraDenied onSkip={skip} />
    </SlideEntry>
  );
}

/**
 * Returning-user sign-in handoff. A successful sign-in (provider OR
 * email+password) skips the new-user flow because the backend already
 * carries the user's profile and scan history. For this build (no real
 * auth backend) every sign-in handler fires `finishOnboarding()` and resets
 * into Tabs. "Create account" drops the user into the new-user flow at
 * AskName (account creation now happens AFTER the first scan).
 */
function SignInHost({
  nav,
}: {
  nav: NativeStackNavigationProp<OnboardingStackParamList>;
}) {
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
          // eslint-disable-next-line no-console
          console.log('[onboarding] TODO: forgot password flow');
        }}
        onCreateAccount={() => nav.replace('AskName')}
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
