/**
 * v28.x — behavioral verification for the useReduceMotion web downgrade guard.
 *
 * The bug this pins down: on mobile/touch web the useState initializer
 * correctly defaults the flag to true (coarse-pointer mobile-Safari crash
 * guard, static-preview flags), but the AccessibilityInfo effect then
 * resolved `(prefers-reduced-motion)` — false on a phone whose OS toggle is
 * off — and unconditionally setReduce(false), clobbering the guard and
 * re-enabling the continuous orb/reveal loops the guard exists to prevent.
 *
 * The fix contract verified here:
 *   - web: the AccessibilityInfo result (initial readback AND
 *     reduceMotionChanged events) may RAISE the flag but never LOWER it
 *     below the web floor (coarse pointer / __puraStaticPreview__ /
 *     localStorage preview flag);
 *   - web without a floor: the flag still toggles both ways;
 *   - native: behavior unchanged — the OS setting toggles both ways.
 *
 * The real hook module is exercised (not a re-implementation): 'react' is
 * stubbed with a minimal useState/useEffect runtime, 'react-native' with a
 * scriptable Platform + AccessibilityInfo, and `window.matchMedia` with a
 * per-scenario mock — all swapped in via Module._load before the hook loads.
 *
 * Run with:
 *   npx tsx scripts/verifyReduceMotion.ts
 *
 * Exits 1 on any contract violation so CI / pre-commit can pick it up.
 */

import Module from 'node:module';
import { createRequire } from 'node:module';

// ---------------------------------------------------------------------------
// Scriptable environment (mutated per scenario).
// ---------------------------------------------------------------------------

const env = {
  platformOS: 'web' as 'web' | 'ios' | 'android',
  /** What AccessibilityInfo.isReduceMotionEnabled() resolves to. */
  osReduceMotion: false,
  /** `(pointer: coarse)` media query result. */
  coarsePointer: false,
  /** `(prefers-reduced-motion: reduce)` media query result. */
  prefersReduced: false,
  /** `window.__puraStaticPreview__` design-audit flag. */
  staticPreviewProp: false,
  /** `localStorage.__pura_static_preview__ === '1'` design-audit flag. */
  localStorageFlag: false,
  rmListeners: [] as Array<(enabled: boolean) => void>,
};

function resetEnv(overrides: Partial<typeof env> = {}) {
  env.platformOS = 'web';
  env.osReduceMotion = false;
  env.coarsePointer = false;
  env.prefersReduced = false;
  env.staticPreviewProp = false;
  env.localStorageFlag = false;
  env.rmListeners = [];
  Object.assign(env, overrides);
}

(globalThis as any).window = {
  get __puraStaticPreview__() {
    return env.staticPreviewProp ? true : undefined;
  },
  matchMedia: (query: string) => ({
    matches: query.includes('pointer: coarse')
      ? env.coarsePointer
      : query.includes('prefers-reduced-motion')
        ? env.prefersReduced
        : false,
  }),
  localStorage: {
    getItem: (key: string) =>
      key === '__pura_static_preview__' && env.localStorageFlag ? '1' : null,
  },
};

// ---------------------------------------------------------------------------
// Minimal hook runtime (only what useReduceMotion needs: useState + a
// mount-once `[]`-deps useEffect). setState re-renders synchronously.
// ---------------------------------------------------------------------------

interface Runtime {
  states: any[];
  inited: boolean[];
  effects: Array<{ fn: () => any; ran: boolean }>;
  cursor: number;
  effectCursor: number;
  hook: () => any;
  value: any;
}

let rt: Runtime | null = null;

function renderHook() {
  const r = rt!;
  r.cursor = 0;
  r.effectCursor = 0;
  r.value = r.hook();
}

function mount(hook: () => any): void {
  rt = {
    states: [],
    inited: [],
    effects: [],
    cursor: 0,
    effectCursor: 0,
    hook,
    value: undefined,
  };
  renderHook();
  for (const e of rt.effects) {
    if (!e.ran) {
      e.ran = true;
      e.fn();
    }
  }
}

const ReactStub = {
  useState(init: any) {
    const r = rt!;
    const i = r.cursor++;
    if (!r.inited[i]) {
      r.states[i] = typeof init === 'function' ? init() : init;
      r.inited[i] = true;
    }
    const owner = r;
    const set = (next: any) => {
      if (rt !== owner) return; // stale update from a previous scenario
      const v = typeof next === 'function' ? next(owner.states[i]) : next;
      if (Object.is(v, owner.states[i])) return;
      owner.states[i] = v;
      renderHook();
    };
    return [r.states[i], set];
  },
  useEffect(fn: () => any, _deps?: any[]) {
    const r = rt!;
    const i = r.effectCursor++;
    // The hook only uses `[]` deps → mount-once, never re-run.
    if (!r.effects[i]) r.effects[i] = { fn, ran: false };
  },
};

const RNStub = {
  Platform: {
    get OS() {
      return env.platformOS;
    },
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(env.osReduceMotion),
    addEventListener: (_event: string, handler: (enabled: boolean) => void) => {
      env.rmListeners.push(handler);
      return {
        remove: () => {
          env.rmListeners = env.rmListeners.filter((h) => h !== handler);
        },
      };
    },
  },
};

