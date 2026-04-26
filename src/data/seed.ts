import type {
  Product,
  ProductMatch,
  Scan,
  User,
} from '@/types';
import { avatarSwatches } from '@/theme';
import {
  addedDateFor,
  deriveIngredientList,
  formulationFor,
  goodForFor,
  howToUseFor,
  matchScoreFor,
  ratingFor,
  reviewCountFor,
  skinTypesFor,
  tagsFor,
  timeOfUseFor,
  tintFor,
} from './productEnrich';

const picsum = (id: string) => `https://picsum.photos/seed/pura-${id}/400/400`;

/**
 * v10.27 — real "Shop on {brand}" links for every catalog product.
 *
 * The product detail page renders a Shop CTA that opens this URL via
 * `Linking.openURL`, so the catalog feels like a real shoppable
 * inventory rather than demo placeholders. Every URL is a real
 * brand-owned product page (or brand homepage where we don't have a
 * stable product slug). If a product is added without a buyUrl entry
 * in this map, the Shop CTA is suppressed for that product.
 *
 * Keep the map tied to product IDs so the buy link survives any
 * catalog reorganisation.
 */
const BUY_URLS: Record<string, string> = {
  'cerave-hydrating-cleanser':
    'https://www.cerave.com/skincare/cleansers/hydrating-facial-cleanser',
  'la-roche-posay-toleriane-cleanser':
    'https://www.laroche-posay.us/our-products/face/face-wash/toleriane-hydrating-gentle-facial-cleanser-3337875545792.html',
  'beauty-of-joseon-ginseng-cleanser':
    'https://beautyofjoseon.com/products/red-bean-refreshing-foam-cleanser',
  'anua-heartleaf-toner':
    'https://anua-global.com/products/anua-heartleaf-77-soothing-toner',
  'paulas-choice-2-bha':
    'https://www.paulaschoice.com/skin-perfecting-2pct-bha-liquid-exfoliant/201.html',
  'biotherm-skin-oxygen-toner':
    'https://www.biotherm-usa.com/skin-care/skin-oxygen/skin-oxygen-oxygenating-lotion.html',
  'the-ordinary-niacinamide':
    'https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html',
  'good-molecules-discoloration':
    'https://www.goodmolecules.com/products/discoloration-correcting-serum',
  'the-ordinary-retinal':
    'https://theordinary.com/en-us/granactive-retinoid-2-emulsion-100406.html',
  'elf-vitamin-c-serum': 'https://www.elfcosmetics.com/super-10-serum/91801.html',
  'cerave-pm-lotion':
    'https://www.cerave.com/skincare/moisturizers/pm-facial-moisturizing-lotion',
  'illiyoon-ceramide-cream': 'https://en.illiyoon.com/',
  'la-roche-posay-toleriane-dd':
    'https://www.laroche-posay.us/our-products/face/moisturizers/toleriane-double-repair-face-moisturizer-883140046387.html',
  'beauty-of-joseon-relief-sun':
    'https://beautyofjoseon.com/products/relief-sun-rice-probiotic-spf50-pa',
  'bonajour-green-tea-sun': 'https://bonajour.com/',
  'its-skin-collagen-ampoule': 'https://itsskin.com/',
  'paulas-choice-azelaic':
    'https://www.paulaschoice.com/10pct-azelaic-acid-booster/2360.html',
  'the-ordinary-lactic-acid':
    'https://theordinary.com/en-us/lactic-acid-10-hyaluronic-acid-2-serum-100437.html',
  'beauty-of-joseon-rice-mask':
    'https://beautyofjoseon.com/products/radiance-cleansing-balm',
  'its-skin-power-mask': 'https://itsskin.com/',
  'cosrx-snail-essence':
    'https://www.cosrx.com/products/advanced-snail-96-mucin-power-essence',
  'kiehls-ultra-facial-cream':
    'https://www.kiehls.com/skincare/face-moisturizers/ultra-facial-cream/00362.html',
  'supergoop-unseen': 'https://supergoop.com/products/unseen-sunscreen',
  'youth-to-the-people-kale':
    'https://www.youthtothepeople.com/products/superfood-cleanser',
};

function buyUrlFor(id: string): string | undefined {
  return BUY_URLS[id];
}

/**
 * v10.32 — real product photography sourced from Open Beauty Facts.
 *
 * URLs were resolved by `scripts/fetch-product-images.ts` against
 * the OBF public API (https://world.openbeautyfacts.org). Each entry
 * is a real product photo hosted on `images.openbeautyfacts.org` —
 * the same CDN we already use for the live barcode-resolution flow,
 * so the trust boundary doesn't widen.
 *
 * v10.32 — pushed coverage from 6/24 to 8/24 by hitting OBF's
 * detail-API directly via curated UPCs (paulas-choice-2-bha,
 * supergoop-unseen). The remaining 16 products genuinely don't have
 * entries in OBF's beauty catalog — K-beauty, US indie, and several
 * SKU-specific entries are not volunteer-indexed yet. Probed the
 * OBF brand-search endpoints exhaustively to confirm; further pulls
 * would require licensed photography or scraping brand pages, both
 * of which fail the trust-boundary bar.
 *
 * Products without an entry below render the v10.32 upgraded
 * `ProductPlaceholderImage` — pedestal/shadow grounding, gleam
 * highlight, paper-grain texture, differentiated cap colour, brand
 * wordmark band, and a "MOCKUP" corner badge so the card reads as
 * an intentional editorial composition rather than a missing asset.
 *
 * The card / hero render path treats a network image-load failure
 * as missing and falls through to the placeholder, so a stale URL
 * here never breaks the card layout.
 */
