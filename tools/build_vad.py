#!/usr/bin/env python3
"""Per-verse feeling E(v) = (valence, arousal, dominance) -> data/vad/<Book>.json.

Ported from logos-theta tools/build_vad.py (build 2026101222), whose scoring, blend, percentiles and
smoothing are kept exactly. Two corrections, each switchable so its effect can be measured on its own:

  --headings  Psalm headings ("A Psalm of David...") are shown, never felt (Seabass, 2026-10-18).
              BSB: the heading is the publisher's own \\d paragraph at verse 1 (bereanbible.com bsb_usfm, public domain).
              WEB: the \\d paragraph before verse 1 (ebible.org engwebp_usfm, public domain).
              Hebrew: the words before the OSHB's own <note>KJV:Ps.N.1</note> marker.
              KJV text has no headings.
  --align     Hebrew words are counted in the English (KJV) verse they belong to, by the OSHB's own
              wlc/VerseMap.xml and in-verse <note>KJV:...</note> markers. The old build used Hebrew verse
              numbers clamped to the English count, which put each Hebrew verse one slot off wherever the
              numbering differs (most Psalms with headings, Malachi 4, Joel 2-3 and others).
  (no flag)   reproduces the old build exactly; used to prove the port.

Lexicon: NRC VAD Lexicon v1 (Saif M. Mohammad, National Research Council Canada, 2018), research and
non-commercial use with credit. It is a modern English word list, not from Scripture. Only per-verse
scores are shipped, never the lexicon.

Usage: python3 -I tools/build_vad.py SRC APP OUT [--headings] [--align]
  SRC: nrcvad/, web/engwebp_vpl.txt, webusfm/, bsbusfm/, morphhb/wlc/, sblgnt/, strongs-*-dictionary.js, meta.json
  APP: a folder with bsb/ and kjv/ (the old app's text files)
  OUT: folder to write <Book>.json into
"""
import sys, os, json, re, math, glob, unicodedata

args = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC, APP, OUT = args
HEADINGS, ALIGN = '--headings' in sys.argv, '--align' in sys.argv
os.makedirs(OUT, exist_ok=True)

# ---- scoring (unchanged from the old build) ----
LEX = {}
for line in open(glob.glob(os.path.join(SRC, 'nrcvad/*/NRC-VAD-Lexicon.txt'))[0], encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) == 4:
        try: LEX[p[0]] = tuple(map(float, p[1:]))
        except ValueError: pass
ARCH = {'saith': 'say', 'hath': 'have', 'doth': 'do', 'spake': 'speak', 'shew': 'show', 'shewed': 'show', 'smote': 'strike', 'slew': 'kill',
        'wrought': 'work', 'begat': 'beget', 'sware': 'swear', 'brake': 'break', 'wept': 'weep', 'gat': 'get', 'clave': 'cleave'}
def norm(w): return re.sub(r'[^a-z]', '', w.lower().replace('’', "'").split("'")[0])
def look(w):
    w = ARCH.get(w, w)
    if not w: return None
    if w in LEX: return LEX[w]
    for suf in ('eth', 'est', 'ed', 'es', 's', 'ing', 'ly'):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            b = w[:-len(suf)]
            for c in (b, b + 'e', b[:-1] if len(b) > 3 and b[-1] == b[-2] else None):
                if c and c in LEX: return LEX[c]
    return None
NAMES = {'god', 'lord', 'jesus', 'christ', 'gods', 'lords', 'yahweh', 'jehovah'}
NEG = {'not', 'no', 'never', 'nor', 'neither', 'none', 'without', 'cannot', 'nothing', 'nt'}
def sal(x): return 0.25 + abs(x[0] - 0.5) + abs(x[1] - 0.5)
def score_text(t):
    toks = [norm(w) for w in re.split(r"\s+|—|-", t.replace("n't", " nt"))]; toks = [w for w in toks if w]
    m = []
    for i, w in enumerate(toks):
        if w in NAMES or w in NEG: continue
        x = look(w)
        if not x: continue
        if any(p in NEG for p in toks[max(0, i - 3):i]): x = (0.5 - (x[0] - 0.5) * 0.5, 0.5 + (x[1] - 0.5) * 0.5, x[2])
        m.append(x)
    if not m: return None
    ws = [sal(x) for x in m]
    return tuple(sum(w * x[i] for w, x in zip(ws, m)) / sum(ws) for i in range(3))

