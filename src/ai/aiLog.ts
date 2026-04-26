/**
 * Pura AI — single observability channel.
 *
 * Every AI subsystem (gateway, validation, api wrappers, server
 * proxy) routes structured log records through this module so the
 * runtime can plug in a real telemetry sink (Sentry, Datadog, etc.)
 * in one place.
 *
 * The default sink writes to `console.warn` / `console.info` /
 * `console.error` in __DEV__ and is silent in production. Hosts can
 * call `aiLog.setSink(customSink)` to override.
 *
 * Records are intentionally narrow:
 *   level: 'info' | 'warn' | 'error'
 *   scope: short string identifying the call site
 *   message: free text
 *   data?: optional structured payload (errors, durations, IDs)
 */

export type AiLogLevel = 'info' | 'warn' | 'error';

export interface AiLogRecord {
  level: AiLogLevel;
  scope: string;
  message: string;
  data?: Record<string, unknown>;
  /** ms since epoch, set automatically. */
  at: number;
}

export type AiLogSink = (record: AiLogRecord) => void;

// ---------------------------------------------------------------------------
// __DEV__ shim — not declared globally on the server. Detect both the RN
// global and Node's NODE_ENV so the same module runs in both places.
// ---------------------------------------------------------------------------

// `__DEV__` is a React Native build-time global. The server tsconfig
// doesn't pull RN's ambient declarations, so we declare the shape
// here as `unknown` and check with `typeof` at runtime.
declare const __DEV__: boolean | undefined;

function isDev(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof __DEV__ !== 'undefined') return Boolean(__DEV__);
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
}

// ---------------------------------------------------------------------------
// Default sink.
// ---------------------------------------------------------------------------

const consoleSink: AiLogSink = (record) => {
  if (!isDev() && record.level === 'info') return;
  const tag = `[ai:${record.scope}]`;
  // eslint-disable-next-line no-console
  const log = console;
  if (record.level === 'error') {
    log.error(tag, record.message, record.data ?? '');
  } else if (record.level === 'warn') {
    log.warn(tag, record.message, record.data ?? '');
  } else {
    log.info(tag, record.message, record.data ?? '');
  }
};

let _sink: AiLogSink = consoleSink;

function emit(level: AiLogLevel, scope: string, message: string, data?: Record<string, unknown>) {
  try {
    _sink({ level, scope, message, data, at: Date.now() });
  } catch {
    // Never let the log channel break the host code path.
  }
}

export const aiLog = {
  info(scope: string, message: string, data?: Record<string, unknown>) {
    emit('info', scope, message, data);
  },
  warn(scope: string, message: string, data?: Record<string, unknown>) {
    emit('warn', scope, message, data);
  },
  error(scope: string, message: string, data?: Record<string, unknown>) {
    emit('error', scope, message, data);
  },
  /** Override the default console sink. Call once at app boot. */
  setSink(sink: AiLogSink) {
    _sink = sink;
  },
  /** Reset to the default console sink (mostly for tests). */
  resetSink() {
    _sink = consoleSink;
  },
};
