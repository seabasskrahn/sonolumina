#!/usr/bin/env python3
"""End-to-end checks for Talk in headless Chrome with a fake microphone (no key, no cost).
Usage: python3 tools/talk_e2e.py [base url]   (default: serves this repository on a local port)
Prints each check and exits 0 only if all pass. The live Gemini call itself is not exercised
beyond a deliberately invalid key (which must be refused, with the key never shown)."""
import asyncio, functools, http.server, json, os, socket, subprocess, sys, tempfile, threading, time, urllib.request
import websockets
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
if len(sys.argv) > 1: BASE = sys.argv[1].rstrip('/')
else:
    port = free_port(); srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); BASE = f'http://127.0.0.1:{port}'
results = []
def check(name, ok, detail=''):
    results.append(ok); print(('✓ ' if ok else '✗ ') + name + ('' if ok else f'  :: {detail}'))

def chrome(fake_ui=True):
    dbg = free_port(); prof = tempfile.mkdtemp(prefix='talkprof')
    args = ['google-chrome', '--headless=new', '--disable-gpu', f'--remote-debugging-port={dbg}', f'--user-data-dir={prof}',
            '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--window-size=412,860', 'about:blank']
    if fake_ui: args.insert(-1, '--use-fake-ui-for-media-stream')
    p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(100):
        try: tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{dbg}/json')); break
        except Exception: time.sleep(0.2)
    return p, [t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl'], dbg

class Tab:
    def __init__(self, ws): self.ws, self.n, self.errs = ws, 0, []
    async def cmd(self, m, **params):
        self.n += 1; await self.ws.send(json.dumps({'id': self.n, 'method': m, 'params': params}))
        while True:
            r = json.loads(await self.ws.recv())
            if r.get('method') == 'Runtime.exceptionThrown': self.errs.append(r['params']['exceptionDetails'].get('exception', {}).get('description', '?')[:300])
            if r.get('method') == 'Runtime.consoleAPICalled' and r['params']['type'] == 'error': self.errs.append(str(r['params']['args'])[:300])
            if r.get('id') == self.n: return r.get('result', {})
    async def ev(self, e):
        r = await self.cmd('Runtime.evaluate', expression=e, returnByValue=True, awaitPromise=True)
        return r['result'].get('value')
    async def go(self, url, wait=3): await self.cmd('Page.navigate', url=url); await asyncio.sleep(wait)
    async def btn(self, cls): return await self.ev(f'document.querySelector("#talk .{cls}").click()')
    async def until(self, expr, secs=6):
        for _ in range(int(secs * 10)):
            if await self.ev(expr): return True
            await asyncio.sleep(0.1)
        return False

async def main():
    p, ws_url, _ = chrome()
    async with websockets.connect(ws_url, max_size=50_000_000) as ws:
        t = Tab(ws); await t.cmd('Runtime.enable'); await t.cmd('Network.enable')
        await t.cmd('Emulation.setDeviceMetricsOverride', width=412, height=860, deviceScaleFactor=1, mobile=True)
        await t.go(BASE + '/tests/talk.html', 4)
        d = json.loads(await t.ev('JSON.stringify(window.__done || null)') or 'null')
        check(f'tests/talk.html: {d and d["pass"]}/{d and d["total"]}', d and d['pass'] == d['total'], d)

        await t.go(BASE + '/?John.1.1', 3)
        check('state is not exposed outside test mode', await t.ev('typeof window.__talk') == 'undefined')
        app = BASE + '/?John.1.1&talktest'
        await t.go(app, 3)
        await t.ev('localStorage.removeItem("sonolumina.geminiKey")')
        n0 = await t.ev('history.length')
        await t.ev('document.getElementById("talkbtn").click()')
        check('opening Talk adds a history step', await t.ev('history.length') == n0 + 1 and await t.ev('!!history.state?.talk'))
        check('test state holds no socket, URL or key', await t.ev('!("socket" in __talk) && !/key=|AIza|wss:/.test(JSON.stringify(__talk))'))

        # Overlap: reading playing, then a call: reading pauses and Begin/Resume is disabled.
        await t.ev('document.getElementById("play").click()'); await asyncio.sleep(1.5)
        await t.btn('demo')
        ok = await t.until('__talk.ready')
        check('demo call connects', ok, await t.ev('__talk.status'))
        check('reading paused and its button disabled during the call', await t.ev('document.getElementById("play").disabled && document.getElementById("play").textContent === "Resume"'), await t.ev('document.getElementById("play").textContent'))
        await t.until('__talk.gotAudio > 0', 6); await asyncio.sleep(0.6)
        check('mock reply heard and transcribed', await t.ev('__talk.transcript.some(x => x.who === "ai")'))
        check('echo guard held the mic while the reply played', await t.ev('__talk.gated > 0'), await t.ev('__talk.gated'))
        check('context fenced and carries John 1:1', await t.ev('(s => s.includes("BEGIN BSB TEXT: John 1") && s.includes("1:1 In the beginning was the Word") && s.includes("END BSB TEXT"))(__talk.setup.setup.systemInstruction.parts[0].text)'))
        await t.ev('(i=>{i.value="Who is the Word?"; i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter"}))})(document.querySelector("#talk input[type=text]"))')
        await t.until('!document.querySelector("#talk .hush").disabled', 3)
        await t.btn('hush'); await asyncio.sleep(0.2)
        check('Stop reply cuts the voice at once', await t.ev('__talk.hushed === 1 && document.querySelector("#talk .hush").disabled'))
        # Backgrounding.
        await t.ev('Object.defineProperty(document, "visibilityState", {value: "hidden", configurable: true}); document.dispatchEvent(new Event("visibilitychange"))')
        await asyncio.sleep(0.3)
        check('going to the background ends the call and frees Begin', await t.ev('/background/.test(__talk.status) && !document.getElementById("play").disabled'), await t.ev('__talk.status'))
        await t.ev('delete document.visibilityState')
        await t.btn('demo'); await t.until('__talk.ready')
        await t.ev('dispatchEvent(new Event("pagehide"))'); await asyncio.sleep(0.3)
        check('pagehide ends the call', await t.ev('__talk.status === "Call ended." && !__talk.ready'))
        # Android Back: closes the panel, ends the call, stays in the app.
        await t.btn('demo'); await t.until('__talk.ready')
        here = await t.ev('location.pathname + location.search')
        await t.ev('history.back()'); await asyncio.sleep(0.6)
        check('Back closes Talk, ends the call, stays in the app', await t.ev('document.getElementById("talk").hidden && !__talk.ready') and await t.ev('location.pathname + location.search') == here, await t.ev('location.href'))
        # goAway.
        await t.ev('window.__talkMock = "goaway"; document.getElementById("talkbtn").click()'); await asyncio.sleep(0.2)
        await t.btn('demo'); await asyncio.sleep(1.2)
        check('goAway ends the call cleanly with a message', await t.ev('/time limit/.test(__talk.status) && !__talk.ready'), await t.ev('__talk.status'))
        # Connect timeout.
        await t.ev('window.__talkMock = "silent"'); await t.btn('demo'); await asyncio.sleep(10.8)
        check('no answer in 10 s gives a clear timeout', await t.ev('/within 10 seconds/.test(__talk.status) && document.querySelector("#talk .call").textContent === "Start talking"'), await t.ev('__talk.status'))
        await t.ev('window.__talkMock = "ok"')
        # Offline.
        await t.ev('localStorage.setItem("sonolumina.geminiKey","not-a-real-key")')
        await t.cmd('Network.emulateNetworkConditions', offline=True, latency=0, downloadThroughput=-1, uploadThroughput=-1)
        await asyncio.sleep(0.3); await t.btn('call'); await asyncio.sleep(0.5)
        check('offline is said plainly, and no call starts', await t.ev('/offline/.test(__talk.status) && document.querySelector("#talk .call").textContent === "Start talking"'), await t.ev('__talk.status'))
        await t.cmd('Network.emulateNetworkConditions', offline=False, latency=0, downloadThroughput=-1, uploadThroughput=-1)
        await asyncio.sleep(0.5)
        # Real endpoint, invalid key.
        await t.btn('call'); await t.until('document.querySelector("#talk .call").textContent === "Start talking"', 12)
        check('real Google endpoint refuses a bad key, said plainly, key not shown', await t.ev('/did not accept the key/.test(__talk.status) && !/not-a-real-key/.test(document.body.innerText)'), await t.ev('__talk.status + " | " + __talk.error'))
        await t.ev('localStorage.removeItem("sonolumina.geminiKey")')
        check('no page errors', not t.errs, t.errs)
    p.terminate()
    # Microphone denied (a fresh Chrome without the auto-allow flag).
    p, ws_url, _ = chrome(fake_ui=False)
    async with websockets.connect(ws_url, max_size=50_000_000) as ws:
        t = Tab(ws); await t.cmd('Runtime.enable')
        origin = BASE.split('/', 3); origin = '/'.join(origin[:3])
        await t.cmd('Browser.setPermission', permission={'name': 'audioCapture'}, setting='denied', origin=origin)
        await t.go(app, 3)
        await t.ev('document.getElementById("talkbtn").click()'); await t.btn('demo'); await t.until('__talk.ready', 5); await asyncio.sleep(0.3)
        check('microphone denied: explains how to allow it in site settings', await t.ev('/microphone is blocked/.test(__talk.status) && /Permissions|Website Settings/.test(__talk.status)'), await t.ev('__talk.status'))
    p.terminate()
    print(f'{sum(results)}/{len(results)} passed')
    sys.exit(0 if all(results) else 1)
asyncio.run(main())