META = json.load(open(os.path.join(SRC, 'meta.json')))
NAMESB = [b for b, _ in META]
OFF = {}; n = 0
for b, cs in META:
    for c, k in enumerate(cs):
        OFF[(b, c + 1)] = n; n += k
TOTAL = n
def gi(b, c, v): return OFF[(b, c)] + v - 1
def cnt(b, c): return META[NAMESB.index(b)][1][c - 1]

# ---- Psalm headings, from the publishers' own markup ----
def usfm_clean(s):
    s = re.sub(r'\\f .*?\\f\*', '', s); s = re.sub(r'\\x .*?\\x\*', '', s)
    s = re.sub(r'\\w ([^|\\]*)(\|[^\\]*)?\\w\*', r'\1', s)
    s = re.sub(r'\\v \d+\s*', '', s); s = re.sub(r'\\[a-z0-9+]+\*?', '', s)
    return ' '.join(s.split())
def psalm_heads(path, with_verse):
    """{chapter: heading text}. BSB writes '\\d \\v 1 ...'; WEB writes '\\d ...' before '\\v 1'."""
    out = {}
    for m in re.finditer(r'^\\c (\d+)\s*$(.*?)(?=^\\c |\Z)', open(path, encoding='utf-8-sig').read(), re.S | re.M):
        body = m[2]
        if with_verse: d = re.search(r'^\\d (\\v 1 .*)$', body, re.M)
        else:
            v1 = body.find('\\v 1 ')
            d = re.search(r'^\\d (.*)$', body[:v1], re.M) if v1 >= 0 else None
        if d: out[int(m[1])] = usfm_clean(d[1])
    return out
def strip_head(text, head):
    t = ' '.join(text.split())
    if not t.startswith(head): raise SystemExit(f'heading not at start of verse 1: {head!r} / {t[:80]!r}')
    return t[len(head):].strip()
BSB_HEADS = psalm_heads(glob.glob(os.path.join(SRC, 'bsbusfm/*PSA*.usfm'))[0], True)
WEB_HEADS = psalm_heads(glob.glob(os.path.join(SRC, 'webusfm/*PSA*.usfm'))[0], False)

def from_json(d, heads=None):
    out = [None] * TOTAL
    for b, cs in META:
        j = json.load(open(os.path.join(APP, d, b.replace(' ', '') + '.json'), encoding='utf-8'))
        for ci, ch in enumerate(j['c']):
            for vi, t in enumerate(ch[:cs[ci]]):
                if heads and b == 'Psalms' and vi == 0 and ci + 1 in heads: t = strip_head(t, heads[ci + 1])
                out[gi(b, ci + 1, vi + 1)] = score_text(t) if t else None
    return out
kjv, bsb = from_json('kjv'), from_json('bsb', BSB_HEADS if HEADINGS else None)

web = [None] * TOTAL; codes = []; wt = {}
for l in open(os.path.join(SRC, 'web/engwebp_vpl.txt'), encoding='utf-8-sig'):
    m = re.match(r'^(\w+) (\d+):(\d+) (.*)', l.strip())
    if not m: continue
    if m[1] not in codes: codes.append(m[1])
    wt[(m[1], int(m[2]), int(m[3]))] = m[4]
assert len(codes) == 66, codes
web_stripped = 0
for (cd, c, v), t in wt.items():
    b, cs = META[codes.index(cd)]
    if HEADINGS and b == 'Psalms' and v == 1 and c in WEB_HEADS: t = strip_head(t, WEB_HEADS[c]); web_stripped += 1
    if c <= len(cs) and v <= cs[c - 1]: web[gi(b, c, v)] = score_text(t)

# ---- Hebrew and Greek lemmas per English verse ----
OSIS = dict(Gen='Genesis', Exod='Exodus', Lev='Leviticus', Num='Numbers', Deut='Deuteronomy', Josh='Joshua', Judg='Judges', Ruth='Ruth',
            **{'1Sam': '1 Samuel', '2Sam': '2 Samuel', '1Kgs': '1 Kings', '2Kgs': '2 Kings', '1Chr': '1 Chronicles', '2Chr': '2 Chronicles'},
            Ezra='Ezra', Neh='Nehemiah', Esth='Esther', Job='Job', Ps='Psalms', Prov='Proverbs', Eccl='Ecclesiastes', Song='Song of Solomon',
            Isa='Isaiah', Jer='Jeremiah', Lam='Lamentations', Ezek='Ezekiel', Dan='Daniel', Hos='Hosea', Joel='Joel', Amos='Amos', Obad='Obadiah',
            Jonah='Jonah', Mic='Micah', Nah='Nahum', Hab='Habakkuk', Zeph='Zephaniah', Hag='Haggai', Zech='Zechariah', Mal='Malachi')
