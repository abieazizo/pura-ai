/**
 * Every user-visible string lives here. Screens never embed strings inline.
 *
 * Grouped by screen/feature. A few string builders take arguments so that
 * dynamic copy (day numbers, counts, percentages) stays declarative at the
 * call site.
 */

export const app = {
  name: 'Pura AI',
  tagline: 'Skincare that knows what it’s looking at.',
};

export const splash = {
  loading: '',
};

export const errors = {
  genericTitle: 'Something went wrong.',
  genericBody: 'Try again in a moment.',
  rehydrateTitle: 'Couldn’t load your data',
  rehydrateBody: 'We had trouble reading your saved profile. Try again.',
  scanTitle: 'Couldn’t analyze the photo',
  scanBody: 'Give it one more try — lighting can make a big difference.',
  cameraError: 'Camera error',
  save: 'Couldn’t save',
  send: 'Failed · tap to retry',
};

export const camera = {
  deniedTitle: 'Camera access is off',
  deniedBody:
    'Pura needs camera access to scan your skin. Turn it on in Settings.',
  openSettings: 'Open Settings',
  notNow: 'Not now',
};

export const common = {
  close: 'Close',
  cancel: 'Cancel',
  continue: 'Continue',
  skip: 'Skip',
  back: 'Back',
  retry: 'Try again',
  seeAll: 'See all',
  loading: 'Loading…',
  onDevice: 'On-device',
};

/**
 * Tab labels. v10.16 — five tabs: HOME · SCAN · PRODUCTS · ROUTINE ·
 * AI ASSIST. Progress is not a standalone tab; its trend / biggest
 * win / before-after content lives as a segmented sub-tab inside the
 * ROUTINE destination so the daily action center and long-term
 * trajectory occupy one destination rather than two.
 *
 * `progress` is retained as a label for the inner segmented control
 * and for section kickers; it no longer points at a tab. (v10.13–v10.15
 * mistakenly routed the RoutineTab through `tabs.progress`; v10.16
 * switches it to `tabs.routine` so the tab label matches the default
 * segment.)
 */
// v26 — bottom-nav architecture is LOCKED: HOME / PRODUCTS / SCAN /
// ROUTINE / AI ASSIST. The v23.1 rebrand of these labels to "COACH"
// and "SHELF" was reversed because they obscured what each tab does
// (AI Assist is the assistant tab; Products is the product surface)
// and contradicted the central spec for the v26 home rebuild.
// Route names in `RootStackParamList` / `MainTabsParamList` are
// UNCHANGED so navigation flows are not affected.
// v29 — Floating-dock rebuild for the Pura Shop visual rebuild.
// Labels are now title-case to match the approved storefront screenshot
// ("Home / Shop / Scan / Routine / Me"). AI Assist remains reachable via
// the Me tab — its label is preserved here so any surface still wiring
// to the AssistantTab (Home command center, Routine helper, etc.) keeps
// reading from a single source. "Products" is retained for back-compat
// with telemetry/strings consumers but the visible tab now reads "Shop".
export const tabs = {
  home: 'Home',
  scan: 'Scan',
  routine: 'Routine',
  progress: 'PROGRESS',
  assist: 'AI Assist',
  products: 'Shop',
  me: 'Me',
};

export const onboarding = {
  slides: [
    {
      eyebrow: 'MEET PURA',
      title: 'Skincare that knows what it’s looking at.',
      body: 'Not guessing. Not quizzing. Seeing.',
    },
    {
      eyebrow: 'WE SEE, WE DON’T GUESS',
      title: 'A thirty-second reading of your skin.',
      body: 'Pura reads the zones of your skin — without ever asking fifteen questions.',
    },
    {
      eyebrow: 'WATCH IT WORK',
      title: 'Compare your skin, day by day.',
      body: 'Photos, zones, and real change over time. No hype. Just proof.',
    },
  ],
  getStarted: 'Begin',
  nameEntryTitle: 'What should we call you?',
  nameEntrySub: 'Your first name is plenty.',
  namePlaceholder: 'Your first name',
  avatarPickerTitle: 'Pick your mark.',
  avatarPickerSub: 'A color for your corner of the app.',
  intoTheApp: 'Enter Pura',
};

