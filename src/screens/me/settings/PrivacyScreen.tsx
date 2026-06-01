/**
 * PrivacyScreen — the honest trust center.
 *
 * Everything here is true to how Pura actually handles data. The lead
 * card states the deal plainly; the "What Pura stores" inventory says,
 * per item, whether it lives on the device or is sent to be analyzed;
 * and "How analysis works" discloses — rather than fakes a toggle for —
 * the fact that skin reading is cloud-powered. (A pretend "local-only"
 * switch would break scanning and lie to the user, so we don't ship one.)
 *
 * Every control under "Your data" performs a real, scoped action against
 * the store: export, delete scan history, clear assistant chat, reset the
 * skin profile, or erase everything. The four destructive ones funnel
 * through a single confirmation sheet so nothing fires by accident.
 */

import React, { useCallback, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { CaretRight, ShieldCheck } from 'phosphor-react-native';

import { puraShop, puraShopType, puraShopRadius } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { meSettings } from '@/copy/strings';
import { exportUserData } from '@/lib/exportUserData';

import { SettingsScaffold } from './SettingsScaffold';
import {
  ConfirmSheet,
  InfoSheet,
  OptionRow,
  SettingsCard,
  SettingsDivider,
  SettingsSection,
  StatusPill,
  Toast,
  useToast,
  type NoticeTone,
} from './SettingsKit';

const C = meSettings.privacy;
const A = C.actions;
const SAVED = meSettings.saved;

// "On this device" reads calm/neutral; anything that leaves the device to
// be analyzed reads as informative blue — never alarming amber.
const metaTone = (meta: string): NoticeTone =>
  meta.toLowerCase().includes('device') ? 'neutral' : 'info';

type StoreItem = { label: string; detail: string };
type Confirm = {
  title: string;
  body: string;
  cta: string;
  onConfirm: () => void;
} | null;

export function PrivacyScreen() {
  const { clearScanHistory, clearAssistantChat, resetSkinProfile, eraseAllData } =
    useAppStore(
      useShallow((s) => ({
        clearScanHistory: s.clearScanHistory,
        clearAssistantChat: s.clearAssistantChat,
        resetSkinProfile: s.resetSkinProfile,
        eraseAllData: s.eraseAllData,
      })),
    );

  const isWeb = Platform.OS === 'web';
  const [toast, showToast, hideToast] = useToast();
  const [activeStore, setActiveStore] = useState<StoreItem | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const onExport = useCallback(async () => {
    const ok = await exportUserData('all');
    showToast(ok ? C.exportedToast : C.exportUnavailable);
  }, [showToast]);

  return (
    <SettingsScaffold title={C.title} intro={C.intro}>
      <View style={styles.body}>
        {/* Plain-English summary of the deal. */}
        <SettingsCard style={styles.block}>
          <View style={styles.summaryRow}>
            <View style={styles.shield}>
              <ShieldCheck size={20} color={puraShop.oceanText} weight="fill" />
            </View>
            <Text style={styles.summaryText} maxFontSizeMultiplier={1.3}>
              {C.summary}
            </Text>
          </View>
        </SettingsCard>

        {/* What Pura stores — per-item: on device vs. sent to be analyzed. */}
        <SettingsSection title={C.storesTitle}>
          <SettingsCard padded={false} style={styles.listCard}>
            {C.stores.map((item, i) => (
              <View key={item.label}>
                {i > 0 ? <SettingsDivider /> : null}
                <OptionRow
                  label={item.label}
                  onPress={() =>
                    setActiveStore({ label: item.label, detail: item.detail })
                  }
                  trailing={
                    <View style={styles.trailing}>
                      <StatusPill label={item.meta} tone={metaTone(item.meta)} />
                      <CaretRight
                        size={16}
                        color={puraShop.inkFaint}
                        weight="bold"
                      />
                    </View>
                  }
                />
              </View>
            ))}
          </SettingsCard>
        </SettingsSection>

        {/* Honest cloud-AI disclosure — a statement, not a fake switch. */}
        <SettingsSection title={C.cloudTitle} footnote={C.cloudHonest}>
          <SettingsCard>
            <Text style={styles.cloudBody} maxFontSizeMultiplier={1.3}>
              {C.cloudBody}
            </Text>
          </SettingsCard>
        </SettingsSection>

        {/* Permissions — what each is for, plus the real OS deep link. */}
        <SettingsSection
          title={C.permissionsTitle}
          footnote={isWeb ? C.permissions.webNote : undefined}
        >
          <SettingsCard padded={false} style={styles.listCard}>
            <OptionRow
              label={C.permissions.camera.label}
              meta={C.permissions.camera.meta}
            />
            <SettingsDivider />
            <OptionRow
              label={C.permissions.photos.label}
              meta={C.permissions.photos.meta}
            />
            <SettingsDivider />
            <OptionRow
              label={C.permissions.notifications.label}
              meta={C.permissions.notifications.meta}
            />
            {!isWeb ? (
              <>
                <SettingsDivider />
                <OptionRow
                  label={C.permissions.manageCta}
                  onPress={openSettings}
                />
              </>
            ) : null}
          </SettingsCard>
        </SettingsSection>

        {/* Your data — every row performs a real, scoped action. */}
        <SettingsSection title={C.dataTitle}>
          <SettingsCard padded={false} style={styles.listCard}>
            <OptionRow
              label={A.exportLabel}
              meta={A.exportMeta}
              onPress={onExport}
            />
            <SettingsDivider />
            <OptionRow
              label={A.clearScansLabel}
              meta={A.clearScansMeta}
              tone="danger"
              showChevron={false}
              onPress={() =>
                setConfirm({
                  title: A.clearScansConfirmTitle,
                  body: A.clearScansConfirmBody,
                  cta: A.clearScansConfirmCta,
                  onConfirm: () => {
                    clearScanHistory();
                    showToast(SAVED.done);
                  },
                })
              }
            />
            <SettingsDivider />
            <OptionRow
              label={A.clearChatLabel}
              meta={A.clearChatMeta}
              tone="danger"
              showChevron={false}
              onPress={() =>
                setConfirm({
                  title: A.clearChatConfirmTitle,
                  body: A.clearChatConfirmBody,
                  cta: A.clearChatConfirmCta,
                  onConfirm: () => {
                    clearAssistantChat();
                    showToast(SAVED.done);
                  },
                })
              }
            />
            <SettingsDivider />
            <OptionRow
              label={A.resetProfileLabel}
              meta={A.resetProfileMeta}
              tone="danger"
              showChevron={false}
              onPress={() =>
                setConfirm({
                  title: A.resetProfileConfirmTitle,
                  body: A.resetProfileConfirmBody,
                  cta: A.resetProfileConfirmCta,
                  onConfirm: () => {
                    resetSkinProfile();
                    showToast(SAVED.done);
                  },
                })
              }
            />
            <SettingsDivider />
            <OptionRow
              label={A.eraseLabel}
              meta={A.eraseMeta}
              tone="danger"
              showChevron={false}
              onPress={() =>
                setConfirm({
                  title: A.eraseConfirmTitle,
                  body: A.eraseConfirmBody,
                  cta: A.eraseConfirmCta,
                  // Erasing resets the store to blank → the navigator drops
                  // back to onboarding, so this screen unmounts on its own.
                  onConfirm: eraseAllData,
                })
              }
            />
          </SettingsCard>
        </SettingsSection>
      </View>

      <InfoSheet
        visible={activeStore != null}
        title={activeStore?.label ?? ''}
        body={activeStore?.detail}
        onClose={() => setActiveStore(null)}
      />

      <ConfirmSheet
        visible={confirm != null}
        title={confirm?.title ?? ''}
        body={confirm?.body ?? ''}
        confirmLabel={confirm?.cta ?? ''}
        cancelLabel={C.cancel}
        destructive
        onConfirm={() => {
          const run = confirm?.onConfirm;
          setConfirm(null);
          run?.();
        }}
        onCancel={() => setConfirm(null)}
      />

      <Toast state={toast} onHide={hideToast} />
    </SettingsScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
  },
  block: {
    marginBottom: 26,
  },
  listCard: {
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  shield: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: puraShop.oceanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  summaryText: {
    ...puraShopType.sectionSub,
    flex: 1,
    color: puraShop.inkSecondary,
    fontSize: 14.5,
    lineHeight: 21,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cloudBody: {
    ...puraShopType.sectionSub,
    color: puraShop.inkSecondary,
    fontSize: 14.5,
    lineHeight: 21,
  },
});
