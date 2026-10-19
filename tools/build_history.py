#!/usr/bin/env python3
"""After the Word (SPIRIT §11): approved history entries -> data/history.json.

Reads every history/approved/*.md (written by Claude, approved by Seabass) and checks it:
  - each entry has a title with its date in brackets, a body, a tied verse and at least one source
  - the tied verse names a real verse, and the quoted words appear exactly in the BSB text of it
  - the entries are in date order
Nothing in history/proposed/ is ever read.

Writes data/history.json = {"label", "entries": [{n, title, date, year, body, notes, ref: [bookIdx, c, v],
  cite, sources: [[text, url]]}]}. The sung text is not copied: the app reads the verse from data/bsb.

Usage: python3 -I tools/build_history.py [repo root]
"""
import glob, json, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
canon = json.load(open(os.path.join(ROOT, 'data/canon.json')))
def norm(s): return re.sub(r'\s+', ' ', s.replace('’', "'")).strip()
def book_of(name):
    k = name.replace(' ', '').lower()
    for i, (n, f, _) in enumerate(canon):
        if n.replace(' ', '').lower() == k or f[:-5].lower() == k: return i
    if k == 'psalm': return book_of('Psalms')
    raise SystemExit(f'unknown book: {name}')

entries = []
for path in sorted(glob.glob(os.path.join(ROOT, 'history/approved/*.md'))):
    text = open(path, encoding='utf-8').read()
    for block in re.split(r'^## ', text, flags=re.M)[1:]:
        head, _, rest = block.partition('\n')
        m = re.match(r'(\d+)\. (.+) \(([^()]+)\)\s*$', head)
        assert m, f'bad heading: {head}'
        n, title, date = int(m[1]), m[2], m[3]
        years = [int(y) for y in re.findall(r'\b(\d{3,4})\b', date)]
        assert years, f'no year in {date}'
        body = norm(rest.split('\n- **')[0].split('\n---')[0])
        bullets = {b.split('**')[0].rstrip(':'): b.split('**', 1)[1].lstrip(': ').strip()
                   for b in (x[4:] for x in re.findall(r'^- \*\*[^\n]+', rest, re.M))}
        tied = bullets.get('Tied to')
        assert tied and body, f'entry {n}: missing tie or body'
        q = re.match(r'"(.+)" \(((?:\d )?[A-Za-z ]+?) (\d+):(\d+)([ab]?)\)$', tied)
        assert q, f'entry {n}: bad tie {tied}'
        b, c, v = book_of(q[2]), int(q[3]), int(q[4])
        bsb = json.load(open(os.path.join(ROOT, 'data/bsb', canon[b][1]), encoding='utf-8'))
        assert c <= len(bsb['c']) and v <= len(bsb['c'][c - 1]), f'entry {n}: no such verse'
        assert norm(q[1]) in norm(bsb['c'][c - 1][v - 1]), f'entry {n}: quote differs from BSB {q[2]} {c}:{v}'
        sources = re.findall(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', bullets.get('Sources', ''))
        assert sources, f'entry {n}: no sources'
        notes = [f'{k}: {re.sub(r"[*]", "", v)}' for k, v in bullets.items() if k in ('Uncertain', 'Honest note')]
        entries.append({'n': n, 'title': title, 'date': date, 'year': years[0], 'body': body, 'notes': notes,
                        'ref': [b, c, v], 'cite': f'{canon[b][0]} {c}:{v}', 'sources': sources})
assert entries and all(entries[i]['year'] >= entries[i - 1]['year'] for i in range(1, len(entries))), 'not in date order'
out = {'label': 'History, not Scripture. Researched by Claude, approved by Seabass (SPIRIT §11).', 'entries': entries}
json.dump(out, open(os.path.join(ROOT, 'data/history.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(entries)} entries:', ', '.join(f"{e['year']} {e['cite']}" for e in entries))
