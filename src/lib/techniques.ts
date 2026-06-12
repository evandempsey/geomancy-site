export interface Technique {
  slug: string;
  title: string;
  description: string;
}

/** The technique pages; shared by the index and the per-page metadata. */
export const TECHNIQUES: Technique[] = [
  {
    slug: 'judge-and-witnesses',
    title: 'The Judge and Witnesses',
    description:
      'How the two Witnesses and the Judge resolve a geomantic question, with the tables and rules of the historical sources.',
  },
  {
    slug: 'modes-of-perfection',
    title: 'The Modes of Perfection',
    description:
      'Occupation, conjunction, mutation and translation: the four classical ways a geomantic chart perfects, joining querent to quesited.',
  },
  {
    slug: 'springing-of-figures',
    title: 'The Springing of Figures',
    description:
      'How a figure that passes into other houses extends the judgment: the commixture of figures taught by Agrippa and the later geomancers.',
  },
  {
    slug: 'projection-of-points',
    title: 'The Projection of Points and the Index',
    description:
      'Counting the points of the chart to find the Index and the Part of Fortune, the hidden arbiters of a geomantic judgment.',
  },
  {
    slug: 'essential-dignities',
    title: 'Essential Dignities of the Figures',
    description:
      'The strength and weakness of geomantic figures by house: house, exaltation, triplicity, fall and detriment.',
  },
  {
    slug: 'aspects-and-company',
    title: 'Aspects and the Friendship of Figures',
    description:
      'Sextile, trine, square and opposition between houses; dexter and sinister; the friendships and enmities of the figures.',
  },
  {
    slug: 'way-of-the-point',
    title: 'The Way of the Point',
    description:
      'Tracing the head-points from the Judge back through the chart, the way of point, "a thing much necessarie and profitable in this Arte", with Cattan\'s worked example.',
  },
  {
    slug: 'point-of-intention',
    title: 'The Point of Intention',
    description:
      'How the old geomancers found what question a chart was cast for, and what the querent secretly thinks, by Cattan\'s rules of the point of intention.',
  },
  {
    slug: 'judging-the-figure',
    title: 'Judging the Figure',
    description:
      'How a geomantic chart becomes a judgment: the eight ways a figure is fortunate or unfortunate, the figure of figures, and the general method of the masters.',
  },
];
