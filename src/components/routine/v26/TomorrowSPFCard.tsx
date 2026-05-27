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
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';
import {
  formatReminderTime,
  scheduleScanReminder,
  type ReminderTime,
} from '@/lib/routineReminder';

interface TomorrowSPFCardProps {
  onAddSpf: () => void;
  onFindSpf?: () => void;
  initialReminder?: ReminderTime;
}

/**
 * v26 — Tomorrow Morning module.
 *
 * Appears beneath the completion hero. Owned-product action is the
 * primary CTA; product discovery is secondary. Includes a quiet
 * "Set an 8:00 AM reminder" that wires to the local reminder helper
 * when permission is granted and falls back to UI confirmation only.
 */
export function TomorrowSPFCard({
  onAddSpf,
  onFindSpf,
  initialReminder = { hour: 8, minute: 0 },
}: TomorrowSPFCardProps) {
  const [reminder, setReminder] = useState<ReminderTime>(initialReminder);
  const [confirmed, setConfirmed] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const setReminderTap = async () => {
    hapt.tap();
    const ok = await scheduleScanReminder(reminder);
    setScheduled(ok);
    setConfirmed(true);
  };

  return (
    <Surface tone="surface" style={s.card}>
      <View style={s.titleRow}>
        <View style={s.iconRing}>
          <Sun size={16} color={V26.terracottaText} weight="duotone" />
        </View>
        <Eyebrow style={{ marginBottom: 0 }}>TOMORROW MORNING</Eyebrow>
      </View>
      <SectionHeading style={s.headline}>
        Protect the active area.
      </SectionHeading>
      <Body style={s.body}>
        SPF helps reduce the chance of post-breakout dark marks.
      </Body>

      <Text style={s.prompt} maxFontSizeMultiplier={1.15}>
        Already have an SPF?
      </Text>
      <PrimaryAction
        label="Add my SPF"
        variant="ink"
        onPress={onAddSpf}
        style={s.primary}
      />
      {onFindSpf ? (
        <QuietTextButton
          label="Need one? Find a gentle SPF"
          tone="muted"
          onPress={onFindSpf}
          style={s.secondary}
        />
      ) : null}

      <View style={s.reminder}>
        <View style={s.reminderRow}>
          <Bell size={16} color={V26.inkSecondary} weight="duotone" />
          <Text style={s.reminderLabel} maxFontSizeMultiplier={1.15}>
            Reminder time
          </Text>
          <ReminderTimeChip
            time={reminder}
            onCycle={(next) => {
              setReminder(next);
              setConfirmed(false);
              setScheduled(false);
            }}
          />
        </View>
        {confirmed ? (
          <View style={s.confirmedRow}>
            <View style={s.confirmedRing}>
              <Check size={11} color={V26.positive} weight="bold" />
            </View>
            <Text style={s.confirmedLabel} maxFontSizeMultiplier={1.2}>
              {scheduled
                ? `Reminder set for ${formatReminderTime(reminder)} tomorrow`
                : `Set ${formatReminderTime(reminder)} as your reminder time`}
            </Text>
          </View>
        ) : (
          <QuietTextButton
            label={`Set an ${formatReminderTime(reminder)} reminder`}
            tone="clay"
            onPress={setReminderTap}
            style={{ marginTop: 6 }}
          />
        )}
      </View>
    </Surface>
  );
}

function ReminderTimeChip({
  time,
  onCycle,
}: {
  time: ReminderTime;
  onCycle: (next: ReminderTime) => void;
}) {
  const cycle = () => {
    hapt.select();
    const TIMES: ReminderTime[] = [
      { hour: 7, minute: 0 },
      { hour: 7, minute: 30 },
      { hour: 8, minute: 0 },
      { hour: 8, minute: 30 },
      { hour: 9, minute: 0 },
    ];
    const idx = TIMES.findIndex(
      (t) => t.hour === time.hour && t.minute === time.minute,
    );
    const next = TIMES[(idx + 1) % TIMES.length];
    onCycle(next);
  };
  return (
    <View style={chipStyles.wrap}>
      <Text
        accessibilityRole="button"
        accessibilityLabel={`Reminder time, currently ${formatReminderTime(time)}, tap to change`}
        onPress={cycle}
        style={chipStyles.label}
        maxFontSizeMultiplier={1.15}
      >
        {formatReminderTime(time)}
      </Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: V26_RADIUS.pill,
    backgroundColor: V26.paper,
    borderWidth: 1,
    borderColor: V26.border,
  },
  label: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13,
    color: V26.ink,
    minWidth: 56,
    textAlign: 'center',
  },
});

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  titleRow: {
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
    fontSize: 22,
    lineHeight: 26,
  },
  body: {
    marginTop: 10,
  },
  prompt: {
    marginTop: 18,
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 12.5,
    color: V26.inkMuted,
    letterSpacing: 0.2,
  },
  primary: {
    marginTop: 10,
  },
  secondary: {
    marginTop: 10,
    alignSelf: 'center',
  },
  reminder: {
    marginTop: V26_SPACE.section,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: V26.border,
  },
  reminderRow: {
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
  confirmedRow: {
    marginTop: 12,
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
});
