// The Law, R(w): each word's tone, from how Scripture itself uses the word.
// Pure data and functions only. Verified against the text by tools/verify_codebook.py.

import { F0 } from './home.js';

// 12-step just scale. Origin: just intonation, tuning by whole-number ratios (a human craft).
export const JUST = [1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8];
// Consonances a companion word snaps to: unison, major third, fourth, fifth, octave.
export const CONS = [1, 5/4, 4/3, 3/2, 2];
// Weights of the two companions in N(w).
export const COMPANION_ALPHA = [2 / 3, 1 / 3];

// English stem: same rules the codebook was built with.
export function stem(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  for (const suf of ['eth', 'est', 'ing', 'ed', 'es', 's']) {
    if (w.length - suf.length >= 3 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
}

// Codebook entry: [step, octave, c1, c2, count, first]. All six fields, always.
export function entry(lex, word) {
  const e = lex[stem(word)];
  if (!e) return null;
  const [step, octave, c1, c2, count, first] = e;
  return { step, octave, c1, c2, count, first };
}

// R(w): the word's ratio to the home note.
export function ratio(e) {
  return JUST[e.step] * 2 ** e.octave;
}

// Sound(w): the word's frequency plus its companions' partials (recursion cut at one level).
export function tone(lex, word, f0 = F0) {
  const e = entry(lex, word);
  if (!e) return null;
  const freq = f0 * ratio(e);
  const partials = [e.c1, e.c2].map((c, i) => ({ freq: freq * CONS[c], alpha: COMPANION_ALPHA[i] }));
  return { word, stem: stem(word), freq, ratio: ratio(e), ...e, partials };
}

// Words of a verse as written (punctuation kept on the display form).
export function words(text) {
  return text.split(/\s+/).filter(w => stem(w));
}
