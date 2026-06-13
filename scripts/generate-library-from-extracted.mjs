/**
 * Publish chapter-level library pages from references/extracted.
 *
 * The corpus is quote-sized; the Library is a source reader. This script uses
 * the chapter-shaped extraction files as the readable text and records which
 * corpus quote IDs each generated chapter covers.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { normalizeLibraryBody } from './lib/library-markup.mjs';

const ROOT = process.cwd();
const CATTAN = 'references/extracted/cattan';
const HEYDON = 'references/extracted/heydon';
const OUT = 'src/content/library';
const CATTAN_BOOK3_SLUGS = {
  1: 'passing-through-houses',
  2: 'good-and-ill-houses',
  6: 'well-made-figures',
  10: 'place-of-the-figures',
  18: 'point-of-instruction',
};

const HOUSE_NAMES = [
  null,
  'first house',
  'second house',
  'third house',
  'fourth house',
  'fifth house',
  'sixth house',
  'seventh house',
  'eighth house',
  'ninth house',
  'tenth house',
  'eleventh house',
  'twelfth house',
];

function corpusQuotes() {
  const files = [];
  function scanSafe(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) scanSafe(path);
      else if (entry.name.endsWith('.md')) files.push(path);
    }
  }
  scanSafe('corpus');
  return files.map((path) => ({
    id: relative('corpus', path).replace(/\.md$/, ''),
    path,
    text: readFileSync(path, 'utf8'),
  }));
}

const QUOTES = corpusQuotes();

function quoteIdsWhere(predicate) {
  return QUOTES.filter((q) => predicate(q.id, q)).map((q) => q.id).sort();
}

function quoteIdsUnder(prefix) {
  return quoteIdsWhere((id) => id.startsWith(prefix));
}

function sourcePath(path) {
  return relative(ROOT, path).replace(/\\/g, '/');
}

function splitHashSections(text) {
  const matches = [...text.matchAll(/^# .+$/gm)];
  return matches.map((m, i) => {
    const start = m.index ?? 0;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? text.length : text.length;
    return text.slice(start, end).trim();
  });
}

function stripMarkdownTitle(section) {
  return section.replace(/^# .+\n?/, '');
}

function normalizeBody(body) {
  return normalizeLibraryBody(body);
}

function cleanHeadingText(text) {
  return text
    .replace(/^#\s*/, '')
    .replace(/\*+/g, '')
    .replace(/\s+Chap\.?\s*\d+\.?$/i, '')
    .replace(/\s+Chapt\.?\s*\d+\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function yamlString(value) {
  return JSON.stringify(value);
}

function writeChapter(path, meta, body) {
  const wantsMdx = body.includes('<ShieldChart');
  const targetPath = wantsMdx && path.endsWith('.md') ? path.replace(/\.md$/, '.mdx') : path;
  mkdirSync(dirname(targetPath), { recursive: true });
  const lines = [
    '---',
    `title: ${yamlString(meta.title)}`,
    `source: ${meta.source}`,
    `order: ${meta.order}`,
  ];
  if (meta.locator) lines.push(`locator: ${yamlString(meta.locator)}`);
  lines.push(`description: ${yamlString(meta.description)}`);
  if (meta.covers?.length) {
    lines.push('covers:');
    for (const id of meta.covers) lines.push(`  - ${id}`);
  }
  if (meta.generatedFrom?.length) {
    lines.push('generatedFrom:');
    for (const item of meta.generatedFrom) lines.push(`  - ${yamlString(item)}`);
  }
  lines.push('---', '');
  if (wantsMdx) lines.push("import ShieldChart from '../../../components/ShieldChart.astro';", '');
  lines.push(body.trim(), '');

  if (targetPath !== path && existsSync(path)) unlinkSync(path);
  if (!wantsMdx && path.endsWith('.md') && existsSync(path.replace(/\.md$/, '.mdx'))) {
    unlinkSync(path.replace(/\.md$/, '.mdx'));
  }

  writeFileSync(targetPath, lines.join('\n'));
  return targetPath;
}

function cattanBook2() {
  const generated = [];
  const files = [
    'book2-houses01-02.md',
    'book2-houses03-04.md',
    'book2-houses05-06.md',
    'book2-houses07-08.md',
    'book2-houses09-10.md',
    'book2-houses11-12.md',
  ];

  for (const file of files) {
    const full = join(CATTAN, file);
    for (const section of splitHashSections(readFileSync(full, 'utf8'))) {
      const heading = section.match(/^# (.+)$/m)?.[1] ?? '';
      const chap = Number(heading.match(/Chap\.?\s+(\d+)/i)?.[1]);
      if (!chap) throw new Error(`${file}: no Book II chapter number in ${heading}`);
      const nn = String(chap).padStart(2, '0');
      generated.push(
        writeChapter(
          join(OUT, 'cattan', `book2-ch${nn}-${HOUSE_NAMES[chap].replaceAll(' ', '-')}.md`),
          {
            title: `Book II, ch. ${chap}: ${HOUSE_NAMES[chap][0].toUpperCase()}${HOUSE_NAMES[chap].slice(1)}`,
            source: 'cattan',
            order: 200 + chap,
            locator: `Book II, ch. ${chap}`,
            description: `Cattan's Book II chapter on the ${HOUSE_NAMES[chap]}, with its questions and figure judgments.`,
            covers: quoteIdsUnder(`cattan/book-2/house-${nn}/`),
            generatedFrom: [sourcePath(full)],
          },
          normalizeBody(stripMarkdownTitle(section)),
        ),
      );
    }
  }

  const coda = join(CATTAN, 'book2-coda.md');
  generated.push(
    writeChapter(
      join(OUT, 'cattan', 'book2-coda.md'),
      {
        title: 'Between Book II and Book III: Advertisement and prologue',
        source: 'cattan',
        order: 213,
        locator: 'Book II coda and Book III prologue',
        description: "Cattan's closing advertisement to Book II and prologue to Book III.",
        covers: [],
        generatedFrom: [sourcePath(coda)],
      },
      normalizeBody(readFileSync(coda, 'utf8')),
    ),
  );

  return generated;
}

function cattanBook3() {
  const generated = [];
  const files = ['book3-techniques-a.md', 'book3-techniques-b.md', 'book3-techniques-c.md'];

  for (const file of files) {
    const full = join(CATTAN, file);
    for (const section of splitHashSections(readFileSync(full, 'utf8'))) {
      const heading = section.match(/^# (.+)$/m)?.[1] ?? '';
      const chap = Number(heading.match(/Chap\.?\s+(\d+)/i)?.[1]);
      if (!chap) throw new Error(`${file}: no Book III chapter number in ${heading}`);
      const nn = String(chap).padStart(2, '0');
      const label = cleanHeadingText(heading.replace(/^Book III,\s*/i, ''));
      const title = `Book III, ch. ${chap}: ${label.replace(/^Chap\.?\s+\d+\s+—\s*/i, '')}`;
      const direct = quoteIdsWhere((id) => id.startsWith(`cattan/book-3/ch-${nn}-`));
      const covers =
        chap === 1
          ? quoteIdsUnder('cattan/book-3/passing/')
          : chap === 2
            ? quoteIdsUnder('cattan/book-3/good-ill-houses/')
            : direct;

      generated.push(
        writeChapter(
          join(
            OUT,
            'cattan',
            `book3-ch${nn}-${CATTAN_BOOK3_SLUGS[chap] ?? slugify(title.replace(/^Book III, ch\. \d+:\s*/, ''))}.md`,
          ),
          {
            title,
            source: 'cattan',
            order: 300 + chap,
            locator: `Book III, ch. ${chap}`,
            description: `Cattan's Book III chapter ${chap}, from the extracted 1591 transcription.`,
            covers,
            generatedFrom: [sourcePath(full)],
          },
          normalizeBody(stripMarkdownTitle(section)),
        ),
      );
    }
  }

  const tableFiles = [
    'book3-ch05-tables-a.md',
    'book3-ch05-tables-b.md',
    'book3-ch05-tables-c.md',
    'book3-ch05-tables-d.md',
  ].map((f) => join(CATTAN, f));
  const tables = tableFiles
    .map((file) => normalizeBody(stripMarkdownTitle(readFileSync(file, 'utf8'))))
    .join('\n\n---\n\n');
  generated.push(
    writeChapter(
      join(OUT, 'cattan', 'book3-ch05-witness-judge-tables.md'),
      {
        title: 'Book III, ch. 5: The tables of the Judges and their Witnesses',
        source: 'cattan',
        order: 305,
        locator: 'Book III, ch. 5',
        description: "Cattan's witness-and-judge tables for the main classes of geomantic questions.",
        covers: quoteIdsUnder('cattan/book-3/witness-judge/'),
        generatedFrom: tableFiles.map(sourcePath),
      },
      tables,
    ),
  );

  const ch27 = join(CATTAN, 'book3-ch27.md.aside');
  generated.push(
    writeChapter(
      join(OUT, 'cattan', 'book3-ch27-qualities.md'),
      {
        title: 'Book III, ch. 27: The qualities and properties of all the figures',
        source: 'cattan',
        order: 327,
        locator: 'Book III, ch. 27 (pp. 214–224)',
        description: "Cattan's tables of figure qualities, properties, and common question classes.",
        covers: ['cattan/book-3/ch-27-entering-exiting', 'cattan/book-3/ch-27-time-of-life'],
        generatedFrom: [sourcePath(ch27)],
      },
      normalizeBody(stripMarkdownTitle(readFileSync(ch27, 'utf8'))),
    ),
  );

  return generated;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

function heydon() {
  const generated = [];

  const ch01 = join(HEYDON, 'ch01-figures.md');
  generated.push(
    writeChapter(
      join(OUT, 'heydon', 'book2-ch01-first-house.md'),
      {
        title: 'Book II, ch. I: The first house',
        source: 'heydon',
        order: 201,
        locator: 'Book II, ch. 1',
        description: "Heydon's first-house questions and the sixteen first-house figure judgments.",
        covers: quoteIdsUnder('heydon/house-01/'),
        generatedFrom: [sourcePath(ch01)],
      },
      normalizeBody(stripMarkdownTitle(readFileSync(ch01, 'utf8'))),
    ),
  );

  const ch15a = join(HEYDON, 'ch15-first-half.md');
  const ch15b = join(HEYDON, 'ch15-second-half.md');
  const ch15Body = [
    normalizeBody(stripMarkdownTitle(readFileSync(ch15a, 'utf8'))),
    normalizeBody(readFileSync(ch15b, 'utf8').replace(/^# /, '## ')),
  ].join('\n\n');
  generated.push(
    writeChapter(
      join(OUT, 'heydon', 'book2-ch15-figures-through-houses.md'),
      {
        title: 'Book II, ch. XV: The figures through the twelve houses',
        source: 'heydon',
        order: 215,
        locator: 'Book II, ch. 15',
        description: "Heydon's extended judgments for each figure as it appears through the twelve houses.",
        covers: [...quoteIdsUnder('heydon/houses/'), 'heydon/techniques/index-multiplication'].sort(),
        generatedFrom: [sourcePath(ch15a), sourcePath(ch15b)],
      },
      ch15Body,
    ),
  );

  const techniques = join(HEYDON, 'techniques.md');
  const techniqueMap = [
    {
      match: /Book I, Chap\. IV\b/i,
      file: 'book1-ch04-witness-and-judge.md',
      title: 'Book I, ch. IV: How to frame the Witness and the Judge',
      order: 104,
      locator: 'Book I, ch. 4',
      covers: ['heydon/techniques/witness-judge-framing'],
    },
    {
      match: /Book II, Chap\. XIII\b/i,
      file: 'book2-ch13-passing-through-houses.md',
      title: 'Book II, ch. XIII: Passing through the houses',
      order: 213,
      locator: 'Book II, ch. 13',
      covers: quoteIdsWhere((id) => id.startsWith('heydon/techniques/passing-')),
    },
    {
      match: /Book II, Chap\. XIV\b/i,
      file: 'book2-ch14-good-and-ill-houses.md',
      title: 'Book II, ch. XIV: Good and ill houses',
      order: 214,
      locator: 'Book II, ch. 14',
      covers: ['heydon/techniques/good-ill-houses'],
    },
    {
      match: /Book II, Chap\. XVI\b/i,
      file: 'book2-ch16-two-witnesses.md',
      title: 'Book II, ch. XVI: Of the two Witnesses',
      order: 216,
      locator: 'Book II, ch. 16',
      covers: ['heydon/techniques/two-witnesses'],
    },
    {
      match: /Book II, Chap\. XVII\b/i,
      file: 'book2-ch17-judge.md',
      title: 'Book II, ch. XVII: Of the Judge',
      order: 217,
      locator: 'Book II, ch. 17',
      covers: ['heydon/techniques/the-judge'],
    },
    {
      match: /Book III, Sect\. V/i,
      file: 'book3-sect05-part-of-fortune.md',
      title: 'Book III, sect. V: Part of Fortune',
      order: 305,
      locator: 'Book III, sect. 5',
      covers: ['heydon/techniques/part-of-fortune'],
    },
  ];

  for (const section of splitHashSections(readFileSync(techniques, 'utf8'))) {
    const heading = section.match(/^# (.+)$/m)?.[1] ?? '';
    const config = techniqueMap.find((item) => item.match.test(heading));
    if (!config) throw new Error(`No Heydon technique mapping for ${heading}`);
    generated.push(
      writeChapter(
        join(OUT, 'heydon', config.file),
        {
          title: config.title,
          source: 'heydon',
          order: config.order,
          locator: config.locator,
          description: `Heydon's ${config.title.replace(/^Book [^:]+:\s*/, '').toLowerCase()} passage from Theomagia.`,
          covers: config.covers,
          generatedFrom: [sourcePath(techniques)],
        },
        normalizeBody(stripMarkdownTitle(section)),
      ),
    );
  }

  return generated;
}

const generated = [...cattanBook2(), ...cattanBook3(), ...heydon()];
console.log(`Generated ${generated.length} library chapter(s):`);
for (const file of generated) console.log(`  ${file}`);
