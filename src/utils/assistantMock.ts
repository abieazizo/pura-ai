import type { AssistantMessage, Scan } from '@/types';
import { getProduct } from '@/api/products';

/**
 * Pattern-matches on the user's text + latest scan zones to produce a mock
 * assistant reply. Not a real LLM — grounded enough to feel believable.
 */
export async function buildAssistantReply(args: {
  text: string;
  attachedProductIds?: string[];
  latestScan?: Scan;
  messageId: string;
}): Promise<AssistantMessage> {
  const { text, attachedProductIds = [], latestScan, messageId } = args;
  const lowered = text.toLowerCase();

  const attachedNames = await Promise.all(
    attachedProductIds.map(async (id) => {
      const p = await getProduct(id);
      return p ? `${p.brand} ${p.name}` : null;
    })
  );
  const namedList = attachedNames.filter((n): n is string => !!n);

  let body = '';

  if (latestScan) {
    const active = latestScan.zones.find((z) => z.status === 'active');
    const calm = latestScan.zones.find((z) => z.status === 'calm');

    if (lowered.includes('routine')) {
      body = buildRoutineAnswer(latestScan);
    } else if (lowered.includes('ingredient')) {
      body = buildIngredientAnswer(latestScan);
    } else if (lowered.includes('type')) {
      body = buildSkinTypeAnswer(latestScan);
    } else if (lowered.includes('breakout') || lowered.includes('acne')) {
      body = buildBreakoutAnswer(latestScan);
    } else {
      body =
        `Looking at your most recent scan \u2014 ${
          active
            ? `${active.label.toLowerCase()} is still active (${active.shortInsight.toLowerCase()})`
            : 'nothing is flagged active right now'
        }${calm ? `, and ${calm.label.toLowerCase()} is now calm` : ''}.\n\n` +
        `On "${text.trim()}": let's focus on what's already working before adding anything new.`;
    }
  } else {
    body =
      `On "${text.trim()}" \u2014 I haven't seen your skin yet, so here's a safe starter answer. ` +
      `Begin with a gentle cleanser, a barrier-friendly moisturizer, and SPF every morning. ` +
      `When you're ready, a scan will let me give specific advice.`;
  }

  if (namedList.length > 0) {
    body +=
      namedList.length === 1
        ? `\n\nAbout ${namedList[0]}: it slots in cleanly if you introduce it every other day for the first week.`
        : `\n\nAbout ${namedList.join(' and ')}: introduce one at a time so you can tell which is doing the work.`;
  }

  return {
    id: messageId,
    role: 'assistant',
    text: body,
    createdAt: new Date().toISOString(),
  };
}

function buildRoutineAnswer(scan: Scan): string {
  const active = scan.zones.find((z) => z.status === 'active');
  const zoneLabel = active ? active.label.toLowerCase() : 'your current focus area';
  return (
    `A routine tailored to your ${zoneLabel}:\n\n` +
    `• AM — gentle cleanser, soothing toner, niacinamide serum, SPF50+.\n` +
    `• PM — double cleanse, targeted BHA every other night, ceramide moisturizer.\n\n` +
    `Give each new product a week before layering the next. I'll track how it's going through your next scan.`
  );
}

function buildIngredientAnswer(scan: Scan): string {
  const active = scan.zones.find((z) => z.status === 'active');
  return (
    `For your skin right now I'd lean on niacinamide, salicylic acid (BHA), and ceramides. ` +
    `Avoid strong vitamin C or retinoids stacked on the same night as the BHA until ` +
    `${active ? active.label.toLowerCase() : 'your active area'} settles.`
  );
}

function buildSkinTypeAnswer(scan: Scan): string {
  const tzone = scan.zones.find((z) => z.key === 'tZone');
  const cheeks = scan.zones.find((z) => z.key === 'cheeks');
  const combo =
    tzone && cheeks && tzone.score < cheeks.score;
  return combo
    ? `Your T-zone reads oilier than your cheeks, which puts you in combination territory. I'd treat them differently \u2014 lighter hydration across the T-zone, richer layers on the cheeks.`
    : `You're reading fairly balanced. I'd focus on barrier support and let me watch for drift across the next scan.`;
}

function buildBreakoutAnswer(scan: Scan): string {
  const active = scan.zones.find((z) => z.status === 'active');
  if (!active) {
    return `Good news \u2014 nothing is flagged active right now. Keep your current routine and we'll watch for any new activity.`;
  }
  return (
    `The breakouts are concentrated on your ${active.label.toLowerCase()} ` +
    `(${active.shortInsight.toLowerCase()}). The BHA is the lever here: 2\u20133 nights a week, cotton pad to the area only, ` +
    `never stacked with retinoids. Give it a full cycle before changing anything.`
  );
}
