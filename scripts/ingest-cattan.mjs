/**
 * Ingest Cattan transcription files (as produced by the extraction agents,
 * saved under references/extracted/cattan/*.md) into corpus quote files.
 *
 * Input format per file:
 *   # Book II, Chap. N — <heading>          (chapter block)
 *   - leaves: 095–099
 *   - pages: 67–71
 *   <chapter opening prose>
 *   ## <Figure name> — house N              (figure entries)
 *   - leaves: 096
 *   - dot-pattern: 1,1,2,1
 *   <entry text>
 *
 * Book III technique chapters use only "# Book III, Chap. N — <heading>"
 * blocks and are ingested whole, with topics from TOPIC_MAP.
 *
 *   node scripts/ingest-cattan.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { addFigures } from '../src/lib/casting.ts';
import { formatInlineMarkers, plainSnippet } from './lib/library-markup.mjs';

// figure dots from the YAML source of truth (for ch. 5 verification)
const FIGURE_DOTS = {};
for (const f of readdirSync('src/data/figures')) {
  const text = readFileSync(`src/data/figures/${f}`, 'utf8');
  FIGURE_DOTS[f.replace('.yaml', '')] = text
    .match(/^dots:\s*\[([^\]]+)\]/m)[1]
    .split(',')
    .map(Number);
}
const NAME_BY_KEY = {};
for (const f of readdirSync('src/data/figures')) {
  const text = readFileSync(`src/data/figures/${f}`, 'utf8');
  NAME_BY_KEY[FIGURE_DOTS[f.replace('.yaml', '')].join('')] = text.match(/^name:\s*(.+)$/m)[1].trim();
}

const SLUGS = [
  [/fortune?a?\s*maior|fortuna\s*maior|fortune\s*major|fortuna\s*major/i, 'fortuna-major'],
  [/fortune?a?\s*minor/i, 'fortuna-minor'],
  [/populus/i, 'populus'],
  [/\bvia\b/i, 'via'],
  [/a[cd]?quisitio/i, 'acquisitio'],
  [/amissio/i, 'amissio'],
  [/l[aæe]+ti[tc]ia/i, 'laetitia'],
  [/tristitia/i, 'tristitia'],
  [/puer/i, 'puer'],
  [/puella/i, 'puella'],
  [/albus/i, 'albus'],
  [/rubeus/i, 'rubeus'],
  [/coniunctio|conjunctio/i, 'conjunctio'],
  [/carcer/i, 'carcer'],
  [/caput/i, 'caput-draconis'],
  [/cauda/i, 'cauda-draconis'],
];

const TOPIC_MAP = [
  [/briefe deduction|accord and signification/i, ['springing']],
  [/good or ill house|in their places/i, ['dignities']],
  [/two witnesses/i, ['judge-witnesses']],
  [/iudge|judge/i, ['judge-witnesses']],
  [/well made|fortunate or unfortunate/i, ['method']],
  [/company of the house/i, ['company']],
  [/company of con[ij]unction/i, ['company', 'perfection']],
  [/occupation/i, ['perfection']],
  [/place of the figures/i, ['dignities', 'houses']],
  [/figure of figures/i, ['method']],
  [/aspectes in generall/i, ['aspects']],
  [/aspect of coniunction/i, ['aspects']],
  [/sextile/i, ['aspects']],
  [/tryne|trine/i, ['aspects']],
  [/quadrate/i, ['aspects']],
  [/opposition/i, ['aspects']],
  [/intent a figure|point of instruction/i, ['intention']],
  [/what an other thinketh/i, ['intention']],
  [/way of point/i, ['way-of-the-point']],
  [/parte? of fortune/i, ['part-of-fortune']],
  [/triplicitie/i, ['attributions', 'dignities']],
  [/exaltation/i, ['dignities']],
  [/qualities and properties/i, ['general', 'attributions']],
];

function slugFor(name) {
  for (const [re, slug] of SLUGS) if (re.test(name)) return slug;
  return null;
}

function yamlStr(s) {
  return JSON.stringify(s);
}

function leafScanRef(leaves) {
  const m = String(leaves).match(/\d+/);
  return m ? `https://archive.org/details/b30337860/page/n${Number(m[0])}` : undefined;
}

function meta(block) {
  const leavesRaw = block.match(/^- leaves?:\s*(.+)$/m)?.[1]?.trim();
  let pages = block.match(/^- pages?:\s*(.+)$/m)?.[1]?.trim();
  // figure entries sometimes carry "(pages 90–91)" inside the leaves line
  if (!pages && leavesRaw) pages = leavesRaw.match(/\(pages?\s*([^)]+)\)/)?.[1];
  // strip editorial parentheticals: "89–97 (the headline misprints…)" → "89–97"
  if (pages) pages = pages.split('(')[0].replace(/[,;]\s*$/, '').trim();
  const leaves = leavesRaw?.split('(')[0].trim();
  const dots = block.match(/^- dot-pattern:\s*(.+)$/m)?.[1]?.trim();
  const body = block
    .replace(/^- (leaves?|pages?|dot-pattern|chapter|printed-pages?|pdf-pages?):.*$/gm, '')
    .trim();
  return { leaves, pages, dots, body };
}

function writeQuote(path, fields, body) {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, `---\n${fields.filter(Boolean).join('\n')}\n---\n\n${formatInlineMarkers(body).trim()}\n`);
}

let written = 0;
const warnings = [];
const ch5Entries = [];

for (const file of readdirSync('references/extracted/cattan')) {
  if (!file.endsWith('.md')) continue;
  const text = readFileSync(`references/extracted/cattan/${file}`, 'utf8');

  // top-level chapter blocks
  const chapters = text.split(/^# /m).filter((c) => c.trim());
  for (const chapterRaw of chapters) {
    const chapter = '# ' + chapterRaw;
    const head = chapter.match(/^# Book (II|III), Chap\.? (\d+)\s*—\s*(.+)$/m);
    if (!head) {
      warnings.push(`${file}: unrecognised chapter head: ${chapter.slice(0, 80)}`);
      continue;
    }
    const [, book, chapNum, heading] = head;
    const [intro, ...figureBlocks] = chapter.split(/^## /m);
    const introMeta = meta(intro.replace(/^# .+$/m, ''));

    if (book === 'II') {
      const houseNum = Number(chapNum);
      // chapter opening → one quote tagged to the house
      if (introMeta.body.length > 100) {
        writeQuote(
          `corpus/cattan/book-2/house-${String(houseNum).padStart(2, '0')}/significations.md`,
          [
            'source: cattan',
            `locator: ${yamlStr(`Book II, ch. ${chapNum} (p. ${introMeta.pages ?? '?'})`)}`,
            introMeta.leaves && `scanRef: ${leafScanRef(introMeta.leaves)}`,
            `houses: [${houseNum}]`,
            `topics: [houses]`,
            'quality: transcribed',
          ],
          introMeta.body,
        );
        written++;
      }
      for (const fbRaw of figureBlocks) {
        const nameLine = fbRaw.split('\n')[0];
        const slug = slugFor(nameLine);
        if (!slug) {
          warnings.push(`${file}: no figure slug for "${nameLine}"`);
          continue;
        }
        const fm = meta(fbRaw.replace(/^.+$/m, ''));
        if (fm.body.length < 30) {
          warnings.push(`${file}: short body for ${slug} house ${houseNum}`);
          continue;
        }
        const excerpt = plainSnippet(fm.body)
          .slice(0, 180)
          .replace(/\s\S*$/, '…');
        writeQuote(
          `corpus/cattan/book-2/house-${String(houseNum).padStart(2, '0')}/${slug}.md`,
          [
            'source: cattan',
            `locator: ${yamlStr(`Book II, ch. ${chapNum} (p. ${fm.pages ?? introMeta.pages ?? '?'})`)}`,
            fm.leaves && `scanRef: ${leafScanRef(fm.leaves)}`,
            `figures: [${slug}]`,
            `houses: [${houseNum}]`,
            'topics: []',
            'quality: transcribed',
            `excerpt: ${yamlStr(excerpt)}`,
          ],
          fm.body,
        );
        written++;
      }
    } else if (/briefe deduction/i.test(heading)) {
      // Book III ch. 1: the passing of each figure through the houses — split per figure
      const body = chapter.replace(/^# .+$/m, '').replace(/^- (leaves?|pages?):.*$/gm, '');
      const parts = body.split(/(?=\{margin:[^}]*dot-figure of [A-Z])/);
      const tailMark = 'When so ever ye finde the first houses';
      mkdirSync('corpus/cattan/book-3/passing', { recursive: true });
      for (let part of parts) {
        const nm = part.match(/dot-figure of ([A-Za-zæ ]+)\}/);
        if (!nm) continue;
        const slug = slugFor(nm[1]);
        if (!slug) { warnings.push(`${file}: ch1 no slug for ${nm[1]}`); continue; }
        let tail = '';
        const ti = part.indexOf(tailMark);
        if (ti !== -1) { tail = part.slice(ti); part = part.slice(0, ti); }
        const text = part.replace(/\{margin:[^}]*\}\s*/g, '').trim();
        writeQuote(`corpus/cattan/book-3/passing/${slug}.md`, [
          'source: cattan',
          `locator: ${yamlStr(`Book III, ch. 1, s.v. ${nm[1].trim()} (pp. 150–158)`)}`,
          'scanRef: https://archive.org/details/b30337860/page/n168',
          `figures: [${slug}]`,
          'topics: [springing]',
          'quality: transcribed',
        ], text);
        written++;
        if (tail) {
          writeQuote('corpus/cattan/book-3/passing/general.md', [
            'source: cattan',
            `locator: ${yamlStr('Book III, ch. 1 (p. 157)')}`,
            'scanRef: https://archive.org/details/b30337860/page/n175',
            'topics: [springing, method]',
            'quality: transcribed',
            `editorialNote: ${yamlStr("Cattan's example of the figure made for the Lord of Tays, on whether Francis I and the Emperor Charles V should speak together.")}`,
          ], tail.replace(/\{margin:[^}]*\}\s*/g, '').trim());
          written++;
        }
      }
    } else if (/good or ill house/i.test(heading)) {
      // Book III ch. 2: per-figure good and ill houses — split per figure
      const body = chapter.replace(/^# .+$/m, '').replace(/^- (leaves?|pages?):.*$/gm, '')
        .replace(/^Of the good or ill house.*$/m, '').replace(/^Chap\. 2\.\s*$/m, '');
      const intro = body.split(/^\*/m)[0].trim();
      mkdirSync('corpus/cattan/book-3/good-ill-houses', { recursive: true });
      writeQuote('corpus/cattan/book-3/good-ill-houses/intro.md', [
        'source: cattan',
        `locator: ${yamlStr('Book III, ch. 2 (p. 158)')}`,
        'scanRef: https://archive.org/details/b30337860/page/n176',
        'topics: [houses, dignities]',
        'quality: transcribed',
      ], intro);
      written++;
      for (const m of body.matchAll(/^\*([A-Z][A-Za-zæ ]+?)\*([\s\S]*?)(?=^\*[A-Z]|\n*$(?![\s\S]))/gm) ) {
        const slug = slugFor(m[1]);
        if (!slug) { warnings.push(`${file}: ch2 no slug for ${m[1]}`); continue; }
        writeQuote(`corpus/cattan/book-3/good-ill-houses/${slug}.md`, [
          'source: cattan',
          `locator: ${yamlStr(`Book III, ch. 2, s.v. ${m[1].trim()} (pp. 158–160)`)}`,
          'scanRef: https://archive.org/details/b30337860/page/n176',
          `figures: [${slug}]`,
          'topics: [dignities]',
          'quality: transcribed',
        ], `*${m[1]}*${m[2].trimEnd()}`);
        written++;
      }
    } else if (book === 'III' && chapNum === '5') {
      // Book III ch. 5: the Witness×Judge tables — one quote per witness pair,
      // verified with casting math and collected globally (the 128-pair
      // completeness check runs after all files are read).
      for (const blockRaw of figureBlocks) {
        const blockHead = blockRaw.split('\n')[0];
        const bh = blockHead.match(
          /^(.+?),\s*(even|uneven|euen|vneuen)\s+witnesses\s*\(leaf\s*(\d+),\s*p\.?\s*(\d+)/i,
        );
        if (!bh) {
          warnings.push(`${file}: ch5 unrecognised block head: ${blockHead.slice(0, 70)}`);
          continue;
        }
        const headlineSlug = slugFor(bh[1]);
        const parityLabel = /^e/i.test(bh[2]) ? 0 : 1; // 0 = even, 1 = odd
        const leaf = Number(bh[3]);
        const page = Number(bh[4]);
        for (const entryRaw of blockRaw.split(/^### /m).slice(1)) {
          const head = entryRaw.split('\n')[0];
          const eh = head.match(/^(.+?)\s*\+\s*(.+?)\s*(?:→|->)\s*(.+)$/);
          if (!eh) {
            warnings.push(`${file}: ch5 unrecognised entry head: ${head.slice(0, 70)}`);
            continue;
          }
          const dm = entryRaw.match(
            /^- dots:\s*w1=([\d,]+)\s+w2=([\d,]+)\s+judge=([\d,]+)/m,
          );
          if (!dm) {
            warnings.push(`${file}: ch5 entry missing dots line: ${head}`);
            continue;
          }
          const [w1, w2, judge] = [dm[1], dm[2], dm[3]].map((s) => s.split(',').map(Number));
          const uncertain = /^- uncertain:\s*true/m.test(entryRaw);
          const body = entryRaw
            .replace(/^.+$/m, '')
            .replace(/^- (dots|uncertain|headline-band):.*$/gm, '')
            .trim();
          ch5Entries.push({
            file,
            head,
            w1name: eh[1].trim(),
            w2name: eh[2].trim(),
            judgeName: eh[3].trim(),
            w1,
            w2,
            judge,
            headlineSlug,
            headlineName: bh[1].trim(),
            parityLabel,
            leaf,
            page,
            uncertain,
            body,
          });
        }
      }
    } else {
      // Book III technique chapter — ingest whole
      const topics = TOPIC_MAP.find(([re]) => re.test(heading))?.[1] ?? ['method'];
      const stem = heading
        .toLowerCase()
        .replace(/\[.*?\]/g, '')
        .replace(/[^a-z ]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 6)
        .join('-');
      writeQuote(
        `corpus/cattan/book-3/ch-${String(chapNum).padStart(2, '0')}-${stem}.md`,
        [
          'source: cattan',
          `locator: ${yamlStr(`Book III, ch. ${chapNum} (p. ${introMeta.pages ?? '?'})`)}`,
          introMeta.leaves && `scanRef: ${leafScanRef(introMeta.leaves)}`,
          `topics: [${topics.join(', ')}]`,
          'quality: transcribed',
        ],
        chapter.replace(/^# .+$/m, `### ${heading}`).replace(/^- (leaves?|pages?):.*$/gm, '').trim(),
      );
      written++;
    }
  }
}

// ---- ch. 5 post-pass: verify with casting math, then write ----
if (ch5Entries.length > 0) {
  const pointSum = (d) => d.reduce((a, b) => a + b, 0);
  const seen = new Map();
  let ch5written = 0;
  let drafts = 0;

  for (const e of ch5Entries) {
    const problems = [];
    // arithmetic: the printed Judge must equal the parity sum of the witnesses
    const computed = addFigures(e.w1, e.w2);
    if (computed.join('') !== e.judge.join('')) {
      warnings.push(
        `ch5 ARITHMETIC FAIL (skipped): ${e.file} leaf ${e.leaf}: ${e.head} — w1+w2 = [${computed}] ≠ judge [${e.judge}]`,
      );
      continue;
    }
    // names must match dots
    const w1slug = slugFor(e.w1name);
    const w2slug = slugFor(e.w2name);
    for (const [label, slug, dots] of [
      ['w1', w1slug, e.w1],
      ['w2', w2slug, e.w2],
    ]) {
      if (!slug) problems.push(`${label} name "${label === 'w1' ? e.w1name : e.w2name}" has no slug`);
      else if (FIGURE_DOTS[slug].join('') !== dots.join(''))
        problems.push(`${label} ${slug} dots [${dots}] ≠ YAML [${FIGURE_DOTS[slug]}]`);
    }
    if (NAME_BY_KEY[e.judge.join('')] !== e.judgeName && slugFor(e.judgeName) !== slugFor(NAME_BY_KEY[e.judge.join('')] ?? ''))
      problems.push(`judge name "${e.judgeName}" ≠ dots [${e.judge}] (${NAME_BY_KEY[e.judge.join('')]})`);
    // parity must match the block label
    if (pointSum(e.w1) % 2 !== e.parityLabel || pointSum(e.w2) % 2 !== e.parityLabel)
      problems.push(`witness parity does not match block label`);
    if (!w1slug || !w2slug) {
      warnings.push(`ch5 SKIPPED: ${e.file} leaf ${e.leaf}: ${e.head} — ${problems.join('; ')}`);
      continue;
    }
    const key = `${w1slug}--${w2slug}`;
    if (seen.has(key)) {
      warnings.push(`ch5 DUPLICATE pair ${key}: leaf ${e.leaf} (already from leaf ${seen.get(key)})`);
      continue;
    }
    seen.set(key, e.leaf);

    const quality = e.uncertain || problems.length > 0 ? 'ocr-draft' : 'transcribed';
    if (quality === 'ocr-draft') {
      drafts += 1;
      warnings.push(`ch5 ocr-draft: leaf ${e.leaf} ${e.head}${problems.length ? ' — ' + problems.join('; ') : ' (transcriber uncertain)'}`);
    }
    const judgeName = NAME_BY_KEY[e.judge.join('')];
    const verdicts = [...e.body.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm)]
      .filter((m) => !/^matter$|^-+$/i.test(m[1].trim()))
      .map((m) => `${m[1].trim()} ${m[2].trim()}`);
    const excerpt = `Judge ${judgeName}: ${verdicts.slice(0, 4).join(', ')}${verdicts.length > 4 ? ', …' : ''}`.slice(0, 200);
    // No figures tags and a topic no listing page queries: 128 table entries
    // would otherwise flood every figure page and the judge-and-witnesses
    // technique page. The entries are quoted by explicit id where needed.
    writeQuote(
      `corpus/cattan/book-3/witness-judge/${key}.md`,
      [
        'source: cattan',
        `locator: ${yamlStr(`Book III, ch. 5, table of ${e.headlineName}, s.v. ${e.w1name} with ${e.w2name} (p. ${e.page})`)}`,
        `scanRef: https://archive.org/details/b30337860/page/n${e.leaf}`,
        'topics: [witness-judge-tables]',
        `quality: ${quality}`,
        `excerpt: ${yamlStr(excerpt)}`,
        `editorialNote: ${yamlStr(`The witnesses ${e.w1name} and ${e.w2name} yield the Judge ${judgeName}. From the table of ${e.headlineName}.`)}`,
      ],
      e.body,
    );
    ch5written += 1;
  }

  // completeness: every ordered same-parity pair exactly once = 128
  const even = Object.entries(FIGURE_DOTS).filter(([, d]) => pointSum(d) % 2 === 0).map(([s]) => s);
  const odd = Object.entries(FIGURE_DOTS).filter(([, d]) => pointSum(d) % 2 === 1).map(([s]) => s);
  const expected = [];
  for (const group of [even, odd])
    for (const a of group) for (const b of group) expected.push(`${a}--${b}`);
  const missing = expected.filter((k) => !seen.has(k));
  console.log(`ch5: ${ch5written} witness-judge files written (${drafts} ocr-draft), ${missing.length} of 128 pairs missing`);
  if (missing.length) warnings.push(`ch5 MISSING pairs: ${missing.join(', ')}`);
  written += ch5written;
}

console.log(`wrote ${written} corpus files`);
if (warnings.length) console.log('WARNINGS:\n' + warnings.join('\n'));
