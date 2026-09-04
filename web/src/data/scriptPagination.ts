/**
 * Splits display pages without changing the approved script source.  Prefer a
 * sentence boundary, then a natural clause boundary for an unusually long
 * sentence, so that a dialogue box never has to carry a dense paragraph.
 */
export const NARRATIVE_PAGE_TARGET_LENGTH = 58;

export function formatNarrativeDisplayText(text: string): string {
  const sentenceEnds = Array.from(text.matchAll(/[。！？]+[”」』）]?/gu), (match) => (match.index ?? 0) + match[0].length)
    .filter((index) => index < text.length);
  if (sentenceEnds.length === 0) return text;
  const midpoint = text.length / 2;
  const breakAt = sentenceEnds.reduce((best, index) => (
    Math.abs(index - midpoint) < Math.abs(best - midpoint) ? index : best
  ));
  return `${text.slice(0, breakAt)}\n${text.slice(breakAt)}`;
}

export function paginateNarrativeText(text: string, targetLength = NARRATIVE_PAGE_TARGET_LENGTH): string[] {
  if (text.length <= targetLength) return [text];

  const sentences = text.match(/[^。！？]+[。！？]+[”」』）]?|[^。！？]+$/gu) ?? [text];
  const pages: string[] = [];
  let page = "";

  for (const sentence of sentences) {
    if (page && page.length + sentence.length > targetLength) {
      pages.push(page);
      page = "";
    }
    if (sentence.length <= targetLength) {
      page += sentence;
      continue;
    }

    const clauses = sentence.match(/[^，、；：]+[，、；：]?|.+$/gu) ?? [sentence];
    for (let clause of clauses) {
      if (page && page.length + clause.length > targetLength) {
        pages.push(page);
        page = "";
      }
      while (clause.length > targetLength) {
        pages.push(clause.slice(0, targetLength));
        clause = clause.slice(targetLength);
      }
      page += clause;
    }
  }
  if (page) pages.push(page);
  return pages;
}
