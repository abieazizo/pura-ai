/**
 * Pura AI — assistant response shaper (v11.5).
 *
 * The assistant is prompted to return short, scannable answers
 * (`server/openai/openai-client.ts::answerAssistant` system prompt
 * caps it at ~80 words with one-sentence-then-bullets format), but
 * gpt-5 does occasionally drift into long paragraphs anyway. This
 * shaper is the client-side guard rail: it normalises whatever the
 * model returns into a consistent renderable structure that the
 * MessageLine component can lay out cleanly.
 *
 * Output:
 *   {
 *     lead: string                   // one short opener
 *     blocks: Array<TextBlock>       // ordered renderable chunks
 *   }
 *
 * Where TextBlock is either:
 *   { kind: 'paragraph', text }      // a short paragraph
 *   { kind: 'bullet',    text }      // a single bullet item
 *
 * Rules:
 *   1. The lead is the first sentence (split on `. ! ?`). If the
 *      first sentence is too long (>22 words), we keep it as-is —
 *      truncating mid-thought is worse than long.
 *   2. Bullets are detected from common markdown / unicode markers
 *      (`- `, `• `, `* `, `1. `). We strip the marker and emit
 *      `kind: 'bullet'`.
 *   3. Paragraphs longer than ~50 words are split at the nearest
 *      sentence boundary so the chat doesn't render a wall of text.
 *   4. Hard cap: at most 5 blocks (one lead + 4 follow-ups). Any
 *      excess is dropped. The model was told 2-4 bullets max; if it
 *      ignored that, we enforce client-side.
 *   5. Markdown bold/italic markers are stripped (the chat surface
 *      uses native typography, not markdown).
 */

export interface ShapedTextBlock {
  kind: 'paragraph' | 'bullet';
  text: string;
}

export interface ShapedAssistantText {
  lead: string;
  blocks: ShapedTextBlock[];
}

const MAX_BLOCKS = 5;
const PARAGRAPH_SOFT_WORDS = 50;
const LEAD_SOFT_WORDS = 22;

/** Strip markdown emphasis markers without touching content. */
function stripMd(s: string): string {
  return (
    s
      // bold/italic with ** or __ or single * single _
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // code fences (leave inline backticks alone)
      .replace(/```[\s\S]*?```/g, '')
      // remove leading "# " heading markers
      .replace(/^#{1,6}\s+/gm, '')
      .trim()
  );
}

/** Split into sentences without an external NLP dep. Conservative. */
function splitSentences(s: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    buf += s[i];
    const ch = s[i];
    const next = s[i + 1] ?? '';
    if ((ch === '.' || ch === '!' || ch === '?') && /\s|$/.test(next)) {
      out.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim().length > 0) out.push(buf.trim());
  return out.filter((x) => x.length > 0);
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

export function shapeAssistantText(raw: string): ShapedAssistantText {
  const text = stripMd(raw);
  if (text.length === 0) {
    return { lead: '', blocks: [] };
  }

  // Split lines first; bullet detection is line-oriented.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // First we extract the lead. The lead is the FIRST line if it's
  // not a bullet, OR the first sentence of the first paragraph.
  let lead = '';
  let consumedFirst = false;

  // Pass 1: identify which lines are bullets vs paragraph text.
  type RawBlock = { kind: 'paragraph' | 'bullet'; text: string };
  const raws: RawBlock[] = [];

  for (const line of lines) {
    const bulletMatch = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      raws.push({ kind: 'bullet', text: bulletMatch[1].trim() });
    } else {
      raws.push({ kind: 'paragraph', text: line });
    }
  }

  // Lead extraction: first paragraph block's first sentence.
  for (let i = 0; i < raws.length; i++) {
    const r = raws[i];
    if (r.kind === 'paragraph') {
      const sentences = splitSentences(r.text);
      const first = sentences[0] ?? r.text;
      const rest = sentences.slice(1).join(' ').trim();
      lead = first;
      // Replace this paragraph with whatever's left after the first
      // sentence (or remove it if nothing's left).
      if (rest.length > 0) {
        raws[i] = { kind: 'paragraph', text: rest };
      } else {
        raws.splice(i, 1);
      }
      consumedFirst = true;
      break;
    }
    // If the response opened with a bullet, that's unusual — use
    // the bullet itself as the lead.
    if (r.kind === 'bullet' && !consumedFirst) {
      lead = r.text;
      raws.splice(i, 1);
      consumedFirst = true;
      break;
    }
  }

  // If lead is still empty (edge: empty text or all whitespace),
  // bail out gracefully.
  if (lead.length === 0 && raws.length > 0) {
    lead = raws[0].text;
    raws.shift();
  }

  // Pass 2: split overlong paragraphs at sentence boundaries.
  const blocks: ShapedTextBlock[] = [];
  for (const r of raws) {
    if (r.kind === 'bullet') {
      blocks.push({ kind: 'bullet', text: r.text });
      continue;
    }
    const sentences = splitSentences(r.text);
    let buf = '';
    for (const s of sentences) {
      const candidate = buf.length === 0 ? s : `${buf} ${s}`;
      if (wordCount(candidate) > PARAGRAPH_SOFT_WORDS) {
        if (buf.length > 0) blocks.push({ kind: 'paragraph', text: buf });
        buf = s;
      } else {
        buf = candidate;
      }
    }
    if (buf.length > 0) blocks.push({ kind: 'paragraph', text: buf });
  }

  // Hard cap on total blocks.
  while (blocks.length > MAX_BLOCKS - 1 /* 4 follow-ups */) blocks.pop();

  // Note: `consumedFirst` and `LEAD_SOFT_WORDS` are tracked for the
  // future "if lead is too long, demote to first paragraph block"
  // policy. Today we keep the lead verbatim because truncating
  // mid-thought is worse than long.
  void consumedFirst;
  void LEAD_SOFT_WORDS;

  return { lead, blocks };
}
