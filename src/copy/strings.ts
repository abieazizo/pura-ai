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
  // ----- Shared save feedback (used across all settings pages) -----
  saved: {
    justNow: 'Saved just now',
    toast: 'Saved.',
    toastNextScan: 'Saved. Your next scan will use this.',
    done: 'Done.',
    undo: 'Undo',
  },

  // ----- Skin profile -----
  skinProfile: {
    title: 'Skin profile',
    intro: 'This is what Pura reads your scans against and matches products to. Update it any time — your next scan uses it.',
    notSet: 'Not set',
    // Completion summary card.
    completion: {
      heading: 'Profile strength',
      affectsLink: 'What this affects',
      countTemplate: (done: number, total: number) => `${done} of ${total} answered`,
      low: 'A fuller profile sharpens every scan and product match.',
      mid: 'Looking good. A couple more answers and your matches get sharper.',
      high: 'Your profile is rich — scans and matches are tuned to you.',
    },
    // "What this affects" sheet.
    affectsSheet: {
      title: 'What your profile affects',
      body: 'Pura uses these answers to read your scans and rank products:',
      bullets: [
        'How your skin score is interpreted',
        'Which concerns Pura watches most closely',
        'How safety cautions — like fragrance or pregnancy — shape matches',
        'How gentle or active your routine should be',
      ],
      footnote: 'Nothing here is required. Skip anything and Pura still works.',
    },
    sections: {
      skinType: 'Skin type',
      concerns: 'Top concerns',
      concernsHint: 'Choose up to 3, in order',
      sensitivity: 'Reactivity',
      goal: 'Goal this cycle',
      sun: 'Sun exposure',
      effort: 'Routine effort',
      preferences: 'Product preferences',
      preferencesHint: 'Pura weighs these in every match',
      age: 'Age range',
      hormones: 'Hormonal context',
      optionalHint: 'Optional',
    },
    // Ranked-concern badges.
    rank: { primary: 'Primary', secondary: 'Secondary', watching: 'Watching' },
    concernsRankedHint: 'Order matters — your first pick leads your plan.',
    concernsCapped: 'Three keeps your plan focused. Remove one to swap.',
    skinType: {
      oily: 'Oily',
      dry: 'Dry',
      combination: 'Combination',
      balanced: 'Balanced',
      not_sure: 'Not sure',
    },
    skinTypeHelp: {
      oily: 'Pura leans toward lightweight, non-greasy textures and oil control.',
      dry: 'Pura favors richer moisture and a gentler cleanse.',
      combination: 'Pura balances oil control where you shine with comfort where you’re dry.',
      balanced: 'Pura keeps things simple and protective — no over-correcting.',
      not_sure: 'That’s fine — your scans help Pura learn your skin over time.',
    },
    sensitivity: {
      very: 'Very reactive',
      somewhat: 'Somewhat reactive',
      not: 'Not very reactive',
      unsure: 'Not sure',
    },
    sensitivityHelp: {
      very: 'Pura introduces actives slowly and steers around common irritants.',
      somewhat: 'Pura eases into stronger actives and watches for reactions.',
      not: 'Pura can suggest more active ingredients with less ramp-up.',
      unsure: 'Pura starts gentle until your scans show how you react.',
    },
    goal: {
      clear: 'Clearer skin',
      calm: 'Calmer skin',
      smoother: 'Smoother texture',
      bright: 'Brighter tone',
      barrier: 'Stronger barrier',
    },
    goalInsight: (label: string) =>
      `Pura steers tonight’s plan and your matches toward ${label.toLowerCase()}.`,
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
    effortHelp: {
      minimal: 'A short, high-impact routine — the fewest steps that work.',
      moderate: 'A balanced morning and evening routine.',
      enthusiast: 'Room for targeted actives and extra steps.',
      'decide-for-me': 'Pura picks the routine depth for you.',
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
    hormonesNote: 'Optional and private. This only refines ingredient cautions, like keeping picks pregnancy-safe.',
    concerns: ['Breakouts', 'Redness', 'Dryness', 'Texture', 'Dark spots', 'Dullness', 'Oiliness', 'Sensitivity'],
    // Product preferences — mapped to real safety fields Pura already reads.
    preferences: {
      fragranceFree: 'Fragrance-free',
      pregnancySafe: 'Pregnancy-safe only',
      avoidEssentialOils: 'Avoid essential oils',
      avoidAlcohol: 'Avoid drying alcohols',
      note: 'Pura factors these into every product match and routine suggestion.',
    },
    // Profile management controls.
    controls: {
      title: 'Manage profile',
      privacyLabel: 'How Pura uses this',
      privacyMeta: 'See exactly what’s stored and what leaves your device.',
      exportLabel: 'Export my profile',
      exportMeta: 'Download your profile and scan summary as a JSON file.',
      resetLabel: 'Reset skin profile',
      resetMeta: 'Clears the answers above. Your scans and history stay.',
      resetConfirmTitle: 'Reset skin profile?',
      resetConfirmBody: 'This clears your skin type, concerns, goal, and preferences. Your scans and history are kept, and you can refill it any time.',
      resetConfirmCta: 'Reset profile',
      cancel: 'Cancel',
    },
  },

  // ----- Notifications -----
  notifications: {
    title: 'Notifications',
    intro: 'Pura keeps it to one gentle nudge — a nightly reminder to scan in similar light so your week-to-week comparisons stay honest.',
    // Status card: reflects the real permission / platform state.
    status: {
      onTitle: 'Notifications on',
      onBody: 'You’ll get your nightly reminder at the time below.',
      offTitle: 'Reminder is off',
      offBody: 'Turn it on to get one gentle nudge each evening.',
      blockedTitle: 'Notifications are blocked',
      blockedBody: 'Pura can’t send reminders until you allow notifications in your device Settings.',
      blockedCta: 'Open device Settings',
      unavailableTitle: 'Reminders live in the app',
      unavailableBody: 'Notifications are delivered by the Pura iOS and Android app. On the web preview you can set your preference, but it won’t ring here.',
    },
    reminderLabel: 'Nightly scan reminder',
    reminderMeta: (time: string) => `Every evening at ${time}`,
    reminderMetaOff: 'Off',
    timeLabel: 'Reminder time',
    // iOS-style notification preview.
    preview: {
      label: 'Preview',
      appName: 'PURA',
      now: 'now',
      title: 'Time for tonight’s scan',
      body: 'Same light, same spot. Let’s see how your skin’s doing.',
    },
    // Gentle-promise card.
    promiseTitle: 'Our promise',
    promiseBody: 'One reminder a night — that’s the most Pura will ever send. No streak guilt, no badges, no nagging. Turn it off any time.',
    // Legacy keys retained for safety.
    unavailable: 'Reminders aren’t available on this device. They work in the iOS and Android app.',
    deniedTitle: 'Notifications are off',
    deniedBody: 'Turn them on for Pura in your device Settings, then flip this back on.',
  },

  // ----- Privacy -----
  // Honest trust center. NOTE: face scans ARE sent to a cloud AI to be
  // analyzed (see src/api/scan.ts). Copy here must never claim photos
  // "stay on your phone" or are "analyzed locally" — that would be false.
  privacy: {
    title: 'Privacy',
    intro: 'Your skin is personal. Here’s exactly what Pura stores, what leaves your device, and what you can erase.',
    summary: 'Your profile, scans, and history live on this device. To read a scan, the photo is sent securely to our AI, analyzed, and not kept as a raw image — never sold, never handed to advertisers.',
    // "What Pura stores" inventory.
    storesTitle: 'What Pura stores',
    stores: [
      {
        label: 'Skin profile',
        meta: 'On this device',
        detail: 'Your skin type, concerns, goal, and product preferences. Stored locally and sent alongside a scan so your results are personalized.',
      },
      {
        label: 'Scan history',
        meta: 'On this device',
        detail: 'Your skin scores, findings, and analyzed results over time. Kept locally so you can see progress.',
      },
      {
        label: 'Scan photos',
        meta: 'Sent to be analyzed',
        detail: 'To read your skin, each photo is sent securely to our AI provider and analyzed. It is not stored as a raw image on our servers — the result, not the photo, is what’s saved on your device.',
      },
      {
        label: 'Routine & saved products',
        meta: 'On this device',
        detail: 'The products in your routine and your saved list. Stored locally.',
      },
      {
        label: 'Assistant chat',
        meta: 'On this device',
        detail: 'Your conversation with the Pura assistant, stored locally so it survives a restart. Messages you send are processed by the same AI to answer you.',
      },
    ],
    // Honest cloud-AI disclosure (NOT a fake on/off toggle — turning cloud
    // analysis "off" would break scanning, so we disclose instead).
    cloudTitle: 'How analysis works',
    cloudBody: 'Pura’s skin reading is powered by an AI model that runs in the cloud, so analyzing a scan means sending the photo securely for processing. Pura doesn’t sell your data and doesn’t use your face to train advertising.',
    cloudHonest: 'Because analysis is cloud-powered, there isn’t an on-device-only mode today. If that matters to you, you can scan less often — or erase everything below at any time.',
    // Permissions section.
    permissionsTitle: 'Permissions',
    permissions: {
      camera: { label: 'Camera', meta: 'Captures your skin scan.' },
      photos: { label: 'Photos', meta: 'Used only if you pick an existing photo to scan.' },
      notifications: { label: 'Notifications', meta: 'Sends your nightly scan reminder.' },
      manageCta: 'Manage in device Settings',
      webNote: 'On the web, permissions are managed by your browser.',
    },
    // "Your data" controls — every one performs a real action.
    dataTitle: 'Your data',
    actions: {
      exportLabel: 'Export my data',
      exportMeta: 'Download your profile and scan summary as a JSON file.',
      clearScansLabel: 'Delete scan history',
      clearScansMeta: 'Removes past scans and scores. Your profile stays.',
      clearScansConfirmTitle: 'Delete scan history?',
      clearScansConfirmBody: 'This permanently removes your scans, scores, and findings from this device. Your profile and routine stay. This can’t be undone.',
      clearScansConfirmCta: 'Delete scans',
      clearChatLabel: 'Clear assistant chat',
      clearChatMeta: 'Erases your conversation history.',
      clearChatConfirmTitle: 'Clear assistant chat?',
      clearChatConfirmBody: 'This permanently clears your conversation with the Pura assistant. This can’t be undone.',
      clearChatConfirmCta: 'Clear chat',
      resetProfileLabel: 'Reset skin profile',
      resetProfileMeta: 'Clears your skin answers. Scans and history stay.',
      resetProfileConfirmTitle: 'Reset skin profile?',
      resetProfileConfirmBody: 'This clears your skin type, concerns, goal, and preferences. Your scans and history are kept.',
      resetProfileConfirmCta: 'Reset profile',
      eraseLabel: 'Erase everything',
      eraseMeta: 'Deletes your profile, scans, routine, and chat from this device.',
      eraseConfirmTitle: 'Erase all data?',
      eraseConfirmBody: 'This permanently deletes your profile, scans, routine, saved products, and chat from this device. This can’t be undone.',
      eraseConfirmCta: 'Erase everything',
    },
    exportedToast: 'Your data was exported.',
    exportUnavailable: 'Export couldn’t start. Please try again.',
    cancel: 'Cancel',
  },

  // ----- Appearance -----
  appearance: {
    title: 'Appearance',
    intro: 'Tune how Pura looks and feels. Changes apply instantly.',
    // Theme — only Light is real today. Dark/System are shown honestly as
    // "coming soon" and are not selectable (they wouldn't repaint the app).
    themeTitle: 'Theme',
    theme: {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
    themeActiveNote: 'Pura is designed as one calm, luminous light experience, so scans read true to color.',
    comingSoon: 'Coming soon',
    darkComingSoon: 'A dark theme is in the works. For now Pura stays light so color-based skin reading stays accurate.',
    // Lighting Assist — real, wired to the scan camera.
    lightingTitle: 'Scan lighting',
    lightingLabel: 'Lighting Assist',
    lightingMeta: 'Adds a soft on-screen glow during face scans so low light still reads clearly.',
    // Motion — real, wired to useReduceMotion via motionPreference.
    motionTitle: 'Motion',
    motionLabel: 'Animation',
    motion: {
      system: 'Follow system',
      reduced: 'Reduced',
    },
    motionMeta: 'Calms large animations and transitions. “Follow system” respects your device’s accessibility setting.',
    // Haptics — real, wired to hapt.* via hapticsEnabled.
    hapticsTitle: 'Feedback',
    hapticsLabel: 'Haptics',
    hapticsMeta: 'Subtle taps when you complete steps or capture a scan. Works on iPhone and Android.',
    // Live preview tied to the two real controls above.
    preview: {
      title: 'Preview',
      motionCaption: 'This gentle pulse stops when motion is reduced.',
      hapticButton: 'Tap to feel it',
      hapticOn: 'You’ll feel a tap on a real device.',
      hapticOff: 'Haptics are off.',
    },
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
