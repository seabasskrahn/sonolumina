// The Law, Day 1: the home note.
// Pure data and functions only. Nothing here touches sound or screen.

// F0: every tone is measured from this note and returns to it.
// Origin: a human tuning choice (A2 = 110 Hz, the A an octave below 220).
// It is not named in Scripture.
export const F0 = 110;

// The overtones that sound with any real tone: whole-number multiples of F0.
// Origin: physics (the harmonic series). The amplitudes 1/n are a design
// choice that gives a soft, organ-like timbre and lets phone speakers,
// which cannot reproduce 110 Hz well, still carry the home note.
export const HARMONICS = [1, 2, 3, 4, 5].map(n => ({ n, ratio: n, amp: 1 / n }));

// Honest labels, shown on screen beside the sound.
export const LABELS = {
  F0: '110 Hz home note · a human tuning choice, not from Scripture',
  HARMONICS: 'overtones 2× 3× 4× 5× · physics (harmonic series)',
};

// Bessel function of the first kind, order 0 (Abramowitz & Stegun 9.4.1/9.4.3).
// Used for the standing-wave ripple of a vibrating circular dish (cymatics).
export function J0(x) {
  const ax = Math.abs(x);
  if (ax < 3) {
    const y = (x / 3) ** 2;
    return 1 + y * (-2.2499997 + y * (1.2656208 + y * (-0.3163866 +
      y * (0.0444479 + y * (-0.0039444 + y * 0.0002100)))));
  }
  const y = 3 / ax;
  const f0 = 0.79788456 + y * (-0.00000077 + y * (-0.00552740 + y * (-0.00009512 +
    y * (0.00137237 + y * (-0.00072805 + y * 0.00014476)))));
  const t0 = ax - 0.78539816 + y * (-0.04166397 + y * (-0.00003954 + y * (0.00262573 +
    y * (-0.00054125 + y * (-0.00029333 + y * 0.00013558)))));
  return f0 * Math.cos(t0) / Math.sqrt(ax);
}

// Radial standing-wave profile of the dish for a set of sounding partials.
// r runs 0..1 from centre to rim. Each partial's ripple has spatial frequency
// proportional to its frequency ratio, so the pattern grows from the sound.
export function dishProfile(partials, steps, k = 9) {
  const out = new Float32Array(steps);
  let total = 0;
  for (const p of partials) total += p.amp;
  for (let i = 0; i < steps; i++) {
    const r = i / (steps - 1);
    let s = 0;
    for (const p of partials) s += p.amp * J0(k * p.ratio * r);
    out[i] = Math.abs(s / total);
  }
  return out;
}

// Exact verse text from the data file. Never typed by hand.
// data shape: { b: book, c: [chapter][verse] }
export function verse(bookData, chapter, v) {
  return bookData.c[chapter - 1][v - 1];
}
