/**
 * The arithmetic of the shield chart: deriving Daughters, Nieces,
 * Witnesses and Judge from four Mothers. Pure TypeScript with no Astro
 * imports so it can run both at build time (worked examples) and in the
 * browser (course widgets).
 *
 * Dots arrays follow the site convention from src/data/figures/*.yaml:
 * four lines top to bottom (fire, air, water, earth), each 1 or 2 points.
 * E.g. Acquisitio = [2, 1, 2, 1], Amissio = [1, 2, 1, 2].
 */
export type Line = 1 | 2;
export type FigureDots = [Line, Line, Line, Line];

export interface ShieldChartFigures {
  mothers: FigureDots[];
  daughters: FigureDots[];
  nieces: FigureDots[];
  witnesses: [FigureDots, FigureDots];
  judge: FigureDots;
}

/** Line-wise parity addition: odd sum → one point, even sum → two. */
export function addFigures(a: FigureDots, b: FigureDots): FigureDots {
  return a.map((line, i) => ((line + b[i]) % 2 === 1 ? 1 : 2)) as FigureDots;
}

/** Daughter i is the i-th line of each Mother in order, read downward. */
export function deriveDaughters(mothers: FigureDots[]): FigureDots[] {
  assertMothers(mothers);
  return [0, 1, 2, 3].map(
    (row) => mothers.map((m) => m[row]) as FigureDots,
  );
}

/**
 * The full shield: Nieces from adjacent pairs of Mothers and Daughters,
 * Witnesses from the Nieces, Judge from the Witnesses.
 */
export function deriveChart(mothers: FigureDots[]): ShieldChartFigures {
  assertMothers(mothers);
  const daughters = deriveDaughters(mothers);
  const nieces = [
    addFigures(mothers[0], mothers[1]),
    addFigures(mothers[2], mothers[3]),
    addFigures(daughters[0], daughters[1]),
    addFigures(daughters[2], daughters[3]),
  ];
  const witnesses: [FigureDots, FigureDots] = [
    addFigures(nieces[0], nieces[1]),
    addFigures(nieces[2], nieces[3]),
  ];
  const judge = addFigures(witnesses[0], witnesses[1]);
  return { mothers: mothers.slice(), daughters, nieces, witnesses, judge };
}

/** All fifteen figures of the shield in traditional order. */
export function chartFigures(chart: ShieldChartFigures): FigureDots[] {
  return [
    ...chart.mothers,
    ...chart.daughters,
    ...chart.nieces,
    ...chart.witnesses,
    chart.judge,
  ];
}

/** Total points in a figure (4–8). */
export function pointCount(dots: FigureDots): number {
  return dots.reduce((sum, line) => sum + line, 0);
}

/** A random figure, line by line — sixteen rows of points condensed. */
export function randomMother(rand: () => number = Math.random): FigureDots {
  return [0, 0, 0, 0].map(() => (rand() < 0.5 ? 1 : 2)) as FigureDots;
}

/** "2121" — lookup key into figure data keyed by dots. */
export function dotsKey(dots: FigureDots): string {
  return dots.join('');
}

/** Parse a dots key back into a figure ("2121" → [2,1,2,1]). */
export function parseDotsKey(key: string): FigureDots {
  const dots = key.split('').map(Number);
  if (dots.length !== 4 || dots.some((n) => n !== 1 && n !== 2)) {
    throw new Error(`Invalid dots key: ${key}`);
  }
  return dots as FigureDots;
}

function assertMothers(mothers: FigureDots[]): void {
  if (mothers.length !== 4) {
    throw new Error(`Expected four Mothers, got ${mothers.length}`);
  }
  for (const m of mothers) {
    if (m.length !== 4 || m.some((n) => n !== 1 && n !== 2)) {
      throw new Error(`Invalid figure: [${m.join(', ')}]`);
    }
  }
}