const PRODUCT_IMAGE_URLS: Record<string, string | null> = {
  'cerave-hydrating-cleanser':
    'https://images.openbeautyfacts.org/images/products/360/600/053/7576/front_en.11.400.jpg',
  'la-roche-posay-toleriane-cleanser':
    'https://images.openbeautyfacts.org/images/products/333/787/554/5778/front_en.9.400.jpg',
  'beauty-of-joseon-ginseng-cleanser': null,
  'anua-heartleaf-toner': null,
  'paulas-choice-2-bha':
    'https://images.openbeautyfacts.org/images/products/065/543/900/5913/front_en.3.400.jpg',
  'biotherm-skin-oxygen-toner': null,
  'the-ordinary-niacinamide': null,
  'good-molecules-discoloration': null,
  'the-ordinary-retinal':
    'https://images.openbeautyfacts.org/images/products/076/991/519/0045/front_en.7.400.jpg',
  'elf-vitamin-c-serum': null,
  'cerave-pm-lotion': null,
  'illiyoon-ceramide-cream': null,
  'la-roche-posay-toleriane-dd':
    'https://images.openbeautyfacts.org/images/products/333/787/554/5846/front_en.3.400.jpg',
  'beauty-of-joseon-relief-sun': null,
  'bonajour-green-tea-sun': null,
  'its-skin-collagen-ampoule': null,
  'paulas-choice-azelaic': null,
  'the-ordinary-lactic-acid':
    'https://images.openbeautyfacts.org/images/products/076/991/519/0373/front_en.12.400.jpg',
  'beauty-of-joseon-rice-mask': null,
  'its-skin-power-mask': null,
  'cosrx-snail-essence': null,
  'kiehls-ultra-facial-cream':
    'https://images.openbeautyfacts.org/images/products/360/597/502/8799/front_en.4.400.jpg',
  'supergoop-unseen':
    'https://images.openbeautyfacts.org/images/products/081/621/802/6530/front_en.3.400.jpg',
  'youth-to-the-people-kale': null,
};

function imageUrlFor(id: string): string | undefined {
  const url = PRODUCT_IMAGE_URLS[id];
  return url ?? undefined;
}

/**
 * v10.31 — per-product `howToUse` + `goodFor` overrides.
 *
 * `productEnrich.ts` derives default values from the category, which
 * makes every cleanser read identically on the detail page ("Wet face.
 * Massage a dime-sized amount for thirty seconds. Rinse..."). Real
 * skincare detail pages have product-specific instructions tied to
 * the actual formula and ingredient strength — that's the difference
 * between "demo template" and "you can actually use this product."
 *
 * Where an entry is provided below, it overrides the category default.
 * Where one isn't, the category template still applies (for products
 * we haven't authored content for yet).
 */
interface ProductDetailOverride {
  howToUse?: string;
  goodFor?: string[];
  /**
   * v10.32 — product-specific mechanism sentence, used as the second
   * half of the WhyItWorksPanel rationale paragraph and the second
   * half of the MatchWhyBlock reason. Replaces the concern-templated
   * "this targets the active surface" filler that read identically
   * across every product. One sentence; names the actual active and
   * what it does at the cellular level, in formulator voice rather
   * than marketing voice.
   */
  mechanism?: string;
}

