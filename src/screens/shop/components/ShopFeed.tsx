/**
 * ShopFeed — the assembled Pura Shop home (Step 5/12).
 *
 * This is where the rebuilt shop stops being a pile of components and becomes
 * the consultant feed. It composes, in one vertical scroll over a LIVING
 * backdrop that shifts to the current card's routine pillar:
 *
 *   pre-scan (STATE A):
 *     FeedHeader (invitation) → PreScanGate (teaser + scan) → escape hatches
 *
 *   post-scan (STATE B):
 *     FeedHeader (acknowledgment + freshness + re-scan)
 *       → ConcernsTonight ("what I saw")
 *       → CardStack (the swipeable edit — the centerpiece)
 *       → SavedShelf
 *       → escape hatches
 *
 * It renders EXCLUSIVELY from the `ShopHomeModel` it's handed and routes every
 * action out through props — it touches no store and no navigator itself, so
 * it drops cleanly into the real screen OR the dev gallery. The swipe deck's
 * horizontal pan and the page's vertical scroll are arbitrated by
 * react-native-gesture-handler (the deck only claims horizontal drags), so the
 * centerpiece lives comfortably inside the scroll.
 */

import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { dsAmbient, puraShopHome } from '@/theme';
import type { ShopHomeModel } from '../shopStackModel';
import { CardStack, type CardStackHandle } from './CardStack';
import { FeedHeader } from './FeedHeader';
import { ConcernsTonight } from './ConcernsTonight';
import { SavedShelf } from './SavedShelf';
import { PreScanGate } from './PreScanGate';
import { FeedEscapeHatches } from './FeedEscapeHatches';

export interface ShopFeedProps {
  model: ShopHomeModel;
  onPressProduct: (productId: string) => void;
  onToggleSave: (productId: string) => void;
  onAdd: (productId: string) => void;
  /** Scan / re-scan / pre-scan invitation — all route to the scan flow. */
  onScan: () => void;
  onBrowseAll: () => void;
  onBrowseConcern: () => void;
  onPressConcern?: (key: string) => void;
  /** Safe-area + dock clearance the screen supplies. */
  topInset?: number;
  bottomInset?: number;
}

export function ShopFeed({
  model,
  onPressProduct,
  onToggleSave,
  onAdd,
  onScan,
  onBrowseAll,
  onBrowseConcern,
  onPressConcern,
  topInset = 0,
  bottomInset = 48,
}: ShopFeedProps) {
  const stackRef = useRef<CardStackHandle>(null);
  const [topIdx, setTopIdx] = useState(0);

  const isPost = model.state === 'post-scan';

  // Living backdrop — melts toward the top card's pillar as the deck advances;
  // a calm porcelain wash pre-scan (no pillar to belong to yet).
  const activeTheme = isPost ? model.cards[topIdx]?.pillarTheme ?? null : null;
  const corners =
    activeTheme?.corners ??
    ([puraShopHome.canvas, puraShopHome.canvasDeep] as const);

  // The field is built in THREE passes rather than one flat corner→corner ramp,
  // so depth comes from color, not just from the cards floating on top:
  //   1. a 3-stop pillar wash (light corner → porcelain mid → deep corner) that
  //      keeps the page centre luminous instead of muddying to the deep hue;
  //   2. a top porcelain lift (dawn-bright sky) so content reads off a clean
  //      light source at the header;
  //   3. ONE restrained ambient bloom — the active pillar's halo post-scan, a
  //      whisper of day-blue pre-scan — anchored top-centre behind the deck.
  // Pure light/atmosphere; the single Pura-Blue accent is reserved for the
  // match orb + primary actions and never floods this field.
  const field: [string, string, string] = [
    corners[0],
    dsAmbient.day.sky[0],
    corners[1],
  ];
  const bloom = activeTheme?.halo ?? dsAmbient.day.glow;
  // Fade overlays to a transparent PORCELAIN, never the `transparent` keyword:
  // on Android the keyword interpolates through transparent-black and leaves a
  // muddy grey seam at the fade. Transparent-white matches the field and keeps
  // the bloom clean on both platforms.
  const CLEAR = 'rgba(252,253,255,0)';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={field}
        locations={[0, 0.46, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Top luminous lift — a clean porcelain light source under the header. */}
      <LinearGradient
        colors={[dsAmbient.dawn.sky[0], CLEAR]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.42 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Single ambient bloom — the pillar's atmosphere (or a day-blue whisper
          pre-scan) gathered top-centre, fading to nothing by mid-page. */}
      <LinearGradient
        colors={[bloom, CLEAR]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0.04 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: topInset + 10,
          paddingBottom: bottomInset,
        }}
        showsVerticalScrollIndicator={false}
      >
        <FeedHeader
          state={model.state}
          greetingName={model.greetingName}
          acknowledgment={model.acknowledgment}
          scanFreshness={model.scanFreshness}
          showRescanBanner={model.showRescanBanner}
          onRescan={onScan}
        />

        {isPost ? (
          <>
            <ConcernsTonight
              concerns={model.concernsTonight}
              onPressConcern={onPressConcern}
            />

            <View style={styles.stage} pointerEvents="box-none">
              <CardStack
                ref={stackRef}
                cards={model.cards}
                onIndexChange={setTopIdx}
                onPressProduct={onPressProduct}
                onToggleSave={onToggleSave}
                onAdd={onAdd}
                endActions={
                  <FeedEscapeHatches
                    variant="card"
                    catalogCount={model.catalogCount}
                    onBrowseAll={onBrowseAll}
                    onBrowseConcern={onBrowseConcern}
                  />
                }
              />
            </View>

            <SavedShelf
              cards={model.savedCards}
              onPressProduct={onPressProduct}
              onToggleSave={onToggleSave}
            />

            <View style={styles.pageHatches}>
              <FeedEscapeHatches
                variant="page"
                catalogCount={model.catalogCount}
                onBrowseAll={onBrowseAll}
                onBrowseConcern={onBrowseConcern}
              />
            </View>
          </>
        ) : (
          <>
            <PreScanGate picks={model.preScanPicks} onScan={onScan} />

            <View style={styles.pageHatches}>
              <FeedEscapeHatches
                variant="page"
                catalogCount={model.catalogCount}
                onBrowseAll={onBrowseAll}
                onBrowseConcern={onBrowseConcern}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraShopHome.canvas,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    // A touch more breathing room above the centerpiece deck so it separates
    // cleanly from the concerns row (hierarchy refinement supporting the
    // editorial type pass).
    paddingTop: 12,
    paddingBottom: 22,
  },
  pageHatches: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
});
