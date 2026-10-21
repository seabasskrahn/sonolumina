// The Form for Talk: a live voice conversation about the chapter being read.
// Mic in, voice out, straight from this phone to Google's Gemini Live API over a WebSocket.
// The key is the reader's own, pasted here and kept only in this phone's localStorage.
// No server, no proxy, nothing in the code or the site. The voice is an AI, not Scripture.

import { setupMessage, chapterContext, downsample, floatToPcm16, pcm16ToFloat, bytesToBase64, base64ToBytes, rateOf, explainClose, micOpen, headphonesLikely, TALK_SOURCE } from '../law/talk.js';

const KEY = 'sonolumina.geminiKey', MODEL = 'sonolumina.talkModel';
// Model IDs as listed at https://ai.google.dev/gemini-api/docs/models (checked 2026-10-18; re-checked 2026-10-19: gemini-3.8-live is the default Live model).
export const MODELS = ['gemini-3.8-live', 'gemini-3.1-flash-live-preview', 'gemini-2.5-flash-native-audio-preview-12-2025'];
const URL_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
export const CONNECT_MS = 10000;
const get = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const put = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };

// The microphone tap, as an AudioWorklet: hands raw float frames to the page.
const WORKLET = `registerProcessor('sono-mic', class extends AudioWorkletProcessor {
  process(inputs) { const c = inputs[0] && inputs[0][0]; if (c) this.port.postMessage(c.slice(0)); return true; }
});`;

const MIC_HELP = 'The microphone is blocked for this site. To allow it: on Android Chrome, tap the icon left of the address, then Permissions › Microphone › Allow; on iPhone Safari, tap aA › Website Settings › Microphone › Allow (or Settings › Apps › Safari › Microphone). Then tap Start talking again. You can still type a question.';

// A stand-in for the Live API, so the panel can be seen and tested with no key and no network.
// It answers the way the real socket does (setupComplete, transcriptions, 24 kHz PCM audio, turnComplete, goAway).
// kind: 'ok' (default), 'silent' (never completes setup), 'goaway' (warns of the time limit after setup).
export class MockLiveSocket {
  constructor(kind = 'ok') {
    this.kind = kind; this.readyState = 0; this.sent = []; this.heard = 0; this.answered = 0;
    setTimeout(() => { if (this.readyState === 3) return; this.readyState = 1; this.onopen?.(); }, 30);
  }
  send(s) {
    const m = JSON.parse(s); this.sent.push(m);
    if (m.setup) {
      if (this.kind === 'silent') return;
      this._emit({ setupComplete: {} }, 40);
      if (this.kind === 'goaway') this._emit({ goAway: { timeLeft: '10s' } }, 300);
      return;
    }
    const a = m.realtimeInput?.audio;
    if (a) { this.heard += base64ToBytes(a.data).length / 2; if (this.heard >= 16000 && !this.answered) this._answer('(demo) What does this verse mean?', true); }
    if (m.realtimeInput?.text) this._answer(m.realtimeInput.text, false);
  }
  _answer(said, spoken) {
    this.answered++;
    const words = 'This is a demonstration reply. With your own Gemini key, a real voice will answer here, quoting the chapter you are reading exactly.';
    const n = 24000 * 1.2, pcm = new Int16Array(n);
    for (let i = 0; i < n; i++) pcm[i] = Math.round(0.12 * 0x7fff * Math.sin(2 * Math.PI * 220 * i / 24000) * Math.sin(Math.PI * i / n));
    const data = bytesToBase64(new Uint8Array(pcm.buffer));
    if (spoken) this._emit({ serverContent: { inputTranscription: { text: said } } }, 50);   // typed words are already shown
    this._emit({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data } }] }, outputTranscription: { text: words } } }, 120);
    this._emit({ serverContent: { turnComplete: true } }, 200);
  }
  _emit(obj, ms) { setTimeout(() => this.readyState === 1 && this.onmessage?.({ data: JSON.stringify(obj) }), ms); }
  close() { if (this.readyState === 3) return; this.readyState = 3; setTimeout(() => this.onclose?.({ code: 1000, reason: '' }), 0); }
}