const StoreStub = {
  useAppStore: (selector: (s: any) => any) =>
    selector({ motionPreference: 'system' }),
};

// ---------------------------------------------------------------------------
// Swap the stubs in at the CJS loader, then load the REAL hook module.
// ---------------------------------------------------------------------------

const realLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'react') return ReactStub;
  if (request === 'react-native') return RNStub;
  if (request === '@/store/useAppStore') return StoreStub;
  return realLoad.call(this, request, parent, isMain);
};

const requireCJS = createRequire(import.meta.url);
const { useReduceMotion } = requireCJS('../src/hooks/useReduceMotion') as {
  useReduceMotion: () => boolean;
};

// ---------------------------------------------------------------------------
// Assertion plumbing.
// ---------------------------------------------------------------------------

let passCount = 0;
let failCount = 0;

function check(label: string, actual: unknown, expected: unknown) {
  if (Object.is(actual, expected)) {
    passCount++;
    console.log(`  ✓ ${label}`);
  } else {
    failCount++;
    console.log(`  ✗ ${label} — expected ${expected}, got ${actual}`);
  }
}

/** Let the isReduceMotionEnabled() promise chain settle. */
const flushEffects = () => new Promise<void>((r) => setTimeout(r, 0));

const fireReduceMotionChanged = (enabled: boolean) =>
  env.rmListeners.forEach((h) => h(enabled));

const flag = () => rt!.value as boolean;

// ---------------------------------------------------------------------------
// Scenarios.
// ---------------------------------------------------------------------------

async function run() {
  console.log('useReduceMotion — web downgrade-guard verification\n');

  // — A — the production posture this guard exists for ----------------------
  console.log('A. Mobile/touch web (coarse pointer), OS reduce-motion OFF');
  resetEnv({ coarsePointer: true });
  mount(useReduceMotion);
  check('initializer defaults to reduced motion', flag(), true);
  await flushEffects();
  check(
    'AccessibilityInfo readback (false) does NOT clobber the guard',
    flag(),
    true
  );
  fireReduceMotionChanged(false);
  check('reduceMotionChanged(false) does NOT clobber the guard', flag(), true);
  fireReduceMotionChanged(true);
  fireReduceMotionChanged(false);
  check('guard survives an on→off OS-setting round trip', flag(), true);

  // — B — design-audit static-preview floors --------------------------------
  console.log('\nB. Desktop web with __puraStaticPreview__ flag');
  resetEnv({ staticPreviewProp: true });
  mount(useReduceMotion);
  check('initializer honors __puraStaticPreview__', flag(), true);
  await flushEffects();
  check('flag stays true after the effect resolves', flag(), true);

  console.log('\nC. Desktop web with localStorage static-preview flag');
  resetEnv({ localStorageFlag: true });
  mount(useReduceMotion);
  check('initializer honors the localStorage flag', flag(), true);
  await flushEffects();
  check('flag stays true after the effect resolves', flag(), true);

  // — D — no floor on web: flag must still move BOTH ways -------------------
  console.log('\nD. Desktop web (fine pointer), no flags');
  resetEnv();
  mount(useReduceMotion);
  check('starts false', flag(), false);
  await flushEffects();
  check('stays false after the effect resolves', flag(), false);
  fireReduceMotionChanged(true);
  check('browser pref turning ON raises the flag', flag(), true);
  fireReduceMotionChanged(false);
  check('browser pref turning OFF lowers the flag (no floor)', flag(), false);

  console.log('\nE. Desktop web, prefers-reduced-motion ON');
  resetEnv({ prefersReduced: true, osReduceMotion: true });
  mount(useReduceMotion);
  check('initializer honors prefers-reduced-motion', flag(), true);
  await flushEffects();
  check('flag stays true after the effect resolves', flag(), true);

  // — F — native must be untouched by the fix -------------------------------
  console.log('\nF. Native iOS, OS setting off at mount');
  resetEnv({ platformOS: 'ios' });
  mount(useReduceMotion);
  check('starts false', flag(), false);
  await flushEffects();
  check('stays false after the effect resolves', flag(), false);
  fireReduceMotionChanged(true);
  check('OS setting ON raises the flag', flag(), true);
  fireReduceMotionChanged(false);
  check('OS setting OFF lowers the flag (native toggles both ways)', flag(), false);

  console.log('\nG. Native iOS, OS setting on at mount');
  resetEnv({ platformOS: 'ios', osReduceMotion: true });
  mount(useReduceMotion);
  check('starts false before the readback', flag(), false);
  await flushEffects();
  check('AccessibilityInfo readback raises the flag', flag(), true);

  // — summary ----------------------------------------------------------------
  console.log(`\n${'═'.repeat(60)}`);
  if (failCount > 0) {
    console.log(`✗ FAIL — ${failCount} violation(s), ${passCount} passed`);
    process.exit(1);
  }
  console.log(`✓ PASS — all ${passCount} checks passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
