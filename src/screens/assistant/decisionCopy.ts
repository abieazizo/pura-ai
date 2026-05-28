/**
 * AI Assist Decision Room — exact spec copy.
 *
 * Every user-visible string in the Decision Room flows from here, so
 * future localization or product-tone tweaks happen in exactly one
 * place. Screens never embed strings inline.
 */

export const HEADER = {
  title: 'AI Assist',
  descriptor: 'Tonight’s decision, grounded in today’s scan.',
  historyA11y: 'View decision history',
} as const;

export const DECISION = {
  eyebrowUpdatedNow: 'UPDATED JUST NOW',
  primaryAction: 'Apply changes to tonight',
  primaryActionApplied: 'Changes applied for tonight',
  secondaryAction: 'Ask why this changed',
  secondaryActionStandard: 'Ask about tonight',
  secondaryActionReset: 'Ask about reset night',
  secondaryActionCheckIn: 'Ask a general question',
} as const;

export const EVIDENCE = {
  sectionLabel: 'WHAT CHANGED',
  scoreLabel: 'Skin score',
  scoreDelta: (delta: number) =>
    delta === 0
      ? 'unchanged'
      : `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta)} since yesterday`,
  areaObservation: 'Irritation increased',
  comparisonLabel: 'Compared with yesterday',
  noComparisonLabel: 'No prior scan to compare',
} as const;

export const ADJUSTMENTS = {
  sectionLabel: 'TONIGHT’S ADJUSTMENTS',
  prefixHold: 'Hold tonight',
  prefixUse: 'Use tonight',
  prefixPrioritize: 'Prioritize tonight',
  prefixAvoid: 'Avoid until recheck',
} as const;

export const PROMPTS = {
  sectionLabel: 'ASK ABOUT THIS DECISION',
  recovery: [
    'Why did my chin irritation increase?',
    'Can I use my BHA anyway?',
    'When can I restart actives?',
  ] as const,
  standard: [
    'Why is tonight a standard night?',
    'Is my routine on track?',
    'When should I scan next?',
  ] as const,
  reset: [
    'What can I use tonight?',
    'When should I see a dermatologist?',
    'When can I restart actives?',
  ] as const,
} as const;

export const COMPOSER = {
  placeholderDecision: 'Ask about tonight’s decision…',
  placeholderApplied: 'Ask about tonight’s recovery routine…',
  placeholderReset: 'Ask about tonight’s reset routine…',
  placeholderStandard: 'Ask about tonight’s routine…',
  sendA11y: 'Send message',
} as const;

export const COMPRESSED_ANCHOR = {
  view: 'View decision',
  shortRecovery: 'Skip exfoliation tonight.',
  shortReset: 'Stop active products tonight.',
  shortStandard: 'Stay consistent tonight.',
  shortTreatment: 'Treatment night is appropriate.',
  shortCheckIn: 'One detail needed.',
} as const;

export const APPLIED_CONFIRMATION = {
  eyebrow: 'TONIGHT UPDATED',
  titleRecovery: 'Your routine is now set to Recovery night.',
  titleReset: 'Your routine is now set to Reset night.',
  removedLabel: 'Removed tonight',
  prioritizedLabel: 'Prioritized tonight',
  scopeNote:
    'This applies to tonight only. Your normal schedule remains unchanged.',
  viewRoutine: 'View tonight’s routine',
  undo: 'Undo',
} as const;

export const EVIDENCE_SHEET = {
  title: 'Why tonight changed',
  state: 'RECOVERY NIGHT',
  observation: 'Your chin area appears more irritated today.',
  sectionObserved: 'OBSERVED CHANGE',
  sectionContrib: 'WHAT MAY HAVE CONTRIBUTED',
  sectionWhy: 'WHY PURA CHANGED TONIGHT',
  sectionRefine: 'HELP ME REFINE THIS',
  todayLabel: 'Today',
  yesterdayLabel: 'Yesterday',
  todayText: 'Elevated sensitivity signal',
  yesterdayText: 'Lower sensitivity signal',
  contribBody:
    'Your routine included two irritation-risk products within the recent active cycle:',
  whyBody:
    'When an area appears more reactive, adding exfoliation or retinoid treatment may increase redness or discomfort. Tonight’s recovery routine removes those variables and prioritizes barrier support.',
  refinePrompt: 'How does your chin area feel right now?',
  sensationNormal: 'Feels normal',
  sensationTight: 'Tight or dry',
  sensationBurns: 'Stings or burns',
  primary: 'Apply recovery routine',
  primaryReset: 'Update tonight to Reset night',
  closeA11y: 'Close',
  responseNormal:
    'Thanks. I still recommend skipping exfoliation tonight based on today’s scan, then checking again tomorrow.',
  responseTight:
    'I’ll keep tonight focused on hydration and moisturizer. Skip exfoliation and retinoids until your next check-in.',
  responseBurns:
    'Stop active products tonight. Use only gentle, familiar products if they feel comfortable. If burning, swelling, blistering, or significant redness is severe or worsening, consider professional care.',
} as const;

