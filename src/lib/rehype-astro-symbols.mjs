const TEXT_VARIATION = '\uFE0E';

const SYMBOLS = new Map([
  ['\u2648', 'Aries'],
  ['\u2649', 'Taurus'],
  ['\u264A', 'Gemini'],
  ['\u264B', 'Cancer'],
  ['\u264C', 'Leo'],
  ['\u264D', 'Virgo'],
  ['\u264E', 'Libra'],
  ['\u264F', 'Scorpio'],
  ['\u2650', 'Sagittarius'],
  ['\u2651', 'Capricorn'],
  ['\u2652', 'Aquarius'],
  ['\u2653', 'Pisces'],
  ['\u2609', 'Sun'],
  ['\u263D', 'Moon'],
  ['\u263F', 'Mercury'],
  ['\u2640', 'Venus'],
  ['\u2642', 'Mars'],
  ['\u2643', 'Jupiter'],
  ['\u2644', 'Saturn'],
  ['\u260A', "Dragon's Head"],
  ['\u260B', "Dragon's Tail"],
  ['\u2127', "Dragon's Tail"],
]);

const SYMBOL_RE = new RegExp(`([${[...SYMBOLS.keys()].join('')}])[\\uFE0E\\uFE0F]?`, 'gu');
const SKIP_ELEMENTS = new Set(['code', 'kbd', 'pre', 'samp', 'script', 'style', 'textarea', 'title']);

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
}

function wrapSymbol(symbol) {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      className: ['astro-symbol'],
      role: 'img',
      'aria-label': SYMBOLS.get(symbol),
      title: SYMBOLS.get(symbol),
    },
    children: [{ type: 'text', value: symbol + TEXT_VARIATION }],
  };
}

function symbolHtml(symbol) {
  const label = SYMBOLS.get(symbol);
  return `<span class="astro-symbol" role="img" aria-label="${label}" title="${label}">${symbol}${TEXT_VARIATION}</span>`;
}

function transformHtml(value) {
  let output = '';
  let text = '';
  let inTag = false;

  const flushText = () => {
    if (!text) return;
    output += text.replace(SYMBOL_RE, (_, symbol) => symbolHtml(symbol));
    text = '';
  };

  for (const char of value) {
    if (char === '<') {
      flushText();
      inTag = true;
      output += char;
    } else if (char === '>') {
      inTag = false;
      output += char;
    } else if (inTag) {
      output += char;
    } else {
      text += char;
    }
  }

  flushText();
  return output;
}

function transformText(value) {
  const nodes = [];
  let last = 0;
  for (const match of value.matchAll(SYMBOL_RE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push({ type: 'text', value: value.slice(last, index) });
    nodes.push(wrapSymbol(match[1]));
    last = index + match[0].length;
  }
  if (last === 0) return null;
  if (last < value.length) nodes.push({ type: 'text', value: value.slice(last) });
  return nodes;
}

export function astroSymbolsText(value) {
  return value.replace(SYMBOL_RE, (_, symbol) => symbol + TEXT_VARIATION);
}

export function astroSymbolsHtml(value) {
  let output = '';
  let last = 0;
  for (const match of value.matchAll(SYMBOL_RE)) {
    const index = match.index ?? 0;
    output += escapeHtml(value.slice(last, index));
    output += symbolHtml(match[1]);
    last = index + match[0].length;
  }
  if (last === 0) return escapeHtml(value);
  return output + escapeHtml(value.slice(last));
}

/** Render astrological and planetary symbols as text glyphs, not emoji. */
export function rehypeAstroSymbols() {
  /** @param {any} node */
  const walk = (node) => {
    if (!node.children || SKIP_ELEMENTS.has(node.tagName)) return;

    const next = [];
    for (const child of node.children) {
      if (child.type === 'text') {
        next.push(...(transformText(child.value) ?? [child]));
      } else {
        walk(child);
        next.push(child);
      }
    }
    node.children = next;
  };

  return (tree) => {
    walk(tree);
  };
}

/** Render symbols inside Markdown raw HTML blocks before they become raw HAST. */
export function remarkAstroSymbols() {
  /** @param {any} node */
  const walk = (node) => {
    if (!node) return;
    if (node.type === 'html' && typeof node.value === 'string') {
      node.value = transformHtml(node.value);
      return;
    }
    if (!node.children) return;
    for (const child of node.children) walk(child);
  };

  return (tree) => {
    walk(tree);
  };
}
