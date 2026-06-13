/**
 * Ingest Heydon transcription files (references/extracted/heydon/*.md) into
 * corpus quote files. Handles three input shapes:
 *  - ch01-figures.md      : Book II ch. I — figure descriptions in the first house
 *  - ch15-*.md            : Book II ch. XV — per-figure runs through the 12 houses
 *  - techniques.md        : technique chapters (witnesses, judge, passing, &c.)
 *
 *   node scripts/ingest-heydon.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { formatInlineMarkers, plainSnippet } from './lib/library-markup.mjs';

const SLUGS = [
  [/fortuna\s*major|fortune\s*major/i, 'fortuna-major'],
  [/fortuna\s*minor/i, 'fortuna-minor'],
  [/populus/i, 'populus'],
  [/\bvia\b/i, 'via'],
  [/a[cdn]?quisitio|aquesitio/i, 'acquisitio'],
  [/amissio/i, 'amissio'],
  [/l[aæe]+ti[tc]ia/i, 'laetitia'],
  [/tristitia/i, 'tristitia'],
  [/puer/i, 'puer'],
  [/puella/i, 'puella'],
  [/albus/i, 'albus'],
  [/rubeus/i, 'rubeus'],
  [/co[nm]?junctio|coniunctio/i, 'conjunctio'],
  [/carcer/i, 'carcer'],
  [/caput/i, 'caput-draconis'],
  [/cauda/i, 'cauda-draconis'],
];

const ORDINALS = [
  null, 'first', 'second', 'third', 'fourth', 'fifth', 'sixth',
  'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
];

const AGRIPPA_NOTE =
  'Heydon here reprints the judgments of the Of Geomancy attributed to Agrippa (1655) nearly verbatim.';
const CATTAN_NOTE =
  "Heydon here reprints Cattan's teaching (The Geomancie, 1591) nearly verbatim.";

function slugFor(name) {
  for (const [re, slug] of SLUGS) if (re.test(name)) return slug;
  return null;
}

const ys = (s) => JSON.stringify(s);

function meta(block) {
  const pdf = block.match(/^- pdf-pages?:\s*(.+)$/m)?.[1]?.trim();
  const printed = block.match(/^- printed-pages?:\s*(.+)$/m)?.[1]?.trim();
  const body = block.replace(/^- (?:(?:pdf-pages?|printed-pages?|pages?|leaves?|dot-pattern|chapter):.*|.*\(printed.*)$/gm, '').trim();
  return { pdf, printed, body };
}

function writeQuote(path, fields, body) {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, `---\n${fields.filter(Boolean).join('\n')}\n---\n\n${formatInlineMarkers(body).trim()}\n`);
}

function excerptOf(text) {
  const e = plainSnippet(text)
    .slice(0, 180);
  return e.replace(/\s\S*$/, '…');
}

/** split a per-figure run ("In the second house …", "In the second, …") into per-house chunks */
function wordIsOrdinal(word, n) {
  const w = word.toLowerCase();
  const form = ORDINALS[n];
  return w.length === form.length && [...w].every((ch, i) => ch === '•' || ch === form[i]);
}

function splitHouses(text) {
  const all = [];
  const re = /[Ii]n the ([A-Za-z•]+)(?:\s+[Hh]ouse)?\b/g;
  let m;
  while ((m = re.exec(text))) all.push({ word: m[1], index: m.index });
  const markers = [{ n: 1, index: 0 }];
  let from = 1;
  for (let n = 2; n <= 12; n++) {
    const hit = all.find((mk) => mk.index >= from && wordIsOrdinal(mk.word, n));
    if (!hit) continue;
    markers.push({ n, index: hit.index });
    from = hit.index + 1;
  }
  const chunks = [];
  for (let k = 0; k < markers.length; k++) {
    const to = k + 1 < markers.length ? markers[k + 1].index : text.length;
    const chunk = text.slice(markers[k].index, to).trim();
    if (chunk.length > 30) chunks.push({ house: markers[k].n, text: chunk });
  }
  return chunks;
}

let written = 0;
const warn = [];

