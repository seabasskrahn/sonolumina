#!/usr/bin/env python3
"""Day 1 of the whole Bible: copy the Scripture data for all 66 books into data/, checking it as it goes.

Nothing here is typed by hand. Sources:
  OLD  the logos-theta app folder: bsb/ (Berean Standard Bible, public domain), xref/ (OpenBible.info
       cross references, CC-BY), index.html META (book names, files and verse counts)
  VAD  the feeling files written by tools/build_vad.py --headings --align
  PSA  the BSB's own Psalms USFM (bereanbible.com bsb_usfm, public domain): headings are its `\\d \\v 1` paragraphs

Writes:
  data/canon.json         [[name, file, [verse counts]] x 66], canonical order (bookIdx in xref = position here)
  data/bsb/<Book>.json    the text exactly as the source; Psalms also gains "h": {"<chapter>": heading}
  data/vad/<Book>.json    as built
  data/xref/<Book>.json   {"c.v": [[bookIdx, c, v, votes], ...]}; the old motif (gematria) and themeMask (keyword)
                          fields are dropped, and the one source key the BSB lacks (3 John 1:15) joins 1:14

Usage: python3 -I tools/build_data.py OLD VAD PSA OUT
"""
import json, os, re, sys

OLD, VAD, PSA, OUT = sys.argv[1:5]
for d in ('bsb', 'vad', 'xref'): os.makedirs(os.path.join(OUT, d), exist_ok=True)

html = open(os.path.join(OLD, 'index.html'), encoding='utf-8').read()
META = [[n, f, [int(x) for x in c.split(',')]]
        for n, f, c in re.findall(r'\["([^"]+)","([^"]+\.json)",\[([0-9,]+)\]', html.split('const META=')[1])[:66]]
assert len(META) == 66

def usfm_clean(s):
    s = re.sub(r'\\f .*?\\f\*', '', s); s = re.sub(r'\\x .*?\\x\*', '', s)
    s = re.sub(r'\\w ([^|\\]*)(\|[^\\]*)?\\w\*', r'\1', s)
    s = re.sub(r'\\v \d+\s*', '', s); s = re.sub(r'\\[a-z0-9+]+\*?', '', s)
    return ' '.join(s.split())
HEADS = {}
for m in re.finditer(r'^\\c (\d+)\s*$(.*?)(?=^\\c |\Z)', open(PSA, encoding='utf-8-sig').read(), re.S | re.M):
    d = re.search(r'^\\d (\\v 1 .*)$', m[2], re.M)
    if d: HEADS[m[1]] = usfm_clean(d[1])

chapters = slots = empty = 0
bsb = []
for name, f, counts in META:
    b = json.load(open(os.path.join(OLD, 'bsb', f), encoding='utf-8'))
    assert [len(c) for c in b['c']] == counts, name
    chapters += len(counts); slots += sum(counts); empty += sum(1 for c in b['c'] for v in c if not v.strip())
    if name == 'Psalms':
        for c, h in HEADS.items():
            assert ' '.join(b['c'][int(c) - 1][0].split()).startswith(h), (c, h)
        b['h'] = HEADS
    bsb.append(b)
    v = json.load(open(os.path.join(VAD, f), encoding='utf-8'))
    assert [len(s) for s in v] == [6 * n for n in counts] and all(s.isdigit() for s in v), name
    json.dump(b, open(os.path.join(OUT, 'bsb', f), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(v, open(os.path.join(OUT, 'vad', f), 'w'), separators=(',', ':'))
assert (chapters, slots, empty, len(HEADS)) == (1189, 31102, 16, 116), (chapters, slots, empty, len(HEADS))

links = moved = 0
for bi, (name, f, counts) in enumerate(META):
    x = json.load(open(os.path.join(OLD, 'xref', f), encoding='utf-8'))
    out = {}
    for key, refs in x.items():
        c, v = map(int, key.split('.'))
        if v > counts[c - 1]:                 # 3 John 1:15: the BSB keeps that greeting in 1:14
            assert (name, c, v) == ('3 John', 1, 15), (name, c, v); v = counts[c - 1]; moved += 1
        assert bsb[bi]['c'][c - 1][v - 1].strip(), (name, c, v)
        lst = out.setdefault(f'{c}.{v}', [])
        for tb, tc, tv, votes, *_ in refs:
            assert bsb[tb]['c'][tc - 1][tv - 1].strip() and votes > 0, (name, key, tb, tc, tv)
            if [tb, tc, tv] not in [r[:3] for r in lst]: lst.append([tb, tc, tv, votes]); links += 1
        lst.sort(key=lambda r: -r[3])
    json.dump(out, open(os.path.join(OUT, 'xref', f), 'w'), separators=(',', ':'))
json.dump(META, open(os.path.join(OUT, 'canon.json'), 'w'), separators=(',', ':'))
print(json.dumps({'books': 66, 'chapters': chapters, 'slots': slots, 'empty': empty, 'headings': len(HEADS),
                  'links': links, 'moved_keys': moved}))
