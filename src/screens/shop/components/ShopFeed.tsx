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
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  ds,
  dsAmbient,
  dsElevation,
  dsRadius,
  puraShop,
  puraShopHome,
} from '@/theme';
import type { ShopHomeModel } from '../shopStackModel';
import { CardStack, type CardStackHandle } from './CardStack';
import { FeedHeader } from './FeedHeader';
import { ConcernsTonight } from './ConcernsTonight';
import { SavedShelf } from './SavedShelf';
import { PreScanGate } from './PreScanGate';
import { FeedEscapeHatches } from './FeedEscapeHatches';

const SCREEN_W = Dimensions.get('window').width;

// ---------------------------------------------------------------------------
// ScanHeroPortrait — the shared imagery HERO for the Shop surface.
//
// Wherever a real face photo exists, the imagery spec treats it as a premium
// editorial portrait: a generous ~4:5 frame, soft rounded corners, a soft
// BOTTOM SCRIM so any overlaid text clears AA+, and a subtle hairline frame +
// elevation lift. Here it opens the post-scan feed — the real skin the whole
// edit below is recommended against — so the storefront reads as personal,
// not as a catalog. Pure presentation; the photo URI is canonical state.
// ---------------------------------------------------------------------------

const HERO_H_PAD = 20;

function ScanHeroPortrait({
  photoUri,
  freshnessLabel,
  concernCount,
}: {
  photoUri: string | null;
  freshnessLabel: string | null;
  concernCount: number;
}) {
  // Honest empty state: with no real photo we render nothing here — the
  // FeedHeader's letterhead already carries the voice, and the imagery spec
  // forbids a fake/stock face or a broken gray box on porcelain.
  if (!photoUri) return null;

  const frameW = SCREEN_W - HERO_H_PAD * 2;
  // Editorial portrait ratio — a tall, considered ~5:6 frame so the real face
  // reads as a commanding hero, not a banner crop.
  const frameH = Math.round(frameW * 1.2);

  const caption =
    concernCount > 0
      ? `Read against ${concernCount} ${concernCount === 1 ? 'concern' : 'concerns'} from your last scan`
      : 'Read against your last scan';

  return (
    <View style={styles.heroWrap}>
      <View style={[styles.heroFrame, { width: frameW, height: frameH }]}>
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityLabel="Your most recent skin scan"
        />

        {/* Top luminance lift — a whisper of porcelain at the crown so the
            portrait reads as lit, framed editorial, not a flat crop. */}
        <LinearGradient
          colors={['rgba(252,253,255,0.22)', 'rgba(252,253,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.36 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Bottom scrim — ds.scrim → transparent so the overlaid eyebrow +
            caption clear AA+ over any skin tone or lighting. */}
        <LinearGradient
          colors={['rgba(8,10,15,0)', 'rgba(8,10,15,0.34)', ds.scrim]}
          locations={[0, 0.58, 1]}
          start={{ x: 0.5, y: 0.34 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Overlaid label — anchored bottom-left over the scrim, the way a
            gallery wall-label sits beneath a portrait. */}
        <View style={styles.heroLabel} pointerEvents="none">
          <View style={styles.heroEyebrowRow}>
            <View style={styles.heroEyebrowTick} />
            <Text style={styles.heroEyebrow} numberOfLines={1}>
              YOUR SKIN TONIGHT
            </Text>
            {freshnessLabel ? (
              <>
                <View style={styles.heroEyebrowDot} />
                <Text style={styles.heroFresh} numberOfLines={1}>
                  {freshnessLabel}
                </Text>
              </>
            ) : null}
          </View>
          <Text style={styles.heroCaption} numberOfLines={2}>
            {caption}
          </Text>
        </View>

        {/* Inner hairline frame — a crisp 1px brand edge drawn ON TOP so it
            survives the cover-cropped photo (border on the image itself is
            clipped by overflow). */}
        <View style={styles.heroFrameLine} pointerEvents="none" />
      </View>
    </View>
  );
}

export interface ShopFeedProps {
  model: ShopHomeModel;
  /**
   * The user's latest SCANNED FACE (canonical `scans[].photoUri`). When present
   * (post-scan), it anchors the feed as a premium editorial portrait — the
   * shared imagery hero. Null pre-scan, where no portrait band renders. Never a
   * fabricated/stock image.
   */
  heroPhotoUri?: string | null;
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
  heroPhotoUri,
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
            {/* The user's scanned face — the shared imagery HERO. A premium
                editorial portrait that anchors the whole feed to the real skin
                it recommends against. Only rendered when a real scan photo
                exists; never fabricated. */}
            <ScanHeroPortrait
              photoUri={heroPhotoUri ?? null}
              freshnessLabel={model.scanFreshness?.label ?? null}
              concernCount={model.concernsTonight.length}
            />

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
    // Generous gallery whitespace framing the now-commanding hero card so it
    // reads as the page's centerpiece object, set apart from the concerns row
    // above and the saved shelf below.
    paddingTop: 20,
    paddingBottom: 34,
  },
  pageHatches: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },

  // ----- Scanned-face editorial hero portrait -----
  heroWrap: {
    paddingHorizontal: HERO_H_PAD,
    paddingTop: 4,
    paddingBottom: 22,
  },
  heroFrame: {
    borderRadius: dsRadius.xl,
    overflow: 'hidden',
    backgroundColor: puraShopHome.canvasDeep,
    // A real lift off the porcelain field so the portrait reads as a framed
    // object on the page, consistent with the floating product cards below.
    ...dsElevation.e3,
  },
  heroFrameLine: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: dsRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroLabel: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  heroEyebrowTick: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: puraShop.coral,
    marginRight: 8,
  },
  heroEyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: ds.onInk,
    flexShrink: 0,
  },
  heroEyebrowDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginHorizontal: 8,
    flexShrink: 0,
  },
  heroFresh: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.82)',
    flexShrink: 1,
  },
  heroCaption: {
    // The editorial wall-label beneath the portrait — set in the display serif
    // so the real face reads as a curated hero, not a profile thumbnail.
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 23,
    lineHeight: 27,
    letterSpacing: -0.4,
    color: ds.onInk,
  },
});
