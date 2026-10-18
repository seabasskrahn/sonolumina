// The Form: the reading voice. Uses the phone's own speech voice (no network, no AI).
// Scripture is always spoken and shown; the tones never replace the text.
// Known gap: the phone's speech does not pass through the audio graph, so the
// light cannot react to the voice itself.

const SPEECH_WPM = 175;   // typical speech rate at rate 1 (an estimate; voices differ)

export function createNarrator() {
  const synth = window.speechSynthesis;
  let on = !!synth, voice = null;

  function pickVoice() {
    const vs = synth?.getVoices() || [];
    voice = vs.find(v => /^en(-|_)/i.test(v.lang) && v.localService) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  // Speak a verse at the pace the music reads it (words per minute).
  // A verse still being read is never cut off: the next one waits its turn.
  // Only if a whole verse is already waiting (the voice is over a verse
  // behind) is the backlog dropped, so the lag can never grow.
  function speak(text, wpm) {
    if (!on || !synth) return;
    if (synth.speaking && synth.pending) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en';
    u.rate = Math.min(1.4, Math.max(0.7, wpm / SPEECH_WPM));
    synth.speak(u);
  }

  return {
    speak,
    pause() { synth?.pause(); },
    resume() { synth?.resume(); },
    stop() { synth?.cancel(); },
    get available() { return !!synth; },
    get on() { return on; },
    set on(x) { on = !!x && !!synth; if (!on) synth?.cancel(); },
  };
}
