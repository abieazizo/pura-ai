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

import { puraShopHome } from '@/theme';
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
  const corners =
    isPost && model.cards[topIdx]?.pillarTheme
      ? model.cards[topIdx]!.pillarTheme!.corners
      : ([puraShopHome.canvas, puraShopHome.canvasDeep] as const);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[corners[0], corners[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
    paddingTop: 6,
    paddingBottom: 20,
  },
  pageHatches: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
});
