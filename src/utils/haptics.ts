import * as Haptics from 'expo-haptics';

/**
 * Choreographed haptics. Each action has its own rhythm — a shutter is two
 * beats, a scan-complete is a three-note arpeggio, a step-complete is a
 * tap-plus-selection. The goal is that closing your eyes you can tell which
 * action you just performed by the feel.
 *
 * All calls swallow errors — haptics are a nice-to-have.
 */

const safe = (fn: () => Promise<unknown>) => fn().catch(() => {});

export const hapt = {
  /** Light UI tap — primary button press, mark press, tab press. */
  tap() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** Selection tick — segmented control, pill switch. */
  select() {
    safe(() => Haptics.selectionAsync());
  },
  /** Camera shutter — medium then light, 80ms apart. Feels mechanical. */
  shutter() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    setTimeout(
      () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      80
    );
  },
  /** Scan analysis completed — success + two soft pulses. */
  scanComplete() {
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    );
    setTimeout(
      () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      200
    );
    setTimeout(
      () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      320
    );
  },
  /** Routine step marked done — medium, then a selection tick. */
  stepComplete() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    setTimeout(() => safe(() => Haptics.selectionAsync()), 100);
  },
  /** Assistant reply — soft arrival. */
  assistantReply() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
  /** Mark tap — light, same as `tap()`, separated for semantic clarity. */
  markTap() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** Reversible warning (e.g. destructive tap confirmation). */
  warning() {
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    );
  },
  /** Error — used when a mutation actually fails. */
  error() {
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    );
  },
  /** Legacy aliases kept so older call sites compile. */
  medium() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  heavy() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  success() {
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    );
  },
};

export type HapticKind = keyof typeof hapt;
