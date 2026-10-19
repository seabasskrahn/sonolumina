#!/usr/bin/env python3
"""Day 4 of the whole Bible: each chapter's mean feeling (V), for the seasons strip.

Reads data/canon.json and data/vad/<Book>.json (VVAADD per verse, each 0..99) and writes
data/seasons.json = [mean V per chapter x 1,189], canonical order, 3 decimals. The same
mean is computed in law/seasons.js (meanV), and tests/law.html checks they agree.

Usage: python3 -I tools/build_seasons.py [repo root]
"""
import json, os, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
canon = json.load(open(os.path.join(ROOT, 'data/canon.json')))
out = []
for name, f, counts in canon:
    vad = json.load(open(os.path.join(ROOT, 'data/vad', f)))
    assert len(vad) == len(counts), name
    for c, s in enumerate(vad):
        n = len(s) // 6
        assert n == counts[c] and len(s) == 6 * n, (name, c + 1)
        out.append(round(sum(int(s[i * 6:i * 6 + 2]) / 99 for i in range(n)) / n, 3))
assert len(out) == 1189 and all(0 <= x <= 1 for x in out)
json.dump(out, open(os.path.join(ROOT, 'data/seasons.json'), 'w'), separators=(',', ':'))
print(f'{len(out)} chapters, mean V {min(out)}..{max(out)}')
