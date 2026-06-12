#!/usr/bin/env python3
"""Hand-maintained corpus fixups, applied after ingest-cattan.mjs.

ingest-cattan regenerates corpus/cattan from references/extracted/cattan and
loses these editorial touches; run this afterwards:

    node scripts/ingest-cattan.mjs && python3 scripts/fixup-corpus.py
"""
import json
import re

# 1. The misprinted Carcer/Conjunctio entry in Book II ch. 4
p = 'corpus/cattan/book-2/house-04/conjunctio.md'
s = open(p).read()
if 'editorialNote' not in s:
    s = s.replace(
        'quality: transcribed',
        'quality: transcribed\neditorialNote: "The 1591 printing heads this entry Carcer, '
        "but it bears Conjunctio's figure in the margin and stands in Conjunctio's place in "
        'the chapter\'s order; a second entry later in the chapter, also headed Carcer, bears '
        'Carcer\'s proper figure."',
        1,
    )
    open(p, 'w').write(s)
    print('noted', p)

# 2. The two targeted quotes from Book III ch. 27 (the chapter itself is a
#    library page built from references/extracted/cattan/book3-ch27.md.aside)
src = open('references/extracted/cattan/book3-ch27.md.aside').read()


def q(path, locator, topics, body, note=None):
    lines = [
        '---', 'source: cattan', f'locator: {json.dumps(locator)}',
        f"topics: [{', '.join(topics)}]", 'quality: transcribed',
        'scanRef: https://archive.org/details/b30337860/page/n249',
    ]
    if note:
        lines.append(f'editorialNote: {json.dumps(note)}')
    lines += ['---', '']
    open(path, 'w').write('\n'.join(lines) + body + '\n')
    print('wrote', path)


q(
    'corpus/cattan/book-3/ch-27-entering-exiting.md',
    'Book III, ch. 27 (p. 215)', ['general', 'attributions'],
    'And note that all the fygures which have more pointes on high then belowe, be entring in '
    'and good, saving Tristitia. And those which have more pointes below then on hie, be going '
    'out and evill, saving Lætitia. And those which have as many above as beneath be meanes, '
    'saving Carcer.',
)

concl = re.search(r'To knowe the nativitie[\s\S]*?pastime thereby\.', src)
assert concl is not None
q(
    'corpus/cattan/book-3/ch-27-time-of-life.md',
    'Book III, ch. 27 (pp. 225–226)', ['time-measures', 'method'],
    concl.group(0),
    'The closing prose of the chapter of qualities: judging trades, complexion and length of '
    'life from the figures and their points.',
)

# 3. The three Witness-Judge table entries (Book III ch. 5) that the 1591
#    compositor mangled. ingest-cattan's ch. 5 branch rightly skips them
#    (arithmetic or duplicate failures); the verdicts are recoverable from
#    the printed columns, so they are reconstructed here as ocr-draft with
#    the editorial reasoning on record. See references/extracted/cattan/
#    book3-ch05-tables-{a,c}.md for the as-printed transcriptions.

def wj(slug_pair, headline, w1, w2, judge, page, leaf, note, rows):
    body = '| matter | verdict |\n| --- | --- |\n' + '\n'.join(
        f'| {m} | {v} |' for m, v in rows)
    lines = [
        '---', 'source: cattan',
        f'locator: {json.dumps(f"Book III, ch. 5, table of {headline}, s.v. {w1} with {w2} (p. {page})")}',
        f'scanRef: https://archive.org/details/b30337860/page/n{leaf}',
        'topics: [witness-judge-tables]',
        'quality: ocr-draft',
        f'excerpt: {json.dumps(f"Judge {judge}: " + ", ".join(f"{m} {v}" for m, v in rows[:4]) + ", …")}',
        f'editorialNote: {json.dumps(note)}',
        '---', '', body, '',
    ]
    path = f'corpus/cattan/book-3/witness-judge/{slug_pair}.md'
    open(path, 'w').write('\n'.join(lines))
    print('wrote', path)


wj(
    'laetitia--laetitia', 'Laetitia', 'Laetitia', 'Laetitia', 'Populus', 163, 181,
    "Reconstructed: the 1591 printing duplicates the previous column's second witness "
    "(Tristitia) here, but the printed Judge is Populus, which only Laetitia with Laetitia "
    "yields, and the table otherwise runs each figure through all eight uneven witnesses "
    "once. The verdicts are as printed; the second witness is corrected from the arithmetic.",
    [('life', 'good'), ('substance', 'meane'), ('worship', 'meane'), ('possession', 'ill'),
     ('a wife', 'good'), ('woman with child', 'after the 5'), ('sickenes', 'after the 6'),
     ('prison', 'come out'), ('iourney', 'good by water'), ('thing lost', 'parte found')],
)

wj(
    'acquisitio--conjunctio', 'Acquisitio', 'Acquisitio', 'Conjunctio', 'Fortuna Major', 173, 191,
    "Reconstructed: the 1591 printing gives this column's witnesses as Acquisitio and Fortuna "
    "Major (duplicating the block's first column) with a Judge of Carcer, which no pair of "
    "even witnesses on the leaf yields; the series logic requires Acquisitio with Conjunctio, "
    "whose Judge is Fortuna Major. The verdicts are as printed; the second witness and Judge "
    "are corrected from the table's own completeness.",
    [('life', 'meane'), ('substance', 'meane'), ('worship', 'meane'), ('possession', 'meane'),
     ('a wife', 'meane'), ('woman with child', 'after the 5'), ('sickenes', 'after the 1'),
     ('prison', 'late out'), ('iourny', 'ill'), ('thing lost', 'found')],
)

wj(
    'acquisitio--carcer', 'Acquisitio', 'Acquisitio', 'Carcer', 'Fortuna Minor', 173, 191,
    "Reconstructed: the 1591 printing repeats Fortuna Minor as the second witness here "
    "(duplicating the block's second column) with distinct verdicts; the series logic "
    "requires Acquisitio with Carcer, whose Judge is Fortuna Minor — the compositor appears "
    "to have interchanged the partner witness and the Judge. The verdicts are as printed.",
    [('life', 'good'), ('substance', 'good'), ('worship', 'good'), ('possession', 'good'),
     ('a wife', 'good'), ('woman with child', 'a sonne'), ('sickenes', 'in danger'),
     ('prison', 'not out'), ('iourny', 'slowe'), ('thing lost', 'found')],
)
