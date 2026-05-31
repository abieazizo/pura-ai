/**
 * ScanResultsErrorBoundary — last-resort safety net around the V2
 * results screen.
 *
 * If `ScanResultsV2Screen` (or any of its descendants — SkinMapV2,
 * FindingCardV2, ScoreBreakdownBars, SkinScoreDial) throws during
 * render, this boundary catches it so the entire scan modal doesn't
 * white-screen. The fallback surface lets the user retake without
 * being stranded.
 *
 * The error is logged in dev so the underlying cause is traceable on
 * the next pass. Production keeps the user moving.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight } from 'phosphor-react-native';

declare const __DEV__: boolean | undefined;

interface Props {
  children: React.ReactNode;
  onRetake?(): void;
  onClose?(): void;
}

interface State {
  error: Error | null;
}

export class ScanResultsErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.error(
        '[Pura Scan] ScanResultsV2Screen crashed during render',
        '\n  message:', error.message,
        '\n  stack:', error.stack,
        '\n  componentStack:', info.componentStack,
      );
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message =
      this.state.error.message ?? 'Something went wrong showing your results.';

    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.page}>
          <View style={styles.center}>
            <View style={styles.emblem} />
            <Text style={styles.eyebrow} maxFontSizeMultiplier={1.15}>
              SOMETHING DIDN'T LOAD
            </Text>
            <Text style={styles.title} maxFontSizeMultiplier={1.1}>
              We hit a snag showing your results.
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.2}>
              Your scan was saved. Try the scan again — your photo will
              be reanalyzed and the results will reappear here.
            </Text>
            {typeof __DEV__ !== 'undefined' && __DEV__ ? (
              <Text style={styles.debug} numberOfLines={6}>
                {message}
              </Text>
            ) : null}
          </View>

          <View style={styles.ctaBlock}>
            {this.props.onRetake ? (
              <Pressable
                onPress={this.props.onRetake}
                accessibilityRole="button"
                accessibilityLabel="Retake scan"
                style={({ pressed }) => [
                  styles.cta,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.1}>
                  Retake scan
                </Text>
                <View style={styles.ctaArrow}>
                  <ArrowRight size={16} weight="bold" color="#FFFFFF" />
                </View>
              </Pressable>
            ) : null}
            {this.props.onClose ? (
              <Pressable
                onPress={this.props.onClose}
                accessibilityRole="link"
                accessibilityLabel="Return home"
                hitSlop={10}
                style={({ pressed }) => [
                  styles.secondary,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.secondaryLabel} maxFontSizeMultiplier={1.2}>
                  Return home
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FCFDFF',
  },
  page: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  emblem: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#075FD1',
    marginBottom: 22,
    shadowColor: '#147CFF',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2.2,
    color: '#075FD1',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 30,
    lineHeight: 34,
    color: '#080A0F',
    textAlign: 'center',
    letterSpacing: -0.3,
    maxWidth: 320,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#5D6673',
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 320,
  },
  debug: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#075FD1',
    textAlign: 'center',
    marginTop: 22,
    maxWidth: 320,
    opacity: 0.7,
  },
  ctaBlock: {
    paddingBottom: 14,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#075FD1',
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 30,
    shadowColor: '#147CFF',
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#075FD1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    marginTop: 14,
    paddingVertical: 8,
  },
  secondaryLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#075FD1',
  },
});
