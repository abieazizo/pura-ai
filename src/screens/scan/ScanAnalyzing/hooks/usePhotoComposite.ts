/**
 * Captures the composed photo + overlay as a single JPEG via
 * `react-native-view-shot`. Fires once when the sequence reaches Beat 6
 * (SETTLE) AND the AI result has landed AND no compositePhotoUri has been
 * written yet.
 *
 * Silent-fail: composite save is a nice-to-have (powers Progress tab
 * timeline thumbnails). If the capture fails (headless render, stage not
 * laid out yet, permission hiccup) we swallow the error — the main flow
 * proceeds regardless.
 */

import { useEffect, type RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useAppStore } from '@/store/useAppStore';
import type { Beat } from './useAnalysisChoreography';
import type { ScanResult } from '@/types';

export interface PhotoCompositeArgs {
  stageRef: RefObject<View | null>;
  beat: Beat;
  result: ScanResult | null;
}

export function usePhotoComposite({ stageRef, beat, result }: PhotoCompositeArgs) {
  useEffect(() => {
    if (beat !== 'settle') return;
    if (!result) return;
    if (result.compositePhotoUri) return;
    const node = stageRef.current;
    if (!node) return;
    // Let the SVG paint settle one frame before the snapshot.
    const t = setTimeout(() => {
      captureRef(node, { format: 'jpg', quality: 0.92, result: 'tmpfile' })
        .then((uri) => {
          useAppStore.getState().setCompositePhoto(uri);
        })
        .catch(() => {
          // Silent — progress thumbnails just won't land this run.
        });
    }, 60);
    return () => clearTimeout(t);
  }, [beat, result, stageRef]);
}