export const CHALLENGE_EXFOLIATE = {
  groundedBadge: 'Pura · Checked against tonight’s decision',
  heading: 'No. Hold exfoliation tonight.',
  body:
    'Your chin area already appears more irritated today. Using an exfoliating acid tonight could make that sensitivity worse.',
  heldLabel: 'HELD PRODUCT',
  useInsteadLabel: 'USE TONIGHT INSTEAD',
  whenLabel: 'WHEN TO RECONSIDER',
  whenBody:
    'Scan again tomorrow evening. If your chin area no longer appears reactive and your skin feels comfortable, I can reassess whether an active night makes sense.',
  primary: 'Keep recovery routine',
  secondary: 'Check another product',
  followUps: [
    'When can I use it again?',
    'Can I use my retinoid tonight?',
    'Which moisturizer is safest?',
  ] as const,
} as const;

export const CHALLENGE_RETINOID = {
  groundedBadge: 'Pura · Checked against tonight’s decision',
  heading: 'No. Hold the retinoid tonight.',
  body:
    'Your skin already appears more reactive today. A retinoid tonight could make that worse.',
  heldLabel: 'HELD PRODUCT',
  useInsteadLabel: 'USE TONIGHT INSTEAD',
  whenLabel: 'WHEN TO RECONSIDER',
  whenBody:
    'Wait until your chin area no longer appears reactive — usually 1–2 nights of recovery — then we can reassess.',
  primary: 'Keep recovery routine',
  secondary: 'Check another product',
  followUps: [
    'When can I use it again?',
    'Can I use my BHA tonight?',
    'Which moisturizer is safest?',
  ] as const,
} as const;

export const CHALLENGE_RESTART = {
  groundedBadge: 'Pura · Based on tonight’s decision',
  heading: 'After one calm scan, we can reassess.',
  body:
    'I’ll watch your next scan. Once your chin area no longer appears reactive and you feel comfortable, an active night becomes a reasonable next step.',
  primary: 'Keep recovery routine',
  secondary: 'Check another product',
  followUps: [
    'Can I use my BHA tonight?',
    'Can I use my retinoid tonight?',
    'Which moisturizer is safest?',
  ] as const,
} as const;

export const SUBSTITUTE = {
  groundedBadge: 'Pura · Checked against tonight’s decision',
  heading: 'A barrier-support moisturizer is the safest pick tonight.',
  body:
    'Tonight is a recovery night, so your moisturizer should focus on calming and supporting your skin rather than adding actives.',
  pickLabel: 'BEST FIT TONIGHT',
  alsoLabel: 'ALSO SAFE',
  primary: 'Use this tonight',
  secondary: 'Check another product',
  followUps: [
    'Can I use my BHA tonight?',
    'Why is this one safer?',
    'When can I restart actives?',
  ] as const,
} as const;

export const RESET_RESPONSE = {
  title: 'Reset night',
  decision: 'Stop active products tonight.',
  body:
    'Burning can mean your skin is reacting poorly to something in your routine. Do not apply exfoliating acids, retinoids, or new treatment products tonight.',
  sectionDoNow: 'DO NOW',
  steps: [
    'Stop using the serum tonight.',
    'Rinse gently if the product is still on your skin and discomfort continues.',
    'Use only a familiar gentle moisturizer if it feels comfortable.',
  ] as const,
  escalation:
    'If burning, swelling, blistering, or significant redness is severe or worsening, seek professional medical care.',
  primary: 'Update tonight to Reset night',
} as const;

export const NO_SCAN = {
  title: 'A scan makes tonight’s guidance personal.',
  body:
    'Start a scan to get guidance based on what your skin looks like today. I can still answer general product and routine questions.',
  primary: 'Start skin scan',
  secondary: 'Ask a general question',
} as const;

export const NO_PRODUCTS = {
  title: 'I can see today’s change. Add your products to make the plan safer.',
  body:
    'Your scan suggests keeping tonight gentle, but I do not know which products you use yet.',
  primary: 'Add my products',
  secondary: 'Continue with general guidance',
  provenance: 'Based on today’s scan only · Add products for ingredient checks',
} as const;

export const STABLE_STANDARD = {
  title: 'Standard night',
  decision: 'Stay consistent tonight.',
  body:
    'Your skin appears stable compared with your previous scan. Keep your usual evening routine unless something feels different.',
  primary: 'View tonight’s routine',
  secondary: 'Check a product',
} as const;

export const CONFLICT = {
  title: 'Do not combine these tonight.',
  body:
    'Your exfoliating toner and retinoid may increase irritation when used together, especially while your chin area appears reactive.',
  primary: 'Update tonight’s routine',
  secondary: 'See ingredient explanation',
} as const;

export const ERROR_STATE = {
  title: 'I couldn’t complete that check.',
  body:
    'Your message is saved. Try again, or ask a simpler question while I reconnect.',
  primary: 'Try again',
} as const;

export const MORNING_AFTER = {
  prompt: 'Last night was a Recovery night.\nHow does your skin feel this morning?',
  better: 'Better',
  same: 'About the same',
  worse: 'Worse',
  responseBetter:
    'Good. Recovery appears to be helping. I’ll reassess active use after tonight’s scan.',
  responseSame:
    'Let’s keep your routine gentle until your next scan.',
  responseWorse:
    'I’ll keep actives on hold tonight. Are you experiencing burning, swelling, or pain?',
} as const;

export const PROVENANCE = {
  fullData:
    'Based on today’s scan, previous-scan comparison, evening routine, and ingredient check.',
  limitedProducts:
    'Based on today’s scan only. Add your products for ingredient checks.',
  noPrior:
    'Based on today’s scan and evening routine. No previous scan available for comparison.',
} as const;

export const INTENT_GROUNDING = {
  decision: 'Pura · Based on tonight’s decision',
  safety: 'Pura · Checked against tonight’s decision',
} as const;
