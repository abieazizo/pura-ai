import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  LockOpen,
  Bell,
  Crown,
  Check,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { OnboardingBackButton } from '@/components/onboarding/BackButton';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface PaywallProps {
  onStartTrial: () => void;
  onRestore: () => void;
  onBack: () => void;
}

type Plan = 'monthly' | 'yearly';

/**
 * Paywall (§3.13) — Cal-AI-style structure. Headline, timeline, PlanRow
 * with `7 DAYS FREE` tag floating over the yearly card, reassurance,
 * primary CTA, restore row, fine print, legal footer.
 *
 * IAP integration is stubbed — tapping CTA just sets `subscriptionStatus`
 * to 'trial' and advances. Stripe/StoreKit wire-up can land later without
 * touching this layout.
 */
export function Paywall({ onStartTrial, onRestore, onBack }: PaywallProps) {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>('yearly');
  const setSubscriptionStatus = useAppStore((s) => s.setSubscriptionStatus);

  const billingDate = useMemo(() => formatBillingDate(7), []);

  const handleStart = () => {
    hapt.select();
    // eslint-disable-next-line no-console
    console.log('[paywall] TODO: IAP integration — plan:', plan);
    setSubscriptionStatus('trial');
    onStartTrial();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.topBar, { paddingTop: 16 }]}>
        <OnboardingBackButton visible onPress={onBack} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          Start your 7-day free trial.
        </Text>

        <Timeline billingDate={billingDate} />

        <PlanRow plan={plan} onChange={setPlan} />

        <View style={styles.reassurance}>
          <Check size={16} color={palette.clay} weight="duotone" />
          <Text style={styles.reassuranceText}>No payment due now</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start my 7-day free trial"
          onPress={handleStart}
          style={({ pressed }) => [
            styles.cta,
            pressed && { opacity: 0.92 },
          ]}
        >
          <Text style={styles.ctaLabel}>Start my 7-day free trial.</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restore previous purchase"
          onPress={() => {
            hapt.select();
            // eslint-disable-next-line no-console
            console.log('[paywall] TODO: restore purchases');
            onRestore();
          }}
          hitSlop={6}
          style={styles.restoreWrap}
        >
          <Text style={styles.restore}>Already purchased?</Text>
        </Pressable>

        <Text style={styles.fine} maxFontSizeMultiplier={1.2}>
          7 days free, then $49.99 per year. Billed yearly. Plan auto-renews
          unless you cancel. Cancel in the App Store.
        </Text>

        <View style={styles.legalRow}>
          <LegalLink label="Terms" onPress={() => {}} />
          <Text style={styles.legalDot}> {'\u00B7'} </Text>
          <LegalLink label="Privacy" onPress={() => {}} />
          <Text style={styles.legalDot}> {'\u00B7'} </Text>
          <LegalLink label="Restore" onPress={onRestore} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Timeline ---

interface TimelineRow {
  TitleIcon: React.FC<PhosphorIconProps>;
  circleColor: string;
  iconColor: string;
  title: string;
  body: string;
}

