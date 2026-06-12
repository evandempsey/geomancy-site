import { getCollection } from 'astro:content';
import { dotsKey, type FigureDots } from './casting';

/**
 * Build-time lookups from the figure YAML (the single source of truth
 * for dot patterns and names). Used by chart components and widgets'
 * data islands.
 */
export interface NamedFigure {
  dots: FigureDots;
  name: string;
  id?: string;
}

let cached: Promise<{
  byId: Map<string, NamedFigure>;
  byKey: Map<string, NamedFigure>;
}> | null = null;

export function figureMaps() {
  cached ??= getCollection('figures').then((all) => {
    const byId = new Map<string, NamedFigure>();
    const byKey = new Map<string, NamedFigure>();
    for (const f of all) {
      const fig: NamedFigure = { dots: f.data.dots as FigureDots, name: f.data.name, id: f.id };
      byId.set(f.id, fig);
      byKey.set(dotsKey(fig.dots), fig);
    }
    return { byId, byKey };
  });
  return cached;
}

/** Resolve a figure spec — an id like "puer" or a dots array — to dots. */
export async function resolveDots(spec: string | readonly number[]): Promise<FigureDots> {
  if (typeof spec === 'string') {
    const { byId } = await figureMaps();
    const fig = byId.get(spec);
    if (!fig) throw new Error(`Unknown figure id: ${spec}`);
    return fig.dots;
  }
  if (spec.length !== 4 || spec.some((n) => n !== 1 && n !== 2)) {
    throw new Error(`Invalid figure dots: [${spec.join(', ')}]`);
  }
  return spec.slice() as FigureDots;
}

/** Name a figure by its dots ("Acquisitio" for [2,1,2,1]). */
export async function nameOf(dots: FigureDots): Promise<string> {
  const { byKey } = await figureMaps();
  const fig = byKey.get(dotsKey(dots));
  if (!fig) throw new Error(`No figure with dots [${dots.join(', ')}]`);
  return fig.name;
}
