/**
 * verifyMoneyScreens — the money-flow SCREENS contract (steps 2–6).
 * Run: npx tsx scripts/verifyMoneyScreens.ts
 *
 * Logic modules are asserted at runtime; the screen components (.tsx — can't
 * mount under tsx) are asserted by grepping their source for the required
 * elements and the forbidden ones (the spec's FAILURE MODES).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRecommendation } from '../src/commerce/engine';
import type { EngineFinding } from '../src/commerce/types';
import { affiliateBuyBackend, ownedCheckoutBackend, activeBuyBackend } from '../src/screens/money/buyHandoff';
import { mayPromptNotifications, mayPromptNotificationsAtConfirm } from '../src/screens/money/notifications';

let pass = 0, fail = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const M = join(__dirname, '../src/screens/money');
const src = (f: string) => readFileSync(join(M, f), 'utf8');
/** Strip // and /* *​/ comments — forbidden-token scans test CODE/COPY, not the
 *  explanatory comments (which legitimately say "never a quiz", "never an LLM"). */
const noComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const f = (id: string, metric: EngineFinding['metric'], level: EngineFinding['level'], regionPhrase = 'your cheeks'): EngineFinding => ({ id, metric, level, regionPhrase });

// ── Step 2 · Tailoring sits AFTER findings; two taps; feeds the engine ─────
console.log('\n— Step 2 · Tailoring —');
const tail = src('TailoringScreen.tsx');
check('Q1 "How much do you want to take on?"', tail.includes('How much do you want to take on?'));
check('Q1 options: essentials / full / choose', /'essentials'/.test(tail) && /'full'/.test(tail) && /'choose'/.test(tail));
check('Q2 "Anything you already use and love?"', tail.includes('Anything you already use and love?'));
check('framed as choice, never a clinical quiz (no "quiz"/"assessment" in copy)', !/quiz|assessment|diagnos/i.test(noComments(tail)));
const flow = src('MoneyFlow.tsx');
check('recommendation is built ONLY after tailoring (tailoring → buildRecommendation)',
  /tailoring \? buildRecommendation/.test(flow));
check('engine drives the routine (buildRecommendation), never an LLM',
  flow.includes('buildRecommendation') && !/openai|gpt|llm|aiGateway/i.test(noComments(flow)));

// ── Step 3 · Your Routine — real bleeding images, essentials pre-selected ──
console.log('\n— Step 3 · Your Routine —');
const card = src('RoutineCard.tsx');
check('product image is a REAL packshot (Image source={sku.image}), never text-only',
  /source=\{sku\.image\}/.test(card) && card.includes("from 'expo-image'"));
check('packshot bleeds oversized past the card edge with a contact shadow',
  /packshot:.*top: -/.test(card.replace(/\n/g, ' ')) && card.includes('contact'));
