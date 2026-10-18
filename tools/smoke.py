# Drive headless Chrome over CDP: open page, tap, wait, measure, screenshot.
import asyncio, json, subprocess, sys, time, base64, urllib.request, websockets
url, wait, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
EXPR = sys.argv[4] if len(sys.argv) > 4 else 'JSON.stringify({level:__sono.level, peakHz:__sono.peakHz(), verse:document.getElementById("verse").innerText})'
TARGET = sys.argv[5] if len(sys.argv) > 5 else 'tap'   # 'tap' (centre), 'notap', or a CSS selector
TAP = TARGET != 'notap'
p = subprocess.Popen(['google-chrome','--headless=new','--disable-gpu','--remote-debugging-port=9333',
  '--user-data-dir=/tmp/smokeprof','--window-size=412,860','about:blank'],
  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try: tabs=json.load(urllib.request.urlopen('http://127.0.0.1:9333/json')); break
    except Exception: time.sleep(0.2)
ws_url=[t for t in tabs if t['type']=='page'][0]['webSocketDebuggerUrl']
async def main():
    async with websockets.connect(ws_url, max_size=50_000_000) as ws:
        n=[0]
        async def cmd(m, **params):
            n[0]+=1; await ws.send(json.dumps({'id':n[0],'method':m,'params':params}))
            while True:
                r=json.loads(await ws.recv())
                if r.get('id')==n[0]: return r.get('result',{})
        await cmd('Runtime.enable')
        await cmd('Emulation.setDeviceMetricsOverride', width=412, height=860, deviceScaleFactor=1, mobile=True)
        await cmd('Page.navigate', url=url); await asyncio.sleep(2)
        x, y = 200, 430
        if TAP and TARGET != 'tap':
            r = await cmd('Runtime.evaluate', expression=f'JSON.stringify((r=>[r.x+r.width/2,r.y+r.height/2])(document.querySelector({json.dumps(TARGET)}).getBoundingClientRect()))', returnByValue=True)
            x, y = json.loads(r['result']['value'])
        for t in (('mousePressed','mouseReleased') if TAP else ()):
            await cmd('Input.dispatchMouseEvent', type=t, x=x, y=y, button='left', clickCount=1)
        await asyncio.sleep(wait)
        r=await cmd('Runtime.evaluate', expression=EXPR, returnByValue=True, awaitPromise=True)
        print(r['result'].get('value'))
        s=await cmd('Page.captureScreenshot'); open(out,'wb').write(base64.b64decode(s['data']))
asyncio.run(main()); p.terminate()
