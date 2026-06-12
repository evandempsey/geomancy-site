/**
 * Search for the course's fixed example charts (A, B, C, D, and the
 * Lesson 13 practicum charts J, K, L) by testing deterministic candidate
 * Mothers against the curriculum's criteria, using the real casting math
 * and the real figure data.
 *
 * Chart A — perfects by conjunction on a 1st/7th question, and contains
 *           an occupation elsewhere; reasonably fortunate Judge.
 * Chart B — denies perfection on 1st/7th (no occupation, no conjunction,
 *           significators don't spring beside each other).
 * Chart C — conflicting testimony: fortunate Judge, but an ill figure
 *           in the 7th house and no perfection.
 * Chart D — perfects by OCCUPATION on a 1st/10th preferment question
 *           (the one mode A–C never exemplify): a good figure in both
 *           houses, good Judge, no conjunction, an ill figure in another
 *           angle for texture, and a way of point that completes (fresh —
 *           A has no way, B's ends ill, C's dies short).
 * Chart J — practicum, 11th-house hope question: grants by conjunction in
 *           the unworked direction — the QUERENT'S approach (querent's
 *           figure in house 10 or 12, quesited's NOT beside the 1st);
 *           good 11th figure, good Judge, Step 0 clear, no occupation,
 *           witness-judge corpus row on file.
 * Chart K — practicum, 12th-house prison question, the hard chart: a
 *           grant the student will be tempted to refuse — perfection
 *           1↔12 present but of an ILL figure, under an ILL Judge, with
 *           at least one GOOD Witness (the trajectory itself divided);
 *           Step 0 clear, witness-judge row on file.
 * Chart L — practicum, 7th-house marriage question (Judgment III's
 *           shield half): a clean grant — perfection present, neither
 *           significator ill, good Judge, Step 0 clear, Mothers distinct
 *           from Chart A's, witness-judge row on file.
 *
 * The LCG seed is FROZEN: changing it would move every chart. A–D's
 * Mothers are asserted below against their published values.
 *
 * Run: node scripts/find-course-charts.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { deriveChart } from '../src/lib/casting.ts';

// Figure names from the YAML source of truth.
const FIGS = {};
for (const file of readdirSync('src/data/figures')) {
  const text = readFileSync(`src/data/figures/${file}`, 'utf8');
  const name = text.match(/^name:\s*(.+)$/m)[1].trim();
  const dots = text.match(/^dots:\s*\[([^\]]+)\]/m)[1].split(',').map(Number);
  FIGS[dots.join('')] = name;
}
const nameOf = (dots) => FIGS[dots.join('')];

const GOOD = new Set(['Fortuna Major', 'Acquisitio', 'Laetitia', 'Puella', 'Albus', 'Caput Draconis']);
const ILL = new Set(['Amissio', 'Carcer', 'Tristitia', 'Rubeus', 'Cauda Draconis', 'Puer']);

const idOf = (name) => name.toLowerCase().replace(/\s+/g, '-');
/** Cattan III.5 witness-judge table row on file, in either order. */
const wjRowExists = (rw, lw) =>
  existsSync(`corpus/cattan/book-3/witness-judge/${idOf(rw)}--${idOf(lw)}.md`) ||
  existsSync(`corpus/cattan/book-3/witness-judge/${idOf(lw)}--${idOf(rw)}.md`);

const wrap = (h) => ((h - 1 + 12) % 12) + 1;

// Deterministic LCG so the search is reproducible.
let seed = 7;
const rand = () => {
  seed = (seed * 48271) % 2147483647;
  return seed / 2147483647;
};
const randomMother = () => [0, 0, 0, 0].map(() => (rand() < 0.5 ? 1 : 2));

