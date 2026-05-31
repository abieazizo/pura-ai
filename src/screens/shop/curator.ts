/**
 * Pura Shop — the curator identity.
 *
 * The shop is edited, not merely personalized. Every issue and every
 * section carries a credit. Round-2 Pass 1 introduces a named editor
 * so the publication reads as a person's taste, not a brand voice.
 *
 * The single canonical editor for now is Nora Okafor — a fictional
 * biochemist-turned-editor who signs the issue and the hero notes.
 * Additional curators can be added here and credited per section if
 * the catalog grows.
 */

export interface Curator {
  /** Full name as it appears on the masthead credit. */
  name: string;
  /** Initials used to sign hero notes and inline mentions. */
  initials: string;
  /** Short professional descriptor — "biochemist", "perfumer", etc. */
  role: string;
  /** Italic-serif signature glyph (e.g. "— N.O."). */
  sig: string;
}

export const EDITOR_NORA: Curator = {
  name: 'Nora Okafor',
  initials: 'N.O.',
  role: 'biochemist',
  sig: '— N.',
};

/**
 * Compose a signed editor's note for the hero, addressed to the user
 * and tied to a primary scan signal. Synthesized lines per concern so
 * the note feels written, not template-generated.
 */
export function composeEditorsNote(
  primaryConcernLabel: string | undefined,
  userInitial: string | null,
  editor: Curator = EDITOR_NORA,
): { greeting: string; body: string; signature: string } {
  const you = userInitial ? `${userInitial}.` : 'you';
  const concern = (primaryConcernLabel ?? '').toLowerCase();

  let body: string;
  if (concern.includes('breakouts') || concern.includes('chin') || concern.includes('clear')) {
    body = `I noticed your chin tonight. This one earns its place by being kind to active areas — no heroics, no fragrance. Use it like you mean it; the routine does the rest.`;
  } else if (concern.includes('hydration') || concern.includes('dry') || concern.includes('replenish')) {
    body = `The T-zone read dry on tonight's scan. I'd reach for this first — it holds water at the surface without sitting heavy. Press it in; do not rub.`;
  } else if (concern.includes('barrier')) {
    body = `Your barrier is asking for a quiet night. This one repairs without lecturing — it does its work overnight and steps out of the way.`;
  } else if (concern.includes('mark') || concern.includes('tone') || concern.includes('bright')) {
    body = `Marks are patient. So is this. Twelve weeks in, you start to see what it does, and not before. Begin tonight; keep going.`;
  } else if (concern.includes('sensitive') || concern.includes('calm')) {
    body = `Tonight asks for less. This is the gentlest place to start, and the one I'd pick for someone I liked.`;
  } else {
    body = `Tonight, I'd reach for this first. Quiet ingredients, no fragrance, and the kind of formula that does its work and steps out of the way.`;
  }

  return {
    greeting: userInitial ? `${you},` : 'Tonight,',
    body,
    signature: editor.sig,
  };
}
