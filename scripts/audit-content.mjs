import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/content', 'corpus'];
const EXTENSIONS = new Set(['.astro', '.md', '.mdx', '.yaml', '.yml']);
const ASTRO_SYMBOLS = /[♈♉♊♋♌♍♎♏♐♑♒♓☉☽☿♀♂♃♄☊☋℧]/gu;
const CHECKS = [
  ['illegible markers', /•/gu],
  ['replacement characters', /�/gu],
  ['emoji presentation selectors', /\uFE0F/gu],
  ['raw astrological symbols', ASTRO_SYMBOLS],
];

function ext(path) {
  const match = path.match(/\.[^.]+$/);
  return match?.[0] ?? '';
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) yield* files(path);
    else if (EXTENSIONS.has(ext(path))) yield path;
  }
}

function preview(text, index) {
  return text
    .slice(Math.max(0, index - 45), Math.min(text.length, index + 45))
    .replace(/\s+/g, ' ')
    .trim();
}

let totalFindings = 0;

for (const [label, pattern] of CHECKS) {
  const hits = [];
  for (const root of ROOTS) {
    for (const file of files(root)) {
      const text = readFileSync(file, 'utf8');
      const matches = [...text.matchAll(pattern)];
      if (matches.length === 0) continue;
      hits.push({ file, count: matches.length, first: preview(text, matches[0].index ?? 0) });
    }
  }

  const count = hits.reduce((sum, hit) => sum + hit.count, 0);
  totalFindings += count;
  console.log(`\n${label}: ${count}`);
  for (const hit of hits) {
    console.log(`  ${hit.file}: ${hit.count} - ${hit.first}`);
  }
}

console.log(`\ncontent audit complete: ${totalFindings} total findings`);
