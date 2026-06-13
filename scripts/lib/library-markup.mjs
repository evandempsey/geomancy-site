import { readdirSync, readFileSync } from 'node:fs';

const FIGURE_ALIASES = [
  [/fortune?a?\s*maior|fortuna\s*maior|fortune\s*major|fortuna\s*major/i, 'fortuna-major'],
  [/fortune?a?\s*minor|fortuna\s*minor/i, 'fortuna-minor'],
  [/populus/i, 'populus'],
  [/\bvia\b/i, 'via'],
  [/a[cdqn]?quisitio|aquesitio|anquisitio/i, 'acquisitio'],
  [/amissio/i, 'amissio'],
  [/l[aæe]+ti[tc]ia|letitia/i, 'laetitia'],
  [/tristitia/i, 'tristitia'],
  [/puer/i, 'puer'],
  [/puella/i, 'puella'],
  [/albus/i, 'albus'],
  [/rubeus/i, 'rubeus'],
  [/co[nm]?[ij]unctio|conjunctio/i, 'conjunctio'],
  [/carcer/i, 'carcer'],
  [/caput|dragon'?s?\s+head/i, 'caput-draconis'],
  [/cauda|dragon'?s?\s+tail/i, 'cauda-draconis'],
];

let figureCache;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function loadFigures() {
  if (figureCache) return figureCache;
  const bySlug = new Map();
  const byDots = new Map();
  for (const file of readdirSync('src/data/figures')) {
    if (!file.endsWith('.yaml')) continue;
    const text = readFileSync(`src/data/figures/${file}`, 'utf8');
    const slug = file.replace(/\.yaml$/, '');
    const name = text.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? slug;
    const dots = text
      .match(/^dots:\s*\[([^\]]+)\]/m)?.[1]
      ?.split(',')
      .map((n) => Number(n.trim()));
    if (!dots?.length) continue;
    bySlug.set(slug, { slug, name, dots });
    byDots.set(dots.join(','), { slug, name, dots });
  }
  figureCache = { bySlug, byDots };
  return figureCache;
}

function figureForName(name) {
  if (!name) return undefined;
  const { bySlug } = loadFigures();
  for (const [re, slug] of FIGURE_ALIASES) {
    if (re.test(name)) return bySlug.get(slug);
  }
  return undefined;
}

function figureForDots(dots) {
  return loadFigures().byDots.get(dots.join(','));
}

function normalizeRangeDashes(value) {
  return String(value).replace(/(\d+)\s*[-–]\s*(\d+)/g, '$1–$2');
}

export function normalizeLocatorLabel(label) {
  let cleaned = String(label)
    .replace(/\s+/g, ' ')
    .replace(/^PDF\s+([^,]+),\s*p\.\s*/i, 'PDF $1 / p. ')
    .replace(/\bPDF\s+pages?\b/gi, 'PDF pp.')
    .replace(/\bPDF\s+(?=\d)/gi, 'PDF p. ')
    .replace(/\bPDF\s+pp\.?\s*/gi, 'PDF pp. ')
    .replace(/\bPDF\s+p(?!p)\.?\s*/gi, 'PDF p. ')
    .replace(/\bms\s+p\.?\s*([0-9]+[rv])\b/gi, 'ms fol. $1')
    .replace(/\bms\s+fol\.?\s*/gi, 'ms fol. ')
    .replace(/\bleaf\s+([0-9A-Za-z]+)\s*\(\s*pages?\s+([^)]+?)\s*\)/gi, 'leaf $1 / p. $2')
    .replace(/\bpages?\s+(\d)/gi, 'p. $1')
    .replace(/\bp\.?\s+(\d)/gi, 'p. $1')
    .replace(/\s+\/\s+/g, ' / ')
    .trim();
  cleaned = normalizeRangeDashes(cleaned);
  return cleaned;
}

function parseDots(raw) {
  return String(raw)
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => n === 1 || n === 2);
}

function dotsLabel(dots) {
  return dots.map((n) => (n === 1 ? 'one point' : 'two points')).join(', ');
}

