import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeLocatorLabel, sourceLocatorHtml } from './lib/library-markup.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.resolve(
  repoRoot,
  '../abano-judging-questions/petrus_de_abano_modus_iudicandi_english.md',
);
const outDir = path.join(repoRoot, 'src/content/library/abano');
const outPath = path.join(outDir, 'method-of-judging-questions.mdx');

const figures = {
  'glyph-acquisitio.svg': ['Acquisitio', [2, 1, 2, 1]],
  'glyph-albus.svg': ['Albus', [2, 2, 1, 2]],
  'glyph-amissio.svg': ['Amissio', [1, 2, 1, 2]],
  'glyph-caput-draconis.svg': ['Caput Draconis', [2, 1, 1, 1]],
  'glyph-carcer.svg': ['Carcer', [1, 2, 2, 1]],
  'glyph-cauda-draconis.svg': ['Cauda Draconis', [1, 1, 1, 2]],
  'glyph-coniunctio.svg': ['Conjunctio', [2, 1, 1, 2]],
  'glyph-fortuna-maior.svg': ['Fortuna Major', [2, 2, 1, 1]],
  'glyph-fortuna-minor.svg': ['Fortuna Minor', [1, 1, 2, 2]],
  'glyph-letitia.svg': ['Laetitia', [1, 2, 2, 2]],
  'glyph-populus.svg': ['Populus', [2, 2, 2, 2]],
  'glyph-puella.svg': ['Puella', [1, 2, 1, 1]],
  'glyph-puer.svg': ['Puer', [1, 1, 2, 1]],
  'glyph-rubeus.svg': ['Rubeus', [2, 1, 2, 2]],
  'glyph-tristitia.svg': ['Tristitia', [2, 2, 2, 1]],
  'glyph-via.svg': ['Via', [1, 1, 1, 1]],
  'inline-o-o-o-o.svg': ['Via', [1, 1, 1, 1]],
  'inline-o-oo-o-o.svg': ['Puella', [1, 2, 1, 1]],
  'inline-oo-o-o-oo.svg': ['Conjunctio', [2, 1, 1, 2]],
  'inline-oo-o-oo-o.svg': ['Acquisitio', [2, 1, 2, 1]],
  'inline-oo-oo-o-oo.svg': ['Albus', [2, 2, 1, 2]],
  'inline-oo-oo-oo-oo.svg': ['Populus', [2, 2, 2, 2]],
};

const dotPatterns = {
  'inline-oo-oo-oo.svg': ['three-line scribal pattern', [2, 2, 2]],
  'inline-o-oo-o-oo-oo.svg': ['five-line manuscript pattern', [1, 2, 1, 2, 2]],
};

const tableComponents = new Map([
  ['![Figure bone male mediocres](figures/p480-figurae-bone-male-mediocres_english.svg)', '<AbanoFigureClassTable />'],
  ['![De XII domibus](figures/p483-p484-xii-domus_english.svg)', '<AbanoHouseQualityTable />'],
  ['![Computus of figures](figures/p484-computus-figurarum_english.svg)', '<AbanoFigureComputusTable />'],
  ['![Letters of the figures](figures/p485-litterae-figurarum_english.svg)', '<AbanoFigureLettersTable />'],
  ['![Exaltations and depressions](figures/p486-exaltationes_english.svg)', '<AbanoExaltationTable />'],
]);

const publicSourceNote =
  '> Source: Bayerische Staatsbibliothek, Clm 489, ' +
  '[MDZ/BSB digital facsimile](https://www.digitale-sammlungen.de/en/view/bsb00124288), ' +
  `downloadable ${normalizeLocatorLabel('PDF pp. 460-494')}.\n`;

function componentFor(src, width) {
  const standard = figures[src];
  const irregular = dotPatterns[src];
  if (!standard && !irregular) throw new Error(`No glyph mapping for ${src}`);

  const [name, dots] = standard ?? irregular;
  const component = standard ? 'FigureGlyph' : 'DotPatternGlyph';
  const size = Number(width) >= 44 ? 2.2 : 1.15;
  return `<${component} dots={${JSON.stringify(dots)}} name="${name}" size={${size}} />`;
}

function transform(body) {
  let out = body.replace(/\r\n/g, '\n');
  out = out.replace(/^# The Method of Judging Questions According to Peter of Abano, the Paduan\n\n/, '');
  out = out.replace(
    /^Source: `modo_iudicandi\.pdf`, PDF pages 460-494\.\n/,
    publicSourceNote,
  );

  for (const [markdown, component] of tableComponents) {
    out = out.replace(markdown, component);
  }

  out = out.replace(
    /^##\s+(PDF\s+p\.?\s*\d+\s*\/\s*ms\s+p\.?\s*\d+[rv])\s*$/gim,
    (_, marker) => `${sourceLocatorHtml(marker, true)}\n`,
  );

  out = out.replace(
    /<img src="figures\/([^"]+\.svg)" alt="([^"]*)" title="([^"]*)" width="(\d+)">/g,
    (_, src, _alt, _title, width) => componentFor(src, width),
  );

  return out.trim() + '\n';
}

const frontmatter = `---
title: "The Method of Judging Questions According to Peter of Abano"
source: abano
order: 1
locator: "PDF pp. 460–494"
description: "An automated English translation of the Latin Modus Iudicandi questiones attributed to Peter of Abano, with native site glyphs and tables."
---

`;

const imports = `import FigureGlyph from '../../../components/FigureGlyph.astro';
import DotPatternGlyph from '../../../components/DotPatternGlyph.astro';
import AbanoFigureClassTable from '../../../components/library/AbanoFigureClassTable.astro';
import AbanoHouseQualityTable from '../../../components/library/AbanoHouseQualityTable.astro';
import AbanoFigureComputusTable from '../../../components/library/AbanoFigureComputusTable.astro';
import AbanoFigureLettersTable from '../../../components/library/AbanoFigureLettersTable.astro';
import AbanoExaltationTable from '../../../components/library/AbanoExaltationTable.astro';

`;

const source = await readFile(sourcePath, 'utf8');
await mkdir(outDir, { recursive: true });
await writeFile(outPath, frontmatter + imports + transform(source));
console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
