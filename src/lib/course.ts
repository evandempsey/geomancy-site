import { getCollection, type CollectionEntry } from 'astro:content';

export type Lesson = CollectionEntry<'course'>;

/** Slugs that live directly under /course/ as plain pages, not lessons. */
const RESERVED_SLUGS = new Set(['how-to-study', 'charts']);

/** "04-casting-the-chart" → "casting-the-chart" (URL slug). */
export function lessonSlug(entry: Lesson): string {
  const file = entry.id.split('/').pop() ?? entry.id;
  return file.replace(/^\d+-/, '');
}

export function lessonUrl(entry: Lesson): string {
  return `/course/${lessonSlug(entry)}/`;
}

/**
 * All published lessons in order. Validates what zod cannot see across
 * entries: duplicate orders, duplicate slugs, reserved-slug collisions.
 */
export async function allLessons(): Promise<Lesson[]> {
  const lessons = (await getCollection('course', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.order - b.data.order,
  );
  const seenOrders = new Set<number>();
  const seenSlugs = new Set<string>();
  for (const lesson of lessons) {
    const slug = lessonSlug(lesson);
    if (seenOrders.has(lesson.data.order)) {
      throw new Error(`Duplicate lesson order ${lesson.data.order} (${lesson.id})`);
    }
    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate lesson slug "${slug}" (${lesson.id})`);
    }
    if (RESERVED_SLUGS.has(slug)) {
      throw new Error(`Lesson slug "${slug}" collides with a reserved /course/ page`);
    }
    seenOrders.add(lesson.data.order);
    seenSlugs.add(slug);
  }
  return lessons;
}

export async function prevNext(
  entry: Lesson,
): Promise<{ prev: Lesson | undefined; next: Lesson | undefined }> {
  const lessons = await allLessons();
  const i = lessons.findIndex((l) => l.id === entry.id);
  return { prev: lessons[i - 1], next: lessons[i + 1] };
}

/** The four parts of the course, for syllabus grouping. */
export const PARTS = [
  { number: 1, title: 'Foundations' },
  { number: 2, title: 'Reading the Chart' },
  { number: 3, title: 'Judgment' },
  { number: 4, title: 'Mastery' },
] as const;

/**
 * Lessons not yet written, shown unlinked on the syllabus. All thirteen
 * lessons are now published, so the list stands empty; it is kept so any
 * future additions to the course rejoin the same machinery.
 */
export const FORTHCOMING: { order: number; part: number; title: string; synopsis: string }[] = [];