function analyze(mothers) {
  const chart = deriveChart(mothers);
  const houses = [...chart.mothers, ...chart.daughters, ...chart.nieces]; // houses 1..12
  const names = houses.map(nameOf);
  const judge = nameOf(chart.judge);
  const q = names[0]; // 1st house — querent
  const s = names[6]; // 7th house — quesited
  const at = (n) => names[n - 1];

  const occupation17 = q === s;
  // conjunction: quesited's figure moves to a house beside the querent's, or vice versa
  const conj = at(2) === s || at(12) === s || at(6) === q || at(8) === q;
  const occupationsElsewhere = [];
  for (let a = 1; a <= 12; a++)
    for (let b = a + 1; b <= 12; b++)
      if (at(a) === at(b)) occupationsElsewhere.push(`${at(a)} in ${a} & ${b}`);

  // way of the point (Cattan III.20): does it complete in an upper house?
  const houseDots = [...chart.mothers, ...chart.daughters, ...chart.nieces];
  const top = (d) => d[0];
  const jTop = top(chart.judge);
  const wayHouses = [];
  const branches = [];
  if (top(chart.witnesses[0]) === jTop) branches.push({ first: [9, 10], nested: { 9: [1, 2], 10: [3, 4] } });
  if (top(chart.witnesses[1]) === jTop) branches.push({ first: [11, 12], nested: { 11: [5, 6], 12: [7, 8] } });
  for (const br of branches)
    for (const h of br.first)
      if (top(houseDots[h - 1]) === jTop)
        for (const hh of br.nested[h])
          if (top(houseDots[hh - 1]) === jTop) wayHouses.push(hh);

  return {
    chart,
    names,
    judge,
    rw: nameOf(chart.witnesses[0]),
    lw: nameOf(chart.witnesses[1]),
    q,
    s,
    occupation17,
    conj,
    repeats: occupationsElsewhere,
    wayHouses,
  };
}

/** Conjunction hits between house 1 and house q, by side (dossier logic). */
function conjSides(names, q) {
  const at = (n) => names[n - 1];
  const querentSide = [wrap(q - 1), wrap(q + 1)].some((h) => h !== 1 && at(h) === at(1));
  const quesitedSide = [2, 12].some((h) => h !== q && at(h) === at(q));
  return { querentSide, quesitedSide };
}

const step0Clear = (names) => !['Rubeus', 'Cauda Draconis'].includes(names[0]);

let A, B, C, D, J, K, L;
for (let i = 0; i < 500000 && !(A && B && C && D && J && K && L); i++) {
  const mothers = [randomMother(), randomMother(), randomMother(), randomMother()];
  const r = analyze(mothers);

  if (!A && !r.occupation17 && r.conj && GOOD.has(r.judge) && r.repeats.length >= 1) {
    A = { mothers, ...r };
  } else if (
    !B &&
    !r.occupation17 &&
    !r.conj &&
    r.q !== r.s &&
    !GOOD.has(r.judge) &&
    !ILL.has(r.judge) &&
    r.names.slice(1, 6).every((n) => n !== r.q) && // querent's figure springs nowhere near 7th
    r.names.slice(7, 12).every((n) => n !== r.s)
  ) {
    B = { mothers, ...r };
  } else if (!C && !r.occupation17 && !r.conj && GOOD.has(r.judge) && ILL.has(r.s)) {
    C = { mothers, ...r };
  } else if (
    !D &&
    r.names[0] === r.names[9] && // occupation 1 ↔ 10
    GOOD.has(r.names[0]) && // of a good figure (also keeps Step 0 clear)
    GOOD.has(r.judge) &&
    // no conjunction 1 ↔ 10: 10th's figure beside the 1st, or 1st's beside the 10th
    !(r.names[1] === r.names[9] || r.names[11] === r.names[9] || r.names[8] === r.names[0] || r.names[10] === r.names[0]) &&
    (ILL.has(r.names[3]) || ILL.has(r.names[6])) && // an ill figure in another angle
    r.wayHouses.length >= 1 // the way of point completes
  ) {
    D = { mothers, ...r };
  } else if (
    !J &&
    step0Clear(r.names) &&
    !ILL.has(r.names[0]) && // the querent himself not ill — Judgment I is the warm-up
    new Set(mothers.map(nameOf)).size === 4 && // four distinct Mothers
    r.repeats.length <= 4 && // a legible chart, not a wall of repetition
    r.names[0] !== r.names[10] && // no occupation 1 ↔ 11
    conjSides(r.names, 11).querentSide && // the querent's approach…
    !conjSides(r.names, 11).quesitedSide && // …and ONLY the querent's
    GOOD.has(r.names[10]) && // the hope's figure good
    GOOD.has(r.judge) &&
    wjRowExists(r.rw, r.lw)
  ) {
    J = { mothers, ...r };
  } else if (
    !K &&
    step0Clear(r.names) &&
    // perfection 1 ↔ 12 present, but of an ILL figure
    ((r.names[0] === r.names[11] && ILL.has(r.names[0])) ||
      ((conjSides(r.names, 12).querentSide || conjSides(r.names, 12).quesitedSide) &&
        ILL.has(r.names[11]))) &&
    ILL.has(r.judge) &&
    (GOOD.has(r.rw) || GOOD.has(r.lw)) && // a good Witness divides the trajectory
    wjRowExists(r.rw, r.lw)
  ) {
    K = { mothers, ...r };
  } else if (
    !L &&
    step0Clear(r.names) &&
    (r.occupation17 || r.conj) && // perfects 1 ↔ 7
    !ILL.has(r.q) &&
    !ILL.has(r.s) &&
    GOOD.has(r.judge) &&
    wjRowExists(r.rw, r.lw) &&
    JSON.stringify(mothers.map(nameOf)) !==
      JSON.stringify(['Conjunctio', 'Via', 'Amissio', 'Caput Draconis']) // not Chart A
  ) {
    L = { mothers, ...r };
  }
}

