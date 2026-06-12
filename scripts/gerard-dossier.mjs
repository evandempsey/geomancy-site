/**
 * Generate the authors' ground-truth dossier for the GERARD course charts
 * (E–I) of Lesson 12 and assert every structural fact the lesson states
 * about them. Parallel to chart-dossier.mjs (charts A–D, which this script
 * never touches); if an assertion here fails, prose somewhere is wrong.
 *
 * Sources of the encoded rules — all Gerard of Cremona, "Of Astronomical
 * Geomancy" (trans. Turner, 1655), via src/lib/gerard.ts:
 *  - figure → ascendant sign: the introduction (corpus/gerard/attributions)
 *  - signs in zodiacal order from the ascendant: corpus/gerard/the-square-figure
 *  - planets by point totals ÷ 12, remainder 0 → 12th:
 *    corpus/gerard/projection-of-planets
 *  - lords assumed (standard rulerships; agrippa/general/signs attests all
 *    but Aries=Mars), strength by angles/succedents/cadents:
 *    corpus/gerard/house-01/length-of-life
 *
 * Per-line point counts are FROZEN here so students can verify the
 * arithmetic by hand; the script recomputes everything from the lines.
 *
 * Run: npm run dossier:gerard   (exits 1 if any assertion fails)
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import {
  GERARD_ASCENDANT_SIGN,
  RULERS,
  PLANET_ORDER,
  FORTUNES,
  INFORTUNES,
  erectChart,
  houseKind,
  lordOfHouse,
  planetsInHouse,
  projectionTotal,
} from '../src/lib/gerard.ts';

// ---- cross-assert the sign map against the figure YAML source of truth ----
let failures = 0;
function assertEq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`✗ ${label}: expected ${e}, got ${a}`);
    failures += 1;
  }
}

for (const file of readdirSync('src/data/figures')) {
  const id = file.replace('.yaml', '');
  const text = readFileSync(`src/data/figures/${file}`, 'utf8');
  const gerardBlock = text.split(/-\s+source:\s+/).find((b) => b.startsWith('gerard'));
  const sign = gerardBlock?.match(/sign:\s*(\S+)/)?.[1];
  assertEq(`${id}: YAML gerard variant matches GERARD_ASCENDANT_SIGN`, sign, GERARD_ASCENDANT_SIGN[id]);
}

// ---- the frozen charts ----
// lines: nine projections in PLANET_ORDER (Sun … Dragon's Tail), four
// casually-pricked lines each. Totals and houses are computed, never stated.
const CHARTS = [
  {
    label: 'E',
    question: "Will the querent live a long life?",
    quesitedHouse: 1,
    ascendant: 'fortuna-major',
    lines: [
      [8, 7, 9, 7], // Sun
      [6, 8, 5, 8], // Moon
      [4, 5, 3, 5], // Venus
      [7, 6, 7, 6], // Mercury
      [5, 6, 5, 6], // Saturn
      [7, 5, 6, 7], // Jupiter
      [9, 8, 9, 7], // Mars
      [3, 5, 4, 4], // Caput
      [8, 7, 8, 7], // Cauda
    ],
  },
  {
    label: 'F',
    question: 'Whether the sick man shall recover his health, or die?',
    quesitedHouse: 6,
    ascendant: 'carcer',
    lines: [
      [9, 7, 8, 8], // Sun
      [5, 6, 7, 5], // Moon
      [6, 7, 6, 6], // Venus
      [4, 5, 4, 5], // Mercury
      [3, 4, 3, 3], // Saturn
      [8, 7, 7, 7], // Jupiter
      [4, 4, 5, 4], // Mars
      [7, 6, 7, 7], // Caput
      [6, 5, 6, 5], // Cauda
    ],
  },
  {
    label: 'G',
    question: 'Will the physician cure the sick man with his medicines?',
    quesitedHouse: 6,
    ascendant: 'puella',
    lines: [
      [8, 6, 7, 7], // Sun
      [5, 4, 5, 5], // Moon
      [10, 8, 9, 9], // Venus — sums to 36: the remainder-of-nought rule
      [6, 5, 5, 5], // Mercury
      [9, 8, 9, 8], // Saturn
      [6, 6, 7, 6], // Jupiter
      [8, 9, 7, 7], // Mars
      [4, 6, 5, 5], // Caput
      [7, 6, 6, 7], // Cauda
    ],
  },
  {
    label: 'H',
    question: 'Will the journey go well?',
    quesitedHouse: 9,
    ascendant: 'via',
    lines: [
      [6, 5, 7, 6], // Sun — sums to 24: the remainder-of-nought rule again
      [7, 6, 6, 7], // Moon
      [4, 5, 5, 5], // Venus
      [8, 7, 8, 7], // Mercury
      [5, 6, 4, 6], // Saturn
      [7, 8, 6, 7], // Jupiter
      [6, 5, 6, 6], // Mars
      [9, 8, 9, 9], // Caput
      [4, 3, 4, 4], // Cauda
    ],
  },
  {
    label: 'I',
    question: 'Will the stolen goods be recovered?',
    quesitedHouse: 7,
    ascendant: 'amissio',
    lines: [
      [7, 7, 6, 7], // Sun
      [7, 8, 7, 7], // Moon
      [7, 6, 6, 6], // Venus
      [8, 9, 8, 7], // Mercury
      [6, 5, 5, 6], // Saturn
      [5, 4, 4, 5], // Jupiter
      [8, 7, 8, 8], // Mars
      [4, 5, 3, 4], // Caput
      [8, 9, 8, 8], // Cauda
    ],
  },
  {
    // Lesson 13, Judgment III — the same marriage question as shield
    // chart L, cast independently in the second tongue.
    label: 'M',
    question: 'Will the intended marriage go ahead?',
    quesitedHouse: 7,
    ascendant: 'conjunctio',
    lines: [
      [6, 8, 7, 7], // Sun
      [8, 8, 7, 8], // Moon
      [6, 5, 6, 6], // Venus
      [9, 8, 8, 9], // Mercury
      [7, 6, 7, 7], // Saturn
      [6, 7, 6, 6], // Jupiter
      [8, 8, 9, 7], // Mars
      [5, 4, 5, 5], // Caput
      [8, 7, 7, 8], // Cauda
    ],
  },
];

const NAMES = {
  acquisitio: 'Acquisitio',
  'fortuna-major': 'Fortuna Major',
  carcer: 'Carcer',
  puella: 'Puella',
  via: 'Via',
  amissio: 'Amissio',
  conjunctio: 'Conjunctio',
};

function analyze(spec) {
  const totals = spec.lines.map(projectionTotal);
  const chart = erectChart(spec.ascendant, totals);
  return { ...spec, totals, chart };
}

const results = CHARTS.map(analyze);
const [E, F, G, H, I, M] = results.map((r) => r.chart);

// ---- assertions: every load-bearing fact Lesson 12 states ----

// Chart E — the lord angular, the greater years of Saturn
assertEq('E: ascendant', [E.ascendantSign, E.lordOfAscendant], ['Aquarius', 'Saturn']);
assertEq('E: signs run in order', [E.houseSigns[1], E.houseSigns[2], E.houseSigns[11]], ['Pisces', 'Aries', 'Capricorn']);
assertEq('E: placements', PLANET_ORDER.map((p) => E.placements[p]), [7, 3, 5, 2, 10, 1, 9, 4, 6]);
assertEq('E: lord of the ascendant angular in the 10th', [E.lordHouse, E.lordKind], [10, 'angle']);
assertEq('E: a fortune (Jupiter) in the first', planetsInHouse(E, 1), ['Jupiter']);
assertEq('E: no infortune in the first', INFORTUNES.some((p) => E.placements[p] === 1), false);
assertEq('E: the Sun not in the eighth', E.placements['Sun'] === 8, false);
assertEq('E: lord of the eighth not in the first', E.placements[lordOfHouse(E, 8)] === 1, false);

// Chart F — the mortal configurations, clause by clause
assertEq('F: ascendant', [F.ascendantSign, F.lordOfAscendant], ['Pisces', 'Jupiter']);
assertEq('F: the eighth house is Libra, its lord Venus', [F.houseSigns[7], lordOfHouse(F, 8)], ['Libra', 'Venus']);
assertEq('F: placements', PLANET_ORDER.map((p) => F.placements[p]), [8, 11, 1, 6, 1, 5, 5, 3, 10]);
assertEq('F: Saturn in the first', F.placements['Saturn'], 1);
assertEq('F: the lord of the eighth with him in the first', F.placements['Venus'], 1);
assertEq('F: the Sun in the eighth', F.placements['Sun'], 8);
assertEq('F: the lord of the first joined with Mars (both in the fifth)', [F.lordHouse, F.placements['Mars']], [5, 5]);
assertEq("F: the Dragon's Tail on the midheaven", F.placements['Cauda Draconis'], 10);
assertEq('F: no fortune in the sixth or eighth', FORTUNES.some((p) => [6, 8].includes(F.placements[p])), false);

// Chart G — the physician's reassigned wheel
assertEq('G: ascendant', [G.ascendantSign, G.lordOfAscendant], ['Libra', 'Venus']);
assertEq('G: Venus by 36 points to the twelfth (remainder nought)', G.placements['Venus'], 12);
assertEq('G: placements', PLANET_ORDER.map((p) => G.placements[p]), [4, 7, 12, 9, 10, 1, 7, 8, 2]);
assertEq('G: a fortune (Jupiter) in the first — the physician', planetsInHouse(G, 1), ['Jupiter']);
assertEq('G: an infortune (Saturn) in the tenth — the sick', planetsInHouse(G, 10), ['Saturn']);
assertEq('G: Mars among the diseases in the seventh, the Moon with him', planetsInHouse(G, 7).sort(), ['Mars', 'Moon']);
assertEq('G: the Sun alone in the fourth — the medicines', planetsInHouse(G, 4), ['Sun']);

// Chart H — the erection drill
assertEq('H: ascendant', [H.ascendantSign, H.lordOfAscendant], ['Leo', 'Sun']);
assertEq('H: the Sun by 24 points to the twelfth (remainder nought)', H.placements['Sun'], 12);
assertEq('H: placements', PLANET_ORDER.map((p) => H.placements[p]), [12, 2, 7, 6, 9, 4, 11, 11, 3]);
assertEq('H: the lord of the ascendant cadent', H.lordKind, 'cadent');
assertEq('H: the ninth house is Aries, its lord Mars in the eleventh', [H.houseSigns[8], H.placements[lordOfHouse(H, 9)]], ['Aries', 11]);
assertEq('H: Saturn in the ninth — the journey', planetsInHouse(H, 9), ['Saturn']);

// Chart I — the theft of the seventh
assertEq('I: ascendant', [I.ascendantSign, I.lordOfAscendant], ['Scorpio', 'Mars']);
assertEq('I: the seventh house is Taurus, its lord Venus', [I.houseSigns[6], lordOfHouse(I, 7)], ['Taurus', 'Venus']);
assertEq('I: placements', PLANET_ORDER.map((p) => I.placements[p]), [3, 5, 1, 8, 10, 6, 7, 4, 9]);
assertEq('I: the lord of the seventh in the first — restitution', I.placements['Venus'], 1);
assertEq('I: the lord of the first in the seventh — long sought, found at length', I.placements['Mars'], 7);
assertEq('I: the Moon in the fifth — it may be found', I.placements['Moon'], 5);
assertEq('I: no infortune in the second', INFORTUNES.some((p) => I.placements[p] === 2), false);

// Chart M — the marriage of the two tongues (Lesson 13, Judgment III)
assertEq('M: ascendant', [M.ascendantSign, M.lordOfAscendant], ['Virgo', 'Mercury']);
assertEq('M: the seventh house is Pisces, its lord Jupiter', [M.houseSigns[6], lordOfHouse(M, 7)], ['Pisces', 'Jupiter']);
assertEq('M: placements', PLANET_ORDER.map((p) => M.placements[p]), [4, 7, 11, 10, 3, 1, 8, 7, 6]);
assertEq('M: the lord of the seventh in the first — the marriage clause fires', M.placements['Jupiter'], 1);
assertEq('M: the Moon in the seventh — the clause fires again', M.placements['Moon'], 7);
assertEq('M: the seventh holds the Moon and the Dragon\'s Head', planetsInHouse(M, 7), ['Moon', 'Caput Draconis']);
assertEq('M: the lord of the Ascendant angular on the midheaven', [M.lordHouse, M.lordKind], [10, 'angle']);
assertEq('M: no infortune in the first or the seventh', INFORTUNES.some((p) => [1, 7].includes(M.placements[p])), false);

// every chart: totals are honest sums of the frozen lines
for (const r of results) {
  assertEq(
    `${r.label}: nine projections of four lines`,
    [r.lines.length, r.lines.every((l) => l.length === 4)],
    [9, true],
  );
}

// ---- emit the dossier ----
let out = `# Gerard-chart dossier — authors' ground truth (Lesson 12)

Generated by \`scripts/gerard-dossier.mjs\` — regenerate with \`npm run dossier:gerard\`.
NOT site content. Lesson 12 must agree with every fact below; the script
asserts the load-bearing ones and fails the build of truth if prose drifts.
Charts A–D (the shield charts) live in course-charts-dossier.md; these are
the celestial charts of Gerard's astronomical geomancy.

Conventions: one figure cast for the Ascendant names its sign
(corpus/gerard/attributions); signs run in zodiacal order through the twelve
houses (the-square-figure); each planet is placed by the sum of four lines of
points ÷ 12, the remainder naming the house, nought counting as twelve
(projection-of-planets), in the order Sun, Moon, Venus, Mercury, Saturn,
Jupiter, Mars, Dragon's Head, Dragon's Tail. Lords are the standard
rulerships (Gerard assumes them; agrippa/general/signs attests all but
Aries=Mars, which is course-supplied). Angles 1/4/7/10, succedents 2/5/8/11,
cadents 3/6/9/12 (house-01/length-of-life).
`;

for (const r of results) {
  const c = r.chart;
  out += `\n---\n\n## Chart ${r.label} — "${r.question}"\n\n`;
  out += `Ascendant figure: **${NAMES[r.ascendant]}** → **${c.ascendantSign}** rising. `;
  out += `Lord of the Ascendant: **${c.lordOfAscendant}**, in house ${c.lordHouse} (${c.lordKind}).\n`;
  out += `\n### The nine projections\n\n`;
  out += `| Planet | Lines | Sum | ÷12 leaves | House |\n|---|---|---|---|---|\n`;
  PLANET_ORDER.forEach((p, i) => {
    const sum = r.totals[i];
    const rem = sum % 12;
    out += `| ${p} | ${r.lines[i].join(' · ')} | ${sum} | ${rem === 0 ? '0 (→ 12)' : rem} | ${c.placements[p]} |\n`;
  });
  out += `\n### The erected figure\n\n`;
  out += `| House | Sign | Lord | Planets therein | Kind |\n|---|---|---|---|---|\n`;
  for (let n = 1; n <= 12; n++) {
    const planets = planetsInHouse(c, n);
    out += `| ${n} | ${c.houseSigns[n - 1]} | ${RULERS[c.houseSigns[n - 1]]} | ${planets.join(', ') || '—'} | ${houseKind(n)} |\n`;
  }
  out += `\n### Notes for the lesson\n`;
  if (r.label === 'E') {
    out += `- The lord of the Ascendant (Saturn) stands in the 10th, a strong angle: long life, the greater years of Saturn — 58 (house-01/length-of-life, house-01/planetary-years).\n`;
    out += `- Jupiter, a fortune, in the 1st; no infortune there; the Sun not in the 8th; the lord of the 8th (${lordOfHouse(E, 8)}) not in the 1st — the mortal configurations all answer in the negative (house-01/mortal-configurations).\n`;
    out += `- Intention check: Saturn lord of the Ascendant — "he enquireth about some sickness, or concerning a Prince… hath some great grief or anguish in his heart" (house-01/querents-intention).\n`;
  }
  if (r.label === 'F') {
    out += `- Saturn in the 1st with the lord of the 8th (Venus), and the Sun in the 8th: "the Querent shall not live" (house-01/mortal-configurations).\n`;
    out += `- The lord of the 1st (Jupiter) joined with Mars in the 5th: "whether his Lord be joined with an evil Planet, then he shall die soon" (house-06/recover-or-die).\n`;
    out += `- The Dragon's Tail on the midheaven: "if evil Planets do possess the Angles, evil and destruction is threatened to the sick" (house-06/recover-or-die).\n`;
    out += `- The recovery branch fails point by point: no good planet in the 1st, 6th or 8th (house-06/recover-or-die).\n`;
  }
  if (r.label === 'G') {
    out += `- The wheel reassigned by fiat: 1st the Physician, 10th the sick, 7th his diseases, 4th the medicines (house-06/the-physician-reassigned).\n`;
    out += `- Jupiter (a fortune) in the 1st: the physician shall be profitable to him.\n`;
    out += `- Saturn (an infortune) in the 10th: the sick person is the cause of his own disease.\n`;
    out += `- Mars among the diseases in the 7th, and the Moon with him — "if she shall be with an evil Planet and especially in the seventh house, then thou shalt not go" (house-06/whether-to-go-and-heal).\n`;
    out += `- The Sun alone in the 4th with the medicines — the Sun is neither of Gerard's fortunes nor of his infortunes; the lesson flags the silence honestly.\n`;
    out += `- Venus reaches the 12th by 36 points: the remainder of nought counts as twelve.\n`;
  }
  if (r.label === 'H') {
    out += `- Exercise chart (erection drill): the student erects everything from the lines above; the Sun's 24 points are the remainder-of-nought rule again.\n`;
    out += `- The lord of the Ascendant (the Sun) cadent in the 12th; the 9th house (the journey) is Aries, its lord Mars in the 11th, and Saturn stands in the 9th itself.\n`;
  }
  if (r.label === 'I') {
    out += `- Exercise chart (full judgment): the lord of the 7th (Venus) in the 1st — "the theft shall be restored again"; the lord of the 1st (Mars) in the 7th — "it shall be a long time sought after, and at length shall be found"; the Moon in the 5th — "it may be found" (house-07/theft).\n`;
    out += `- No infortune in the 2nd, so "it shall not be found, nor be altogether lost" does NOT apply.\n`;
  }
  if (r.label === 'M') {
    out += `- Lesson 13, Judgment III: the same marriage question as shield chart L, cast independently in the second tongue.\n`;
    out += `- The lord of the seventh (Jupiter) in the first: "if the Lord of the seventh be in the first, or with the Lord of the first, it will easily be brought to pass; and the woman be more desirous thereof, than the man" (house-07/marriage).\n`;
    out += `- The Moon in the seventh: "if the Lord of the Ascendant or the Moon be joined to the Lord of the seventh, or be in the seventh, the marriage will be effected" (house-07/marriage).\n`;
    out += `- The Dragon's Head (a fortune) with the Moon in the seventh; the lord of the Ascendant (Mercury) angular on the midheaven, in his own sign of Gemini; no infortune touches the first or the seventh.\n`;
    out += `- Concord with shield chart L: agree — both tongues grant the marriage.\n`;
  }
}

writeFileSync('references/gerard-charts-dossier.md', out);
console.log(
  failures === 0
    ? `✓ all assertions passed; dossier written to references/gerard-charts-dossier.md`
    : `✗ ${failures} assertion(s) FAILED (dossier still written for inspection)`,
);
process.exit(failures === 0 ? 0 : 1);
