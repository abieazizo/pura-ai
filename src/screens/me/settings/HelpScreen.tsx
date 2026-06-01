/**
 * HelpScreen — a small, honest FAQ.
 *
 * Tap-to-expand answers to the questions people actually ask. No fake
 * contact channel: the closing card says more support is coming rather
 * than dangling an email address that goes nowhere.
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretDown } from 'phosphor-react-native';

import { puraShop, puraShopType, puraShopRadius, puraShopLayout } from '@/theme';
import { hapt } from '@/utils/haptics';
import { meSettings } from '@/copy/strings';

import { SettingsScaffold } from './SettingsScaffold';

const C = meSettings.help;

export function HelpScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = useCallback((i: number) => {
    hapt.select();
    setOpenIndex((cur) => (cur === i ? null : i));
  }, []);

  return (
    <SettingsScaffold title={C.title} intro={C.intro}>
      <View style={styles.body}>
        <View style={styles.card}>
          {C.faqs.map((f, i) => {
            const isOpen = openIndex === i;
            const isLast = i === C.faqs.length - 1;
            return (
              <View
                key={f.q}
                style={[styles.item, !isLast && styles.itemDivider]}
              >
                <Pressable
                  onPress={() => toggle(i)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  style={({ pressed }) => [
                    styles.question,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.questionText} maxFontSizeMultiplier={1.2}>
                    {f.q}
                  </Text>
                  <CaretDown
                    size={15}
                    color={puraShop.inkSecondary}
                    weight="bold"
                    style={{
                      transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
                    }}
                  />
                </Pressable>
                {isOpen ? (
                  <Text style={styles.answerText} maxFontSizeMultiplier={1.3}>
                    {f.a}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.moreCard}>
          <Text style={styles.moreTitle} maxFontSizeMultiplier={1.2}>
            {C.moreTitle}
          </Text>
          <Text style={styles.moreBody} maxFontSizeMultiplier={1.3}>
            {C.moreBody}
          </Text>
        </View>
      </View>
    </SettingsScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
  },
  card: {
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.card,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: 18,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraShop.cardBorder,
  },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 17,
  },
  questionText: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: puraShop.ink,
    letterSpacing: -0.15,
  },
  answerText: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
    paddingBottom: 17,
    paddingRight: 8,
  },
  moreCard: {
    marginTop: 16,
    backgroundColor: puraShop.surfaceWarm,
    borderRadius: puraShopRadius.card,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    padding: 18,
  },
  moreTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: puraShop.ink,
    letterSpacing: -0.15,
    marginBottom: 6,
  },
  moreBody: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
  },
});