// The published charts are frozen: if the stream ever shifts, fail loudly.
const FROZEN = {
  A: ['Conjunctio', 'Via', 'Amissio', 'Caput Draconis'],
  B: ['Puella', 'Rubeus', 'Rubeus', 'Amissio'],
  C: ['Amissio', 'Amissio', 'Puella', 'Fortuna Minor'],
  D: ['Acquisitio', 'Fortuna Major', 'Via', 'Amissio'],
};
for (const [label, expected] of Object.entries(FROZEN)) {
  const got = ({ A, B, C, D })[label]?.mothers.map(nameOf) ?? [];
  if (JSON.stringify(got) !== JSON.stringify(expected)) {
    console.error(`✗ FROZEN CHART ${label} MOVED: expected [${expected.join(', ')}], got [${got.join(', ')}]`);
    process.exitCode = 1;
  }
}

for (const [label, c] of [['A', A], ['B', B], ['C', C], ['D', D], ['J', J], ['K', K], ['L', L]]) {
  if (!c) {
    console.log(`Chart ${label}: NOT FOUND`);
    continue;
  }
  console.log(`\nChart ${label}`);
  console.log(`  Mothers: ${c.mothers.map((m) => `[${m}] ${nameOf(m)}`).join(' · ')}`);
  console.log(`  Houses 1–12: ${c.names.map((n, i) => `${i + 1}:${n}`).join(', ')}`);
  console.log(`  Witnesses: R ${nameOf(c.chart.witnesses[0])}, L ${nameOf(c.chart.witnesses[1])} · Judge: ${c.judge}`);
  console.log(`  1st: ${c.q} · 7th: ${c.s} · conj(1↔7): ${c.conj} · occ(1↔7): ${c.occupation17}`);
  console.log(`  10th: ${c.names[9]} · occ(1↔10): ${c.names[0] === c.names[9]}`);
  console.log(`  11th: ${c.names[10]} · conj(1↔11): ${JSON.stringify(conjSides(c.names, 11))}`);
  console.log(`  12th: ${c.names[11]} · occ(1↔12): ${c.names[0] === c.names[11]} · conj(1↔12): ${JSON.stringify(conjSides(c.names, 12))}`);
  console.log(`  WJ row on file: ${wjRowExists(c.rw, c.lw)}`);
  console.log(`  Way of point completes in: ${c.wayHouses.join(', ') || '— (no way)'}`);
  console.log(`  Repeated figures: ${c.repeats.join(' | ') || 'none'}`);
}
