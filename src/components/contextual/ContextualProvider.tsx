import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import { ContextualQuestionSheet } from '@/components/onboarding/ContextualQuestionSheet';
import { TodayContextBody } from './TodayContextBody';
import { PriceTierBody, type PriceTier } from './PriceTierBody';
import {
  RoutineFitbackBody,
  type RoutineFitback,
} from './RoutineFitbackBody';
import { Toast } from './Toast';

type SheetKind = 'today' | 'price' | 'fitback';

interface ContextualContextValue {
  /** Trigger 1 — requested from the scan camera on 2nd+ scan day. */
  requestTodaySheet: () => void;
  /** Trigger 3 — requested from Home on day 7. */
  requestFitbackSheet: () => void;
}

const ContextualCtx = createContext<ContextualContextValue | null>(null);

/**
 * Provider that owns the queue + presentation of the three contextual
 * sheets (§3). Trigger 2 (price tier) is watched automatically: when the
 * wishlist length transitions from 0 → 1 and the flag is still false,
 * the sheet enters the queue after 400ms. Triggers 1 and 3 are pushed by
 * the screens that detect their conditions.
 *
 * Never more than one sheet visible at once; if multiple fire simultaneously
 * they queue with a 400ms gap between one's dismissal and the next's entry.
 */
export function ContextualProvider({ children }: { children: React.ReactNode }) {
  // Queue + current visible sheet
  const queueRef = useRef<SheetKind[]>([]);
  const [current, setCurrent] = useState<SheetKind | null>(null);
  const [visible, setVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const flags = useAppStore(
    useShallow((s) => ({
      wishlistLen: s.wishlist.length,
      hasAnsweredTodayContext: s.hasAnsweredTodayContext,
      hasAnsweredPriceTier: s.hasAnsweredPriceTier,
      hasAnsweredRoutineFitback: s.hasAnsweredRoutineFitback,
    }))
  );

  const setContextualTodayNote = useAppStore((s) => s.setContextualTodayNote);
  const setHasAnsweredTodayContext = useAppStore(
    (s) => s.setHasAnsweredTodayContext
  );
  const setPriceTier = useAppStore((s) => s.setPriceTier);
  const setHasAnsweredPriceTier = useAppStore((s) => s.setHasAnsweredPriceTier);
  const setRoutineFitback = useAppStore((s) => s.setRoutineFitback);
  const setHasAnsweredRoutineFitback = useAppStore(
    (s) => s.setHasAnsweredRoutineFitback
  );

  // ------------------------------------------------------------------
  // Queue machinery
  // ------------------------------------------------------------------
  const processQueue = useCallback(() => {
    if (current !== null || visible) return;
    const next = queueRef.current.shift();
    if (next === undefined) return;
    setCurrent(next);
    setVisible(true);
  }, [current, visible]);

  useEffect(() => {
    // Whenever `current` clears we pull the next off the queue after a
    // 400ms pause (§3.5 — never stack sheets).
    if (!visible && current === null) {
      const t = setTimeout(processQueue, 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [current, visible, processQueue]);

  const enqueue = useCallback((kind: SheetKind, delay: number) => {
    setTimeout(() => {
      if (queueRef.current.includes(kind)) return;
      queueRef.current.push(kind);
      // Fire processQueue via state — we can't call it directly here without
      // having stale closures. The useEffect above handles it.
      setVisible((v) => v); // no-op state poke
    }, delay);
  }, []);

  // ------------------------------------------------------------------
  // Trigger 2 — product save auto-watch
  // ------------------------------------------------------------------
  const firstSaveSeen = useRef(false);
  useEffect(() => {
    if (flags.hasAnsweredPriceTier) return;
    if (flags.wishlistLen >= 1 && !firstSaveSeen.current) {
      firstSaveSeen.current = true;
      enqueue('price', 400);
    }
  }, [flags.wishlistLen, flags.hasAnsweredPriceTier, enqueue]);

  // ------------------------------------------------------------------
  // Dismissal + answer handlers
  // ------------------------------------------------------------------
  const closeCurrent = useCallback(() => {
    setVisible(false);
    // Delay a beat so the sheet's exit animation can play before we unmount
    // (also gives the queue's 400ms pause a head start).
    setTimeout(() => {
      setCurrent(null);
    }, 220);
  }, []);

  const handleTodaySubmit = useCallback(
    (note: string | null) => {
      if (note !== null) setContextualTodayNote(note);
      setHasAnsweredTodayContext(true);
      hapt.select();
      setTimeout(closeCurrent, 180);
    },
    [setContextualTodayNote, setHasAnsweredTodayContext, closeCurrent]
  );

  const handleTodaySkip = useCallback(() => {
    // Skip still counts as "asked" so we never bug them again.
    setHasAnsweredTodayContext(true);
    closeCurrent();
  }, [setHasAnsweredTodayContext, closeCurrent]);

  const handlePriceSelect = useCallback(
    (tier: PriceTier) => {
      setPriceTier(tier);
      setHasAnsweredPriceTier(true);
      setTimeout(closeCurrent, 180);
    },
    [setPriceTier, setHasAnsweredPriceTier, closeCurrent]
  );

  const handlePriceSkip = useCallback(() => {
    setHasAnsweredPriceTier(true);
    closeCurrent();
  }, [setHasAnsweredPriceTier, closeCurrent]);

  const handleFitbackSelect = useCallback(
    (fb: RoutineFitback) => {
      setRoutineFitback(fb);
      setHasAnsweredRoutineFitback(true);
      setTimeout(() => {
        closeCurrent();
        // Toast after the sheet has begun its exit; avoids overlapping chrome.
        setTimeout(() => setToastMsg("Got it. I'll adjust."), 260);
      }, 180);
    },
    [setRoutineFitback, setHasAnsweredRoutineFitback, closeCurrent]
  );

  const handleFitbackSkip = useCallback(() => {
    setHasAnsweredRoutineFitback(true);
    closeCurrent();
  }, [setHasAnsweredRoutineFitback, closeCurrent]);

  // ------------------------------------------------------------------
  // Exposed hooks
  // ------------------------------------------------------------------
  const value = useMemo<ContextualContextValue>(
    () => ({
      requestTodaySheet: () => {
        if (flags.hasAnsweredTodayContext) return;
        enqueue('today', 600);
      },
      requestFitbackSheet: () => {
        if (flags.hasAnsweredRoutineFitback) return;
        enqueue('fitback', 800);
      },
    }),
    [enqueue, flags.hasAnsweredTodayContext, flags.hasAnsweredRoutineFitback]
  );

  return (
    <ContextualCtx.Provider value={value}>
      {children}

      {/* The current sheet. Mount / unmount on `current` rather than
          `visible` so the exit animation has time to run. */}
      {current === 'today' ? (
        <ContextualQuestionSheet
          visible={visible}
          kicker="A QUICK CHECK-IN"
          headline="Anything going on today?"
          subhead="Context helps me read the scan. Skip if nothing's up."
          onDismiss={handleTodaySkip}
          onSkip={handleTodaySkip}
        >
          <TodayContextBody onSubmit={handleTodaySubmit} />
        </ContextualQuestionSheet>
      ) : null}

      {current === 'price' ? (
        <ContextualQuestionSheet
          visible={visible}
          kicker="ONE QUICK QUESTION"
          headline="What's your usual price range?"
          subhead="I'll bias your recommendations — you can always override."
          onDismiss={handlePriceSkip}
          onSkip={handlePriceSkip}
        >
          <PriceTierBody onSelect={handlePriceSelect} />
        </ContextualQuestionSheet>
      ) : null}

      {current === 'fitback' ? (
        <ContextualQuestionSheet
          visible={visible}
          kicker="ONE WEEK IN"
          headline="How's the routine feeling?"
          subhead="I'll recalibrate tomorrow's steps based on this."
          onDismiss={handleFitbackSkip}
          onSkip={handleFitbackSkip}
        >
          <RoutineFitbackBody onSelect={handleFitbackSelect} />
        </ContextualQuestionSheet>
      ) : null}

      {toastMsg ? (
        <Toast
          message={toastMsg}
          onFinished={() => setToastMsg(null)}
        />
      ) : null}
    </ContextualCtx.Provider>
  );
}

export function useContextual(): ContextualContextValue {
  const v = useContext(ContextualCtx);
  if (!v) {
    // Return no-ops so screens outside the provider don't crash. The provider
    // is expected to wrap the whole app in production — this safety net just
    // lets tests/storybooks render a screen in isolation.
    return {
      requestTodaySheet: () => {},
      requestFitbackSheet: () => {},
    };
  }
  return v;
}
