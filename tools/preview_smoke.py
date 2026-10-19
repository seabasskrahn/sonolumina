#!/usr/bin/env python3
"""Preview build smoke: drive headless Chrome over CDP through a scripted list of steps,
capturing console errors, uncaught exceptions and failed or 4xx/5xx requests.

Usage: python3 tools/preview_smoke.py BASE_URL steps.json [--fresh]
steps.json: [{"go": "?Genesis.1"}, {"wait": 2}, {"click": "#play"}, {"eval": "expr", "label": "x"}, {"shot": "/path.png"}, {"reload": true}]
Prints one JSON line per eval and a final JSON summary; exits 1 if any error was seen.
"""
import asyncio, json, subprocess, sys, time, base64, urllib.request, tempfile, socket
import websockets

base, steps = sys.argv[1], json.load(open(sys.argv[2]))
def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p
dbg = free_port()
prof = tempfile.mkdtemp(prefix='pvsmoke')
chrome = subprocess.Popen(['google-chrome', '--headless=new', '--disable-gpu', f'--remote-debugging-port={dbg}', f'--user-data-dir={prof}',
    '--autoplay-policy=no-user-gesture-required', '--window-size=412,860', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(100):
    try: tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{dbg}/json')); break
    except Exception: time.sleep(0.2)
ws_url = [t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl']
errors, requests = [], {}
async def main():
    async with websockets.connect(ws_url, max_size=100_000_000) as ws:
        n = [0]; waiting = {}
        async def reader():
            async for raw in ws:
                m = json.loads(raw)
                if 'id' in m and m['id'] in waiting: waiting.pop(m['id']).set_result(m.get('result', m.get('error')))
                meth, p = m.get('method'), m.get('params', {})
                if meth == 'Runtime.exceptionThrown':
                    d = p['exceptionDetails']; errors.append({'type': 'exception', 'text': (d.get('exception', {}).get('description') or d.get('text'))[:400], 'url': d.get('url')})
                elif meth == 'Runtime.consoleAPICalled' and p['type'] in ('error', 'assert'):
                    errors.append({'type': 'console', 'text': ' '.join(str(a.get('value', a.get('description', ''))) for a in p['args'])[:400]})
                elif meth == 'Log.entryAdded' and p['entry']['level'] == 'error':
                    errors.append({'type': 'log', 'text': p['entry']['text'][:300], 'url': p['entry'].get('url')})
                elif meth == 'Network.responseReceived':
                    r = p['response']; requests[r['url']] = r['status']
                    if r['status'] >= 400: errors.append({'type': 'http', 'status': r['status'], 'url': r['url']})
                elif meth == 'Network.loadingFailed' and not p.get('canceled'):
                    errors.append({'type': 'netfail', 'text': p.get('errorText'), 'id': p.get('requestId')})
        rt = asyncio.create_task(reader())
        async def cmd(meth, **params):
            n[0] += 1; f = asyncio.get_event_loop().create_future(); waiting[n[0]] = f
            await ws.send(json.dumps({'id': n[0], 'method': meth, 'params': params})); return await f
        for d in ('Runtime', 'Network', 'Log', 'Page'): await cmd(d + '.enable')
        await cmd('Emulation.setDeviceMetricsOverride', width=412, height=860, deviceScaleFactor=2, mobile=True)
        async def ev(expr):
            r = await cmd('Runtime.evaluate', expression=expr, returnByValue=True, awaitPromise=True)
            if r and 'exceptionDetails' in r: return {'error': r['exceptionDetails'].get('exception', {}).get('description', '')[:300]}
            return r.get('result', {}).get('value') if r else None
        for st in steps:
            if 'go' in st: await cmd('Page.navigate', url=base + st['go']); await asyncio.sleep(st.get('settle', 2.5))
            elif 'reload' in st: await cmd('Page.reload'); await asyncio.sleep(2.5)
            elif 'wait' in st: await asyncio.sleep(st['wait'])
            elif 'click' in st:
                r = await ev(f'(e=>{{if(!e)return null;e.scrollIntoView({{block:"center"}});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}})(document.querySelector({json.dumps(st["click"])}))')
                if not r: errors.append({'type': 'step', 'text': 'no element ' + st['click']}); continue
                for t in ('mousePressed', 'mouseReleased'):
                    await cmd('Input.dispatchMouseEvent', type=t, x=r[0], y=r[1], button='left', clickCount=1)
                await asyncio.sleep(st.get('after', 0.4))
            elif 'eval' in st:
                v = await ev(st['eval']); print(json.dumps({st.get('label', 'eval'): v}), flush=True)
                if isinstance(v, dict) and v.get('error'): errors.append({'type': 'eval', 'text': v['error']})
            elif 'shot' in st:
                s = await cmd('Page.captureScreenshot'); open(st['shot'], 'wb').write(base64.b64decode(s['data']))
        rt.cancel()
asyncio.run(main()); chrome.terminate()
bad = [u for u, s in requests.items() if s >= 400]
print(json.dumps({'requests': len(requests), 'bad': bad, 'errors': errors}, indent=1))
sys.exit(1 if errors else 0)
