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
