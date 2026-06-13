/**
 * Convert the geomancy sections of the EEBO-TCP TEI (A26563) into Markdown
 * library chapters under src/content/library/.
 *
 * Run once, then hand-tune the output: the u/v and i/j normalisation is a
 * heuristic (per the site's editorial method) and residual early-modern
 * forms are corrected during proofreading. Re-running OVERWRITES the files,
 * so commit hand-tuned output before re-running.
 *
 *   node scripts/tei-to-md.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const xml = readFileSync('references/eebo/A26563.xml', 'utf8');

/* ---------------------------------------------------------------- helpers */

const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

function decodeEntities(s) {
  return s
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => entities[m])
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

/** Semi-diplomatic normalisation: long s, VV, conservative u/v and i/j. */
function normaliseSpelling(s) {
  return s
    .replace(/ſ/g, 's')
    .replace(/\bVV/g, 'W')
    .replace(/\bvv/g, 'w')
    // word-initial v before a consonant is vocalic: vnto→unto, vse→use
    .replace(/\bv(?=[^aeiouv\s\d])/g, 'u')
    .replace(/\bV(?=[^AEIOUaeiouV\s\d])/g, 'U')
    // u between vowels is consonantal: haue→have, euery→every
    .replace(/([aeiou])u(?=[aeiou])/g, '$1v')
    .replace(/([AEIOU])u(?=[aeiou])/g, '$1v')
    // word-initial i before a vowel is consonantal: iudge→judge, Iupiter→Jupiter
    .replace(/\bi(?=[aeiou])/g, 'j')
    .replace(/\bI(?=[aeou])/g, 'J');
}

/** Is this <table> body a geomantic dot-pattern (cells of only * and space)? */
function isGlyphTable(body) {
  const cells = [...body.matchAll(/<cell>([^<]*)<\/cell>/g)].map((m) => m[1].trim());
  return cells.length > 0 && cells.every((c) => c === '*' || c === '');
}

/** Render a dot-pattern table as lines of ● separated by <br>. */
function glyphTableToDots(body) {
  const rows = [...body.matchAll(/<row>([\s\S]*?)<\/row>/g)].map((m) =>
    [...m[1].matchAll(/<cell>([^<]*)<\/cell>/g)]
      .map((c) => c[1].trim())
      .filter((c) => c === '*')
      .map(() => '●')
      .join(' '),
  );
  return `<span class="geo-figure">${rows.filter(Boolean).join('<br>')}</span>`;
}

/** Convert an ordinary TEI table to an HTML table. */
function teiTableToHtml(body) {
  const rows = [...body.matchAll(/<row>([\s\S]*?)<\/row>/g)]
    .map((m) => {
      const cells = [...m[1].matchAll(/<cell[^>]*>([\s\S]*?)<\/cell>/g)]
        .map((c) => `<td>${inlineText(c[1])}</td>`)
        .join('');
      return `  <tr>${cells}</tr>`;
    })
    .join('\n');
  return `\n\n@@TABLE@@\n${rows}\n@@/TABLE@@\n\n`;
}

/** Flatten inline markup inside a cell or heading, preserving glyph spans. */
function inlineText(s) {
  return s
    .replace(/<hi>([\s\S]*?)<\/hi>/g, '@@EM@@$1@@/EM@@')
    .replace(/<br>/g, '@@BR@@')
    .replace(/<span class="geo-figure">/g, '@@SPAN@@')
    .replace(/<\/span>/g, '@@/SPAN@@')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replaceAll('@@EM@@', '<em>')
    .replaceAll('@@/EM@@', '</em>')
    .replaceAll('@@BR@@', '<br>')
    .replaceAll('@@SPAN@@', '<span class="geo-figure">')
    .replaceAll('@@/SPAN@@', '</span>')
    .trim();
}

