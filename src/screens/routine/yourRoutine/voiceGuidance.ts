/**
 * voiceGuidance — optional, hands-free narration for the ritual (wet hands).
 *
 * Invisible until invited: off by default, switched on by a quiet affordance in
 * the ritual. CRITICAL: this file NEVER statically imports a TTS engine. The
 * repo has no `expo-speech`, and a static import of a missing native module
 * breaks the Metro bundle (the Skia lesson). So the engine is INJECTED — the
 * default is a no-op, and shipping real speech is a one-line orphan swap:
 *
 *   import * as Speech from 'expo-speech';            // in a tiny orphan file
 *   const guide = createVoiceGuide({ speak: (t) => Speech.speak(t, { rate: 0.96 }) });
 *
 * The harness injects a logging `speak` to PROVE the line fires per step when
 * enabled — and stays silent when not.
 */

export type SpeakFn = (text: string) => void;

export interface VoiceGuide {
  speakLine(text: string): void;
  setEnabled(on: boolean): void;
  isEnabled(): boolean;
  /** Stop any in-flight narration (the injected engine may ignore this). */
  stop(): void;
}

export interface VoiceGuideOptions {
  /** The TTS engine. Omit for a safe no-op (bundle stays clean). */
  speak?: SpeakFn;
  stop?: () => void;
  enabled?: boolean;
}

export function createVoiceGuide(opts: VoiceGuideOptions = {}): VoiceGuide {
  let enabled = opts.enabled ?? false;
  const speak = opts.speak;
  const stopFn = opts.stop;
  return {
    speakLine(text: string) {
      if (!enabled || !speak || !text) return;
      speak(text);
    },
    setEnabled(on: boolean) {
      enabled = on;
      if (!on) stopFn?.();
    },
    isEnabled: () => enabled,
    stop: () => stopFn?.(),
  };
}

/** A logging engine for the harness — proves the voice-optional path fires. */
export function makeLoggingSpeak(): { speak: SpeakFn; log: string[] } {
  const log: string[] = [];
  return { speak: (t) => log.push(t), log };
}
