// The Law: harmony, and the Resolution rule (Res) built into it.
// Pure functions only. Ported from the approved engine (logos-theta engine.js, build 2026101301).
//
// Res: every verse ends V–I (authentic cadence), the last verse of a chapter
// ends IV–I (the plagal "Amen"), and the cadential V always carries the
// leading tone 15/8, even in the minor-flavoured modes. Gratitude is resolution.

import { MODES } from './emotion.js';

// Chords as scale degrees (0-based, 7 per octave).
export const DEG = { I: [0, 2, 4], vi: [5, 7, 9], IV: [3, 5, 7], V: [4, 6, 8] };
export const RING = ['I', 'vi', 'IV', 'V'];

const deg = (scale, d) => scale[d % 7] * 2 ** Math.floor(d / 7);

// Chord tones as ratios to the home note. cad = this is the cadential V.
export function chordR(mode, chord, cad = false) {
  return DEG[chord].map(d =>
    cad && chord === 'V' && d % 7 === 6 ? (15 / 8) * 2 ** Math.floor(d / 7) : deg(MODES[mode], d));
}

// Move a frequency into the octave [lo, 2·lo).
export function reg(f, lo) {
  while (f < lo) f *= 2;
  while (f >= lo * 2) f /= 2;
  return f;
}

// The chord whose tones lie nearest the verse's word tones (ratios to home).
export function bestChord(mode, rels) {
  let c0 = 'I', bs = 1e9;
  for (const c of RING) {
    let sc = 0;
    for (const r of rels) {
      sc += Math.min(...chordR(mode, c).map(t => Math.abs(Math.log2(reg(r, 1) / reg(t, 1)))));
    }
    if (sc < bs - 1e-9) { bs = sc; c0 = c; }
  }
  return c0;
}

// One chord per bar, around the ring, always ending home.
export function progression(nb, c0, chapterEnd) {
  const i0 = RING.indexOf(c0);
  const p = Array.from({ length: nb }, (_, b) => RING[(i0 + b) % 4]);
  p[nb - 1] = 'I';
  p[nb - 2] = chapterEnd ? 'IV' : 'V';
  if (nb > 2 && p[nb - 3] === p[nb - 2]) p[nb - 3] = chapterEnd ? 'vi' : 'IV';
  return p;
}

// When the mode changes at a verse boundary, the first bar uses a chord
// whose tones are the same in both modes (tried IV, V, vi, I).
export function pivot(from, to) {
  if (!from || from === to) return null;
  const same = c => {
    const a = chordR(from, c), b = chordR(to, c);
    return a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
  };
  return ['IV', 'V', 'vi', 'I'].find(same) || null;
}

// Pitch class of a ratio (folded into one octave).
export function pc(r) {
  while (r >= 2) r /= 2;
  while (r < 1) r *= 2;
  return r;
}