def canon(name):
    k = re.sub(r'\W', '', name).lower()
    for b in NAMESB:
        if re.sub(r'\W', '', b).lower() == k: return b
    raise KeyError(name)
def heb_lemmas(seg):
    ls = []
    for w in re.finditer(r'<w lemma="([^"]*)"[^>]*>', seg):
        nums = [re.match(r'\d+', s)[0] for s in w[1].split('/') if re.match(r'\d+', s)]
        if nums: ls.append('H' + nums[-1])
    return ls
WLC = os.path.join(SRC, 'morphhb/wlc')
VMAP = {m[1]: re.sub(r'!.*', '', m[2]) for m in re.finditer(r'<verse wlc="([^"]+)" kjv="([^"]+)"', open(os.path.join(WLC, 'VerseMap.xml'), encoding='utf-8').read())}
hv = []; heb_head_words = 0; heb_moved = 0
for f in glob.glob(os.path.join(WLC, '*.xml')):
    osis = os.path.basename(f)[:-4]
    if osis not in OSIS: continue
    b = canon(OSIS[osis]); x = open(f, encoding='utf-8').read()
    if not ALIGN and not HEADINGS:
        for m in re.finditer(r'<verse osisID="[^.]+\.(\d+)\.(\d+)"[^>]*>(.*?)</verse>', x, re.S):   # old: Hebrew numbers, clamped
            c, v = int(m[1]), int(m[2])
            if c > len(META[NAMESB.index(b)][1]): continue
            hv.append((gi(b, c, min(v, cnt(b, c))), heb_lemmas(m[3])))
        continue
    for chm in re.finditer(r'<chapter osisID="[^.]+\.(\d+)">(.*?)</chapter>', x, re.S):
        hc, body = int(chm[1]), chm[2]
        if HEADINGS and osis == 'Ps':
            i = body.find(f'<note>KJV:Ps.{hc}.1</note>')
            if i >= 0:
                heb_head_words += len(re.findall(r'<w ', body[:i]))
                body = re.sub(r'<w [^>]*>', '', body[:i]) + body[i:]   # heading words removed, verse tags kept
        for m in re.finditer(r'<verse osisID="([^"]+)"[^>]*>(.*?)</verse>', body, re.S):
            ref = m[1]
            if ALIGN:
                tgt = VMAP.get(ref, ref)
                parts = re.split(r'<note>KJV:([^<]+)</note>', m[2])   # text, ref, text, ref, ...
                segs = [(tgt, parts[0])] + [(re.sub(r'!.*', '', parts[i]), parts[i + 1]) for i in range(1, len(parts), 2)]
            else:
                segs = [(ref, m[2])]
            for r, seg in segs:
                _, c, v = r.split('.'); c, v = int(c), int(v)
                ls = heb_lemmas(seg)
                if not ls: continue
                if ALIGN:
                    assert c <= len(META[NAMESB.index(b)][1]) and 1 <= v <= cnt(b, c), (ref, r)
                    if r != ref: heb_moved += 1
                    hv.append((gi(b, c, v), ls))
                else:
                    if c > len(META[NAMESB.index(b)][1]): continue
                    hv.append((gi(b, c, min(v, cnt(b, c))), ls))
def strip_acc(s): return ''.join(ch for ch in unicodedata.normalize('NFD', s) if not unicodedata.combining(ch)).lower()
gv, cur, ls = [], None, []
for f in sorted(glob.glob(os.path.join(SRC, 'sblgnt/*-morphgnt.txt'))):
    for line in open(f, encoding='utf-8'):
        p = line.split()
        if len(p) < 7: continue
        bk = int(p[0][:2]) - 1 + 39; c, v = int(p[0][2:4]), int(p[0][4:6])
        if (bk, c, v) != cur:
            if cur: gv.append((cur, ls))
            cur, ls = (bk, c, v), []
        ls.append('G' + p[6])
