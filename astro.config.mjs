// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { rehypeBaseLinks } from './src/lib/rehype-base.mjs';
import { rehypeAstroSymbols, remarkAstroSymbols } from './src/lib/rehype-astro-symbols.mjs';

// Deployed to GitHub Pages as a project site at evandempsey.github.io/geomancy-site/.
// Canonical URLs and the sitemap are generated from `site` + `base`; override with
// SITE_URL / BASE_PATH at build time to target another host.
const site = process.env.SITE_URL ?? 'https://evandempsey.github.io';
const base = process.env.BASE_PATH ?? '/geomancy-site';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  // Prefix root-relative links in Markdown/MDX prose with the base path so
  // lesson links resolve under the subpath (.astro templates use withBase()).
  markdown: {
    remarkPlugins: [remarkAstroSymbols],
    rehypePlugins: [[rehypeBaseLinks, { base }], rehypeAstroSymbols],
  },
  integrations: [mdx(), sitemap()],
});
