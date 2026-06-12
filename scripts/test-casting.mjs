/**
 * Tests for src/lib/casting.ts — the shield-chart arithmetic. A silent
 * bug here would corrupt every worked example in the course, so the
 * known chart below was derived entirely by hand and checked twice.
 *
 * Run: npm run test:casting
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addFigures,
  deriveDaughters,
  deriveChart,
  chartFigures,
  pointCount,
  randomMother,
  dotsKey,
  parseDotsKey,
} from '../src/lib/casting.ts';

// Site dot conventions (top to bottom: fire, air, water, earth).
const PUER = [1, 1, 2, 1];
const AMISSIO = [1, 2, 1, 2];
const ALBUS = [2, 2, 1, 2];
const POPULUS = [2, 2, 2, 2];
const VIA = [1, 1, 1, 1];
const ACQUISITIO = [2, 1, 2, 1];

test('addFigures is line-wise parity addition', () => {
  assert.deepEqual(addFigures(ACQUISITIO, AMISSIO), VIA);
  assert.deepEqual(addFigures(VIA, VIA), POPULUS);
  // Populus is the identity element.
  assert.deepEqual(addFigures(PUER, POPULUS), PUER);
  // Every figure is its own inverse.
  assert.deepEqual(addFigures(ALBUS, ALBUS), POPULUS);
});

test('deriveDaughters transposes the Mothers', () => {
  const daughters = deriveDaughters([PUER, AMISSIO, ALBUS, POPULUS]);
  assert.deepEqual(daughters, [
    [1, 1, 2, 2], // Fortuna Minor — first lines of Mothers I–IV
    [1, 2, 2, 2], // Laetitia — second lines
    [2, 1, 1, 2], // Conjunctio — third lines
    [1, 2, 2, 2], // Laetitia — fourth lines
  ]);
});

test('deriveChart matches the hand-derived known chart', () => {
  const chart = deriveChart([PUER, AMISSIO, ALBUS, POPULUS]);
  assert.deepEqual(chart.nieces, [
    [2, 1, 1, 1], // Caput Draconis = Puer + Amissio
    [2, 2, 1, 2], // Albus = Albus + Populus
    [2, 1, 2, 2], // Rubeus = Fortuna Minor + Laetitia
    [1, 1, 1, 2], // Cauda Draconis = Conjunctio + Laetitia
  ]);
  assert.deepEqual(chart.witnesses, [
    [2, 1, 2, 1], // Acquisitio (Right Witness)
    [1, 2, 1, 2], // Amissio (Left Witness)
  ]);
  assert.deepEqual(chart.judge, VIA);
  assert.equal(chartFigures(chart).length, 15);
});

test('the Judge always has an even point count', () => {
  let seed = 1;
  const rand = () => {
    // Deterministic LCG so failures are reproducible.
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 500; i++) {
    const mothers = [0, 0, 0, 0].map(() => randomMother(rand));
    const { judge } = deriveChart(mothers);
    assert.equal(pointCount(judge) % 2, 0, `odd Judge from ${JSON.stringify(mothers)}`);
  }
});

test('randomMother produces valid figures', () => {
  for (let i = 0; i < 100; i++) {
    const m = randomMother();
    assert.equal(m.length, 4);
    assert.ok(m.every((n) => n === 1 || n === 2));
  }
});

test('dotsKey round-trips', () => {
  assert.equal(dotsKey(ACQUISITIO), '2121');
  assert.deepEqual(parseDotsKey('2121'), ACQUISITIO);
  assert.throws(() => parseDotsKey('213'));
  assert.throws(() => parseDotsKey('2130'));
});

test('deriveChart rejects malformed input', () => {
  assert.throws(() => deriveChart([PUER, AMISSIO, ALBUS]));
  assert.throws(() => deriveChart([PUER, AMISSIO, ALBUS, [1, 2, 3, 1]]));
});
