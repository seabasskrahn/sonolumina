#!/usr/bin/env python3
"""Day 2 (Separation): prove the Law on its own, before any sound depends on it.

Rebuilds the English codebook R(w) from the KJV and BSB text using only the
rules stated in the Law, then compares it entry by entry with
data/codebook/eng.json. Independent re-implementation of the original
tools/build_codebook.py (logos-theta), English part.

Entry: [step, octave, c1, c2, count, first_verse]
  step   = floor(12 * frac(rank * phi)), rank = order of first appearance
  octave = 0 / 1 / 2 for >=200 / 20-199 / <20 occurrences
  c1, c2 = index into CONS of the 2 most frequent verse companions,
           snapped to the consonance nearest their interval to the word

Usage: python3 -I tools/verify_codebook.py <dir with kjv/ and bsb/>
"""
import sys, os, re, json, math
from collections import Counter, defaultdict

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS = ('Genesis Exodus Leviticus Numbers Deuteronomy Joshua Judges Ruth 1Samuel 2Samuel '
         '1Kings 2Kings 1Chronicles 2Chronicles Ezra Nehemiah Esther Job Psalms Proverbs '
         'Ecclesiastes SongofSolomon Isaiah Jeremiah Lamentations Ezekiel Daniel Hosea Joel '
         'Amos Obadiah Jonah Micah Nahum Habakkuk Zephaniah Haggai Zechariah Malachi '
         'Matthew Mark Luke John Acts Romans 1Corinthians 2Corinthians Galatians Ephesians '
         'Philippians Colossians 1Thessalonians 2Thessalonians 1Timothy 2Timothy Titus '
         'Philemon Hebrews James 1Peter 2Peter 1John 2John 3John Jude Revelation').split()

JUST = [1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8]
CONS = [1, 5/4, 4/3, 3/2, 2]
PHI = (1 + 5 ** 0.5) / 2

def stem(w):
    w = re.sub(r'[^a-z]', '', w.lower())
    for suf in ('eth', 'est', 'ing', 'ed', 'es', 's'):
        if len(w) - len(suf) >= 3 and w.endswith(suf):
            return w[:-len(suf)]
    return w

def snap(ratio):
    while ratio >= 2: ratio /= 2
    while ratio < 1: ratio *= 2
    return min(range(len(CONS)), key=lambda i: (abs(math.log(ratio / CONS[i])), i))

def load(tr):
    return {b: json.load(open(os.path.join(SRC, tr, b + '.json'), encoding='utf-8'))['c'] for b in BOOKS}

kjv, bsb = load('kjv'), load('bsb')
# Versification base: KJV chapter/verse counts, global verse index 0..31101.
OFF, n = {}, 0
for b in BOOKS:
    OFF[b] = []
    for ch in kjv[b]:
        OFF[b].append(n); n += len(ch)
TOTAL = n
def gi(b, c, v):
    c = min(c, len(OFF[b]))
    return OFF[b][c - 1] + min(v, len(kjv[b][c - 1])) - 1

def verses(text, base=0):
    out = []
    for b in BOOKS:
        for ci, ch in enumerate(text[b]):
            for vi, t in enumerate(ch):
                out.append((base + gi(b, ci + 1, vi + 1), [s for s in map(stem, t.split()) if s]))
    return out

def signatures(vs):
    cnt, first, rank, co = Counter(), {}, {}, defaultdict(Counter)
    for g, ls in sorted(vs, key=lambda x: x[0]):
        for l in ls:
            cnt[l] += 1
            first.setdefault(l, g)
            rank.setdefault(l, len(rank))
    stop = {l for l, _ in cnt.most_common(40)}
    for g, ls in vs:
        al = set(ls); u = [l for l in al if l not in stop]
        for a in al:
            for b in u:
                if a != b: co[a][b] += 1
    step = {l: int(12 * ((rank[l] * PHI) % 1)) for l in cnt}
    octv = {l: 0 if cnt[l] >= 200 else 1 if cnt[l] >= 20 else 2 for l in cnt}
    rel = {l: JUST[step[l]] * 2 ** octv[l] for l in cnt}
    out = {}
    for l in cnt:
        comp = [b for b, _ in sorted(co[l].items(), key=lambda x: (-x[1], x[0]))[:2]]
        cs = [snap(rel[b] / rel[l]) for b in comp] + [0, 0]
        out[l] = [step[l], octv[l], cs[0], cs[1], cnt[l], first[l]]
    return out

ev, bv = verses(kjv), verses(bsb, TOTAL)
mine = signatures(ev)
both = signatures(ev + bv)
for l, sig in both.items():
    if l not in mine:
        mine[l] = sig[:5] + [sig[5] - TOTAL if sig[5] >= TOTAL else sig[5]]

shipped = json.load(open(os.path.join(ROOT, 'data/codebook/eng.json'), encoding='utf-8'))['lex']
fields = ['step', 'octave', 'c1', 'c2', 'count', 'first']
bad = Counter(); examples = []
for l in set(mine) | set(shipped):
    a, s = mine.get(l), shipped.get(l)
    if a is None or s is None:
        bad['missing' if a is None else 'extra'] += 1
        if len(examples) < 8: examples.append((l, a, s))
        continue
    if len(s) != 6: bad['not 6 fields'] += 1
    for i, f in enumerate(fields):
        if i < len(s) and a[i] != s[i]:
            bad[f] += 1
            if len(examples) < 8: examples.append((l, a, s))
print(f'verses {TOTAL}, rebuilt {len(mine)} entries, shipped {len(shipped)} entries')
print('mismatches:', dict(bad) if bad else 'none')
for e in examples: print('  ', e)
sys.exit(1 if bad else 0)