export function createTalk({ mount, toggle, context, onLive, test = false }) {
  const $ = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
  const status = $('div', { className: 'tstatus', role: 'status' });
  const log = $('div', { className: 'tlog', ariaLive: 'polite' });
  const keyIn = $('input', { type: 'password', placeholder: 'Paste your Gemini API key', autocomplete: 'off', spellcheck: false });
  const model = $('select', {}, ...MODELS.map(m => $('option', { value: m, textContent: m })));
  model.value = MODELS.includes(get(MODEL)) ? get(MODEL) : MODELS[0];
  const save = $('button', { type: 'button', className: 'tlnk', textContent: 'Save key' });
  const forget = $('button', { type: 'button', className: 'tlnk forget', textContent: 'Forget key' });
  const call = $('button', { type: 'button', className: 'call', textContent: 'Start talking' });
  const mute = $('button', { type: 'button', className: 'mute', textContent: 'Mute', disabled: true });
  const hush = $('button', { type: 'button', className: 'hush', textContent: 'Stop reply', disabled: true });
  const demo = $('button', { type: 'button', className: 'demo', textContent: 'Try the demo (no key)' });
  const phones = $('input', { type: 'checkbox', className: 'phones' });
  const typed = $('input', { type: 'text', className: 'ttype', placeholder: 'or type a question', enterKeyHint: 'send' });
  // Presentation only: the mic sits in a dish of rings, and data-state on the panel (idle, connecting, live, error) and data-mic pick the look.
  const lock = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>';
  const setup = $('details', { className: 'tsetup' }, $('summary', { textContent: 'Setup: your own free Gemini key' }),
    $('div', { className: 'tlabel', textContent: 'Gemini API key' }),
    $('div', { className: 'tkey' }, keyIn, save), $('div', { className: 'tforget' }, forget),
    $('p', { className: 'tkeynote', innerHTML: lock + '<span>Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. It is kept only on this phone and sent only to Google. On the free tier there is no charge, and Google may use the conversation to improve its products. If the project has no billing account, Google can’t charge it.</span>' }),
    $('label', { className: 'tmodel' }, $('span', { className: 'tlabel', textContent: 'Model' }), model));
  const panel = $('section', { id: 'talk', hidden: true },
    $('div', { className: 'thead' }, $('span', { className: 'tkick', textContent: 'Talk' }), ' ',
      $('span', { className: 'tpill' }, $('i', { ariaHidden: 'true' }), 'AI voice, not Scripture')),
    log, status,
    $('div', { className: 'tdish' }, call),
    $('div', { className: 'tcap', ariaHidden: 'true' }),
    $('div', { className: 'tbar' }, mute, hush, demo),
    $('label', { className: 'tphones' }, $('span', {}, 'Headphones', $('small', { textContent: 'Talk over the reply to interrupt' })), phones),
    $('div', { className: 'trow' }, typed), setup,
    $('div', { className: 'tnote', textContent: TALK_SOURCE }));
  const look = s => { panel.dataset.state = s; };
  mount.append(panel);

  // State for tests only (never the socket, the URL or the key), and only in test mode.
  const st = { status: 'idle', mode: null, sentAudio: 0, gotAudio: 0, gated: 0, transcript: [], setup: null, error: null, ready: false };
  if (test) window.__talk = st;
  const say = t => { status.textContent = t; st.status = t; };
  const hasKey = () => !!get(KEY);
  let live = false;
  const refresh = () => {
    keyIn.value = ''; keyIn.placeholder = hasKey() ? 'Key saved on this phone ✓ (paste to replace)' : 'Paste your Gemini API key';
    forget.disabled = !hasKey(); setup.open = !hasKey();
    if (!live) { look('idle'); say(hasKey() ? 'Ready. Tap Start talking, then speak.' : 'No key yet: try the demo, or add your own free key below.'); }
  };
  save.onclick = () => { const k = keyIn.value.trim(); if (k) { put(KEY, k); refresh(); } };
  forget.onclick = () => { put(KEY, ''); refresh(); };
  model.onchange = () => put(MODEL, model.value);

  // Opening the panel adds a history step, so Android Back closes it (and ends a call) instead of leaving the app.
  const open = () => {
    if (!panel.hidden) return;
    panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); refresh();
    history.pushState({ ...(history.state || {}), talk: true }, '');
  };
  const close = (fromBack = false) => {
    if (panel.hidden) return;
    if (live) stop('Call ended.');
    panel.hidden = true; toggle.setAttribute('aria-expanded', 'false');
    if (!fromBack && history.state?.talk) history.back();
  };
  toggle.onclick = () => (panel.hidden ? open() : close());
  addEventListener('popstate', () => { if (!panel.hidden && !history.state?.talk) close(true); });
  // Backgrounded or leaving: the mic and the socket are closed.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && live) stop('Call ended: the app went to the background.'); });
  addEventListener('pagehide', () => { if (live) stop('Call ended.'); });
  addEventListener('offline', () => { if (live) stop(explainClose(1006, '', false)); });

  // One line of the conversation; a turn's words arrive in pieces and are joined.
  let lastWho = null, lastLine = null;
  const line = (who, text) => {
    if (!text) return;
    if (who === lastWho && lastLine) { lastLine.lastChild.textContent += text; st.transcript[st.transcript.length - 1].text += text; }
    else { lastLine = $('p', { className: who }, $('b', { textContent: who === 'you' ? 'You: ' : 'AI voice · not Scripture' }), $('span', { textContent: text })); log.append(lastLine); st.transcript.push({ who, text }); }
    lastWho = who; log.scrollTop = log.scrollHeight;
  };
  const endTurn = () => { lastWho = null; lastLine = null; };

  let ws = null, ctx = null, mic = null, node = null, src = null, muted = false, playing = [], nextAt = 0, discard = false, timer = null;
  const speakingUntil = () => (ctx && playing.length ? nextAt : 0);
  const stopVoice = () => { playing.forEach(s => { try { s.stop(); } catch {} }); playing = []; nextAt = 0; hush.disabled = true; };
  const play = (b64, mime) => {
    if (discard || !ctx) return;
    const f = pcm16ToFloat(new Int16Array(base64ToBytes(b64).buffer)), rate = rateOf(mime);
    const buf = ctx.createBuffer(1, f.length, rate); buf.copyToChannel(f, 0);
    const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination);
    nextAt = Math.max(nextAt, ctx.currentTime + 0.05); s.start(nextAt); nextAt += buf.duration;
    playing.push(s); hush.disabled = false;
    s.onended = () => { playing = playing.filter(x => x !== s); if (!playing.length) hush.disabled = true; };
    st.gotAudio++;
  };
  const sendAudio = frame => {
    if (!ws || ws.readyState !== 1) return;
    // Echo guard: while the reply plays through the speaker, the mic is not sent (unless headphones).
    if (!micOpen({ muted, ready: st.ready, headphones: phones.checked, speakingUntil: speakingUntil(), now: ctx.currentTime })) { if (st.ready && !muted) st.gated++; return; }
    const pcm = floatToPcm16(downsample(frame, ctx.sampleRate, 16000));
    ws.send(JSON.stringify({ realtimeInput: { audio: { data: bytesToBase64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } } }));
    st.sentAudio++;
  };
  // Microphone frames are gathered to about 100 ms before sending.
  let acc = [], accN = 0;
  const onFrame = f => {
    if (!ctx || !live) return;
    acc.push(f); accN += f.length;
    if (accN >= ctx.sampleRate / 10) { const all = new Float32Array(accN); let o = 0; for (const a of acc) { all.set(a, o); o += a.length; } acc = []; accN = 0; sendAudio(all); }
  };

  async function startMic() {
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      say(e.name === 'NotAllowedError' || e.name === 'SecurityError' ? MIC_HELP : `No microphone (${e.name}). You can still type a question.`);
      st.micError = e.name; panel.dataset.mic = e.name === 'NotAllowedError' || e.name === 'SecurityError' ? 'blocked' : 'none'; return false;
    }
    if (!live) { mic.getTracks().forEach(t => t.stop()); mic = null; return false; }
    try { if (headphonesLikely(await navigator.mediaDevices.enumerateDevices())) phones.checked = true; } catch {}
    src = ctx.createMediaStreamSource(mic);
    if (ctx.audioWorklet) {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
      if (!ctx) return false;
      node = new AudioWorkletNode(ctx, 'sono-mic'); node.port.onmessage = e => onFrame(e.data);
      src.connect(node);   // not connected onward: the mic is never played back
    } else {
      node = ctx.createScriptProcessor(4096, 1, 1); node.onaudioprocess = e => onFrame(e.inputBuffer.getChannelData(0).slice(0));
      src.connect(node); node.connect(ctx.destination);
    }
    return true;
  }

  async function start(mode) {
    if (live) return;
    const key = get(KEY);
    if (mode === 'live' && !key) { setup.open = true; look('error'); say('Add your Gemini key first, or try the demo.'); return; }
    if (mode === 'live' && !navigator.onLine) { look('error'); say(explainClose(0, '', false)); return; }
    live = true; onLive?.(true);
    Object.assign(st, { mode, error: null, ready: false, micError: null });
    call.textContent = 'End'; mute.disabled = false; demo.disabled = true;
    delete panel.dataset.mic; look('connecting'); say('Connecting…');
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume();
      const micOk = await startMic();
      if (!live) return;
      const c = await context();
      st.setup = setupMessage(model.value, chapterContext(c.name, c.chapter, c.verses, c.verse));
      const sock = ws = mode === 'demo' ? new MockLiveSocket(test && window.__talkMock || 'ok') : new WebSocket(`${URL_BASE}?key=${encodeURIComponent(key)}`);
      timer = setTimeout(() => { if (live && ws === sock && !st.ready) { st.error = 'timeout'; stop(navigator.onLine ? 'Google did not answer within 10 seconds. Check the connection and the model, then try again.' : explainClose(0, '', false)); } }, CONNECT_MS);
      sock.onopen = () => sock.send(JSON.stringify(st.setup));
      sock.onmessage = async ev => {
        if (ws !== sock) return;
        const m = JSON.parse(typeof ev.data === 'string' ? ev.data : await ev.data.text());
        if (m.setupComplete) {
          clearTimeout(timer); st.ready = true; look('live');
          say((mode === 'demo' ? 'Demo: speak (or type), and a mock reply will play. ' : `Listening · ${c.name} ${c.chapter}${c.verse ? ':' + c.verse : ''}. `) + (micOk ? '' : (st.micError === 'NotAllowedError' ? MIC_HELP : 'No microphone: type a question.')));
        }
        const sc = m.serverContent;
        if (sc) {
          if (sc.interrupted) { stopVoice(); discard = false; endTurn(); }
          if (sc.inputTranscription) line('you', sc.inputTranscription.text);
          for (const p of sc.modelTurn?.parts || []) if (p.inlineData?.data) play(p.inlineData.data, p.inlineData.mimeType);
          if (sc.outputTranscription && !discard) line('ai', sc.outputTranscription.text);
          if (sc.turnComplete) { discard = false; endTurn(); }
        }
        // Google ends sessions at a time limit and warns first: the call ends cleanly, and a tap starts a fresh one.
        if (m.goAway) { st.goAway = true; stop('This conversation reached Google\'s session time limit. Tap Start talking to begin a new one (it starts fresh).'); }
      };
      sock.onerror = () => { if (ws === sock) st.error = 'socket error'; };
      sock.onclose = e => {
        if (ws !== sock || !live) return;
        const why = (e.reason || '').replace(/key=[^&\s]+/g, 'key=…');
        st.error = st.error || `closed ${e.code} ${why}`;
        stop(explainClose(e.code, why, navigator.onLine));
      };
    } catch (e) { st.error = String(e); stop('Could not start: ' + e.message); }
  }
  function stop(msg = 'Call ended.') {
    const was = live;
    live = false; st.ready = false; clearTimeout(timer);
    const sock = ws; ws = null;
    try { sock?.close(); } catch {}
    stopVoice(); discard = false;
    mic?.getTracks().forEach(t => t.stop()); mic = null;
    try { if (node?.port) node.port.onmessage = null; if (node) node.onaudioprocess = null; node?.disconnect(); src?.disconnect(); } catch {}
    node = src = null; acc = []; accN = 0;
    ctx?.close().catch(() => {}); ctx = null;
    call.textContent = 'Start talking'; mute.disabled = true; mute.textContent = 'Mute'; muted = false; demo.disabled = false;
    if (was) onLive?.(false);
    look(/^Call ended/.test(msg) ? 'idle' : 'error'); say(msg);
  }
  call.onclick = () => (live ? stop() : start('live'));
  demo.onclick = () => start('demo');
  mute.onclick = () => {
    muted = !muted; mute.textContent = muted ? 'Unmute' : 'Mute';
    if (muted && ws?.readyState === 1 && st.ready) ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
  };
  // Tap to interrupt: the reply stops here at once and the rest of that turn is dropped; the mic opens again,
  // so speaking next is heard by Google, which interrupts its own turn.
  hush.onclick = () => { stopVoice(); discard = true; endTurn(); st.hushed = (st.hushed || 0) + 1; };
  typed.onkeydown = e => {
    if (e.key !== 'Enter' || !typed.value.trim()) return;
    if (!live || !st.ready) { say('Start a call (or the demo) first.'); return; }
    stopVoice(); discard = false;
    line('you', typed.value.trim()); endTurn();
    ws.send(JSON.stringify({ realtimeInput: { text: typed.value.trim() } })); typed.value = '';
  };
  refresh();
  return { start, stop, open, close, get live() { return live; } };
}
