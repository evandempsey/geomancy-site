/**
 * Verify that every internal link in the built course pages resolves to
 * a page (or asset) in dist/. Catches dead hrefs in lesson prose and
 * reading lists that the content schema cannot validate.
 *
 * Run after `npm run build`:  npm run check:course
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
if (!existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const failures = [];
let checked = 0;

for (const file of htmlFiles(join(DIST, 'course'))) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = match[1];
    checked += 1;
    const target = join(DIST, href);
    const ok =
      (existsSync(target) && statSync(target).isFile()) ||
      existsSync(join(target, 'index.html'));
    if (!ok) failures.push({ file, href });
  }
}

if (failures.length > 0) {
  console.error(`✗ ${failures.length} dead internal link(s) in course pages:`);
  for (const f of failures) console.error(`  ${f.href}  (in ${f.file})`);
  process.exit(1);
}
console.log(`✓ ${checked} internal links in course pages all resolve.`);
