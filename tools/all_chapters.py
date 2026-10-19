#!/usr/bin/env python3
"""Preview build: open every chapter, Genesis 1 to Revelation 22, by its address (?Book.Chapter),
as a fresh page load at phone size, and fail on any console error, exception or failed request.
Every Nth chapter (and the first and last) also taps Begin and checks the sound starts.
Usage: python3 tools/all_chapters.py BASE_URL [every=60] [out.json]
"""
import asyncio, json, subprocess, sys, time, urllib.request, tempfile, socket
import websockets
base = sys.argv[1]; every = int(sys.argv[2]) if len(sys.argv) > 2 else 60; outp = sys.argv[3] if len(sys.argv) > 3 else '/tmp/all_chapters.json'
canon = json.load(urllib.request.urlopen(base + 'data/canon.json'))
chs = [(name, f[:-5], c + 1) for name, f, vc in canon for c in range(len(vc))]
def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p
dbg = free_port()
chrome = subprocess.Popen(['google-chrome', '--headless=new', '--disable-gpu', f'--remote-debugging-port={dbg}', f'--user-data-dir={tempfile.mkdtemp()}',
    '--autoplay-policy=no-user-gesture-required', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(100):
    try: tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{dbg}/json')); break
    except Exception: time.sleep(0.2)
ws_url = [t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl']
res = {'chapters': len(chs), 'loaded': 0, 'failed': [], 'errors': [], 'audio': []}
cur = ['']
async def main():
    async with websockets.connect(ws_url, max_size=100_000_000) as ws:
        n = [0]; waiting = {}
        async def reader():
            async for raw in ws:
                m = json.loads(raw)
                if 'id' in m and m['id'] in waiting: waiting.pop(m['id']).set_result(m.get('result'))
                meth, p = m.get('method'), m.get('params', {})
                if meth == 'Runtime.exceptionThrown': res['errors'].append([cur[0], 'exception', (p['exceptionDetails'].get('exception', {}).get('description') or p['exceptionDetails'].get('text'))[:300]])
                elif meth == 'Runtime.consoleAPICalled' and p['type'] == 'error': res['errors'].append([cur[0], 'console', ' '.join(str(a.get('value', a.get('description'))) for a in p['args'])[:300]])
                elif meth == 'Log.entryAdded' and p['entry']['level'] == 'error': res['errors'].append([cur[0], 'log', p['entry']['text'][:200], p['entry'].get('url')])
                elif meth == 'Network.responseReceived' and p['response']['status'] >= 400: res['errors'].append([cur[0], 'http', p['response']['status'], p['response']['url']])
        rt = asyncio.create_task(reader())
        async def cmd(meth, **params):
            n[0] += 1; f = asyncio.get_event_loop().create_future(); waiting[n[0]] = f
            await ws.send(json.dumps({'id': n[0], 'method': meth, 'params': params})); return await f
        for d in ('Runtime', 'Network', 'Log', 'Page'): await cmd(d + '.enable')
        await cmd('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=1, mobile=True)
        await cmd('Emulation.setTouchEmulationEnabled', enabled=True)
        async def ev(x):
            r = await cmd('Runtime.evaluate', expression=x, returnByValue=True, awaitPromise=True)
            return (r or {}).get('result', {}).get('value')
        t0 = time.time()
        for i, (name, f, c) in enumerate(chs):
            cur[0] = f'{f}.{c}'
            await cmd('Page.navigate', url=f'{base}?{f}.{c}')
            ok = False
            for _ in range(80):
                await asyncio.sleep(0.1)
                v = await ev("(()=>{try{return !!window.__app && document.getElementById('barRef').textContent.startsWith(%s) && document.getElementById('verse').innerText.length>0}catch(e){return false}})()" % json.dumps(f'{name} {c}:'))
                if v: ok = True; break
            if ok: res['loaded'] += 1
            else: res['failed'].append(cur[0])
            if ok and (i % every == 0 or i == len(chs) - 1):
                await ev("document.getElementById('play').click()")
                await asyncio.sleep(3)
                lv = await ev("JSON.stringify({level:__sono.level(), state:__app.state, v:__app.now&&__app.now.v})")
                res['audio'].append([cur[0], json.loads(lv)])
            if i % 100 == 0: print(f'{i}/{len(chs)} {time.time()-t0:.0f}s errors={len(res["errors"])} failed={len(res["failed"])}', flush=True)
        rt.cancel()
asyncio.run(main()); chrome.terminate()
json.dump(res, open(outp, 'w'), indent=1)
print(json.dumps({k: (v if not isinstance(v, list) else len(v)) for k, v in res.items()}))
print('failed', res['failed'][:20]); print('errors', res['errors'][:20])
print('audio', json.dumps(res['audio']))
sys.exit(1 if res['failed'] or res['errors'] else 0)