export const home = {
  profileDate: (weekday: string, date: string, day: number, streak: number) =>
    `${date} · Day ${day} · ${streak}-day streak`,
  profileDateNoScan: (weekday: string, date: string) => `${date}`,

  // Empty state
  emptyHero: 'Welcome.',
  emptySub: 'Let’s see what your skin is telling us.',
  emptyCta: 'Begin first scan',
  whyPuraLabel: 'How this works',
  whyPura: [
    {
      title: 'We see, we don’t guess.',
      body: 'Computer vision reads your skin directly — no fifteen-question quiz.',
    },
    {
      title: 'On-device privacy.',
      body: 'Scans are processed on your phone. Photos stay yours.',
    },
    {
      title: 'Tracks what’s changing.',
      body: 'Compare week to week. See progress you can actually point at.',
    },
  ],

  // Populated state
  routineLabel: (done: number, total: number) => `MORNING ROUTINE · ${done}/${total}`,
  whyThisProduct: 'Why this product?',
  tonight: 'Tonight',
  tonightMeta: (steps: number, startsAt: string) => `${steps} steps · Starts at ${startsAt}`,
  routineAllDone: 'Morning routine complete.',
  routineAllDoneSub: 'See you tonight at 9:30 PM.',
  nextStepBadge: (order: number) => `STEP ${order} · NEXT`,
  markDone: 'Mark done',
  marked: 'Done',
  progressCompareLabel: 'YOUR PROGRESS',
  progressDay1Label: 'Day 1',
  progressLatestLabel: (day: number) => `Day ${day}`,
  progressSuccessLine: (label: string, percent: number, days: number) =>
    `${label} clarity ↑ ${percent}% · ${days} days`,
};

export const products = {
  title: 'Products',
  searchPlaceholder: 'Search cleansers, serums…',
  wishlist: 'Wishlist',
  allCategory: 'All',
  categoryLabels: {
    cleanser: 'Cleanser',
    toner: 'Toner',
    serum: 'Serum',
    moisturizer: 'Moisturizer',
    spf: 'SPF',
    treatment: 'Treatment',
    mask: 'Mask',
  },
  unlockTitle: 'Unlock personalized matches',
  unlockBody: 'Take a quick skin scan for recommendations made for your skin.',
  unlockCta: 'Start a scan',
  forYouLabel: 'FOR YOU',
  forYouEmptyPreScan: 'Scan first. I’ll match from there.',
  allLabel: 'ALL PRODUCTS',
  emptySearch: (q: string) => `No products match “${q}”.`,

  // editorial empty state for the wishlist view
  wishlistEmptyTitle: 'Nothing saved yet.',
  wishlistEmptyBody: 'Tap the heart on any product to keep it here.',
};

export const productDetail = {
  tabs: {
    why: 'Why this works',
    ingredients: 'Ingredients',
    howToUse: 'How to use',
    reviews: 'Reviews',
  },
  heartAdd: 'Add to wishlist',
  heartRemove: 'In wishlist',
  findToBuy: 'Find where to buy',
  matchLabel: (n: number) => `${n}% match`,
  matchGoodStatus: 'Great match for your skin.',
  matchOkStatus: 'Worth considering — watch how your skin reacts.',
  matchLowStatus: 'Probably not for you right now.',
  keyIngredients: 'Key ingredients',
  howToUseMock: [
    'Apply to clean skin, morning or evening.',
    'Start with every other day; work up to daily as tolerated.',
    'Follow with moisturizer. Always use SPF during the day.',
  ],
  reviewsEmpty: 'Reviews roll out in a later release.',
};

