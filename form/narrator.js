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
  // All voices, English first (local ones first within each group), then by name.
  function list() {
    const vs = synth?.getVoices() || [];
    return [...vs].sort((a, b) => (english(b) - english(a)) || (b.localService - a.localService) || a.name.localeCompare(b.name));
  }
  function pickVoice() {
    const vs = synth?.getVoices() || [];
    voice = (wanted && vs.find(v => v.voiceURI === wanted || v.name === wanted))
      || vs.find(v => english(v) && v.localService) || vs.find(v => /^en/i.test(v.lang)) || vs[0] || null;
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
  // Only if a whole verse is already waiting (the voice is over a verse
  // behind) is the backlog dropped, so the lag can never grow.
  function speak(text, wpm, speed = 1) {
    if (!on || !synth || !text) return;
    if (synth.speaking && synth.pending) synth.cancel();
    synth.speak(utter(text, rateFor(wpm, speed)));
  }
  // After a speed change or a seek: stop at once and read the rest of the verse at the new rate.
  function restart(text, wpm, speed = 1) {
    if (!on || !synth) return;
    synth.cancel();
    if (text) synth.speak(utter(text, rateFor(wpm, speed)));
  }
  function test(text = 'In the beginning God created the heavens and the earth.') {
    if (!synth) return;
    synth.cancel();
    synth.speak(utter(text, 1));
  }

  return {
    speak, restart, test, list, rateFor,
    pause() { synth?.pause(); },
    resume() { synth?.resume(); },
    stop() { synth?.cancel(); },
    get available() { return !!synth; },
    get on() { return on; },
    set on(x) { on = !!x && !!synth; if (!on) synth?.cancel(); },
    get voice() { return voice; },
    set voiceName(x) { wanted = x || ''; pickVoice(); },
    get pitch() { return pitch; },
    set pitch(x) { pitch = Math.min(2, Math.max(0, +x || 1)); },
    set onvoices(f) { changed = f; },
  };
}
