import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SlideEntry } from '@/components/onboarding/SlideEntry';
import { Splash } from '@/screens/onboarding/Splash';
import { AuthChoice } from '@/screens/onboarding/AuthChoice';
import { Tutorial } from '@/screens/onboarding/Tutorial';
import { CameraPrimer } from '@/screens/onboarding/CameraPrimer';
import { CameraPermission } from '@/screens/onboarding/CameraPermission';
import { AskName } from '@/screens/onboarding/AskName';
import { AskAge } from '@/screens/onboarding/AskAge';
import { AskGender } from '@/screens/onboarding/AskGender';
import { AskSkinType } from '@/screens/onboarding/AskSkinType';
import { AskConcerns } from '@/screens/onboarding/AskConcerns';
import { AskSensitivity } from '@/screens/onboarding/AskSensitivity';
import { AskSunExposure } from '@/screens/onboarding/AskSunExposure';
import { AskEffort } from '@/screens/onboarding/AskEffort';
import { AskGoal } from '@/screens/onboarding/AskGoal';
import { AskAttribution } from '@/screens/onboarding/AskAttribution';
import { Processing } from '@/screens/onboarding/Processing';
import { ProfileSummary } from '@/screens/onboarding/ProfileSummary';
import { NotificationPrimer } from '@/screens/onboarding/NotificationPrimer';
import { NotificationPermission } from '@/screens/onboarding/NotificationPermission';
import { ReviewAsk } from '@/screens/onboarding/ReviewAsk';
import { Paywall } from '@/screens/onboarding/Paywall';
// v10.7 — Welcome was removed from the onboarding flow. The product
// tutorial now hands off directly to the ScanModal, because Home has no
// meaning before a first scan exists. The Welcome screen file is
// preserved for potential future re-use (e.g., a cinematic "you're back"
// moment after account switching), but it is no longer a reachable route
// in OnboardingStackParamList. The import therefore does not appear here.
import { useAppStore } from '@/store/useAppStore';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * v10.7 onboarding navigator. Native-stack with `slide_from_right`,
 * layered with a per-screen Reanimated spring via `<SlideEntry />` so
 * the content gets a 40→0 translateX + opacity fade. Back swipe is
 * disabled on Splash, permission resolvers, Processing, ReviewAsk,
 * Paywall, and Tutorial.
 *
 * Completion path (v10.7):
 *   Tutorial (complete or skip) → `TutorialHost.handoff()`
 *     → `finishOnboarding()` flips the root gate
 *     → `setHasSeenScanTutorial(true)` prevents the legacy 4-page
 *       camera-technique tutorial from surfacing on top of the product
 *       tutorial the user just saw
 *     → `rootNav.reset` to [Tabs, ScanModal] so the user lands
 *       directly in the camera — Home is never shown before a scan.
 */
