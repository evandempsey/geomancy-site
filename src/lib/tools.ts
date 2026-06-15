/**
 * The practice tools: the interactive widgets built for the course, each
 * with a standalone page under /tools/. Pure data — content.config.ts
 * imports TOOL_KEYS for the lesson frontmatter enum, and Lesson.astro
 * renders each lesson's `tools:` list as links via toolByKey.
 */
import { withBase } from './url';

export const TOOL_KEYS = [
  'casting-widget',
  'flashcards',
  'placement-lookup',
  'reading-worksheet',
  'gerard-casting',
] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

export interface Tool {
  /** Value used in lesson frontmatter `tools:`. */
  key: ToolKey;
  slug: string;
  title: string;
  description: string;
  /** Lesson(s) that formally teach the tool's method. */
  taughtIn: { href: string; label: string }[];
}

export const TOOLS: Tool[] = [
  {
    key: 'casting-widget',
    slug: 'casting-practice',
    title: 'The Casting Practice',
    description:
      'Cast four random Mothers and derive the whole shield, at once or step by step with every addition explained, or enter your own four Mothers to derive and check a shield you have worked by hand.',
    taughtIn: [{ href: '/course/casting-the-chart/', label: 'Lesson 4: Casting the Chart' }],
  },
  {
    key: 'flashcards',
    slug: 'flashcards',
    title: 'The Flashcards',
    description:
      'Drill the sixteen figures to reflex (figure to name, name to meaning, and each attribution), and the signs to their rulers and exaltations, until two clean passes in a row.',
    taughtIn: [
      { href: '/course/the-sixteen-figures/', label: 'Lesson 2: The Sixteen Figures' },
      { href: '/course/the-sixteen-natures/', label: 'Lesson 3: The Sixteen Natures' },
    ],
  },
  {
    key: 'placement-lookup',
    slug: 'placement-lookup',
    title: 'The Placement Lookup',
    description:
      'Pick a figure and a house and read what the sources say of exactly that placement, with citations, and links to the full combination pages.',
    taughtIn: [{ href: '/course/the-twelve-houses/', label: 'Lesson 5: The Twelve Houses' }],
  },
  {
    key: 'reading-worksheet',
    slug: 'reading-worksheet',
    title: 'The Reading Worksheet',
    description:
      'A six-step guided worksheet that walks a chart from significators through perfection, aspects and company to a finished reading, printable for work on paper.',
    taughtIn: [
      { href: '/course/perfection-of-the-figure/', label: 'Lesson 7: Perfection of the Figure' },
      { href: '/course/the-finished-reading/', label: 'Lesson 10: The Finished Reading' },
    ],
  },
  {
    key: 'gerard-casting',
    slug: 'astronomical-casting',
    title: 'The Astronomical Casting',
    description:
      "Erect a chart of Gerard of Cremona's astronomical geomancy: lines of points yield the Ascendant and the places of the planets, at once or step by step.",
    taughtIn: [{ href: '/course/astrological-geomancy/', label: 'Lesson 12: Astrological Geomancy' }],
  },
];

export function toolByKey(key: ToolKey): Tool {
  const tool = TOOLS.find((t) => t.key === key);
  if (!tool) throw new Error(`Unknown tool key "${key}"`);
  return tool;
}

export const toolUrl = (tool: Tool) => withBase(`/tools/${tool.slug}/`);
