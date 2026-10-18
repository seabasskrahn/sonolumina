// The Law: a whole chapter becomes music. Pure data out; the Form only plays it.
// Every note of every voice is decided here, so the tests check exactly what is heard.
// Times are seconds from the start of the chapter. Frequencies are in Hz.
//
// Ported from the approved Score (logos-theta index.html scoreVerse, build 2026101305):
// bars fitted to the verse, a chord per bar ending V–I (IV–I at chapter end),
// a pivot chord when the mode changes, the melody on key words only,
// and the Resolution rule applied to every melody note.

import { F0 } from './home.js';
import { scoreVerse } from './score.js';
import { verseE, smooth } from './emotion.js';
import { chordR, reg, bestChord, progression, pivot, pc } from './harmony.js';

const ARP = [0, 1, 2, 1, 0, 2, 1, 2];   // broken-chord pattern of the counter-melody

export function scoreChapter({ lex, text, vadBook, chapter, home = F0, prevMode = null, prevMel = 0 }) {
  const verses = [];
  let t0 = 0, E = null, lastMode = prevMode, melPrev = prevMel;

  text.forEach((verseText, vi) => {
    const v = vi + 1, last = v === text.length;
    E = smooth(verseE(vadBook, chapter, v), E);
    const s = scoreVerse(lex, verseText, E, home);
    const { k, beatSec: beat } = s;
    const mode = k.mode;
    const dur = s.beats * beat;
    const words = s.events.map(e => ({ index: e.index, word: e.word, t: t0 + e.beat * beat }));

    // Harmony: bars fitted to the verse, ending home.
    const nb = Math.max(2, Math.round(dur / (4 * beat)));
    const bar = dur / nb;
    const rels = s.events.filter(e => e.freq).map(e => e.freq / home);
    const prog = progression(nb, bestChord(mode, rels), last);
    const pv = pivot(lastMode, mode);
    if (pv && nb > 2) prog[0] = pv;
    lastMode = mode;
    const cad = b => b === nb - 2;
    const sub = bar >= 2.4 ? k.dens : Math.min(4, k.dens);
    const bars = prog.map((chord, b) => {
      const ct = chordR(mode, chord, cad(b)).map(r => home * r);
      return {
        t: t0 + b * bar, dur: bar, chord, cad: cad(b), tones: ct,
        bass: reg(ct[0], 65),
        pad: ct.map(f => reg(f, 196)),
        arp: Array.from({ length: sub }, (_, q) => ({
          t: t0 + b * bar + q * bar / sub, dur: bar / sub,
          freq: reg(ct[ARP[q % 8]], 220) * (q === 3 || q === 6 ? 2 : 1), accent: q === 0,
        })),
      };
    });

    // Melody: key words (fewer than 200 uses), quantized to eighths, density from arousal.
    const chordAt = q => { const b = Math.min(nb - 1, Math.floor(q / bar)); return chordR(mode, prog[b], cad(b)).map(r => home * r); };
    const nearCT = (f, q) => {
      let best = f, bd = 1e9;
      for (const c of chordAt(q)) for (let o = -3; o <= 3; o++) {
        const g = c * 2 ** o, d = Math.abs(Math.log2(g / f));
        if (d < bd) { bd = d; best = g; }
      }
      return best;
    };
    // Keep a melody note in its register by whole octaves (a chord tone stays a chord tone).
    const inReg = f => { while (f < LO) f *= 2; while (f > HI) f /= 2; return f; };
    const isCT = (f, q) => chordAt(q).some(c => {
      const d = Math.abs(Math.log2(pc(f / home) / pc(c / home)));
      return d < 0.01 || Math.abs(d - 1) < 0.01;
    });
    const LO = 523 * k.reg, HI = 1568 * k.reg;
    const rests = s.events.filter(e => /[,;:.!?]["”’']*$/.test(e.word)).map(e => (e.beat + e.beats) * beat);
    const per = k.dens >= 8 ? 1 : k.dens >= 6 ? 1.5 : 2;
    const used = new Set();
    let notes = [];
    for (const e of s.events) {
      if (!e.freq || e.tone.count >= 200) continue;
      const q = Math.round(e.beat * beat / (beat / 2)) * (beat / 2);
      const slot = Math.round(q / (beat * per));
      if (used.has(slot)) continue;
      if (rests.some(r => q > r - 0.05 && q < r + beat * 0.9)) continue;
      if (q > dur - beat * 0.5) continue;
      used.add(slot);
      let f = e.freq;
      const ref = melPrev || LO * 1.3;
      while (f < ref / Math.SQRT2) f *= 2;
      while (f > ref * Math.SQRT2) f /= 2;
      while (f < LO) f *= 2;
      while (f > HI) f /= 2;
      melPrev = f;
      notes.push({ q, freq: f, vel: Math.min(1, 0.6 + 40 / (e.tone.count + 40)), word: e.index,
        partials: e.partials.map(p => ({ freq: f * p.freq / e.freq, alpha: p.alpha })) });
    }

    // Res: phrase ends go to chord tones; other non-chord tones resolve by step within half a beat.
    notes.sort((a, b) => a.q - b.q);
    const add = [];
    notes.forEach((nt, i) => {
      const phraseEnd = rests.some(r => r >= nt.q && r - nt.q < beat * 1.1);
      if (phraseEnd) { nt.freq = inReg(nearCT(nt.freq, nt.q)); nt.res = 'phrase-end'; return; }
      if (isCT(nt.freq, nt.q)) return;
      const nx = notes[i + 1], rq = nt.q + beat / 2;
      if (nx && nx.q - nt.q <= beat && isCT(nx.freq, nx.q) && Math.abs(Math.log2(nx.freq / nt.freq)) < 0.25) { nt.res = 'by-next'; return; }
      if (rq < dur - beat * 0.6 && !(nx && nx.q <= rq + 0.01)) {
        add.push({ q: rq, freq: inReg(nearCT(nt.freq, rq)), vel: nt.vel * 0.8, partials: [], res: 'resolution' });
        nt.res = 'resolved';
      } else { nt.freq = inReg(nearCT(nt.freq, nt.q)); nt.res = 'snapped'; }
    });
    notes = notes.concat(add).sort((a, b) => a.q - b.q);

    // The tonic ending: the verse's last melody note is the home note.
    {
      let f = reg(home, LO);
      const ref = melPrev || f;
      while (f < ref / Math.SQRT2 && f * 2 <= HI) f *= 2;
      while (f > ref * Math.SQRT2 && f / 2 >= LO) f /= 2;
      notes.push({ q: dur - beat * 0.5, freq: f, vel: 0.8, partials: [], res: 'tonic' });
      melPrev = f;
    }
    // Companion partials are snapped to the chord so they never clash.
    const melody = notes.map(n => ({
      t: t0 + n.q, freq: n.freq, vel: n.vel, res: n.res, word: n.word,
      partials: n.partials.map(p => ({ freq: nearCT(p.freq, n.q), alpha: p.alpha })),
    }));

    verses.push({ verse: v, at: t0, dur, beat, E, k, mode, words, bars, melody, last });
    t0 += dur + beat;   // a breath between verses
  });

  return { verses, dur: t0, home, lastMode, melPrev };
}