function Timeline({ billingDate }: { billingDate: string }) {
  const rows: TimelineRow[] = [
    {
      TitleIcon: LockOpen,
      circleColor: palette.clay,
      iconColor: palette.bg,
      title: 'Today',
      body:
        'Unlock the full 84-day program — scans, routines, product matches.',
    },
    {
      TitleIcon: Bell,
      circleColor: 'rgba(198,93,72,0.6)', // clay @ 60%
      iconColor: palette.bg,
      title: 'In 5 days — Reminder',
      body: "I'll remind you before the trial ends so you can decide.",
    },
    {
      TitleIcon: Crown,
      circleColor: palette.ink,
      iconColor: palette.bg,
      title: 'In 7 days — Billing starts',
      body: `You'll be charged only if you stay. Calculated from ${billingDate}`,
    },
  ];

  return (
    <View style={timeline.wrap}>
      {/* The vertical gradient rail sits inside the rail column. */}
      <Svg
        width={2}
        height={200}
        style={timeline.rail}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="rail" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.clay} stopOpacity={1} />
            <Stop offset="1" stopColor={palette.clay} stopOpacity={0.2} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="2" height="200" fill="url(#rail)" />
      </Svg>

      {rows.map((r, i) => (
        <View key={i} style={timeline.row}>
          <View style={timeline.railSlot}>
            <View
              style={[
                timeline.circle,
                { backgroundColor: r.circleColor },
              ]}
            >
              <r.TitleIcon
                size={20}
                color={r.iconColor}
                weight="duotone"
              />
            </View>
          </View>
          <View style={timeline.textSlot}>
            <Text style={timeline.title}>{r.title}</Text>
            <Text style={timeline.body} maxFontSizeMultiplier={1.2}>
              {r.body}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// --- PlanRow ---

function PlanRow({
  plan,
  onChange,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
}) {
  const pick = (p: Plan) => {
    if (p === plan) return;
    hapt.select();
    onChange(p);
  };
  return (
    <View style={planRow.wrap}>
      <PlanCard
        label="Monthly"
        price="$14.99"
        per="/mo"
        selected={plan === 'monthly'}
        onPress={() => pick('monthly')}
      />
      <PlanCard
        label="Yearly"
        price="$49.99"
        per="/yr"
        selected={plan === 'yearly'}
        onPress={() => pick('yearly')}
        badge="7 DAYS FREE"
      />
    </View>
  );
}

function PlanCard({
  label,
  price,
  per,
  selected,
  onPress,
  badge,
}: {
  label: string;
  price: string;
  per: string;
  selected: boolean;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} plan, ${price}${per}${badge ? `, ${badge}` : ''}`}
      style={({ pressed }) => [
        planCard.base,
        selected ? planCard.selected : planCard.idle,
        pressed && { opacity: 0.96 },
      ]}
    >
      {badge ? (
        <View style={planCard.badgeWrap} pointerEvents="none">
          <View style={planCard.badgePill}>
            <Text style={planCard.badgeText}>{badge}</Text>
          </View>
        </View>
      ) : null}

      <View style={planCard.headRow}>
        <Text style={planCard.label}>{label}</Text>
      </View>

      <View style={planCard.priceRow}>
        <Text style={planCard.price}>{price}</Text>
        <Text style={planCard.per}>{per}</Text>
      </View>

      <View
        style={[
          planCard.radio,
          selected ? planCard.radioOn : planCard.radioOff,
        ]}
      >
        {selected ? (
          <Check size={14} color={palette.bg} weight="bold" />
        ) : null}
      </View>
    </Pressable>
  );
}

// --- Helpers ---

function LegalLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="link">
      <Text style={styles.legalLink}>{label}</Text>
    </Pressable>
  );
}

function formatBillingDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// --- Styles ---

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 40,
    lineHeight: 40 * 1.05,
    letterSpacing: -0.8,
    color: palette.ink,
    marginHorizontal: 24,
    marginTop: 16,
  },
  reassurance: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    marginTop: 24,
  },
  reassuranceText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  cta: {
    marginTop: 20,
    marginHorizontal: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: palette.bg,
  },
  restoreWrap: { alignSelf: 'center', marginTop: 16 },
  restore: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(26,22,20,0.6)',
    textDecorationLine: 'underline',
  },
  fine: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(26,22,20,0.5)',
    textAlign: 'center',
    marginHorizontal: 32,
    marginTop: 20,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  legalLink: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(26,22,20,0.5)',
  },
  legalDot: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(26,22,20,0.5)',
  },
});

const timeline = StyleSheet.create({
  wrap: {
    marginHorizontal: 24,
    marginTop: 40,
    position: 'relative',
  },
  rail: {
    position: 'absolute',
    top: 20,
    left: 19, // 48/2 − 2/2 (half of rail width)
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 100,
  },
  railSlot: {
    width: 48,
    alignItems: 'center',
    paddingTop: 0,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSlot: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 6,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: palette.ink,
    marginBottom: 4,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(26,22,20,0.7)',
  },
});

const planRow = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 40,
  },
});

const planCard = StyleSheet.create({
  base: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  idle: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(26,22,20,0.15)',
  },
  selected: {
    backgroundColor: 'rgba(212,165,116,0.6)', // sand @ 60%
    borderWidth: 2,
    borderColor: palette.clay,
  },
  // Centering wrapper — absolute row spanning the card's top edge so the
  // pill child can sit dead-center.
  badgeWrap: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // The actual pill — clay-filled, paper label, paddings wrap the Text.
  badgePill: {
    backgroundColor: palette.clay,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headRow: {},
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  price: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 24,
    color: palette.ink,
    letterSpacing: -0.5,
  },
  per: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(26,22,20,0.6)',
    marginLeft: 4,
    marginBottom: 3,
  },
  radio: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    backgroundColor: palette.clay,
    borderWidth: 0,
  },
  radioOff: {
    borderWidth: 1.5,
    borderColor: 'rgba(26,22,20,0.3)',
    backgroundColor: 'transparent',
  },
  badgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: palette.bg,
  },
});
