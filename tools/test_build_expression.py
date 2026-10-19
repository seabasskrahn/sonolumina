#!/usr/bin/env python3
"""Run: python3 tools/test_build_expression.py"""
import io, json, os, sys, tempfile, unittest, contextlib
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import build_expression as be
FX = os.path.join(HERE, 'fixtures')

def run(*args):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf): rc = be.main(list(args))
    return rc, buf.getvalue()

class T(unittest.TestCase):
    def test_good(self):
        rc, out = run('--src', os.path.join(FX, 'expression_good'))
        self.assertEqual(rc, 0, out)
    def test_bad(self):
        rc, out = run('--src', os.path.join(FX, 'expression_bad'))
        self.assertEqual(rc, 1)
        self.assertIn('John 11:35: tag not allowed [Solemn]', out)
        self.assertIn('John 11:44: 3 tone tags (max 2)', out)
        self.assertIn("John 11:1: text mismatch at word 9: got 'ill.', BSB has 'sick.'", out)
        self.assertIn('John 11:43: unbalanced [', out)
        self.assertIn('John 11:99: verse not in chapter', out)
        self.assertIn('John 11: missing verse key(s)', out)
        self.assertIn('Matthew 17:21: BSB verse is blank; value must be ""', out)
        self.assertIn('Matthew 17:20: empty value but BSB verse has text', out)
        self.assertIn('Genesis 2:4: [short pause] splits the name "LORD God"', out)
        self.assertIn('Genesis 2:16: [short pause] inside the first 3 words of a quotation', out)
        self.assertIn('Genesis 2:17: 3 pause tags (max 2)', out)
        self.assertIn('Genesis 2:18: [short pause] splits a word', out)
    def test_blank_verse_ok_and_skipped(self):
        with tempfile.TemporaryDirectory() as d:
            rc, out = run('--src', os.path.join(FX, 'expression_blank'), '--package', '--out', d)
            self.assertEqual(rc, 0, out)
            pkg = json.load(open(os.path.join(d, 'Matthew.17.json')))
            self.assertNotIn('21', pkg); self.assertIn('20', pkg)
    def test_bad_filename_and_json(self):
        with tempfile.TemporaryDirectory() as d:
            open(os.path.join(d, 'Nope.1.json'), 'w').write('{}')
            open(os.path.join(d, 'John.99.json'), 'w').write('{}')
            open(os.path.join(d, 'John.1.json'), 'w').write('{bad')
            open(os.path.join(d, 'John.2.json'), 'w').write('[]')
            rc, out = run('--src', d)
        self.assertEqual(rc, 1)
        self.assertIn('Nope.1.json: filename', out); self.assertIn('no chapter 99', out); self.assertIn('invalid JSON', out); self.assertIn('John.2.json: top level', out)
    def test_package(self):
        with tempfile.TemporaryDirectory() as d:
            rc, out = run('--src', os.path.join(FX, 'expression_good'), '--package', '--out', d)
            self.assertEqual(rc, 0, out)
            m = json.load(open(os.path.join(d, 'manifest.json')))
            self.assertEqual(m['totals']['chapters'], 3)
            self.assertIn('Genesis.1', json.load(open(os.path.join(d, 'expression.min.json'))))
            src = json.load(open(os.path.join(FX, 'expression_good', 'Genesis.3.json')))
            self.assertEqual(json.load(open(os.path.join(d, 'Genesis.3.json'))), src)

    def test_tags_match_scribe(self):
        import re
        cfg = json.load(open(os.path.join(HERE, 'expression_tags.json')))
        ours = {f'[{t}]' for t in cfg['tone_tags'] + cfg['pause_tags']}
        self.assertEqual(len(cfg['tone_tags']), 13); self.assertEqual(cfg['pause_tags'], ['short pause', 'long pause'])
        ce = os.path.join(HERE, 'check_expression.py')   # the Scribe's checker as copied to main
        if os.path.exists(ce):
            self.assertEqual(ours, set(re.findall(r"'(\[[^\]]+\])'", re.search(r'ALLOWED=\{(.*?)\}', open(ce).read()).group(1))))
        guide = '/workspace/sonolumina-expression/GUIDE.md'
        if os.path.exists(guide):
            sec = open(guide).read().split('## Allowed tags')[1].split('## ')[0]
            self.assertEqual(ours, set(re.findall(r'`(\[[^\]]+\])`', sec)))
    def test_hashes_match_main(self):
        with tempfile.TemporaryDirectory() as d:
            run('--src', os.path.join(FX, 'expression_good'), '--package', '--out', d)
            m = json.load(open(os.path.join(d, 'manifest.json')))
            idx = os.path.join(os.path.dirname(HERE), 'data', 'expression-meta', 'index.json')
            if os.path.exists(idx):
                self.assertEqual(json.load(open(idx))['Genesis.1'], m['chapters']['Genesis.1']['plain_fnv'])

if __name__ == '__main__': unittest.main(verbosity=2)