const PRODUCT_DETAIL_OVERRIDES: Record<string, ProductDetailOverride> = {
  'cerave-hydrating-cleanser': {
    howToUse:
      'Massage a dime-size amount onto damp skin in slow circles for 30 seconds. Rinse with lukewarm water — never hot. Use morning and evening.',
    goodFor: ['Dry & combination skin', 'Daily use', 'Removing SPF without stripping'],
    mechanism:
      'A non-foaming gel-cream lifts SPF and grime while three skin-identical ceramides (1, 3, 6-II) stay behind to reinforce the lipid bilayer — a true non-stripping rinse.',
  },
  'la-roche-posay-toleriane-cleanser': {
    howToUse:
      'Apply to wet skin and lather gently for 30 seconds. Rinse, pat dry, then move to your toner or serum within 60 seconds while skin is still damp.',
    goodFor: ['Reactive / sensitive skin', 'Post-procedure barrier care', 'Daily use'],
    mechanism:
      'Prebiotic thermal water plus a low-foam glyceryl surfactant lifts surface debris without disrupting the acid mantle — formulated for skin that flares from anything stronger.',
  },
  'beauty-of-joseon-ginseng-cleanser': {
    howToUse:
      'Lather a small pump in wet hands until the foam stiffens, then massage onto wet skin for 30–60 seconds. Best as a second cleanse after an oil cleanser.',
    goodFor: ['Combination & oily T-zone', 'Pore decongesting', 'Removing SPF'],
    mechanism:
      'Red bean extract and bamboo charcoal pull excess sebum from the T-zone while papain enzymes loosen surface dead cells — mild enough for daily double-cleanse second-step duty.',
  },
  'anua-heartleaf-toner': {
    howToUse:
      'Decant 3–4 drops onto a cotton pad or your palms and press into damp skin. No rubbing. Layer 1–3 times until skin feels plumped.',
    goodFor: ['Calming redness', 'Post-active soothing', 'Hydrating prep'],
    mechanism:
      '77% Houttuynia cordata (heartleaf) extract is the highest in any commercial toner; quercitrin in the leaves directly down-regulates the inflammation pathway behind cheek redness.',
  },
  'paulas-choice-2-bha': {
    howToUse:
      'Once skin is fully dry, apply a thin layer with a cotton pad or your fingertips. No rinsing. Start every other night; build to nightly if your skin tolerates it. Always pair with morning SPF.',
    goodFor: ['Clogged pores', 'Bumpy / textured skin', 'Adult breakouts'],
    mechanism:
      'Salicylic acid is oil-soluble — it dissolves the keratin plug inside the pore itself, not just at the surface, which is why it clears whiteheads physical scrubs can’t touch.',
  },
  'biotherm-skin-oxygen-toner': {
    howToUse:
      'Pat onto cleansed skin morning and evening. The water-light formula sinks in fast — wait 15 seconds before serums.',
    goodFor: ['Dullness', 'Reactive skin', 'Daily brightening prep'],
    mechanism:
      'Pure Plankton Extract supports the cellular respiration pathway that drops in dehydrated skin, restoring the metabolic baseline that surfaces as dullness.',
  },
  'the-ordinary-niacinamide': {
    howToUse:
      'Apply 2–3 drops to clean dry skin in the AM or PM. Avoid layering with vitamin C in the same routine — alternate them across morning and evening instead.',
    goodFor: ['Visible pores', 'Excess sebum', 'Uneven tone'],
    mechanism:
      '10% niacinamide is the maximum well-tolerated dose; it down-regulates sebum production at the sebaceous gland and visibly tightens pore appearance over 6–8 weeks of consistent use.',
  },
  'good-molecules-discoloration': {
    howToUse:
      'Apply a thin layer in the morning or evening before moisturizer. Discoloration takes 8–12 weeks of consistent use to fade — use SPF 30+ daily or you’ll lose ground.',
    goodFor: ['Post-inflammatory marks', 'Sun-induced unevenness', 'Slow-fade dark spots'],
    mechanism:
      'Tranexamic acid blocks the plasmin pathway that triggers melanocytes to overproduce after inflammation — the most direct route to fading post-acne marks short of prescription hydroquinone.',
  },
  'the-ordinary-retinal': {
    howToUse:
      'Press a single pea-sized amount across cleansed dry skin in the evening. Start 2 nights a week; build to nightly over 6 weeks if your barrier holds. Always pair with morning SPF.',
    goodFor: ['Fine lines', 'Texture', 'Skin renewal cycle support'],
    mechanism:
      'Hydroxypinacolone retinoate skips the two enzymatic conversion steps retinol needs to become retinoic acid — so it triggers cell turnover with a fraction of the irritation; safe for retinoid newcomers.',
  },
  'elf-vitamin-c-serum': {
    howToUse:
      'Press 2–3 drops into clean skin in the morning before moisturizer. Pair with SPF — vitamin C extends UV protection but never replaces it.',
    goodFor: ['Dullness', 'Uneven tone', 'Daily antioxidant defense'],
    mechanism:
      'Ascorbic acid plus turmeric and HA delivers a daily antioxidant shield — vitamin C neutralises UV-generated free radicals before they trigger pigment cascade.',
  },
  'cerave-pm-lotion': {
    howToUse:
      'In the evening, smooth a nickel-size amount over face and neck after your serums. Lightweight enough to layer under a heavier cream if your barrier needs more.',
    goodFor: ['Nighttime barrier repair', 'Acne-prone skin', 'Layering under richer creams'],
    mechanism:
      'Three ceramides plus niacinamide rebuild the lipid matrix overnight while you sleep — when transepidermal water loss peaks and barrier repair is most active.',
  },
  'illiyoon-ceramide-cream': {
    howToUse:
      'Warm a generous amount between your palms and press into face, neck, and any dry patches. Re-apply on cracked or peeling areas mid-day.',
    goodFor: ['Dehydrated barrier', 'Dry patches', 'Post-active recovery nights'],
    mechanism:
      'A high-load ceramide NP base in shea butter sits on the surface as an occlusive lipid layer — locks in everything underneath, ideal after retinoid or acid nights.',
  },
  'la-roche-posay-toleriane-dd': {
    howToUse:
      'Apply morning and evening to clean skin. The double-repair complex builds tolerance over 7–10 days — give it a full week before judging.',
    goodFor: ['Reactive skin', 'Mild rosacea', 'Daily barrier maintenance'],
    mechanism:
      'Niacinamide reinforces the corneocyte structure while ceramide-3 patches missing lipids — a dual-mechanism repair tuned for skin that flares from any single active.',
  },
  'beauty-of-joseon-relief-sun': {
    howToUse:
      'Apply two finger-lengths (≈1.2g) as the final morning step, 15 minutes before sun exposure. Re-apply every 2 hours outdoors.',
    goodFor: ['Daily SPF for sensitive skin', 'No-white-cast formula', 'Layering under makeup'],
    mechanism:
      'A chemical SPF50+ filter system tuned for K-beauty texture priorities — wears under makeup without pilling and never leaves a cast on deeper skin tones; rice extract calms post-UV inflammation.',
  },
  'bonajour-green-tea-sun': {
    howToUse:
      'Apply two finger-lengths morning, after moisturizer. The hydrating texture sets fast — wait 30 seconds before makeup.',
    goodFor: ['Combination skin', 'Dehydrated SPF use', 'No-flashback finish'],
    mechanism:
      'Green tea polyphenols layered into a chemical-filter base add an EGCG antioxidant boost on top of the UV filter, addressing UV-A photoaging at two checkpoints simultaneously.',
  },
  'its-skin-collagen-ampoule': {
    howToUse:
      'Apply 2–3 drops to damp skin in the morning. Concentrated formula — a little goes a long way; layer light moisturizer on top.',
    goodFor: ['Plumping', 'Daytime hydration boost', 'Smoother makeup base'],
    mechanism:
      'A vitamin B-complex ampoule supports the keratinocyte energy cycle that drives surface renewal — visible plumping shows up within a week of daily use.',
  },
  'paulas-choice-azelaic': {
    howToUse:
      'Apply a pea-size amount once daily, AM or PM, after serums. Tingling for the first 1–2 weeks is normal; if it persists past 2 weeks, scale back to every other day.',
    goodFor: ['Redness & rosacea', 'Post-acne marks', 'Tone evening'],
    mechanism:
      'Azelaic acid 10% is anti-inflammatory, antibacterial, and a tyrosinase inhibitor — a single ingredient that addresses all three mechanisms behind rosacea-pattern redness and post-acne discoloration.',
  },
  'the-ordinary-lactic-acid': {
    howToUse:
      'Apply 4–5 drops to dry skin at night, twice a week to start. Wait 20 minutes before your next step. Never combine with retinol or vitamin C in the same routine.',
    goodFor: ['Surface texture', 'Dullness', 'Gentle weekly resurfacing'],
    mechanism:
      'Lactic acid is the largest molecule in the AHA family — penetrates more shallowly than glycolic, so it resurfaces the upper stratum corneum with less risk of breaking the barrier.',
  },
  'beauty-of-joseon-rice-mask': {
    howToUse:
      'Massage a generous amount onto dry skin to dissolve makeup and SPF, add water to emulsify, then rinse. Always follow with a water-based cleanser.',
    goodFor: ['First cleanse', 'Heavy SPF / makeup days', 'Combination skin'],
    mechanism:
      'A rice-bran-oil base dissolves silicone-rich SPF and long-wear makeup at the cuticle layer that water-based cleansers can’t touch — emulsifies cleanly so it doesn’t leave residue.',
  },
  'its-skin-power-mask': {
    howToUse:
      'Apply to clean skin and leave on for 15–20 minutes. Pat in any remaining serum after removing the sheet. Use 2–3x per week.',
    goodFor: ['Brightening boost', 'Pre-event glow', 'Hydration top-up'],
    mechanism:
      'A cellulose sheet drives a niacinamide + vitamin C serum into the upper dermis through occlusion — visible brightening within an hour, perfect ahead of a same-day commitment.',
  },
  'cosrx-snail-essence': {
    howToUse:
      'Pat 4–5 drops onto damp skin morning and evening. Texture is intentionally tacky — wait 30 seconds before the next layer instead of rubbing in.',
    goodFor: ['Healing post-blemish marks', 'Dry & dehydrated skin', 'Daily barrier support'],
    mechanism:
      '96% snail secretion filtrate carries glycoproteins, hyaluronic acid, and growth factors — the combination accelerates post-acne healing and crosslinks collagen at the wound edge.',
  },
  'kiehls-ultra-facial-cream': {
    howToUse:
      'Smooth a pea-size amount over face and neck morning and evening. Layer under SPF in the morning, alone or under a heavier night cream in the evening.',
    goodFor: ['All-day hydration', 'Cold-weather use', 'Sensitive normal-to-dry skin'],
    mechanism:
      'Squalane (a skin-identical hydrocarbon) plus glacial glycoprotein binds water to the skin for 24 hours of measurable hydration without leaving a heavy occlusive film.',
  },
  'supergoop-unseen': {
    howToUse:
      'Apply a quarter-size amount as the last morning step, then makeup. The clear gel doubles as a primer — no white cast, no scent.',
    goodFor: ['Daily SPF under makeup', 'Oily / acne-prone skin', 'Photo-friendly finish'],
    mechanism:
      'Avobenzone in a meadowfoam-seed-oil gel matrix delivers SPF40 with zero whitecast and a primer-grade matte finish — solves the chemical-SPF-under-makeup problem at the formula level.',
  },
  'youth-to-the-people-kale': {
    howToUse:
      'Massage a quarter-size amount onto damp skin for 60 seconds. Rinse with lukewarm water. Use morning and evening; safe to follow with most actives.',
    goodFor: ['Daily use', 'Antioxidant-rich cleansing', 'Combination skin'],
    mechanism:
      'A gel-base cleanser carrying kale, spinach, and green-tea polyphenols delivers a daily antioxidant rinse that’s gentle enough to use morning and evening without disrupting the lipid layer.',
  },
};

