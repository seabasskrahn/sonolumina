#!/usr/bin/env python3
"""Write data/expression-meta/index.json: for each markup file in data/expression/ (the Scribe's format,
{"verse": "tagged text"}, left exactly as written so tools/build_expression.py from PR #1 still checks it),
the hash of each tagged verse's plain BSB text: {"Genesis.1": {"1": "8 hex", ...}, ...}.
The app uses a verse's markup only when this hash matches the plain text it is reading (so changed text
never gets stale tags), and only with the ElevenLabs v3 model. The hashes sit beside the files, not in them,
because the markup files must keep the Scribe's exact shape. Hash: FNV-1a 32-bit over the UTF-8 bytes of the plain text with
runs of whitespace collapsed and the ends trimmed, as 8 hex digits (form/eleven.js computes the same).
Runs tools/check_expression.py on every file first and stops on any problem.
The index also tells the app which chapters have markup, so it never asks for a missing file.
"""
import json, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, 'data/expression'), os.path.join(ROOT, 'data/expression-meta')
def fnv(s):
    h = 0x811c9dc5
    for b in re.sub(r'\s+', ' ', s).strip().encode('utf-8'):
        h = ((h ^ b) * 0x01000193) & 0xffffffff
    return f'{h:08x}'
index = {}
os.makedirs(OUT, exist_ok=True)
for f in sorted(os.listdir(SRC)):
    m = re.match(r'^(.+)\.(\d+)\.json$', f)
    if not m: continue
    book, ch = m[1], int(m[2])
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools/check_expression.py'), book, str(ch)], capture_output=True, text=True)
    print(r.stdout.strip())
    if not r.stdout.strip().endswith('OK'): sys.exit(f'{f}: markup check failed')
    src = json.load(open(os.path.join(SRC, f)))
    plain = json.load(open(os.path.join(ROOT, 'data/bsb', book + '.json')))['c'][ch - 1]
    index[f'{book}.{ch}'] = {k: fnv(plain[int(k) - 1]) for k, v in src.items() if re.search(r'\[[^\]]+\]', v)}
    print(f'  {f}: {len(index[book + "." + str(ch)])} tagged verses of {len(src)}')
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
print('chapters:', list(index))
