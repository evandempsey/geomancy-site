/**
 * Split the per-figure, per-house entries of Agrippa's "Of Geomancy"
 * (converted from EEBO-TCP by tei-to-md.mjs) into individual corpus quote
 * files under corpus/agrippa/houses/.
 *
 * Semi-automated extraction from a clean transcription; output is reviewed
 * by hand (quality: transcribed). Re-running overwrites.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const md = readFileSync('src/content/library/agrippa/of-geomancy.md', 'utf8');
const body = md.split('---').slice(2).join('---'); // strip frontmatter

// order of the entry sections in the text
const FIGURES = [
  ['fortuna-major', 'Fortuna major'],
  ['fortuna-minor', 'Fortuna minor'],
  ['via', 'Via'],
  ['populus', 'Populus'],
  ['acquisitio', 'Acquisitio'],
  ['laetitia', 'Laetitia'],
  ['puella', 'Puella'],
  ['amissio', 'Amissio'],
  ['conjunctio', 'Conjunctio'],
  ['albus', 'Albus'],
  ['puer', 'Puer'],
  ['rubeus', 'Rubeus'],
  ['carcer', 'Carcer'],
  ['tristitia', 'Tristitia'],
  ['caput-draconis', 'Caput Draconis'],
];

const ORDINALS = [
  null, 'first', 'second', 'third', 'fourth', 'fifth', 'sixth',
  'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
];

// find the start of each figure's entry section
const starts = FIGURES.map(([slug, name]) => {
  const re = new RegExp(
    `\\*${name.replace(' ', '[\\s\\S]{1,3}')},?\\*[,]?\\s+(?:being\\s+found\\s+in|found\\s+in|in)\\s+the\\s+(?:[Ff]irst|[Ss]econd)\\s+house`,
  );
  const m = body.match(re);
  if (!m) throw new Error(`no section start for ${name}`);
  return { slug, name, index: m.index };
});

// the entries end where Cauda's note begins
const caudaNote = body.indexOf('*Cauda Draconis,* in all and singular');
if (caudaNote === -1) throw new Error('no Cauda note');

// archaic spellings and TCP illegibility bullets both occur in the ordinals
const ORDINAL_FORMS = [
  null,
  ['first'],
  ['second'],
  ['third', 'thirde'],
  ['fourth', 'fourthe'],
  ['fifth', 'fift', 'fifte'],
  ['sixth', 'sixt', 'sixte'],
  ['seventh', 'seaventh'],
  ['eighth', 'eight'],
  ['ninth', 'nineth'],
  ['tenth'],
  ['eleventh', 'eleaventh'],
  ['twelfth', 'twelfe', 'twelft'],
];

/** word may contain • for an illegible letter; match charwise against a form */
function wordIsOrdinal(word, n) {
  const w = word.toLowerCase();
  return ORDINAL_FORMS[n].some(
    (form) => w.length === form.length && [...w].every((ch, i) => ch === '•' || ch === form[i]),
  );
}

function houseMarkers(section) {
  // collect every "…in the <word> house" occurrence with its position
  const all = [];
  const re = /[Ii]n th[ei] ([A-Za-z•]+)\s+[Hh]ouse/g;
  let m;
  while ((m = re.exec(section))) all.push({ word: m[1], index: m.index });

  // walk houses 2..12, taking for each the first matching marker after the
  // previous house's marker — robust against forward references in the text
  const result = [];
  let from = 0;
  for (let n = 2; n <= 12; n++) {
    const hit = all.find((mk) => mk.index >= from && wordIsOrdinal(mk.word, n));
    if (!hit) continue;
    result.push({ n, index: hit.index });
    from = hit.index + 1;
  }
  return result;
}

let written = 0;
const report = [];

for (let i = 0; i < starts.length; i++) {
  const { slug, name, index } = starts[i];
  const end = i + 1 < starts.length ? starts[i + 1].index : caudaNote;
  const section = body.slice(index, end).trim();
  const markers = [{ n: 1, index: 0 }, ...houseMarkers(section)];

  const found = new Set();
  for (let k = 0; k < markers.length; k++) {
    const { n, index: mi } = markers[k];
    const to = k + 1 < markers.length ? markers[k + 1].index : section.length;
    // include the figure-name lead-in for the first chunk
    const from = k === 0 ? 0 : mi;
    let text = section.slice(from, to).trim();
    // tidy paragraph breaks
    text = text.replace(/\n{3,}/g, '\n\n');
    if (text.length < 40) continue;
    found.add(n);

    const excerpt = text
      .replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 180)
      .replace(/\s\S*$/, '…');

    const dir = `corpus/agrippa/houses/${slug}`;
    mkdirSync(dir, { recursive: true });
    const fm = [
      '---',
      'source: agrippa',
      `locator: "s.v. ${name}, in the ${ORDINALS[n]} house"`,
      `figures: [${slug}]`,
      `houses: [${n}]`,
      'topics: []',
      'quality: transcribed',
      `excerpt: ${JSON.stringify(excerpt)}`,
      '---',
      '',
    ].join('\n');
    writeFileSync(`${dir}/house-${String(n).padStart(2, '0')}.md`, fm + text + '\n');
    written++;
  }
  const missing = [];
  for (let n = 1; n <= 12; n++) if (!found.has(n)) missing.push(n);
  report.push(`${name}: ${found.size}/12${missing.length ? ` (missing ${missing.join(',')})` : ''}`);
}

// Cauda Draconis: a single quote covering all houses
{
  const tail = body.slice(caudaNote).split('\n\n')[0].trim();
  mkdirSync('corpus/agrippa/houses/cauda-draconis', { recursive: true });
  const fm = [
    '---',
    'source: agrippa',
    'locator: "s.v. Cauda Draconis"',
    'figures: [cauda-draconis]',
    'houses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]',
    'topics: []',
    'quality: transcribed',
    'editorialNote: "Agrippa gives no separate judgments for the Dragon\'s Tail: in every house it reverses the judgment of the Dragon\'s Head."',
    '---',
    '',
  ].join('\n');
  writeFileSync('corpus/agrippa/houses/cauda-draconis/all-houses.md', fm + tail + '\n');
  written++;
}

console.log(report.join('\n'));
console.log(`wrote ${written} corpus files`);