function howToUseOverrideFor(id: string): string | undefined {
  return PRODUCT_DETAIL_OVERRIDES[id]?.howToUse;
}

function goodForOverrideFor(id: string): string[] | undefined {
  return PRODUCT_DETAIL_OVERRIDES[id]?.goodFor;
}

/**
 * v10.32 — exposed publicly so WhyItWorksPanel and ProductDetailScreen's
 * MatchWhyBlock can each pull the per-product mechanism sentence and
 * splice it into their concern-aware rationale string.
 */
export function productMechanismFor(id: string): string | undefined {
  return PRODUCT_DETAIL_OVERRIDES[id]?.mechanism;
}

/* ------------------------------- Products ------------------------------- */
/**
 * `rawSeedProducts` is the original hand-authored catalog (brand, name,
 * category, ingredients, etc). `seedProducts` is the same list enriched
 * with the fields the v7.6 Products rebuild requires — tint, rating,
 * review count, match score, tags, structured ingredient list, default
 * how-to-use and detail metadata. See `productEnrich.ts` for heuristics.
 *
 * Keeping the raw array separate means catalog edits stay a one-line
 * change per product without having to re-set any of the derived fields.
 */

type RawSeedProduct = Omit<
  Product,
  | 'tint'
  | 'rating'
  | 'reviewCount'
  | 'matchScore'
  | 'tags'
  | 'addedDate'
  | 'price'
  | 'ingredientList'
  | 'howToUse'
  | 'formulation'
  | 'skinTypes'
  | 'goodFor'
  | 'timeOfUse'
  | 'contraindications'
  | 'imageUrl'
>;