/** Core TEI-fragment → Markdown conversion. */
function teiToMd(chunk, { headLevel = 2 } = {}) {
  let s = chunk;

  s = s.replace(/<pb[^>]*\/>/g, ' ');
  s = s.replace(/<g ref="char:EOLhyphen"\/>\s*/g, '');
  // other <g> elements carry the rendered character as content
  s = s.replace(/<g ref="[^"]*">([\s\S]*?)<\/g>/g, '$1');
  s = s.replace(/<gap[^>]*>[\s\S]*?<\/gap>/g, '•').replace(/<gap[^>]*\/>/g, '•');

  // innermost tables first (dot-pattern figures nest inside attribute tables);
  // converted HTML uses placeholder tokens so the scan never re-matches output
  for (;;) {
    const close = s.indexOf('</table>');
    if (close === -1) break;
    const open = s.lastIndexOf('<table>', close);
    if (open === -1) throw new Error('unbalanced <table> markup');
    const body = s.slice(open + '<table>'.length, close);
    const repl = isGlyphTable(body) ? glyphTableToDots(body) : teiTableToHtml(body);
    s = s.slice(0, open) + repl + s.slice(close + '</table>'.length);
  }
  s = s.replaceAll('@@TABLE@@', '<table>').replaceAll('@@/TABLE@@', '</table>');

  s = s.replace(/<figure>([\s\S]*?)<\/figure>/g, (_, inner) =>
    `\n\n${inner.replace(/<\/?p>/g, ' ').replace(/<desc>[\s\S]*?<\/desc>/g, ' ').trim()}\n\n`,
  );

  s = s.replace(/<head>([\s\S]*?)<\/head>/g, (_, h) => `\n\n${'#'.repeat(headLevel)} ${inlineText(h)}\n\n`);
  s = s.replace(/<item>([\s\S]*?)<\/item>/g, (_, i) => `\n- ${inlineText(i)}`);
  s = s.replace(/<\/?list[^>]*>/g, '\n');
  s = s.replace(/<q>([\s\S]*?)<\/q>/g, (_, q) => `\n\n> ${inlineText(q)}\n\n`);
  s = s.replace(/<trailer>([\s\S]*?)<\/trailer>/g, (_, t) => `\n\n*${inlineText(t)}*\n\n`);
  s = s.replace(/<hi>([\s\S]*?)<\/hi>/g, (_, h) => `*${h.replace(/\s+/g, ' ').trim()}*`);

  s = s.replace(/<\/?p>/g, '\n\n');
  s = s.replace(/<note[^>]*>([\s\S]*?)<\/note>/g, ' ($1) ');
  s = s.replace(/<[^>]+>/g, ' '); // anything left (div, bibl, back…)

  s = decodeEntities(s);
  s = normaliseSpelling(s);

  // tidy paragraphs: collapse intra-paragraph whitespace, keep blank lines
  return s
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
    // restore line structure inside generated HTML tables
    .replace(/<table>\s*/g, '<table>\n')
    .replace(/\s*<tr>/g, '\n<tr>')
    .replace(/<\/table>/g, '\n</table>');
}

function agrippaDiagram(src, alt, caption) {
  return [
    '<figure class="source-diagram">',
    `  <img src="../../../assets/agrippa/${src}" alt="${alt}" loading="lazy" />`,
    `  <figcaption>${caption} Source diagram from Elizabeth Bennett's Princeton reproduction of Turner's 1655 Agrippa text.</figcaption>`,
    '</figure>',
  ].join('\n');
}

function applyAgrippaDiagrams(body) {
  const diagrams = {
    table: agrippaDiagram(
      'hcafig1.gif',
      'The sixteen geomantic figures arranged with planetary attributions.',
      'Agrippa opening table of the sixteen figures and their planetary attributions.',
    ),
    projection: agrippaDiagram(
      'hcafig2.gif',
      'Example projection showing four Mothers made from rows of points.',
      'Agrippa example of projecting points to make the four Mothers.',
    ),
    filiae: agrippaDiagram(
      'hcafig3.gif',
      'Matres and Filiae diagram showing how the daughters are produced from the mothers.',
      'Agrippa Matres and Filiae diagram.',
    ),
    theme: agrippaDiagram(
      'hcafig4.gif',
      'A Theme of Geomancy, with Filiae and Matres arranged in a semicircular chart.',
      'Agrippa common geomantic theme diagram.',
    ),
    index: agrippaDiagram(
      'hcafig5.gif',
      'Square geomantic chart showing Jupiter in the sixth house as the index.',
      'Agrippa true figure and index diagram.',
    ),
  };

  let output = body;
  output = output.replace(
    /(all figures upon which this whole art is founded are only sixteen, as in this following table you shall see noted, with their names\.)\n\nNow we proceed/,
    `$1\n\n${diagrams.table}\n\nNow we proceed`,
  );
  output = output.replace(
    /(an example whereof you may see here following\.)\n\nOf these four/,
    `$1\n\n${diagrams.projection}\n\nOf these four`,
  );
  output = output.replace(
    /(as in this example\.)\n\nFiliae produced\. Matres\.[\s\S]*?\n\nAnd these figures/,
    `$1\n\n${diagrams.filiae}\n\nAnd these figures`,
  );
  output = output.replace(
    /(as appeareth in this example following\.)\n\n## A Theme of Geomancy\.\n\nFiliae\. Matres\.\n\nAnd this/,
    `$1\n\n${diagrams.theme}\n\nAnd this`,
  );
  output = output.replace(
    /(The example of this Figure is here placed\.)\n\n## There remains out of the division of the projections 6 points; wherefore Jupiter in the sixth house sheweth the index\.\n\nIt remaineth/,
    `$1\n\n${diagrams.index}\n\nIt remaineth`,
  );
  return output;
}

