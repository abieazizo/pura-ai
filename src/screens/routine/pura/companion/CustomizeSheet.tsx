/**
 * Customize sheet — the routine's light-touch editor, reached from the
 * header "Customize" link. A tall (~84%) bottom sheet listing the active
 * time-of-day's steps; each row can reveal up to three catalog
 * alternatives to swap in, with a single "Rebuild from my latest scan"
 * escape hatch at the foot. No drag handles, no delete, no add — swapping
 * a product is the only per-step edit the companion offers.
 *
 * Presentational. Visibility, the routine, and every mutation are owned
 * by the host.
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
import {
  stepTypeToPillarKey,
  type CustomRoutine,
  type RoutineProduct,
  type RoutineTimeOfDay,
} from '@/types/routine';
import { PILLAR_IDENTITY } from '@/components/routine/pillarIdentity';
import { alternatesForStep } from '@/services/routine/productMatcherService';
import { hapt } from '@/utils/haptics';
import {
  CC,
  PILLAR_ATMOSPHERE,
  SHEET_VEIL,
  companionShadows,
  companionType,
} from './companionTokens';
import { resolveRoutineProductImage } from './productImage';

export interface CustomizeSheetProps {
  visible: boolean;
  routine: CustomRoutine | null;
  timeOfDay: RoutineTimeOfDay;
  onClose: () => void;
  /** Replace the product on a step with a chosen alternative. */
  onSwap: (stepId: string, product: RoutineProduct) => void;
  /** Regenerate the whole routine from the latest scan. */
  onRebuild: () => void;
}

export function CustomizeSheet({
  visible,
  routine,
  timeOfDay,
  onClose,
  onSwap,
  onRebuild,
}: CustomizeSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: vh } = useWindowDimensions();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Collapse any open swap tray when the sheet closes or the list flips.
  React.useEffect(() => {
    if (!visible) setExpandedId(null);
  }, [visible]);
  React.useEffect(() => {
    setExpandedId(null);
  }, [timeOfDay]);

  if (!routine) return null;

  const steps =
    timeOfDay === 'morning' ? routine.morningSteps : routine.eveningSteps;

  const toggleExpand = (id: string) => {
    hapt.select();
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const handlePick = (stepId: string, product: RoutineProduct) => {
    hapt.select();
    onSwap(stepId, product);
    setExpandedId(null);
  };

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
        {/* Ambient top veil — matches the product sheet: a cool wash gives the
            flat porcelain panel depth behind the header. */}
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

        <View style={styles.head}>
          <Text style={companionType.pageTitle}>Customize</Text>
          <Text style={[companionType.date, styles.headSub]}>
            {timeOfDay === 'morning' ? 'Morning' : 'Evening'} routine — swap any
            product for a matched alternative.
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          bounces={false}
        >
          {steps.map((step) => {
            const pillar = stepTypeToPillarKey(step.type);
            const atmosphere = PILLAR_ATMOSPHERE[pillar];
            const identity = PILLAR_IDENTITY[pillar];
            const packshot = resolveRoutineProductImage(step.product);
            const expanded = expandedId === step.id;
            const alts = expanded
              ? alternatesForStep({
                  type: step.type,
                  relatedConcerns: [],
                  excludeId: step.product?.id,
                  limit: 3,
                })
              : [];
            return (
              <View key={step.id} style={styles.stepBlock}>
                <View style={styles.stepRow}>
                  <View
                    style={[styles.thumb, { backgroundColor: atmosphere.haloDeep }]}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
                      start={{ x: 0.25, y: 0.15 }}
                      end={{ x: 0.9, y: 1 }}
                      pointerEvents="none"
                      style={StyleSheet.absoluteFill}
                    />
                    {packshot ? (
                      <Image
                        source={packshot}
                        style={styles.thumbImg}
                        contentFit="contain"
                      />
                    ) : (
                      <identity.Icon
                        size={20}
                        weight="regular"
                        color={identity.accent}
                      />
                    )}
                  </View>
                  <View style={styles.stepText}>
                    <Text
                      style={[companionType.brand, { color: identity.accent }]}
                    >
                      {identity.label}
                    </Text>
                    <Text style={styles.stepName} numberOfLines={1}>
                      {step.product?.name ?? step.title}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Swap ${step.product?.name ?? step.title}`}
                    hitSlop={8}
                    onPress={() => toggleExpand(step.id)}
                    style={[styles.swapBtn, expanded && styles.swapBtnActive]}
                  >
                    <Text
                      style={[
                        styles.swapText,
                        expanded && styles.swapTextActive,
                      ]}
                    >
                      {expanded ? 'Close' : 'Swap'}
                    </Text>
                  </Pressable>
                </View>

                {expanded ? (
                  <View style={styles.altList}>
                    {alts.length === 0 ? (
                      <Text style={styles.altEmpty}>
                        No alternatives for this step yet.
                      </Text>
                    ) : (
                      alts.map((alt) => {
                        const altImg = resolveRoutineProductImage(alt);
                        return (
                          <Pressable
                            key={alt.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Use ${alt.brand} ${alt.name}`}
                            onPress={() => handlePick(step.id, alt)}
                            style={({ pressed }) => [
                              styles.altRow,
                              pressed && styles.pressed,
                            ]}
                          >
                            <View
                              style={[
                                styles.altThumb,
                                { backgroundColor: atmosphere.halo },
                              ]}
                            >
                              {altImg ? (
                                <Image
                                  source={altImg}
                                  style={styles.altThumbImg}
                                  contentFit="contain"
                                />
                              ) : null}
                            </View>
                            <View style={styles.altText}>
                              <Text style={styles.altBrand}>
                                {alt.brand.toUpperCase()}
                              </Text>
                              <Text style={styles.altName} numberOfLines={1}>
                                {alt.name}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              hapt.select();
              onRebuild();
            }}
            style={styles.rebuildBtn}
          >
            <Text style={styles.rebuildText}>Rebuild from my latest scan</Text>
          </Pressable>
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
    height: 200,
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
  head: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  headSub: {
    marginTop: 6,
  },
  scroll: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  stepBlock: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CC.lineTrack,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: 38,
    height: 38,
  },
  stepText: {
    flex: 1,
    marginLeft: 14,
  },
  stepName: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: CC.ink,
    marginTop: 2,
  },
  swapBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: CC.bluePill,
  },
  swapBtnActive: {
    backgroundColor: CC.lineTrack,
  },
  swapText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 16,
    color: CC.blue,
  },
  swapTextActive: {
    color: CC.muted,
  },
  altList: {
    marginTop: 10,
    marginLeft: 66,
    gap: 8,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  altThumb: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altThumbImg: {
    width: 30,
    height: 30,
  },
  altText: {
    flex: 1,
    marginLeft: 12,
  },
  altBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.6,
    color: CC.muted,
  },
  altName: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 18,
    color: CC.ink,
    marginTop: 1,
  },
  altEmpty: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: CC.muted,
  },
  footer: {
    paddingTop: 14,
    gap: 8,
  },
  rebuildBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  rebuildText: {
    // Secondary escape hatch — neutral so the eye isn't pulled here over the
    // per-row Swap actions and the primary ink Done button.
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
