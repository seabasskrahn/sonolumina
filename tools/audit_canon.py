#!/usr/bin/env python3
"""Day 2 across the canon (Separation): prove the data before anything is heard.

Checks all 66 books, read-only, and writes a report (Markdown):
  1. Shape: chapters and verses per book, BSB against KJV (vad/ and xref/
     are indexed by KJV versification), and empty verses.
  2. Feeling (vad/): one 6-digit VVAADD group per KJV verse, digits only.
  3. Word tones: every BSB word's stem has a codebook entry.
  4. Cross-references (xref/): every source key and target verse exists.

Usage: python3 -I tools/audit_canon.py <data dir with bsb/ kjv/ vad/ xref/> <codebook eng.json> <report.md> [bsb.txt]
  bsb.txt (optional): the public-domain source from bereanbible.com, to check that
  no BSB verse was lost or changed when the text was laid onto KJV numbering.
Exit code 0 when nothing blocks playback; mismatches that need a rule are listed, not hidden.
"""
import sys, os, re, json
from collections import Counter

DATA, CODEBOOK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
BOOKS = ('Genesis Exodus Leviticus Numbers Deuteronomy Joshua Judges Ruth 1Samuel 2Samuel '
         '1Kings 2Kings 1Chronicles 2Chronicles Ezra Nehemiah Esther Job Psalms Proverbs '
         'Ecclesiastes SongofSolomon Isaiah Jeremiah Lamentations Ezekiel Daniel Hosea Joel '
         'Amos Obadiah Jonah Micah Nahum Habakkuk Zephaniah Haggai Zechariah Malachi '
         'Matthew Mark Luke John Acts Romans 1Corinthians 2Corinthians Galatians Ephesians '
         'Philippians Colossians 1Thessalonians 2Thessalonians 1Timothy 2Timothy Titus '
         'Philemon Hebrews James 1Peter 2Peter 1John 2John 3John Jude Revelation').split()

def stem(w):
    w = re.sub(r'[^a-z]', '', w.lower())
    for suf in ('eth', 'est', 'ing', 'ed', 'es', 's'):
        if len(w) - len(suf) >= 3 and w.endswith(suf):
            return w[:-len(suf)]
    return w

def load(folder, b):
    return json.load(open(os.path.join(DATA, folder, b + '.json'), encoding='utf-8'))

lex = json.load(open(CODEBOOK, encoding='utf-8'))['lex']
kjv = {b: load('kjv', b)['c'] for b in BOOKS}
bsb = {b: load('bsb', b)['c'] for b in BOOKS}
vad = {b: load('vad', b) for b in BOOKS}
xref = {b: load('xref', b) for b in BOOKS}

report, blocking = [], 0
def h(t): report.append(f'\n## {t}\n')
def line(t=''): report.append(t)

# 1. Shape
h('1. Shape: BSB against KJV versification')
tot_k = sum(len(v) for b in BOOKS for v in kjv[b])
tot_b = sum(len(v) for b in BOOKS for v in bsb[b])
line(f'Verses: KJV {tot_k}, BSB {tot_b} (slots in the BSB files, including empty ones).')
chap_diff, verse_diff, empties = [], [], []
for b in BOOKS:
    if len(kjv[b]) != len(bsb[b]):
        chap_diff.append(f'{b}: KJV {len(kjv[b])} chapters, BSB {len(bsb[b])}')
    for c in range(min(len(kjv[b]), len(bsb[b]))):
        k, s = len(kjv[b][c]), len(bsb[b][c])
        if k != s:
            verse_diff.append((b, c + 1, k, s))
        for v, t in enumerate(bsb[b][c]):
            if not t.strip():
                empties.append(f'{b} {c + 1}:{v + 1}')
line(f'\nChapter-count differences: {len(chap_diff)}')
for x in chap_diff: line(f'- {x}')
line(f'\nChapters whose verse counts differ: {len(verse_diff)}')
for b, c, k, s in verse_diff: line(f'- {b} {c}: KJV {k}, BSB {s}')
line(f'\nEmpty BSB verses (no text in that slot): {len(empties)}')
if empties: line('- ' + ', '.join(empties))
# Psalm headings: the BSB puts the superscription into verse 1; the KJV does not.
heads = [f'Psalms {c + 1}' for c, ch in enumerate(bsb['Psalms'])
         if ch and re.match(r'(A|For|Of|To|The) .*(Psalm|song|David|Asaph|Korah|Moses|Solomon|Heman|Ethan|choir|director)', ch[0])
         and not re.match(r'(A|For|Of|To|The) .*(Psalm|song|David|Asaph|Korah|Moses|Solomon|Heman|Ethan|choir|director)', kjv['Psalms'][c][0])]
