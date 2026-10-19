// The Form: playing the Bible chapter after chapter. The Law (law/chapter.js) has
// already decided every note of each chapter; this file only schedules it on the
// audio clock and tells the page what is current.
//
// Chapters flow on: each one is scored when the one before is nearing its end,
// carrying its mode and melody on (prevMode/prevMel), and starts where the
// one before ended (its Amen and a breath). Only the last chapter of the Bible has the close.
//
// Preview build (2026101815-p1): playback speed. The Law's times are "score seconds";
// the Form maps them onto the audio clock through one straight line, audio = a + (score − s) / speed.
// A speed change (or a seek) moves that line at the present moment: the sound already
// scheduled fades out over 0.15 s and everything from now on is scheduled again on a
// fresh set of voices, so text, music, swells and the reading voice keep one clock.
// The Law and its tests are unchanged: the multiplier lives only here.

import { F0, HARMONICS } from '../law/home.js';
import { scoreChapter } from '../law/chapter.js';
import { createVoices } from './voices.js';

// The music dips about 8 dB while the voice reads, and swells in the gaps.
const DUCK = 0.4;
// Ask for the next chapter this many (audio) seconds before the current one ends.
const AHEAD = 25;
// Schedule each verse this many (audio) seconds before it begins (timers slow to ~1 s with the screen off).
const LOOK = 3;
const FADE = 0.15;