/* ---- ch01-figures.md : first-house descriptions ---- */
{
  const text = readFileSync('references/extracted/heydon/ch01-figures.md', 'utf8');
  const [intro, ...blocks] = text.split(/^## /m);
  const im = meta(intro.replace(/^# .+$/m, ''));
  writeQuote(
    'corpus/heydon/house-01/significations.md',
    [
      'source: heydon',
      `locator: ${ys('Book II, ch. 1 (pp. 1–3)')}`,
      'houses: [1]',
      'topics: [houses]',
      'quality: transcribed',
      `editorialNote: ${ys("Heydon's list of first-house questions expands Cattan's (1591).")}`,
    ],
    im.body,
  );
  written++;
  for (const raw of blocks) {
    const name = raw.split('\n')[0].trim();
    const slug = slugFor(name);
    if (!slug) { warn.push(`ch01: no slug for ${name}`); continue; }
    const m = meta(raw.replace(/^.+$/m, ''));
    writeQuote(
      `corpus/heydon/house-01/${slug}.md`,
      [
        'source: heydon',
        `locator: ${ys(`Book II, ch. 1, s.v. ${name}`)}`,
        `figures: [${slug}]`,
        'houses: [1]',
        'topics: []',
        'quality: transcribed',
        `excerpt: ${ys(excerptOf(m.body))}`,
      ],
      m.body,
    );
    written++;
  }
}

/* ---- ch15-*.md : figures through the twelve houses ---- */
for (const file of readdirSync('references/extracted/heydon')) {
  if (!file.startsWith('ch15-')) continue;
  const text = readFileSync(`references/extracted/heydon/${file}`, 'utf8');
  for (const raw of text.split(/^## /m).slice(1)) {
    const heading = raw.split('\n')[0].trim();
    if (/Index and multiplication/i.test(heading)) {
      const m = meta(raw.replace(/^.+$/m, ''));
      writeQuote(
        'corpus/heydon/techniques/index-multiplication.md',
        [
          'source: heydon',
          `locator: ${ys('Book II, ch. 15 (p. 130)')}`,
          'topics: [springing, projection-of-points]',
          'quality: transcribed',
          `editorialNote: ${ys(AGRIPPA_NOTE)}`,
        ],
        m.body,
      );
      written++;
      continue;
    }
    const slug = slugFor(heading);
    if (!slug) { warn.push(`${file}: no slug for ${heading}`); continue; }
    const m = meta(raw.replace(/^.+$/m, ''));
    const printed = m.printed ? `, pp. ${m.printed.replace(/[^\d–-]/g, '')}` : '';
    if (slug === 'cauda-draconis' && /contrary judgment to/.test(m.body)) {
      writeQuote(
        `corpus/heydon/houses/${slug}/all-houses.md`,
        [
          'source: heydon',
          `locator: ${ys(`Book II, ch. 15, s.v. Cauda Draconis${printed}`)}`,
          `figures: [${slug}]`,
          'houses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]',
          'topics: []',
          'quality: transcribed',
          `editorialNote: ${ys(AGRIPPA_NOTE)}`,
        ],
        m.body,
      );
      written++;
      continue;
    }
    const body = m.body.replace(/\[figure:[^\]]*\]\s*/g, '');
    const chunks = splitHouses(body);
    const found = new Set(chunks.map((c) => c.house));
    if (found.size < 12) warn.push(`${file}: ${slug} houses found ${[...found].join(',')}`);
    for (const c of chunks) {
      writeQuote(
        `corpus/heydon/houses/${slug}/house-${String(c.house).padStart(2, '0')}.md`,
        [
          'source: heydon',
          `locator: ${ys(`Book II, ch. 15, s.v. ${heading.replace(/ — .*/, '')}, in the ${ORDINALS[c.house]} house${printed}`)}`,
          `figures: [${slug}]`,
          `houses: [${c.house}]`,
          'topics: []',
          'quality: transcribed',
          `excerpt: ${ys(excerptOf(c.text))}`,
          `editorialNote: ${ys(AGRIPPA_NOTE)}`,
        ],
        c.text,
      );
      written++;
    }
  }
}

/* ---- techniques.md ---- */
{
  const text = readFileSync('references/extracted/heydon/techniques.md', 'utf8');
  for (const raw of text.split(/^# /m).filter(Boolean)) {
    const heading = raw.split('\n')[0].trim();
    const m = meta(raw.replace(/^.+$/m, ''));
    if (/Book I, Chap\. IV/i.test(heading)) {
      writeQuote('corpus/heydon/techniques/witness-judge-framing.md', [
        'source: heydon',
        `locator: ${ys('Book I, ch. 4 (pp. 9–10)')}`,
        'topics: [judge-witnesses, casting]',
        'quality: transcribed',
      ], m.body);
      written++;
    } else if (/Chap\. XIII/i.test(heading)) {
      // per-figure passing rule; split on [figure: …] markers
      const parts = m.body.split(/(?=\[figure: [\d, ]+\])/).filter((p) => p.trim());
      const preamble = [];
      for (const part of parts) {
        const nameMatch = part.match(/\*(Acquisitio|Amissio|Fortuna Major|Fortuna Minor|Rubeus|Albus|Caput draconis|Cauda draconis|Letitia|Tristitia|Puella|Puer|Conjunctio|Carcer|Populus|Via)\*/i);
        const slug = nameMatch ? slugFor(nameMatch[1]) : null;
        if (!slug) { preamble.push(part); continue; }
        const body = part.replace(/\[figure:[^\]]*\]\s*/g, '').trim();
        writeQuote(`corpus/heydon/techniques/passing-${slug}.md`, [
          'source: heydon',
          `locator: ${ys(`Book II, ch. 13, s.v. ${nameMatch[1]} (pp. 89–99)`)}`,
          `figures: [${slug}]`,
          'topics: [springing]',
          'quality: transcribed',
          `editorialNote: ${ys(CATTAN_NOTE)}`,
        ], body);
        written++;
      }
      if (preamble.length) {
        writeQuote('corpus/heydon/techniques/passing-general.md', [
          'source: heydon',
          `locator: ${ys('Book II, ch. 13 (pp. 89–99)')}`,
          'topics: [springing]',
          'quality: transcribed',
          `editorialNote: ${ys(CATTAN_NOTE)}`,
        ], preamble.join('\n\n').replace(/^CHAP\. XIII\.\s*/m, '').trim());
        written++;
      }
    } else if (/Chap\. XIV/i.test(heading)) {
      writeQuote('corpus/heydon/techniques/good-ill-houses.md', [
        'source: heydon',
        `locator: ${ys('Book II, ch. 14 (pp. 100–102)')}`,
        'topics: [dignities, company]',
        'quality: transcribed',
        `editorialNote: ${ys(CATTAN_NOTE)}`,
      ], m.body.replace(/^CHAP\. XIV\.\s*/m, '').trim());
      written++;
    } else if (/Chap\. XVI/i.test(heading) && !/XVII/.test(heading)) {
      writeQuote('corpus/heydon/techniques/two-witnesses.md', [
        'source: heydon',
        `locator: ${ys('Book II, ch. 16 (p. 131)')}`,
        'topics: [judge-witnesses]',
        'quality: transcribed',
        `editorialNote: ${ys(CATTAN_NOTE)}`,
      ], m.body.replace(/^CHAP\. XVI\.\s*/m, '').trim());
      written++;
    } else if (/Chap\. XVII/i.test(heading)) {
      writeQuote('corpus/heydon/techniques/the-judge.md', [
        'source: heydon',
        `locator: ${ys('Book II, ch. 17 (pp. 132–133)')}`,
        'topics: [judge-witnesses]',
        'quality: transcribed',
        `editorialNote: ${ys(CATTAN_NOTE)}`,
      ], m.body.replace(/^CHAP\. XVII\.\s*/m, '').trim());
      written++;
    } else if (/Part of Fortune/i.test(heading)) {
      writeQuote('corpus/heydon/techniques/part-of-fortune.md', [
        'source: heydon',
        `locator: ${ys('Book III, sect. 5 (pp. 24–25)')}`,
        'topics: [part-of-fortune]',
        'quality: transcribed',
      ], m.body);
      written++;
    } else {
      warn.push(`techniques: unhandled section ${heading.slice(0, 60)}`);
    }
  }
}

console.log(`wrote ${written} corpus files`);
if (warn.length) console.log('WARNINGS:\n' + warn.join('\n'));
