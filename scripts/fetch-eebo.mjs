/**
 * Fetch the EEBO-TCP transcription of Turner's 1655 edition of Agrippa's
 * Fourth Book (A26563), which contains "Of Geomancy" and Gerard of Cremona's
 * "Of Astronomical Geomancy". The TEI file is committed to references/eebo/
 * as the audit copy that scripts/tei-to-md.mjs converts from.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const URL = 'https://raw.githubusercontent.com/textcreationpartnership/A26563/master/A26563.xml';
const OUT = 'references/eebo/A26563.xml';

const res = await fetch(URL);
if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
mkdirSync('references/eebo', { recursive: true });
writeFileSync(OUT, await res.text());
console.log(`wrote ${OUT}`);
