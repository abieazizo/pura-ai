/**
 * Notification opt-in policy (money flow step 6). NEVER upfront. The ask is
 * EARNED — it may only appear AFTER the user completes their first ritual step,
 * and only once. Account creation happens at/after Confirm; notifications do
 * not ride along with it. This is the single source of truth the ritual + any
 * prompt read, so "never upfront" can't be violated by a stray call site.
 */
export interface NotificationGateState {
  /** Has the user finished their very first routine step in the ritual? */
  firstRitualStepDone: boolean;
  /** Have we already shown the opt-in once? */
  alreadyPrompted: boolean;
}

export function mayPromptNotifications(s: NotificationGateState): boolean {
  return s.firstRitualStepDone && !s.alreadyPrompted;
}

/** Confirm/Account is BEFORE any ritual step → notifications can never fire here. */
export function mayPromptNotificationsAtConfirm(): boolean {
  return mayPromptNotifications({ firstRitualStepDone: false, alreadyPrompted: false });
}

export const NOTIF_DEFERRAL_NOTE =
  'Reminders are offered after your first step is done — never before.';