const rawSeedProducts: RawSeedProduct[] = [
  // Cleansers
  {
    id: 'cerave-hydrating-cleanser',
    brand: 'CeraVe',
    name: 'Hydrating Facial Cleanser',
    category: 'cleanser',
    imageUri: '',
    ingredients: ['ceramides', 'hyaluronic acid', 'glycerin'],
    keyIngredients: ['Ceramides', 'Hyaluronic Acid'],
    priceUsd: 16,
    description:
      'A non-foaming cleanser that removes dirt without stripping your barrier. Good for dry and combination skin.',
  },
  {
    id: 'la-roche-posay-toleriane-cleanser',
    brand: 'La Roche-Posay',
    name: 'Toleriane Hydrating Gentle Cleanser',
    category: 'cleanser',
    imageUri: '',
    ingredients: ['prebiotic thermal water', 'niacinamide', 'ceramide-3'],
    keyIngredients: ['Prebiotic Thermal Water', 'Ceramide-3'],
    priceUsd: 17,
    description:
      'Low-foam cleanser that keeps the barrier intact while lifting makeup and SPF. Dermatologist-tested for sensitive skin.',
  },
  {
    id: 'beauty-of-joseon-ginseng-cleanser',
    brand: 'Beauty of Joseon',
    name: 'Red Bean Refreshing Foam Cleanser',
    category: 'cleanser',
    imageUri: '',
    ingredients: ['red bean extract', 'bamboo charcoal', 'papain'],
    keyIngredients: ['Red Bean Extract', 'Papain'],
    priceUsd: 15,
    description:
      'A mild foaming cleanser that controls shine on the T-zone without over-drying.',
  },

  // Toners
  {
    id: 'anua-heartleaf-toner',
    brand: 'Anua',
    name: 'Heartleaf 77% Soothing Toner',
    category: 'toner',
    imageUri: '',
    ingredients: ['heartleaf extract', 'panthenol', 'betaine'],
    keyIngredients: ['Heartleaf Extract 77%', 'Panthenol'],
    priceUsd: 19,
    description:
      'A lightweight toner that calms redness and preps skin for serums. Non-comedogenic.',
  },
  {
    id: 'paulas-choice-2-bha',
    brand: "Paula's Choice",
    name: 'Skin Perfecting 2% BHA Liquid Exfoliant',
    category: 'treatment',
    imageUri: '',
    ingredients: ['salicylic acid', 'green tea extract'],
    keyIngredients: ['Salicylic Acid 2%', 'Green Tea'],
    priceUsd: 35,
    description:
      'A liquid chemical exfoliant that clears clogged pores. Use 3x weekly to start.',
  },
  {
    id: 'biotherm-skin-oxygen-toner',
    brand: 'Biotherm',
    name: 'Skin Oxygen Oxygenating Lotion',
    category: 'toner',
    imageUri: '',
    ingredients: ['pure plankton extract', 'vitamin c', 'vitamin e'],
    keyIngredients: ['Pure Plankton Extract', 'Vitamin C'],
    priceUsd: 32,
    description:
      'A hydrating toner that brightens dullness without acids. Good for sensitive-reactive skin.',
  },

  // Serums
  {
    id: 'the-ordinary-niacinamide',
    brand: 'The Ordinary',
    name: 'Niacinamide 10% + Zinc 1%',
    category: 'serum',
    imageUri: '',
    ingredients: ['niacinamide', 'zinc PCA', 'tamarind seed glucan'],
    keyIngredients: ['Niacinamide 10%', 'Zinc 1%'],
    priceUsd: 14,
    description:
      'A high-strength niacinamide serum that reduces visible pore size and excess sebum over time.',
  },
  {
    id: 'good-molecules-discoloration',
    brand: 'Good Molecules',
    name: 'Discoloration Correcting Serum',
    category: 'serum',
    imageUri: '',
    ingredients: ['tranexamic acid', 'niacinamide', 'arbutin'],
    keyIngredients: ['Tranexamic Acid', 'Niacinamide'],
    priceUsd: 12,
    description:
      'Fades post-acne marks and sun-triggered pigmentation. Layers cleanly under moisturizer.',
  },
  {
    id: 'the-ordinary-retinal',
    brand: 'The Ordinary',
    name: 'Granactive Retinoid 2% Emulsion',
    category: 'treatment',
    imageUri: '',
    ingredients: ['hydroxypinacolone retinoate', 'squalane'],
    keyIngredients: ['Granactive Retinoid 2%'],
    priceUsd: 15,
    description:
      'A well-tolerated retinoid alternative that smooths texture and fine lines without the harshness of tretinoin.',
  },
  {
    id: 'elf-vitamin-c-serum',
    brand: 'e.l.f.',
    name: 'Super 10 Serum',
    category: 'serum',
    imageUri: '',
    ingredients: ['niacinamide', 'vitamin c', 'hyaluronic acid', 'turmeric'],
    keyIngredients: ['Vitamin C', 'Hyaluronic Acid', 'Turmeric'],
    priceUsd: 12,
    description:
      'A multi-tasking serum with vitamin C, hyaluronic acid, and niacinamide. A good daily brightener.',
  },

  // Moisturizers
  {
    id: 'cerave-pm-lotion',
    brand: 'CeraVe',
    name: 'PM Facial Moisturizing Lotion',
    category: 'moisturizer',
    imageUri: '',
    ingredients: ['niacinamide', 'ceramides', 'hyaluronic acid'],
    keyIngredients: ['3 Essential Ceramides', 'Niacinamide'],
    priceUsd: 18,
    description:
      'A lightweight nighttime lotion that rebuilds the barrier. Pairs well with actives.',
  },
  {
    id: 'illiyoon-ceramide-cream',
    brand: 'Illiyoon',
    name: 'Ceramide Ato Concentrate Cream',
    category: 'moisturizer',
    imageUri: '',
    ingredients: ['ceramide NP', 'glycerin', 'shea butter'],
    keyIngredients: ['Ceramide NP', 'Shea Butter'],
    priceUsd: 24,
    description:
      'A rich barrier cream from Korea. Good for dry cheeks paired with oilier T-zones.',
  },
  {
    id: 'la-roche-posay-toleriane-dd',
    brand: 'La Roche-Posay',
    name: 'Toleriane Double Repair Face Moisturizer',
    category: 'moisturizer',
    imageUri: '',
    ingredients: ['ceramide-3', 'niacinamide', 'prebiotic thermal water'],
    keyIngredients: ['Ceramide-3', 'Niacinamide'],
    priceUsd: 21,
    description:
      'Repairs a compromised barrier in under a week. Lightweight enough for daytime use.',
  },

  // SPF
  {
    id: 'beauty-of-joseon-relief-sun',
    brand: 'Beauty of Joseon',
    name: 'Relief Sun: Rice + Probiotics SPF50+',
    category: 'spf',
    imageUri: '',
    ingredients: ['rice extract', 'niacinamide', 'chemical filters'],
    keyIngredients: ['Rice Extract', 'Probiotics'],
    priceUsd: 18,
    description:
      'A chemical SPF that applies invisibly on most skin tones. Doesn\u2019t pill under makeup.',
  },
  {
    id: 'bonajour-green-tea-sun',
    brand: 'BONAJOUR',
    name: 'Green Tea Water Bomb Sun Cream SPF50+',
    category: 'spf',
    imageUri: '',
    ingredients: ['green tea extract', 'hyaluronic acid'],
    keyIngredients: ['Green Tea Extract'],
    priceUsd: 22,
    description:
      'A hydrating SPF that works well over oilier T-zones without cast.',
  },

  // Treatments
  {
    id: 'its-skin-collagen-ampoule',
    brand: "It's Skin",
    name: 'Power 10 Formula VB Effector',
    category: 'treatment',
    imageUri: '',
    ingredients: ['vitamin b', 'niacinamide'],
    keyIngredients: ['Vitamin B Complex'],
    priceUsd: 16,
    description:
      'An ampoule that targets texture and dullness. Best layered before heavier creams.',
  },
  {
    id: 'paulas-choice-azelaic',
    brand: "Paula's Choice",
    name: '10% Azelaic Acid Booster',
    category: 'treatment',
    imageUri: '',
    ingredients: ['azelaic acid', 'salicylic acid', 'bha'],
    keyIngredients: ['Azelaic Acid 10%', 'Salicylic Acid'],
    priceUsd: 39,
    description:
      'Calms redness and fades post-acne marks. Good for sensitive acne-prone skin.',
  },
  {
    id: 'the-ordinary-lactic-acid',
    brand: 'The Ordinary',
    name: 'Lactic Acid 10% + HA',
    category: 'treatment',
    imageUri: '',
    ingredients: ['lactic acid', 'hyaluronic acid'],
    keyIngredients: ['Lactic Acid 10%'],
    priceUsd: 10,
    description:
      'A gentler alternative to glycolic for evening skin texture. 2-3x weekly.',
  },

  // Masks
  {
    id: 'beauty-of-joseon-rice-mask',
    brand: 'Beauty of Joseon',
    name: 'Radiance Cleansing Balm',
    category: 'mask',
    imageUri: '',
    ingredients: ['rice bran oil', 'ginseng'],
    keyIngredients: ['Rice Bran Oil', 'Ginseng'],
    priceUsd: 18,
    description:
      'An oil cleansing balm that melts sunscreen and makeup without stripping skin.',
  },
  {
    id: 'its-skin-power-mask',
    brand: "It's Skin",
    name: 'Power 10 Formula Brightening Sheet Mask',
    category: 'mask',
    imageUri: '',
    ingredients: ['niacinamide', 'vitamin c'],
    keyIngredients: ['Niacinamide', 'Vitamin C'],
    priceUsd: 4,
    description:
      'A weekly brightening sheet mask for an instant glow after a long week.',
  },
  // v4 expansion — 24 products total
  {
    id: 'cosrx-snail-essence',
    brand: 'COSRX',
    name: 'Advanced Snail 96 Mucin Power Essence',
    category: 'serum',
    imageUri: '',
    ingredients: ['snail secretion filtrate', 'betaine', 'sodium hyaluronate'],
    keyIngredients: ['Snail Secretion Filtrate 96%'],
    priceUsd: 25,
    description:
      'A lightweight hydrating essence that strengthens the barrier and soothes irritation.',
  },
  {
    id: 'kiehls-ultra-facial-cream',
    brand: 'Kiehl\u2019s',
    name: 'Ultra Facial Cream',
    category: 'moisturizer',
    imageUri: '',
    ingredients: ['squalane', 'glycerin', 'glacial glycoprotein'],
    keyIngredients: ['Squalane', 'Glacial Glycoprotein'],
    priceUsd: 36,
    description:
      'A daily moisturizer that restores hydration without heaviness. Works year-round.',
  },
  {
    id: 'supergoop-unseen',
    brand: 'Supergoop!',
    name: 'Unseen Sunscreen SPF 40',
    category: 'spf',
    imageUri: '',
    ingredients: ['avobenzone', 'meadowfoam seed oil', 'frankincense'],
    keyIngredients: ['Avobenzone', 'Meadowfoam Seed Oil'],
    priceUsd: 38,
    description:
      'A completely invisible, weightless sunscreen that primes skin for makeup.',
  },
  {
    id: 'youth-to-the-people-kale',
    brand: 'Youth To The People',
    name: 'Superfood Cleanser',
    category: 'cleanser',
    imageUri: '',
    ingredients: ['kale', 'spinach', 'green tea', 'vitamin c'],
    keyIngredients: ['Kale', 'Green Tea'],
    priceUsd: 39,
    description:
      'A gel cleanser loaded with antioxidants. Great for morning rinses.',
  },
];

