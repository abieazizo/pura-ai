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
import { AuthChoice } from '@/screens/onboarding/AuthChoice';
import { SignIn } from '@/screens/onboarding/SignIn';
import { Tutorial } from '@/screens/onboarding/Tutorial';
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
import { useAppStore } from '@/store/useAppStore';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Question-first onboarding navigator (restored).
 *
 *   Splash
 *     → AuthChoice            (new user) / SignIn (returning user)
 *     → AskName → AskAge → AskGender → AskSkinType → AskConcerns
 *     → AskSensitivity → AskSunExposure → AskEffort → AskGoal
 *     → AskAttribution
 *     → Processing            (profile calibration; honest checklist)
 *     → ProfileSummary
 *     → Tutorial              (product walkthrough; complete or skip)
 *         → finishOnboarding + setHasSeenScanTutorial(true)
 *         → root resets to [Tabs, ScanModal] — user lands in the camera
 *
 * Returning user: Splash → SignIn → Tabs.
 *
 * Camera and notification permissions are requested contextually (at the
 * first scan capture and the first routine schedule, respectively), not
 * up front. The ReviewAsk + Paywall steps are intentionally omitted from
 * this flow.
 *
 * The scan-first (V2) onboarding has been removed.
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
              onSignIn={() => navigation.navigate('SignIn')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="AuthChoice">
        {({ navigation }) => (
          <SlideEntry>
            <AuthChoice
              onAppleContinue={() => navigation.navigate('AskName')}
              onGoogleContinue={() => navigation.navigate('AskName')}
              onEmailContinue={() => navigation.navigate('AskName')}
              onSignIn={() => navigation.navigate('SignIn')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="SignIn">
        {({ navigation }) => <SignInHost nav={navigation} />}
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
              onNext={() => navigation.navigate('Tutorial')}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

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
 * Returning-user sign-in handoff. A successful sign-in (provider OR
 * email+password) skips the quiz/tutorial because the backend already
 * carries the user's profile and scan history. For this build (no real
 * auth backend) every sign-in handler fires `finishOnboarding()` and
 * resets into Tabs. "Create account" sends the user back to AuthChoice
 * (new-user flow).
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
        onCreateAccount={() => nav.replace('AuthChoice')}
      />
    </SlideEntry>
  );
}

/**
 * TutorialHost wraps the product walkthrough and owns onboarding
 * completion. Completing OR skipping the tutorial:
 *
 *   1. `finishOnboarding()` writes `onboardingComplete: true` → the
 *      RootNavigator gate flips from OnboardingNavigator to TabNavigator.
 *   2. `setHasSeenScanTutorial(true)` prevents the legacy camera-technique
 *      tutorial from firing on top of the product tutorial just seen.
 *   3. `rootNav.reset` to [Tabs, ScanModal] so the user lands directly in
 *      the camera — Home has no meaning before a first scan exists.
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
