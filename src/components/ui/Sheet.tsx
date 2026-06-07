/**
 * Sheet — bottom sheet scaffold (Cycle 2). A backdrop that fades in while the
 * panel springs up from the bottom; both reverse on dismiss (the panel stays
 * mounted through the exit so it actually animates out). A grab handle, an
 * optional title, and safe-area-aware bottom padding. Reduce-motion collapses
 * the spring to an instant appear/disappear.
 *
 * Stays presentation-only: callers own the content and the `visible` flag.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ds, dsRadius, dsSpace, dsSpring, dsType, dsZ } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Disable swipe-to-dismiss affordance handle. Default shows the handle. */
  hideHandle?: boolean;
}

export function Sheet({ visible, onClose, children, title, hideHandle }: SheetProps) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const sheetH = useSharedValue(600);

  const unmount = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = reduce
        ? withTiming(1, { duration: 1 })
        : withSpring(1, dsSpring.smooth);
    } else if (mounted) {
      progress.value = withTiming(
        0,
        { duration: reduce ? 1 : 220 },
        (finished) => {
          if (finished) runOnJS(unmount)();
        }
      );
    }
  }, [visible, reduce, mounted, progress, unmount]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetH.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          onLayout={(e) => {
            sheetH.value = e.nativeEvent.layout.height;
          }}
          style={[
            styles.panel,
            { paddingBottom: insets.bottom + dsSpace.lg },
            panelStyle,
          ]}
        >
          {!hideHandle ? <View style={styles.handle} /> : null}
          {title ? <Text style={[dsType.headline, styles.title]}>{title}</Text> : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', zIndex: dsZ.sheet },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ds.scrim,
  },
  panel: {
    backgroundColor: ds.surface,
    borderTopLeftRadius: dsRadius.xxl,
    borderTopRightRadius: dsRadius.xxl,
    paddingHorizontal: dsSpace.xl,
    paddingTop: dsSpace.md,
    shadowColor: ds.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: -12 },
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: ds.borderStrong,
    marginBottom: dsSpace.base,
  },
  title: { color: ds.textPrimary, marginBottom: dsSpace.md },
});