/* ------------------------------- Matches ------------------------------- */
/**
 * Matches only become meaningful after the first scan. `api/matches.ts` picks
 * these by keying on the latest zones. We seed a full map so the Products and
 * Home screens can show realistic numbers when the user has scanned.
 */
export const seedMatches: ProductMatch[] = [
  {
    productId: 'paulas-choice-2-bha',
    matchPercent: 96,
    reasonsWhy: [
      'Salicylic acid reaches into the clogs on your chin.',
      'Already showing 18% clarity improvement in your zone data.',
      'Every-other-night cadence matches your skin tolerance.',
    ],
    flags: [],
  },
  {
    productId: 'the-ordinary-niacinamide',
    matchPercent: 94,
    reasonsWhy: [
      'Zinc regulates the sebum driving your T-zone shine.',
      'Reduces visible pore size on your nose over time.',
      'Plays well with the BHA on your acid nights.',
    ],
  },
  {
    productId: 'beauty-of-joseon-relief-sun',
    matchPercent: 95,
    reasonsWhy: [
      'Rice extract calms the redness we tracked on your cheeks.',
      'Imperceptibly lightweight on oily T-zones.',
      'SPF50+ PA++++ is the target for your treatment phase.',
    ],
  },
  {
    productId: 'la-roche-posay-toleriane-cleanser',
    matchPercent: 90,
    reasonsWhy: [
      'Prebiotic thermal water calms reactive skin.',
      'Low-foam formula preserves your lipid layer.',
      'Dermatologist-tested for sensitized skin.',
    ],
  },
  {
    productId: 'anua-heartleaf-toner',
    matchPercent: 93,
    reasonsWhy: [
      'Heartleaf extract directly targets your cheek redness.',
      'Non-comedogenic \u2014 safe for your active chin area.',
      'Light consistency layers cleanly under serums.',
    ],
  },
  {
    productId: 'cerave-pm-lotion',
    matchPercent: 93,
    reasonsWhy: [
      'Three essential ceramides rebuild your barrier overnight.',
      'Lightweight lotion pairs with your chin treatment.',
      'Niacinamide compounds your daytime serum.',
    ],
  },
  {
    productId: 'good-molecules-discoloration',
    matchPercent: 88,
    reasonsWhy: [
      'Tranexamic acid addresses post-acne marks on your jaw.',
      'Works alongside niacinamide without irritation.',
    ],
  },
  {
    productId: 'illiyoon-ceramide-cream',
    matchPercent: 91,
    reasonsWhy: [
      'Ceramide NP matches your barrier repair needs.',
      'Rich enough for your dry cheeks, not heavy on your T-zone.',
    ],
  },
  {
    productId: 'the-ordinary-retinal',
    matchPercent: 72,
    reasonsWhy: [
      'Good next step after your chin fully clears.',
      'Evening-only \u2014 pair with barrier cream.',
    ],
    flags: ['Hold off until your active chin spots resolve.'],
  },
  {
    productId: 'the-ordinary-lactic-acid',
    matchPercent: 70,
    reasonsWhy: ['Gentle exfoliation for evenings without BHA.'],
    flags: ['Do not stack with the BHA the same night.'],
  },
  {
    productId: 'cerave-hydrating-cleanser',
    matchPercent: 89,
    reasonsWhy: ['Non-stripping for combination skin.', 'Ceramides rebuild barrier.'],
  },
  {
    productId: 'beauty-of-joseon-ginseng-cleanser',
    matchPercent: 84,
    reasonsWhy: ['Controls T-zone shine without over-drying.'],
  },
  {
    productId: 'biotherm-skin-oxygen-toner',
    matchPercent: 68,
    reasonsWhy: ['Brightens without acids.'],
    flags: ['Not essential given your current routine.'],
  },
  {
    productId: 'la-roche-posay-toleriane-dd',
    matchPercent: 86,
    reasonsWhy: ['Repairs barrier in under a week.', 'Lightweight for daytime.'],
  },
  {
    productId: 'bonajour-green-tea-sun',
    matchPercent: 89,
    reasonsWhy: ['Hydrating base for cheeks.', 'No white cast.'],
  },
  {
    productId: 'its-skin-collagen-ampoule',
    matchPercent: 63,
    reasonsWhy: ['Smooths texture over time.'],
    flags: ['Redundant given your Niacinamide serum.'],
  },
  {
    productId: 'paulas-choice-azelaic',
    matchPercent: 81,
    reasonsWhy: [
      'Calms redness and fades marks.',
      'Worth adding once your chin fully resolves.',
    ],
  },
  {
    productId: 'elf-vitamin-c-serum',
    matchPercent: 74,
    reasonsWhy: ['Daily brightener with HA.'],
    flags: ['Pick either this or the Niacinamide \u2014 not both.'],
  },
  {
    productId: 'beauty-of-joseon-rice-mask',
    matchPercent: 77,
    reasonsWhy: ['Dissolves SPF cleanly for your double cleanse.'],
  },
  {
    productId: 'its-skin-power-mask',
    matchPercent: 55,
    reasonsWhy: ['Weekly brightening boost.'],
    flags: ['Optional \u2014 not essential to your current goals.'],
  },
  {
    productId: 'cosrx-snail-essence',
    matchPercent: 87,
    reasonsWhy: [
      'Heavy on barrier repair \u2014 pairs well with your BHA nights.',
      'Non-irritating; safe across your active chin area.',
    ],
  },
  {
    productId: 'kiehls-ultra-facial-cream',
    matchPercent: 78,
    reasonsWhy: ['Reliable daily moisturizer, lightweight enough for T-zone layering.'],
  },
  {
    productId: 'supergoop-unseen',
    matchPercent: 85,
    reasonsWhy: [
      'Invisible finish over combination skin.',
      'Non-comedogenic and plays well under makeup.',
    ],
  },
  {
    productId: 'youth-to-the-people-kale',
    matchPercent: 72,
    reasonsWhy: ['Antioxidant wash for mornings when you want a brighter prep.'],
  },
];

