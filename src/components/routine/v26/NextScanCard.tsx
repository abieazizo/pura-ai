import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bell, Check, Sun } from 'phosphor-react-native';
import {
  Body,
  Eyebrow,
  PrimaryAction,
  SectionHeading,
  Surface,
} from './primitives';
import { QuietTextButton } from './QuietTextButton';
import { hapt } from '@/utils/haptics';
import {
  formatReminderTime,
  scheduleScanReminder,
  type ReminderTime,
} from '@/lib/routineReminder';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';
import type { ScanReliabilityState } from '@/state/v26/routineSession';

interface NextScanCardProps {
  reliability: ScanReliabilityState;
  onScanTips?: () => void;
  initialReminder?: ReminderTime;
}

const PRESET_TIMES: ReminderTime[] = [
  { hour: 7, minute: 0 },
  { hour: 7, minute: 30 },
  { hour: 8, minute: 0 },
  { hour: 8, minute: 30 },
  { hour: 9, minute: 0 },
];

function milestoneCopy(completed: number, required: number): string {
  const remaining = Math.max(0, required - completed);
  if (remaining === 0) return 'Your first trend is ready to view';
  if (remaining === 1) return 'One scan closer to your first trend';
  return `${remaining} scans closer to your first trend`;
}

/**
 * v26 — Next Scan Card.
 *
 * Ends Progress with a return-tomorrow CTA, not a generic reminder
 * task. Reminder time selector lives inside the card; the primary
 * CTA confirms scheduling (or falls back to UI state) and shows a
 * persistent confirmation row.
 */
export function NextScanCard({
  reliability,
  onScanTips,
  initialReminder = { hour: 8, minute: 0 },
}: NextScanCardProps) {
  const [reminder, setReminder] = useState<ReminderTime>(initialReminder);
  const [confirmed, setConfirmed] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const setReminderTap = async () => {
    hapt.tap();
    const ok = await scheduleScanReminder(reminder);
    setScheduled(ok);
    setConfirmed(true);
  };

  const cycleTime = () => {
    hapt.select();
    const idx = PRESET_TIMES.findIndex(
      (t) => t.hour === reminder.hour && t.minute === reminder.minute,
    );
    const next = PRESET_TIMES[(idx + 1) % PRESET_TIMES.length];
    setReminder(next);
    setConfirmed(false);
    setScheduled(false);
  };

  return (
    <Surface tone="surface" style={s.card}>
      <View style={s.eyebrowRow}>
        <View style={s.iconRing}>
          <Sun size={16} color={V26.terracottaText} weight="duotone" />
        </View>
        <Eyebrow style={{ marginBottom: 0 }}>NEXT SCAN</Eyebrow>
      </View>
      <SectionHeading style={s.headline}>Tomorrow morning</SectionHeading>
      <Body style={s.body}>
        Repeat similar lighting for your most trustworthy comparison.
      </Body>

      <View style={s.milestone}>
        <Eyebrow style={{ color: V26.inkMuted }}>TREND PROGRESS</Eyebrow>
        <Text style={s.milestoneText} maxFontSizeMultiplier={1.15}>
          {milestoneCopy(
            reliability.reliableScanCount,
            reliability.requiredForBaseline,
          )}
        </Text>
      </View>

      <View style={s.reminderRow}>
        <Bell size={16} color={V26.inkSecondary} weight="duotone" />
        <Text style={s.reminderLabel} maxFontSizeMultiplier={1.15}>
          Reminder time
        </Text>
        <Text
          accessibilityRole="button"
          accessibilityLabel={`Reminder time ${formatReminderTime(reminder)}, tap to change`}
          onPress={cycleTime}
          style={s.timeChip}
          maxFontSizeMultiplier={1.15}
        >
          {formatReminderTime(reminder)}
        </Text>
      </View>

      <PrimaryAction
        label="Remind me tomorrow morning"
        variant="ink"
        onPress={setReminderTap}
        style={s.primary}
      />

      {confirmed ? (
        <View style={s.confirmedRow}>
          <View style={s.confirmedRing}>
            <Check size={11} color={V26.positive} weight="bold" />
          </View>
          <Text style={s.confirmedLabel} maxFontSizeMultiplier={1.2}>
            {scheduled
              ? `Reminder set for ${formatReminderTime(reminder)} tomorrow`
              : `Reminder time set to ${formatReminderTime(reminder)}`}
          </Text>
        </View>
      ) : null}

      {onScanTips ? (
        <QuietTextButton
          label="Scan tips"
          tone="muted"
          onPress={onScanTips}
          style={s.secondary}
        />
      ) : null}
    </Surface>
  );
}

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: V26.clayMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 24,
    lineHeight: 28,
  },
  body: {
    marginTop: 10,
  },
  milestone: {
    marginTop: 18,
    padding: 14,
    borderRadius: V26_RADIUS.inset,
    backgroundColor: V26.warmScan,
    gap: 6,
  },
  milestoneText: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14.5,
    color: V26.ink,
  },
  reminderRow: {
    marginTop: V26_SPACE.section,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderLabel: {
    flex: 1,
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14.5,
    color: V26.ink,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: V26_RADIUS.pill,
    backgroundColor: V26.paper,
    borderWidth: 1,
    borderColor: V26.border,
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13.5,
    color: V26.ink,
    minWidth: 88,
    textAlign: 'center',
    overflow: 'hidden',
  },
  primary: {
    marginTop: 18,
  },
  confirmedRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmedRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: V26.positiveWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedLabel: {
    flex: 1,
    fontFamily: V26_TYPE.sansMed,
    fontSize: 13.5,
    color: V26.positive,
  },
  secondary: {
    marginTop: 14,
    alignSelf: 'center',
  },
});
