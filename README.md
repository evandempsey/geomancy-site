# The Art of Geomancy

A reference site for traditional (medieval and Renaissance) geomancy. Every
interpretive statement — figure meanings, judgments in the twelve houses,
techniques — is quoted directly from public-domain historical sources, with
citations and (where possible) links to the scanned page of the original
edition.

Built with Astro; outputs plain static HTML to `dist/`, deployable on any
static host.

## Sources

| Source | Edition | Acquisition |
|---|---|---|
| Cattan, *The Geomancie* | London 1591 (Sparry trans.) | archive.org `b30337860`; transcribed by vision from leaf scans |
| Heydon, *Theomagia* | London 1663–4 | local PDF in `references/`; OCR index + page-image transcription |
| Agrippa (attrib.), *Of Geomancy* | Turner trans., 1655 | EEBO-TCP A26563 (A26562 for damaged passages) |
| Gerard of Cremona, *Of Astronomical Geomancy* | Turner trans., 1655 | EEBO-TCP A26563 |
| Crowley, *A Handbook of Geomancy* | The Equinox I.2, 1909 | re-typeset PDF, tables arithmetically verified |

## Layout

- `corpus/` — ★ the canonical quote store. One Markdown file per quotation,
  with frontmatter (`source`, `locator`, `scanRef`, `figures`, `houses`,
  `topics`, `quality`). Site pages are *views* over this collection.
- `src/data/` — figures (16), houses (12), sources (5) as YAML.
- `src/content/library/` — full texts as Markdown chapters.
- `references/` — source PDFs and the committed EEBO TEI. `references/scans/`
  and `references/ocr/` are gitignored caches; re-create them with the
  scripts below.
- `src/pages/` — routes. Figure×house combination pages are emitted only when
  at least one usable quote covers them (`getStaticPaths` gating).

## Commands

```sh
npm run dev          # local preview
npm run build        # static build to dist/ (zod-validates the whole corpus)
npm run coverage     # print the 16×12 extraction matrix per source
npm run fetch:eebo   # re-download the EEBO-TCP TEI
npm run fetch:cattan # re-download the 288 Cattan leaf scans (IIIF)
npm run heydon index   # rebuild the Heydon per-page OCR index
npm run heydon image 412  # render Theomagia p. 412 for transcription
node scripts/tei-to-md.mjs          # TEI → library chapters (overwrites!)
node scripts/split-agrippa-quotes.mjs  # Agrippa delineations → corpus (overwrites!)
node scripts/split-crowley-quotes.mjs  # Crowley chapters → corpus (overwrites!)
node scripts/ingest-cattan.mjs && python3 scripts/fixup-corpus.py
                                    # Cattan extraction files → corpus (overwrites!)
node scripts/ingest-heydon.mjs      # Heydon extraction files → corpus (overwrites!)
```

The conversion/split scripts are run-once generators whose output is then
hand-tuned; do not re-run them over corrected files without checking git diff.

## Extraction workflow

Transcriptions of the scanned books are produced by AI agents reading the
page images (Claude subagents, or `codex exec` for ranges Claude's content
filter balks at), saved verbatim under `references/extracted/<source>/` in a
structured Markdown format, then parsed into corpus quote files by the ingest
scripts above. `scripts/extract-agent-result.py` pulls a subagent's final
message from its transcript file. Every quote carries its leaf/page locator;
Cattan quotes link to the archive.org scan for verification.

Set the production domain via `SITE_URL` at build time (or edit
`astro.config.mjs`); canonical URLs, the sitemap and `public/robots.txt`
depend on it.

## Editorial method

Semi-diplomatic transcription: long s → s, u/v and i/j modernised,
contractions expanded in brackets, original spelling otherwise retained;
illegible letters marked `•` (TCP convention); supplied text noted in
`editorialNote`. See `/about/editorial-method/` on the site.
