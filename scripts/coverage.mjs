/**
 * Print the 16×12 figure-in-house extraction matrix per source, from the
 * corpus frontmatter. Drives the Phase 2 work queue: a combination page is
 * published once any source covers it.
 *
 *   npm run coverage
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FIGURES = [
  'via', 'populus', 'fortuna-major', 'fortuna-minor', 'acquisitio', 'amissio',
  'laetitia', 'tristitia', 'puer', 'puella', 'albus', 'rubeus', 'conjunctio',
  'carcer', 'caput-draconis', 'cauda-draconis',
];

function* mdFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* mdFiles(p);
    else if (name.endsWith('.md')) yield p;
  }
}

const coverage = new Map(); // source -> Set("figure/house")
for (const file of mdFiles('corpus')) {
  const fm = readFileSync(file, 'utf8').split('---')[1] ?? '';
  const source = fm.match(/^source:\s*(\S+)/m)?.[1];
  const figures = fm.match(/^figures:\s*\[([^\]]*)\]/m)?.[1]?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  const houses = fm.match(/^houses:\s*\[([^\]]*)\]/m)?.[1]?.split(',').map((s) => Number(s.trim())).filter(Boolean) ?? [];
  if (!source || figures.length === 0 || houses.length === 0) continue;
  const set = coverage.get(source) ?? new Set();
  for (const f of figures) for (const h of houses) set.add(`${f}/${h}`);
  coverage.set(source, set);
}

const sources = [...coverage.keys()].sort();
for (const source of sources) {
  const set = coverage.get(source);
  console.log(`\n${source} — ${set.size}/192`);
  console.log('figure'.padEnd(16) + ' ' + Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2)).join(' '));
  for (const f of FIGURES) {
    const row = Array.from({ length: 12 }, (_, i) => (set.has(`${f}/${i + 1}`) ? ' ●' : ' ·')).join(' ');
    console.log(f.padEnd(16) + row);
  }
}

const union = new Set();
for (const set of coverage.values()) for (const k of set) union.add(k);
console.log(`\nTOTAL combination pages publishable: ${union.size}/192`);
