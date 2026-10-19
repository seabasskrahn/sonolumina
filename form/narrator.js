// The Form: the reading voice. Uses the phone's own speech voice (no network, no AI).
// Scripture is always spoken and shown; the tones never replace the text.
// Known gap: the phone's speech does not pass through the audio graph, so the
// light cannot react to the voice itself.
//
// Preview build: a chosen voice (English voices first), pitch, and playback speed.
// The rate is the music's reading pace (already multiplied by the speed); at 1× it is
// clamped 0.7–1.4 as before, and the speed then scales it, up to the speech max (MAX_RATE).
// Above MAX_RATE× speed the page mutes the voice (words and tones only), as Logos Theta did.

const SPEECH_WPM = 175;   // typical speech rate at rate 1 (an estimate; voices differ)
export const MAX_RATE = 3; // browsers accept more, but most phone voices stop speeding up near 3×

export function createNarrator() {
  const synth = window.speechSynthesis;
  let on = !!synth, voice = null, wanted = '', pitch = 1;

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
  function rateFor(wpm, speed = 1) {
    const base = Math.min(1.4, Math.max(0.7, wpm / speed / SPEECH_WPM));
    return Math.min(MAX_RATE, Math.max(0.5, base * speed));
  }

  function utter(text, rate) {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en';
    u.rate = rate;
    u.pitch = pitch;
    return u;
  }

  // Speak a verse at the pace the music reads it (words per minute).
  // A verse still being read is never cut off: the next one waits its turn.
  // Only if a whole verse is still waiting to start (the voice is over a verse
  // behind) is the backlog dropped, so the lag can never grow.
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
    if (waiting > 0 && synth.speaking) { synth.cancel(); token++; waiting = 0; }
    else if (!synth.speaking && !synth.pending) waiting = 0;
    queue(text, rateFor(wpm, speed));
  }
  // After a speed change or a seek: stop at once and read the rest of the verse at the new rate.
  function restart(text, wpm, speed = 1) {
    if (!on || !synth) return;
    synth.cancel(); token++; waiting = 0;
    if (text) queue(text, rateFor(wpm, speed));
  }
  function test(text = 'In the beginning God created the heavens and the earth.') {
    if (!synth) return;
    synth.cancel(); token++; waiting = 0;
    synth.speak(utter(text, 1));
  }

  return {
    speak, restart, test, list, rateFor, quality,
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