function writeChapter(path, frontmatter, body) {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => (typeof v === 'string' && /[:#'"]/.test(v) ? `${k}: ${JSON.stringify(v)}` : `${k}: ${v}`))
    .join('\n');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `---\n${fm}\n---\n\n${body}\n`);
  console.log(`wrote ${path} (${body.length} chars)`);
}

/* ------------------------------------------------------------- extraction */

// Locate the two parts by their heads.
const partStarts = [...xml.matchAll(/<div[^>]*type="part"[^>]*>/g)].map((m) => m.index);
partStarts.push(xml.length);
const parts = [];
for (let i = 0; i < partStarts.length - 1; i++) {
  const chunk = xml.slice(partStarts[i], partStarts[i + 1]);
  const head = chunk.match(/<head>([\s\S]*?)<\/head>/);
  parts.push({ head: head ? inlineText(head[1]) : '', chunk });
}

const geomancy = parts.find((p) => /Of Geomancy/i.test(p.head) && !/Astronomical/i.test(p.head));
const gerard = parts.find((p) => /ASTRONOMICAL GEOMANCY/i.test(p.head));
if (!geomancy || !gerard) throw new Error('could not locate parts in TEI');

/* --- Agrippa, Of Geomancy: one chapter --- */
{
  let body = applyAgrippaDiagrams(teiToMd(geomancy.chunk.replace(/<head>[\s\S]*?<\/head>/, ''), { headLevel: 2 }));
  writeChapter(
    'src/content/library/agrippa/of-geomancy.md',
    {
      title: '"Of Geomancy" — the full text',
      source: 'agrippa',
      order: 1,
      locator: '"pp. 1–60"',
      description:
        '"The complete text of the treatise on geomancy attributed to Henry Cornelius Agrippa, in Robert Turner\'s English translation of 1655."',
    },
    body,
  );
}

/* --- Gerard of Cremona: intro + Questions of each house --- */
{
  // The Arbatel of Magick follows Gerard in the volume without a part-level
  // div of its own; cut at its title div (it is out of scope for the site).
  const arbatel = gerard.chunk.search(/<div[^>]*type="title"/);
  const chunk = arbatel === -1 ? gerard.chunk : gerard.chunk.slice(0, arbatel);
  // split on the "Questions of the Nth house" heads
  const heads = [...chunk.matchAll(/<head>\s*Questions of the[\s\S]*?<\/head>/g)];
  const ordinals = [
    'first', 'second', 'third', 'fourth', 'fifth', 'sixth',
    'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
  ];
  const titles = [
    'Questions of the First House', 'Questions of the Second House',
    'Questions of the Third House', 'Questions of the Fourth House',
    'Questions of the Fifth House', 'Questions of the Sixth House',
    'Questions of the Seventh House', 'Questions of the Eighth House',
    'Questions of the Ninth House', 'Questions of the Tenth House',
    'Questions of the Eleventh House', 'Questions of the Twelfth House',
  ];

  const intro = chunk.slice(0, heads[0].index).replace(/<head>[\s\S]*?<\/head>/, '');
  writeChapter(
    'src/content/library/gerard/00-introduction.md',
    {
      title: '"Of Astronomical Geomancy" — introduction',
      source: 'gerard',
      order: 0,
      description:
        '"The opening of Gerard of Cremona\'s medieval treatise of astrological geomancy: how to erect and judge the figure, in Robert Turner\'s 1655 translation."',
    },
    teiToMd(intro, { headLevel: 2 }),
  );

  for (let h = 0; h < heads.length; h++) {
    const start = heads[h].index;
    const end = h + 1 < heads.length ? heads[h + 1].index : chunk.length;
    const section = chunk.slice(start, end).replace(/<head>[\s\S]*?<\/head>/, '');
    const n = h + 1;
    writeChapter(
      `src/content/library/gerard/${String(n).padStart(2, '0')}-${ordinals[h]}-house.md`,
      {
        title: `"${titles[h]} — Of Astronomical Geomancy"`,
        source: 'gerard',
        order: n,
        description: `"Gerard of Cremona's judgments for questions of the ${ordinals[h]} house, from the medieval treatise Of Astronomical Geomancy (trans. Turner, 1655)."`,
      },
      teiToMd(section, { headLevel: 2 }),
    );
  }
}
