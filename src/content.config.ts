import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { TOOL_KEYS } from './lib/tools';

/**
 * The historical sources. Every quote in the corpus references one of
 * these; `publicDomain: z.literal(true)` is a hard gate — a source that is
 * not public domain cannot be added without failing the build.
 */
const sources = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/data/sources' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    author: z.string(),
    translator: z.string().optional(),
    year: z.number(),
    originalYear: z.number().optional(),
    archiveUrl: z.string().url().optional(),
    locatorScheme: z.enum(['folio', 'signature', 'page', 'section']),
    citationTemplate: z.string(),
    publicDomain: z.literal(true),
    provenance: z.string(),
    description: z.string().max(170),
    order: z.number().default(0),
  }),
});

/** The sixteen geomantic figures. */
const figures = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/data/figures' }),
  schema: z.object({
    name: z.string(),
    translation: z.string(),
    /** Four lines, head to feet; 1 = one point (active), 2 = two points (passive). */
    dots: z.array(z.union([z.literal(1), z.literal(2)])).length(4),
    /** Filled from Cattan/Heydon as their figure chapters are transcribed; sources vary. */
    element: z.enum(['fire', 'air', 'water', 'earth']).optional(),
    planet: z.string(),
    sign: z.string(),
    mobility: z.enum(['mobile', 'stable']),
    counterpart: reference('figures'),
    /** Sources disagree on attributions; record the variants rather than flattening. */
    attributionVariants: z
      .array(
        z.object({
          source: reference('sources'),
          element: z.string().optional(),
          planet: z.string().optional(),
          sign: z.string().optional(),
          note: z.string().optional(),
        }),
      )
      .default([]),
    keywords: z.array(z.string()),
    summary: z.string().max(170),
    order: z.number(),
  }),
});

/** The twelve astrological houses. */
const houses = defineCollection({
  loader: file('./src/data/houses.yaml'),
  schema: z.object({
    number: z.number().int().min(1).max(12),
    slug: z.string(),
    name: z.string(),
    title: z.string(),
    significations: z.array(z.string()),
    summary: z.string().max(170),
  }),
});

/**
 * ★ The canonical quote corpus. One Markdown file per quote under ./corpus;
 * the body is the quote itself in semi-diplomatic transcription. Pages are
 * views over this collection — a quote tagged {figures: [puer], houses: [5]}
 * appears on the Puer page, the 5th-house page, and the Puer-in-5th page.
 */
const quotes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './corpus' }),
  schema: z.object({
    source: reference('sources'),
    /** Where in the source: "Book II, fol. 53v", "sig. H2r", "p. 412". */
    locator: z.string(),
    /** Audit trail: URL of the scanned page the transcription was made from. */
    scanRef: z.string().url().optional(),
    figures: z.array(reference('figures')).default([]),
    houses: z.array(z.number().int().min(1).max(12)).default([]),
    topics: z.array(z.string()).default([]),
    quality: z.enum(['verified', 'transcribed', 'ocr-draft']).default('transcribed'),
    /** ~40-word pull for listing pages; body remains the only full home. */
    excerpt: z.string().optional(),
    editorialNote: z.string().optional(),
    /** Early-modern word → modern gloss, rendered beneath the quote. */
    gloss: z.record(z.string(), z.string()).optional(),
  }),
});

/** Full texts reproduced in the library, one file per chapter/section. */
const library = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/library' }),
  schema: z.object({
    title: z.string(),
    source: reference('sources'),
    order: z.number(),
    locator: z.string().optional(),
    description: z.string().max(170),
    /** Quote-corpus entries whose text is represented in this library chapter. */
    covers: z.array(reference('quotes')).default([]),
    /** Extraction files or scripts used to assemble generated library chapters. */
    generatedFrom: z.array(z.string()).default([]),
  }),
});

/**
 * The Geomancy Course: one MDX file per lesson, numbered by order
 * (01-foo.mdx); the URL slug strips the prefix. Lessons embed Quote,
 * ShieldChart and exercise components, so MDX rather than MD.
 */
const course = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/course' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    order: z.number().int().positive(),
    part: z.object({ number: z.number().int(), title: z.string() }),
    /** "You will be able to…" bullets shown at the top of the lesson. */
    objectives: z.array(z.string()).default([]),
    /** Required reading: a library chapter reference, or an internal href. */
    readings: z
      .array(
        z
          .object({
            chapter: reference('library').optional(),
            href: z.string().optional(),
            label: z.string().optional(),
            note: z.string().optional(),
          })
          .refine((r) => r.chapter || (r.href && r.label), {
            message: 'reading needs a library chapter ref or an href+label',
          }),
      )
      .default([]),
    tools: z
      .array(z.enum(TOOL_KEYS))
      .default([]),
    /** Estimated hours of work (reading + study + exercises). */
    hours: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { sources, figures, houses, quotes, library, course };
