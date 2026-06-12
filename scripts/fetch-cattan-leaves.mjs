/**
 * Download the leaf images of the 1591 English Cattan (archive.org item
 * b30337860, 288 leaves) via IIIF at 1600px width, into
 * references/scans/cattan/ (gitignored — re-run to restore).
 *
 *   node scripts/fetch-cattan-leaves.mjs [firstLeaf] [lastLeaf]
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';

const ITEM = 'b30337860';
const LEAVES = 288;
const OUT = 'references/scans/cattan';

const first = Number(process.argv[2] ?? 0);
const last = Number(process.argv[3] ?? LEAVES - 1);

mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let leaf = first; leaf <= last; leaf++) {
  const path = `${OUT}/leaf-${String(leaf).padStart(3, '0')}.jpg`;
  if (existsSync(path)) continue;
  const url = `https://iiif.archive.org/iiif/${ITEM}$${leaf}/full/1600,/0/default.jpg`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      console.error(`leaf ${leaf}: HTTP ${res.status}`);
      continue;
    }
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    console.log(`leaf ${leaf} ok`);
  } catch (err) {
    console.error(`leaf ${leaf}: ${err.message}`);
  }
  await sleep(250); // be polite to archive.org
}
console.log('done');