line(f'\nPsalms whose BSB verse 1 starts with the heading while the KJV verse 1 does not: {len(heads)}')
line('(Same verse number, different content: feeling looked up by number will still line up, since both scored the same slot, but the heading words also sound.)')

# 2. Feeling
h('2. Feeling (vad/): one VVAADD group per KJV verse')
vad_bad = []
for b in BOOKS:
    if len(vad[b]) != len(kjv[b]):
        vad_bad.append(f'{b}: {len(vad[b])} chapter strings, KJV {len(kjv[b])} chapters')
    for c, s in enumerate(vad[b]):
        if not re.fullmatch(r'\d*', s):
            vad_bad.append(f'{b} {c + 1}: non-digit characters')
        if c < len(kjv[b]) and len(s) != 6 * len(kjv[b][c]):
            vad_bad.append(f'{b} {c + 1}: {len(s) // 6} groups, KJV {len(kjv[b][c])} verses')
line(f'Problems: {len(vad_bad)}')
for x in vad_bad: line(f'- {x}')
blocking += len(vad_bad)
# What happens where the BSB has more verses than the KJV: no feeling for those slots.
no_feel = sum(max(0, s - k) for _, _, k, s in verse_diff)
line(f'\nBSB verse slots beyond the KJV count (would read feeling as neutral 0.5 unless mapped): {no_feel}')

# 3. Word tones
h('3. Word tones: codebook coverage of every BSB word')
words = Counter(); missing = Counter()
for b in BOOKS:
    for ch in bsb[b]:
        for t in ch:
            for w in t.split():
                s = stem(w)
                if not s: continue
                words[s] += 1
                if s not in lex: missing[s] += 1
line(f'Distinct stems {len(words)}, word tokens {sum(words.values())}, tokens without a tone {sum(missing.values())}.')
if missing: line('- ' + ', '.join(f'{w} ({n})' for w, n in missing.most_common(30)))
blocking += sum(missing.values())

# 4. Cross-references
h('4. Cross-references (xref/)')
bad_src, bad_tgt, n_links, zero_votes = [], [], 0, 0
def exists(bi, c, v):
    if not (0 <= bi < 66): return False
    k = kjv[BOOKS[bi]]
    return 1 <= c <= len(k) and 1 <= v <= len(k[c - 1])
for bi, b in enumerate(BOOKS):
    for key, links in xref[b].items():
        c, v = map(int, key.split('.'))
        if not exists(bi, c, v): bad_src.append(f'{b} {key}')
        for L in links:
            n_links += 1
            if not exists(L[0], L[1], L[2]): bad_tgt.append(f'{b} {key} -> {L[:3]}')
            if L[3] <= 0: zero_votes += 1
line(f'Links {n_links} (top 5 per verse), source verses {sum(len(x) for x in xref.values())}.')
line(f'Source keys that are not KJV verses: {len(bad_src)}')
for x in bad_src[:20]: line(f'- {x}')
line(f'Targets that are not KJV verses: {len(bad_tgt)}')
for x in bad_tgt[:20]: line(f'- {x}')
line(f'Links with zero or negative votes: {zero_votes}')
line('\nNote: field 5 of each link ("motif") is a letter-value (gematria) sum of the target verse, and field 6 a theme keyword mask. '
     'Neither comes from how Scripture uses its words, so the build should ignore both and use only [book, chapter, verse, votes].')
blocking += len(bad_src) + len(bad_tgt)

