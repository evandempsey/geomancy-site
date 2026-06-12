/**
 * Helpers for working with the 992-page Theomagia PDF.
 *
 *   node scripts/heydon-page.mjs index          # dump per-page OCR text to references/ocr/heydon/
 *   node scripts/heydon-page.mjs image <page>   # render page N to /tmp/heydon-<page>.png (300dpi)
 *
 * The OCR layer is rough (long-s confusion etc.) — use it only to LOCATE
 * passages; transcribe from the rendered page image.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PDF = 'references/John Heydon - Theomagia, or the temple of wisdome (1663) - libgen.li.pdf';
const PAGES = 992;
const OUT = 'references/ocr/heydon';

const [cmd, arg] = process.argv.slice(2);

if (cmd === 'index') {
  mkdirSync(OUT, { recursive: true });
  for (let p = 1; p <= PAGES; p++) {
    const txt = execFileSync('pdftotext', ['-f', String(p), '-l', String(p), PDF, '-'], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    writeFileSync(`${OUT}/page-${String(p).padStart(4, '0')}.txt`, txt);
    if (p % 100 === 0) console.log(`${p}/${PAGES}`);
  }
  console.log('done');
} else if (cmd === 'image') {
  const p = Number(arg);
  if (!p) throw new Error('usage: heydon-page.mjs image <page>');
  execFileSync('pdftoppm', ['-f', String(p), '-l', String(p), '-r', '300', '-png', PDF, `/tmp/heydon-${p}`]);
  console.log(`/tmp/heydon-${p}-${String(p).padStart(3, '0')}.png`);
} else {
  console.log('usage: node scripts/heydon-page.mjs index | image <page>');
}