/* --------------------------- Enriched catalog --------------------------- */
/**
 * Apply the v7.6 enrichment layer now that `seedMatches` is defined — the
 * map lookup below lets `matchScoreFor` pick up curated match percents
 * instead of synthesised ones.
 */

const _matchPercentByProductId: Record<string, number> = Object.fromEntries(
  seedMatches.map((m) => [m.productId, m.matchPercent])
);

function enrich(raw: RawSeedProduct): Product {
  return {
    ...raw,
    tint: tintFor(raw.id),
    rating: ratingFor(raw.id),
    reviewCount: reviewCountFor(raw.id),
    matchScore: matchScoreFor(raw.id, _matchPercentByProductId),
    tags: tagsFor(raw),
    addedDate: addedDateFor(raw.id),
    price: raw.priceUsd ?? 15,
    ingredientList: deriveIngredientList(raw.ingredients),
    // v10.31 — prefer hand-authored, product-specific instructions
    // when available (PRODUCT_DETAIL_OVERRIDES). The category-level
    // template still kicks in for any product we haven't authored
    // copy for yet, so the detail page never shows a blank field.
    howToUse: howToUseOverrideFor(raw.id) ?? howToUseFor(raw.category),
    formulation: formulationFor(raw.category),
    skinTypes: skinTypesFor(raw.category),
    goodFor: goodForOverrideFor(raw.id) ?? goodForFor(raw.category),
    timeOfUse: timeOfUseFor(raw.category),
    // v10.31 — prefer the real OBF image URL when one was resolved
    // for this product. Falls back to whatever the raw seed set on
    // imageUri (currently empty for every product); when both are
    // empty, the cards/hero render the upgraded
    // `ProductPlaceholderImage` (per-category bottle silhouette +
    // brand wordmark + product name).
    imageUrl: imageUrlFor(raw.id) ?? raw.imageUri,
    buyUrl: buyUrlFor(raw.id),
  };
}