gv.append((cur, ls))
def gi_clamp(b, c, v):
    c = min(c, len(META[NAMESB.index(b)][1])); return OFF[(b, c)] + min(v, cnt(b, c)) - 1
gv = [(gi_clamp(NAMESB[bk], c, v), l) for (bk, c, v), l in gv]   # Greek: as the old build (clamped)

def dic(f):
    s = open(os.path.join(SRC, f), encoding='utf-8').read(); return json.loads(s[s.index('{'):s.rindex('}') + 1])
HD, GD = dic('strongs-hebrew-dictionary.js'), dic('strongs-greek-dictionary.js')
DIV = {'H430', 'H410', 'H433', 'H3068', 'H3069', 'H136', 'H3050', 'G2316', 'G2962', 'G2424', 'G5547'}
def gloss_vec(e):
    d = (e.get('strongs_def') or '') + ' ' + (e.get('kjv_def') or '')
    if re.search(r'\b(a name|an Israelite|a place|an Edomite|a Levite|a city|a son of|patronymic|Gentilic|a town|a mountain|a region)\b', d, re.I): return None
    sd = (e.get('strongs_def') or e.get('kjv_def') or '').split(';')[0]
    return score_text(re.sub(r'\([^)]*\)', ' ', sd)[:160])
GV = {k: (None if k in DIV else gloss_vec(e)) for k, e in HD.items()}
GL = {}
for k, e in GD.items():
    if 'lemma' in e: GL[strip_acc(e['lemma'])] = None if k in DIV else gloss_vec(e)
gloss = [None] * TOTAL
def put(pairs, key, table, merge):
    if merge:   # aligned: every Hebrew segment counted in its English verse
        acc = {}
        for i, lem in pairs: acc.setdefault(i, []).extend(lem)
        pairs = list(acc.items())
    for i, lem in pairs:   # old behaviour: a later verse mapped to the same slot replaces it
        m = [x for x in (table.get(key(l)) for l in lem) if x]
        if m:
            ws = [sal(x) for x in m]; gloss[i] = tuple(sum(w * x[d] for w, x in zip(ws, m)) / sum(ws) for d in range(3))
        elif merge: gloss[i] = None
put(hv, lambda x: re.sub(r'[a-z]$', '', x), GV, ALIGN)
put(gv, lambda x: strip_acc(x[1:]), GL, False)

# ---- blend, percentiles, smoothing (unchanged) ----
SRCS = [(bsb, .35), (web, .25), (gloss, .30), (kjv, .10)]
def pctl(raw):
    idx = [i for i, x in enumerate(raw) if x]; out = [None] * TOTAL
    for d in range(3):
        o = sorted(idx, key=lambda k: raw[k][d])
        for r, k in enumerate(o): out[k] = (out[k] or []) + [r / (len(o) - 1)]
    return out
P = [(pctl(r), w) for r, w in SRCS]
blend = []
for i in range(TOTAL):
    have = [(p[i], w) for p, w in P if p[i]]
    blend.append([sum(x[d] * w for x, w in have) / sum(w for _, w in have) for d in range(3)] if have else [0.5] * 3)
for b, cs in META:
    idx = [list(range(OFF[(b, c + 1)], OFF[(b, c + 1)] + n)) for c, n in enumerate(cs)]
    flat = [j for c in idx for j in c]; bm = [sum(blend[j][d] for j in flat) / len(flat) for d in range(3)]
    out = []
    for c in idx:
        s = ''
        for a, j in enumerate(c):
            e = []
            for d in range(3):
                ws = [(math.exp(-((a - q) ** 2) / 8), blend[c[q]][d]) for q in range(len(c)) if abs(a - q) <= 6]
                arc = sum(w * x for w, x in ws) / sum(w for w, _ in ws)
                e.append(min(99, int(round(99 * (0.45 * blend[j][d] + 0.35 * arc + 0.20 * bm[d])))))
            s += '%02d%02d%02d' % tuple(e)
        out.append(s)
    json.dump(out, open(os.path.join(OUT, b.replace(' ', '') + '.json'), 'w'), separators=(',', ':'))
print(json.dumps({'headings': HEADINGS, 'align': ALIGN, 'bsb_heads': len(BSB_HEADS), 'web_heads': len(WEB_HEADS),
                  'web_stripped': web_stripped, 'heb_heading_words': heb_head_words, 'heb_segments_moved': heb_moved}))
