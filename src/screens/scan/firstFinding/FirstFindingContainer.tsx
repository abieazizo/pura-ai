/**
 * FirstFindingContainer — the production integration point. Runs the REAL
 * GPT-4V read (readSkinFromPhoto) and feeds the network-decoupled
 * FirstFindingScreen the canonical outcome. Must be mounted inside the
 * onboarding OrbProvider so the screen drives the persistent companion orb.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readSkinFromPhoto } from '@/api/skinRead';
import { useAppStore } from '@/store/useAppStore';
import type { SkinReadOutcome } from '@/types/skinRead';
import type { FaceLandmarkResult } from '@/types/scanResults';
import { FirstFindingScreen } from './FirstFindingScreen';
import type { FaceLandmarks } from './faceRegions';
import { landmarksFromFaceGeometry } from './landmarksFromGeometry';
import type { ScreenTheme } from './metricTint';

export interface FirstFindingContainerProps {
  photoUri: string;
  /** → the next results screen (existing/placeholder). */
  onSeeEverything: () => void;
  /** Bad photo / "try in better light" → back to capture. */
  onRetake: () => void;
  theme?: ScreenTheme;
  mirrored?: boolean;
  /** Real face anchors → glows track the actual face. Pass these directly, OR
   *  pass `faceGeometry` to derive them. */
  landmarks?: FaceLandmarks;
  /** The scan's canonical face geometry (services/scanResults/faceGeometry →
   *  faceGeometryProvider). When present + usable, glows AFFINE-warp to the real
   *  face; an explicit `landmarks` prop takes precedence. */
  faceGeometry?: FaceLandmarkResult;
}

export function FirstFindingContainer({
  photoUri,
  onSeeEverything,
  onRetake,
  theme = 'dark',
  mirrored = true,
  landmarks,
  faceGeometry,
}: FirstFindingContainerProps) {
  const [outcome, setOutcome] = useState<SkinReadOutcome>({ status: 'pending' });
  const reqId = useRef(0);

  // Explicit landmarks win; else derive real face-tracking from the scan
  // geometry; else undefined → the screen's proportional fallback.
  const trackedLandmarks = useMemo(
    () => landmarks ?? landmarksFromFaceGeometry(faceGeometry) ?? undefined,
    [landmarks, faceGeometry],
  );

  const run = useCallback(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setOutcome({ status: 'pending' });
    const goal = useAppStore.getState().goal ?? undefined;
    readSkinFromPhoto({ photoUri, signal: ctrl.signal, goal })
      .then((o) => {
        if (reqId.current === id) setOutcome(o);
      })
      .catch(() => {
        if (reqId.current === id) {
          setOutcome({
            status: 'service_error',
            message: 'I couldn’t quite finish that read — let’s try once more.',
          });
        }
      });
    return () => ctrl.abort();
  }, [photoUri]);

  useEffect(() => {
    const cancel = run();
    return cancel;
  }, [run]);

  return (
    <FirstFindingScreen
      photoUri={photoUri}
      outcome={outcome}
      onSeeEverything={onSeeEverything}
      onTryBetterLight={onRetake}
      onTryAgain={run}
      theme={theme}
      mirrored={mirrored}
      landmarks={trackedLandmarks}
    />
  );
}
