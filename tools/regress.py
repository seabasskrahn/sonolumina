#!/usr/bin/env python3
"""Regression checks for build 2026101818 in headless Chrome at phone size (390x844, touch), no Node needed.
Covers: Genesis 1 opens on the verse Begin plays (bug 1); Back keeps the screen and player in step with the
address and never leaves the app (bug 2); nothing on Listen sits under the player bar (bug 3); speed − at 0.5x
stays at 0.5x (bug 4); the speed maximum holds for chips, dial and typed values (bug 5); the ☰ menu (feature);
and the smaller fixes (Forget key, sleep sheet, toast position, picker, aria, Origins quotes, quick verse taps).
Usage: python3 tools/regress.py [base url] [screenshot dir]   (default: serves this repository locally)
Exits 0 only if every check passes."""
import asyncio, base64, functools, http.server, json, os, socket, subprocess, sys, tempfile, threading, time, urllib.request
import websockets
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
if len(sys.argv) > 1 and sys.argv[1].startswith('http'): BASE = sys.argv[1].rstrip('/')
else:
    port = free_port(); srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); BASE = f'http://127.0.0.1:{port}'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
W, H = 390, 844
results = []
def check(name, ok, detail=''):
    results.append(bool(ok)); print(('✓ ' if ok else '✗ ') + name + (f'  :: {detail}' if (detail and not ok) or os.environ.get('VERBOSE') else ''))

