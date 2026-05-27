import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Sparkle,
  Shield,
  ShieldCheck,
  Question,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import {
  OnboardingScreenShellV2,
  FunctionalHeadline,
  BodyText,
  SelectCard,
  WarmInfoPanel,
  PURA,
} from '@/components/onboarding/v2';
import {
  useOnboardingV2,
  bridgeOnboardingToCanonical,
  type ProductReactivity,
} from '@/state/onboardingV2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';

export interface SafetyCalibrationV2Props {
  onNext: () => void;
}

const OPTIONS: ReadonlyArray<{
  value: ProductReactivity;
  label: string;
  helper: string;
  Icon: React.ComponentType<PhosphorIconProps>;
}> = [
  {
    value: 'often',
    label: 'Often',
    helper: 'Redness, burning, or breakouts happen easily',
    Icon: Sparkle,
  },
  {
    value: 'sometimes',
    label: 'Sometimes',
    helper: 'I occasionally react to new products',
    Icon: Shield,
  },
  {
    value: 'rarely',
    label: 'Rarely',
    helper: 'My skin usually tolerates products well',
    Icon: ShieldCheck,
  },
  {
    value: 'unsure',
    label: 'Not sure',
    helper: 'Start extra gently',
    Icon: Question,
  },
];

/**
 * v25 — Safety Calibration.
 *
 * Asked AFTER baseline reveal — the one high-safety question the scan
 * cannot reliably infer. The screen is warm-clay only and never claims
 * the reactivity signal was detected by the scan.
 */
export function SafetyCalibrationV2({ onNext }: SafetyCalibrationV2Props) {
  const productReactivity = useOnboardingV2((s) => s.productReactivity);
  const setProductReactivity = useOnboardingV2((s) => s.setProductReactivity);

  useEffect(() => {
    onboardingV2.safetyCalibrationViewed();
  }, []);

  const handleSelect = (value: ProductReactivity) => {
    setProductReactivity(value);
    bridgeOnboardingToCanonical();
    onboardingV2.safetyCalibrationSelected(value);
  };

  const consequence = useMemo(() => {
    if (productReactivity === 'often') {
      return 'Pura will begin gently and delay stronger treatment steps.';
    }
    if (productReactivity === 'unsure') {
      return 'Pura will start cautiously and adjust after future scans.';
    }
    return null;
  }, [productReactivity]);

  return (
    <OnboardingScreenShellV2
      topBar={{ showBack: true }}
      bottom={{
        primaryLabel: productReactivity ? 'Continue' : 'Choose one to continue',
        onPrimary: () => productReactivity && onNext(),
        primaryDisabled: !productReactivity,
        disabledReason: 'Choose one to continue',
      }}
    >
      <View style={styles.head}>
        <FunctionalHeadline style={styles.headline}>
          How easily does your skin react to new products?
        </FunctionalHeadline>
        <BodyText style={styles.lead}>
          This helps Pura avoid starting too aggressively.
        </BodyText>
      </View>
      <View style={styles.list}>
        {OPTIONS.map((opt) => (
          <SelectCard
            key={opt.value}
            label={opt.label}
            helper={opt.helper}
            Icon={opt.Icon}
            selected={productReactivity === opt.value}
            onSelect={() => handleSelect(opt.value)}
          />
        ))}
      </View>
      {consequence ? (
        <View style={styles.consequenceWrap}>
          <WarmInfoPanel tone="clay">{consequence}</WarmInfoPanel>
        </View>
      ) : null}
    </OnboardingScreenShellV2>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 24,
  },
  headline: { color: PURA.ink },
  lead: { marginTop: 12, maxWidth: 380 },
  list: {
    paddingHorizontal: 24,
    gap: 10,
  },
  consequenceWrap: {
    paddingHorizontal: 24,
    marginTop: 18,
  },
});
