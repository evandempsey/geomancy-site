// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// TODO: set the production domain before deploying — canonical URLs and the
// sitemap are generated from this value. Override with SITE_URL at build time.
const site = process.env.SITE_URL ?? 'https://geomancy.example.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [mdx(), sitemap()],
});