export function figureGlyphHtml(dots, suppliedName = '') {
  const parsed = Array.isArray(dots) ? dots : parseDots(dots);
  const figure = figureForName(suppliedName) ?? figureForDots(parsed);
  const name = suppliedName?.replace(/;.*$/, '').trim() || figure?.name || 'Geomantic figure';
  const slug = figure?.slug ? ` data-figure="${escapeHtml(figure.slug)}"` : '';
  const rows = parsed
    .map((count) => {
      const points = Array.from({ length: count }, () => '<i></i>').join('');
      return `<span class="library-glyph__line" data-points="${count}">${points}</span>`;
    })
    .join('');
  return `<span class="library-glyph" role="img" aria-label="${escapeHtml(`${name}: ${dotsLabel(parsed)}`)}"${slug}><span class="library-glyph__dots" aria-hidden="true">${rows}</span><span class="library-glyph__name">${escapeHtml(name)}</span></span>`;
}

export function sourceLocatorHtml(label, block = false) {
  const cleaned = normalizeLocatorLabel(label);
  const tag = block ? 'div' : 'span';
  const classes = block ? 'source-locator source-locator--block' : 'source-locator';
  return `<${tag} class="${classes}">${escapeHtml(cleaned)}</${tag}>`;
}

function sourceNoteHtml(kind, body) {
  const cleaned = body
    .replace(/;\s*`headline-band:\s*w1`\s*throughout\.?/gi, '.')
    .replace(/,\s*so\s*`headline-band:\s*w1`\s*throughout\.?/gi, '.')
    .replace(/\s*The headline figure is always the left \(w1\) figure;\s*/i, ' The headline figure is always the left witness; ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return `<aside class="library-note library-note--${kind}"><span class="library-note__label">${kind === 'diagram' ? 'Source diagram' : 'Editorial note'}</span>${formatInlineMarkers(cleaned)}</aside>`;
}

function sourceLocatorWithContextHtml(marker, block = false) {
  const [locator, ...contextParts] = String(marker).split(/\s+—\s+/);
  const context = contextParts.join(' — ').replace(/:\s*$/, '').trim();
  const html = [sourceLocatorHtml(locator, block)];
  if (context) html.push(sourceNoteHtml('editorial', context));
  return html.join('\n\n');
}

function sourceBraceNoteHtml(raw) {
  const leaf = String(raw).match(/^(leaf\s+[0-9A-Za-z]+\s*\(\s*pages?\s+[^)]+\))\s*(.*)$/i);
  if (leaf) {
    const context = leaf[2].replace(/:\s*$/, '').trim();
    const html = [sourceLocatorHtml(leaf[1], true)];
    if (context) html.push(sourceNoteHtml('editorial', context));
    return html.join('\n\n');
  }
  return sourceNoteHtml('editorial', raw);
}

function marginHtml(raw) {
  const figureName = raw.match(/dot-figure of\s+(.+)$/i)?.[1]?.trim();
  const figure = figureName ? figureForName(figureName) : undefined;
  const label = raw
    .replace(/dot-figure of\s+.+$/i, '')
    .replace(/,\s*$/, '')
    .trim();
  const parts = [];
  if (label) parts.push(escapeHtml(label));
  if (figure) parts.push(figureGlyphHtml(figure.dots, figure.name));
  else if (figureName) parts.push(`dot figure of ${escapeHtml(figureName)}`);
  return `<span class="source-margin"><span class="source-margin__label">margin</span>${parts.join('<span class="source-margin__sep">; </span>')}</span>`;
}

function figureMarkerHtml(marker) {
  const match = marker.match(/^([^—;\]]+?)(?:\s*[—;]\s*(.+))?$/);
  if (!match) return escapeHtml(`[figure: ${marker}]`);
  const supplied = match[2]?.trim() ?? '';
  const [name, ...noteParts] = supplied.split(/\s*;\s*/);
  const note = noteParts.join('; ');
  const glyph = figureGlyphHtml(parseDots(match[1]), name);
  return note ? `${glyph}<span class="library-inline-note">${escapeHtml(note)}</span>` : glyph;
}

