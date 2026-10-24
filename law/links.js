// The Law, N(w)(ii): linked verses sound together, one rising as the other fades.
// Pure functions only. Ported from the approved Score (logos-theta HANDOFF §1, §3;
// index.html echoes/meet/verseSig, build 2026101305).
//
// Links come from OpenBible.info cross references (CC-BY), weighted by readers' votes.
// The Law asks for typed links (quote, fulfilment, allusion, type, theme); no typed data
// exists yet and the Law forbids invented links, so the weight is labelled as votes.

import { F0 } from './home.js';
import { tone, words } from './codebook.js';
import { fold, snapMode } from './emotion.js';
import { gIndex } from './canon.js';

export const LINK_SOURCE = 'linked verses: OpenBible.info cross references (CC-BY), weighted by votes, not by type';
// Consonances a signature tone snaps to: the codebook's data table (Seabass: "use the data table").
export const SIG_CONS = [1, 5 / 4, 4 / 3, 3 / 2, 2];
// At most 8 links per verse (the Law); the data keeps at most 5.
export const MAX_LINKS = 8;
// Side a link comes from: earlier in the Bible on the left, later on the right.
export const SIDE = 0.7;

// The verse's links, strongest first: α = votes / max(votes); dir = −0.7 earlier, +0.7 later.
export function links(canon, xrefBook, book, c, v, n = MAX_LINKS) {
  const refs = ((xrefBook || {})[`${c}.${v}`] || []).slice(0, n);
  if (!refs.length) return [];
  const top = Math.max(...refs.map(r => r[3]));
  const me = gIndex(canon, book, c, v);
  return refs.map(([b, rc, rv, votes]) => ({
    book: b, c: rc, v: rv, votes, alpha: votes / top,
    dir: gIndex(canon, b, rc, rv) < me ? -SIDE : SIDE,
  }));
}

// A verse's signature: its 3 rarest words (fewest uses in Scripture), each tone snapped to
// a consonance with the home note, then into the mode now sounding so it joins the harmony.
export function signature(lex, text, mode, home = F0) {
  const ts = words(text || '').map(w => tone(lex, w, home)).filter(Boolean);
  const seen = new Set(), key = [];
  for (const t of ts.sort((a, b) => a.count - b.count || a.first - b.first)) {
    if (seen.has(t.stem)) continue;
    seen.add(t.stem); key.push(t);
    if (key.length === 3) break;
  }
  return key.map(t => {
    const [r, o] = fold(t.freq / home);
    let best = SIG_CONS[0];
    for (const c of SIG_CONS) if (Math.abs(Math.log(r / c)) < Math.abs(Math.log(r / best))) best = c;
    return snapMode(home * best * o, home, mode);
  });
}

// When each link sounds within its verse: spread evenly, (j+1)·dur/(n+1); the first swell 2 s, the rest 1.2 s.
// gain = 0.4 + 0.6·α (times the layer's level).
export function swells(ls, dur) {
  return ls.map((l, j) => ({ ...l, t: (j + 1) * dur / (ls.length + 1), len: j ? 1.2 : 2, gain: 0.4 + 0.6 * l.alpha }));
}

// The orchestra (build 2026102401, proposed): the linked verses sound TOGETHER, not one swell after another.
// Each link is a seat. Seats come in strongest first, one after another across the first 40% of the verse,
// then all hold together and fade out as one before the cadence, so the verse still comes home on its own V–I.
// Earlier Scripture sits low and to the left; later Scripture sits an octave up and to the right
// (Claude's voicing choice, labelled; it is not from Scripture). Tones many links share add up and
// sound louder: that build-up is what the verse's links have in common. Level ∝ 1/√(voices), so a verse
// with eight links is fuller but no louder than a verse with one.
// mine: this verse's signature (Hz). ls: links with .theirs (Hz) and .alpha, .dir. dur: verse seconds.
export const ORCH = { enter: 0.4, hold: 0.82, out: 0.94, level: 0.1 };
export function orchestra(ls, mine, dur) {
  const seated = ls.filter(l => l.theirs && l.theirs.length);
  if (!seated.length) return { seats: [], centre: [] };
  const voices = mine.length + seated.reduce((s, l) => s + l.theirs.length, 0);
  const g = ORCH.level / Math.sqrt(voices);
  const hold = ORCH.hold * dur, out = ORCH.out * dur;
  const seats = seated.map((l, j) => ({
    link: l, t: ORCH.enter * dur * j / seated.length, hold, out,
    pan: l.dir, octave: l.dir < 0 ? 1 : 2,
    tones: l.theirs.map(f => ({ freq: f * (l.dir < 0 ? 1 : 2), gain: g * (0.4 + 0.6 * l.alpha) })),
  }));
  // This verse's own signature holds the centre from the start, an octave up, under all the seats.
  const centre = mine.map(f => ({ freq: f * 2, gain: g, t: 0, hold, out }));
  return { seats, centre };
}
