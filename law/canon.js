// The Law: where a verse is in the whole Bible, and what of it is sung.
// Pure functions only. The canon (names, files, verse counts) is data/canon.json, never typed here.

// "Psalms.23", "Song of Solomon.2", "1John.4" → { book, chapter } (book = index into canon).
// "John.1.1" also gives { verse } (a link opens its chapter at that verse).
// Unknown or out-of-range references give null.
export function parseRef(canon, str) {
  const m = /^(.+?)\.(\d+)(?:\.(\d+))?$/.exec(decodeURIComponent(String(str || '')).trim());
  if (!m) return null;
  const key = m[1].replace(/[\s_]/g, '').toLowerCase();
  const book = canon.findIndex(([name, file]) =>
    name.replace(/\s/g, '').toLowerCase() === key || file.replace(/\.json$/, '').toLowerCase() === key);
  const chapter = +m[2];
  if (book < 0 || chapter < 1 || chapter > canon[book][2].length) return null;
  if (m[3] === undefined) return { book, chapter };
  const verse = +m[3];
  return verse >= 1 && verse <= canon[book][2][chapter - 1] ? { book, chapter, verse } : null;
}

// A chapter's place among all 1,189 (0 = Genesis 1), and back again.
export function chapterIndex(canon, { book, chapter }) {
  let n = 0;
  for (let b = 0; b < book; b++) n += canon[b][2].length;
  return n + chapter - 1;
}
export function refAt(canon, i) {
  for (let b = 0; b < canon.length; b++) {
    if (i < canon[b][2].length) return { book: b, chapter: i + 1 };
    i -= canon[b][2].length;
  }
  return null;
}

// The chapter after this one, on into the next book; null after Revelation 22.
export function next(canon, { book, chapter }) {
  if (chapter < canon[book][2].length) return { book, chapter: chapter + 1 };
  return book + 1 < canon.length ? { book: book + 1, chapter: 1 } : null;
}

// The chapter before this one; null before Genesis 1.
export function prev(canon, { book, chapter }) {
  if (chapter > 1) return { book, chapter: chapter - 1 };
  return book > 0 ? { book: book - 1, chapter: canon[book - 1][2].length } : null;
}

export const isFinal = (canon, ref) => next(canon, ref) === null;

// A verse as shown and as sung. Psalm headings (the BSB's own `\d` paragraph, kept in
// bookData.h) are shown but never sound: they are cut from the front of verse 1.
// Seabass: "headings shown only".
export function sung(bookData, c, v) {
  const all = bookData.c[c - 1][v - 1] || '';
  const heading = v === 1 && bookData.h ? bookData.h[String(c)] || '' : '';
  const flat = all.split(/\s+/).filter(Boolean).join(' ');
  if (heading && flat.startsWith(heading)) return { heading, text: flat.slice(heading.length).trim() };
  return { heading: '', text: all };
}

// Position of a verse in the whole Bible, 0 = Genesis 1:1 (used for the side a link comes from).
export function gIndex(canon, book, c, v) {
  let n = 0;
  for (let b = 0; b < book; b++) for (const k of canon[b][2]) n += k;
  for (let i = 0; i < c - 1; i++) n += canon[book][2][i];
  return n + v - 1;
}
