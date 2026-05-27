import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  CheckCircle,
  Drop,
  MagnifyingGlass,
  Plus,
  Sun,
  Sparkle,
  ShieldCheck,
} from 'phosphor-react-native';
import { Card, PrimaryButton, TextAction } from './Surfaces';
import { SemanticBadge, type BadgeVariant } from './SemanticBadge';
import {
  SectionLabel,
  CardHeadline,
  BodyPrimary,
  BodyFunctional,
  Metadata,
} from './Typography';
import { T, TYPE, RADIUS, SPACE } from './tokens';
import { hapt } from '@/utils/haptics';
import type {
  ProductCategoryV25,
  ProductCompatibility,
  SavedProductV25,
} from '@/state/v25/types';

/**
 * v25 — Product primitives.
 *
 *   • ProductSetupHero    — empty / partial cabinet hero.
 *   • ProductPriorityCard — vertical essentials priority cards.
 *   • SavedProductCard    — populated cabinet entries.
 *   • ProductDetailHero   — product detail page hero.
 *   • ProductCompatibilityCard — safe-conflict explanation block.
 */

// ---------------------------------------------------------------------------
// ProductSetupHero
// ---------------------------------------------------------------------------

export interface ProductSetupHeroProps {
  variant: 'empty' | 'partial';
  totalAdded?: number;
  attentionMessage?: string;
  onScanLabel: () => void;
  onSearch: () => void;
  onAddManually: () => void;
}

export function ProductSetupHero({
  variant,
  totalAdded = 0,
  attentionMessage,
  onScanLabel,
  onSearch,
  onAddManually,
}: ProductSetupHeroProps) {
  return (
    <Card tone="surface" hero elevated style={s.heroCard}>
      <SectionLabel style={s.heroEyebrow}>YOUR PRODUCTS</SectionLabel>
      {variant === 'empty' ? (
        <>
          <Text style={s.heroHeadline} maxFontSizeMultiplier={1.15}>
            {'Build a safer routine\nfrom what you own'}
          </Text>
          <BodyPrimary style={s.heroBody}>
            Add products once. Pura will place them into your routine, check
            for ingredient conflicts, and avoid recommending things you do not
            need.
          </BodyPrimary>
        </>
      ) : (
        <>
          <Text style={s.heroHeadline} maxFontSizeMultiplier={1.15}>
            {`${totalAdded} products added`}
          </Text>
          {attentionMessage ? (
            <View style={s.partialNotice}>
              <SemanticBadge variant="focus" />
              <BodyPrimary style={s.partialText}>
                {attentionMessage}
              </BodyPrimary>
            </View>
          ) : null}
        </>
      )}

      <PrimaryButton
        label="Scan product label"
        onPress={onScanLabel}
        variant="terracotta"
        LeftIcon={Camera}
        style={{ marginTop: 18 }}
      />
      <View style={s.secondaryRow}>
        <SecondaryAction Icon={MagnifyingGlass} label="Search by name" onPress={onSearch} />
        <SecondaryAction Icon={Plus} label="Add manually" onPress={onAddManually} />
      </View>
      <View style={s.trustRow}>
        <ShieldCheck size={13} color={T.inkMuted} weight="duotone" />
        <Metadata>Owned products are prioritized first.</Metadata>
      </View>
    </Card>
  );
}

