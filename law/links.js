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
