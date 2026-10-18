#!/usr/bin/env python3
"""Run a test page (default tests/canon.html) in headless Chrome and report.

Serves the repository on a local port, opens the page at phone size over the
Chrome DevTools Protocol, waits until the page sets window.__canon.done (or
window.__law for tests/law.html), prints the summary and failures, and exits
0 only if every check passed. No Node needed.

Usage: python3 tools/run_canon.py [page] [timeout seconds]
  python3 tools/run_canon.py                      # tests/canon.html, 600 s
  python3 tools/run_canon.py tests/law.html 60
"""
import asyncio, base64, functools, http.server, json, os, socket, subprocess, sys, tempfile, threading, time, urllib.request
import websockets

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = sys.argv[1] if len(sys.argv) > 1 else 'tests/canon.html'
TIMEOUT = float(sys.argv[2]) if len(sys.argv) > 2 else 600

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

web, dbg = free_port(), free_port()
srv = http.server.ThreadingHTTPServer(('127.0.0.1', web), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
prof = tempfile.mkdtemp(prefix='canonprof')
chrome = subprocess.Popen(['google-chrome', '--headless=new', '--disable-gpu', f'--remote-debugging-port={dbg}',
                           f'--user-data-dir={prof}', '--window-size=412,860', 'about:blank'],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

STATE = ('JSON.stringify(window.__canon || (window.__law && {done: true, pass: __law.pass, total: __law.total, '
         'failures: __law.results.filter(r => !r.ok)}) || {done: false})')

async def main():
    for _ in range(100):
        try:
            tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{dbg}/json')); break
        except Exception:
            time.sleep(0.1)
    ws_url = [t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl']
    async with websockets.connect(ws_url, max_size=50_000_000, ping_interval=None) as ws:
        n = [0]; errors = []
        async def cmd(m, **p):
            n[0] += 1; await ws.send(json.dumps({'id': n[0], 'method': m, 'params': p}))
            while True:
                r = json.loads(await ws.recv())
                if r.get('method') == 'Runtime.exceptionThrown':
                    errors.append(r['params']['exceptionDetails'].get('exception', {}).get('description', 'error'))
                if r.get('id') == n[0]: return r.get('result', {})
        await cmd('Runtime.enable')
        await cmd('Emulation.setDeviceMetricsOverride', width=412, height=860, deviceScaleFactor=1, mobile=True)
        await cmd('Page.navigate', url=f'http://127.0.0.1:{web}/{PAGE}')
        t0 = time.time(); state = {'done': False}
        while time.time() - t0 < TIMEOUT:
            await asyncio.sleep(1)
            r = await cmd('Runtime.evaluate', expression=STATE, returnByValue=True)
            state = json.loads(r.get('result', {}).get('value') or '{"done": false}')
            if state.get('done') or errors: break
        return state, errors, time.time() - t0

try:
    state, errors, secs = asyncio.run(main())
finally:
    chrome.terminate(); srv.shutdown()
if errors:
    print('PAGE ERROR:', *errors[:3], sep='\n  '); sys.exit(2)
if not state.get('done'):
    print(f'TIMED OUT after {TIMEOUT:.0f} s:', json.dumps(state)[:500]); sys.exit(3)
fails = state.get('failures', [])
print(f"{state.get('pass')}/{state.get('total')} checks passed in {secs:.0f} s")
for k, v in (state.get('totals') or {}).items(): print(f'  {k}: {v}')
for f in fails[:40]: print('FAIL', f.get('name'), f.get('detail', ''))
if len(fails) > 40: print(f'… and {len(fails) - 40} more failures')
sys.exit(0 if not fails and state.get('pass') == state.get('total') else 1)