function canonicalFigureHeading(rawName) {
  const editorial = rawName.match(/^\[Figure unnamed in text;\s*marginal woodcut\s*=\s*([^\]]+)\]$/i);
  const name = editorial?.[1]?.trim() ?? rawName.trim();
  const figure = figureForName(name);
  const displayName = figure?.name ?? name
    .replace(/\bmaior\b/gi, 'Major')
    .replace(/\bminor\b/gi, 'Minor')
    .replace(/\bdraconis\b/gi, 'Draconis')
    .replace(/\bconiunctio\b/gi, 'Conjunctio')
    .replace(/\baquisitio\b/gi, 'Acquisitio')
    .replace(/\bleticia\b/gi, 'Laetitia')
    .replace(/\blætitia\b/gi, 'Laetitia');
  return {
    name: displayName,
    note: editorial ? `Figure unnamed in text; marginal woodcut = ${displayName}.` : '',
  };
}

function normalizeHeadingLine(line) {
  const house = line.match(/^(#{2,3})\s+(.+?)\s+—\s+house\s+(\d+)\s*$/i);
  if (house) {
    const figure = canonicalFigureHeading(house[2]);
    const heading = `${house[1]} ${figure.name} — House ${house[3]}`;
    return figure.note ? `${heading}\n\n${sourceNoteHtml('editorial', figure.note)}` : heading;
  }

  const through = line.match(/^(#{2,3})\s+(.+?)\s+—\s+through the twelve houses\s*$/i);
  if (through) {
    const figure = canonicalFigureHeading(through[2]);
    return `${through[1]} ${figure.name} — Through the Twelve Houses`;
  }

  const pdfHeading = line.match(/^##\s+(PDF\s+p\.?\s*\d+\s*\/\s*ms\s+p\.?\s*\d+[rv])\s*$/i);
  if (pdfHeading) return sourceLocatorHtml(pdfHeading[1], true);

  return null;
}

export function formatInlineMarkers(value) {
  let output = String(value);
  output = output.replace(/^\[(PDF\s+[^\]]+)\]$/gm, (_, marker) => sourceLocatorWithContextHtml(marker, true));
  output = output.replace(/^\[(p\.\s*\d+(?:[-–]\d+)?)\]$/gim, (_, marker) => sourceLocatorHtml(marker, true));
  output = output.replace(/^\[(leaf\s+[^\]]+)\]$/gim, (_, marker) => sourceLocatorHtml(marker, true));
  output = output.replace(/^\{(Leaf\s+[^}]+)\}$/gim, (_, note) => sourceBraceNoteHtml(note));
  output = output.replace(/^>\s*Note:\s*(.+)$/gim, (_, note) => sourceNoteHtml('editorial', note));
  output = output.replace(/^-\s*Note:\s*(.+)$/gim, (_, note) => sourceNoteHtml('editorial', note));
  output = output.replace(
    /<(span|div) class="source-locator(?:\s+source-locator--block)?">([^<]+)<\/\1>/g,
    (_, tag, marker) => sourceLocatorHtml(marker, tag === 'div'),
  );
  output = output.replace(/([A-Za-z])\s*\[(PDF\s+[^\]]+)\]\s*([A-Za-z]+)/g, (_, left, marker, right) => {
    return `${left}${right} ${sourceLocatorHtml(marker)}`;
  });
  output = output.replace(/\{(Leaf\s+[^}]+)\}/gi, (_, note) => sourceBraceNoteHtml(note));
  output = output.replace(/\{margin:\s*([^}]+)\}/g, (_, note) => marginHtml(note));
  output = output.replace(/\[figure:\s*([^\]]+)\]/g, (_, marker) => figureMarkerHtml(marker));
  output = output.replace(/\[(PDF\s+[^\]]+)\]/g, (_, marker) => sourceLocatorHtml(marker));
  output = output.replace(/\[(p\.\s*\d+(?:[-–]\d+)?)\]/gi, (_, marker) => sourceLocatorHtml(marker));
  output = output.replace(/\[(leaf\s+[^\]]+)\]/gi, (_, marker) => sourceLocatorHtml(marker));
  return output;
}