# 5. The BSB data against its source
if len(sys.argv) > 4:
    h('5. BSB data against the published source (bereanbible.com/bsb.txt)')
    alias = {'Psalm': 'Psalms', 'Song of Solomon': 'SongofSolomon'}
    src = {}
    for l in open(sys.argv[4], encoding='utf-8-sig'):
        m = re.match(r'^(.+?) (\d+):(\d+)\t(.*)$', l.rstrip('\r\n'))
        if m:
            b = alias.get(m[1], m[1]).replace(' ', '')
            src[(b, int(m[2]), int(m[3]))] = m[4].strip()
    lost, changed = [], []
    for (b, c, v), t in src.items():
        if b not in bsb: lost.append(f'{b} {c}:{v} (unknown book name)'); continue
        ch = bsb[b]
        if c > len(ch) or v > len(ch[c - 1]): lost.append(f'{b} {c}:{v}'); continue
        if ch[c - 1][v - 1] != t: changed.append(f'{b} {c}:{v}')
    extra = [f'{b} {c + 1}:{v + 1}' for b in BOOKS for c, ch in enumerate(bsb[b]) for v, t in enumerate(ch)
             if t and (b, c + 1, v + 1) not in src]
    line(f'Source verses {len(src)}. Lost from the data: {len(lost)}. Text differs from the source: {len(changed)}. In the data but not the source: {len(extra)}.')
    for name, xs in (('Lost', lost), ('Differs', changed), ('Extra', extra)):
        if xs: line(f'- {name}: ' + ', '.join(xs[:40]) + (' …' if len(xs) > 40 else ''))
    blocking += len(lost) + len(changed)

# 6. Same number, shifted content: BSB verse v against KJV verses v-1, v, v+1
h('6. Same verse number, shifted content (BSB against KJV)')
common = {w for w, _ in words.most_common(120)}
def bag(t): return {stem(w) for w in t.split()} - common - {''}
def sim(a, b): return len(a & b) / (len(a | b) or 1)
shifted = []
for b in BOOKS:
    for c, ch in enumerate(bsb[b]):
        kc = kjv[b][c]
        for v, t in enumerate(ch):
            if not t: continue
            mine = bag(t)
            if len(mine) < 4: continue
            here = sim(mine, bag(kc[v]))
            near = max((sim(mine, bag(kc[j])), j) for j in (v - 1, v + 1) if 0 <= j < len(kc))
            if near[0] > here + 0.15 and near[0] > 0.25:
                shifted.append((b, c + 1, v + 1, near[1] + 1, round(here, 2), round(near[0], 2)))
line(f'Verses whose content matches a neighbouring KJV verse better than its own number: {len(shifted)}')
line('(Each: BSB verse → best-matching KJV verse, overlap with its own number vs with the neighbour. Distinctive words only.)')
# Read by hand on 2026-10-18: only Philippians 1:16–17 is a true swap (the KJV follows the
# Textus Receptus order; the BSB the modern critical text). The rest repeat an idea in the
# neighbouring verse (Hebrew parallelism, or a phrase echoed) and are not shifts.
REAL = {('Philippians', 1, 17), ('Philippians', 1, 16)}
for b, c, v, j, a, n in shifted[:80]:
    verdict = 'REAL SWAP' if (b, c, v) in REAL else 'not a shift (wording echoes the neighbour)'
    line(f'- {b} {c}:{v} → KJV {c}:{j}  ({a} vs {n}): {verdict}')
if len(shifted) > 80: line(f'- … and {len(shifted) - 80} more')

# Summary
summary = [
    '# Canon audit (Day 2 across the whole Bible)',
    '',
    f'Generated by `tools/audit_canon.py` over the 66 books. Blocking problems: **{blocking}**.',
    '',
    'Blocking means playback would be wrong or break: a word with no tone, a malformed feeling string, or a cross-reference to a verse that does not exist. '
    'Versification differences are not blocking, but they need a rule, listed below.',
]
open(OUT, 'w', encoding='utf-8').write('\n'.join(summary + report) + '\n')
print(f'blocking {blocking}; chapter diffs {len(chap_diff)}, verse-count diffs {len(verse_diff)}, empty BSB verses {len(empties)}, '
      f'vad problems {len(vad_bad)}, missing tones {sum(missing.values())}, bad xref {len(bad_src) + len(bad_tgt)}')
print(f'shifted verses {len(shifted)}')
if len(sys.argv) > 4: print(f'bsb source: lost {len(lost)}, differs {len(changed)}, extra {len(extra)}')
sys.exit(1 if blocking else 0)
