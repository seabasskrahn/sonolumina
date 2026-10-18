// The Law, E and K(E): a verse's feeling, and what it does to the music.
// Pure data and functions only.
//
// E(v) = (valence, arousal, dominance), each 0..1, one per verse.
// Origin: NRC Valence, Arousal, and Dominance Lexicon (Saif M. Mohammad,
// National Research Council Canada, 2018), a list of modern English word
// ratings, applied to the BSB, WEB, KJV and Strong's glosses and blended with
// the chapter arc and the book mean (logos-theta tools/build_vad.py).
// It is not from Scripture itself; a Scripture-only source is still to come.
// Research/non-commercial use with credit; only per-verse scores are shipped.

export const EMOTION_SOURCE = 'verse feeling: NRC VAD word list (modern English), not from Scripture';

// Stored as one string per chapter, 6 digits VVAADD per verse, each 0..99.
export function verseE(vadBook, chapter, v) {
  const s = vadBook[chapter - 1] || '';
  const x = s.slice((v - 1) * 6, v * 6);
  if (x.length < 6) return { v: 0.5, a: 0.5, d: 0.5 };
  return { v: +x.slice(0, 2) / 99, a: +x.slice(2, 4) / 99, d: +x.slice(4, 6) / 99 };
}

// Ebar = λ·E + (1−λ)·Ebar_prev, within a chapter: feeling carries over between verses.
export function smooth(E, prev, l = 0.5) {
  if (!prev) return { ...E };
  return { v: l * E.v + (1 - l) * prev.v, a: l * E.a + (1 - l) * prev.a, d: l * E.d + (1 - l) * prev.d };
}

// Modes as just ratios, all on the same tonic (the home note).
// Origin: the church modes in just intonation; emotion → mode is a Western convention.
export const MODES = {
  Lydian:     [1, 9/8, 5/4, 45/32, 3/2, 5/3, 15/8],
  Ionian:     [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8],
  Mixolydian: [1, 9/8, 5/4, 4/3, 3/2, 5/3, 16/9],
  Dorian:     [1, 9/8, 6/5, 4/3, 3/2, 5/3, 16/9],
  Aeolian:    [1, 9/8, 6/5, 4/3, 3/2, 8/5, 9/5],
};

export function modeOf(E) {
  if (E.v > 0.7) return E.d > 0.6 ? 'Lydian' : 'Ionian';
  if (E.v > 0.5) return 'Mixolydian';
  if (E.v > 0.32) return 'Dorian';
  return 'Aeolian';
}

// Words for what the music is doing, shown on screen.
export function feeling(E) {
  const m = modeOf(E);
  const name = { Lydian: 'joy', Ionian: 'joy', Mixolydian: 'peace', Dorian: 'longing', Aeolian: 'sorrow' }[m];
  const pace = E.a > 0.55 ? 'stirring' : E.a > 0.3 ? 'moving' : 'still';
  const stance = E.d > 0.6 ? 'majestic' : E.d > 0.4 ? 'steady' : 'humble';
  return `${name} · ${pace} · ${stance}`;
}

// K(E): emotion → music.
export function K(E) {
  return {
    mode: modeOf(E),
    bpm: 54 + 30 * E.a,                       // arousal sets the tempo, 54–84 BPM
    dens: E.a > 0.55 ? 8 : E.a > 0.3 ? 6 : 4, // arpeggio notes per bar
    loud: 0.75 + 0.5 * E.a,
    reg: 2 ** ((E.d - 0.5) * 0.6),           // dominance raises or lowers the register
    bright: 700 + 900 * E.d,                  // and brightens the sound
    hue: 210 - 170 * E.v,                     // light: cool blue at sorrow, warm gold at joy
  };
}

// Fold a ratio into one octave: returns [ratio in 1..2, octave factor].
export function fold(r) {
  let o = 1;
  while (r >= 2) { r /= 2; o *= 2; }
  while (r < 1) { r *= 2; o /= 2; }
  return [r, o];
}

// Snap a frequency to the nearest note of the mode (same octave), over the home note.
export function snapMode(freq, home, mode) {
  const [r, o] = fold(freq / home);
  const set = MODES[mode].concat([2]);
  let best = set[0];
  for (const c of set) if (Math.abs(Math.log(r / c)) < Math.abs(Math.log(r / best))) best = c;
  return home * best * o;
}
