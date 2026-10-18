#!/usr/bin/env python3
"""Rebuild the English codebook R(w) by the Law: rank by frequency.

The Law (thesis §3.5.1): "Count f(w) over B; rank by descending f with r = 1 for
the most common word; s(w) = floor(12 · frac(r(w) · φ))." Seabass confirmed on
2026-10-18 that frequency rank replaces the old order of first appearance.

Everything else stays as decided:
  octave  = 0 / 1 / 2 for f >= 200 / 20-199 / < 20 (Q4, unchanged)
  c1, c2  = the 2 most frequent verse companions (the 40 most common stems excluded),
            snapped to the data table {1, 5/4, 4/3, 3/2, 2} (Seabass: "use the data table")
  universe: KJV stems ranked by KJV frequency; stems only the BSB has are ranked after
            them by BSB frequency (Q1/Q2 unchanged: English stems, KJV first)
  ties in frequency: broken by first appearance (Claude's call; any fixed rule would do)

Entry: [step, octave, c1, c2, count, first_verse], same 6 fields as before.

Usage: python3 -I tools/build_codebook_law.py <dir with kjv/ and bsb/> <out eng.json> [old eng.json for a change report]
"""
import sys, os, re, json, math
from collections import Counter, defaultdict

SRC, OUT = sys.argv[1], sys.argv[2]
OLD = sys.argv[3] if len(sys.argv) > 3 else None
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
    return [(base + gi(b, ci + 1, vi + 1), [s for s in map(stem, t.split()) if s])
            for b in BOOKS for ci, ch in enumerate(text[b]) for vi, t in enumerate(ch)]

def stats(vs):
    cnt, first, order = Counter(), {}, {}
    for g, ls in sorted(vs, key=lambda x: x[0]):
        for l in ls:
            cnt[l] += 1
            first.setdefault(l, g)
            order.setdefault(l, len(order))
    return cnt, first, order

def companions(vs, cnt):
    stop = {l for l, _ in cnt.most_common(40)}
    co = defaultdict(Counter)
    for g, ls in vs:
        al = set(ls); u = [l for l in al if l not in stop]
        for a in al:
            for b in u:
                if a != b: co[a][b] += 1
    return co

ev, bv = verses(kjv), verses(bsb, TOTAL)
k_cnt, k_first, k_order = stats(ev)
a_cnt, a_first, a_order = stats(ev + bv)

# Ranks: r = 1 for the most common KJV stem; BSB-only stems continue after, by BSB frequency.
kjv_stems = sorted(k_cnt, key=lambda l: (-k_cnt[l], k_order[l]))
bsb_only = sorted((l for l in a_cnt if l not in k_cnt), key=lambda l: (-a_cnt[l], a_order[l]))
rank = {l: i + 1 for i, l in enumerate(kjv_stems + bsb_only)}
count = {**{l: k_cnt[l] for l in kjv_stems}, **{l: a_cnt[l] for l in bsb_only}}
first = {**{l: k_first[l] for l in kjv_stems},
         **{l: a_first[l] - TOTAL if a_first[l] >= TOTAL else a_first[l] for l in bsb_only}}

step = {l: int(12 * ((rank[l] * PHI) % 1)) for l in rank}
octv = {l: 0 if count[l] >= 200 else 1 if count[l] >= 20 else 2 for l in rank}
rel = {l: JUST[step[l]] * 2 ** octv[l] for l in rank}
co_k, co_a = companions(ev, k_cnt), companions(ev + bv, a_cnt)

lex = {}
for l in rank:
    co = co_k if l in k_cnt else co_a
    comp = [b for b, _ in sorted(co[l].items(), key=lambda x: (-x[1], x[0]))[:2]]
    cs = [snap(rel[b] / rel[l]) for b in comp] + [0, 0]
    lex[l] = [step[l], octv[l], cs[0], cs[1], count[l], first[l]]

json.dump({'lex': lex, 'rank': 'frequency (r = 1 most common; ties by first appearance)',
           'cons': CONS}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

# Self-checks of the Law.
steps = Counter(step.values())
top = kjv_stems[0]
print(f'entries {len(lex)} (KJV {len(kjv_stems)}, BSB-only {len(bsb_only)}); most common stem "{top}" '
      f'({k_cnt[top]}x) rank 1 -> step {step[top]} (Law: 7 = 3/2)')
print('steps 0-11:', [steps[i] for i in range(12)], f'max deviation {max(steps.values()) - min(steps.values())}')
assert step[top] == 7, 'rank 1 must give step 7'
if OLD:
    old = json.load(open(OLD, encoding='utf-8'))['lex']
    same_keys = set(old) == set(lex)
    diff = Counter()
    for l in lex:
        o = old.get(l)
        if not o: continue
        if o[0] != lex[l][0]: diff['step'] += 1
        if o[1] != lex[l][1]: diff['octave'] += 1
        if o[2:4] != lex[l][2:4]: diff['companions'] += 1
        if o[4:6] != lex[l][4:6]: diff['count/first'] += 1
    print(f'against the old codebook: same stems {same_keys}; changed {dict(diff)} of {len(lex)}')
    for w in ('god', 'lord', 'light', 'love', 'jesu', 'amen'):
        if w in lex and w in old:
            print(f'  {w}: old step {old[w][0]} ({JUST[old[w][0]]:.4g}) -> new step {lex[w][0]} ({JUST[lex[w][0]]:.4g}), rank {rank[w]}')
