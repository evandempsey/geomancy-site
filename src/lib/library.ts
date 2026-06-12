import { getCollection, type CollectionEntry } from 'astro:content';

export type Chapter = CollectionEntry<'library'>;

/** "gerard/01-first-house" → "first-house" (URL slug within the source) */
export function chapterSlug(entry: Chapter): string {
  const file = entry.id.split('/').pop() ?? entry.id;
  return file.replace(/^\d+-/, '');
}

export async function chaptersOf(sourceId: string): Promise<Chapter[]> {
  const chapters = await getCollection('library', ({ data }) => data.source.id === sourceId);
  return chapters.sort((a, b) => a.data.order - b.data.order);
}
