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
import { Camera, useCameraPermissions } from 'expo-camera';
import {
  LockKey,
  Camera as CameraIcon,
  Info,
  X,
} from 'phosphor-react-native';
import {
  OnboardingScreenShellV2,
  FunctionalHeadline,
  BodyText,
  TrustRow,
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
        <View style={styles.head}>
          <FunctionalHeadline style={styles.headline}>
            We only analyze a clear scan.
          </FunctionalHeadline>
          <BodyText style={styles.lead}>
            Your full face needs to be visible in even light. If it isn’t
            clear, we’ll help you retake it.
          </BodyText>
        </View>

        <View style={styles.trustList}>
          <TrustRow
            Icon={LockKey}
            title="Private by design"
            body="Save your photo only if you choose to create an account."
          />
          <TrustRow
            Icon={CameraIcon}
            title="Quality checked first"
            body="Forehead, cheeks, and chin must be visible."
          />
          <TrustRow
            Icon={Info}
            title="Cosmetic guidance only"
            body="Pura does not diagnose skin conditions."
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
      <View style={styles.head}>
        <FunctionalHeadline style={styles.headline}>
          Camera access is off
        </FunctionalHeadline>
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
  head: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 28,
  },
  headline: {
    color: PURA.ink,
  },
  lead: {
    marginTop: 12,
    maxWidth: 380,
  },
  trustList: {
    paddingHorizontal: 24,
    gap: 18,
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
