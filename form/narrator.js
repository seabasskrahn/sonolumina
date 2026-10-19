// The Form: the reading voice. Uses the phone's own speech voice (no network, no AI).
// Scripture is always spoken and shown; the tones never replace the text.
// Known gap: the phone's speech does not pass through the audio graph, so the
// light cannot react to the voice itself.
//
// Preview build: a chosen voice (English voices first), pitch, and playback speed.
// The rate is the music's reading pace (already multiplied by the speed); at 1× it is
// clamped 0.7–1.4 as before, and the speed then scales it.
// Seabass's rule (build p2): from 0.5× to 3× the voice speeds up with the music and never goes silent,
// and voice, highlight and harmonics stay locked on the same verse. Phone voices only speed up so far
// (about 1.4× on many phones; set in Settings as "Phone voice top rate"). Past that the rate is held at
// the top and the voice keeps in step by starting every verse on time: a verse it has not finished is
// cut off when the next begins (shown on screen as "in step"). ElevenLabs/cached audio has no such limit.
// Above MAX_RATE× speed (the dial goes to 10×) the page mutes the voice, as Logos Theta did.

const SPEECH_WPM = 175;   // typical speech rate at rate 1 (an estimate; voices differ)
export const MAX_RATE = 3; // the voice reads at every speed up to 3×; above it, words and tones only
export const DEVICE_TOPS = [1.4, 2, 3]; // choices for the phone voice's top rate (phones differ: UNVERIFIED per phone)

export function createNarrator() {
  const synth = window.speechSynthesis;
  let on = !!synth, voice = null, wanted = '', pitch = 1, top = 1.4;

  const english = v => /^en(-|_|$)/i.test(v.lang);
  // How natural a voice is likely to sound, from its name (the platforms name their best voices):
  // Apple "Premium"/"Enhanced" and Siri, Microsoft "Natural"/"Online (Natural)", Google voices, "Neural".
  const quality = v => {
    const n = v.name;
    if (/premium/i.test(n)) return 5;
    if (/enhanced|siri/i.test(n)) return 4;
    if (/natural|neural/i.test(n)) return 4;
    if (/^google/i.test(n) || /microsoft .* online/i.test(n)) return 3;
    if (/microsoft/i.test(n)) return 1;
    return 0;
  };
  // All voices: English first, the most natural first within it, then by name.
  function list() {
    const vs = synth?.getVoices() || [];
    return [...vs].sort((a, b) => (english(b) - english(a)) || (quality(b) - quality(a)) || (b.localService - a.localService) || a.name.localeCompare(b.name));
  }
  // With no choice saved: the most natural English voice on the phone itself (no network), else any English voice.
  function pickVoice() {
    const vs = synth?.getVoices() || [], ranked = list();
    voice = (wanted && vs.find(v => v.voiceURI === wanted || v.name === wanted))
      || ranked.find(v => english(v) && v.localService) || ranked.find(v => english(v)) || vs[0] || null;
    changed?.();
  }
  let changed = null;
  if (synth) { pickVoice(); synth.addEventListener?.('voiceschanged', pickVoice); if (!synth.addEventListener) synth.onvoiceschanged = pickVoice; }

  // rate for a reading pace in words per minute; speed = the playback multiplier already in wpm.
  const want = (wpm, speed) => Math.min(1.4, Math.max(0.7, wpm / speed / SPEECH_WPM)) * speed;
  function rateFor(wpm, speed = 1) { return Math.min(top, Math.max(0.3, want(wpm, speed))); }
  // True when the music needs the voice faster than the phone's top rate.
  const held = (wpm, speed = 1) => want(wpm, speed) > top + 1e-6;

  function utter(text, rate) {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en';
    u.rate = rate;
    u.pitch = pitch;
    return u;
  }

  // Speak a verse at the pace the music reads it (words per minute).
  // Locked to the music (build p2): a new verse always starts on time; if the voice is still on the
  // last one it is cut off, so voice and highlight are never on different verses.
  // Preview build: long verses are read in pieces of up to ~180 characters, split at
  // punctuation, because some phone voices stop after about 15 s of one utterance.
  let waiting = 0, token = 0;
  const pieces = text => {
    const out = [];
    let cur = '';
    for (const part of text.match(/[^,;:.!?]+[,;:.!?]*["”’']*\s*/g) || [text]) {
      if ((cur + part).length > 180 && cur) { out.push(cur.trim()); cur = ''; }
      cur += part;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  function queue(text, rate) {
    const my = token, ps = pieces(text);
    waiting++;
    ps.forEach((p, i) => {
      const u = utter(p, rate);
      if (i === 0) u.onstart = () => { if (my === token) waiting = Math.max(0, waiting - 1); };
      u.onerror = () => { if (i === 0 && my === token) waiting = Math.max(0, waiting - 1); };
      synth.speak(u);
    });
  }
  function speak(text, wpm, speed = 1) {
    if (!on || !synth || !text) return;
    if (synth.speaking || synth.pending) { synth.cancel(); token++; }
    waiting = 0;
    queue(text, rateFor(wpm, speed));
  }
  // After a speed change or a seek: stop at once and read the rest of the verse at the new rate.
  function restart(text, wpm, speed = 1) {
    if (!on || !synth) return;
    synth.cancel(); token++; waiting = 0;
    if (text) queue(text, rateFor(wpm, speed));
  }
  function test(text = 'In the beginning God created the heavens and the earth.', rate = 1) {
    if (!synth) return;
    synth.cancel(); token++; waiting = 0;
    synth.speak(utter(text, rate));
  }

  return {
    speak, restart, test, list, rateFor, held, quality,
    get top() { return top; }, set top(x) { top = Math.min(3, Math.max(1, +x || 1.4)); },
    pause() { synth?.pause(); },
    resume() { synth?.resume(); },
    stop() { synth?.cancel(); token++; waiting = 0; },
    get available() { return !!synth; },
    get on() { return on; },
    set on(x) { on = !!x && !!synth; if (!on) { synth?.cancel(); token++; waiting = 0; } },
    get voice() { return voice; },
    set voiceName(x) { wanted = x || ''; pickVoice(); },
    get pitch() { return pitch; },
    set pitch(x) { pitch = Math.min(2, Math.max(0, +x || 1)); },
    set onvoices(f) { changed = f; },
  };
}
