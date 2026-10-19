#!/usr/bin/env python3
"""Validate / package Sonolumina verse expression markup (stdlib only, offline).

Input:  data/expression/<Book>.<Chapter>.json   {"<verse>": "tagged text", ...}
        <Book> = the data/bsb file stem from data/canon.json (e.g. Genesis, 1John,
        SongofSolomon); the canon display name with spaces removed is also accepted.
Allowed markup (tools/expression_tags.json, DRAFT pending the Scribe's spec):
  [tag]                 ElevenLabs-style audio tag from "audio_tags"
  ... / … / —           pause marks from "pause_marks" (only checked as markup; a
                        mark that is literally in the BSB text is still fine)
  <break time="1.5s"/>  SSML-ish break, 0 < X <= break_max_seconds
Check: after removing markup, the words must equal the BSB verse (whitespace-normalized).

Usage: build_expression.py [--check] [--package] [--root DIR] [--src DIR] [--out DIR]
"""
import argparse, hashlib, json, os, re, sys

TAG_RE = re.compile(r'\[([^\[\]]*)\]')
BREAK_RE = re.compile(r'<break\s+time="(\d+(?:\.\d+)?)(s|ms)"\s*/>')
FNAME_RE = re.compile(r'^(.+)\.(\d+)\.json$')

def load_canon(root):
    canon = json.load(open(os.path.join(root, 'data', 'canon.json'), encoding='utf-8'))
    m = {}
    for name, fname, counts in canon:
        stem = fname[:-5]
        m[stem] = m[name.replace(' ', '')] = (name, fname, counts)
    return m

def norm(s):
    return ' '.join(s.split())

def strip_markup(text, cfg, where, errs):
    allowed = {t.lower() for t in cfg['audio_tags']}
    def tag(mo):
        t = mo.group(1).strip().lower()
        if t not in allowed:
            errs.append(f'{where}: unknown tag [{mo.group(1)}]')
        return ' '
    out = TAG_RE.sub(tag, text)
    def brk(mo):
        sec = float(mo.group(1)) / (1000 if mo.group(2) == 'ms' else 1)
        if not 0 < sec <= cfg['break_max_seconds']:
            errs.append(f'{where}: break time {mo.group(0)} out of range (0, {cfg["break_max_seconds"]}s]')
        return ' '
    out = BREAK_RE.sub(brk, out)
    for ch, what in (('[', 'unbalanced ['), (']', 'unbalanced ]'), ('<', 'malformed <...> markup'), ('>', 'malformed <...> markup')):
        if ch in out:
            errs.append(f'{where}: {what}')
            out = out.replace(ch, ' ')
    return out

def drop_marks(s, marks):
    for m in sorted(marks, key=len, reverse=True):
        s = s.replace(m, ' ')
    return norm(s)

def first_diff(got, want):
    g, w = got.split(), want.split()
    for i in range(max(len(g), len(w))):
        a = g[i] if i < len(g) else '<end>'
        b = w[i] if i < len(w) else '<end>'
        if a != b:
            return i + 1, a, b
    return None

def check_file(path, canon, bsb_cache, cfg, root, errs):
    fn = os.path.basename(path)
    mo = FNAME_RE.match(fn)
    if not mo or mo.group(1) not in canon:
        errs.append(f'{fn}: filename must be <Book>.<Chapter>.json with a canon book'); return None
    name, bfile, counts = canon[mo.group(1)]
    ch = int(mo.group(2))
    if not 1 <= ch <= len(counts):
        errs.append(f'{fn}: {name} has no chapter {ch}'); return None
    try:
        data = json.load(open(path, encoding='utf-8'))
    except (ValueError, UnicodeDecodeError) as e:
        errs.append(f'{fn}: invalid JSON: {e}'); return None
    if not isinstance(data, dict) or not data:
        errs.append(f'{fn}: top level must be a non-empty object {{"verse": "text"}}'); return None
    if bfile not in bsb_cache:
        bsb_cache[bfile] = json.load(open(os.path.join(root, 'data', 'bsb', bfile), encoding='utf-8'))
    verses = bsb_cache[bfile]['c'][ch - 1]
    n0 = len(errs); clean = {}
    for k, v in data.items():
        where = f'{name} {ch}:{k}'
        if not re.fullmatch(r'[1-9]\d*', k):
            errs.append(f'{where}: verse key must be a positive integer string'); continue
        vn = int(k)
        if vn > len(verses):
            errs.append(f'{where}: verse not in chapter (has {len(verses)})'); continue
        if not isinstance(v, str):
            errs.append(f'{where}: value must be a string'); continue
        want = norm(verses[vn - 1])
        if not want:
            errs.append(f'{where}: BSB verse is blank in data/bsb (no text to mark up)'); continue
        got = strip_markup(v, cfg, where, errs)
        marks = cfg['pause_marks']
        if norm(got) != want and drop_marks(got, marks) != drop_marks(want, marks):
            d = first_diff(norm(got), want)
            errs.append(f'{where}: text mismatch at word {d[0]}: got {d[1]!r}, BSB has {d[2]!r}')
            continue
        clean[k] = v
    return (fn[:-5], dict(sorted(clean.items(), key=lambda kv: int(kv[0])))) if len(errs) == n0 else None

def main(argv=None):
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true', help='validate only (default)')
    ap.add_argument('--package', action='store_true', help='validate, then write data/expression-pkg/')
    ap.add_argument('--root', default=os.path.dirname(here))
    ap.add_argument('--src', help='expression dir (default <root>/data/expression)')
    ap.add_argument('--out', help='package dir (default <root>/data/expression-pkg)')
    ap.add_argument('--tags', default=os.path.join(here, 'expression_tags.json'))
    a = ap.parse_args(argv)
    src = a.src or os.path.join(a.root, 'data', 'expression')
    cfg = json.load(open(a.tags, encoding='utf-8'))
    canon = load_canon(a.root)
    files = sorted(f for f in os.listdir(src) if f.endswith('.json')) if os.path.isdir(src) else []
    errs, ok, cache = [], {}, {}
    for f in files:
        r = check_file(os.path.join(src, f), canon, cache, cfg, a.root, errs)
        if r: ok[r[0]] = r[1]
    nv = sum(len(v) for v in ok.values())
    for e in errs: print('ERROR', e)
    print(f'{len(files)} file(s), {len(ok)} clean, {nv} verse(s) valid, {len(errs)} error(s)')
    if errs: return 1
    if a.package:
        out = a.out or os.path.join(a.root, 'data', 'expression-pkg')
        os.makedirs(out, exist_ok=True)
        blob = json.dumps(ok, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode('utf-8')
        open(os.path.join(out, 'expression.min.json'), 'wb').write(blob)
        man = {'status': 'draft tag allowlist', 'bundle': 'expression.min.json',
               'sha256': hashlib.sha256(blob).hexdigest(), 'bytes': len(blob),
               'chapters': {k: {'verses': len(v), 'sha256': hashlib.sha256(json.dumps(v, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()} for k, v in sorted(ok.items())},
               'totals': {'chapters': len(ok), 'verses': nv}}
        open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8').write(json.dumps(man, indent=1) + '\n')
        print(f'packaged -> {os.path.relpath(out, a.root)}/expression.min.json ({len(blob)} bytes) + manifest.json')
    return 0

if __name__ == '__main__':
    sys.exit(main())
