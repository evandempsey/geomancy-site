/**
 * The classical essential dignities of the twelve signs, the source table for
 * /techniques/essential-dignities/ and the sign-dignity flashcard drills. Pure
 * TypeScript with no Astro imports so it can be read at build time and in the
 * browser. This is the single source: the page table and the drills both read
 * it, so they cannot drift.
 *
 * The `ruler` column repeats RULERS in gerard.ts (and must agree with it); that
 * map stays separate because it is doctrinally cited for Gerard's chart math.
 * The nodes are named here as the dignities table names them, "North Node" and
 * "South Node", not the Caput/Cauda Draconis of the figure attributions.
 */
import type { Sign, Planet } from './gerard';

export type DignityPlanet = Planet | 'North Node' | 'South Node';

export interface SignDignity {
  ruler: Planet;
  detriment: Planet;
  /** null where the sign has no exaltation: Leo, Scorpio, Aquarius. */
  exaltation: DignityPlanet | null;
  /** null where the table gives no fall. */
  fall: Planet | null;
}

/** Standard Unicode astrological glyph for each sign, shown beside the name. */
export const SIGN_SYMBOL: Record<Sign, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

/**
 * Standard Unicode astrological glyph for each planet. Covers every
 * DignityPlanet key, so the Caput/Cauda Draconis names of the Planet type and
 * the North/South Node names of the dignities table both appear; each node pair
 * shares the one glyph (☊ ascending, ☋ descending).
 */
export const PLANET_SYMBOL: Record<DignityPlanet, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  'Caput Draconis': '☊',
  'Cauda Draconis': '☋',
  'North Node': '☊',
  'South Node': '☋',
};

export const SIGN_DIGNITIES: Record<Sign, SignDignity> = {
  Aries: { ruler: 'Mars', detriment: 'Venus', exaltation: 'Sun', fall: 'Saturn' },
  Taurus: { ruler: 'Venus', detriment: 'Mars', exaltation: 'Moon', fall: null },
  Gemini: { ruler: 'Mercury', detriment: 'Jupiter', exaltation: 'North Node', fall: null },
  Cancer: { ruler: 'Moon', detriment: 'Saturn', exaltation: 'Jupiter', fall: 'Mars' },
  Leo: { ruler: 'Sun', detriment: 'Saturn', exaltation: null, fall: null },
  Virgo: { ruler: 'Mercury', detriment: 'Jupiter', exaltation: 'Mercury', fall: 'Venus' },
  Libra: { ruler: 'Venus', detriment: 'Mars', exaltation: 'Saturn', fall: 'Sun' },
  Scorpio: { ruler: 'Mars', detriment: 'Venus', exaltation: null, fall: 'Moon' },
  Sagittarius: { ruler: 'Jupiter', detriment: 'Mercury', exaltation: 'South Node', fall: null },
  Capricorn: { ruler: 'Saturn', detriment: 'Moon', exaltation: 'Mars', fall: 'Jupiter' },
  Aquarius: { ruler: 'Saturn', detriment: 'Sun', exaltation: null, fall: null },
  Pisces: { ruler: 'Jupiter', detriment: 'Mercury', exaltation: 'Venus', fall: 'Mercury' },
};
