/**
 * Generate corpus quote files from the Crowley library chapters:
 *  - each figure's "name and meaning" line (ch. I)
 *  - each figure's general motto (ch. V)
 *  - each figure's one-line meaning in each of the 12 houses (ch. V)
 * Re-running overwrites.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SLUGS = {
  Acquisitio: 'acquisitio', 'Fortuna Minor': 'fortuna-minor', Amissio: 'amissio',
  'Lætitia': 'laetitia', 'Fortuna Major': 'fortuna-major', Tristitia: 'tristitia',
  Puella: 'puella', Albus: 'albus', Puer: 'puer', Conjunctio: 'conjunctio',
  Rubeus: 'rubeus', Carcer: 'carcer', 'Caput Draconis': 'caput-draconis',
  Via: 'via', 'Cauda Draconis': 'cauda-draconis', Populus: 'populus',
};

function writeQuote(path, frontmatter, body) {
  writeFileSync(path, `---\n${frontmatter.join('\n')}\n---\n\n${body}\n`);
}

let n = 0;

/* ch. V: mottos and house tables */
const ch5 = readFileSync('src/content/library/crowley/05-figures-in-houses.md', 'utf8');
const sections = ch5.split(/^### /m).slice(1);
for (const section of sections) {
  const lines = section.split('\n');
  const name = lines[0].trim();
  const slug = SLUGS[name];
  if (!slug) throw new Error(`unknown figure: ${name}`);
  const motto = section.match(/^\*(.+)\*$/m)?.[1];
  if (!motto) throw new Error(`no motto for ${name}`);

  mkdirSync(`corpus/crowley/figures`, { recursive: true });
  writeQuote(
    `corpus/crowley/figures/${slug}-general.md`,
    [
      'source: crowley',
      `locator: "ch. V, s.v. ${name}"`,
      `figures: [${slug}]`,
      'topics: [general]',
      'quality: transcribed',
    ],
    motto,
  );
  n++;

  const rows = [...section.matchAll(/^\| (\d+) \| (.+) \|$/gm)];
  if (rows.length !== 12) throw new Error(`${name}: ${rows.length} house rows`);
  mkdirSync(`corpus/crowley/houses/${slug}`, { recursive: true });
  for (const [, house, meaning] of rows) {
    writeQuote(
      `corpus/crowley/houses/${slug}/house-${String(house).padStart(2, '0')}.md`,
      [
        'source: crowley',
        `locator: "ch. V, s.v. ${name}, house ${house}"`,
        `figures: [${slug}]`,
        `houses: [${house}]`,
        'topics: []',
        'quality: transcribed',
      ],
      meaning.trim(),
    );
    n++;
  }
}

/* ch. I: name-and-meaning lines */
const ch1 = readFileSync('src/content/library/crowley/01-attributions.md', 'utf8');
for (const m of ch1.matchAll(/<strong>([^<]+)<\/strong><br>([^<]+)<\/td>/g)) {
  const printName = m[1].trim().replace('Laetitia', 'Lætitia');
  const slug = SLUGS[printName] ?? SLUGS[m[1].trim()];
  if (!slug) throw new Error(`unknown figure in ch1: ${m[1]}`);
  writeQuote(
    `corpus/crowley/figures/${slug}-meaning.md`,
    [
      'source: crowley',
      `locator: "ch. I, s.v. ${m[1].trim()}"`,
      `figures: [${slug}]`,
      'topics: [general]',
      'quality: transcribed',
    ],
    m[2].trim(),
  );
  n++;
}

console.log(`wrote ${n} corpus files`);
