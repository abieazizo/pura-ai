import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SlideEntry } from '@/components/onboarding/SlideEntry';
import { Splash } from '@/screens/onboarding/Splash';
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
import { Welcome } from '@/screens/onboarding/Welcome';
import { useAppStore } from '@/store/useAppStore';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * v7 onboarding navigator (§2.3). Seventeen routes. Native-stack with
 * `slide_from_right`, layered with a per-screen Reanimated spring via
 * `<SlideEntry />` so the content gets the custom 40→0 translateX + opacity
 * fade. Back swipe is disabled on Splash, permission resolvers, Processing,
 * ReviewAsk, Paywall, Welcome.
 *
 * Completion path: Welcome → `finishOnboarding()` → RootNavigator's
 * `onboardingComplete` gate flips and the user lands on the tabs. The scan
 * tutorial's own gate then surfaces inside the tabs.
 */
export function OnboardingNavigator() {
  const finishOnboarding = useAppStore((s) => s.finishOnboarding);

  return (
    <Stack.Navigator
      screenOptions={STACK_OPTIONS}
      initialRouteName="Splash"
    >
      <Stack.Screen name="Splash" options={{ gestureEnabled: false }}>
        {({ navigation }) => (
          <SlideEntry>
            <Splash
              onGetStarted={() => navigation.navigate('CameraPrimer')}
              onSignIn={() => {
                // eslint-disable-next-line no-console
                console.log('[onboarding] TODO: sign-in flow');
              }}
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
              onStartTrial={() => navigation.navigate('Welcome')}
              onRestore={() => {
                // eslint-disable-next-line no-console
                console.log('[onboarding] TODO: restore');
              }}
              onBack={() => navigation.goBack()}
            />
          </SlideEntry>
        )}
      </Stack.Screen>

      <Stack.Screen name="Welcome" options={{ gestureEnabled: false }}>
        {() => <WelcomeHost finish={finishOnboarding} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function WelcomeHost({ finish }: { finish: () => void }) {
  const rootNav = useNavigation<NavigationProp<any>>();
  const handle = useCallback(() => {
    // `finish()` writes `onboardingComplete: true`. The RootNavigator's
    // gate flips in response, which remounts into Tabs. We don't push any
    // route from here — the navigation swap is declarative.
    finish();
    rootNav.reset?.({ index: 0, routes: [{ name: 'Tabs' as never }] });
  }, [finish, rootNav]);

  return (
    <SlideEntry>
      <Welcome onTakeFirstScan={handle} />
    </SlideEntry>
  );
}

const STACK_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 320,
  gestureEnabled: true,
};
