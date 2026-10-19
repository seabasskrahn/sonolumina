// Preview build: the study tabs. Read (BSB with KJV and the original alongside), Recall,
// Notes & highlights, Search, Origins (where each sound comes from). Page code only:
// nothing here decides music; the Law does that.

import { marks, recall, grade, dropRecall, exportAll } from './store.js';
import { tone, JUST, stem } from '../law/codebook.js';
import { F0, LABELS } from '../law/home.js';
import { EMOTION_SOURCE } from '../law/emotion.js';
import { LINK_SOURCE } from '../law/links.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STEP_NAMES = ['1/1 unison', '16/15', '9/8', '6/5', '5/4', '4/3', '45/32', '3/2', '8/5', '5/3', '9/5', '15/8'];
const CONS_NAMES = ['1/1', '5/4', '4/3', '3/2', '2/1'];

export function createStudy(X) {
  // X: { canon, book(b) → [bsb, vad], kjv(b) → Promise, sung, fileOf, lex, S, cur(), playing(), playFrom(ref, v), verseSheet(key),
  //      show(tab), toast(msg), parseRef, nowVerse() → { ch, vs, k, E } | null }
  const el = id => document.getElementById(id);
  const name = b => X.canon[b][0];
  const refText = key => { const [b, c, v] = key.split('.').map(Number); return `${name(b)} ${c}:${v}`; };
  const keyOf = (b, c, v) => `${b}.${c}.${v}`;
  const order = k => { const [b, c, v] = k.split('.').map(Number); return b * 1e6 + c * 1e3 + v; };
  const verseText = async key => { const [b, c, v] = key.split('.').map(Number); const [bsb] = await X.book(b); return X.sung(bsb, c, v).text || bsb.c[c - 1]?.[v - 1] || ''; };

  // ---------- Read ----------
  let readFor = '', jumpTo = 0;
  async function renderRead(force = false) {
    const T = el('tab-read'), ch = X.cur();
    if (ch.history) {
      T.innerHTML = `<h2>Read</h2><div class="card dim">After the Word entries are history, not Scripture. Open a Bible chapter to read it here. The entry's own verse is in Listen.</div>`;
      readFor = ''; return;
    }
    const id = `${ch.ref.book}.${ch.ref.chapter}`;
    if (readFor === id && !force) { markPlaying(); return; }
    readFor = id;
    const b = ch.ref.book, c = ch.ref.chapter, S = X.S;
    T.innerHTML = `<h2>Read</h2>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
        <a class="pill" id="rdPrev" style="text-decoration:none">‹</a><b style="font:1.05rem Georgia,serif">${esc(name(b))} ${c}</b><a class="pill" id="rdNext" style="text-decoration:none">›</a></div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center"><button class="pill gold" id="rdPlay" type="button">▶ Play chapter</button>
        <span class="seg"><button type="button" id="rdKjv" class="${S.showKJV ? 'on' : ''}">KJV</button><button type="button" id="rdOrig" class="${S.showOrig ? 'on' : ''}">${b >= 39 ? 'Greek' : 'Hebrew'}</button></span></div>
      <div class="dim" style="text-align:center">BSB, with the KJV ${b >= 39 ? 'and Scrivener 1894 Greek' : 'and the Westminster Leningrad Codex Hebrew'} alongside. Tap a verse to play from it, highlight it, add a note or add it to Recall.</div>
      <div id="rdList" style="font-size:${S.textSize}rem">loading…</div>`;
    const nav = (a, ref) => { if (ref) a.href = `?${X.fileOf(ref.book)}.${ref.chapter}`; else a.style.visibility = 'hidden'; };
    nav(el('rdPrev'), X.prevRef(ch.ref)); nav(el('rdNext'), X.nextRef(ch.ref));
    el('rdPlay').onclick = () => X.playFrom(ch, 1);
    el('rdKjv').onclick = () => { S.showKJV = !S.showKJV; X.save(); renderRead(true); };
    el('rdOrig').onclick = () => { S.showOrig = !S.showOrig; X.save(); renderRead(true); };
    let kj = null;
    if (S.showKJV || S.showOrig) kj = await X.kjv(b).catch(() => null);
    if (readFor !== id) return;
    const rows = ch.parts.map((p, i) => {
      const v = i + 1, k = keyOf(b, c, v), m = marks[k] || {};
      const kv = kj && kj.c[c - 1] ? kj.c[c - 1][i] : '';
      const ov = kj && kj.h && kj.h[c - 1] ? kj.h[c - 1][i] : '';
      const omitted = !(ch.text[i] || '').trim();
      return `<div class="vrow ${m.hl ? 'hl-' + m.hl : ''}" data-v="${v}" id="rv${v}">
        ${p.heading ? `<i class="dim" style="font-family:Georgia,serif">${esc(p.heading)}</i>` : ''}
        <div><span class="n">${v}</span>${omitted ? '<span class="dim">(not in the oldest manuscripts; the BSB leaves it out)</span>' : esc(p.text)}</div>
        ${S.showKJV && kv ? `<div class="kjv"><span class="lbl">KJV </span>${esc(kv)}</div>` : ''}
        ${S.showOrig && ov ? `<div class="orig ${b < 39 ? 'he' : ''}" lang="${b < 39 ? 'he' : 'grc'}">${esc(ov)}</div>` : ''}
        ${m.note ? `<div class="note">✎ ${esc(m.note)}</div>` : ''}</div>`;
    }).join('');
    const missing = S.showOrig && !(kj && kj.h) ? `<div class="card dim">The ${b >= 39 ? 'Greek' : 'Hebrew'} text for ${esc(name(b))} is not in this build yet.</div>` : '';
    el('rdList').innerHTML = missing + rows;
    el('rdList').onclick = e => { const r = e.target.closest('.vrow'); if (r) X.verseSheet(keyOf(b, c, +r.dataset.v)); };
    markPlaying();
    if (jumpTo) { const r = el('rv' + jumpTo); jumpTo = 0; if (r) { r.scrollIntoView({ block: 'center' }); r.classList.add('flash'); } }
  }
  function markPlaying() {
    const p = X.playing();
    document.querySelectorAll('#rdList .vrow.playing').forEach(r => r.classList.remove('playing'));
    if (p && readFor === `${p.ch.ref.book}.${p.ch.ref.chapter}`) el('rv' + p.v)?.classList.add('playing');
  }
  // Open the Read tab at a verse (the chapter must be the one now shown; otherwise the page opens it).
  function readAt(key) {
    const [b, c, v] = key.split('.').map(Number), ch = X.cur();
    if (!ch.history && ch.ref.book === b && ch.ref.chapter === c) { jumpTo = v; X.show('read'); renderRead(); return; }
    X.go(`${X.fileOf(b)}.${c}.${v}`).then(() => { jumpTo = v; readFor = ''; X.show('read'); });
  }

  // ---------- Recall ----------
  let revealed = false;
  async function renderRecall() {
    const T = el('tab-recall'), keys = Object.keys(recall).sort((a, b) => recall[a].due - recall[b].due);
    const due = keys.filter(k => recall[k].due <= Date.now());
    let h = `<h2>Recall</h2><div class="dim" style="text-align:center">Spaced review: verses come back just before you would forget them. ${due.length} due now · ${keys.length} in your deck.</div>`;
    if (!keys.length) { T.innerHTML = h + `<div class="card dim">Your deck is empty. Tap a verse in Read (or ＋ Recall under the verse in Listen) to add it.</div>`; return; }
    if (due.length) {
      const k = due[0], text = await verseText(k);
      h += `<div class="card" style="text-align:center"><div class="orig-t" style="color:#d9b65a">${esc(refText(k))}</div>
        <p style="font-size:1.1rem;line-height:1.6;min-height:3em">${revealed ? esc(text) : '<span class="dim">Say the verse to yourself, then show it.</span>'}</p>
        ${revealed ? `<div class="seg" style="justify-content:center">${['Again', 'Hard', 'Good', 'Easy'].map((g, i) => `<button type="button" data-g="${i}">${g}</button>`).join('')}</div>`
          : `<button class="pill gold" type="button" id="rcShow">Show verse</button>`}
        <p><button class="pill" type="button" id="rcPlay">▶ Listen to it</button></p></div>`;
      T.innerHTML = h + list(keys);
      el('rcShow') && (el('rcShow').onclick = () => { revealed = true; renderRecall(); });
      T.querySelectorAll('[data-g]').forEach(bt => bt.onclick = () => { grade(k, +bt.dataset.g); revealed = false; renderRecall(); X.toast(['Again in 10 minutes', 'Hard: sooner', 'Good', 'Easy: later'][+bt.dataset.g]); });
      el('rcPlay').onclick = () => X.playKey(k);
    } else {
      const nx = recall[keys[0]].due;
      T.innerHTML = h + `<div class="card dim" style="text-align:center">Nothing due. Next review ${new Date(nx).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.</div>` + list(keys);
    }
    T.querySelectorAll('[data-rm]').forEach(bt => bt.onclick = () => { dropRecall(bt.dataset.rm); renderRecall(); });
    T.querySelectorAll('[data-open]').forEach(bt => bt.onclick = () => readAt(bt.dataset.open));
  }
  const list = keys => `<h2>Deck</h2>` + keys.map(k => `<div class="qi"><span>${esc(refText(k))} <span class="dim">· ${recall[k].due <= Date.now() ? 'due' : 'in ' + Math.max(1, Math.round((recall[k].due - Date.now()) / 864e5)) + ' d'}</span></span>
    <span><button class="pill" type="button" data-open="${k}">Read</button> <button class="pill" type="button" data-rm="${k}" aria-label="Remove">✕</button></span></div>`).join('');

  // ---------- Notes & highlights ----------
  let notesFilter = 'all';
  async function renderNotes() {
    const T = el('tab-notes');
    const keys = Object.keys(marks).filter(k => notesFilter === 'all' || (notesFilter === 'hl' ? marks[k].hl : marks[k].note)).sort((a, b) => order(a) - order(b));
    let h = `<h2>Notes & highlights</h2><div class="seg" style="justify-content:center">${[['all', 'All'], ['hl', 'Highlights'], ['note', 'Notes']].map(([k, t]) => `<button type="button" data-f="${k}" class="${notesFilter === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    if (!keys.length) h += `<div class="card dim">Nothing here yet. Tap a verse in Read, or ☆ / ✎ under the verse in Listen.</div>`;
    const texts = await Promise.all(keys.map(verseText));
    h += keys.map((k, i) => { const m = marks[k]; return `<div class="res ${m.hl ? 'hl-' + m.hl : ''}" style="border-radius:8px;padding:.6rem"><div class="r">${esc(refText(k))}<span>
      <button type="button" data-open="${k}">Read</button><button type="button" data-play="${k}">▶</button><button type="button" data-edit="${k}">Edit</button></span></div>
      <div>${esc(texts[i])}</div>${m.note ? `<div class="note" style="margin-top:.35rem;font:italic .85rem Georgia,serif;border-left:2px solid #6a5a35;padding-left:.5rem">✎ ${esc(m.note)}</div>` : ''}</div>`; }).join('');
    h += `<p style="text-align:center"><button class="pill" type="button" id="ntExport">Save a copy (JSON file)</button></p><div class="dim" style="text-align:center">Kept on this phone only.</div>`;
    T.innerHTML = h;
    T.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { notesFilter = b.dataset.f; renderNotes(); });
    T.querySelectorAll('[data-open]').forEach(b => b.onclick = () => readAt(b.dataset.open));
    T.querySelectorAll('[data-play]').forEach(b => b.onclick = () => X.playKey(b.dataset.play));
    T.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => X.verseSheet(b.dataset.edit));
    el('ntExport').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([exportAll()], { type: 'application/json' }));
      a.download = 'sonolumina-notes.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
  }

  // ---------- Search ----------
  let lastQ = '', allLoaded = false, loading = false;
  function renderSearch() {
    const T = el('tab-search');
    if (T.dataset.built) return;
    T.dataset.built = 1;
    T.innerHTML = `<h2>Search</h2>
      <form id="sForm" style="display:flex;gap:.4rem"><input type="search" id="sQ" placeholder="Words, or a reference like John 3:16" autocomplete="off" enterkeyhint="search"><button class="pill gold" type="submit">Search</button></form>
      <div class="seg" style="justify-content:center"><button type="button" id="sAll">Search the whole Bible</button></div>
      <div class="dim" id="sInfo" style="text-align:center">Searches the BSB in the books already opened; tap "whole Bible" to fetch all 66 books (about 4 MB, once).</div>
      <div id="sRes"></div>`;
    el('sForm').onsubmit = e => { e.preventDefault(); run(el('sQ').value); };
    el('sAll').onclick = async () => {
      if (loading || allLoaded) return run(el('sQ').value);
      loading = true;
      for (let b = 0; b < X.canon.length; b++) { el('sInfo').textContent = `Fetching ${name(b)} (${b + 1} of 66)…`; try { await X.book(b); } catch {} }
      loading = false; allLoaded = true; el('sAll').classList.add('on'); el('sAll').textContent = 'Whole Bible loaded';
      run(el('sQ').value);
    };
  }
  // "John 3:16", "Ps 23", "1 cor 13 4" → a reference.
  function asRef(q) {
    const m = /^\s*([1-3]?\s*[a-z][a-z .]*?)\s*(\d+)(?:\s*[:. ]\s*(\d+))?\s*$/i.exec(q);
    if (!m) return null;
    const k = m[1].replace(/[\s.]/g, '').toLowerCase();
    const b = X.canon.findIndex(([n, f]) => n.replace(/\s/g, '').toLowerCase() === k || f.replace(/\.json$/, '').toLowerCase() === k)
      ?? -1;
    const bb = b >= 0 ? b : X.canon.findIndex(([n]) => n.replace(/\s/g, '').toLowerCase().startsWith(k));
    if (bb < 0 || k.length < 2) return null;
    const c = +m[2], v = m[3] ? +m[3] : 1;
    if (c < 1 || c > X.canon[bb][2].length || v < 1 || v > X.canon[bb][2][c - 1]) return null;
    return { b: bb, c, v };
  }
  async function run(q) {
    q = (q || '').trim(); lastQ = q;
    const R = el('sRes'), info = el('sInfo');
    if (!q) { R.innerHTML = ''; return; }
    let h = '';
    const r = asRef(q);
    if (r) h += `<div class="res"><div class="r">Go to ${esc(name(r.b))} ${r.c}:${r.v}<span><button type="button" data-open="${keyOf(r.b, r.c, r.v)}">Read</button><button type="button" data-play="${keyOf(r.b, r.c, r.v)}">▶</button></span></div></div>`;
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const hits = [];
    let books = 0;
    if (words.length && !r) {
      for (const [b, p] of X.loadedBooks()) {
        const got = await p.catch(() => null); if (!got) continue; books++;
        const bsb = got[0];
        bsb.c.forEach((vs, ci) => vs.forEach((t, vi) => {
          const lt = (t || '').toLowerCase();
          if (words.every(w => lt.includes(w))) hits.push([b, ci + 1, vi + 1, t]);
        }));
        if (hits.length > 400) break;
      }
      hits.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    }
    if (lastQ !== q) return;
    const re = words.length ? new RegExp('(' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi') : null;
    h += hits.slice(0, 200).map(([b, c, v, t]) => `<div class="res"><div class="r">${esc(name(b))} ${c}:${v}<span><button type="button" data-open="${keyOf(b, c, v)}">Read</button><button type="button" data-play="${keyOf(b, c, v)}">▶</button></span></div>
      <div>${esc(t).replace(re, '<mark>$1</mark>')}</div></div>`).join('');
    if (!r) info.textContent = `${hits.length > 200 ? 'First 200 of ' : ''}${hits.length} verse${hits.length === 1 ? '' : 's'} in ${books} book${books === 1 ? '' : 's'}${allLoaded ? ' (whole Bible)' : ' opened so far'}.`;
    R.innerHTML = h || '<div class="dim" style="text-align:center">No verses found.</div>';
    R.querySelectorAll('[data-open]').forEach(b => b.onclick = () => readAt(b.dataset.open));
    R.querySelectorAll('[data-play]').forEach(b => b.onclick = () => X.playKey(b.dataset.play));
  }

  // ---------- Origins ----------
  // Build 2026101818: a word as shown and looked up: punctuation and quotes (straight or curly) are stripped from its
  // ends ("garden’" → "garden"); an apostrophe inside a word is kept, as a straight one ("God’s" → "God's").
  const bare = w => String(w || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '').replace(/[^\p{L}\p{N}'-]/gu, '').replace(/^['-]+|['-]+$/g, '');
  function renderOrigins() {
    const T = el('tab-origins'), n = X.nowVerse();
    let now = '<div class="dim">Press Begin and the verse now sounding is explained here.</div>';
    if (n && n.vs && n.vs.melody) {
      const { k, E } = n.vs, sp = X.S.speed;
      const mel = n.vs.melody.filter(m => Number.isInteger(m.word) && n.words[m.word]).slice(0, 12);
      now = `<div class="kv"><b>Verse</b><span>${esc(n.ch.name)} ${n.ch.ref.chapter}:${n.vs.verse}</span>
        <b>Feeling</b><span>V ${E.v.toFixed(2)} · A ${E.a.toFixed(2)} · D ${E.d.toFixed(2)}</span>
        <b>Mode</b><span>${k.mode} = M[⌊5·${E.v.toFixed(2)}⌋]</span>
        <b>Tempo</b><span>54 + 30·${E.a.toFixed(2)} = ${k.bpm.toFixed(1)} BPM${sp !== 1 ? ` × ${sp} speed = ${(k.bpm * sp).toFixed(1)}` : ''}</span>
        <b>Loudness</b><span>0.75 + 0.5·${E.d.toFixed(2)} = ${k.loud.toFixed(2)}</span></div>
        ${mel.length ? `<div class="orig-t" style="margin-top:.6rem">Melody words (key words, fewer than 200 uses)</div><div class="kv">${mel.map(m => `<b>${esc(bare(n.words[m.word]))}</b><span>${m.freq.toFixed(1)} Hz · ${(m.freq / F0).toFixed(3)} × 110${m.res && m.res !== 'resolved' ? ' · ' + m.res : ''}</span>`).join('')}</div>` : ''}`;
    }
    T.innerHTML = `<h2>Origins</h2><div class="dim" style="text-align:center">Where every sound comes from, and which parts are human choices.</div>
      <div class="card"><div class="orig-t">Now sounding</div>${now}</div>
      <div class="card"><div class="orig-t">Look up a word</div><form id="oForm" style="display:flex;gap:.4rem"><input type="text" id="oQ" placeholder="e.g. light, mercy, shepherd" autocomplete="off"><button class="pill gold" type="submit">Look up</button></form><div id="oRes" style="margin-top:.5rem"></div></div>
      ${[
        ['Home note · 110 Hz', LABELS.F0 + '. Every tone is a whole-number ratio of it, and every verse comes home to it.'],
        ['Overtones', LABELS.HARMONICS + '. They let phone speakers, which cannot play 110 Hz well, still carry the home note.'],
        ['Word tones R(w)', LABELS.WORD + '. Each word stem has a step in the 12-step just scale (1/1, 16/15, 9/8 … 15/8) and an octave, from how often and where Scripture uses it; two companion words add soft partials at a consonance (1/1, 5/4, 4/3, 3/2, 2/1).'],
        ['Feeling', EMOTION_SOURCE + '. Valence picks the mode (Aeolian, Dorian, Mixolydian, Ionian, Lydian in five even bands); arousal sets the tempo, 54 + 30A BPM; dominance sets loudness, register and brightness.'],
        ['Harmony', 'Bars are fitted to each verse; the chords move through the mode and every verse ends V–I. Each chapter ends on the Amen, major IV–I. Only Revelation 22 closes on 110 Hz.'],
        ['Linked verses', LINK_SOURCE + '. Each swell blends this verse\'s three rarest words with the linked verse\'s, meeting over the home note.'],
        ['Light', LABELS.DISH + '. The hue follows valence: cool blue at sorrow, warm gold at joy.'],
        ['Playback speed (preview)', 'Speed multiplies the whole score on the way out: tempo, word timing, swells and the reading voice together. The Law\'s notes and intervals do not change.'],
        ['Reading voice', 'Your phone\'s own speech voice, no network and no AI. Its rate follows the music\'s reading pace.'],
      ].map(([t, d]) => `<div class="card"><div class="orig-t">${esc(t)}</div><div class="dim" style="opacity:.75">${esc(d)}</div></div>`).join('')}`;
    el('oForm').onsubmit = e => {
      e.preventDefault();
      const w = bare(el('oQ').value.trim().split(/\s+/)[0] || ''), t = w && tone(X.lex, w);
      el('oRes').innerHTML = !w ? '' : !t ? `<div class="dim">"${esc(w)}" (stem "${esc(stem(w))}") is not in the codebook.</div>`
        : `<div class="kv"><b>Stem</b><span>${esc(t.stem)}</span><b>Step</b><span>${STEP_NAMES[t.step]} (just ratio ${JUST[t.step].toFixed(4)})</span>
          <b>Octave</b><span>${t.octave >= 0 ? '+' : ''}${t.octave}</span><b>Tone</b><span>110 × ${t.ratio.toFixed(4)} = ${t.freq.toFixed(2)} Hz</span>
          <b>Companions</b><span>${t.partials.map((p, i) => `${CONS_NAMES[[t.c1, t.c2][i]]} → ${p.freq.toFixed(1)} Hz`).join(' · ')}</span>
          <b>Uses</b><span>${t.count.toLocaleString()} in Scripture${t.count < 200 ? ' · a key word (sings in the melody)' : ''}</span></div>`;
    };
  }

  const renderers = { read: renderRead, recall: renderRecall, notes: renderNotes, search: renderSearch, origins: renderOrigins };
  return { render: t => renderers[t]?.(), markPlaying, rerenderRead: () => renderRead(true), readAt };
}
