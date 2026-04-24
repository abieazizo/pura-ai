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
    imageUri: picsum('cerave-hyd'),
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
    imageUri: picsum('lrp-tol'),
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
    imageUri: picsum('boj-rb'),
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
    imageUri: picsum('anua-heart'),
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
    imageUri: picsum('pc-bha'),
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
    imageUri: picsum('bio-sox'),
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
    imageUri: picsum('to-niac'),
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
    imageUri: picsum('gm-disc'),
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
    imageUri: picsum('to-ret'),
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
    imageUri: picsum('elf-s10'),
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
    imageUri: picsum('cerave-pm'),
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
    imageUri: picsum('illi-cc'),
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
    imageUri: picsum('lrp-dd'),
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
    imageUri: picsum('boj-relief'),
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
    imageUri: picsum('bon-gt'),
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
    imageUri: picsum('iss-vb'),
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
    imageUri: picsum('pc-aza'),
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
    imageUri: picsum('to-la'),
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
    imageUri: picsum('boj-balm'),
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
    imageUri: picsum('iss-mask'),
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
    imageUri: picsum('cosrx-snail'),
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
    imageUri: picsum('kiehls-ultra'),
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
    imageUri: picsum('supergoop-unseen'),
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
    imageUri: picsum('ytp-kale'),
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
    howToUse: howToUseFor(raw.category),
    formulation: formulationFor(raw.category),
    skinTypes: skinTypesFor(raw.category),
    goodFor: goodForFor(raw.category),
    timeOfUse: timeOfUseFor(raw.category),
    imageUrl: raw.imageUri,
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
