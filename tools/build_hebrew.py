#!/usr/bin/env python3
"""Preview build: Hebrew for every Old Testament book in data/kjv/*.json ("h"), KJV verse numbers.

Source: Open Scriptures Hebrew Bible (Westminster Leningrad Codex), CC BY 4.0, folder wlc/ with VerseMap.xml.
Written consonantal (vowel points, accents and morpheme slashes removed; maqaf becomes a space), the same
form the Logos Theta Torah files used, so Genesis-Deuteronomy can be checked against them.
Verses are moved to KJV numbering by VerseMap.xml (full and partial pieces are joined into their KJV verse).
Usage: python3 tools/build_hebrew.py /path/to/morphhb/wlc [--check]
"""
import json, os, re, sys, unicodedata
import xml.etree.ElementTree as ET
src, check = sys.argv[1], '--check' in sys.argv
NS = {'o': 'http://www.bibletechnologies.net/2003/OSIS/namespace'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
canon = json.load(open(os.path.join(ROOT, 'data/canon.json')))
OSIS = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal']
vm = {}
for v in ET.parse(os.path.join(src, 'VerseMap.xml')).getroot().iter():
    if v.tag.endswith('verse') and v.get('wlc'):
        w, k = v.get('wlc').split('!')[0], v.get('kjv').split('!')[0]
        if k not in vm.setdefault(w, []): vm[w].append(k)
def clean(t):
    t = t.replace('/', '').replace('\u05be', ' ')
    t = ''.join(c for c in unicodedata.normalize('NFD', t) if not ('\u0591' <= c <= '\u05c7') or c in '\u05c0\u05c3\u05c6')
    t = t.replace('\u05c0', '').replace('\u05c3', '')
    return re.sub(r'\s+', ' ', t).strip()
report = []
for i, osis in enumerate(OSIS):
    name, file, vc = canon[i]
    tree = ET.parse(os.path.join(src, osis + '.xml'))
    out = [[''] * n for n in vc]
    placed = 0
    for verse in tree.getroot().iter('{%s}verse' % NS['o']):
        oid = verse.get('osisID')
        words = [clean(''.join(w.itertext())) for w in verse if w.tag.endswith('}w')]
        text = ' '.join(w for w in words if w)
        # A WLC verse split across two KJV verses is placed whole in the first (the Read view shows it once).
        for k in vm.get(oid, [oid])[:1]:
            _, c, v = k.split('.'); c, v = int(c), int(v)
            if c <= len(out) and v <= len(out[c - 1]):
                out[c - 1][v - 1] = (out[c - 1][v - 1] + ' ' + text).strip(); placed += 1
    empty = sum(1 for ch in out for t in ch if not t)
    p = os.path.join(ROOT, 'data/kjv', file)
    d = json.load(open(p))
    if check and 'h' in d:
        same = sum(1 for c, ch in enumerate(out) for v, t in enumerate(ch) if c < len(d['h']) and v < len(d['h'][c]) and d['h'][c][v] == t)
        report.append(f'{name}: {same}/{sum(vc)} verses identical to the Logos Theta Hebrew')
    if not check and 'h' in d:
        report.append(f'{name}: kept the Logos Theta Hebrew already in the file'); continue
    if not check:
        d['h'] = out
        json.dump(d, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    report.append(f'{name}: {placed} WLC verses placed, {empty} KJV slots empty')
print('\n'.join(report))
