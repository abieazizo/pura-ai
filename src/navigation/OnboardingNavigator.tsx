import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SlideEntry } from '@/components/onboarding/SlideEntry';
import { ColdOpenScreen } from '@/screens/onboarding/ColdOpenScreen';
import { OrbInterviewScreen } from '@/screens/onboarding/OrbInterviewScreen';
import { CameraPrimer } from '@/screens/onboarding/CameraPrimer';
import { CameraPermission } from '@/screens/onboarding/CameraPermission';
import { CameraDenied } from '@/screens/onboarding/CameraDenied';
import { SignIn } from '@/screens/onboarding/SignIn';
import { useAppStore } from '@/store/useAppStore';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Scan-first onboarding navigator (v22 momentum rebuild).
 *
 * The flow is the orb getting to know the user on the way to the scan —
 * one question per screen, every answer engine-consumed:
 *
 *   ColdOpen           (the orb's birth; "Meet Pura" + "Let's look.")
 *     → OrbInterview   (ONE route, ONE orb: goal → age → skin type →
 *                       sensitivities → pregnancy → synthesis beat)
 *     → CameraPrimer   ("Now, the scan." — honest privacy promise)
 *     → CameraPermission   (fires the real system prompt; renders no UI)
 *         • granted → finishOnboarding + ScanModal over Tabs
 *                     so the user lands directly in the camera
 *         • denied  → CameraDenied (calm fallback: Open Settings / Skip)
 *
 * Returning user: ColdOpen → SignIn → Tabs.
 *
 * Cut in this rebuild: the Splash/AskName legacy arc, the orb intro tap-beat,
 * the typed name question, and the guidance + routine-depth questions (no
 * engine consumer at onboarding time; their store fields default gracefully).
 * AuthChoice survives off-stack — it is repurposed as the post-scan
 * "Save your skin profile" screen.
 */
export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS} initialRouteName="ColdOpen">
      {/* Screen 1 — the cold open (the orb's birth). Self-animates; no
          SlideEntry wrapper (it owns its entrance + variants). */}
      <Stack.Screen name="ColdOpen" options={{ gestureEnabled: false }}>
        {({ navigation }) => (
          <ColdOpenScreen
            onContinue={() => navigation.navigate('OrbInterview')}
            onSignIn={() => navigation.navigate('SignIn')}
          />
        )}
      </Stack.Screen>

      {/* The orb interview (Screen 2 + name beat + Screen 3). A cross-fade in
          (not a slide) so the companion orb — seeded at the cold open's exit
          spot — reads as one continuous element across the handoff. */}
      <Stack.Screen
        name="OrbInterview"
        options={{ animation: 'fade', animationDuration: 280, gestureEnabled: false }}
      >
        {({ navigation }) => (
          <OrbInterviewScreen onDone={() => navigation.navigate('CameraPrimer')} />
        )}
      </Stack.Screen>

      {/* gestureEnabled: false — swiping back would land on the interview's
          spent synthesis step (one-shot beat, orb already hidden): a dead end.
          The fade matches the ColdOpen→OrbInterview seam so the orb chain
          exits with the same transition grammar it entered with, and the
          interview orb's hide (260ms) dissolves INTO this fade instead of
          before a sideways card slide. */}
      <Stack.Screen
        name="CameraPrimer"
        options={{ animation: 'fade', animationDuration: 280, gestureEnabled: false }}
      >
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
 *   • granted → finish onboarding (the gate swaps Onboarding → Tabs) and
 *               present `ScanModal` over Tabs so the user lands in the camera.
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
  // `useNavigation()` inside this screen returns the ONBOARDING stack, not the
  // root — its parent is the root stack that owns `Tabs` and the always-mounted
  // `ScanModal`. (The old code named this `rootNav` and reset it directly,
  // which is what broke.)
  const onboardingNav = useNavigation<NavigationProp<any>>();
  const finish = useAppStore((s) => s.finishOnboarding);
  const markScanTutorialSeen = useAppStore((s) => s.setHasSeenScanTutorial);

  const handleDone = useCallback(() => {
    if (useAppStore.getState().cameraDenied) {
      nav.replace('CameraDenied');
      return;
    }
    // Grab the ROOT navigator before finishing. It stays valid across the gate
    // swap (the root never unmounts), while this onboarding screen tears down.
    const rootNav = onboardingNav.getParent();

    finish();                 // flips `onboardingComplete`
    markScanTutorialSeen(true);

    // `finish()` makes the RootNavigator gate swap Onboarding → Tabs on its
    // own (the canonical react-navigation auth-flow pattern). We therefore do
    // NOT name `Tabs` in a reset: it isn't a valid root route until that gate
    // re-render flushes, which is exactly what made the old
    // `reset({ routes: [{ name: 'Tabs' }, { name: 'ScanModal' }] })` throw
    // "RESET … was not handled by any navigator".
    //
    // Instead we just present the camera (`ScanModal` — an always-mounted root
    // sibling) over the freshly-shown Tabs. Deferred one frame so the gate
    // commits Tabs as the base screen FIRST; presenting before that would drop
    // Tabs from the root stack and strand the user when they close the camera.
    requestAnimationFrame(() => {
      rootNav?.navigate('ScanModal', { initialMode: 'face' });
    });
  }, [nav, finish, markScanTutorialSeen, onboardingNav]);

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
  const finish = useAppStore((s) => s.finishOnboarding);

  // `finish()` flips `onboardingComplete`; the RootNavigator gate reads that
  // and swaps Onboarding → Tabs automatically. No manual reset — the old
  // `reset({ routes: [{ name: 'Tabs' }] })` named a route this onboarding
  // stack doesn't own and only seemed to work because the gate did the real
  // navigation.
  const skip = useCallback(() => {
    finish();
  }, [finish]);

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
 * into Tabs. "Create account" drops the user back to the new-user flow at
 * ColdOpen (account creation now happens AFTER the first scan).
 */
function SignInHost({
  nav,
}: {
  nav: NativeStackNavigationProp<OnboardingStackParamList>;
}) {
  const finish = useAppStore((s) => s.finishOnboarding);

  // Same gate-driven swap as above: finishing onboarding lands the returning
  // user on Tabs without a manual root reset.
  const completeSignIn = useCallback(() => {
    finish();
  }, [finish]);

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
        onCreateAccount={() => nav.replace('ColdOpen')}
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
