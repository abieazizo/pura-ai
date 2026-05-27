import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Body,
  Eyebrow,
  HeroHeadline,
  Meta,
  PrimaryAction,
  SecondaryAction,
  Supporting,
  Surface,
} from './primitives';
import { V26_SPACE } from './tokens';

interface TonightHeroProps {
  eyebrow: string;
  headline: string;
  support: string;
  meta: string;
  startLabel?: string;
  onStart: () => void;
  onWhyTap?: () => void;
}

/**
 * v26 — pre-start hero for the Today tab.
 *
 * The single dominant moment on screen. No expanded routine list, no
 * SPF card, no "Required" / "Recommended" pills. The user reads three
 * lines, sees one button, and starts.
 */
export function TonightHero({
  eyebrow,
  headline,
  support,
  meta,
  startLabel = 'Start routine',
  onStart,
  onWhyTap,
}: TonightHeroProps) {
  return (
    <Surface tone="surface" hero elevated style={s.hero}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <HeroHeadline style={s.headline}>{headline}</HeroHeadline>
      <Body style={s.support}>{support}</Body>
      <Meta style={s.meta}>{meta}</Meta>
      <PrimaryAction
        label={startLabel}
        variant="ink"
        onPress={onStart}
        style={s.cta}
      />
      <Supporting style={s.builtFrom}>Built from today’s scan</Supporting>
      {onWhyTap ? (
        <SecondaryAction
          label="Why this plan?"
          tone="muted"
          onPress={onWhyTap}
          style={s.why}
        />
      ) : null}
    </Surface>
  );
}

const s = StyleSheet.create({
  hero: {
    gap: 0,
  },
  headline: {
    marginTop: 14,
  },
  support: {
    marginTop: 12,
  },
  meta: {
    marginTop: 20,
  },
  cta: {
    marginTop: V26_SPACE.section,
  },
  builtFrom: {
    marginTop: 12,
    alignSelf: 'center',
  },
  why: {
    marginTop: 4,
    alignSelf: 'center',
  },
});
