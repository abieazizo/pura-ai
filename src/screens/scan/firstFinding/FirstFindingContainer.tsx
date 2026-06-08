/**
 * FirstFindingContainer — the production integration point. Runs the REAL
 * GPT-4V read (readSkinFromPhoto) and feeds the network-decoupled
 * FirstFindingScreen the canonical outcome. Must be mounted inside the
 * onboarding OrbProvider so the screen drives the persistent companion orb.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { readSkinFromPhoto } from '@/api/skinRead';
import type { SkinReadOutcome } from '@/types/skinRead';
import { FirstFindingScreen } from './FirstFindingScreen';
import type { ScreenTheme } from './metricTint';

export interface FirstFindingContainerProps {
  photoUri: string;
  /** → the next results screen (existing/placeholder). */
  onSeeEverything: () => void;
  /** Bad photo / "try in better light" → back to capture. */
  onRetake: () => void;
  theme?: ScreenTheme;
  mirrored?: boolean;
}

export function FirstFindingContainer({
  photoUri,
  onSeeEverything,
  onRetake,
  theme = 'dark',
  mirrored = true,
}: FirstFindingContainerProps) {
  const [outcome, setOutcome] = useState<SkinReadOutcome>({ status: 'pending' });
  const reqId = useRef(0);

  const run = useCallback(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setOutcome({ status: 'pending' });
    readSkinFromPhoto({ photoUri, signal: ctrl.signal })
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
    />
  );
}
