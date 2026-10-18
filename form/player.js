// The Form: reading a chapter aloud in tones.
// The Law (law/score.js) says what sounds and when; this file only
// schedules it on the audio clock and tells the page what is current.

import { F0, HARMONICS } from '../law/home.js';
import { scoreVerse } from '../law/score.js';
import { verseE, smooth } from '../law/emotion.js';

export function createPlayer({ engine, lex, vadBook, chapter, chapterText, onVerse, onWord, onEnd }) {
  const timeline = [];    // { at, verse, index } in AudioContext seconds
  let raf = 0, cursor = 0, endAt = 0, drone = [];

  // The home note sounds under everything: the pupil every tone is measured from.
  function homeDrone(at, until) {
    const total = HARMONICS.reduce((s, h) => s + h.amp, 0);
    drone = HARMONICS.map(h => engine.tone({
      freq: F0 * h.ratio, ratio: h.ratio, at, dur: until - at,
      gain: 0.07 * h.amp / total, attack: 2.5, release: 3,
    }));
  }

  let verses = [], next = 0;

  function scheduleVerse(vs) {
    const { beatSec } = vs.score;
    for (const e of vs.score.events) {
      const at = vs.at + e.beat * beatSec;
      timeline.push({ at, verse: vs.verse, index: e.index });
      if (!e.freq) continue;
      const dur = e.beats * beatSec * 1.6;
      engine.tone({ freq: e.freq, ratio: e.freq / F0, at, dur, gain: 0.16 });
      // Companion partials sound softly at 0.35 alpha (one level deep).
      for (const p of e.partials) {
        engine.tone({ freq: p.freq, ratio: p.freq / F0, at, dur, gain: 0.16 * 0.35 * p.alpha });
      }
    }
    timeline.sort((a, b) => a.at - b.at || (b.words ? 1 : 0) - (a.words ? 1 : 0));
  }

  function play(startVerse = 1) {
    engine.start();
    let t = engine.time + 0.3;
    const begin = t;
    let E = null;
    for (let v = startVerse; v <= chapterText.length; v++) {
      E = smooth(verseE(vadBook, chapter, v), E);
      const score = scoreVerse(lex, chapterText[v - 1], E);
      verses.push({ verse: v, at: t, score });
      timeline.push({ at: t, verse: v, words: score.words, E, k: score.k });
      t += (score.beats + 1) * score.beatSec;   // a breath between verses
    }
    endAt = t;
    homeDrone(begin, endAt + 3);
    tick();
    return endAt - begin;
  }

  function tick() {
    const now = engine.time;
    // Schedule each verse about two seconds before it begins.
    while (next < verses.length && verses[next].at - now < 2) scheduleVerse(verses[next++]);
    while (cursor < timeline.length && timeline[cursor].at <= now) {
      const ev = timeline[cursor++];
      if (ev.words) onVerse?.(ev.verse, ev.words, ev.E, ev.k);
      else onWord?.(ev.verse, ev.index);
    }
    if (now >= endAt) { onEnd?.(); return; }
    raf = requestAnimationFrame(tick);
  }

  return { play, get endAt() { return endAt; }, get timeline() { return timeline; } };
}