// first: a loaded chapter { ref, text: [sung text per verse], vadBook, final, ... } (anything else is passed back).
// load(ref) → Promise of the chapter after ref, or null at the end of the Bible.
// linksFor(ch, vs) → Promise of [{ mine: [Hz], theirs: [Hz], dir, t, len, gain, ... }] (t within the verse), or [].
// speed: playback multiplier (1 = the Law's tempo). startVerse: begin at this verse of the first chapter.
// repeatVerse() → true to loop the verse now playing.
export function createPlayer({ engine, lex, first, load, linksFor, onVerse, onWord, onChapter, onLink, onClose, onEnd,
  narrating = () => false, speed = 1, startVerse = 1, repeatVerse = () => false }) {
  const segs = [];        // { ch, score, t0, next, closed }: chapters in play order (t0 in score seconds)
  const timeline = [];    // page events, in score time order
  let cursor = 0, timer = 0, paused = false, gen = null, asked = false, ended = false, cur = null;
  let pending = [];       // link swells (score time), for the page to light their tabs when they sound
  let anchor = { a: 0, s: 0 };

  const sNow = () => anchor.s + (engine.time - anchor.a) * speed;
  const A = s => anchor.a + (s - anchor.s) / speed;
  const later = t => Math.max(engine.time, t);

  // One set of voices on its own gain, so a speed change can fade it out as a whole.
  function newGen(fadeIn) {
    const ctx = engine.ctx, out = ctx.createGain();
    out.connect(engine.out);
    if (fadeIn) { out.gain.setValueAtTime(0, ctx.currentTime); out.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE); }
    const voices = createVoices({ ctx, out, track: (...a) => engine.track(...a) });
    return { out, voices, id: (gen ? gen.id : 0) + 1 };
  }
  function dropGen(g) {
    if (!g) return;
    const t = engine.ctx.currentTime, gn = g.out.gain;
    gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t); gn.linearRampToValueAtTime(0, t + FADE);
    setTimeout(() => { try { g.out.disconnect(); } catch {} }, (FADE + 0.4) * 1000);
  }

  // The home note sounds quietly under everything: every tone is measured from it.
  // Between chapters one drone fades out as the next fades in (3 s, equal and opposite).
  // from: score time to start at (mid-chapter after a speed change: at once, with a short attack).
  function homeDrone(seg, from = null) {
    const total = HARMONICS.reduce((s, h) => s + h.amp, 0), end = A(seg.t0 + seg.score.dur);
    let at, attack, tail;
    if (from !== null && from > seg.t0) { at = later(A(from)); attack = 0.25; tail = 1.5; }
    else if (seg.firstEver) { at = A(seg.t0); attack = 2.5; tail = 1.5; }
    else { at = A(seg.t0) - 1.5; attack = 3; tail = 1.5; }
    for (const h of HARMONICS) engine.tone({
      freq: F0 * h.ratio, ratio: h.ratio, at, dur: Math.max(0.5, end - at + tail),
      gain: 0.04 * h.amp / total, attack, release: 3, dest: gen.out,
    });
  }

  function add(ch, t0, prev) {
    const score = scoreChapter({ lex, text: ch.text, vadBook: ch.vadBook, chapter: ch.ref.chapter,
      final: ch.final, prevMode: prev ? prev.lastMode : null, prevMel: prev ? prev.melPrev : 0 });
    const seg = { ch, score, t0, next: 0, closed: !score.close, firstEver: !prev && !segs.length };
    segs.push(seg);
    const ev = [{ at: t0, chapter: seg }];
    for (const vs of score.verses) {
      if (vs.omitted) continue;
      ev.push({ at: t0 + vs.at, seg, vs });
      for (const w of vs.words) ev.push({ at: t0 + w.t, seg, verse: vs.verse, index: w.index });
    }
    if (score.close) ev.push({ at: t0 + score.close.t, close: true, seg });
    ev.sort((a, b) => a.at - b.at || (b.vs ? 1 : 0) - (a.vs ? 1 : 0));
    timeline.push(...ev);
    timeline.sort((a, b) => a.at - b.at || (b.chapter ? 1 : 0) - (a.chapter ? 1 : 0) || (b.vs ? 1 : 0) - (a.vs ? 1 : 0));
    homeDrone(seg);
    return seg;
  }

  // from: score time; notes that begin before it are left out, held chords are started part-way.
  function scheduleVerse(seg, vs, from = -Infinity) {
    const S = t => seg.t0 + t, T = t => A(S(t)), { k, E } = vs, v = gen.voices, gid = gen.id;
    v.brightness(1100 + k.bright * 0.6, later(T(vs.at)));
    if (narrating()) {
      v.loudness(k.loud * DUCK, later(T(vs.at)));
      v.loudness(k.loud, later(T(Math.max(vs.at + 0.5, vs.at + vs.dur - 1.1))));
    } else v.loudness(k.loud, later(T(vs.at)));
    for (const b of vs.bars) {
      const st = Math.max(S(b.t), from), rem = S(b.t) + b.dur - st;
      if (rem > 0.05) {
        v.cello(b.bass, later(A(st)), rem * 0.96 / speed, 0.22);
        v.strings(b.pad, later(A(st)), rem / speed, k.strV);
      }
      for (const n of b.arp) if (S(n.t) >= from) v.epiano(n.freq, T(n.t), n.dur / speed, 0.07 + 0.03 * E.a + (n.accent ? 0.03 : 0));
    }
    // Linked verses: each swell is sounded only if its tones are ready before it is due; never late.
    linksFor?.(seg.ch, vs).then(ls => {
      if (ended || !gen || gen.id !== gid) return;   // a speed change or seek has scheduled it again
      for (const l of ls) {
        const s = S(vs.at + l.t), at = A(s);
        if (s < from || at < engine.time + 0.05 || !l.theirs.length) continue;
        gen.voices.swell(l.mine, l.theirs, l.dir, at, l.len / speed, l.gain);
        pending.push({ s, link: l, seg, vs });
        pending.sort((a, b) => a.s - b.s);
      }
    }).catch(() => {});
    for (const n of vs.melody) {
      if (S(n.t) < from) continue;
      v.celesta(n.freq, T(n.t), k.celV * n.vel);
      // Companion partials sound softly with the melody note (0.35 alpha).
      for (const p of n.partials) v.celesta(p.freq, T(n.t) + 0.03 / speed, k.celV * n.vel * 0.35 * p.alpha);
    }
  }

  // Rest: the tonic chord, with the bass on the home note itself, held and fading.
  function scheduleClose(seg) {
    const c = seg.score.close, t = A(seg.t0 + c.t), k = seg.score.verses.filter(vs => !vs.omitted).pop().k, v = gen.voices;
    seg.closed = true;
    v.loudness(k.loud, later(t));
    v.cello(c.bass, later(t), c.dur * 0.7 / speed, 0.22);
    v.strings(c.pad, later(t), (c.dur - 1.6) / speed, k.strV);
    v.celesta(c.melody, later(t), k.celV * 0.6);
  }

  // Everything from score time `from` on is scheduled again on a fresh set of voices.
  function regen(from) {
    const old = gen;
    gen = newGen(!!old);
    dropGen(old);
    engine.forget();
    pending = [];
    // Start the fresh voices at the level the music has now.
    const at = segs.find(sg => from < sg.t0 + sg.score.dur) || segs[segs.length - 1];
    const vsNow = at.score.verses.find(vs => !vs.omitted && at.t0 + vs.at + vs.dur + vs.beat > from) || at.score.verses.filter(vs => !vs.omitted).pop();
    if (vsNow) {
      const inVoice = narrating() && from < at.t0 + Math.max(vsNow.at + 0.5, vsNow.at + vsNow.dur - 1.1) && from >= at.t0 + vsNow.at;
      gen.voices.settle(vsNow.k.loud * (inVoice ? DUCK : 1), 1100 + vsNow.k.bright * 0.6);
    }
    for (const seg of segs) {
      const end = seg.t0 + seg.score.dur;
      if (end <= from) { seg.next = seg.score.verses.length; continue; }
      homeDrone(seg, from);
      const vs = seg.score.verses;
      let i = 0;
      while (i < vs.length && (vs[i].omitted || seg.t0 + vs[i].at + vs[i].dur <= from)) i++;
      seg.next = i;
      if (i < vs.length && seg.t0 + vs[i].at < from) { scheduleVerse(seg, vs[i], from); seg.next = i + 1; }
      seg.closed = !seg.score.close || seg.t0 + seg.score.close.t + seg.score.close.dur <= from;
    }
  }

  function play() {
    engine.start();
    gen = newGen(false);
    const seg = add(first, 0, null);
    const v0 = seg.score.verses.find(vs => !vs.omitted && vs.verse >= startVerse);
    const s0 = startVerse > 1 && v0 ? v0.at : 0;
    anchor = { a: engine.time + 0.4, s: s0 };
    if (s0 > 0) {
      // Begin part-way: the chapter is still scored whole by the Law; only the start point moves.
      cursor = timeline.findIndex(e => e.at >= s0);
      onChapter?.(first);
      regen(s0);
    }
    // A timer, not animation frames, drives the music: it keeps going when the screen is off.
    timer = setInterval(tick, 50);
    tick();
  }

  // Move to verse `verse` of the chapter now playing (or of a chapter already scored).
  function seek(seg, verse) {
    seg = seg || (cur && cur.seg) || segs[0];
    const vs = seg.score.verses.find(x => !x.omitted && x.verse >= verse) || seg.score.verses.filter(x => !x.omitted).pop();
    const s = seg.t0 + vs.at;
    anchor = { a: engine.time + 0.1, s };
    cursor = timeline.findIndex(e => e.at >= s && !e.chapter);
    if (cursor < 0) cursor = timeline.length;
    regen(s);
    tick();
  }

  // Change speed now: the present moment keeps its place in the score.
  function setSpeed(x) {
    x = +x;
    if (!(x > 0) || x === speed) return;
    if (!gen) { speed = x; return; }
    const s = sNow();
    anchor = { a: engine.time, s };
    speed = x;
    regen(s);
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
  function stop(fade = false) {
    clearInterval(timer);
    ended = true;
    if (fade) { dropGen(gen); engine.forget(); }
  }

  const verseEnd = c => c.seg.t0 + c.vs.at + c.vs.dur + c.vs.beat * 0.5;

  function tick() {
    if (ended) return;
    const now = sNow(), last = segs[segs.length - 1];
    const end = last.t0 + last.score.dur;
    // Repeat verse: back to its start as it ends (before the next verse is heard).
    if (cur && repeatVerse() && now >= verseEnd(cur)) return seek(cur.seg, cur.vs.verse);
    // The next chapter: fetched and scored ahead of time; it starts where this one ends.
    if (!asked && !last.ch.final && !last.noNext && end - now < AHEAD * speed) {
      asked = true;
      load(last.ch.ref).then(ch => {
        asked = false;
        if (ended) return;
        if (!ch) { last.noNext = true; return; }
        add(ch, Math.max(end, sNow() + 0.5 * speed), last.score);
      }).catch(() => { asked = false; last.noNext = true; });   // not loaded: the music ends here
    }
    // Schedule each verse about three (audio) seconds before it begins.
    for (const seg of segs) {
      const vs = seg.score.verses;
      while (seg.next < vs.length && seg.t0 + vs[seg.next].at - now < LOOK * speed) {
        const v = vs[seg.next++];
        if (!v.omitted) scheduleVerse(seg, v);
      }
      if (!seg.closed && seg.next >= vs.length && seg.t0 + seg.score.close.t - now < LOOK * speed) scheduleClose(seg);
    }
    while (cursor < timeline.length && timeline[cursor].at <= now) {
      const ev = timeline[cursor++];
      if (ev.close) onClose?.();
      else if (ev.chapter) onChapter?.(ev.chapter.ch);
      else if (ev.vs) { cur = { seg: ev.seg, vs: ev.vs }; onVerse?.(ev.seg.ch, ev.vs.verse, ev.vs.words.map(w => w.word), ev.vs.E, ev.vs.k, ev.vs); }
      else onWord?.(ev.seg.ch, ev.verse, ev.index);
    }
    while (pending.length && pending[0].s <= now) { const p = pending.shift(); onLink?.(p.seg.ch, p.vs.verse, p.link); }
    if (!asked && now >= end + speed && segs[segs.length - 1] === last) { stop(); onEnd?.(); }
  }

  return { play, pause, resume, stop, seek, setSpeed,
    get speed() { return speed; }, get paused() { return paused; }, get segments() { return segs; },
    get current() { return cur; }, get scoreTime() { return sNow(); } };
}
