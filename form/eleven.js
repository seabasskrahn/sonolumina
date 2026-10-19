// The Form: ElevenLabs as the main reading voice (preview build), with the phone's own voice as fallback.
//
// The API key is never part of the app: Seabass types it into Settings on his phone and it is kept
// only in that phone's localStorage (KEY_STORE). Calls go straight from the phone to api.elevenlabs.io
// (the API answers CORS for any origin), use his ElevenLabs credits, and send only the verse text.
//
// Timing: each verse is fetched as MP3 (text-to-speech/{voice}/stream), cached (memory + IndexedDB, so a
// repeat costs no credits), played on one <audio> element with pitch kept, at playbackRate = speed × fit,
// where fit (0.9–1.15) nudges the natural reading toward the verse's length in the score. The next verse
// is fetched ahead. Any error (no key, bad key, quota, offline, slow) falls back to the phone voice.

export const KEY_STORE = 'sonolumina.elevenlabs.key';
const API = 'https://api.elevenlabs.io';
export const MODELS_FALLBACK = [
  { model_id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2 (lifelike, default)' },
  { model_id: 'eleven_v3', name: 'Eleven v3 (most expressive, audio tags)' },
  { model_id: 'eleven_turbo_v2_5', name: 'Eleven Turbo v2.5 (faster)' },
  { model_id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5 (fastest, cheapest)' },
];
const TAG = /\[[^\]]{1,40}\]/g;
const norm = t => String(t).replace(/\s+/g, ' ').trim();
// Every [tag] removed: what the word tones, feeling, display, speed-read and phone voice would see (they never get tags).
export const stripTags = t => norm(String(t).replace(TAG, ' '));
// Tagged text may only add tags: with them removed it must read exactly as the verse (Scripture is never changed).
export const sameWords = (tagged, plain) => stripTags(tagged) === norm(plain);
// FNV-1a 32-bit of the plain verse (whitespace collapsed), as 8 hex digits; tools/build_expression.py writes the same.
export function fnv(t) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(norm(t))) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}
// The markup for a verse is used only if its hash matches the plain text being read and it only adds tags.
export const validMarkup = (entry, plain) => !!(entry && entry.t && entry.h === fnv(plain) && sameWords(entry.t, plain));

const getKey = () => { try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; } };
export const elevenKey = { get: getKey, set: k => { try { k ? localStorage.setItem(KEY_STORE, k.trim()) : localStorage.removeItem(KEY_STORE); } catch {} } };