export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={STACK_OPTIONS}
      initialRouteName="Splash"
    >
      <Stack.Screen name="Splash" options={{ gestureEnabled: false }}>
        {({ navigation }) => (
          <SlideEntry>
            <Splash
              onGetStarted={() => navigation.navigate('AuthChoice')}
              onSignIn={() => navigation.navigate('AuthChoice')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      {/* v10.6 — AuthChoice sits between the brand intro (Splash) and
          the first permission prime. Apple/Google/Email all advance to
          CameraPrimer for now; real auth wiring plugs in here when
          identity provider keys ship. */}
      <Stack.Screen name="AuthChoice">
        {({ navigation }) => (
          <SlideEntry>
            <AuthChoice
              onAppleContinue={() => navigation.navigate('CameraPrimer')}
              onGoogleContinue={() => navigation.navigate('CameraPrimer')}
              onEmailContinue={() => navigation.navigate('CameraPrimer')}
              onSignIn={() => navigation.navigate('CameraPrimer')}
            />
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
        {({ navigation }) => (
          <SlideEntry replayOnFocus={false}>
            <CameraPermission onDone={() => navigation.replace('AskName')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskName">
        {({ navigation }) => (
          <SlideEntry>
            <AskName onNext={() => navigation.navigate('AskAge')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskAge">
        {({ navigation }) => (
          <SlideEntry>
            <AskAge onNext={() => navigation.navigate('AskGender')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskGender">
        {({ navigation }) => (
          <SlideEntry>
            <AskGender onNext={() => navigation.navigate('AskSkinType')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskSkinType">
        {({ navigation }) => (
          <SlideEntry>
            <AskSkinType onNext={() => navigation.navigate('AskConcerns')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskConcerns">
        {({ navigation }) => (
          <SlideEntry>
            <AskConcerns onNext={() => navigation.navigate('AskSensitivity')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskSensitivity">
        {({ navigation }) => (
          <SlideEntry>
            <AskSensitivity
              onNext={() => navigation.navigate('AskSunExposure')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskSunExposure">
        {({ navigation }) => (
          <SlideEntry>
            <AskSunExposure onNext={() => navigation.navigate('AskEffort')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskEffort">
        {({ navigation }) => (
          <SlideEntry>
            <AskEffort onNext={() => navigation.navigate('AskGoal')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskGoal">
        {({ navigation }) => (
          <SlideEntry>
            <AskGoal onNext={() => navigation.navigate('AskAttribution')} />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AskAttribution">
        {({ navigation }) => (
          <SlideEntry>
            <AskAttribution
              onNext={() => navigation.navigate('Processing')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="Processing" options={{ gestureEnabled: false }}>
        {({ navigation }) => (
          <SlideEntry replayOnFocus={false}>
            <Processing
              onDone={() => navigation.replace('ProfileSummary')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="ProfileSummary">
        {({ navigation }) => (
          <SlideEntry>
            <ProfileSummary
              onNext={() => navigation.navigate('NotificationPrimer')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="NotificationPrimer">
        {({ navigation }) => (
          <SlideEntry>
            <NotificationPrimer
              onContinue={() => navigation.navigate('NotificationPermission')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="NotificationPermission"
        options={{ gestureEnabled: false }}
      >
        {({ navigation }) => (
          <SlideEntry replayOnFocus={false}>
            <NotificationPermission
              onDone={() => navigation.replace('ReviewAsk')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ReviewAsk"
        options={{ gestureEnabled: false, animation: 'fade' }}
      >
        {({ navigation }) => (
          <ReviewAsk onDone={() => navigation.replace('Paywall')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Paywall" options={{ gestureEnabled: false }}>
        {({ navigation }) => (
          <SlideEntry>
            <Paywall
              onStartTrial={() => navigation.navigate('Tutorial')}
              onRestore={() => {
                // eslint-disable-next-line no-console
                console.log('[onboarding] TODO: restore');
              }}
              onBack={() => navigation.goBack()}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      {/* v10.7 — product walkthrough is the final onboarding step.
          Skipping or completing both fire `finishOnboarding()`, mark
          the scan tutorial as seen (so the legacy camera-technique
          tutorial doesn't also surface on first scan), and route
          directly into the Scan modal. There is no Home stop
          in between — Home has no meaning before a scan exists. */}
      <Stack.Screen
        name="Tutorial"
        options={{ gestureEnabled: false, animation: 'slide_from_right' }}
      >
        {() => <TutorialHost />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

/**
 * v10.7 — TutorialHost wraps the 3-page product walkthrough and owns
 * the onboarding-completion flow. Completing OR skipping the tutorial:
 *
 *   1. `finishOnboarding()` writes `onboardingComplete: true` → the
 *      RootNavigator gate flips from OnboardingNavigator to TabNavigator.
 *   2. `setHasSeenScanTutorial(true)` prevents the legacy 4-page
 *      camera-technique tutorial from firing on top of the product
 *      tutorial the user just finished — the product tutorial's "01 ·
 *      SCAN" page already covers the capture basics.
 *   3. `rootNav.reset` to Tabs **with ScanModal stacked on top** so the
 *      user lands directly in the camera. Home is not a meaningful
 *      destination before a first scan; the Tutorial → Scan transition
 *      is the real first product moment.
 *
 * The previous Welcome screen was removed from the onboarding flow in
 * v10.7 — it duplicated the Tutorial's final message and created a
 * redundant extra stop between "I'm ready" and the actual scan.
 */
function TutorialHost() {
  const rootNav = useNavigation<NavigationProp<any>>();
  const finish = useAppStore((s) => s.finishOnboarding);
  const markScanTutorialSeen = useAppStore((s) => s.setHasSeenScanTutorial);

  const handoff = useCallback(() => {
    finish();
    markScanTutorialSeen(true);
    rootNav.reset?.({
      index: 1,
      routes: [{ name: 'Tabs' as never }, { name: 'ScanModal' as never }],
    });
  }, [finish, markScanTutorialSeen, rootNav]);

  return <Tutorial onComplete={handoff} onSkip={handoff} />;
}

const STACK_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 320,
  gestureEnabled: true,
};
