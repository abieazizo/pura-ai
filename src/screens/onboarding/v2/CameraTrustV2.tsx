import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { X } from 'phosphor-react-native';
import Svg, { Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import {
  OnboardingScreenShellV2,
  BodyText,
  EditorialHeadline,
  PURA,
  PURA_FONT,
  PURA_RADIUS,
} from '@/components/onboarding/v2';
import {
  useOnboardingV2,
  type CameraPermissionStatus,
} from '@/state/onboardingV2';
import { useAppStore } from '@/store/useAppStore';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';

export interface CameraTrustV2Props {
  onPermissionGranted: () => void;
}

/**
 * v25 — Camera trust + permission.
 *
 * Critical product principles:
 *   • The OS permission prompt fires ONLY on the primary CTA — not on
 *     screen mount. The user must have read the trust rows first.
 *   • If permission is already granted (returning user), the CTA advances
 *     immediately on tap without re-prompting.
 *   • If denied, a recovery state explains how to enable access in
 *     Settings. The user can still tap "Not now" to back out of the flow.
 *   • "How scans are used" opens a calm, accessible modal — never a wall
 *     of legal text.
 */
export function CameraTrustV2({ onPermissionGranted }: CameraTrustV2Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const setCameraDeniedLegacy = useAppStore((s) => s.setCameraDenied);
  const setCameraPermissionStatus = useOnboardingV2(
    (s) => s.setCameraPermissionStatus
  );
  const [showHelp, setShowHelp] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    onboardingV2.viewCameraTrust();
  }, []);

  useEffect(() => {
    if (!permission) return;
    const status: CameraPermissionStatus = permission.granted
      ? 'granted'
      : permission.canAskAgain
      ? 'unknown'
      : 'denied';
    setCameraPermissionStatus(status);
    if (!permission.granted && !permission.canAskAgain) {
      setDenied(true);
    }
  }, [permission, setCameraPermissionStatus]);

  const handleRequest = useCallback(async () => {
    onboardingV2.cameraPermissionPrompted();
    setCameraPermissionStatus('requesting');

    if (permission?.granted) {
      onboardingV2.cameraPermissionAllowed();
      onPermissionGranted();
      return;
    }

    const result = await requestPermission();
    if (result.granted) {
      onboardingV2.cameraPermissionAllowed();
      setCameraPermissionStatus('granted');
      setCameraDeniedLegacy(false);
      onPermissionGranted();
    } else if (!result.canAskAgain) {
      onboardingV2.cameraPermissionDenied();
      setCameraPermissionStatus('denied');
      setCameraDeniedLegacy(true);
      setDenied(true);
    } else {
      // First-time "Don't allow" — user can be re-prompted; surface gentle
      // help inline.
      onboardingV2.cameraPermissionDenied();
      setCameraPermissionStatus('unknown');
      setDenied(true);
    }
  }, [
    onPermissionGranted,
    permission,
    requestPermission,
    setCameraDeniedLegacy,
    setCameraPermissionStatus,
  ]);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:').catch(() => {
        /* swallow — graceful no-op */
      });
    } else {
      Linking.openSettings?.().catch(() => {
        /* swallow */
      });
    }
  }, []);

  if (denied) {
    return (
      <DeniedRecovery
        onOpenSettings={openSettings}
        onNotNow={() => setDenied(false)}
      />
    );
  }

  return (
    <>
      <OnboardingScreenShellV2
        topBar={{ showBack: true }}
        bottom={{
          primaryLabel: 'Allow camera access',
          onPrimary: handleRequest,
          secondary: {
            label: 'How photos are handled',
            onPress: () => setShowHelp(true),
          },
        }}
      >
        <View style={styles.hero}>
          <FaceOvalSignature />
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.1}>
            BEFORE WE BEGIN
          </Text>
          <Text style={styles.headline} accessibilityRole="header" maxFontSizeMultiplier={1.15}>
            A clear scan, <Text style={styles.headlineItalic}>quietly</Text> read.
          </Text>
          <BodyText style={styles.lead}>
            Your full face in even light is all Pura needs. If it isn’t
            clear, we’ll guide you to retake it — never guess.
          </BodyText>
        </View>

        <View style={styles.trustList}>
          <TrustLine
            kicker="01"
            title="Private by design"
            body="Your photo stays on this device until you choose to save it."
          />
          <TrustLine
            kicker="02"
            title="Quality before reading"
            body="Forehead, cheeks, and chin must be visible. We check first."
          />
          <TrustLine
            kicker="03"
            title="Cosmetic guidance only"
            body="Pura coaches visible skin. It does not diagnose conditions."
            last
          />
        </View>
      </OnboardingScreenShellV2>

      <HowScansAreUsedSheet
        visible={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Signature face-oval — a warm soft halo with a hairline outline.
// Replaces the templated icon-grid; gives the screen a single hero moment.
// ---------------------------------------------------------------------------

function FaceOvalSignature() {
  return (
    <View style={signatureStyles.wrap} pointerEvents="none">
      <Svg width={196} height={244} viewBox="0 0 196 244">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="46%" r="58%">
            <Stop offset="0%" stopColor="#F4D8CC" stopOpacity={1} />
            <Stop offset="55%" stopColor="#F8E6DD" stopOpacity={0.85} />
            <Stop offset="100%" stopColor="#FAF7F4" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={98} cy={122} rx={86} ry={114} fill="url(#glow)" />
        <Ellipse
          cx={98}
          cy={122}
          rx={70}
          ry={96}
          stroke={PURA.terracotta}
          strokeOpacity={0.32}
          strokeWidth={1}
          strokeDasharray="2 5"
          fill="none"
        />
        <Ellipse
          cx={98}
          cy={122}
          rx={48}
          ry={68}
          stroke={PURA.terracotta}
          strokeOpacity={0.16}
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Trust line — typographic row separated by hairlines. Replaces TrustRow's
// circular icon avatars (templated) with an editorial numeral + title + body.
// ---------------------------------------------------------------------------

interface TrustLineProps {
  kicker: string;
  title: string;
  body: string;
  last?: boolean;
}

function TrustLine({ kicker, title, body, last }: TrustLineProps) {
  return (
    <View style={[trustStyles.row, !last && trustStyles.rowDivider]}>
      <Text style={trustStyles.kicker} maxFontSizeMultiplier={1.1}>
        {kicker}
      </Text>
      <View style={trustStyles.col}>
        <Text style={trustStyles.title} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        <Text style={trustStyles.body} maxFontSizeMultiplier={1.25}>
          {body}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Denied recovery
// ---------------------------------------------------------------------------

function DeniedRecovery({
  onOpenSettings,
  onNotNow,
}: {
  onOpenSettings: () => void;
  onNotNow: () => void;
}) {
  return (
    <OnboardingScreenShellV2
      topBar={{ showBack: false }}
      bottom={{
        primaryLabel: 'Open Settings',
        onPrimary: onOpenSettings,
        secondary: { label: 'Not now', onPress: onNotNow },
      }}
    >
      <View style={styles.hero}>
        <EditorialHeadline style={styles.headline}>
          Camera access is off
        </EditorialHeadline>
        <BodyText style={styles.lead}>
          Turn it on to take a private skin scan.
        </BodyText>
      </View>
    </OnboardingScreenShellV2>
  );
}

// ---------------------------------------------------------------------------
// "How scans are used" modal sheet
// ---------------------------------------------------------------------------

function HowScansAreUsedSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={sheetStyles.root}>
        <View style={sheetStyles.topRow}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            style={({ pressed }) => [
              sheetStyles.closeBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <X size={20} color={PURA.ink} weight="bold" />
          </Pressable>
        </View>
        <View style={sheetStyles.body}>
          <EditorialHeadline style={sheetStyles.headline}>
            Your scan, your choice.
          </EditorialHeadline>
          <Text style={sheetStyles.body1}>
            Pura processes your photo to build a gentle starter routine.
            Create an account to keep it for progress tracking.
          </Text>
          <View style={sheetStyles.row}>
            <Text style={sheetStyles.rowLabel}>What we analyze</Text>
            <Text style={sheetStyles.rowBody}>
              Visible appearance only — forehead, cheeks, chin. Pura does
              not diagnose medical conditions.
            </Text>
          </View>
          <View style={sheetStyles.row}>
            <Text style={sheetStyles.rowLabel}>Where the photo lives</Text>
            <Text style={sheetStyles.rowBody}>
              Without an account, the photo stays on this device for this
              session only. Unsaved photos are deleted after this session.
            </Text>
          </View>
          <View style={sheetStyles.row}>
            <Text style={sheetStyles.rowLabel}>If you create an account</Text>
            <Text style={sheetStyles.rowBody}>
              Pura keeps your baseline and future scans private to your
              account so you can track visible changes over time.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 28,
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 2.2,
    color: PURA.muted,
    marginBottom: 14,
    marginTop: -8,
  },
  headline: {
    fontFamily: PURA_FONT.serifSemi,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.0,
    color: PURA.ink,
    textAlign: 'center',
  },
  headlineItalic: {
    fontFamily: PURA_FONT.serifItalic,
    color: PURA.terracotta,
  },
  lead: {
    marginTop: 16,
    maxWidth: 320,
    textAlign: 'center',
    color: PURA.body,
  },
  trustList: {
    paddingHorizontal: 28,
    marginTop: 4,
  },
});

const signatureStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginBottom: -8,
  },
});

const trustStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
    paddingVertical: 18,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PURA.border,
  },
  kicker: {
    fontFamily: PURA_FONT.serifItalic,
    fontSize: 17,
    color: PURA.terracotta,
    width: 26,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  col: { flex: 1 },
  title: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 15.5,
    lineHeight: 20,
    color: PURA.ink,
    letterSpacing: -0.15,
  },
  body: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: PURA.body,
    marginTop: 4,
  },
});

const sheetStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PURA.paper,
  },
  topRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headline: {
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 14,
  },
  body1: {
    fontFamily: PURA_FONT.sans,
    fontSize: 15,
    lineHeight: 22,
    color: PURA.body,
    marginBottom: 18,
  },
  row: {
    marginBottom: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: PURA.border,
  },
  rowLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.ink,
    marginBottom: 6,
  },
  rowBody: {
    fontFamily: PURA_FONT.sans,
    fontSize: 14,
    lineHeight: 21,
    color: PURA.body,
  },
});

// Quiet PURA_RADIUS import warning since it's exported from the same barrel.
void PURA_RADIUS;
