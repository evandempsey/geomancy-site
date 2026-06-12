/**
 * Generate the authors' ground-truth dossier for the course charts
 * (A–D, and the Lesson 13 practicum charts J–L) and assert every
 * structural fact the course lessons state about them. Lessons 5–13
 * are written against this file; if an assertion here fails, prose
 * somewhere is wrong.
 *
 * Sources of the encoded rules:
 *  - aspects: Cattan Book III chs. 12–17 (sextile ±2, square ±3,
 *    trine ±4, opposition +6; dexter backward, sinister forward)
 *  - company: ch. 7 ("the second house is alwayes companion of the
 *    fyrst, the third of the fourth, the fift of the sixt…")
 *  - part of fortune: ch. 21 (points of the TWELVE house figures only,
 *    ÷12, remainder → house, 0 → 12th; the 15-figure variant Cattan
 *    rejects is reported as a footnote)
 *  - way of the point: ch. 20 (top line of Judge → like witness →
 *    9th/10th or 11th/12th → mother/daughter pairs)
 *
 * Run: npm run dossier   (exits 1 if any assertion fails)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { deriveChart, pointCount } from '../src/lib/casting.ts';

// ---- figure data from the YAML source of truth ----
const FIGURES = {};
for (const file of readdirSync('src/data/figures')) {
  const text = readFileSync(`src/data/figures/${file}`, 'utf8');
  const id = file.replace('.yaml', '');
  FIGURES[id] = {
    id,
    name: text.match(/^name:\s*(.+)$/m)[1].trim(),
    dots: text.match(/^dots:\s*\[([^\]]+)\]/m)[1].split(',').map(Number),
    element: text.match(/^element:\s*(.+)$/m)?.[1]?.trim(),
    planet: text.match(/^planet:\s*(.+)$/m)?.[1]?.trim(),
    sign: text.match(/^sign:\s*(.+)$/m)?.[1]?.trim(),
    mobility: text.match(/^mobility:\s*(.+)$/m)?.[1]?.trim(),
  };
}
const byKey = new Map(Object.values(FIGURES).map((f) => [f.dots.join(''), f]));
const figOf = (dots) => byKey.get(dots.join(''));

// ---- the course charts ----
const CHARTS = [
  {
    label: 'A',
    question: 'Will the marriage go ahead?',
    quesitedHouse: 7,
    mothers: ['conjunctio', 'via', 'amissio', 'caput-draconis'],
  },
  {
    label: 'B',
    question: 'Will the querent recover the partnership?',
    quesitedHouse: 7,
    mothers: ['puella', 'rubeus', 'rubeus', 'amissio'],
  },
  {
    label: 'C',
    question: 'Will the querent win the lawsuit?',
    quesitedHouse: 7,
    mothers: ['amissio', 'amissio', 'puella', 'fortuna-minor'],
  },
  {
    label: 'D',
    question: 'Will the querent get the office they seek?',
    quesitedHouse: 10,
    mothers: ['acquisitio', 'fortuna-major', 'via', 'amissio'],
  },
  {
    label: 'J',
    question: 'Will the querent get what they hope for?',
    quesitedHouse: 11,
    mothers: ['fortuna-major', 'via', 'amissio', 'albus'],
  },
  {
    label: 'K',
    question: 'Will the prisoner be released?',
    quesitedHouse: 12,
    mothers: ['tristitia', 'puer', 'puer', 'rubeus'],
  },
  {
    label: 'L',
    question: 'Will the intended marriage go ahead?',
    quesitedHouse: 7,
    mothers: ['acquisitio', 'albus', 'carcer', 'via'],
  },
];

// ---- rule helpers ----
const wrap = (h) => ((h - 1 + 12) % 12) + 1;

function aspectsOf(house) {
  return [
    { name: 'sextile', dexter: wrap(house - 2), sinister: wrap(house + 2) },
    { name: 'square', dexter: wrap(house - 3), sinister: wrap(house + 3) },
    { name: 'trine', dexter: wrap(house - 4), sinister: wrap(house + 4) },
    { name: 'opposition', dexter: wrap(house + 6), sinister: wrap(house + 6) },
  ];
}

const COMPANY_PAIRS = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
  [9, 10],
  [11, 12],
];

function analyze(spec) {
  const mothers = spec.mothers.map((id) => FIGURES[id].dots);
  const chart = deriveChart(mothers);
  const houses = [...chart.mothers, ...chart.daughters, ...chart.nieces].map(figOf);
  const rightWitness = figOf(chart.witnesses[0]);
  const leftWitness = figOf(chart.witnesses[1]);
  const judge = figOf(chart.judge);
  const at = (n) => houses[n - 1];

  // repetitions / springings
  const places = new Map();
  houses.forEach((f, i) => places.set(f.id, [...(places.get(f.id) ?? []), i + 1]));
  const repetitions = [...places.entries()]
    .filter(([, hs]) => hs.length > 1)
    .map(([id, hs]) => ({ figure: FIGURES[id].name, houses: hs }));

  // perfection tests for 1 ↔ quesited
  const q = spec.quesitedHouse;
  const querent = at(1);
  const quesited = at(q);
  const occupation = querent.id === quesited.id;
  const conjunctionHits = [];
  for (const h of [wrap(q - 1), wrap(q + 1)]) {
    if (h !== 1 && at(h).id === querent.id) conjunctionHits.push(`querent's ${querent.name} stands in house ${h}, beside the ${q}th`);
  }
  for (const h of [2, 12]) {
    if (h !== q && at(h).id === quesited.id) conjunctionHits.push(`quesited's ${quesited.name} stands in house ${h}, beside the 1st`);
  }
  const conjunction = conjunctionHits.length > 0;

  // company (ch. 7 pairing)
  const company = COMPANY_PAIRS.map(([a, b]) => {
    const fa = at(a);
    const fb = at(b);
    let kind = 'none';
    if (fa.id === fb.id) kind = 'simple (same figure)';
    else if (fa.planet === fb.planet) kind = `demi-simple (both of ${fa.planet})`;
    else if (fa.element && fa.element === fb.element) kind = `by element (both ${fa.element})`;
    return { pair: `${a}·${b}`, a: fa.name, b: fb.name, kind, topAgreement: fa.dots[0] === fb.dots[0] };
  });

  // aspect maps for houses 1 and quesited
  const aspectMap = [1, q].map((house) => ({
    house,
    figure: at(house).name,
    aspects: aspectsOf(house).flatMap((a) =>
      a.name === 'opposition'
        ? [{ name: a.name, side: '—', house: a.dexter, figure: at(a.dexter) }]
        : [
            { name: a.name, side: 'dexter', house: a.dexter, figure: at(a.dexter) },
            { name: a.name, side: 'sinister', house: a.sinister, figure: at(a.sinister) },
          ],
    ).map((x) => ({
      ...x,
      figureName: x.figure.name,
      agreement: [
        x.figure.planet === at(house).planet ? `same planet (${x.figure.planet})` : null,
        x.figure.element && x.figure.element === at(house).element ? `same element (${x.figure.element})` : null,
      ].filter(Boolean),
    })),
  }));

  // part of fortune (ch. 21): twelve house figures only
  const housePoints = houses.reduce((s, f) => s + pointCount(f.dots), 0);
  let pofRemainder = housePoints % 12;
  const pofHouse = pofRemainder === 0 ? 12 : pofRemainder;
  // rejected 15-figure variant, reported as footnote
  const allPoints = housePoints + pointCount(rightWitness.dots) + pointCount(leftWitness.dots) + pointCount(judge.dots);
  let rejRemainder = allPoints % 12;
  const rejHouse = rejRemainder === 0 ? 12 : rejRemainder;

  // way of the point (ch. 20)
  const top = (f) => f.dots[0];
  const wayTrace = [];
  const jTop = top(judge);
  wayTrace.push(`Judge ${judge.name} has ${jTop === 1 ? 'one point' : 'two points'} on its first line.`);
  let wayHouses = [];
  const rwLike = top(rightWitness) === jTop;
  const lwLike = top(leftWitness) === jTop;
  if (!rwLike && !lwLike) {
    wayTrace.push('Neither Witness matches the Judge above: there is NO way of point in this chart.');
  } else {
    const branches = [];
    if (rwLike) branches.push({ witness: `Right Witness ${rightWitness.name}`, first: [9, 10], nested: { 9: [1, 2], 10: [3, 4] } });
    if (lwLike) branches.push({ witness: `Left Witness ${leftWitness.name}`, first: [11, 12], nested: { 11: [5, 6], 12: [7, 8] } });
    for (const br of branches) {
      wayTrace.push(`${br.witness} matches the Judge above; look to houses ${br.first.join(' and ')}.`);
      for (const h of br.first) {
        if (top(at(h)) === jTop) {
          wayTrace.push(`House ${h} (${at(h).name}) matches; thence to houses ${br.nested[h].join(' and ')}.`);
          for (const hh of br.nested[h]) {
            if (top(at(hh)) === jTop) {
              wayTrace.push(`House ${hh} (${at(hh).name}) matches: the way of point ends in house ${hh}.`);
              wayHouses.push(hh);
            }
          }
        }
      }
    }
    if (wayHouses.length === 0) wayTrace.push('The way stops before reaching the upper houses: it does not complete.');
  }

  // ch. 6 totals
  const evenFigures = houses.filter((f) => pointCount(f.dots) % 2 === 0).length;

  return {
    ...spec,
    houses,
    rightWitness,
    leftWitness,
    judge,
    repetitions,
    occupation,
    conjunction,
    conjunctionHits,
    company,
    aspectMap,
    housePoints,
    pofHouse,
    pofFigure: at(pofHouse),
    allPoints,
    rejHouse,
    wayTrace,
    wayHouses,
    evenFigures,
    wjQuoteIds: [
      `corpus/cattan/book-3/witness-judge/${rightWitness.id}--${leftWitness.id}.md`,
      `corpus/cattan/book-3/witness-judge/${leftWitness.id}--${rightWitness.id}.md`,
    ],
  };
}

// ---- assertions ----
let failures = 0;
function assertEq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`✗ ${label}: expected ${e}, got ${a}`);
    failures += 1;
  }
}

const results = CHARTS.map(analyze);
const [A, B, C, D, J, K, L] = results;

for (const r of results) {
  assertEq(`${r.label}: Judge point-count even`, pointCount(r.judge.dots) % 2, 0);
  assertEq(
    `${r.label}: witnesses share parity`,
    pointCount(r.rightWitness.dots) % 2,
    pointCount(r.leftWitness.dots) % 2,
  );
}

assertEq('A: houses', A.houses.map((f) => f.name), [
  'Conjunctio', 'Via', 'Amissio', 'Caput Draconis', 'Conjunctio', 'Puer',
  'Via', 'Acquisitio', 'Carcer', 'Puer', 'Puella', 'Amissio',
]);
assertEq('A: witnesses', [A.rightWitness.name, A.leftWitness.name], ['Rubeus', 'Tristitia']);
assertEq('A: judge', A.judge.name, 'Acquisitio');
assertEq('A: no occupation', A.occupation, false);
assertEq('A: perfects by conjunction', A.conjunction, true);
assertEq(
  'A: repetitions',
  A.repetitions.map((r) => `${r.figure}:${r.houses.join(',')}`),
  ['Conjunctio:1,5', 'Via:2,7', 'Amissio:3,12', 'Puer:6,10'],
);
assertEq('A: part of fortune house', [A.housePoints, A.pofHouse], [64, 4]);

assertEq('B: houses', B.houses.map((f) => f.name), [
  'Puella', 'Rubeus', 'Rubeus', 'Amissio', 'Carcer', 'Conjunctio',
  'Carcer', 'Laetitia', 'Via', 'Cauda Draconis', 'Via', 'Tristitia',
]);
assertEq('B: witnesses', [B.rightWitness.name, B.leftWitness.name], ['Tristitia', 'Cauda Draconis']);
assertEq('B: judge', B.judge.name, 'Via');
assertEq('B: denial', [B.occupation, B.conjunction], [false, false]);
assertEq('B: querent figure only in house 1', B.houses.filter((f) => f.id === 'puella').length, 1);
assertEq('B: part of fortune', [B.housePoints, B.pofHouse], [70, 10]);
assertEq('B: PoF figure', B.pofFigure.name, 'Cauda Draconis');

assertEq('C: houses', C.houses.map((f) => f.name), [
  'Amissio', 'Amissio', 'Puella', 'Fortuna Minor', 'Via', 'Tristitia',
  'Cauda Draconis', 'Albus', 'Populus', 'Caput Draconis', 'Cauda Draconis', 'Fortuna Minor',
]);
assertEq('C: witnesses', [C.rightWitness.name, C.leftWitness.name], ['Caput Draconis', 'Albus']);
assertEq('C: judge', C.judge.name, 'Acquisitio');
assertEq('C: 7th house ill figure', C.houses[6].name, 'Cauda Draconis');
assertEq('C: no perfection', [C.occupation, C.conjunction], [false, false]);
assertEq('C: Amissio occupies 1 and 2', C.repetitions.find((r) => r.figure === 'Amissio')?.houses, [1, 2]);
assertEq('C: part of fortune', [C.housePoints, C.pofHouse], [70, 10]);
assertEq('C: PoF figure', C.pofFigure.name, 'Caput Draconis');

assertEq('D: houses', D.houses.map((f) => f.name), [
  'Acquisitio', 'Fortuna Major', 'Via', 'Amissio', 'Fortuna Major', 'Amissio',
  'Caput Draconis', 'Cauda Draconis', 'Conjunctio', 'Acquisitio', 'Carcer', 'Carcer',
]);
assertEq('D: witnesses', [D.rightWitness.name, D.leftWitness.name], ['Fortuna Major', 'Populus']);
assertEq('D: judge', D.judge.name, 'Fortuna Major');
assertEq('D: Step 0 clear', ['Rubeus', 'Cauda Draconis'].includes(D.houses[0].name), false);
assertEq('D: perfects by occupation, no conjunction', [D.occupation, D.conjunction], [true, false]);
assertEq(
  'D: repetitions',
  D.repetitions.map((r) => `${r.figure}:${r.houses.join(',')}`),
  ['Acquisitio:1,10', 'Fortuna Major:2,5', 'Amissio:4,6', 'Carcer:11,12'],
);
assertEq('D: part of fortune', [D.housePoints, D.pofHouse], [68, 8]);
assertEq('D: PoF figure', D.pofFigure.name, 'Cauda Draconis');
assertEq('D: way of point completes', D.wayHouses, [1, 2]);

assertEq('J: houses', J.houses.map((f) => f.name), [
  'Fortuna Major', 'Via', 'Amissio', 'Albus', 'Conjunctio', 'Rubeus',
  'Via', 'Fortuna Minor', 'Fortuna Minor', 'Laetitia', 'Albus', 'Fortuna Major',
]);
assertEq('J: witnesses', [J.rightWitness.name, J.leftWitness.name], ['Rubeus', 'Tristitia']);
assertEq('J: judge', J.judge.name, 'Acquisitio');
assertEq('J: Step 0 clear', ['Rubeus', 'Cauda Draconis'].includes(J.houses[0].name), false);
assertEq('J: no occupation, perfects by conjunction', [J.occupation, J.conjunction], [false, true]);
assertEq(
  'J: the conjunction is the QUERENT\'S approach alone',
  J.conjunctionHits,
  ["querent's Fortuna Major stands in house 12, beside the 11th"],
);
assertEq(
  'J: repetitions',
  J.repetitions.map((r) => `${r.figure}:${r.houses.join(',')}`),
  ['Fortuna Major:1,12', 'Via:2,7', 'Albus:4,11', 'Fortuna Minor:8,9'],
);
assertEq('J: way of point completes', J.wayHouses, [5, 6]);
assertEq('J: part of fortune', [J.housePoints, J.pofHouse], [72, 12]);
assertEq('J: PoF figure — the querent\'s own, beside the hope', J.pofFigure.name, 'Fortuna Major');

assertEq('K: houses', K.houses.map((f) => f.name), [
  'Tristitia', 'Puer', 'Puer', 'Rubeus', 'Conjunctio', 'Caput Draconis',
  'Populus', 'Cauda Draconis', 'Fortuna Minor', 'Carcer', 'Tristitia', 'Cauda Draconis',
]);
assertEq('K: witnesses', [K.rightWitness.name, K.leftWitness.name], ['Acquisitio', 'Via']);
assertEq('K: judge', K.judge.name, 'Amissio');
assertEq('K: Step 0 clear', ['Rubeus', 'Cauda Draconis'].includes(K.houses[0].name), false);
assertEq('K: no occupation, perfects by conjunction', [K.occupation, K.conjunction], [false, true]);
assertEq(
  'K: the querent\'s Sorrow approaches the prison',
  K.conjunctionHits,
  ["querent's Tristitia stands in house 11, beside the 12th"],
);
assertEq(
  'K: repetitions',
  K.repetitions.map((r) => `${r.figure}:${r.houses.join(',')}`),
  ['Tristitia:1,11', 'Puer:2,3', 'Cauda Draconis:8,12'],
);
assertEq('K: way of point ends in the 8th', K.wayHouses, [8]);
assertEq('K: part of fortune', [K.housePoints, K.pofHouse], [72, 12]);
assertEq('K: PoF figure — dark fortune in the prison itself', K.pofFigure.name, 'Cauda Draconis');

assertEq('L: houses', L.houses.map((f) => f.name), [
  'Acquisitio', 'Albus', 'Carcer', 'Via', 'Fortuna Major', 'Carcer',
  'Acquisitio', 'Puella', 'Caput Draconis', 'Conjunctio', 'Amissio', 'Cauda Draconis',
]);
assertEq('L: witnesses', [L.rightWitness.name, L.leftWitness.name], ['Tristitia', 'Rubeus']);
assertEq('L: judge', L.judge.name, 'Acquisitio');
assertEq('L: Step 0 clear', ['Rubeus', 'Cauda Draconis'].includes(L.houses[0].name), false);
assertEq('L: perfects by occupation, no conjunction', [L.occupation, L.conjunction], [true, false]);
assertEq(
  'L: repetitions',
  L.repetitions.map((r) => `${r.figure}:${r.houses.join(',')}`),
  ['Acquisitio:1,7', 'Carcer:3,6'],
);
assertEq('L: way of point completes', L.wayHouses, [1, 2]);
assertEq('L: part of fortune', [L.housePoints, L.pofHouse], [68, 8]);
assertEq('L: PoF figure — Puella in the wife\'s-substance house', L.pofFigure.name, 'Puella');
assertEq('L: mothers differ from Chart A', L.mothers.join(',') === A.mothers.join(','), false);

// witness-judge table corpus files (warn before ingest, assert after)
for (const r of results) {
  const found = r.wjQuoteIds.filter((p) => existsSync(p));
  if (found.length === 0) {
    console.warn(`⚠ ${r.label}: no witness-judge corpus file yet (${r.wjQuoteIds.join(' or ')})`);
  }
}

// ---- emit the dossier ----
const fmt = (f) => `${f.name} [${f.dots.join(',')}]`;
let out = `# Course-chart dossier — authors' ground truth

Generated by \`scripts/chart-dossier.mjs\` — regenerate with \`npm run dossier\`.
NOT site content. Lessons 5–10 must agree with every fact below; the script
asserts the load-bearing ones and fails the build of truth if prose drifts.

Conventions: houses 1–12 = Mothers, Daughters, Nieces in order. Dots top-to-bottom,
1 = single point, 2 = double. Aspects per Cattan III.12–17 (sextile ±2, square ±3,
trine ±4, opposition +6; dexter backward, sinister forward). Company pairs per III.7.
Part of Fortune per III.21 (twelve house figures only). Way of point per III.20.
`;

for (const r of results) {
  out += `\n---\n\n## Chart ${r.label} — "${r.question}"\n\n`;
  out += `Mothers: ${r.mothers.map((id) => FIGURES[id].name).join(', ')}\n\n`;
  out += `| House | Figure | Planet | Element | Mobility |\n|---|---|---|---|---|\n`;
  r.houses.forEach((f, i) => {
    out += `| ${i + 1} | ${fmt(f)} | ${f.planet} | ${f.element ?? '—'} | ${f.mobility} |\n`;
  });
  out += `\nRight Witness: ${fmt(r.rightWitness)} · Left Witness: ${fmt(r.leftWitness)} · **Judge: ${fmt(r.judge)}**\n`;
  out += `\n### Repetitions (springings)\n`;
  out += r.repetitions.length
    ? r.repetitions.map((x) => `- ${x.figure} in houses ${x.houses.join(' and ')}`).join('\n') + '\n'
    : '- none\n';
  out += `\n### Perfection (1st ↔ ${r.quesitedHouse}th)\n`;
  out += `- Occupation: ${r.occupation ? 'YES' : 'no'}\n`;
  out += `- Conjunction: ${r.conjunction ? 'YES — ' + r.conjunctionHits.join('; ') : 'no'}\n`;
  out += `- Verdict: ${r.occupation || r.conjunction ? 'the chart PERFECTS' : 'perfection is DENIED by occupation and conjunction (company and aspect remain for the lessons to weigh)'}\n`;
  out += `\n### Company of houses (pairs 1·2 … 11·12)\n`;
  out += `| Pair | Figures | Company | Top lines agree |\n|---|---|---|---|\n`;
  for (const c of r.company) out += `| ${c.pair} | ${c.a} + ${c.b} | ${c.kind} | ${c.topAgreement ? 'yes' : 'no'} |\n`;
  out += `\n### Aspects beheld by the significators\n`;
  for (const m of r.aspectMap) {
    out += `\nHouse ${m.house} (${m.figure}):\n\n| Aspect | Side | House | Figure | Agreement |\n|---|---|---|---|---|\n`;
    for (const a of m.aspects) {
      out += `| ${a.name} | ${a.side} | ${a.house} | ${a.figureName} | ${a.agreement.join(', ') || '—'} |\n`;
    }
  }
  out += `\n### Part of Fortune (III.21, twelve house figures only)\n`;
  out += `- House points: ${r.housePoints} → ÷12 leaves ${r.housePoints % 12 === 0 ? '0 (→ 12th)' : r.housePoints % 12} → **house ${r.pofHouse}, ${r.pofFigure.name}**\n`;
  out += `- (Rejected 15-figure variant: ${r.allPoints} points → house ${r.rejHouse} — Cattan: "I have founde no trueth therein")\n`;
  out += `\n### Way of the Point (III.20)\n`;
  out += r.wayTrace.map((t) => `- ${t}`).join('\n') + '\n';
  out += `\n### Point totals (for III.6 "well made" criteria)\n`;
  out += `- Twelve houses: ${r.housePoints} points; all fifteen figures: ${r.allPoints} points; even-point figures among the houses: ${r.evenFigures} of 12\n`;
  out += `\n### Witness–Judge table entry (Cattan III.5)\n`;
  out += r.wjQuoteIds.map((p) => `- \`${p.replace('corpus/', '').replace('.md', '')}\`${existsSync(p) ? '' : ' (NOT YET INGESTED)'}`).join('\n') + '\n';
}

writeFileSync('references/course-charts-dossier.md', out);
console.log(
  failures === 0
    ? `✓ all assertions passed; dossier written to references/course-charts-dossier.md`
    : `✗ ${failures} assertion(s) FAILED (dossier still written for inspection)`,
);
process.exit(failures === 0 ? 0 : 1);
