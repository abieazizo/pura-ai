# Pura AI

Premium AI skincare app. React Native (Expo SDK 54), TypeScript strict, Zustand, React Navigation v7.

Skincare that works for you. The app uses the camera to see your skin, tracks what's changing, and builds a routine from what it observes — not from a 15-question quiz.

## Setup

```bash
npm install
```

### Run

```bash
npx expo start          # Metro bundler, choose a target
npx expo run:ios        # iOS simulator / device build
npx expo run:android    # Android emulator / device build
```

### Type check

```bash
npm run tsc
```

## Dev tools

In development builds (`__DEV__`), a `global.pura` console is installed (see `src/utils/devConsole.ts`). Open the JS debugger and call any of:

| Command | What it does |
| --- | --- |
| `global.pura.populate()` | Loads the populated user with 3 scans, full routine, matches. |
| `global.pura.reset()` | Wipes the store back to a brand-new user experience. |
| `global.pura.setDay(N)` | Shifts the first scan's timestamp so `dayNumber()` returns `N`. |
| `global.pura.addScan()` | Pushes a new scan based on the next seed template. |
| `global.pura.whoami()` | Logs the current derived state (user, scan count, day, streak, %). |

The same actions are exposed as buttons in the Profile sheet's **DEV TOOLS** section.

You can also long-press your avatar for 3 seconds on Home to load the populated demo state.

## Architecture

| Concern | Where |
| --- | --- |
| Design tokens | `src/theme/tokens.ts` (colors, type, space, radius, shadow, motion, layout) |
| Theming | `src/theme/ThemeProvider.tsx` + `useTheme()` |
| Global state | `src/store/useAppStore.ts` (Zustand, persisted via AsyncStorage) |
| Data layer | `src/api/` (`scan.ts`, `assistant.ts`, `products.ts`) — Promise-based so a real backend drops in |
| Mock seed | `src/data/seed.ts` — 24 products, 3-scan populated history, routine |
| Copy | `src/copy/strings.ts` — every user-visible string lives here |
| Navigation | `src/navigation/` (Root stack, MainTabs with custom `FloatingTabBar`, Scan modal, Onboarding) |
| Screens | `src/screens/` (folder per screen) |
| Components | `src/components/` (reusable, typed, memoized where list-rendered) |
| Hooks | `src/hooks/` (`useHasScanned`, `useLatestScan`, `useProfileSheet`, `useReduceMotion`) |
| Derivations | `src/utils/insights.ts` (day number, streak, cycle %, zone deltas — never hardcoded) |
| Haptics | `src/utils/haptics.ts` — unified `hapt.tap()` / `success()` / `warning()` / `select()` vocabulary |

## Design non-negotiables

1. **Tab bar** is 4 slots + an **absolutely-positioned FAB overlay**. Labels never wrap (`ASSISTANT` → `ASSIST` for iPhone SE fit).
2. **Product names never truncate.** `numberOfLines` is never set on product name `Text`.
3. **Every main screen branches on `hasScanned()`.** New users see zero fabricated data.
4. **All colors come from `tokens.ts`.** Grep `#[0-9A-Fa-f]{3,6}` outside `tokens.ts` → 0 matches.
5. **Day number, streak, and cycle % are derived** from `scans[]` + `user.joinedAt`. Never hardcoded.

## Notes

- Scan analysis is mocked. Replace `src/api/scan.ts` with a real CoreML / Vision backend for production.
- The assistant is pattern-matched in `src/utils/assistantMock.ts`. Swap with the Claude API (or any LLM) for real replies.
- No network calls leave the device in the current build. Photos are held locally via expo-image caching.

## Reduce Motion

The app observes `AccessibilityInfo.isReduceMotionEnabled()` (`src/hooks/useReduceMotion.ts`) and replaces pulsing/infinite animations with static variants when enabled.
