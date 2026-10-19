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
        self.assertIn('John 11:35: unknown tag [shouting]', out)
        self.assertIn("John 11:1: text mismatch at word 9: got 'ill.', BSB has 'sick.'", out)
        self.assertIn('John 11:43: unbalanced [', out)
        self.assertIn('John 11:99: verse not in chapter', out)
    def test_bad_filename_and_json(self):
        with tempfile.TemporaryDirectory() as d:
            open(os.path.join(d, 'Nope.1.json'), 'w').write('{}')
            open(os.path.join(d, 'John.99.json'), 'w').write('{}')
            open(os.path.join(d, 'John.1.json'), 'w').write('{bad')
            rc, out = run('--src', d)
        self.assertEqual(rc, 1)
        self.assertIn('Nope.1.json: filename', out); self.assertIn('no chapter 99', out); self.assertIn('invalid JSON', out)
    def test_package(self):
        with tempfile.TemporaryDirectory() as d:
            rc, out = run('--src', os.path.join(FX, 'expression_good'), '--package', '--out', d)
            self.assertEqual(rc, 0, out)
            m = json.load(open(os.path.join(d, 'manifest.json')))
            self.assertEqual(m['totals'], {'chapters': 1, 'verses': 2})
            self.assertIn('John.11', json.load(open(os.path.join(d, 'expression.min.json'))))

if __name__ == '__main__': unittest.main(verbosity=2)
