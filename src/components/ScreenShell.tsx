import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';

export interface ScreenShellProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  background?: string;
  statusBarStyle?: StatusBarStyle;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
}

/**
 * Consistent chrome for every screen: SafeAreaView, status bar, horizontal
 * padding. Tab screens pass edges={['top']} so the custom tab bar owns the
 * bottom safe inset.
 */
export function ScreenShell({
  children,
  scroll = false,
  padded = true,
  background = colors.bg,
  statusBarStyle = 'dark',
  edges = ['top'],
  contentStyle,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
}: ScreenShellProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: background }]}>
      <StatusBar style={statusBarStyle} />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            { paddingHorizontal: padded ? space.md : 0, paddingBottom: space.xxl },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.flex,
            padded && { paddingHorizontal: space.md },
            contentStyle,
          ]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  flex: { flex: 1 },
});
