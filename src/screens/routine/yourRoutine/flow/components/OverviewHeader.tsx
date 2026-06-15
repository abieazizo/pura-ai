/**
 * OverviewHeader — ACT 1's top matter.
 *
 * The eyebrow "TODAY", the time-aware serif title (34), a quiet subline carrying
 * the total time, and a 44px right-aligned orb ANCHOR. The anchor is a
 * transparent layout placeholder — it does NOT render an orb; the real orb is
 * the single shared OrbHost instance the host parks over this spot. The header
 * measures the placeholder's screen center and reports it via `onOrbAnchor` as
 * an `OrbTargetXY{cx,cy,size:44}` so the host can rest / carry the shared orb.
 *
 * Type comes from `flow/type.ts`, color from `overviewTone` (no hex here).
 * Title + subline wrap under Dynamic Type (capped multipliers) and the layout
 * reflows without clipping; the anchor stays pinned to the title's first line.
 */

import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { flowType } from '../type';
import { overviewTone } from '@/theme/routineFlow';
import type { OverviewHeaderProps } from '../contracts';

/** The orb anchor's diameter — matches the calm overview orb size. */
const ANCHOR_SIZE = 44;

export function OverviewHeader({ title, subline, onOrbAnchor }: OverviewHeaderProps) {
  const anchorRef = useRef<View>(null);
  const reportedRef = useRef<string | null>(null);

  // Measure the anchor's center in window coords and report it up. Re-measures
  // on layout (Dynamic Type reflow, rotation) but only emits when the center
  // actually moved, so the host never re-parks the orb on identical frames.
  const measure = useCallback(() => {
    const node = anchorRef.current;
    if (!node || !onOrbAnchor) return;
    node.measureInWindow((x, y, w, h) => {
      if (!w && !h) return; // not laid out yet — wait for a real frame
      const cx = x + w / 2;
      const cy = y + h / 2;
      if (Number.isNaN(cx) || Number.isNaN(cy)) return;
      const key = `${Math.round(cx)}:${Math.round(cy)}`;
      if (reportedRef.current === key) return;
      reportedRef.current = key;
      onOrbAnchor({ cx, cy, size: ANCHOR_SIZE });
    });
  }, [onOrbAnchor]);

  const onAnchorLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      // measureInWindow needs a committed frame; defer to the next paint via a
      // microtask-free path: measure immediately, then once more after layout
      // settles (the second call no-ops if the center is unchanged).
      measure();
    },
    [measure],
  );

  return (
    <View style={styles.root} onLayout={measure}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text
            style={[flowType.eyebrow, styles.eyebrow]}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
          >
            TODAY
          </Text>
          <Text
            style={[flowType.overviewTitle, styles.title]}
            maxFontSizeMultiplier={1.6}
          >
            {title}
          </Text>
        </View>

        {/* The orb anchor — a transparent 44px placeholder the shared orb rests
            over. Decorative to VoiceOver; renders no visible mark. */}
        <View
          ref={anchorRef}
          style={styles.anchor}
          onLayout={onAnchorLayout}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>

      <Text style={[flowType.context, styles.subline]} maxFontSizeMultiplier={1.6}>
        {subline}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
    paddingRight: 16,
  },
  eyebrow: {
    color: overviewTone.faint,
    marginBottom: 10,
  },
  title: {
    color: overviewTone.ink,
  },
  anchor: {
    width: ANCHOR_SIZE,
    height: ANCHOR_SIZE,
    // Nudge down so the orb's center sits beside the title's first line, not the
    // eyebrow — the cluster reads as title + companion.
    marginTop: 18,
    backgroundColor: 'transparent',
  },
  subline: {
    color: overviewTone.muted,
    marginTop: 12,
  },
});
