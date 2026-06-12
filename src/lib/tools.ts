/**
 * The practice tools: the interactive widgets built for the course, each
 * with a standalone page under /tools/. Pure data — content.config.ts
 * imports TOOL_KEYS for the lesson frontmatter enum, and Lesson.astro
 * renders each lesson's `tools:` list as links via toolByKey.
 */
export const TOOL_KEYS = [
  'casting-widget',
  'flashcards',
  'placement-lookup',
  'judgment-worksheet',
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
      'Cast four random Mothers and derive the whole shield: at once, or step by step with every addition explained. Made for checking shields you have first worked by hand.',
    taughtIn: [{ href: '/course/casting-the-chart/', label: 'Lesson 4: Casting the Chart' }],
  },
  {
    key: 'flashcards',
    slug: 'flashcards',
    title: 'The Figure Flashcards',
    description:
      'Drill the sixteen figures to reflex: figure to name, name to meaning, and figure to each attribution (planet, sign, quality and element), until two clean passes in a row.',
    taughtIn: [
      { href: '/course/the-alphabet-of-the-earth/', label: 'Lesson 2: The Alphabet of the Earth' },
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
    key: 'judgment-worksheet',
    slug: 'judgment-worksheet',
    title: 'The Judgment Worksheet',
    description:
      'A six-step guided worksheet that walks a chart from significators through perfection, aspects and company to the court and the sentence, printable for work on paper.',
    taughtIn: [
      { href: '/course/perfection-of-the-figure/', label: 'Lesson 7: Perfection of the Figure' },
      { href: '/course/the-full-judgment/', label: 'Lesson 10: The Full Judgment' },
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

export const toolUrl = (tool: Tool) => `/tools/${tool.slug}/`;
