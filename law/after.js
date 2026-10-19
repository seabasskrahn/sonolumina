// The Law, after the Word (SPIRIT §11). History is never turned into music: only Scripture
// takes form. A history entry sounds the one verse it grew from, scored by the same Law as
// anywhere in the Bible: the verse's chapter with every other verse left silent, so the
// verse keeps its own feeling and ends on the Amen (IV–I).

import { sung } from './canon.js';

export const HISTORY_SOURCE = 'after the Word: history, not Scripture; researched by Claude, approved by Seabass; only the tied verse sounds';

// The chapter as sung for an entry: the tied verse's text, every other verse empty (no music, no time).
export function afterText(bookData, c, v) {
  return bookData.c[c - 1].map((_, i) => (i === v - 1 ? sung(bookData, c, v).text : ''));
}
