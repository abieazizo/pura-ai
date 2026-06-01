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

/**
 * Copy for the Me-tab settings destinations (Skin profile, Notifications,
 * Privacy, Appearance, Help, About). One source of truth so the screens
 * never embed strings inline.
 */
export const meSettings = {
  // ----- Skin profile -----
  skinProfile: {
    title: 'Skin profile',
    intro: 'This is what Pura uses to read your scans and match products. Update it any time — your next scan will use it.',
    notSet: 'Not set',
    sections: {
      skinType: 'Skin type',
      concerns: 'Top concerns',
      concernsHint: 'Choose up to 3',
      sensitivity: 'Reactivity',
      goal: 'Goal this cycle',
      sun: 'Sun exposure',
      effort: 'Routine effort',
      age: 'Age range',
      hormones: 'Hormonal context',
      optionalHint: 'Optional',
    },
    concernsCapped: 'Up to 3 keeps your plan focused.',
    skinType: {
      oily: 'Oily',
      dry: 'Dry',
      combination: 'Combination',
      balanced: 'Balanced',
      not_sure: 'Not sure',
    },
    sensitivity: {
      very: 'Very reactive',
      somewhat: 'Somewhat reactive',
      not: 'Not very reactive',
      unsure: 'Not sure',
    },
    goal: {
      clear: 'Clearer skin',
      calm: 'Calmer skin',
      smoother: 'Smoother texture',
      bright: 'Brighter tone',
      barrier: 'Stronger barrier',
    },
    sun: {
      rarely: 'Mostly indoors',
      sometimes: 'Mixed',
      often: 'Outdoors often',
      unsure: 'It changes',
    },
    effort: {
      minimal: 'Minimal',
      moderate: 'Balanced',
      enthusiast: 'Advanced',
      'decide-for-me': 'Decide for me',
    },
    age: {
      under_18: 'Under 18',
      '18-24': '18–24',
      '25-34': '25–34',
      '35-44': '35–44',
      '45-54': '45–54',
      '55+': '55+',
      prefer_not_to_say: 'Prefer not to say',
    },
    hormones: {
      none: 'None right now',
      cycle: 'Monthly cycle',
      pregnancy_postpartum: 'Pregnancy / postpartum',
      menopause: 'Menopause',
      hrt: 'HRT',
      prefer_not_to_say: 'Prefer not to say',
    },
    concerns: ['Breakouts', 'Redness', 'Dryness', 'Texture', 'Dark spots', 'Dullness', 'Oiliness', 'Sensitivity'],
  },

  // ----- Notifications -----
  notifications: {
    title: 'Notifications',
    intro: 'Pura keeps it to one gentle nudge — a nightly reminder to scan in similar light so your comparisons stay honest.',
    reminderLabel: 'Nightly scan reminder',
    reminderMeta: (time: string) => `Every evening at ${time}`,
    reminderMetaOff: 'Off',
    timeLabel: 'Reminder time',
    unavailable: "Reminders aren't available on this device. They work on the iOS and Android app.",
    deniedTitle: 'Notifications are off',
    deniedBody: 'Turn them on for Pura in your device Settings, then flip this back on.',
  },

  // ----- Privacy -----
  privacy: {
    title: 'Privacy',
    intro: 'Your skin is personal. Here is exactly how Pura handles it.',
    points: [
      {
        title: 'Scans are read on your device',
        body: 'Your face scans are analyzed locally. Photos stay on your phone — they are not uploaded to a server.',
      },
      {
        title: 'Your profile stays on your phone',
        body: 'Skin type, concerns, routine, and history are stored locally on this device, not in the cloud.',
      },
      {
        title: 'No selling your data',
        body: 'Pura does not sell or share your skin data with advertisers. Ever.',
      },
    ],
    dataTitle: 'Your data',
    eraseLabel: 'Erase all my data',
    eraseMeta: 'Deletes your profile, scans, routine, and history from this device.',
    eraseConfirmTitle: 'Erase all data?',
    eraseConfirmBody: 'This permanently deletes your profile, scans, routine, and saved products from this device. This cannot be undone.',
    eraseConfirmCta: 'Erase everything',
    cancel: 'Cancel',
  },

  // ----- Appearance -----
  appearance: {
    title: 'Appearance',
    // Honest framing: Pura ships a single light theme by design. We do not
    // fake a dark toggle that wouldn't actually repaint the app.
    themeLabel: 'Theme',
    themeValue: 'Light',
    themeNote: 'Pura is designed as one calm, luminous light experience. A dark theme isn’t available yet.',
    lightingTitle: 'Scan lighting',
    lightingLabel: 'Lighting Assist',
    lightingMeta: 'Adds a soft on-screen glow during face scans so low light still reads clearly.',
  },

  // ----- Help & support -----
  help: {
    title: 'Help & support',
    intro: 'Quick answers to the things people ask most.',
    faqs: [
      {
        q: 'How does the skin scan work?',
        a: 'Point the front camera at your face in even light. Pura reads your skin zones on-device and turns them into a score, your top concerns, and one clear next step.',
      },
      {
        q: 'How often should I scan?',
        a: 'Once a night is plenty. Use similar lighting each time so week-to-week comparisons mean something.',
      },
      {
        q: 'Why did my score change?',
        a: 'Scores move with lighting, hydration, and real change. Pura weighs trends over single scans, so one off-night won’t define your progress.',
      },
      {
        q: 'How are products matched to me?',
        a: 'Pura filters the catalog against your skin profile and latest scan first, then explains why the top pick fits. You’re always shown the reasoning, never just a star rating.',
      },
    ],
    moreTitle: 'Still stuck?',
    moreBody: 'More support options are on the way. For now, the answers above cover the most common questions.',
  },

  // ----- About -----
  about: {
    title: 'About',
    tagline: 'Skincare that knows what it’s looking at.',
    versionLabel: 'Version',
    mission: 'Pura is a trusted skin coach, not a chatbot demo. Every session answers three things: what matters about your skin today, what to do next, and what to buy — if anything.',
    madeWith: 'Made with care for your skin.',
  },
} as const;

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
