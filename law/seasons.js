// The Law, Day 4: lights for seasons. Each chapter's feeling, seen across the whole Bible.
// Pure functions only. The values come from the stored verse feeling (data/vad), never typed.

import { K } from './emotion.js';

// A chapter's mean valence: its stored VVAADD string, the V of every verse averaged (0..1).
export function meanV(chapterVad) {
  const n = Math.floor((chapterVad || '').length / 6);
  if (!n) return 0.5;
  let t = 0;
  for (let i = 0; i < n; i++) t += +chapterVad.slice(i * 6, i * 6 + 2) / 99;
  return t / n;
}

// A season's colour uses the light's own hue rule (K): cool blue at sorrow, warm gold at joy.
export const seasonHue = V => K({ v: V, a: 0.5, d: 0.5 }).hue;

// Variant B (Seabass, 2026-10-19): each chapter ranked against all the others, 0 = the most sorrowful mean,
// 1 = the most joyful, so the strip uses the light's whole range. Equal means share their average rank.
export function ranks(Vs) {
  const n = Vs.length, out = new Array(n);
  if (n < 2) return out.fill(0.5);
  const order = Vs.map((v, i) => i).sort((a, b) => Vs[a] - Vs[b]);
  for (let s = 0; s < n;) {
    let e = s;
    while (e + 1 < n && Vs[order[e + 1]] === Vs[order[s]]) e++;
    for (let k = s; k <= e; k++) out[order[k]] = (s + e) / 2 / (n - 1);
    s = e + 1;
  }
  return out;
}
