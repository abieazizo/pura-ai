/**
 * Every user-visible string lives here. Screens never embed strings inline.
 *
 * Grouped by screen/feature. A few string builders take arguments so that
 * dynamic copy (day numbers, counts, percentages) stays declarative at the
 * call site.
 */

export const app = {
  name: 'Pura AI',
  tagline: 'Skincare that knows what it\u2019s looking at.',
};

export const splash = {
  loading: '',
};

export const errors = {
  genericTitle: 'Something went wrong.',
  genericBody: 'Try again in a moment.',
  rehydrateTitle: 'Couldn\u2019t load your data',
  rehydrateBody: 'We had trouble reading your saved profile. Try again.',
  scanTitle: 'Couldn\u2019t analyze the photo',
  scanBody: 'Give it one more try \u2014 lighting can make a big difference.',
  cameraError: 'Camera error',
  save: 'Couldn\u2019t save',
  send: 'Failed \u00b7 tap to retry',
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
  loading: 'Loading\u2026',
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
export const tabs = {
  home: 'HOME',
  scan: 'SCAN',
  routine: 'ROUTINE',
  progress: 'PROGRESS',
  assist: 'AI ASSIST',
  products: 'PRODUCTS',
};

export const onboarding = {
  slides: [
    {
      eyebrow: 'MEET PURA',
      title: 'Skincare that knows what it\u2019s looking at.',
      body: 'Not guessing. Not quizzing. Seeing.',
    },
    {
      eyebrow: 'WE SEE, WE DON\u2019T GUESS',
      title: 'A thirty-second reading of your skin.',
      body: 'Pura reads the zones of your skin \u2014 without ever asking fifteen questions.',
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
  emptySub: 'Let\u2019s see what your skin is telling us.',
  emptyCta: 'Begin first scan',
  whyPuraLabel: 'How this works',
  whyPura: [
    {
      title: 'We see, we don\u2019t guess.',
      body: 'Computer vision reads your skin directly \u2014 no fifteen-question quiz.',
    },
    {
      title: 'On-device privacy.',
      body: 'Scans are processed on your phone. Photos stay yours.',
    },
    {
      title: 'Tracks what\u2019s changing.',
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
    `${label} clarity \u2191 ${percent}% \u00b7 ${days} days`,
};

export const products = {
  title: 'Products',
  searchPlaceholder: 'Search cleansers, serums\u2026',
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
  forYouEmptyPreScan: 'Scan first. I\u2019ll match from there.',
  allLabel: 'ALL PRODUCTS',
  emptySearch: (q: string) => `No products match \u201C${q}\u201D.`,

  // §4.5 — editorial empty state for the wishlist view
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
  matchOkStatus: 'Worth considering \u2014 watch how your skin reacts.',
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
  // v11.7 — honest face-mode hint. The Caption component owns the
  // rotating in-camera tips; this short line is reserved for any
  // ambient surface (e.g. tutorials) that needs a single one-liner.
  hintFace: 'Center your full face. We’ll check the photo before analyzing.',
  hintProduct: 'Frame the label or barcode.',
  analyzing: {
    // §4.6 — a single quiet line during analysis. The Mark's pulse does the
    // "something is happening" work. No cycling progress captions.
    singleFaceLine: 'Reading your skin.',
    singleProductLine: 'Reading the ingredients.',
    // Retained so older flows still compile; first entry is the canonical one.
    faceSteps: [
      'Reading your skin.',
      'Measuring clarity\u2026',
      'Comparing to your Day 1\u2026',
    ],
    productSteps: [
      'Reading the ingredients.',
      'Checking flags\u2026',
    ],
  },
  resultsFaceTitle: 'Here\u2019s what I see.',
  resultsFaceCompare: 'Compare to Day 1',
  resultsProductTitle: 'Match for your skin.',
  // Italicized portion appears in HeroHeadline — the serif italic rendering
  // picks the trailing word(s) automatically, no need to mark it up here.
  whyMatches: 'Why this matches',
  headsUp: 'Heads up',
  addWishlist: 'Add to wishlist',
  findSimilar: 'Find similar',
  permissionTitle: 'Camera access needed',
  permissionBody:
    'Pura uses your camera to see your skin in detail. Your photos stay on this device.',
  permissionEnable: 'Enable camera',
};

export const assistant = {
  title: 'Ask',
  // v10 — subtitles retuned. "I've been watching" was too vague and
  // verging on uncanny. Each subtitle now points at the evidence base
  // (the scan) so the assistant reads as grounded, not voyeuristic.
  // v11.3 — chrome trimmed. Title + (former) subtitle were stacked
  // even on first open; now only the warm empty-body greeting remains.
  subtitle: '',
  emptyTitle: 'Hey \u2014 what do you need?',
  emptyBody: 'Ask about your scan, your routine, or any product.',
  // v11.3 \u2014 attach hint removed; the "+" icon in the composer
  // already communicates the affordance.
  attachHint: '',
  composerPlaceholder: 'Ask anything\u2026',
  forYouLabel: 'FOR YOU',
  // v10.3 — expanded rotating pool. The UI picks 4 at a time (shuffled
  // per mount, plus a slow rotation) so the assistant feels alive without
  // demanding attention. Lead prompts are scan-aware when a zone is
  // known; the always-on pool covers score/plan/product/progress angles.
  promptsEmpty: [
    'How does the Skin Score work?',
    'What should I expect in the first two weeks?',
    'Show natural product options.',
    'What\u2019s the difference between a serum and a toner?',
    'Which ingredients calm irritation?',
    'What would an evening routine look like for me?',
  ],
  promptsFor: (zone: string) => [
    'Why did my Skin Score move?',
    `What helps my ${zone} breakout?`,
    'Compare my last two scans.',
    'Show natural product options.',
    'What should I do tonight?',
    `What\u2019s causing my ${zone} to flare?`,
    'Which ingredient should I avoid right now?',
    'What would a gentler routine look like?',
    'Show fragrance-free alternatives.',
    'What\u2019s the one product I should add?',
  ],
  // v10.3 — active brand-status labels. Live pulse under "Ready" reads
  // as attentive, not idle; "Thinking" reads as engaged.
  statusReady: 'Ready',
  statusThinking: 'Thinking',
  typing: 'Reading\u2026',
  mockResponseIntro: 'Looking at your most recent scan\u2014',
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
  changesHeading: 'What\u2019s changed since Day 1',
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
