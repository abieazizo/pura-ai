import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Camera,
  ListChecks,
  ShoppingBag,
  ChartLineUp,
  Drop,
  Sun,
  CheckCircle,
} from 'phosphor-react-native';
import { OnboardingBackButton } from '@/components/onboarding/BackButton';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { FeatureUnlockList } from '@/components/onboarding/FeatureUnlockList';
import { TrialTimeline } from '@/components/onboarding/TrialTimeline';
import { PaywallPlanCard } from '@/components/onboarding/PaywallPlanCard';
import { useAppStore } from '@/store/useAppStore';
import { paywallPersonalSentence } from './labelMaps';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface PaywallProps {
  onStartTrial: () => void;
  onRestore: () => void;
  onBack: () => void;
}

type Plan = 'monthly' | 'yearly';

const YEARLY_PRICE = '$49.99';
const MONTHLY_PRICE = '$14.99';
const YEARLY_MONTHLY_EQUIV = '$4.17';

const FEATURES = [
  {
    Icon: Camera,
    title: 'Daily AI skin scans',
    body:
      'Track breakouts, texture, redness, dullness, and visible changes in under 30 seconds.',
  },
  {
    Icon: ListChecks,
    title: 'Adaptive AM/PM routine',
    body:
      'Know exactly what to do morning and night — with steps that adjust as your skin changes.',
  },
  {
    Icon: ShoppingBag,
    title: 'Product matches',
    body:
      'Find products that fit your skin type, goals, sensitivity, and routine style.',
  },
  {
    Icon: ChartLineUp,
    title: 'Progress timeline',
    body: 'Compare your skin over time and see what is actually improving.',
  },
  {
    Icon: Drop,
    title: 'Ingredient guidance',
    body:
      'Avoid harsh combinations and get smarter recommendations when your skin feels reactive.',
  },
  {
    Icon: Sun,
    title: 'SPF guidance',
    body: 'Adjust your sun protection habits around your lifestyle.',
  },
];

/**
 * v20.0 — Paywall.
 *
 * Rebuilt from "Start your 7-day free trial." into "Unlock your 84-day
 * skin plan." The headline now sells the transformation, not the
 * trial. Personalized card uses the user's actual goal · skin type ·
 * concerns to compose a single-sentence promise. Six feature unlocks,
 * three-row trial timeline, two plan cards (yearly default with BEST
 * VALUE pill), no-payment-today reassurance, CTA that names the plan,
 * restore + legal + terms/privacy footer.
 *
 * Safe area: header sits inside top inset, scroll content reserves
 * bottom inset + sticky CTA height, sticky CTA reserves bottom inset.
 * Headline never clips on iPhone SE / 13 mini / 15 Pro Max.
 */
