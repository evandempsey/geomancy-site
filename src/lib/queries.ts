import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Quote = CollectionEntry<'quotes'>;
export type Source = CollectionEntry<'sources'>;
export type Figure = CollectionEntry<'figures'>;

export interface QuoteFilter {
  /** figure id, e.g. "puer" */
  figure?: string;
  /** house number 1–12 */
  house?: number;
  /** topic key, e.g. "perfection.translation" */
  topic?: string;
  /** only quotes NOT tied to any house (general figure meanings) */
  generalOnly?: boolean;
  /** only quotes NOT tied to specific figures (doctrine pages; the
   * figure-tagged quotes appear on the figure pages instead) */
  noFigures?: boolean;
}

let sourceOrder: Map<string, number> | undefined;

async function getSourceOrder(): Promise<Map<string, number>> {
  if (!sourceOrder) {
    const sources = await getCollection('sources');
    sourceOrder = new Map(sources.map((s) => [s.id, s.data.order]));
  }
  return sourceOrder;
}

/**
 * The central view function: every interpretive page is a query over the
 * quote corpus. Results are ordered by source (Cattan first), then locator.
 */
export async function quotesFor(filter: QuoteFilter): Promise<Quote[]> {
  const order = await getSourceOrder();
  const quotes = await getCollection('quotes', ({ data }) => {
    if (filter.figure && !data.figures.some((f) => f.id === filter.figure)) return false;
    if (filter.house !== undefined && !data.houses.includes(filter.house)) return false;
    if (filter.generalOnly && data.houses.length > 0) return false;
    if (filter.noFigures && data.figures.length > 0) return false;
    if (filter.topic && !data.topics.includes(filter.topic)) return false;
    return true;
  });
  return quotes.sort(
    (a, b) =>
      (order.get(a.data.source.id) ?? 99) - (order.get(b.data.source.id) ?? 99) ||
      a.data.locator.localeCompare(b.data.locator, undefined, { numeric: true }),
  );
}

/** Format the citation line for a quote from its source's template. */
export async function citationFor(quote: Quote): Promise<string> {
  const source = await getEntry('sources', quote.data.source.id);
  if (!source) return quote.data.locator;
  return source.data.citationTemplate.replace('{locator}', quote.data.locator);
}

/** Which figure×house combinations have at least one usable quote. */
export async function houseCoverage(): Promise<Map<string, Quote[]>> {
  const quotes = await getCollection(
    'quotes',
    ({ data }) => data.quality !== 'ocr-draft' && data.houses.length > 0 && data.figures.length > 0,
  );
  const map = new Map<string, Quote[]>();
  for (const q of quotes) {
    for (const f of q.data.figures) {
      for (const h of q.data.houses) {
        const key = `${f.id}/${h}`;
        map.set(key, [...(map.get(key) ?? []), q]);
      }
    }
  }
  return map;
}
