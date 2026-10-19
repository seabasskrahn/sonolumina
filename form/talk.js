// The Form for Talk: a live voice conversation about the chapter being read.
// Mic in, voice out, straight from this phone to Google's Gemini Live API over a WebSocket.
// The key is the reader's own, pasted here and kept only in this phone's localStorage.
// No server, no proxy, nothing in the code or the site. The voice is an AI, not Scripture.

import { setupMessage, chapterContext, downsample, floatToPcm16, pcm16ToFloat, bytesToBase64, base64ToBytes, rateOf, TALK_SOURCE } from '../law/talk.js';

const KEY = 'sonolumina.geminiKey', MODEL = 'sonolumina.talkModel';
export const MODELS = ['gemini-3.8-live', 'gemini-3.1-flash-live-preview', 'gemini-2.5-flash-native-audio-preview-12-2025'];
const URL_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const get = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const put = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };

// The microphone tap, as an AudioWorklet: hands raw float frames to the page.
const WORKLET = `registerProcessor('sono-mic', class extends AudioWorkletProcessor {
  process(inputs) { const c = inputs[0] && inputs[0][0]; if (c) this.port.postMessage(c.slice(0)); return true; }
});`;

// A stand-in for the Live API, so the panel can be seen and tested with no key and no network.
// It answers the way the real socket does (setupComplete, transcriptions, 24 kHz PCM audio, turnComplete).
export class MockLiveSocket {
  constructor(url) {
    this.url = url; this.readyState = 0; this.sent = []; this.heard = 0; this.answered = 0;
    setTimeout(() => { this.readyState = 1; this.onopen?.(); }, 30);
  }
  send(s) {
    const m = JSON.parse(s); this.sent.push(m);
    if (m.setup) return this._emit({ setupComplete: {} }, 40);
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
  close() { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.({ code: 1000, reason: '' }); }
}

export function createTalk({ mount, toggle, context, onStart }) {
  const $ = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
  const status = $('div', { className: 'tstatus' });
  const log = $('div', { className: 'tlog', ariaLive: 'polite' });
  const keyIn = $('input', { type: 'password', placeholder: 'Paste your Gemini API key', autocomplete: 'off', spellcheck: false });
  const model = $('select', {}, ...MODELS.map(m => $('option', { value: m, textContent: m })));
  model.value = get(MODEL) || MODELS[0];
  const save = $('button', { type: 'button', textContent: 'Save key' });
  const forget = $('button', { type: 'button', textContent: 'Forget key' });
  const call = $('button', { type: 'button', className: 'call', textContent: 'Start talking' });
  const mute = $('button', { type: 'button', textContent: 'Mute', disabled: true });
  const demo = $('button', { type: 'button', textContent: 'Try the demo (no key)' });
  const typed = $('input', { type: 'text', placeholder: 'or type a question', enterKeyHint: 'send' });
  const keyRow = $('div', { className: 'trow' }, keyIn, save, forget);
  const setup = $('details', { className: 'tsetup' }, $('summary', { textContent: 'Setup: your own free Gemini key' }),
    $('p', { innerHTML: 'Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. It is kept only on this phone (localStorage) and sent only to Google. On the free tier there is no charge, and Google may use the conversation to improve its products. Use a project with no billing account and it can never be charged.' }),
    keyRow, $('div', { className: 'trow' }, $('label', { textContent: 'Model ' }, model)));
  const panel = $('section', { id: 'talk', hidden: true },
    $('div', { className: 'thead', textContent: 'Talk · an AI voice, not Scripture' }),
    setup, $('div', { className: 'trow' }, call, mute, demo), $('div', { className: 'trow' }, typed), status, log,
    $('div', { className: 'tnote', textContent: TALK_SOURCE }));
  mount.append(panel);

  const st = window.__talk = { status: 'idle', mode: null, sentAudio: 0, gotAudio: 0, transcript: [], setup: null, socket: null, error: null };
  const say = t => { status.textContent = t; st.status = t; };
  const hasKey = () => !!get(KEY);
  const refresh = () => {
    keyIn.value = ''; keyIn.placeholder = hasKey() ? 'Key saved on this phone ✓ (paste to replace)' : 'Paste your Gemini API key';
    forget.disabled = !hasKey(); setup.open = !hasKey();
    if (!live) say(hasKey() ? 'Ready. Tap Start talking, then speak.' : 'No key yet: try the demo, or add your own free key below.');
  };
  save.onclick = () => { const k = keyIn.value.trim(); if (k) { put(KEY, k); refresh(); } };
  forget.onclick = () => { put(KEY, ''); refresh(); };
  model.onchange = () => put(MODEL, model.value);
  toggle.onclick = () => { panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', !panel.hidden); if (!panel.hidden) refresh(); };

  // One line of the conversation; a turn's words arrive in pieces and are joined.
  let lastWho = null, lastLine = null;
  const line = (who, text) => {
    if (!text) return;
    if (who === lastWho && lastLine) { lastLine.lastChild.textContent += text; st.transcript[st.transcript.length - 1].text += text; }
    else { lastLine = $('p', { className: who }, $('b', { textContent: who === 'you' ? 'You: ' : 'AI: ' }), $('span', { textContent: text })); log.append(lastLine); st.transcript.push({ who, text }); }
    lastWho = who; log.scrollTop = log.scrollHeight;
  };
  const endTurn = () => { lastWho = null; lastLine = null; };

  let live = false, ws = null, ctx = null, mic = null, node = null, src = null, muted = false, playing = [], nextAt = 0;
  const stopVoice = () => { playing.forEach(s => { try { s.stop(); } catch {} }); playing = []; nextAt = 0; };
  const play = (b64, mime) => {
    const f = pcm16ToFloat(new Int16Array(base64ToBytes(b64).buffer)), rate = rateOf(mime);
    const buf = ctx.createBuffer(1, f.length, rate); buf.copyToChannel(f, 0);
    const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination);
    nextAt = Math.max(nextAt, ctx.currentTime + 0.05); s.start(nextAt); nextAt += buf.duration;
    playing.push(s); s.onended = () => { playing = playing.filter(x => x !== s); };
    st.gotAudio++;
  };
  const sendAudio = frame => {
    if (!ws || ws.readyState !== 1 || muted || !st.ready) return;
    const pcm = floatToPcm16(downsample(frame, ctx.sampleRate, 16000));
    ws.send(JSON.stringify({ realtimeInput: { audio: { data: bytesToBase64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } } }));
    st.sentAudio++;
  };
  // Microphone frames are gathered to about 100 ms before sending.
  let acc = [], accN = 0;
  const onFrame = f => { if (!ctx || !live) return; acc.push(f); accN += f.length; if (accN >= ctx.sampleRate / 10) { const all = new Float32Array(accN); let o = 0; for (const a of acc) { all.set(a, o); o += a.length; } acc = []; accN = 0; sendAudio(all); } };

  async function start(mode) {
    if (live) return;
    const key = get(KEY);
    if (mode === 'live' && !key) { setup.open = true; say('Add your Gemini key first, or try the demo.'); return; }
    onStart?.();
    live = true; st.mode = mode; st.error = null; st.ready = false; call.textContent = 'End'; mute.disabled = false; demo.disabled = true;
    say('Connecting…');
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume();
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        src = ctx.createMediaStreamSource(mic);
        if (ctx.audioWorklet) {
          await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })));
          node = new AudioWorkletNode(ctx, 'sono-mic'); node.port.onmessage = e => onFrame(e.data);
          src.connect(node);   // not connected onward: the mic is never played back
        } else {
          node = ctx.createScriptProcessor(4096, 1, 1); node.onaudioprocess = e => onFrame(e.inputBuffer.getChannelData(0).slice(0));
          src.connect(node); node.connect(ctx.destination);
        }
      } catch (e) { say('No microphone (' + e.name + '). You can still type a question.'); }
      const c = await context();
      st.setup = setupMessage(model.value, chapterContext(c.name, c.chapter, c.verses, c.verse));
      ws = st.socket = mode === 'demo' ? new MockLiveSocket('mock') : new WebSocket(`${URL_BASE}?key=${encodeURIComponent(key)}`);
      ws.onopen = () => ws.send(JSON.stringify(st.setup));
      ws.onmessage = async ev => {
        const m = JSON.parse(typeof ev.data === 'string' ? ev.data : await ev.data.text());
        if (m.setupComplete) { st.ready = true; say(mode === 'demo' ? 'Demo: speak (or type), and a mock reply will play.' : `Listening · ${c.name} ${c.chapter}${c.verse ? ':' + c.verse : ''}`); }
        const sc = m.serverContent;
        if (sc) {
          if (sc.interrupted) { stopVoice(); endTurn(); }
          if (sc.inputTranscription) line('you', sc.inputTranscription.text);
          for (const p of sc.modelTurn?.parts || []) if (p.inlineData?.data) play(p.inlineData.data, p.inlineData.mimeType);
          if (sc.outputTranscription) line('ai', sc.outputTranscription.text);
          if (sc.turnComplete) endTurn();
        }
        if (m.goAway) say('The session is ending soon (time limit). Tap End, then Start again.');
      };
      ws.onerror = () => { st.error = 'socket error'; };
      ws.onclose = e => {
        const why = (e.reason || '').replace(/key=[^&\s]+/g, 'key=…');
        if (live) { st.error = st.error || `closed ${e.code} ${why}`; stop(e.code === 1000 ? 'Call ended.' : `Disconnected (${e.code}${why ? ': ' + why : ''}). Check the key and model.`); }
      };
    } catch (e) { st.error = String(e); stop('Could not start: ' + e.message); }
  }
  function stop(msg = 'Call ended.') {
    live = false; st.ready = false;
    try { ws?.close(); } catch {}
    ws = null; stopVoice();
    mic?.getTracks().forEach(t => t.stop()); mic = null;
    try { if (node?.port) node.port.onmessage = null; node?.disconnect(); src?.disconnect(); } catch {}
    node = src = null; acc = []; accN = 0;
    ctx?.close().catch(() => {}); ctx = null;
    call.textContent = 'Start talking'; mute.disabled = true; mute.textContent = 'Mute'; muted = false; demo.disabled = false;
    say(msg);
  }
  call.onclick = () => (live ? stop() : start('live'));
  demo.onclick = () => start('demo');
  mute.onclick = () => {
    muted = !muted; mute.textContent = muted ? 'Unmute' : 'Mute';
    if (muted && ws?.readyState === 1 && st.ready) ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
  };
  typed.onkeydown = e => {
    if (e.key !== 'Enter' || !typed.value.trim()) return;
    if (!live || !st.ready) { say('Start a call (or the demo) first.'); return; }
    line('you', typed.value.trim()); endTurn();
    ws.send(JSON.stringify({ realtimeInput: { text: typed.value.trim() } })); typed.value = '';
  };
  refresh();
  return { start, stop, get live() { return live; } };
}
