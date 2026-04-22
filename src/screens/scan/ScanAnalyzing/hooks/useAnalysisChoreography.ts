/**
 * Drives the 7-beat cinematic timeline.
 *
 * The hook owns TIMING only — it does not render anything. It exposes the
 * current beat + overlay visibility arrays + caption text/variant, and
 * screens/components read from that synchronously. All timers are parked
 * in a ref and cleared on unmount or when the timing table changes.
 *
 * Reduce Motion collapses the seven beats into a narrative caption cycle
 * with every overlay shown in its final state from mount — see §19 of the
 * spec. Same beat names, captions still announce via VoiceOver, no motion.
 */

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { hapt } from '@/utils/haptics';
import {
  A11Y_ANNOUNCEMENTS,
  CAPTION_COPY,
  MARKER_INTERVAL,
  type BeatTiming,
} from '../constants';

export type Beat =
  | 'arrive'
  | 'locate'
  | 'partition'
  | 'detect'
  | 'score'
  | 'settle'
  | 'reveal';

export type CaptionStyle = 'italic' | 'roman' | 'waiting';

export interface ChoreographyArgs {
  /** Stable per screen mount; used to re-run the timeline when it changes. */
  photoUri: string;
  reduceMotion: boolean;
  beatTiming: BeatTiming;
}

export interface ChoreographyState {
  beat: Beat;
  captionText: string;
  captionStyle: CaptionStyle;
  zonesVisible: [boolean, boolean, boolean, boolean];
  markersVisible: [boolean, boolean, boolean, boolean];
  scoresVisible: [boolean, boolean, boolean, boolean];
  errorState: boolean;
  /** Flipped to true when the AI has overshot Beat 6 by the spec's grace. */
  setErrorState: (v: boolean) => void;
  /** Switches the caption into the `waiting` variant while we hold on Beat 6. */
  setWaiting: (v: boolean) => void;
}

const FALSE_FOUR: [boolean, boolean, boolean, boolean] = [false, false, false, false];
const TRUE_FOUR: [boolean, boolean, boolean, boolean] = [true, true, true, true];

export function useAnalysisChoreography({
  photoUri,
  reduceMotion,
  beatTiming,
}: ChoreographyArgs): ChoreographyState {
  const [beat, setBeat] = useState<Beat>('arrive');
  const [captionText, setCaptionText] = useState<string>('');
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('italic');
  const [zonesVisible, setZonesVisible] = useState<[boolean, boolean, boolean, boolean]>(FALSE_FOUR);
  const [markersVisible, setMarkersVisible] = useState<[boolean, boolean, boolean, boolean]>(FALSE_FOUR);
  const [scoresVisible, setScoresVisible] = useState<[boolean, boolean, boolean, boolean]>(FALSE_FOUR);
  const [errorState, setErrorState] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Fresh run — clear anything residual.
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const schedule = (ms: number, fn: () => void) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
    };

    const announce = (msg: string) => {
      AccessibilityInfo.announceForAccessibility(msg);
    };

    if (reduceMotion) {
      // Narrative timeline — all overlays show in their final state
      // immediately; captions still cycle so a VoiceOver user hears the
      // same 5 announcements. No haptics beyond the success at the end.
      setBeat('locate');
      setZonesVisible(TRUE_FOUR);
      setMarkersVisible(TRUE_FOUR);
      setScoresVisible(TRUE_FOUR);

      const cues: Array<{ t: number; text: string; style: CaptionStyle; beat: Beat; announce: string }> = [
        { t: 0,    text: CAPTION_COPY.locate,    style: 'italic', beat: 'locate',    announce: A11Y_ANNOUNCEMENTS.locate },
        { t: 900,  text: CAPTION_COPY.partition, style: 'italic', beat: 'partition', announce: A11Y_ANNOUNCEMENTS.partition },
        { t: 1800, text: CAPTION_COPY.detect,    style: 'italic', beat: 'detect',    announce: A11Y_ANNOUNCEMENTS.detect },
        { t: 2700, text: CAPTION_COPY.score,     style: 'italic', beat: 'score',     announce: A11Y_ANNOUNCEMENTS.score },
        { t: 3600, text: CAPTION_COPY.reveal,    style: 'roman',  beat: 'settle',    announce: A11Y_ANNOUNCEMENTS.reveal },
      ];
      cues.forEach((c) =>
        schedule(c.t, () => {
          setCaptionText(c.text);
          setCaptionStyle(c.style);
          setBeat(c.beat);
          announce(c.announce);
        })
      );
      return () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
      };
    }

    // Full cinematic timeline ------------------------------------------------
    hapt.select();

    // BEAT 1 — ARRIVE runs implicitly at mount. The photo entrance + header
    // pulse already communicate this beat; no state change needed.

    // BEAT 2 — LOCATE
    schedule(beatTiming.LOCATE.start, () => {
      setBeat('locate');
      setCaptionText(CAPTION_COPY.locate);
      setCaptionStyle('italic');
      announce(A11Y_ANNOUNCEMENTS.locate);
    });

    // BEAT 3 — PARTITION
    schedule(beatTiming.PARTITION.start, () => {
      setBeat('partition');
      setCaptionText(CAPTION_COPY.partition);
      setCaptionStyle('italic');
      announce(A11Y_ANNOUNCEMENTS.partition);
      hapt.select();
    });
    // Stagger the four zones in over ~900ms.
    for (let i = 0; i < 4; i++) {
      schedule(beatTiming.PARTITION.start + i * 300, () => {
        setZonesVisible((prev) => {
          const next = [...prev] as [boolean, boolean, boolean, boolean];
          next[i] = true;
          return next;
        });
      });
    }

    // BEAT 4 — DETECT
    schedule(beatTiming.DETECT.start, () => {
      setBeat('detect');
      setCaptionText(CAPTION_COPY.detect);
      setCaptionStyle('italic');
      announce(A11Y_ANNOUNCEMENTS.detect);
    });
    for (let i = 0; i < 4; i++) {
      schedule(beatTiming.DETECT.start + i * MARKER_INTERVAL, () => {
        setMarkersVisible((prev) => {
          const next = [...prev] as [boolean, boolean, boolean, boolean];
          next[i] = true;
          return next;
        });
        hapt.select();
      });
    }

    // BEAT 5 — SCORE
    schedule(beatTiming.SCORE.start, () => {
      setBeat('score');
      setCaptionText(CAPTION_COPY.score);
      setCaptionStyle('italic');
      announce(A11Y_ANNOUNCEMENTS.score);
    });
    for (let i = 0; i < 4; i++) {
      schedule(beatTiming.SCORE.start + i * 100, () => {
        setScoresVisible((prev) => {
          const next = [...prev] as [boolean, boolean, boolean, boolean];
          next[i] = true;
          return next;
        });
      });
    }

    // BEAT 6 — SETTLE
    schedule(beatTiming.SETTLE.start, () => {
      setBeat('settle');
      hapt.success();
    });

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [photoUri, reduceMotion, beatTiming]);

  const setWaiting = (v: boolean) => {
    if (v) {
      setCaptionText(CAPTION_COPY.waiting);
      setCaptionStyle('waiting');
      AccessibilityInfo.announceForAccessibility(A11Y_ANNOUNCEMENTS.waiting);
    }
  };

  return {
    beat,
    captionText,
    captionStyle,
    zonesVisible,
    markersVisible,
    scoresVisible,
    errorState,
    setErrorState,
    setWaiting,
  };
}
