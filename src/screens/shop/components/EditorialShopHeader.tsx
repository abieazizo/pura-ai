/**
 * EditorialShopHeader — pass 1.
 *
 * Editorial issue marker + wordmark + minimal action set. No cute
 * sparkle. No heart icon. The icons are Phosphor `Bookmark` (saved —
 * skincare's editorial save vocabulary) and `Tote` (your routine as a
 * curated bag, not a shopping cart).
 *
 * Issue number derives from the user's scan-day so the masthead feels
 * like a real recurring publication: "EDIT NO. 12" on day 12.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bookmark, BookmarkSimple, Tote } from 'phosphor-react-native';
import { puraShop, puraShopLayout, puraShopType } from '@/theme';
import { EDITOR_NORA } from '../curator';

export interface EditorialShopHeaderProps {
  /** Day number derived from the user's scan history. Drives "Edit No. ##". */
  issueNumber: number;
  /** "Calm + Repair", "Barrier Week", "Reset", etc. — the issue's theme. */
  issueTheme: string;
  /** First initial of the user's name; the issue is dedicated. */
  userInitial?: string | null;
  savedCount: number;
  bagCount: number;
  onPressSaved: () => void;
  onPressBag: () => void;
}

function formatDateStamp(): string {
  // Hand-set publication date: "FOR M., 28 MAY 26" form.
  const d = new Date();
  const day = d.getDate();
  const monthsShort = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const month = monthsShort[d.getMonth()];
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return `${day} ${month} ${yy}`;
}

export function EditorialShopHeader({
  issueNumber,
  issueTheme,
  userInitial,
  savedCount,
  bagCount,
  onPressSaved,
  onPressBag,
}: EditorialShopHeaderProps) {
  const issuePadded = String(issueNumber).padStart(2, '0');
  const dateStamp = formatDateStamp();
  return (
    <View style={styles.outer}>
      <View style={styles.metaRow}>
        <Text style={styles.editKicker} maxFontSizeMultiplier={1.05}>
          EDIT NO. {issuePadded}
        </Text>
        <View style={styles.rule} />
        <Text style={styles.editTheme} maxFontSizeMultiplier={1.1}>
          {issueTheme}
        </Text>
      </View>

      <View style={styles.titleRow}>
        <Text
          accessibilityRole="header"
          style={styles.title}
          maxFontSizeMultiplier={1.05}
        >
          The Edit
        </Text>

        <View style={styles.actions}>
          <IconCircle
            ariaLabel={savedCount > 0 ? `Saved (${savedCount})` : 'Saved items'}
            onPress={onPressSaved}
          >
            {savedCount > 0 ? (
              <Bookmark size={20} weight="fill" color={puraShop.coralDeep} />
            ) : (
              <BookmarkSimple size={20} weight="regular" color={puraShop.ink} />
            )}
          </IconCircle>
          <View style={{ width: 6 }} />
          <IconCircle
            ariaLabel={
              bagCount > 0
                ? `Your routine, ${bagCount} item${bagCount === 1 ? '' : 's'}`
                : 'Your routine'
            }
            onPress={onPressBag}
          >
            <Tote size={20} weight="regular" color={puraShop.ink} />
            {bagCount > 0 ? (
              <View style={styles.badge}>
                <Text
                  style={styles.badgeText}
                  maxFontSizeMultiplier={1.0}
                  allowFontScaling={false}
                >
                  {bagCount > 9 ? '9+' : String(bagCount)}
                </Text>
              </View>
            ) : null}
          </IconCircle>
        </View>
      </View>

      {/* Byline only — round-2 Pass 7 deleted the redundant credit
          line (Pura Shop · For M, 29 may 26 · Issue No. 19) because
          the EDIT NO + the Edited By byline already carry the issue
          identity + the editor. Three identifying lines became two. */}
      <View style={styles.creditRule} />
      <View style={styles.bylineRow}>
        <Text style={styles.bylineKicker} maxFontSizeMultiplier={1.05}>
          EDITED BY
        </Text>
        <Text style={styles.bylineName} maxFontSizeMultiplier={1.05}>
          {EDITOR_NORA.name}
        </Text>
        <Text style={styles.bylineRole} maxFontSizeMultiplier={1.1}>
          {EDITOR_NORA.role}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.bylineDate} maxFontSizeMultiplier={1.05}>
          {userInitial ? `for ${userInitial}, ${dateStamp.toLowerCase()}` : dateStamp.toLowerCase()}
        </Text>
      </View>
    </View>
  );
}

function IconCircle({
  onPress,
  ariaLabel,
  children,
}: {
  onPress: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && styles.iconBtnPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingTop: 4,
    paddingBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  editKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 2.4,
    color: puraShop.coralDeep,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.borderWarm,
  },
  editTheme: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    color: puraShop.inkSecondary,
    letterSpacing: 0.1,
  },
  titleRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    ...puraShopType.headerSerif,
    color: puraShop.ink,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBtnPressed: {
    backgroundColor: puraShop.coralSoft,
    transform: [{ scale: 0.96 }],
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: puraShop.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: puraShop.canvas,
  },
  badgeText: {
    color: puraShop.white,
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    lineHeight: 11,
  },
  dedication: {
    marginTop: 8,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    color: puraShop.inkMuted,
    letterSpacing: 0.1,
  },
  creditRule: {
    marginTop: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.borderWarm,
  },
  credit: {
    marginTop: 8,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 12.5,
    color: puraShop.inkMuted,
    letterSpacing: 0.1,
  },
  bylineRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  bylineKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.8,
    color: puraShop.inkMuted,
  },
  bylineName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: puraShop.ink,
    textTransform: 'uppercase',
  },
  bylineRole: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    color: puraShop.inkSecondary,
    letterSpacing: 0.1,
  },
  bylineDate: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 12,
    color: puraShop.inkMuted,
    letterSpacing: 0.1,
  },
});