class Tab:
    def __init__(self, ws): self.ws, self.n, self.errs = ws, 0, []
    async def cmd(self, m, **params):
        self.n += 1; await self.ws.send(json.dumps({'id': self.n, 'method': m, 'params': params}))
        while True:
            r = json.loads(await self.ws.recv())
            if r.get('method') == 'Runtime.exceptionThrown': self.errs.append(r['params']['exceptionDetails'].get('exception', {}).get('description', '?')[:300])
            if r.get('id') == self.n: return r.get('result', {})
    async def js(self, expr):
        r = await self.cmd('Runtime.evaluate', expression=expr, returnByValue=True, awaitPromise=True)
        if 'exceptionDetails' in r: raise RuntimeError(f'{expr[:80]}: {r["exceptionDetails"].get("exception", {}).get("description", r["exceptionDetails"])}')
        return r.get('result', {}).get('value')
    async def tap(self, sel):
        pos = await self.js(f'(e=>{{if(!e)return null;e.scrollIntoView({{block:"nearest"}});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}})(document.querySelector({json.dumps(sel)}))')
        if not pos: raise RuntimeError('no element ' + sel)
        x, y = pos
        await self.cmd('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': x, 'y': y}])
        await self.cmd('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
        await asyncio.sleep(0.05)
    async def back(self, wait=0.6):
        await self.js('history.back()'); await asyncio.sleep(wait)
    async def shot(self, name):
        if not SHOTS: return
        os.makedirs(SHOTS, exist_ok=True)
        s = await self.cmd('Page.captureScreenshot'); open(os.path.join(SHOTS, name), 'wb').write(base64.b64decode(s['data']))
    async def open(self, path, wait=2.5, clear=True):
        if clear: await self.cmd('Page.navigate', url=BASE + '/version.json'); await asyncio.sleep(0.4); await self.js('localStorage.clear()')
        await self.cmd('Page.navigate', url=BASE + '/' + path)
        for _ in range(60):
            await asyncio.sleep(0.25)
            if await self.js('!!window.__app'): break
        await asyncio.sleep(wait)

async def run():
    dbg = free_port(); prof = tempfile.mkdtemp(prefix='regprof')
    chrome = subprocess.Popen(['google-chrome', '--headless=new', '--disable-gpu', f'--remote-debugging-port={dbg}', f'--user-data-dir={prof}',
                               '--autoplay-policy=no-user-gesture-required', f'--window-size={W},{H}', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try: tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{dbg}/json')); break
            except Exception: time.sleep(0.2)
        ws_url = [t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl']
        async with websockets.connect(ws_url, max_size=50_000_000, ping_interval=None) as ws:
            t = Tab(ws)
            await t.cmd('Runtime.enable')
            await t.cmd('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True)
            await t.cmd('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
            await body(t)
            check('no page errors', not t.errs, t.errs[:3])
    finally:
        chrome.terminate()

async def body(t):
    # ---- bug 1: Genesis 1 opens on 1:1 and Begin plays 1:1 ----
    await t.open('?Genesis.1')
    ref = await t.js('document.getElementById("ref").textContent')
    bar = await t.js('document.getElementById("barRef").textContent + " | " + document.getElementById("barSub").textContent')
    check('bug 1: fresh ?Genesis.1 shows Genesis 1:1 on Listen', ref.startswith('Genesis 1:1 '), ref)
    check('bug 1: player bar agrees (1:1, verse 1 of 31)', bar.startswith('Genesis 1:1 |') and 'verse 1 of 31' in bar, bar)
    # ---- bug 3: Begin / Voice on / Talk clear of the player bar, at 390 and 400 wide ----
    async def clear_of_bar():
        return await t.js('''(()=>{const b=document.getElementById("bar").getBoundingClientRect().top;
          return ["play","voice","talkbtn"].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,bottom:Math.round(r.bottom),bar:Math.round(b),ok:r.bottom<=b&&r.top>=0}})})()''')
    c = await clear_of_bar()
    check('bug 3: at 390x844 Begin, Voice on and Talk are fully above the player bar on first load', all(x['ok'] for x in c), c)
    await t.shot('01_gen1_fresh_390.png')
    await t.cmd('Emulation.setDeviceMetricsOverride', width=400, height=844, deviceScaleFactor=2, mobile=True); await asyncio.sleep(0.6)
    c = await clear_of_bar()
    check('bug 3: at 400x844 too', all(x['ok'] for x in c), c)
    await t.cmd('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True); await asyncio.sleep(0.6)
    pad = await t.js('parseFloat(getComputedStyle(document.body).paddingBottom) >= document.getElementById("bar").offsetHeight + document.getElementById("tabs").offsetHeight')
    check('bug 3: page keeps room under its content for the bar and tabs', pad)
    # Begin plays from 1:1
    await t.tap('#play'); await asyncio.sleep(1.6)
    v = await t.js('JSON.stringify({now: __app.now && __app.now.v, ref: document.getElementById("ref").textContent, bar: document.getElementById("barRef").textContent})')
    v = json.loads(v)
    check('bug 1: Begin starts on verse 1 (display and player)', v['now'] == 1 and v['ref'].startswith('Genesis 1:1 ') and v['bar'] == 'Genesis 1:1', v)
    # ...and with Start where I left off on (default), a reload of ?Genesis.1 after hearing 1:1 still shows and plays 1:1
    await t.open('?Genesis.1', clear=False)
    ref = await t.js('document.getElementById("ref").textContent'); bar = await t.js('document.getElementById("barRef").textContent')
    st = await t.js('JSON.stringify([__S.resume, localStorage.getItem("sonolumina.last")])')
    check('bug 1: resume on, reopened ?Genesis.1: Listen and bar agree on the start verse', ref.split(' · ')[0] == bar, f'{ref} vs {bar} {st}')
    await t.tap('#play'); await asyncio.sleep(1.6)
    v = json.loads(await t.js('JSON.stringify({now: __app.now && __app.now.v, bar: document.getElementById("barRef").textContent})'))
    check('bug 1: resume on, Begin plays the verse that was shown', 'Genesis 1:%d' % (v['now'] or 0) == bar, (v, bar))
    await t.js('__app.toggle()')

    # ---- bug 2: Back keeps screen and player in step with the address ----
    await t.open('?Genesis.1')
    await t.tap('#tabs [data-tab=read]'); await asyncio.sleep(0.8)
    await t.tap('#rdPlay'); await asyncio.sleep(1.2)
    for _ in range(5): await t.tap('#nch'); await asyncio.sleep(0.7)
    for _ in range(3): await t.tap('#pch'); await asyncio.sleep(0.7)
    h = json.loads(await t.js('JSON.stringify(__hist())'))
    check('bug 2: after Play chapter, next ×5, previous ×3: on Genesis 3', h['cur'] == 'Genesis.3' and h['search'].startswith('?Genesis.3'), h)
    async def synced(label, want_addr, want_tab=None):
        s = json.loads(await t.js('JSON.stringify({h: __hist(), bar: document.getElementById("barRef").textContent, where: document.getElementById("where").textContent, playing: __app.now && (__app.now.ch.name + " " + __app.now.ch.ref.chapter), state: __app.state})'))
        a = want_addr.replace('.', ' ')
        ok = (s['h']['search'].split('&')[0] == '?' + want_addr and s['h']['cur'] == want_addr and s['where'].startswith(a)
              and s['bar'].startswith(a + ':') and (s['state'] != 'playing' or s['playing'] == a) and (want_tab is None or s['h']['tab'] == want_tab))
        check(label, ok, s)
    await t.back(); await synced('bug 2: Back → Genesis 4, screen, player and address agree', 'Genesis.4', 'listen')
    await t.shot('02_back_gen4_synced.png')
    await t.back(); await synced('bug 2: Back again → Genesis 5, still in step', 'Genesis.5')
    await t.back(); await synced('bug 2: Back again → Genesis 6 (the chapters visited, in order)', 'Genesis.6')
    for _ in range(5): await t.back()
    await synced('bug 2: Back through Gen 5…2 to Genesis 1 on Listen', 'Genesis.1', 'listen')
    await t.back(); await synced('bug 2: Back → the Read screen it came from (Genesis 1)', 'Genesis.1', 'read')
    for _ in range(3): await t.back()
    h = json.loads(await t.js('JSON.stringify(__hist())'))
    check('bug 2: Back at the first screen stays in the app', h['search'].startswith('?Genesis.1') and await t.js('!!window.__app'), h)
    await synced('bug 2: …and the first screen still matches its address', 'Genesis.1')
    # Back closes an open sheet first, without changing the screen
    await t.tap('#tbSpd'); await asyncio.sleep(0.4)
    await t.back()
    s = await t.js('[document.getElementById("sheet").hidden, __hist().cur]')
    check('bug 2: Back closes an open sheet first, screen unchanged', s[0] and s[1] == 'Genesis.1', s)
    # not playing: chapter nav pushes steps, Back walks them and stops the right chapter
    await t.tap('#next'); await asyncio.sleep(0.8); await t.tap('#next'); await asyncio.sleep(0.8)
    await t.back(); await synced('bug 2: (not playing) Back from Genesis 3 → Genesis 2', 'Genesis.2')

    # ---- bug 4 / 5: speed limits ----
    await t.open('?Genesis.1')
    await t.tap('#tbSpd'); await asyncio.sleep(0.4)
    await t.tap('#sheetB [data-sp="0.5"]'); await asyncio.sleep(0.2)
    await t.tap('#dialW [data-d="-1"]'); await asyncio.sleep(0.3)
    sp = await t.js('__S.speed')
    check('bug 4: speed − at 0.5× stays at 0.5×', sp == 0.5, sp)
    await t.tap('#dialW [data-d="1"]'); await asyncio.sleep(0.3)
    check('bug 4: + from 0.5× goes to 0.75×', await t.js('__S.speed') == 0.75)
    await t.js('document.querySelector("#dialW .mx").value = "2"'); await t.tap('#dialW [data-m=set]'); await asyncio.sleep(0.3)
    await t.tap('#sheetB [data-sp="3"]'); await asyncio.sleep(0.3)
    sp = await t.js('__S.speed'); over = await t.js('document.querySelector("#sheetB [data-sp=\\"3\\"]").classList.contains("over")')
    shown = await t.js('document.querySelector("#sheetB .spdMax").textContent')
    check('bug 5: with max 2×, the 3× chip does not set 3× (held at 2×)', sp == 2, sp)
    check('bug 5: chips above the max are marked, and the max is shown', over and '2×' in shown, (over, shown))
    for _ in range(3): await t.tap('#dialW [data-d="1"]'); await asyncio.sleep(0.25)
    check('bug 5: dial + cannot pass the max', await t.js('__S.speed') == 2)
    await t.shot('03_speed_max2.png')
    await t.js('document.querySelector("#dialW .mx").value = "-5"'); await t.tap('#dialW [data-m=set]'); await asyncio.sleep(0.3)
    m = await t.js('[__S.dialMax, document.getElementById("dialMsg").textContent, __toast().text]')
    check('bug 5: typing −5 as the dial max is refused with a message (max stays 2)', m[0] == 2 and 'from 1' in m[1], m)
    await t.shot('04_speed_invalid_max.png')
    await t.back()
    await t.tap('#gear'); await asyncio.sleep(0.5)
    await t.js('(e=>{e.value="-5";e.dispatchEvent(new Event("change"))})(document.getElementById("stMax"))'); await asyncio.sleep(0.2)
    m = await t.js('[__S.dialMax, document.getElementById("stMaxMsg").textContent, document.getElementById("stMax").value]')
    check('bug 5: Settings max −5 is refused with a message, not silently changed to 1', m[0] == 2 and 'from 1' in m[1] and m[2] == '2', m)
    await t.js('(e=>{e.value="abc";e.dispatchEvent(new Event("change"))})(document.getElementById("stMax"))')
    check('bug 5: Settings max "abc" refused', await t.js('__S.dialMax') == 2)
    await t.tap('#settings [data-sp="2.5"]'); await asyncio.sleep(0.2)
    check('bug 5: Settings 2.5× chip held at the max', await t.js('__S.speed') == 2)
    # bug 6: ElevenLabs Forget key shown disabled; empty save says so
    await t.tap('#stVoice [data-eng=eleven]'); await asyncio.sleep(0.4)
    d = await t.js('(b=>b && [b.disabled, b.textContent])(document.querySelector("#stVoice #elDel"))')
    check('bug 6: ElevenLabs shows Forget key, disabled, when no key is saved', d and d[0] is True and d[1] == 'Forget key', d)
    await t.tap('#stVoice #elSave'); await asyncio.sleep(0.2)
    msg = await t.js('document.querySelector("#stVoice #elMsg").textContent')
    check('bug 6: saving an empty key field shows a message', 'empty' in msg, msg)
    await t.shot('05_settings_eleven_forget_disabled.png')
    await t.js('localStorage.setItem("sonolumina.settings", JSON.stringify(Object.assign(JSON.parse(localStorage.getItem("sonolumina.settings")), {voiceEngine:"device"})))')
    await t.back()

    # ---- menu ----
    await t.open('?Genesis.1')
    await t.tap('#menuBtn'); await asyncio.sleep(0.4)
    items = await t.js('[...document.querySelectorAll("#menu [data-menu]")].map(b=>b.textContent.trim().slice(1))')
    want = ['Listen', 'Read', 'Recall', 'Notes', 'Search', 'Origins', 'Agent', 'Talk', 'Speed', 'Voice', 'Sleep timer', 'Up next', 'Settings', 'Speed read']
    check('menu: ☰ opens a menu listing every screen and mode', all(w in items for w in want), items)
    check('menu: the tab bar stays', await t.js('getComputedStyle(document.getElementById("tabs")).display != "none"'))
    await t.shot('06_menu_open.png')
    await t.back()
    check('menu: Back closes the menu (and stays on the screen)', await t.js('document.getElementById("menu").hidden && __hist().cur == "Genesis.1" && !!window.__app'))
    for key, probe in [('read', '__S.tab=="read"'), ('search', '__S.tab=="search"'), ('speed', '!document.getElementById("sheet").hidden && document.getElementById("sheetT").textContent=="Playback speed"'),
                       ('voice', 'document.getElementById("sheetT").textContent=="Voice"'), ('sleep', 'document.getElementById("sheetT").textContent=="Sleep timer"'),
                       ('queue', 'document.getElementById("sheetT").textContent=="Up next"'), ('rsvp', '!document.getElementById("rsvp").hidden'),
                       ('settings', '!document.getElementById("settings").hidden'), ('talk', '!document.getElementById("talk").hidden && __S.tab=="listen"'),
                       ('agent', '__S.tab=="agent"'), ('origins', '__S.tab=="origins"'), ('notes', '__S.tab=="notes"'), ('recall', '__S.tab=="recall"'), ('listen', '__S.tab=="listen"')]:
        await t.tap('#menuBtn'); await asyncio.sleep(0.35); await t.tap(f'#menu [data-menu={key}]'); await asyncio.sleep(0.7)
        ok = await t.js(probe)
        check(f'menu: {key} opens', ok)
        if key in ('speed', 'voice', 'sleep', 'queue', 'rsvp', 'settings', 'talk'):
            await t.back()
            closed = await t.js('document.getElementById("sheet").hidden && document.getElementById("rsvp").hidden && document.getElementById("settings").hidden && document.getElementById("menu").hidden && document.getElementById("talk").hidden')
            check(f'menu: Back closes {key}', closed)
    h = json.loads(await t.js('JSON.stringify(__hist())'))
    check('menu: history stays consistent after menu use', h['backPending'] == 0 and h['search'].startswith('?Genesis.1'), h)

    # ---- small items ----
    await t.tap('#tbSlp'); await asyncio.sleep(0.4); await t.tap('#sheetB [data-sl="15"]'); await asyncio.sleep(0.6)
    check('sleep sheet closes after choosing', await t.js('document.getElementById("sheet").hidden && document.getElementById("tbSlpV").textContent=="15m"'))
    await t.tap('#tbSlp'); await asyncio.sleep(0.4); await t.tap('#sheetB [data-sl="0"]'); await asyncio.sleep(0.6)
    await t.tap('#tbVoice'); await asyncio.sleep(0.4)
    await t.js('document.querySelector("#vTop button").click()'); await asyncio.sleep(0.2)
    ov = await t.js('''(()=>{const a=document.getElementById("toast").getBoundingClientRect(),b=document.getElementById("vPitch").getBoundingClientRect();
      return {overlap: !(a.bottom<=b.top||a.top>=b.bottom||a.right<=b.left||a.left>=b.right), on: __toast().on}})()''')
    check('toast does not cover the pitch slider', ov['on'] and not ov['overlap'], ov)
    check('pitch slider has a label', await t.js('document.getElementById("vPitch").getAttribute("aria-label")'))
    await t.shot('07_voice_sheet_toast_clear.png')
    await t.back()
    await t.js('document.getElementById("toast").classList.remove("on")'); await t.tap('#tabs [data-tab=search]'); await asyncio.sleep(0.2); await t.tap('#tabs [data-tab=listen]'); await asyncio.sleep(0.3)
    await t.js('__toast()'); await t.tap('#rep'); await asyncio.sleep(0.2)
    tb = await t.js('''(()=>{const a=document.getElementById("toast").getBoundingClientRect(),b=document.getElementById("bar").getBoundingClientRect();return [a.bottom<=b.top, a.bottom, b.top]})()''')
    check('toast sits above the player bar', tb[0], tb)
    a = await t.js('[document.getElementById("rep").getAttribute("aria-pressed"), document.getElementById("rep").getAttribute("aria-label")]')
    check('Repeat has aria-pressed and an aria label', a == ['true', 'Repeat: verse'], a)
    await t.tap('#rep'); await t.tap('#rep'); await asyncio.sleep(0.2)
    check('Repeat off → aria-pressed false', await t.js('document.getElementById("rep").getAttribute("aria-pressed")') == 'false')
    # picker: chapters right after the chosen book, in view
    await t.tap('#where'); await asyncio.sleep(0.4)
    await t.tap('#picker .grid button:nth-child(20)'); await asyncio.sleep(0.8)   # Psalms (19th book) row → chapters follow it
    p = await t.js('''(()=>{const cs=document.getElementById("pickChs"),r=cs.getBoundingClientRect(),prev=cs.previousElementSibling;
      return {after: prev && prev.textContent, top: Math.round(r.top), vh: innerHeight, n: cs.querySelectorAll("a").length}})()''')
    check('book picker: chapters show right after the chosen book\'s row and are in view', p['top'] < p['vh'] - 100 and p['n'] > 0, p)
    await t.shot('08_picker_chapters_in_view.png')
    await t.back()
    # Origins curly quote
    await t.open('?Genesis.3')
    await t.tap('#play'); await asyncio.sleep(0.3)
    await t.js('__app.stepVerse(1)'); await asyncio.sleep(0.3)
    stray = await t.js('''(async()=>{ __app.show("origins"); await new Promise(r=>setTimeout(r,300));
       return [...document.querySelectorAll("#tab-origins .kv b")].map(b=>b.textContent).filter(t=>/[‘’“”]/.test(t)) })()''')
    check('Origins melody words carry no stray curly quotes', stray == [], stray)
    await t.js('document.getElementById("oQ").value = "garden’"; document.getElementById("oForm").requestSubmit()'); await asyncio.sleep(0.2)
    o = await t.js('document.getElementById("oRes").textContent')
    check('Origins look-up of "garden’" strips the quote', 'garden’' not in o and 'Stem' in o, o[:120])
    # quick verse taps
    await t.js('__app.show("listen")'); await asyncio.sleep(0.3)
    v0 = await t.js('__app.now.v')
    await t.tap('#nv'); await t.tap('#nv'); await t.tap('#nv')
    await asyncio.sleep(1.0)
    v1 = await t.js('__app.now.v')
    check('three instant ↻ taps move three verses', v1 == v0 + 3, (v0, v1))
    await t.js('__app.toggle()')

    # ---- Settings: Back to an earlier chapter, mid-play (build 2026102002) ----
    await t.js('localStorage.setItem("sonolumina.settings", JSON.stringify({speed:1, resume:true, voiceOn:true}))')
    await t.open('?Genesis.1', clear=False)
    check('settings: a saved phone with no Back choice still keeps playing', await t.js('__S.backMid') == 'play')
    await t.tap('#gear'); await asyncio.sleep(0.5)
    seg = await t.js('''(()=>{const bs=[...document.querySelectorAll("#settings [data-back]")];
      return {n:bs.length, on:bs.filter(b=>b.classList.contains("on")).map(b=>b.dataset.back),
        pressed:bs.filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>b.dataset.back),
        labels:bs.map(b=>b.textContent), saved:__S.backMid}})()''')
    check('settings: Back mid-play shows Stop audio and Keep playing, Keep playing on',
          seg == {'n': 2, 'on': ['play'], 'pressed': ['play'], 'labels': ['Stop audio', 'Keep playing'], 'saved': 'play'}, seg)
    await t.tap('#settings [data-back="stop"]'); await asyncio.sleep(0.3)
    saved = await t.js('''(()=>{const raw=JSON.parse(localStorage.getItem("sonolumina.settings")||"{}");
      return {mem:__S.backMid, disk:raw.backMid, on:[...document.querySelectorAll("#settings [data-back].on")].map(b=>b.dataset.back)}})()''')
    check('settings: choosing Stop audio is saved on this phone', saved == {'mem': 'stop', 'disk': 'stop', 'on': ['stop']}, saved)
    await t.tap('#setX'); await asyncio.sleep(0.4)
    await t.tap('#play'); await asyncio.sleep(1.4)
    await t.tap('#nch'); await asyncio.sleep(1.0)
    h = json.loads(await t.js('JSON.stringify({cur:__hist().cur, state:__app.state})'))
    check('Back mid-play setup: the next chapter is playing', h['cur'] == 'Genesis.2' and h['state'] == 'playing', h)
    await t.back(1.4)
    s = json.loads(await t.js('''JSON.stringify({cur:__hist().cur, search:__hist().search, state:__app.state,
      play:document.getElementById("play").textContent, bar:document.getElementById("barRef").textContent,
      where:document.getElementById("where").textContent, now:__app.now})'''))
    check('Back mid-play Stop: the reading ends on the earlier chapter',
          s['state'] == 'ready' and s['play'] == 'Begin' and s['cur'] == 'Genesis.1' and s['now'] is None
          and s['search'].startswith('?Genesis.1') and s['bar'].startswith('Genesis 1:') and s['where'].startswith('Genesis 1'), s)
    await t.shot('09_back_stop.png')
    # Begin can sit under the fixed player bar once the links are on screen. The sound is already
    # unlocked, so this press uses the button's own handler (the same one a tap runs).
    begun = await t.js('document.getElementById("play").textContent')
    check('Back mid-play Stop: the play control reads Begin', begun == 'Begin', begun)
    await t.js('document.getElementById("play").click()'); await asyncio.sleep(1.4)
    playing = json.loads(await t.js('JSON.stringify({state:__app.state, v:__app.now&&__app.now.v})'))
    check('Back mid-play Stop: Begin starts the earlier chapter again', playing['state'] == 'playing' and playing['v'] == 1, playing)
    await t.tap('#tabs [data-tab=read]'); await asyncio.sleep(0.6)
    await t.back(0.9)
    s2 = json.loads(await t.js('JSON.stringify({tab:__S.tab, state:__app.state, cur:__hist().cur, v:__app.now&&__app.now.v})'))
    check('Back mid-play Stop: a screen change on the same chapter leaves the reading playing',
          s2['state'] == 'playing' and s2['tab'] == 'listen' and s2['cur'] == 'Genesis.1' and s2['v'] == 1, s2)
    await t.tap('#gear'); await asyncio.sleep(0.4)
    await t.tap('#settings [data-back="play"]'); await asyncio.sleep(0.3)
    kept = await t.js('JSON.parse(localStorage.getItem("sonolumina.settings")).backMid')
    check('settings: choosing Keep playing is saved', kept == 'play' and await t.js('__S.backMid') == 'play', kept)
    await t.tap('#setX'); await asyncio.sleep(0.4)
    await t.tap('#nch'); await asyncio.sleep(1.0)
    await t.back(1.4)
    s3 = json.loads(await t.js('''JSON.stringify({cur:__hist().cur, state:__app.state, v:__app.now&&__app.now.v,
      bar:document.getElementById("barRef").textContent})'''))
    check('Back mid-play Keep playing: still playing verse 1 of the earlier chapter',
          s3['state'] == 'playing' and s3['cur'] == 'Genesis.1' and s3['v'] == 1 and s3['bar'].startswith('Genesis 1:1'), s3)
    await t.shot('10_back_keep.png')

asyncio.run(run())
n, ok = len(results), sum(results)
print(f'{ok}/{n} passed'); sys.exit(0 if ok == n else 1)
