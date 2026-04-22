import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
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
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // AppIntro plays on every launch. It holds on its settled frame until BOTH
  // its own minimum hold has elapsed AND systemReady is true (hydration +
  // fonts resolved). Once it dismisses, we never show it again this session.
  const systemReady = hydrated && (fontsLoaded || fontsLoaded === undefined);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={styles.fill}>
            <StatusBar style="dark" />
            {introDone ? (
              <NavigationContainer theme={navTheme}>
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
