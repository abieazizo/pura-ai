/**
 * Product detail sheet — the fuller product story, reached by tapping the
 * hero product image. A tall (~75%) bottom sheet on the companion's
 * locked system: the packshot floating on its pillar halo, brand + name,
 * a row of quiet pillar/frequency chips, and the grounded "why / what /
 * how" sections read straight off the step. Read-only — the one action is
 * an optional "Ask Pura about this" that hands off to the assistant.
 *
 * Presentational. Visibility and the step are owned by the host.
 */

import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stepTypeToPillarKey, type RoutineStep } from '@/types/routine';
import { PILLAR_IDENTITY } from '@/components/routine/pillarIdentity';
import { hapt } from '@/utils/haptics';
import {
  CC,
  PILLAR_ATMOSPHERE,
  SHEET_VEIL,
  companionShadows,
  companionType,
} from './companionTokens';
import { resolveRoutineProductImage } from './productImage';

export interface ProductDetailSheetProps {
  visible: boolean;
  step: RoutineStep | null;
  onClose: () => void;
  /** Optional hand-off to the assistant, scoped to this product. */
  onAsk?: (step: RoutineStep) => void;
}

export function ProductDetailSheet({
  visible,
  step,
  onClose,
  onAsk,
}: ProductDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: vh } = useWindowDimensions();
  if (!step) return null;

  const pillar = stepTypeToPillarKey(step.type);
  const atmosphere = PILLAR_ATMOSPHERE[pillar];
  const identity = PILLAR_IDENTITY[pillar];
  const packshot = resolveRoutineProductImage(step.product);
  const brand = step.product?.brand;
  const productName = step.product?.name ?? step.title;

  const why = step.product?.whyMatched?.trim() || step.purpose?.trim() || '';
  const purposeDistinct =
    step.purpose && step.purpose.trim() && step.purpose.trim() !== why
      ? step.purpose.trim()
      : '';
  const howTo =
    step.directions?.trim() ||
    (step.frequency ? `Use ${step.frequency.toLowerCase()}.` : '');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose} accessible={false}>
        <View style={styles.scrim} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.sheet,
          companionShadows.hero,
          {
            maxHeight: vh * 0.84,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        {/* Ambient top veil — a cool wash behind the packshot gives the flat
            porcelain sheet a little depth without tinting the body copy. */}
        <View pointerEvents="none" style={styles.veilClip}>
          <LinearGradient
            colors={SHEET_VEIL}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.handle} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          bounces={false}
        >
          <View style={styles.stage}>
            <View style={[styles.halo, { backgroundColor: atmosphere.haloDeep }]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                start={{ x: 0.3, y: 0.2 }}
                end={{ x: 0.85, y: 0.95 }}
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { borderRadius: 78 }]}
              />
              {packshot ? (
                <Image
                  source={packshot}
                  style={styles.image}
                  contentFit="contain"
                  transition={150}
                />
              ) : (
                <identity.Icon size={52} weight="regular" color={identity.accent} />
              )}
            </View>
          </View>

          {brand ? (
            <Text style={[companionType.brand, styles.brand]}>
              {brand.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[companionType.pageTitle, styles.name]}>{productName}</Text>

          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: atmosphere.halo }]}>
              <Text style={[styles.chipText, { color: identity.accent }]}>
                {identity.label}
              </Text>
            </View>
            {step.frequency ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{step.frequency}</Text>
              </View>
            ) : null}
            {step.optional ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Optional</Text>
              </View>
            ) : null}
          </View>

          {why ? (
            <View style={styles.section}>
              <Text style={[companionType.eyebrow, styles.sectionLabel]}>
                WHY THIS FOR YOU
              </Text>
              <Text style={styles.body}>{why}</Text>
            </View>
          ) : null}

          {purposeDistinct ? (
            <View style={styles.section}>
              <Text style={[companionType.eyebrow, styles.sectionLabel]}>
                WHAT IT DOES
              </Text>
              <Text style={styles.body}>{purposeDistinct}</Text>
            </View>
          ) : null}

          {howTo ? (
            <View style={styles.section}>
              <Text style={[companionType.eyebrow, styles.sectionLabel]}>
                HOW TO USE
              </Text>
              <Text style={styles.body}>{howTo}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {onAsk ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                hapt.select();
                onAsk(step);
              }}
              style={styles.askBtn}
            >
              <Text style={styles.askText}>Ask Pura about this</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              hapt.select();
              onClose();
            }}
            style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
          >
            <Text style={companionType.button}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 15, 0.42)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CC.porcelain,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  veilClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: CC.lineTrack,
    marginBottom: 8,
  },
  scroll: {
    paddingBottom: 16,
  },
  stage: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  halo: {
    width: 156,
    height: 156,
    borderRadius: 78,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: 116,
    height: 116,
  },
  brand: {
    textAlign: 'center',
    marginTop: 18,
  },
  name: {
    textAlign: 'center',
    marginTop: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: CC.lineTrack,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    color: CC.muted,
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 23,
    color: CC.ink,
  },
  footer: {
    paddingTop: 14,
    gap: 6,
  },
  askBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  askText: {
    // Quiet neutral — the sheet's one accent is the pillar-tinted chip; this
    // secondary hand-off shouldn't compete with it in blue.
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 18,
    color: CC.inkSoft,
  },
  doneBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: CC.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.92,
  },
});