function SecondaryAction({
  Icon,
  label,
  onPress,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'duotone' | 'bold' }>;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        hapt.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.secondaryBtn,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Icon size={16} color={T.ink} weight="duotone" />
      <Text style={s.secondaryLabel} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ProductPriorityCard
// ---------------------------------------------------------------------------

export type EssentialPriority =
  | 'highest'
  | 'recommended'
  | 'optional-today'
  | 'optional';

interface ProductPriorityCardProps {
  category: ProductCategoryV25;
  priority: EssentialPriority;
  body: string;
  onAdd: () => void;
}

const PRIORITY_BADGE: Record<EssentialPriority, { variant: BadgeVariant; label: string }> = {
  highest:           { variant: 'essential',       label: 'Highest priority' },
  recommended:       { variant: 'recommended',     label: 'Recommended' },
  'optional-today':  { variant: 'optional',        label: 'Optional today' },
  optional:          { variant: 'optional',        label: 'Optional' },
};

const ESSENTIAL_ICONS: Record<ProductCategoryV25, React.ComponentType<{ size?: number; color?: string; weight?: 'duotone' | 'bold' }>> = {
  SPF: Sun,
  Moisturizer: Drop,
  Cleanser: Drop,
  'Hydration serum': Sparkle,
  Treatment: Sparkle,
};

export function ProductPriorityCard({
  category,
  priority,
  body,
  onAdd,
}: ProductPriorityCardProps) {
  const Icon = ESSENTIAL_ICONS[category];
  const badge = PRIORITY_BADGE[priority];
  const ctaLabel =
    category === 'SPF'
      ? 'Add SPF'
      : category === 'Moisturizer'
      ? 'Add moisturizer'
      : category === 'Cleanser'
      ? 'Add cleanser'
      : category === 'Hydration serum'
      ? 'Add hydration product'
      : 'Add product';
  return (
    <Card
      tone={priority === 'highest' ? 'amber' : 'raised'}
      style={s.priorityCard}
    >
      <View style={s.priorityHead}>
        <View style={s.priorityIcon}>
          <Icon
            size={18}
            color={priority === 'highest' ? T.amber : T.ink}
            weight="duotone"
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.priorityTitleRow}>
            <Text style={s.priorityTitle} maxFontSizeMultiplier={1.2}>
              {category}
            </Text>
            <SemanticBadge variant={badge.variant} label={badge.label} />
          </View>
        </View>
      </View>
      <BodyFunctional style={s.priorityBody}>{body}</BodyFunctional>
      <View style={{ marginTop: 14 }}>
        <PrimaryButton
          label={ctaLabel}
          onPress={onAdd}
          variant={priority === 'highest' ? 'ink' : 'tonal'}
          LeftIcon={Plus}
          full
        />
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SavedProductCard
// ---------------------------------------------------------------------------

interface SavedProductCardProps {
  product: SavedProductV25;
  onView: () => void;
}

export function SavedProductCard({ product, onView }: SavedProductCardProps) {
  const compatibilityVariant: BadgeVariant =
    product.compatibility === 'safe'
      ? 'safe'
      : product.compatibility === 'paused-tonight'
      ? 'paused-tonight'
      : product.compatibility === 'avoid-now'
      ? 'avoid-now'
      : 'review-needed';
  return (
    <Pressable
      onPress={() => {
        hapt.select();
        onView();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${product.category}, ${product.compatibility}`}
      style={({ pressed }) => [
        s.savedWrap,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={s.savedThumb}>
        <Text style={s.savedInitial} maxFontSizeMultiplier={1.2}>
          {product.name.charAt(0)}
        </Text>
      </View>
      <View style={s.savedBody}>
        <Text style={s.savedName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {product.name}
        </Text>
        <Text style={s.savedMeta} maxFontSizeMultiplier={1.25}>
          {product.category} · {product.routineUsage ?? '—'}
        </Text>
        <SemanticBadge variant={compatibilityVariant} style={{ marginTop: 8 }} />
      </View>
      <TextAction label="View" onPress={onView} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ProductDetailHero
// ---------------------------------------------------------------------------

interface ProductDetailHeroProps {
  product: SavedProductV25;
}

export function ProductDetailHero({ product }: ProductDetailHeroProps) {
  const variant: BadgeVariant =
    product.compatibility === 'safe'
      ? 'safe'
      : product.compatibility === 'paused-tonight'
      ? 'paused-tonight'
      : product.compatibility === 'avoid-now'
      ? 'avoid-now'
      : 'review-needed';
  return (
    <Card tone="surface" hero elevated style={s.detailHero}>
      <View style={s.detailHeroTop}>
        <View style={s.detailThumb}>
          <Text style={s.detailInitial} maxFontSizeMultiplier={1.2}>
            {product.name.charAt(0)}
          </Text>
        </View>
        <SemanticBadge variant={variant} />
      </View>
      <CardHeadline style={s.detailName}>{product.name}</CardHeadline>
      <Metadata style={s.detailCategory}>{product.category}</Metadata>
      <Text style={s.detailUsage} maxFontSizeMultiplier={1.2}>
        {product.routineUsage ?? '—'}
      </Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ProductCompatibilityCard
// ---------------------------------------------------------------------------

interface ProductCompatibilityCardProps {
  compatibility: ProductCompatibility;
  notes: readonly string[];
}

export function ProductCompatibilityCard({
  compatibility,
  notes,
}: ProductCompatibilityCardProps) {
  return (
    <Card tone="raised" style={s.compatCard}>
      <SectionLabel style={{ marginBottom: 10 }}>COMPATIBILITY</SectionLabel>
      {notes.map((n) => (
        <View key={n} style={s.compatRow}>
          {compatibility === 'avoid-now' ? (
            <View style={s.compatCross} />
          ) : (
            <CheckCircle size={16} color={T.sage} weight="duotone" />
          )}
          <BodyFunctional style={s.compatRowText}>{n}</BodyFunctional>
        </View>
      ))}
    </Card>
  );
}

const s = StyleSheet.create({
  heroCard: {
    gap: 6,
  },
  heroEyebrow: { marginBottom: 8 },
  heroHeadline: {
    fontFamily: TYPE.serif,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: T.ink,
  },
  heroBody: { color: T.inkSecondary, marginTop: 10 },
  partialNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  partialText: { color: T.inkSecondary, flex: 1 },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: RADIUS.pill,
    backgroundColor: T.surfaceRaised,
    borderWidth: 1,
    borderColor: T.lineStrong,
  },
  secondaryLabel: {
    fontFamily: TYPE.sansSemi,
    fontSize: 14,
    color: T.ink,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  priorityCard: {
    gap: 0,
  },
  priorityHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  priorityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.surfaceRaised,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priorityTitle: {
    fontFamily: TYPE.serif,
    fontSize: 19,
    lineHeight: 24,
    color: T.ink,
  },
  priorityBody: { color: T.inkSecondary, marginTop: 2 },
  savedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: T.surfaceRaised,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: T.line,
    paddingHorizontal: SPACE.cardPad,
    paddingVertical: 14,
  },
  savedThumb: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.small,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedInitial: {
    fontFamily: TYPE.serif,
    fontSize: 20,
    color: T.ink,
  },
  savedBody: { flex: 1 },
  savedName: {
    fontFamily: TYPE.sansSemi,
    fontSize: 14.5,
    color: T.ink,
  },
  savedMeta: {
    fontFamily: TYPE.sans,
    fontSize: 12.5,
    color: T.inkMuted,
    marginTop: 4,
  },
  detailHero: {
    gap: 8,
  },
  detailHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInitial: {
    fontFamily: TYPE.serif,
    fontSize: 28,
    color: T.ink,
  },
  detailName: { color: T.ink },
  detailCategory: { marginTop: 2 },
  detailUsage: {
    fontFamily: TYPE.sansSemi,
    fontSize: 13,
    color: T.terracottaDeep,
    marginTop: 4,
  },
  compatCard: { gap: 0 },
  compatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  compatCross: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: T.terracottaDeep,
  },
  compatRowText: {
    flex: 1,
    color: T.inkSecondary,
  },
});
