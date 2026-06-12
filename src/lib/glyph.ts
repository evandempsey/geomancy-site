/**
 * Geometry for rendering a geomantic figure (four lines of one or two
 * points) as SVG. Shared by FigureGlyph.astro and the OG-image generator.
 */
export type Dots = readonly number[];

export interface GlyphGeometry {
  viewBox: string;
  circles: { cx: number; cy: number; r: number }[];
}

const UNIT = 24; // logical grid unit
const R = 5; // dot radius

export function glyphGeometry(dots: Dots): GlyphGeometry {
  const width = UNIT * 3;
  const height = UNIT * 4;
  const circles = dots.flatMap((n, row) => {
    const cy = UNIT * (row + 0.5);
    if (n === 1) return [{ cx: width / 2, cy, r: R }];
    return [
      { cx: UNIT * 0.75, cy, r: R },
      { cx: UNIT * 2.25, cy, r: R },
    ];
  });
  return { viewBox: `0 0 ${width} ${height}`, circles };
}

/** "one point, two points, …" — for aria labels. */
export function glyphDescription(dots: Dots): string {
  return dots.map((n) => (n === 1 ? 'one point' : 'two points')).join(', ');
}