export function Paywall({ onStartTrial, onRestore, onBack }: PaywallProps) {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>('yearly');
  const setSubscriptionStatus = useAppStore((s) => s.setSubscriptionStatus);
  const skinType = useAppStore((s) => s.skinType);
  const concerns = useAppStore((s) => s.concerns);
  const effort = useAppStore((s) => s.effort);
  const goal = useAppStore((s) => s.goal);

  const personalSentence = paywallPersonalSentence({
    effort,
    goal,
    skinType,
    concerns,
  });

  const handleStart = () => {
    hapt.select();
    // eslint-disable-next-line no-console
    console.log('[paywall] TODO: IAP integration — plan:', plan);
    setSubscriptionStatus('trial');
    onStartTrial();
  };

  const handleRestore = () => {
    hapt.select();
    // eslint-disable-next-line no-console
    console.log('[paywall] TODO: restore purchases');
    onRestore();
  };

  const ctaLabel =
    plan === 'yearly'
      ? 'Start my plan — free for 7 days'
      : 'Start monthly — free for 7 days';

  const ctaA11y =
    plan === 'yearly'
      ? `Start my free 7-day trial. ${YEARLY_PRICE} per year after trial unless canceled.`
      : `Start my free 7-day trial. ${MONTHLY_PRICE} per month after trial unless canceled.`;

  const legalCopy =
    plan === 'yearly'
      ? `7 days free, then ${YEARLY_PRICE} per year. Plan auto-renews unless canceled at least 24 hours before the trial ends. Cancel anytime in the App Store.`
      : `7 days free, then ${MONTHLY_PRICE} per month. Plan auto-renews unless canceled at least 24 hours before the trial ends. Cancel anytime in the App Store.`;

  // CTA + helper block height — used to keep the last scroll content
  // off the sticky CTA on small phones (iPhone SE: 568pt × 320pt).
  const stickyBlockHeight = 56 /* CTA */ + 64 /* restore + spacing */;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <OnboardingBackButton visible onPress={onBack} />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={handleRestore}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Restore previous purchase"
          style={({ pressed }) => [
            styles.topRestoreBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.topRestoreLabel}>Restore</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingBottom: stickyBlockHeight + insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroBlock}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            YOUR PLAN IS READY
          </Text>
          <Text
            style={styles.headline}
            maxFontSizeMultiplier={1.15}
            accessibilityRole="header"
          >
            Unlock your 84-day skin plan.
          </Text>
          <Text style={styles.sub} maxFontSizeMultiplier={1.25}>
            Pura adapts your routine as your skin changes — with daily scans,
            progress tracking, and product guidance built around your profile.
          </Text>
        </View>

        {/* Personalized card */}
        <View style={styles.personalCard}>
          <Text style={styles.personalKicker}>BUILT FOR YOU</Text>
          <Text
            style={styles.personalTitle}
            maxFontSizeMultiplier={1.15}
          >
            Clearer skin, without guessing.
          </Text>
          <Text
            style={styles.personalBody}
            maxFontSizeMultiplier={1.25}
          >
            {personalSentence}
          </Text>
        </View>

        {/* Feature unlocks */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.15}>
            What you unlock
          </Text>
        </View>
        <FeatureUnlockList items={FEATURES} />

        {/* Trial timeline */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.15}>
            How your free trial works
          </Text>
        </View>
        <TrialTimeline />

        {/* Plan selector */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.15}>
            Choose your plan
          </Text>
        </View>
        <View style={styles.planList}>
          <PaywallPlanCard
            selected={plan === 'yearly'}
            badge="BEST VALUE"
            planName="Yearly"
            price={`${YEARLY_PRICE} / year`}
            secondary={`${YEARLY_MONTHLY_EQUIV} / month`}
            savings="Save 72% vs monthly"
            accessibilityLabel={`Yearly plan${
              plan === 'yearly' ? ', selected' : ''
            }. ${YEARLY_PRICE} per year after 7-day free trial.`}
            onPress={() => setPlan('yearly')}
          />
          <PaywallPlanCard
            selected={plan === 'monthly'}
            planName="Monthly"
            price={`${MONTHLY_PRICE} / month`}
            secondary="Flexible monthly access"
            accessibilityLabel={`Monthly plan${
              plan === 'monthly' ? ', selected' : ''
            }. ${MONTHLY_PRICE} per month after 7-day free trial.`}
            onPress={() => setPlan('monthly')}
          />
        </View>

        {/* Legal */}
        <Text style={styles.fine} maxFontSizeMultiplier={1.25}>
          {legalCopy}
        </Text>

        <View style={styles.legalRow}>
          <LegalLink
            label="Terms"
            onPress={() =>
              Linking.openURL('https://pura.ai/terms').catch(() => {})
            }
          />
          <Text style={styles.legalDot}>{'·'}</Text>
          <LegalLink
            label="Privacy"
            onPress={() =>
              Linking.openURL('https://pura.ai/privacy').catch(() => {})
            }
          />
        </View>
      </ScrollView>

      {/* Sticky CTA stack */}
      <View
        style={[
          styles.stickyWrap,
          { paddingBottom: insets.bottom + 14 },
        ]}
      >
        <View style={styles.reassuranceRow}>
          <CheckCircle size={14} color={palette.moss} weight="duotone" />
          <Text style={styles.reassuranceText} maxFontSizeMultiplier={1.15}>
            No payment today  ·  We’ll remind you before billing starts.
          </Text>
        </View>
        <OnboardingPrimaryButton
          label={ctaLabel}
          onPress={handleStart}
        />
        <Pressable
          onPress={handleRestore}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Already purchased, restore"
          style={({ pressed }) => [
            styles.restoreWrap,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.restore}>Already purchased? Restore</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function LegalLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Text style={styles.legalLink}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topRestoreBtn: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  topRestoreLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkSecondary,
  },
  heroBlock: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.8,
    color: palette.clay,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.7,
    color: palette.ink,
    marginTop: 10,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSecondary,
    marginTop: 12,
  },
  personalCard: {
    marginHorizontal: 24,
    marginTop: 22,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.clayLight,
    backgroundColor: palette.clayPaper,
  },
  personalKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: palette.clay,
  },
  personalTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: palette.ink,
    marginTop: 8,
  },
  personalBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginTop: 8,
  },
  sectionBlock: {
    marginTop: 28,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  planList: {
    marginHorizontal: 24,
  },
  fine: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: palette.inkTertiary,
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 24,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  legalLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.inkSecondary,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
  },
  stickyWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    backgroundColor: palette.bg,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  reassuranceText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkSecondary,
    textAlign: 'center',
  },
  restoreWrap: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  restore: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: palette.inkTertiary,
    textDecorationLine: 'underline',
  },
});
