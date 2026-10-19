#!/usr/bin/env python3
"""Validate / package Sonolumina verse expression markup (stdlib only, offline).

Input:  data/expression/<Book>.<Chapter>.json   {"<verse>": "tagged text", ...}
        <Book> = the data/bsb file stem from data/canon.json (e.g. Genesis, 1John,
        SongofSolomon); the canon display name with spaces removed is also accepted.
Rules (tools/expression_tags.json, from the Scribe's GUIDE.md and its
"Decisions for the validator"):
  * exact, case-sensitive [tone] tags (max 2/verse) and [short pause]/[long pause]
    (max 2/verse); one space after a tag (warning otherwise); a pause may not split
    a word or a name like "LORD God", nor sit inside a quotation's first 3 words.
  * with every [tag] removed the text equals the BSB verse apart from whitespace.
  * every verse of the chapter must have a key; blank BSB verses (e.g. Matt 17:21)
    must be "" exactly, and "" on a non-blank verse is an error. Blanks are skipped
    in the package.
Exit 1 on any error; warnings alone exit 0.

Usage: build_expression.py [--check] [--package] [--root DIR] [--src DIR] [--out DIR]
"""
import argparse, hashlib, json, os, re, sys

TAG_RE = re.compile(r'\[([^\[\]]*)\]')
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

def strip_markup(text, cfg, where, errs, warns):
    tone, pause = set(cfg['tone_tags']), set(cfg['pause_tags'])
    n_tone = 0
    for mo in TAG_RE.finditer(text):
        t = mo.group(1)
        if t in tone: n_tone += 1
        elif t not in pause:
            errs.append(f'{where}: tag not allowed [{t}]'); continue
        nxt = text[mo.end():mo.end() + 2]
        if mo.end() < len(text) and not (nxt[:1] == ' ' and nxt[1:2] not in ('', ' ')):
            warns.append(f'{where}: [{t}] should be followed by exactly one space')
    pauses = [mo for mo in TAG_RE.finditer(text) if mo.group(1) in pause]
    if len(pauses) > cfg['max_pause_tags_per_verse']:
        errs.append(f'{where}: {len(pauses)} pause tags (max {cfg["max_pause_tags_per_verse"]})')
    for mo in pauses:
        before, after = text[:mo.start()], text[mo.end():]
        if before[-1:].isalnum() and after[:1].isalnum():
            errs.append(f'{where}: [{mo.group(1)}] splits a word')
        b_words = TAG_RE.sub(' ', before).split(); a_words = TAG_RE.sub(' ', after).split()
        for name in cfg.get('no_split_names', []):
            nw = name.split()
            for k in range(1, len(nw)):
                if b_words[-k:] == nw[:k] and [w.strip('.,;:!?”’') for w in a_words[:len(nw) - k]] == nw[k:]:
                    errs.append(f'{where}: [{mo.group(1)}] splits the name "{name}"')
        # inside the first N words of a quotation?
        opens = cfg.get('quote_open_marks', [])
        for i in range(len(b_words) - 1, max(0, len(b_words) - cfg.get('quote_head_words', 3)) - 1, -1):
            if b_words[i][:1] in opens:
                if not any(q in ' '.join(b_words[i:]) for q in ('”', '’')):
                    errs.append(f'{where}: [{mo.group(1)}] inside the first {cfg.get("quote_head_words", 3)} words of a quotation')
                break
    if n_tone > cfg['max_tone_tags_per_verse']:
        errs.append(f'{where}: {n_tone} tone tags (max {cfg["max_tone_tags_per_verse"]})')
    out = TAG_RE.sub(' ', text)
    for ch, what in (('[', 'unbalanced ['), (']', 'unbalanced ]')):
        if ch in out:
            errs.append(f'{where}: {what}')
            out = out.replace(ch, ' ')
    return out

def fnv(s):
    """FNV-1a 32-bit of whitespace-collapsed text, 8 hex (same as form/eleven.js and build_expression_hashes.py)."""
    h = 0x811c9dc5
    for b in norm(s).encode('utf-8'):
        h = ((h ^ b) * 0x01000193) & 0xffffffff
    return f'{h:08x}'

def first_diff(got, want):
    g, w = got.split(), want.split()
    for i in range(max(len(g), len(w))):
        a = g[i] if i < len(g) else '<end>'
        b = w[i] if i < len(w) else '<end>'
        if a != b:
            return i + 1, a, b
    return None

def check_file(path, canon, bsb_cache, cfg, root, errs, warns, plain):
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
    missing = [str(i) for i in range(1, len(verses) + 1) if str(i) not in data]
    if missing:
        errs.append(f'{name} {ch}: missing verse key(s) {",".join(missing[:10])}{"..." if len(missing) > 10 else ""} (file must have all {len(verses)}; blank BSB verses as "")')
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
            if v != '':
                errs.append(f'{where}: BSB verse is blank; value must be "" (no tags or text)')
            continue  # blank verse: valid, but skipped in the package
        if v == '':
            errs.append(f'{where}: empty value but BSB verse has text'); continue
        got = strip_markup(v, cfg, where, errs, warns)
        if norm(got) != want:
            d = first_diff(norm(got), want)
            errs.append(f'{where}: text mismatch at word {d[0]}: got {d[1]!r}, BSB has {d[2]!r}')
            continue
        clean[k] = v
    plain[fn[:-5]] = {k: fnv(verses[int(k) - 1]) for k, v in clean.items() if TAG_RE.search(v)}
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
    errs, warns, ok, cache, plain = [], [], {}, {}, {}
    for f in files:
        r = check_file(os.path.join(src, f), canon, cache, cfg, a.root, errs, warns, plain)
        if r: ok[r[0]] = r[1]
    nv = sum(len(v) for v in ok.values())
    for w in warns: print('WARNING', w)
    for e in errs: print('ERROR', e)
    print(f'{len(files)} file(s), {len(ok)} clean, {nv} verse(s) valid, {len(warns)} warning(s), {len(errs)} error(s)')
    if errs: return 1
    if a.package:
        out = a.out or os.path.join(a.root, 'data', 'expression-pkg')
        os.makedirs(out, exist_ok=True)
        blob = json.dumps(ok, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode('utf-8')
        open(os.path.join(out, 'expression.min.json'), 'wb').write(blob)
        for k, v in ok.items():  # one file per chapter, same name and shape as the source
            open(os.path.join(out, k + '.json'), 'w', encoding='utf-8').write(json.dumps(v, ensure_ascii=False, separators=(',', ':')))
        man = {'tags': 'tools/expression_tags.json (Scribe GUIDE.md)', 'bundle': 'expression.min.json',
               'sha256': hashlib.sha256(blob).hexdigest(), 'bytes': len(blob),
               'chapters': {k: {'file': k + '.json', 'verses': len(v), 'plain_fnv': plain.get(k, {}), 'sha256': hashlib.sha256(json.dumps(v, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()} for k, v in sorted(ok.items())},
               'totals': {'chapters': len(ok), 'verses': nv}}
        open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8').write(json.dumps(man, indent=1) + '\n')
        print(f'packaged -> {os.path.relpath(out, a.root)}/expression.min.json ({len(blob)} bytes) + per-chapter files + manifest.json')
    return 0

if __name__ == '__main__':
    sys.exit(main())
