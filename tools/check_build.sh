#!/usr/bin/env bash
# Before pushing: the build number agrees everywhere, no key or secret is in the tree,
# no third-party script is loaded, and every JSON data file parses.
set -u
cd "$(dirname "$0")/.."
fail=0
b=$(python3 -c "import json;print(json.load(open('version.json'))['build'])")
for f in index.html; do
  grep -q "const BUILD = '$b'" "$f" || { echo "FAIL: $f BUILD is not $b"; fail=1; }
done
grep -rn "2026101815-p1" --include=*.html --include=*.js . && { echo "FAIL: old preview build number left"; fail=1; }
# Secrets: ElevenLabs keys (sk_...), generic long tokens assigned to key-like names, GitHub tokens.
if git grep -nIE "sk_[A-Za-z0-9]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|(api[_-]?key|xi-api-key|token)['\"]?\s*[:=]\s*['\"][A-Za-z0-9_\-]{24,}" -- . ':!tools/check_build.sh'; then echo "FAIL: something that looks like a key is in the tree"; fail=1; fi
[ -n "${ELEVENLABS_API_KEY:-}" ] && git grep -nF "$ELEVENLABS_API_KEY" -- . && { echo "FAIL: ELEVENLABS_API_KEY value found"; fail=1; }
# No third-party scripts.
if grep -nE "<script[^>]+src=['\"]?(https?:)?//" index.html; then echo "FAIL: third-party script"; fail=1; fi
python3 - <<'PY' || fail=1
import json, glob, sys
bad = [f for f in glob.glob('data/**/*.json', recursive=True) + ['version.json'] if not (lambda f: (json.load(open(f)), True))(f)]
print('json ok:', len(glob.glob('data/**/*.json', recursive=True)), 'files')
PY
[ $fail = 0 ] && echo "check_build: OK (build $b)" || { echo "check_build: FAILED"; exit 1; }
