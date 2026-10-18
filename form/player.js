// The Form: playing a chapter. The Law (law/chapter.js) has already decided
// every note; this file only schedules it on the audio clock and tells the
// page what is current.

import { F0, HARMONICS } from '../law/home.js';
import { scoreChapter } from '../law/chapter.js';
import { createVoices } from './voices.js';

// The music dips about 8 dB while the voice reads, and swells in the gaps.
const DUCK = 0.4;

export function createPlayer({ engine, lex, vadBook, chapter, chapterText, final = false, onVerse, onWord, onClose, onEnd, narrating = () => false }) {
  const score = scoreChapter({ lex, text: chapterText, vadBook, chapter, final });
  const timeline = [];    // page events: { at, verse } or { at, verse, index }
  let cursor = 0, next = 0, t0 = 0, voices = null, timer = 0, paused = false;

  // The home note sounds quietly under everything: the pupil every tone is measured from.
  function homeDrone(at, until) {
    const total = HARMONICS.reduce((s, h) => s + h.amp, 0);
    for (const h of HARMONICS) engine.tone({
      freq: F0 * h.ratio, ratio: h.ratio, at, dur: until - at,
      gain: 0.04 * h.amp / total, attack: 2.5, release: 3,
    });
  }

  function scheduleVerse(vs) {
    const T = t => t0 + t, { k, E } = vs;
    voices.brightness(1100 + k.bright * 0.6, T(vs.at));
    if (narrating()) {
      voices.loudness(k.loud * DUCK, T(vs.at));
      voices.loudness(k.loud, T(Math.max(vs.at + 0.5, vs.at + vs.dur - 1.1)));
    } else voices.loudness(k.loud, T(vs.at));
    for (const b of vs.bars) {
      voices.cello(b.bass, T(b.t), b.dur * 0.96, 0.22);
      voices.strings(b.pad, T(b.t), b.dur, k.strV);
      for (const n of b.arp) voices.epiano(n.freq, T(n.t), n.dur, 0.07 + 0.03 * E.a + (n.accent ? 0.03 : 0));
    }
    for (const n of vs.melody) {
      voices.celesta(n.freq, T(n.t), k.celV * n.vel);
      // Companion partials sound softly with the melody note (0.35 alpha).
      for (const p of n.partials) voices.celesta(p.freq, T(n.t) + 0.03, k.celV * n.vel * 0.35 * p.alpha);
    }
  }

  // Rest: the tonic chord, with the bass on the home note itself, held and fading.
  function scheduleClose(c) {
    const t = t0 + c.t, k = score.verses.filter(vs => !vs.omitted).pop().k;
    voices.loudness(k.loud, t);
    voices.cello(c.bass, t, c.dur * 0.7, 0.22);
    voices.strings(c.pad, t, c.dur - 1.6, k.strV);
    voices.celesta(c.melody, t, k.celV * 0.6);
  }

  function play() {
    engine.start();
    voices = voices || createVoices(engine);
    t0 = engine.time + 0.4;
    for (const vs of score.verses) {
      if (vs.omitted) continue;
      timeline.push({ at: t0 + vs.at, verse: vs.verse, vs });
      for (const w of vs.words) timeline.push({ at: t0 + w.t, verse: vs.verse, index: w.index });
    }
    if (score.close) timeline.push({ at: t0 + score.close.t, close: true });
    timeline.sort((a, b) => a.at - b.at || (b.vs ? 1 : 0) - (a.vs ? 1 : 0));
    homeDrone(t0, t0 + score.dur);
    // A timer, not animation frames, drives the music: it keeps going when the
    // screen is off (browsers slow timers to about once a second, so look ahead 3 s).
    timer = setInterval(tick, 50);
    tick();
    return score.dur;
  }

  function pause() {
    if (paused || !engine.ctx) return;
    paused = true;
    engine.ctx.suspend();   // the audio clock stops, so text and music stay together
  }
  function resume() {
    if (!paused) return;
    paused = false;
    engine.ctx.resume();
  }

  function tick() {
    const now = engine.time;
    // Schedule each verse about three seconds before it begins.
    while (next < score.verses.length && t0 + score.verses[next].at - now < 3) { const vs = score.verses[next++]; if (!vs.omitted) scheduleVerse(vs); }
    if (score.close && next === score.verses.length && t0 + score.close.t - now < 3) { scheduleClose(score.close); next++; }
    while (cursor < timeline.length && timeline[cursor].at <= now) {
      const ev = timeline[cursor++];
      if (ev.close) onClose?.();
      else if (ev.vs) onVerse?.(ev.verse, ev.vs.words.map(w => w.word), ev.vs.E, ev.vs.k, ev.vs);
      else onWord?.(ev.verse, ev.index);
    }
    if (now >= t0 + score.dur + 1) { clearInterval(timer); onEnd?.(); }
  }

  return { play, pause, resume, score, get paused() { return paused; } };
}
