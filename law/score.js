// The Law: a verse becomes a sequence of tones in time.
// Pure functions only. Times are in beats from the start of the verse.
//
// Three time scales:
//   (a) within a verse: each word is an eighth note (half a beat), with rests at punctuation;
//   (b) the chapter arc and (c) the whole book are carried by E (law/emotion.js),
//       which sets the tempo and mode verse by verse.

import { F0 } from './home.js';
import { tone } from './codebook.js';
import { K, snapMode } from './emotion.js';

export const WORD_BEATS = 0.5;

// A pause after punctuation, in beats: the text's own breathing.
export function restAfter(word) {
  if (/[.!?;:]["”’']*$/.test(word)) return 1;
  if (/[,—–]["”’']*$/.test(word)) return 0.5;
  return 0;
}

// Every word in reading order with its codebook tone.
// Words without a codebook entry are kept in the text but stay silent.
export function scoreWords(lex, text) {
  const shown = text.split(/\s+/).filter(Boolean);
  const events = [];
  let beat = 0;
  shown.forEach((w, i) => {
    events.push({ index: i, word: w, beat, beats: WORD_BEATS, tone: tone(lex, w) });
    beat += WORD_BEATS + restAfter(w);
  });
  return { words: shown, events, beats: beat };
}

// A verse under K(E): tempo from arousal, every tone snapped to the mode.
export function scoreVerse(lex, text, E, home = F0) {
  const k = K(E);
  const s = scoreWords(lex, text);
  for (const e of s.events) {
    if (!e.tone) continue;
    const freq = snapMode(e.tone.freq, home, k.mode);
    e.freq = freq;
    e.partials = e.tone.partials
      .map(p => ({ freq: snapMode(freq * p.freq / e.tone.freq, home, k.mode), alpha: p.alpha }))
      .filter(p => Math.abs(p.freq - freq) > 1e-6);
  }
  return { ...s, k, beatSec: 60 / k.bpm };
}
