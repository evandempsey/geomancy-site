import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeLocatorLabel } from './lib/library-markup.mjs';

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (path.endsWith('.md')) yield path;
  }
}

function canonicalFigureHeading(raw) {
  const editorial = raw.match(/^\[Figure unnamed in text;\s*marginal woodcut\s*=\s*([^\]]+)\]$/i);
  let name = (editorial?.[1] ?? raw).trim();
  const rules = [
    [/^aquisitio$|^acquisitio$/i, 'Acquisitio'],
    [/^amissio$/i, 'Amissio'],
    [/^fortuna\s+ma[ij]or$/i, 'Fortuna Major'],
    [/^fortuna\s+minor$/i, 'Fortuna Minor'],
    [/^l(?:ae|æ|e)ticia$/i, 'Laetitia'],
    [/^tristitia$/i, 'Tristitia'],
    [/^puella$/i, 'Puella'],
    [/^puer$/i, 'Puer'],
    [/^rubeus$/i, 'Rubeus'],
    [/^albus$/i, 'Albus'],
    [/^coniunctio$|^conjunctio$/i, 'Conjunctio'],
    [/^caput\s+draconis$/i, 'Caput Draconis'],
    [/^cauda\s+draconis$/i, 'Cauda Draconis'],
    [/^carcer$/i, 'Carcer'],
    [/^populus$/i, 'Populus'],
    [/^via$/i, 'Via'],
  ];
  for (const [pattern, label] of rules) {
    if (pattern.test(name)) {
      name = label;
      break;
    }
  }
  return {
    name,
    note: editorial ? `Figure unnamed in text; marginal woodcut = ${name}.` : '',
  };
}

function normalizePdfMarker(marker) {
  const [locator, ...contextParts] = marker.split(/\s+—\s+/);
  const context = contextParts.join(' — ').replace(/:\s*$/, '').trim();
  return `[${normalizeLocatorLabel(locator)}${context ? ` — ${context}` : ''}]`;
}

function normalizeText(text) {
  return text
    .replace(
      /^\{(Leaf\s+[0-9A-Za-z]+\s*\(\s*pages?\s+[^)]+\))\s*([^}]*)\}$/gim,
      (_, locator, context) => {
        const note = context.replace(/:\s*$/, '').trim();
        return `[${normalizeLocatorLabel(locator)}]${note ? `\n\n> Note: ${note}` : ''}`;
      },
    )
    .replace(/\[(PDF\s+[^\]]+)\]/g, (_, marker) => normalizePdfMarker(marker))
    .replace(/^##\s+(.+?)\s+—\s+house\s+(\d+)\s*$/gim, (_, raw, house) => {
      const figure = canonicalFigureHeading(raw);
      return `## ${figure.name} — House ${house}${figure.note ? `\n\n> Note: ${figure.note}` : ''}`;
    })
    .replace(/^##\s+(.+?)\s+—\s+through the twelve houses\s*$/gim, (_, raw) => {
      const figure = canonicalFigureHeading(raw);
      return `## ${figure.name} — Through the Twelve Houses`;
    });
}

let changed = 0;
for (const file of files('references/extracted')) {
  const original = readFileSync(file, 'utf8');
  const normalized = normalizeText(original);
  if (normalized === original) continue;
  writeFileSync(file, normalized);
  changed++;
}

console.log(`Normalized ${changed} extracted reference file(s).`);
