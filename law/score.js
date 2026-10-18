// The Law: a verse becomes a sequence of tones.
// Pure functions only. Times are in beats from the start of the verse.

import { tone } from './codebook.js';

// A pause after punctuation, in beats: the text's own breathing.
export function restAfter(word) {
  if (/[.!?;:]["”’']*$/.test(word)) return 1;
  if (/[,—–]["”’']*$/.test(word)) return 0.5;
  return 0;
}

// Day 3: every word sounds its own tone for one beat, in reading order.
// Words without a codebook entry are kept in the text but stay silent.
export function scoreWords(lex, text) {
  const shown = text.split(/\s+/).filter(Boolean);
  const events = [];
  let beat = 0;
  shown.forEach((w, i) => {
    const t = tone(lex, w);
    events.push({ index: i, word: w, beat, beats: 1, tone: t });
    beat += 1 + restAfter(w);
  });
  return { words: shown, events, beats: beat };
}
