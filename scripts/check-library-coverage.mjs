/**
 * Verify that corpus quote entries, especially those quoted directly in the
 * site/course, have a Library home.
 *
 * Generated Library chapters declare exact coverage with frontmatter `covers`.
 * Full-text Library chapters are checked by normalized body containment.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

function* files(dir, predicate = () => true) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path, predicate);
    else if (predicate(path)) yield path;
  }
}

function splitFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontmatter: '', body: text };
  return { frontmatter: match[1], body: text.slice(match[0].length) };
}

function yamlScalar(frontmatter, key) {
  return frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.replace(/^"|"$/g, '');
}

function yamlList(frontmatter, key) {
  const inline = frontmatter.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]`, 'm'));
  if (inline) return inline[1].split(',').map((v) => v.trim()).filter(Boolean);

  const lines = frontmatter.split('\n');
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) return [];
  const values = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('  - ')) break;
    values.push(line.slice(4).trim().replace(/^"|"$/g, ''));
  }
  return values;
}

function normalize(text) {
  return text
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{margin:[^}]*\}/g, ' ')
    .replace(/\[figure:[^\]]*\]/g, ' ')
    .replace(/[`*_#[\]()>|{}.,;:!?'"“”‘’]/g, ' ')
    .replace(/[–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function quoteIdFromPath(path) {
  return relative('corpus', path).replace(/\.md$/, '').replace(/\\/g, '/');
}

const quoteFiles = [...files('corpus', (path) => path.endsWith('.md'))];
const quotes = quoteFiles.map((path) => {
  const text = readFileSync(path, 'utf8');
  const { frontmatter, body } = splitFrontmatter(text);
  return {
    id: quoteIdFromPath(path),
    source: yamlScalar(frontmatter, 'source') ?? 'unknown',
    body,
    normalized: normalize(body),
  };
});

const libraryFiles = [...files('src/content/library', (path) => /\.mdx?$/.test(path))];
const displayFiles = [...quoteFiles, ...libraryFiles];
const covered = new Set();
const libraryBodies = [];
const librarySources = new Set();
const fullTextSources = new Set(['agrippa', 'crowley', 'gerard']);

for (const path of libraryFiles) {
  const text = readFileSync(path, 'utf8');
  const { frontmatter, body } = splitFrontmatter(text);
  const source = yamlScalar(frontmatter, 'source');
  if (source) librarySources.add(source);
  for (const id of yamlList(frontmatter, 'covers')) covered.add(id);
  libraryBodies.push({ path, normalized: normalize(body) });
}

for (const quote of quotes) {
  if (covered.has(quote.id)) continue;
  if (fullTextSources.has(quote.source) && librarySources.has(quote.source)) {
    covered.add(quote.id);
    continue;
  }
  if (quote.normalized.length < 20) continue;
  if (libraryBodies.some((entry) => entry.normalized.includes(quote.normalized))) {
    covered.add(quote.id);
  }
}

const directQuoteIds = new Set();
for (const path of files('src', (p) => /\.(astro|mdx?)$/.test(p))) {
  const text = readFileSync(path, 'utf8');
  for (const match of text.matchAll(/<Quote\s+id="([^"]+)"/g)) directQuoteIds.add(match[1]);
}

const missingDirect = [...directQuoteIds].filter((id) => !covered.has(id)).sort();
const missingCorpus = quotes.filter((q) => !covered.has(q.id)).map((q) => q.id).sort();
const missingFiles = [...directQuoteIds]
  .filter((id) => !existsSync(join('corpus', `${id}.md`)))
  .sort();

if (missingFiles.length) {
  console.error(`x ${missingFiles.length} direct Quote id(s) do not exist in corpus:`);
  for (const id of missingFiles) console.error(`  ${id}`);
  process.exit(1);
}

if (missingDirect.length || missingCorpus.length) {
  if (missingDirect.length) {
    console.error(`x ${missingDirect.length} direct Quote id(s) lack Library coverage:`);
    for (const id of missingDirect) console.error(`  ${id}`);
  }
  if (missingCorpus.length) {
    console.error(`x ${missingCorpus.length} corpus quote(s) lack Library coverage:`);
    for (const id of missingCorpus.slice(0, 80)) console.error(`  ${id}`);
    if (missingCorpus.length > 80) console.error(`  ...and ${missingCorpus.length - 80} more`);
  }
  process.exit(1);
}

const rawMarkerPatterns = [
  ['raw margin marker', /\{margin:/],
  ['raw leaf marker', /\{Leaf\b/i],
  ['library wide frontmatter', /^wide:\s*true\s*$/m],
  ['raw PDF marker', /\[PDF\b/],
  ['raw PDF heading', /^##\s+PDF\s+p\./m],
  ['raw figure marker', /\[figure:/],
  ['unnormalized PDF locator', /class="source-locator[^"]*">PDF\s+\d/],
  ['unnormalized manuscript page locator', /\bms p\.\s*\d+[rv]\b/i],
  ['raw dots metadata', /^-?\s*dots:/m],
  ['raw headline-band metadata', /headline-band:/],
  ['long bullet-dot run', /(?:●\s*){8,}/],
];

const rawMarkerHits = [];
for (const path of displayFiles) {
  const text = readFileSync(path, 'utf8');
  for (const [label, pattern] of rawMarkerPatterns) {
    if (pattern.test(text)) rawMarkerHits.push({ path, label });
  }
}

if (rawMarkerHits.length) {
  console.error(`x ${rawMarkerHits.length} raw transcription marker(s) remain in generated display content:`);
  for (const hit of rawMarkerHits.slice(0, 80)) console.error(`  ${hit.path}: ${hit.label}`);
  if (rawMarkerHits.length > 80) console.error(`  ...and ${rawMarkerHits.length - 80} more`);
  process.exit(1);
}

const explicit = covered.size;
console.log(`✓ ${directQuoteIds.size} direct Quote ids and ${quotes.length} corpus quotes have Library coverage.`);
console.log(`✓ Checked ${libraryFiles.length} library chapters (${explicit} covered quote ids).`);
console.log(`✓ No raw transcription markers remain in corpus/library display content.`);