// A small IndexedDB store for verse audio (Blobs), so repeats and replays spend no credits.
function idb() {
  if (!('indexedDB' in window)) return null;
  let p = null;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('sonolumina-voice', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('mp3');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = (mode, f) => open().then(db => new Promise((res, rej) => { const t = db.transaction('mp3', mode), q = f(t.objectStore('mp3')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }));
  return { get: k => tx('readonly', s => s.get(k)).catch(() => null), put: (k, v) => tx('readwrite', s => s.put(v, k)).catch(() => null),
    clear: () => tx('readwrite', s => s.clear()).catch(() => null) };
}

export function createEleven(S, { onNotice = () => {}, fetchImpl = (...a) => fetch(...a) } = {}) {
  const mem = new Map(), db = idb();
  const audio = new Audio();
  audio.preservesPitch = true; audio.mozPreservesPitch = true; audio.webkitPreservesPitch = true;
  let failedUntil = 0, lastReason = '', queue = [], playing = null, paused = false, speed = 1, token = 0;

  const hdr = () => ({ 'xi-api-key': getKey() });
  const ready = () => !!getKey() && !!S.elVoice && S.voiceEngine === 'eleven' && Date.now() >= failedUntil && navigator.onLine !== false;
  function fail(why) {
    lastReason = why; failedUntil = Date.now() + 5 * 60e3;   // try again in 5 minutes
    onNotice(`ElevenLabs unavailable (${why}): using the phone's voice`);
  }
  async function api(path, opt = {}) {
    const r = await fetchImpl(API + path, { ...opt, headers: { ...hdr(), ...(opt.headers || {}) } });
    if (!r.ok) {
      let msg = String(r.status);
      try { const j = await r.json(); msg = j?.detail?.status || j?.detail?.code || j?.detail?.message || msg; } catch {}
      const e = new Error(r.status === 401 ? 'key not accepted' : r.status === 429 ? 'too many requests or out of credits' : /quota/i.test(msg) ? 'out of credits' : msg);
      e.status = r.status; throw e;
    }
    return r;
  }
  async function voices() {
    const j = await (await api('/v1/voices')).json();
    return (j.voices || []).map(v => ({ id: v.voice_id, name: v.name, preview: v.preview_url, category: v.category, labels: v.labels || {} }));
  }
  async function models() {
    try {
      const j = await (await api('/v1/models')).json();
      const tts = (j || []).filter(m => m.can_do_text_to_speech !== false).map(m => ({ model_id: m.model_id, name: m.name }));
      return tts.length ? tts : MODELS_FALLBACK;
    } catch { return MODELS_FALLBACK; }
  }
  const settings = () => ({ stability: +S.elStability, similarity_boost: +S.elSimilarity, style: +S.elStyle, use_speaker_boost: true });
  const cacheKey = (text, model) => [S.elVoice, model, S.elStability, S.elSimilarity, S.elStyle, text].join('|');
  // MP3 for a text: memory, then IndexedDB, then the API (once; concurrent asks share the promise).
  function get(text, model) {
    const k = cacheKey(text, model);
    if (mem.has(k)) return mem.get(k);
    const p = (async () => {
      const hit = db && await db.get(k);
      if (hit) return hit;
      const r = await api(`/v1/text-to-speech/${encodeURIComponent(S.elVoice)}/stream?output_format=mp3_44100_128`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: model, voice_settings: settings() }),
      });
      const blob = await r.blob();
      if (!blob.size) throw new Error('empty audio');
      db && db.put(k, blob);
      return blob;
    })();
    mem.set(k, p);
    p.catch(() => mem.delete(k));
    if (mem.size > 120) mem.delete(mem.keys().next().value);
    return p;
  }
  // What to send: the expressive markup (v3 model) when asked for and it only adds tags; otherwise the plain verse.
  // Tagged text goes only to the v3 model (any other model, or the phone voice, would read the tags aloud).
  const pick = (text, entry) => (S.elExpressive && validMarkup(entry, text)) ? [entry.t, 'eleven_v3'] : [stripTags(text), S.elModel || 'eleven_multilingual_v2'];

  function prefetch(text, entry) { if (ready() && text) { const [t, m] = pick(text, entry); get(t, m).catch(e => { if (ready()) fail(e.message || 'error'); }); } }   // a failed fetch ahead also switches to the phone voice

  function rateFor(item) {
    // Fit the recording to the verse's length in the music (dur = 1× score seconds), so it ends with the verse,
    // then the speed. preservesPitch keeps the voice's pitch at every rate.
    const fit = item.dur && audio.duration ? Math.min(1.6, Math.max(0.75, audio.duration / item.dur)) : 1;
    return Math.min(8, Math.max(0.25, speed * fit));
  }
  async function playNext() {
    if (playing || paused || !queue.length) return;
    const item = queue.shift(), my = token;
    playing = item;
    try {
      const blob = await item.blob;
      if (my !== token) return;
      const url = URL.createObjectURL(blob);
      audio.src = url;
      await new Promise((res, rej) => { audio.onloadedmetadata = res; audio.onerror = () => rej(new Error('audio could not play')); });
      if (my !== token) { URL.revokeObjectURL(url); return; }
      audio.playbackRate = rateFor(item);
      await audio.play();
      await new Promise(res => { audio.onended = res; audio.onpause = () => { if (!paused) res(); }; item.stop = res; });
      URL.revokeObjectURL(url);
    } catch (e) {
      if (my === token) { fail(e.message || 'error'); item.fallback?.(); }
    } finally {
      if (my === token) { playing = null; playNext(); }
    }
  }
  // Speak a verse. dur = the verse's length in the score at 1× (seconds). fallback() reads it with the phone voice.
  // Same rule as the phone voice: a verse still playing is never cut off, but if a whole verse is already
  // waiting when the next arrives, the backlog is dropped so the lag cannot grow.
  function speak(text, { dur, sp, entry, fallback }) {
    speed = sp;
    if (!ready()) return false;
    if (queue.length || playing) stopNow();   // locked to the music: the new verse starts on time
    const [t, m] = pick(text, entry);
    const blob = get(t, m);
    queue.push({ blob, dur, fallback });
    playNext();
    return true;
  }
  function stopNow() { token++; queue = []; if (playing && playing.stop) playing.stop(); playing = null; try { audio.pause(); } catch {} }
  return {
    speak, prefetch, voices, models, ready, get reason() { return lastReason; },
    setSpeed(sp) { speed = sp; if (playing && !audio.paused) audio.playbackRate = rateFor(playing); },
    stop() { paused = false; stopNow(); },
    pause() { paused = true; try { audio.pause(); } catch {} },
    resume() { if (!paused) return; paused = false; if (playing && audio.src) audio.play().catch(() => {}); else playNext(); },
    reset() { failedUntil = 0; lastReason = ''; },
    clearCache() { mem.clear(); return db ? db.clear() : Promise.resolve(); },
    // Phones only let audio start inside a tap: call this from the first tap.
    unlock() {
      try {
        // 0.05 s of silence as a WAV, made here (no file, no network).
        const n = 1102, b = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, t) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
        w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
        b.setUint32(24, 22050, true); b.setUint32(28, 44100, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
        audio.src = URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
        audio.play().then(() => audio.pause()).catch(() => {});
      } catch {}
    },
  };
}

// One reader for the page: ElevenLabs when it is set up and working, the phone's voice otherwise.
export function createReader(device, eleven) {
  let on = device.on;
  return {
    get available() { return device.available || !!getKey(); },
    get on() { return on; },
    set on(x) { on = !!x; device.on = on; if (!on) eleven.stop(); },
    get using() { return eleven.ready() ? 'eleven' : 'device'; },
    // text is always the plain verse; meta.entry is its markup, used only by ElevenLabs v3.
    speak(text, wpm, speed, meta = {}) {
      if (!on || !text) return;
      text = stripTags(text);
      const fallback = () => device.speak(text, wpm, speed);
      if (eleven.speak(text, { dur: meta.dur, sp: speed, entry: meta.entry, fallback })) { device.stop(); return; }
      device.speak(text, wpm, speed);
    },
    restart(text, wpm, speed) {
      if (eleven.ready()) { eleven.setSpeed(speed); return; }   // ElevenLabs: the playing verse just changes rate
      device.restart(text, wpm, speed);
    },
    prefetch: (t, entry) => eleven.prefetch(stripTags(t), entry),
    stop() { device.stop(); eleven.stop(); },
    pause() { device.pause(); eleven.pause(); },
    resume() { device.resume(); eleven.resume(); },
  };
}
