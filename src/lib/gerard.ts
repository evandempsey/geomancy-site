/**
 * The arithmetic of Gerard of Cremona's astronomical geomancy: erecting a
 * celestial chart from one figure and nine point-projections, per the
 * introduction to "Of Astronomical Geomancy" (trans. Turner, 1655). Pure
 * TypeScript with no Astro imports so it can run at build time (worked
 * examples), under node --test, and in the browser (course widget).
 *
 * Doctrine sources are cited per symbol; everything Gerard assumes rather
 * than states (rulerships, the fortunes) is flagged here and in the lesson.
 */
export const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;
export type Sign = (typeof SIGNS)[number];

export type Planet =
  | 'Sun'
  | 'Moon'
  | 'Venus'
  | 'Mercury'
  | 'Saturn'
  | 'Jupiter'
  | 'Mars'
  | 'Caput Draconis'
  | 'Cauda Draconis';

/**
 * The fixed order of the nine projections: "you ought always to begin from
 * the Sun, and afterwards from the Moon, then from Venus and Mercury, and
 * from Saturn, Jupiter and Mars, and the Dragons Head and Dragons Tail"
 * (corpus/gerard/projection-of-planets.md).
 */
export const PLANET_ORDER: Planet[] = [
  'Sun',
  'Moon',
  'Venus',
  'Mercury',
  'Saturn',
  'Jupiter',
  'Mars',
  'Caput Draconis',
  'Cauda Draconis',
];

/**
 * Figure id → the sign "put for the Ascendant" — Gerard's own table,
 * verbatim from corpus/gerard/attributions.md. Four signs are doubled
 * (Taurus, Gemini, Virgo, Scorpio) because sixteen figures share twelve
 * signs. The Gerard chart check script cross-asserts this map against the
 * `gerard` attributionVariants in src/data/figures/*.yaml.
 */
export const GERARD_ASCENDANT_SIGN: Record<string, Sign> = {
  acquisitio: 'Aries',
  laetitia: 'Taurus',
  'fortuna-minor': 'Taurus',
  puer: 'Gemini',
  rubeus: 'Gemini',
  albus: 'Cancer',
  via: 'Leo',
  conjunctio: 'Virgo',
  'caput-draconis': 'Virgo',
  puella: 'Libra',
  amissio: 'Scorpio',
  tristitia: 'Scorpio',
  'cauda-draconis': 'Sagittarius',
  populus: 'Capricorn',
  'fortuna-major': 'Aquarius',
  carcer: 'Pisces',
};

/**
 * The standard planet–sign rulerships. Gerard assumes these throughout
 * ("the Lord of the Ascendant", "the Lord of the seventh") and never states
 * them; the corpus's nearest witness is agrippa/general/signs, which gives
 * every pairing here EXCEPT Aries=Mars — that one is course-supplied from
 * the common doctrine of the art, and the lesson flags it.
 */
export const RULERS: Record<Sign, Planet> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
};

/**
 * The lesser / mean / greater years of the planets, exactly as printed in
 * Turner's 1655 first-house chapter (corpus/gerard/house-01/planetary-years).
 * The printing is corrupt in places — Venus duplicates the Sun's 45/82,
 * Mars duplicates Jupiter's 40/47 — and the course quotes it as printed,
 * flagged; these numbers must agree with the quote, not with the classical
 * tables.
 */
export const PLANETARY_YEARS: Partial<Record<Planet, { lesser: number; mean: number; greater: number }>> = {
  Saturn: { lesser: 30, mean: 44, greater: 58 },
  Jupiter: { lesser: 12, mean: 40, greater: 47 },
  Mars: { lesser: 15, mean: 40, greater: 47 },
  Sun: { lesser: 19, mean: 45, greater: 82 },
  Venus: { lesser: 8, mean: 45, greater: 82 },
  Mercury: { lesser: 20, mean: 49, greater: 80 },
  Moon: { lesser: 15, mean: 39, greater: 107 },
};

/**
 * The fortunes and infortunes as Gerard himself uses them: "if Jupiter,
 * Venus or the Dragons Head be in the first… go" against "Saturn, Mars or
 * the Dragons Tail" (corpus/gerard/house-06/whether-to-go-and-heal,
 * house-06/recover-or-die). The Sun and Moon are left unclassified —
 * Gerard reads them case by case, and so does the lesson.
 */
