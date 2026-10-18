// The Form: playing the Bible chapter after chapter. The Law (law/chapter.js) has
// already decided every note of each chapter; this file only schedules it on the
// audio clock and tells the page what is current.
//
// Chapters flow on: each one is scored when the one before is nearing its end,
// carrying its mode and melody on (prevMode/prevMel), and starts where the
// one before ended (its Amen and a breath). Only the last chapter of the Bible has the close.

import { F0, HARMONICS } from '../law/home.js';
import { scoreChapter } from '../law/chapter.js';
import { createVoices } from './voices.js';

// The music dips about 8 dB while the voice reads, and swells in the gaps.
const DUCK = 0.4;
// Ask for the next chapter this many seconds before the current one ends.
const AHEAD = 25;

// first: a loaded chapter { ref, text: [sung text per verse], vadBook, final, ... } (anything else is passed back).
// load(ref) → Promise of the chapter after ref, or null at the end of the Bible.
// linksFor(ch, vs) → Promise of [{ mine: [Hz], theirs: [Hz], dir, t, len, gain, ... }] (t within the verse), or [].
export function createPlayer({ engine, lex, first, load, linksFor, onVerse, onWord, onChapter, onLink, onClose, onEnd, narrating = () => false }) {
  const segs = [];        // { ch, score, t0, next }: chapters in play order
  const timeline = [];    // page events, in time order
  let cursor = 0, timer = 0, paused = false, voices = null, asked = false, ended = false;
  const pending = [];     // link swells, for the page to light their tabs when they sound

  // The home note sounds quietly under everything: the pupil every tone is measured from.
  // Between chapters one drone fades out as the next fades in (3 s, equal and opposite).
  function homeDrone(at, until, first) {
    const total = HARMONICS.reduce((s, h) => s + h.amp, 0);
    for (const h of HARMONICS) engine.tone({
      freq: F0 * h.ratio, ratio: h.ratio, at: first ? at : at - 1.5, dur: until - at + (first ? 1.5 : 3),
      gain: 0.04 * h.amp / total, attack: first ? 2.5 : 3, release: 3,
    });
  }

  function add(ch, t0, prev) {
    const score = scoreChapter({ lex, text: ch.text, vadBook: ch.vadBook, chapter: ch.ref.chapter,
      final: ch.final, prevMode: prev ? prev.lastMode : null, prevMel: prev ? prev.melPrev : 0 });
    const seg = { ch, score, t0, next: 0 };
    segs.push(seg);
    const ev = [{ at: t0, chapter: seg }];
    for (const vs of score.verses) {
      if (vs.omitted) continue;
      ev.push({ at: t0 + vs.at, seg, vs });
      for (const w of vs.words) ev.push({ at: t0 + w.t, seg, verse: vs.verse, index: w.index });
    }
    if (score.close) ev.push({ at: t0 + score.close.t, close: true });
    ev.sort((a, b) => a.at - b.at || (b.vs ? 1 : 0) - (a.vs ? 1 : 0));
    timeline.push(...ev);
    homeDrone(t0, t0 + score.dur, !prev);
    return seg;
  }

  function scheduleVerse(seg, vs) {
    const T = t => seg.t0 + t, { k, E } = vs;
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
    // Linked verses: each swell is sounded only if its tones are ready before it is due; never late.
    linksFor?.(seg.ch, vs).then(ls => {
      for (const l of ls) {
        const at = T(vs.at + l.t);
        if (ended || at < engine.time + 0.05 || !l.theirs.length) continue;
        voices.swell(l.mine, l.theirs, l.dir, at, l.len, l.gain);
        pending.push({ at, link: l, seg, vs });
        pending.sort((a, b) => a.at - b.at);
      }
    }).catch(() => {});
    for (const n of vs.melody) {
      voices.celesta(n.freq, T(n.t), k.celV * n.vel);
      // Companion partials sound softly with the melody note (0.35 alpha).
      for (const p of n.partials) voices.celesta(p.freq, T(n.t) + 0.03, k.celV * n.vel * 0.35 * p.alpha);
    }
  }

  // Rest: the tonic chord, with the bass on the home note itself, held and fading.
  function scheduleClose(seg) {
    const c = seg.score.close, t = seg.t0 + c.t, k = seg.score.verses.filter(vs => !vs.omitted).pop().k;
    voices.loudness(k.loud, t);
    voices.cello(c.bass, t, c.dur * 0.7, 0.22);
    voices.strings(c.pad, t, c.dur - 1.6, k.strV);
    voices.celesta(c.melody, t, k.celV * 0.6);
  }

  function play() {
    engine.start();
    voices = voices || createVoices(engine);
    add(first, engine.time + 0.4, null);
    // A timer, not animation frames, drives the music: it keeps going when the
    // screen is off (browsers slow timers to about once a second, so look ahead 3 s).
    timer = setInterval(tick, 50);
    tick();
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
  function stop() {
    clearInterval(timer);
    ended = true;
  }

  function tick() {
    const now = engine.time, last = segs[segs.length - 1];
    const end = last.t0 + last.score.dur;
    // The next chapter: fetched and scored ahead of time; it starts where this one ends.
    if (!asked && !last.ch.final && !last.noNext && end - now < AHEAD) {
      asked = true;
      load(last.ch.ref).then(ch => {
        asked = false;
        if (ended) return;
        if (!ch) { last.noNext = true; return; }
        add(ch, Math.max(end, engine.time + 0.5), last.score);
      }).catch(() => { asked = false; last.noNext = true; });   // not loaded: the music ends here
    }
    // Schedule each verse about three seconds before it begins.
    for (const seg of segs) {
      const vs = seg.score.verses;
      while (seg.next < vs.length && seg.t0 + vs[seg.next].at - now < 3) {
        const v = vs[seg.next++];
        if (!v.omitted) scheduleVerse(seg, v);
      }
      if (seg.score.close && seg.next === vs.length && seg.t0 + seg.score.close.t - now < 3) { scheduleClose(seg); seg.next++; }
    }
    while (cursor < timeline.length && timeline[cursor].at <= now) {
      const ev = timeline[cursor++];
      if (ev.close) onClose?.();
      else if (ev.chapter) onChapter?.(ev.chapter.ch);
      else if (ev.vs) onVerse?.(ev.seg.ch, ev.vs.verse, ev.vs.words.map(w => w.word), ev.vs.E, ev.vs.k, ev.vs);
      else onWord?.(ev.seg.ch, ev.verse, ev.index);
    }
    while (pending.length && pending[0].at <= now) { const p = pending.shift(); onLink?.(p.seg.ch, p.vs.verse, p.link); }
    if (!asked && now >= end + 1 && segs[segs.length - 1] === last) { stop(); onEnd?.(); }
  }

  return { play, pause, resume, stop, get paused() { return paused; }, get segments() { return segs; } };
}
