/**
 * Tests for src/lib/gerard.ts — the celestial-chart arithmetic of Gerard's
 * astronomical geomancy. A silent bug here would corrupt every worked
 * example in Lesson 12; the sign map and the years table are pinned to the
 * 1655 printing (corpus/gerard/attributions, house-01/planetary-years).
 *
 * Run: npm run test:gerard
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIGNS,
  PLANET_ORDER,
  GERARD_ASCENDANT_SIGN,
  RULERS,
  PLANETARY_YEARS,
  FORTUNES,
  INFORTUNES,
  signsForHouses,
  houseFromPoints,
  houseKind,
  lordOfHouse,
  planetsInHouse,
  erectChart,
  randomProjection,
  projectionTotal,
} from '../src/lib/gerard.ts';
import { SIGN_DIGNITIES } from '../src/lib/dignities.ts';

test('the ascendant table covers all sixteen figures', () => {
  assert.equal(Object.keys(GERARD_ASCENDANT_SIGN).length, 16);
  for (const sign of Object.values(GERARD_ASCENDANT_SIGN)) {
    assert.ok(SIGNS.includes(sign), `${sign} is a sign`);
  }
});

test('twelve signs from sixteen figures: exactly four signs doubled', () => {
  const count = new Map();
  for (const sign of Object.values(GERARD_ASCENDANT_SIGN)) {
    count.set(sign, (count.get(sign) ?? 0) + 1);
  }
  // every sign reachable
  assert.equal(count.size, 12);
  // "if Laetitia, or the lesser Fortune put Taurus … if Puer or Rubeus,
  // place Gemini; … Conjunctio or the Dragons head, Virgo; … Amissio or
  // Tristitia, Scorpio" — the doubled signs, the rest single.
  for (const sign of SIGNS) {
    const expected = ['Taurus', 'Gemini', 'Virgo', 'Scorpio'].includes(sign) ? 2 : 1;
    assert.equal(count.get(sign), expected, `${sign} claimed by ${expected} figure(s)`);
  }
});

test('spot checks against the printed table', () => {
  assert.equal(GERARD_ASCENDANT_SIGN['acquisitio'], 'Aries');
  assert.equal(GERARD_ASCENDANT_SIGN['fortuna-major'], 'Aquarius');
  assert.equal(GERARD_ASCENDANT_SIGN['carcer'], 'Pisces');
  assert.equal(GERARD_ASCENDANT_SIGN['via'], 'Leo');
  assert.equal(GERARD_ASCENDANT_SIGN['populus'], 'Capricorn');
  assert.equal(GERARD_ASCENDANT_SIGN['cauda-draconis'], 'Sagittarius');
});

test('SIGN_DIGNITIES rulers agree with RULERS, for all twelve signs', () => {
  assert.equal(Object.keys(SIGN_DIGNITIES).length, 12);
  for (const sign of SIGNS) {
    assert.equal(SIGN_DIGNITIES[sign].ruler, RULERS[sign], `${sign} ruler`);
  }
});

test('SIGN_DIGNITIES: only Leo, Scorpio and Aquarius have no exaltation', () => {
  const noExaltation = SIGNS.filter((sign) => SIGN_DIGNITIES[sign].exaltation === null);
  assert.deepEqual(noExaltation, ['Leo', 'Scorpio', 'Aquarius']);
});

test('signsForHouses runs the zodiac in order from the ascendant', () => {
  assert.deepEqual(signsForHouses('Aries'), [...SIGNS]);
  const fromPisces = signsForHouses('Pisces');
  assert.equal(fromPisces[0], 'Pisces');
  assert.equal(fromPisces[1], 'Aries');
  assert.equal(fromPisces[7], 'Libra'); // 8th house from a Pisces ascendant
  const fromLeo = signsForHouses('Leo');
  assert.equal(fromLeo[11], 'Cancer');
  assert.equal(new Set(fromLeo).size, 12);
});

test('houseFromPoints: the remainder names the house, nought counts as twelve', () => {
  assert.equal(houseFromPoints(1), 1);
  assert.equal(houseFromPoints(12), 12);
  assert.equal(houseFromPoints(13), 1);
  assert.equal(houseFromPoints(24), 12);
  assert.equal(houseFromPoints(25), 1);
  assert.equal(houseFromPoints(36), 12);
  assert.equal(houseFromPoints(34), 10);
  assert.throws(() => houseFromPoints(0));
  assert.throws(() => houseFromPoints(2.5));
});

test('angles, succedents and cadents partition the twelve houses', () => {
  const kinds = { angle: [], succedent: [], cadent: [] };
  for (let n = 1; n <= 12; n++) kinds[houseKind(n)].push(n);
  assert.deepEqual(kinds.angle, [1, 4, 7, 10]);
  assert.deepEqual(kinds.succedent, [2, 5, 8, 11]);
  assert.deepEqual(kinds.cadent, [3, 6, 9, 12]);
});

test('rulers: every sign has a lord; the seven planets all rule', () => {
  for (const sign of SIGNS) assert.ok(RULERS[sign], `${sign} has a lord`);
  const lords = new Set(Object.values(RULERS));
  assert.equal(lords.size, 7);
  assert.ok(!lords.has('Caput Draconis') && !lords.has('Cauda Draconis'));
  // the pairing agrippa/general/signs attests, plus course-supplied Aries=Mars
  assert.equal(RULERS['Leo'], 'Sun');
  assert.equal(RULERS['Cancer'], 'Moon');
  assert.equal(RULERS['Aries'], 'Mars');
  assert.equal(RULERS['Scorpio'], 'Mars');
  assert.equal(RULERS['Aquarius'], 'Saturn');
});

test("planetary years pin Turner's printed numbers, oddities included", () => {
  assert.deepEqual(PLANETARY_YEARS['Saturn'], { lesser: 30, mean: 44, greater: 58 });
  assert.deepEqual(PLANETARY_YEARS['Moon'], { lesser: 15, mean: 39, greater: 107 });
  // the printing's corruptions, kept as printed: Venus shares the Sun's
  // mean and greater years; Mars shares Jupiter's.
  assert.deepEqual(PLANETARY_YEARS['Venus'], { lesser: 8, mean: 45, greater: 82 });
  assert.deepEqual(PLANETARY_YEARS['Mars'], { lesser: 15, mean: 40, greater: 47 });
  assert.equal(PLANETARY_YEARS['Caput Draconis'], undefined);
  assert.equal(PLANETARY_YEARS['Cauda Draconis'], undefined);
});

test('the projection order and the fortunes are as Gerard gives them', () => {
  assert.deepEqual(PLANET_ORDER, [
    'Sun', 'Moon', 'Venus', 'Mercury', 'Saturn', 'Jupiter', 'Mars',
    'Caput Draconis', 'Cauda Draconis',
  ]);
  assert.deepEqual(FORTUNES, ['Jupiter', 'Venus', 'Caput Draconis']);
  assert.deepEqual(INFORTUNES, ['Saturn', 'Mars', 'Cauda Draconis']);
});

test('erectChart erects the whole figure', () => {
  // Fortuna Major ascending: Aquarius on the first, lord Saturn.
  const chart = erectChart('fortuna-major', [31, 27, 17, 26, 22, 25, 33, 16, 30]);
  assert.equal(chart.ascendantSign, 'Aquarius');
  assert.equal(chart.houseSigns[0], 'Aquarius');
  assert.equal(chart.houseSigns[2], 'Aries');
  assert.equal(chart.lordOfAscendant, 'Saturn');
  assert.equal(chart.placements['Saturn'], 10);
  assert.equal(chart.lordHouse, 10);
  assert.equal(chart.lordKind, 'angle');
  assert.equal(chart.placements['Sun'], 7);
  assert.deepEqual(planetsInHouse(chart, 10), ['Saturn']);
  assert.equal(lordOfHouse(chart, 8), RULERS[chart.houseSigns[7]]);
  assert.throws(() => erectChart('not-a-figure', [1, 2, 3, 4, 5, 6, 7, 8, 9]));
  assert.throws(() => erectChart('via', [1, 2, 3]));
});

test('randomProjection casts four plausible lines', () => {
  for (let i = 0; i < 200; i++) {
    const lines = randomProjection();
    assert.equal(lines.length, 4);
    for (const n of lines) assert.ok(n >= 5 && n <= 16);
    const total = projectionTotal(lines);
    assert.ok(total >= 20 && total <= 64);
    assert.ok(houseFromPoints(total) >= 1 && houseFromPoints(total) <= 12);
  }
});
