import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import {
  User as UserIcon,
  Bell,
  Lock,
  Moon,
  Question,
  Info,
  CaretRight,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { GrainOverlay } from '@/components/GrainOverlay';
import { PillBadge } from '@/components/PillBadge';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { colors, palette, radius, space, type as typography } from '@/theme';
import { profileSheet } from '@/copy/strings';
import { hapt } from '@/utils/haptics';

export function ProfileSheet() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const user = useAppStore((s) => s.user);
  const devLoadPopulated = useAppStore((s) => s.devLoadPopulated);
  const devResetToNewUser = useAppStore((s) => s.devResetToNewUser);
  const devWipeAll = useAppStore((s) => s.devWipeAll);

  const snapPoints = useMemo(() => ['90%'], []);
  const close = useCallback(() => sheetRef.current?.close(), []);

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) nav.goBack();
    },
    [nav]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.55}
      />
    ),
    []
  );

  if (!user) return null;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={handleChange}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.grabber}
      >
        <BottomSheetScrollView
          // §2.8 — ensure "Wipe all data" / Sign out are never clipped.
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero top block with grain overlay */}
          <View style={styles.topBlock}>
            <GrainOverlay opacity={0.05} />
            <View style={styles.markWrap}>
              <PuraMark variant="idle" size="md" />
            </View>
            <Text style={styles.userName} maxFontSizeMultiplier={1.15}>
              {user.name}
            </Text>
            <Text style={styles.userMeta}>
              {profileSheet.memberSince(
                format(parseISO(user.joinedAt), 'MMM yyyy')
              )}
            </Text>
          </View>

          <View style={styles.rows}>
            <Row Icon={UserIcon} label={profileSheet.rows.skinProfile} />
            <Row Icon={Bell} label={profileSheet.rows.notifications} />
            <Row
              Icon={Lock}
              label={profileSheet.rows.privacy}
              right={
                <PillBadge
                  label={profileSheet.privacyBadge}
                  tone="calm"
                  size="sm"
                />
              }
            />
            <Row Icon={Moon} label={profileSheet.rows.appearance} />
            <Row Icon={Question} label={profileSheet.rows.help} />
            <Row Icon={Info} label={profileSheet.rows.about} />
          </View>

          {__DEV__ ? (
            <View style={styles.devBlock}>
              <Text style={styles.devLabel}>DEV TOOLS</Text>
              <PrimaryButton
                label={profileSheet.devTogglePopulated}
                variant="outlined"
                size="md"
                onPress={() => {
                  hapt.tap();
                  devLoadPopulated();
                  close();
                }}
              />
              <PrimaryButton
                label={profileSheet.devToggleNewUser}
                variant="outlined"
                size="md"
                onPress={() => {
                  hapt.tap();
                  devResetToNewUser();
                  close();
                }}
              />
              <PrimaryButton
                label={profileSheet.devResetAll}
                variant="destructive"
                size="md"
                onPress={() => {
                  hapt.warning();
                  devWipeAll();
                  close();
                }}
              />
            </View>
          ) : null}

          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={profileSheet.signOut}
            style={styles.signOutRow}
          >
            <Text style={styles.signOutText}>{profileSheet.signOut}</Text>
          </Pressable>

          <SafeAreaView edges={['bottom']} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

function Row({
  Icon,
  label,
  right,
  onPress,
}: {
  Icon: React.FC<PhosphorIconProps>;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.rowItem,
        pressed && { backgroundColor: palette.bgDeep },
      ]}
    >
      <View style={styles.rowIcon}>
        <Icon size={18} color={palette.inkSecondary} weight="duotone" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {right ? <View style={{ marginRight: space.sm }}>{right}</View> : null}
        <CaretRight size={16} color={palette.inkTertiary} weight="regular" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sheetBg: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.hairline,
  },
  scroll: {
    paddingBottom: space.xl,
  },

  topBlock: {
    position: 'relative',
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    backgroundColor: palette.bgDeep,
    marginBottom: space.md,
  },
  markWrap: { marginBottom: space.lg },
  userName: {
    ...typography.titleSerif,
    color: palette.ink,
  },
  userMeta: {
    ...typography.italicLead,
    fontSize: 16,
    color: palette.inkSecondary,
    marginTop: 4,
  },

  rows: {
    marginTop: space.sm,
    paddingHorizontal: space.lg,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
  },
  rowIcon: { width: 36 },
  rowLabel: {
    ...typography.body,
    color: palette.ink,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  devBlock: {
    marginTop: space.xl,
    marginHorizontal: space.lg,
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.warningLight,
  },
  devLabel: {
    ...typography.micro,
    color: palette.warningDark,
  },

  signOutRow: {
    marginTop: space.xxl,
    marginBottom: space.xl,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  signOutText: {
    ...typography.italicLead,
    color: palette.inkTertiary,
  },
});
