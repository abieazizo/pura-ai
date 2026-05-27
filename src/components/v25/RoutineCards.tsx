import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Drop, Sun, Sparkle, CheckCircle, ShieldCheck } from 'phosphor-react-native';
import { Card, PrimaryButton, TextAction } from './Surfaces';
import { SemanticBadge } from './SemanticBadge';
import {
  BodyPrimary,
  BodyFunctional,
  CardHeadline,
  Metadata,
  SectionLabel,
} from './Typography';
import { T, TYPE, RADIUS, SPACE } from './tokens';
import { Text } from 'react-native';

/**
 * v25 — supporting routine cards.
 *
 *   • AvoidTonightCard      — terracotta-soft, summarizes guarded items.
 *   • MorningProtectionCard — amber-soft, separates tomorrow morning SPF.
 *   • RoutineCompletionCard — calm sage moment for the routine-complete state.
 */

// ---------------------------------------------------------------------------
// AvoidTonightCard
// ---------------------------------------------------------------------------

interface AvoidTonightProps {
  items: readonly string[];
  reason?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AvoidTonightCard({
  items,
  reason,
  collapsed,
  onToggle,
}: AvoidTonightProps) {
  return (
    <Card tone="clay" style={s.avoidCard}>
      <View style={s.avoidHead}>
        <SemanticBadge variant="avoid-tonight" label="Avoid tonight" />
      </View>
      <BodyPrimary style={s.avoidLead}>
        {reason ??
          'Because your chin area is active, keep these out of tonight’s routine:'}
      </BodyPrimary>
      {!collapsed ? (
        <View style={s.avoidList}>
          {items.map((item) => (
            <View key={item} style={s.avoidRow}>
              <View style={s.avoidDot} />
              <BodyFunctional style={s.avoidRowText}>{item}</BodyFunctional>
            </View>
          ))}
        </View>
      ) : null}
      {onToggle ? (
        <TextAction
          label={collapsed ? 'View details' : 'Hide details'}
          onPress={onToggle}
          variant="primary"
          style={{ marginTop: 4 }}
        />
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// MorningProtectionCard
// ---------------------------------------------------------------------------

interface MorningProtectionProps {
  /** When provided, renders the saved-product variant. */
  product?: { name: string; routineUsage?: string };
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
}

export function MorningProtectionCard({
  product,
  onPrimaryAction,
  onSecondaryAction,
}: MorningProtectionProps) {
  return (
    <Card tone="amber" style={s.morningCard}>
      <View style={s.morningHead}>
        <SectionLabel style={s.morningEyebrow}>TOMORROW MORNING</SectionLabel>
        <SemanticBadge variant="essential" />
      </View>
      <View style={s.morningTitleRow}>
        <Sun size={22} color={T.amber} weight="duotone" />
        <CardHeadline style={s.morningTitle}>SPF 30+</CardHeadline>
      </View>
      <BodyPrimary style={s.morningBody}>
        {product
          ? `${product.name} will be your morning step. Protect the progress you are making.`
          : 'Protect your progress. Daily SPF helps prevent dark marks from lingering after active breakouts.'}
      </BodyPrimary>
      {product ? (
        <View style={s.morningSavedRow}>
          <View style={s.morningSavedThumb}>
            <Text style={s.morningSavedInitial}>{product.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.morningSavedName} maxFontSizeMultiplier={1.2}>
              {product.name}
            </Text>
            <Text style={s.morningSavedMeta} maxFontSizeMultiplier={1.2}>
              {product.routineUsage ?? 'Apply before going out'}
            </Text>
          </View>
          <SemanticBadge variant="safe" />
        </View>
      ) : (
        <View style={s.morningActions}>
          <PrimaryButton
            label="Add SPF product"
            onPress={onPrimaryAction}
            variant="ink"
          />
          {onSecondaryAction ? (
            <TextAction
              label="Find an SPF match"
              onPress={onSecondaryAction}
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
            />
          ) : null}
        </View>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RoutineCompletionCard
// ---------------------------------------------------------------------------

interface CompletionProps {
  completedTitles: readonly string[];
  onReviewProgress: () => void;
}

export function RoutineCompletionCard({
  completedTitles,
  onReviewProgress,
}: CompletionProps) {
  return (
    <View style={s.completionWrap}>
      <Card tone="surface" hero elevated style={s.completionHero}>
        <View style={s.completionIconWrap}>
          <CheckCircle size={28} color={T.sage} weight="duotone" />
        </View>
        <SectionLabel style={s.completionEyebrow}>
          ROUTINE COMPLETE
        </SectionLabel>
        <Text style={s.completionTitle} maxFontSizeMultiplier={1.15}>
          {'You’re done\nfor tonight.'}
        </Text>
        <BodyPrimary style={s.completionBody}>
          Keeping your routine gentle tonight supports clearer, more reliable
          progress over your next scans.
        </BodyPrimary>

        <View style={s.morningInset}>
          <View style={s.morningInsetHead}>
            <Sun size={16} color={T.amber} weight="duotone" />
            <SectionLabel style={s.morningInsetEyebrow}>
              TOMORROW MORNING
            </SectionLabel>
          </View>
          <BodyFunctional style={s.morningInsetBody}>
            Apply SPF 30+ before going out. Protect the progress you are
            making.
          </BodyFunctional>
        </View>

        <PrimaryButton
          label="Review progress"
          onPress={onReviewProgress}
          variant="ink"
          style={{ marginTop: 16 }}
        />
      </Card>

      <Card tone="raised" style={s.completionStepList}>
        <SectionLabel style={s.completionStepLabel}>COMPLETED</SectionLabel>
        {completedTitles.map((t) => (
          <View key={t} style={s.completionStepRow}>
            <CheckCircle size={16} color={T.sage} weight="duotone" />
            <Text style={s.completionStepText} maxFontSizeMultiplier={1.2}>
              {t}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

// quiet helper imports
void Drop;
void Sparkle;
void ShieldCheck;
void Metadata;

const s = StyleSheet.create({
  avoidCard: {
    gap: 12,
  },
  avoidHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avoidLead: {
    color: T.inkSecondary,
    marginBottom: 4,
  },
  avoidList: { gap: 10 },
  avoidRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avoidDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.terracotta,
    marginTop: 8,
  },
  avoidRowText: {
    flex: 1,
    color: T.inkSecondary,
  },
  morningCard: {
    gap: 12,
  },
  morningHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  morningEyebrow: { color: T.amber, marginBottom: 0 },
  morningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  morningTitle: { color: T.ink },
  morningBody: { color: T.inkSecondary },
  morningActions: { marginTop: 6 },
  morningSavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surfaceRaised,
    borderRadius: RADIUS.inset,
    paddingHorizontal: SPACE.insetPad,
    paddingVertical: 12,
    marginTop: 6,
  },
  morningSavedThumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: T.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  morningSavedInitial: {
    fontFamily: TYPE.serif,
    fontSize: 18,
    color: T.amber,
  },
  morningSavedName: {
    fontFamily: TYPE.sansSemi,
    fontSize: 14,
    color: T.ink,
  },
  morningSavedMeta: {
    fontFamily: TYPE.sans,
    fontSize: 12.5,
    color: T.inkMuted,
    marginTop: 2,
  },
  completionWrap: {
    gap: 12,
  },
  completionHero: {
    alignItems: 'flex-start',
    paddingBottom: SPACE.heroPad,
  },
  completionIconWrap: {
    marginBottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.sageSoft,
  },
  completionEyebrow: { marginBottom: 10 },
  completionTitle: {
    fontFamily: TYPE.serif,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: T.ink,
  },
  completionBody: { marginTop: 12 },
  morningInset: {
    marginTop: 18,
    padding: SPACE.insetPad,
    borderRadius: RADIUS.inset,
    backgroundColor: T.amberSoft,
  },
  morningInsetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  morningInsetEyebrow: { color: T.amber, marginBottom: 0 },
  morningInsetBody: { color: T.amber },
  completionStepList: { gap: 10 },
  completionStepLabel: { marginBottom: 4 },
  completionStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completionStepText: {
    fontFamily: TYPE.sansSemi,
    fontSize: 14,
    color: T.ink,
  },
});