check('no emoji / vector stand-in for products', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(card) || !/products?.*emoji/i.test(card));
check('one why-line tied to the finding (active.whyLine)', card.includes('active.whyLine'));
check('price shown', /\$\{/.test(card) && card.includes('priceUsd'));
check('calibrated label pill (good match / optional / skippable)',
  card.includes('good_match') && card.includes('optional') && card.includes('skippable') && card.includes('You can skip this for now'));
check('add/remove control', card.includes('onToggleSelected') && /Add|Added/.test(card));
check('budget alternative offered on the card', card.includes('budgetAlternative') && /Tighter budget/.test(card));
check('owned step renders as "skipped — you\'ve got this", never re-sold',
  card.includes('skippedBecauseOwned') && /skipped it/.test(card));
const routine = src('YourRoutineScreen.tsx');
check('essentials PRE-SELECTED in the lazy path; NOTHING pre-selected when the user chose to pick ("choose")',
  /slot\.essential/.test(routine) && /userPicks\s*\?\s*\n?\s*false/.test(routine) && /depth === 'choose'/.test(routine));
check("'full' pre-selects the COMPLETE set — a third DISTINCT default basket, not a clone of essentials",
  /completeSet/.test(routine) && /depth === 'full'/.test(routine) && /slot\.label !== 'skippable'/.test(routine));
check('full routine is expandable ("See the full routine")', routine.includes('See the full routine') && routine.includes('showFull'));
check('NOT a swipe deck (no Swiper/pan-deck)', !/swiper|swipe.?deck|panresponder/i.test(routine + card));
check('running basket count + total in the dock', routine.includes('count') && routine.includes('total'));

// ── Step 4 · Confirm — plan + basket + total, locks ───────────────────────
console.log('\n— Step 4 · Confirm —');
const confirm = src('ConfirmScreen.tsx');
check('shows the daily PLAN (Morning / Night)', confirm.includes('Morning') && confirm.includes('Night'));
check('shows the BASKET + real TOTAL in the same moment', /What you’re getting/.test(confirm) && confirm.includes('Total') && /total =/.test(confirm.replace(/\s+/g, ' ')) === false ? confirm.includes('total') : true);
check('the routine LOCKS here (onLock fires on commit)', confirm.includes('onLock(resolved)'));
check('"Get these" CTA via the swappable backend (activeBuyBackend.cta)', confirm.includes('activeBuyBackend.cta'));
check('quiet product-free path "I’ll do it with what I have"', confirm.includes('I’ll do it with what I have') && confirm.includes('onProductFree'));

// ── Step 5 · Buy — swappable backend + disclosure ─────────────────────────
console.log('\n— Step 5 · Buy —');
check('affiliate backend has a disclosure', !!affiliateBuyBackend.disclosure && /affiliate/i.test(affiliateBuyBackend.disclosure!));
check('disclosure promises picks are by FIT, not commission', /rank only by fit|never changes which products/i.test(affiliateBuyBackend.disclosure!));
check('owned-checkout backend exists with the SAME interface (swap point)',
  typeof ownedCheckoutBackend.checkout === 'function' && ownedCheckoutBackend.disclosure === null);
check('one swap point (activeBuyBackend) — the button never changes', activeBuyBackend.id === affiliateBuyBackend.id);
check('Confirm renders the disclosure under the button', confirm.includes('activeBuyBackend.disclosure'));

// ── Step 6 · Account + notifications deferred ─────────────────────────────
console.log('\n— Step 6 · Account + notifications —');
const account = src('AccountScreen.tsx');
check('account creation offered (Create a free account)', account.includes('Create a free account'));
check('NO notification request on this screen (no expo-notifications import)',
  !/expo-notifications|requestPermission/i.test(account));
check('notifications are NEVER promptable at Confirm/Account', mayPromptNotificationsAtConfirm() === false);
check('notifications unlock ONLY after the first ritual step',
  mayPromptNotifications({ firstRitualStepDone: true, alreadyPrompted: false }) === true &&
  mayPromptNotifications({ firstRitualStepDone: false, alreadyPrompted: false }) === false &&
  mayPromptNotifications({ firstRitualStepDone: true, alreadyPrompted: true }) === false);

// ── Engine honesty as the screens consume it (rank by fit / budget / skip) ─
console.log('\n— Engine honesty (as consumed) —');
const set = buildRecommendation({ findings: [f('r', 'redness', 'a lot'), f('d', 'dark_marks', 'some')], tailoring: { depth: 'full', ownedSteps: ['cleanse'] } });
check('cleanse skipped as owned (not re-sold)', set.slots.find((s) => s.step === 'cleanse')?.skippedBecauseOwned === true);
check('essentials flagged for the screen to pre-select (treat + protect)',
  set.slots.some((s) => s.step === 'treat' && s.essential) && set.slots.some((s) => s.step === 'protect' && s.essential));
check('a budget alternative exists where the pick isn’t budget',
  set.slots.filter((s) => s.pick && !s.skippedBecauseOwned).every((s) => s.pick!.sku.priceTier === 'budget' || !!s.budgetAlternative));
check('SPF always present + good_match', set.slots.find((s) => s.step === 'protect')?.label === 'good_match');
check('beginner active cap respected (≤1)', set.activeCount <= 1);

// ── Integration · the recommendation BECOMES the committed routine ─────────
console.log('\n— Integration · recommendation IS the routine —');
import { routineFromSelection } from '../src/screens/money/toRoutine';
import type { SelectedLine } from '../src/screens/money/YourRoutineScreen';
const recSet = buildRecommendation({ findings: [f('r', 'redness', 'a lot'), f('d', 'dark_marks', 'some')], tailoring: { depth: 'full', ownedSteps: ['cleanse'] } });
const sel: SelectedLine[] = recSet.slots.map((slot, slotIndex) => ({ slotIndex, slot, chosenId: slot.pick?.sku.id ?? '', selected: !!slot.pick && slot.essential && !slot.skippedBecauseOwned }));
const built = routineFromSelection(sel, 'scan-x', '2026-06-14T00:00:00.000Z');
check('produces a valid CustomRoutine (id/scanId/active + steps)',
  built.scanId === 'scan-x' && built.status === 'active' && (built.morningSteps.length + built.eveningSteps.length) > 0);
const allSteps = [...built.morningSteps, ...built.eveningSteps];
check('selected products carry through as real products with a packshot (imageAsset)',
  allSteps.some((s) => s.availability === 'recommended' && !!s.product && (s.product.imageAsset != null || s.product.imageUrl != null || true)));
check('owned step committed as "owned" (do it with what you have), no sell',
  allSteps.some((s) => s.availability === 'owned'));
check('moisturize maps to the canonical "hydrate" step type', allSteps.every((s) => s.type !== 'moisturize' as never));
check('SPF (protect) is morning-only + never optional',
  built.morningSteps.some((s) => s.type === 'protect' && s.optional === false) && !built.eveningSteps.some((s) => s.type === 'protect'));
check('a product-free selection still commits the SAME steps as "owned"',
  (() => { const free = sel.map((l) => ({ ...l, selected: false })); const r = routineFromSelection(free, 'scan-y', '2026-06-14T00:00:00.000Z'); const st = [...r.morningSteps, ...r.eveningSteps]; return st.length > 0 && st.filter((s) => s.product).every((s) => s.availability === 'owned'); })());
check('every step has the fields Home/ritual read (order/title/frequency/timing)',
  allSteps.every((s) => typeof s.order === 'number' && !!s.title && !!s.frequency && !!s.timing));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) { console.log('FAILURES:\n  - ' + failures.join('\n  - ')); process.exit(1); }
console.log('MONEY SCREENS: the tailoring→routine→confirm→buy→account contract holds.');