export const scan = {
  modeFace: 'Face',
  modeProduct: 'Product',
  closeLabel: 'Close scan',
  shutterLabel: 'Capture scan',
  hintFace: 'Center your full face. We’ll check the photo before analyzing.',
  hintProduct: 'Frame the label or barcode.',
  analyzing: {
    singleFaceLine: 'Reading your skin.',
    singleProductLine: 'Reading the ingredients.',
    faceSteps: [
      'Reading your skin.',
      'Measuring clarity…',
      'Comparing to your Day 1…',
    ],
    productSteps: [
      'Reading the ingredients.',
      'Checking flags…',
    ],
  },
  resultsFaceTitle: 'Here’s what I see.',
  resultsFaceCompare: 'Compare to Day 1',
  resultsProductTitle: 'Match for your skin.',
  whyMatches: 'Why this matches',
  headsUp: 'Heads up',
  addWishlist: 'Add to wishlist',
  findSimilar: 'Find similar',
  // v35 Pass-1 — State 7 "The Door". Replaces "Camera access needed"
  // with the Pura voice: dignified, not begging. Single-line italic
  // headline (rendered via fontFamily override in ScanCaptureScreen),
  // one quiet body sentence, paper-card Settings CTA.
  permissionTitle: 'Camera is off.',
  permissionBody:
    'Turn it on in Settings to give Pura something to read.',
  permissionEnable: 'Open Settings',
};

export const assistant = {
  title: 'AI Assist',
  subtitle: 'Ask about your scan, routine, or products.',
  emptyTitle: 'Tonight, keep it simple.',
  emptyBody: 'Ask about your scan, routine, or products.',
  attachHint: '',
  composerPlaceholder: 'Ask Pura about your skin…',
  forYouLabel: 'FOR YOU',
  promptsEmpty: [
    'What should I do tonight?',
    'Why did my score change?',
    'What should I avoid?',
    'Which product comes first?',
    'Is my skin improving?',
    'Can I exfoliate tonight?',
  ],
  promptsFor: (_zone: string) => [
    'What should I do tonight?',
    'Why did my score change?',
    'What should I avoid?',
    'Which product comes first?',
    'Is my skin improving?',
    'Can I exfoliate tonight?',
  ],
  statusReady: 'Based on today’s scan',
  statusThinking: 'Reading your scan…',
  typing: 'Reading…',
  mockResponseIntro: 'Based on your latest scan—',
};

export const progress = {
  title: 'Progress',
  dayBadge: (n: number) => `DAY ${n}`,
  cyclePercent: (p: number) => `${p}% through your first skin cycle.`,
  cycleTooltip: 'A skin cycle is eighty-four days.',
  emptyTitle: 'Nothing to compare yet.',
  emptyBody: 'One scan, and the before starts being recorded. Two, and the after begins.',
  emptyCta: 'Begin first scan',
  oneScanTitle: 'One more to unlock side-by-side.',
  oneScanBody: 'Two scans is all it takes to see real change.',
  oneScanCta: 'Scan again',
  compareLabel: 'DRAG TO COMPARE',
  changesHeading: 'What’s changed since Day 1',
};

export const profileSheet = {
  memberSince: (d: string) => `Member since ${d}`,
  rows: {
    skinProfile: 'Skin profile',
    notifications: 'Notifications',
    privacy: 'Privacy',
    appearance: 'Appearance',
    help: 'Help & support',
    about: 'About Pura AI',
  },
  privacyBadge: 'On-device scans only',
  signOut: 'Sign out',
  devToggleNewUser: 'Reset to new user',
  devTogglePopulated: 'Load demo data',
  devResetAll: 'Wipe all data',
};

export const zoneStatusLabel = {
  active: 'ACTIVE',
  monitor: 'MONITOR',
  calm: 'CALM',
} as const;

export const zoneTrendLabel = {
  improving: 'Improving',
  stable: 'Stable',
  worsening: 'Worsening',
} as const;