function dotsBandHtml(line) {
  const match = line.match(/^- dots:\s*w1=([\d,]+)\s+w2=([\d,]+)\s+judge=([\d,]+)/);
  if (!match) return null;
  const cells = [
    ['First Witness', match[1]],
    ['Second Witness', match[2]],
    ['Judge', match[3]],
  ];
  return `<div class="witness-band">${cells
    .map(([label, dots]) => `<span><span class="witness-band__label">${label}</span>${figureGlyphHtml(parseDots(dots))}</span>`)
    .join('')}</div>`;
}

function sourceRowHtml(line) {
  const cells = line.split(/\s+\|\s+/).map((cell) => cell.trim());
  if (cells.length < 2) return null;
  return `<div class="source-row source-row--${cells.length}">${cells
    .map((cell) => `<div class="source-row__cell">${formatInlineMarkers(cell)}</div>`)
    .join('')}</div>`;
}

function standaloneBracketNote(line) {
  const trimmed = line.trim();
  const page = trimmed.match(/^\[(p\.\s*\d+(?:[-–]\d+)?)\]$/i);
  if (page) return sourceLocatorHtml(page[1], true);

  const leaf = trimmed.match(/^\[(leaf\s+[^\]]+)\]$/i);
  if (leaf) return sourceLocatorHtml(leaf[1], true);

  const pdf = trimmed.match(/^\[(PDF\s+[^\]]+)\]$/);
  if (pdf) return sourceLocatorWithContextHtml(pdf[1], true);

  const diagram = trimmed.match(/^\[(chart|table|the chapter|two ruled|four ruled|a final|book title block|ornamental|here the table)([\s\S]*)\]$/i);
  if (diagram) return sourceNoteHtml(/chart|diagram|book title/i.test(diagram[1] + diagram[2]) ? 'diagram' : 'editorial', `${diagram[1]}${diagram[2]}`);

  return null;
}

export function normalizeLibraryBody(body) {
  const stripped = body
    .replace(/\r\n/g, '\n')
    .replace(/^- (?:leaves?|pages?|dot-pattern|pdf-pages?|printed-pages?|chapter):.*$/gm, '')
    .replace(/^- \(printed .*$/gm, '')
    .trim();

  const lines = stripped.split('\n').map((line) => {
    if (/^- headline-band:/i.test(line)) return '';
    const heading = normalizeHeadingLine(line);
    if (heading) return heading;
    const dotsBand = dotsBandHtml(line);
    if (dotsBand) return dotsBand;
    const blockNote = line.match(/^>\s*note:\s*(.+)$/i);
    if (blockNote) return sourceNoteHtml('editorial', blockNote[1]);
    const listNote = line.match(/^-\s*Note:\s*(.+)$/i);
    if (listNote) return sourceNoteHtml('editorial', listNote[1]);
    const transcriptionNote = line.match(/^Transcription notes:\s*(.+)$/i);
    if (transcriptionNote) return sourceNoteHtml('editorial', transcriptionNote[1]);
    const bracketNote = standaloneBracketNote(line);
    if (bracketNote) return bracketNote;
    const braceNote = line.trim().match(/^\{([^}]+)\}$/);
    if (braceNote) return sourceBraceNoteHtml(braceNote[1]);
    const row = !line.trim().startsWith('|') && line.includes(' | ') ? sourceRowHtml(line) : null;
    if (row) return row;
    return formatInlineMarkers(line);
  });

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

export function plainSnippet(value) {
  return String(value)
    .replace(/^>\s*Note:.*$/gim, '')
    .replace(/^-\s*Note:.*$/gim, '')
    .replace(/<aside class="library-note[\s\S]*?<\/aside>/g, '')
    .replace(/\{margin:[^}]*\}/g, '')
    .replace(/\[figure:[^\]]*\]/g, '')
    .replace(/\[(?:PDF|p\.)[^\]]*\]/gi, '')
    .replace(/\[leaf[^\]]*\]/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\[\]*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