export const FORTUNES: Planet[] = ['Jupiter', 'Venus', 'Caput Draconis'];
export const INFORTUNES: Planet[] = ['Saturn', 'Mars', 'Cauda Draconis'];

/**
 * "In the second house, let that sign be placed which immediately succeeds
 * the other… so place the rest in order" (corpus/gerard/the-square-figure).
 * Index 0 = first house.
 */
export function signsForHouses(ascendant: Sign): Sign[] {
  const start = SIGNS.indexOf(ascendant);
  if (start === -1) throw new Error(`Unknown sign: ${ascendant}`);
  return [...Array(12)].map((_, i) => SIGNS[(start + i) % 12]);
}

/**
 * "Divide those points by twelve, and that which remaineth above twelve,
 * or the twelfth itself, if a greater number doth not remain, retain" —
 * the remainder names the house, and a remainder of nought counts as
 * twelve (corpus/gerard/projection-of-planets.md).
 */
export function houseFromPoints(total: number): number {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error(`Invalid point total: ${total}`);
  }
  return ((total - 1) % 12) + 1;
}

/**
 * Angles, succedents, cadents — the strength scale of Gerard's first-house
 * chapter ("in strong Angles… long life; in succedents, a middle age; and
 * in cadent houses, a short life", corpus/gerard/house-01/length-of-life).
 */
export function houseKind(house: number): 'angle' | 'succedent' | 'cadent' {
  if (!Number.isInteger(house) || house < 1 || house > 12) {
    throw new Error(`Invalid house: ${house}`);
  }
  if ([1, 4, 7, 10].includes(house)) return 'angle';
  if ([2, 5, 8, 11].includes(house)) return 'succedent';
  return 'cadent';
}

export interface GerardChart {
  /** figure id of the single cast figure */
  ascendantFigure: string;
  ascendantSign: Sign;
  /** index 0 = first house */
  houseSigns: Sign[];
  /** planet → house number (1–12), in PLANET_ORDER */
  placements: Record<Planet, number>;
  lordOfAscendant: Planet;
  /** house the lord of the ascendant occupies */
  lordHouse: number;
  lordKind: 'angle' | 'succedent' | 'cadent';
}

/** Lord of house n (1–12) in an erected chart: ruler of the sign there. */
export function lordOfHouse(chart: GerardChart, house: number): Planet {
  return RULERS[chart.houseSigns[house - 1]];
}

/** Every planet standing in house n (1–12), in projection order. */
export function planetsInHouse(chart: GerardChart, house: number): Planet[] {
  return PLANET_ORDER.filter((p) => chart.placements[p] === house);
}

/**
 * Erect the whole chart: one figure for the Ascendant, then nine point
 * totals in PLANET_ORDER (Sun first, Dragon's Tail last).
 */
export function erectChart(ascendantFigure: string, totals: number[]): GerardChart {
  const ascendantSign = GERARD_ASCENDANT_SIGN[ascendantFigure];
  if (!ascendantSign) throw new Error(`Unknown figure: ${ascendantFigure}`);
  if (totals.length !== 9) {
    throw new Error(`Expected nine projections, got ${totals.length}`);
  }
  const houseSigns = signsForHouses(ascendantSign);
  const placements = {} as Record<Planet, number>;
  PLANET_ORDER.forEach((planet, i) => {
    placements[planet] = houseFromPoints(totals[i]);
  });
  const lordOfAscendant = RULERS[ascendantSign];
  const lordHouse = placements[lordOfAscendant];
  return {
    ascendantFigure,
    ascendantSign,
    houseSigns,
    placements,
    lordOfAscendant,
    lordHouse,
    lordKind: houseKind(lordHouse),
  };
}

/**
 * Four lines of casually pricked points for one projection, as the widget
 * casts them — each line 5–16 points, so totals range 20–64 and every
 * house is reachable.
 */
export function randomProjection(rand: () => number = Math.random): number[] {
  return [0, 0, 0, 0].map(() => 5 + Math.floor(rand() * 12));
}

/** Sum of one projection's four lines. */
export function projectionTotal(lines: number[]): number {
  return lines.reduce((sum, n) => sum + n, 0);
}