export const seedProducts: Product[] = rawSeedProducts.map(enrich);

/* ------------------------------- Scans ------------------------------- */

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const seedScans: Scan[] = [
  {
    id: 'scan-day-1',
    capturedAt: isoDaysAgo(18),
    dayNumber: 1,
    photoUri: picsum('face-day1'),
    overallScore: 58,
    summaryHeadline: 'Here\u2019s where we\u2019re starting.',
    summaryBody:
      'Your chin and forehead are active. Cheeks are calm but slightly reactive. We\u2019ll target the chin first.',
    zones: [
      {
        key: 'chin',
        label: 'Chin',
        status: 'active',
        trend: 'stable',
        score: 42,
        shortInsight: '11 spots, inflamed',
        glow: [{ x: 0.5, y: 0.82, radius: 0.28, intensity: 0.55 }],
      },
      {
        key: 'forehead',
        label: 'Forehead',
        status: 'active',
        trend: 'stable',
        score: 58,
        shortInsight: 'Small closed comedones',
        glow: [{ x: 0.5, y: 0.18, radius: 0.32, intensity: 0.45 }],
      },
      {
        key: 'tZone',
        label: 'T-zone',
        status: 'monitor',
        trend: 'stable',
        score: 61,
        shortInsight: 'Visible pores on nose',
        glow: [{ x: 0.5, y: 0.52, radius: 0.22, intensity: 0.35 }],
      },
      {
        key: 'cheeks',
        label: 'Cheeks',
        status: 'monitor',
        trend: 'stable',
        score: 74,
        shortInsight: 'Diffuse redness',
        glow: [
          { x: 0.22, y: 0.58, radius: 0.22, intensity: 0.3 },
          { x: 0.78, y: 0.58, radius: 0.22, intensity: 0.3 },
        ],
      },
    ],
  },
  {
    id: 'scan-day-7',
    capturedAt: isoDaysAgo(12),
    dayNumber: 7,
    photoUri: picsum('face-day7'),
    overallScore: 67,
    summaryHeadline: 'Redness is easing off.',
    summaryBody:
      'The heartleaf toner is landing. Cheeks are visibly calmer than Day 1.',
    zones: [
      {
        key: 'chin',
        label: 'Chin',
        status: 'active',
        trend: 'improving',
        score: 52,
        shortInsight: '8 spots, improving',
      },
      {
        key: 'forehead',
        label: 'Forehead',
        status: 'calm',
        trend: 'improving',
        score: 78,
        shortInsight: 'Mostly clear',
      },
      {
        key: 'tZone',
        label: 'T-zone',
        status: 'monitor',
        trend: 'improving',
        score: 66,
        shortInsight: 'Slight pore refinement',
      },
      {
        key: 'cheeks',
        label: 'Cheeks',
        status: 'calm',
        trend: 'improving',
        score: 82,
        shortInsight: 'Redness 40% down',
      },
    ],
  },
  {
    id: 'scan-day-19',
    capturedAt: isoDaysAgo(0),
    dayNumber: 19,
    photoUri: picsum('face-day19'),
    overallScore: 74,
    summaryHeadline: 'Your chin is clearing up.',
    summaryBody:
      'The BHA is working. Measurably clearer than two weeks ago.',
    zones: [
      {
        key: 'chin',
        label: 'Chin',
        status: 'active',
        trend: 'improving',
        score: 64,
        shortInsight: '6 spots, improving',
        glow: [{ x: 0.5, y: 0.82, radius: 0.22, intensity: 0.45 }],
      },
      {
        key: 'forehead',
        label: 'Forehead',
        status: 'calm',
        trend: 'improving',
        score: 88,
        shortInsight: 'Cleared since last week',
      },
      {
        key: 'tZone',
        label: 'T-zone',
        status: 'monitor',
        trend: 'stable',
        score: 68,
        shortInsight: 'Visible pores, stable',
        glow: [{ x: 0.5, y: 0.52, radius: 0.16, intensity: 0.28 }],
      },
      {
        key: 'cheeks',
        label: 'Cheeks',
        status: 'calm',
        trend: 'stable',
        score: 88,
        shortInsight: 'Calm, even tone',
      },
    ],
  },
];

/* ------------------------------- Routine ------------------------------- */
//
// v10.14 — `seedRoutine: RoutineStep[]` removed. The legacy rich-routine
// shape (AI-generated steps with instructions / why-this-product) is no
// longer part of the app: the v10.13 Routine sub-tab reads product-id
// arrays (`userRoutineMorning`, `userRoutineEvening`) that the user
// builds themselves from AddToRoutineSheet. Nothing imports this seed.
//
// If a future feature re-introduces an AI-generated routine, it should
// author a fresh seed fixture rather than inherit the old shape — the
// prior step/order/slot data model grew out of a design that no longer
// ships.
// ------------------------------------------------------------------------

/* ------------------------------- Users ------------------------------- */

export const seedUserNew: User = {
  id: 'user-demo',
  name: 'You',
  initials: 'YO',
  avatarColor: avatarSwatches[0],
  joinedAt: isoDaysAgo(0),
};

export const seedUserPopulated: User = {
  id: 'user-demo',
  name: 'Maya',
  initials: 'MA',
  avatarColor: avatarSwatches[0],
  joinedAt: isoDaysAgo(18),
};

export const INITIAL_TONIGHT_TIME = '9:30 PM';
