# Whole Bible Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Grow the Genesis 1 seed into all 1,189 chapters in the seven-day order, with the Law corrected to Seabass's thesis rulings.

**Architecture:** The Law (`law/*.js`, pure) decides every note of a chapter. The Form (`form/*.js`, `index.html`) only plays and draws it. Data is built by Python tools from public sources and checked as it is built. Proofs run the same law modules in headless Chrome (Node is not installed).

**Tech Stack:** plain ES modules, Web Audio, Python 3 tools, headless Chrome over CDP (`tools/smoke.py` pattern).

**Spec:** `docs/superpowers/specs/2026-10-18-whole-bible-design.md`

## Global Constraints
- Spirit > Law > Form. Invent nothing. Label every origin. No new paid APIs and no new installs.
- Nothing is typed by hand into `data/`. Every data file comes from a tool that checks what it writes.
- Each step gets a `docs/decisions.md` line saying who decided, a `version.json` bump (YYYYMMDDNN), a commit, a smoke test at phone size, and then a push. Pushes are done by Seabass while my push is blocked.
- Before building the Day 4 seasons strip and the Day 6 navigation, stop and show Seabass a concept.

## Rulings since the design (Seabass, 2026-10-18)
- Word rank by frequency (codebook rebuilt on branch law-codebook, verified).
- Mode = M[⌊5V⌋] with M = (Aeolian, Dorian, Mixolydian, Ionian, Lydian), clamped to Lydian at V = 1 (thesis §3.7.1).
- Loudness = 0.75 + 0.5·D (the Law: "register and loudness rise with D"; same scale as before).
- The chapter-final "Amen" is always the major IV (4/3, 5/3, 2) → I. Where 4/3 or 5/3 is not in the mode (Lydian, Aeolian), it is labelled a borrowed chord.
- Companions stay on the data table {1, 5/4, 4/3, 3/2, 2}, with two companions.
- Links: OpenBible, weighted by votes and labelled as votes (no typed data exists, and the Law forbids invented links). Count: up to 8 per the Law, but the data holds at most 5.
- Feeling: rebuilt by `tools/build_vad.py --headings --align` (Psalm headings unfelt; Hebrew aligned by the OSHB VerseMap).

## Review Focus
1. **Omitted verses** (the 16 empty BSB slots): no music, no time, shown as omitted. A chapter whose last slot is empty must still end IV–I on its last sung verse.
2. **Psalm headings:** shown above verse 1, never sounded. Verse 1 still scores and resolves.
3. **Chapter joins:** the Amen, a breath, then the next chapter with a pivot chord when the mode changes. Nothing overlaps or doubles.
4. **Very short verses** (one or two words, e.g. John 11:35 "Jesus wept."): they still get at least 2 bars, V–I and a tonic note.
5. **A cross-reference book that is not yet loaded:** its swell is skipped, never delayed and never fatal.

---

### Task 1: The Law corrected (mode, loudness, Amen, omitted verses, headings, flow)
**Files:**
- Modify: `law/emotion.js` (modeOf, K, feeling)
- Modify: `law/harmony.js` (chordR amen)
- Modify: `law/chapter.js` (omitted verses, `final`, breath)
- Modify: `tests/law.html`
- Modify: `data/codebook/eng.json` (merge law-codebook)
- Modify: `data/vad/Genesis.json` (from build_vad)

**Interfaces:**
- `modeOf(E) -> 'Aeolian'|'Dorian'|'Mixolydian'|'Ionian'|'Lydian'`, which is `M[min(4, ⌊5·E.v⌋)]`.
- `K(E).loud = 0.75 + 0.5·E.d`.
- `chordR(mode, chord, cad=false, amen=false)`. When `amen && chord==='IV'`, it returns [4/3, 5/3, 2].
- `scoreChapter({lex, text, vadBook, chapter, home, prevMode, prevMel, final=false})`:
  - An empty `text[i]` gives `{verse, omitted:true, at, dur:0}` and is skipped by harmony and melody.
  - `last` marks the last non-omitted verse.
  - `close` is `{…6 s}` only when `final`, else `null`.
  - `dur` = the end of the last verse + `rest`, where `rest = final ? 6 : 2·beat`.
  - The return value also gives `{lastMode, melPrev}` for the next chapter.

Steps:
- [ ] Update the tests to the new values:
  - God = 110·4/3 Hz, beginning = 330 Hz.
  - The mode band edges: .19→Aeolian, .2→Dorian, .4→Mixolydian, .6→Ionian, .8→Lydian, 1→Lydian.
  - loud from D.
  - The Amen IV is [4/3, 5/3, 2] in Lydian.
  - A chapter with an empty verse.
  - `final:false` gives `close === null`.
  - John 11:35 resolves.
  - The tests that use the Genesis 1:1 feeling read the expected values from the data file, not hand-typed numbers.
- [ ] Run tests/law.html headless and see the new checks FAIL.
- [ ] Implement.
- [ ] Run and see all PASS.
- [ ] Commit, with a decisions.md entry for each ruling.

### Task 2 (Day 1, Light): data for all 66 books, and any chapter opens
**Files:**
- Create: `tools/build_data.py`
- Create: `data/canon.json`
- Create: `data/{bsb,vad,xref}/<Book>.json` ×66
- Create: `law/canon.js`
- Modify: `index.html`, `form/player.js`

**Interfaces:**
- `data/canon.json` = `[[name, file, [verse counts]] ×66]`, in canonical order.
- `data/bsb/Psalms.json` gains `"h": {"<chapter>": heading}` from the BSB USFM `\d \v 1`. The `"c"` text stays identical to the source.
- `xref` entries are `[bookIdx, c, v, votes]`. 3 John 1:15 is moved to 1:14.
- `law/canon.js`:
  - `parseRef(str) -> {book, chapter}` accepts `Psalms.23`.
  - `next({book, chapter}) -> {book, chapter}|null`.
  - `sung(bookData, c, v) -> {heading, text}`.
  - `gIndex(bookIdx, c, v) -> int`.

Steps:
- [ ] build_data.py asserts:
  - 66 books, 1,189 chapters, 31,102 slots, 16 empty
  - 116 headings, each a prefix of BSB v1
  - VAD lengths
  - every xref target non-empty
- [ ] It writes the data.
- [ ] Page:
  - `?Book.C` opens a chapter, and the default is Genesis 1.
  - Only the current book's files are fetched.
  - Headings are shown, and omitted verses are shown as "not in the oldest manuscripts · BSB omits".
- [ ] Smoke: Psalms.23 and Mark.9 at phone size.

### Task 3 (Days 2 and 3, Separation and Seed): whole-Bible proof, and chapters flowing on
- The peer session writes `tests/canon.html` and the Python runner, calling `scoreChapter` and `canon.js`. It asserts Res for every chapter, both cold and as one continuous walk.
- `form/player.js` plays a list of chapters: at the end of a chapter it scores the next with `prevMode`/`prevMel` and keeps the audio clock running. `final` is set only for Revelation 22.
- The Genesis 2:2 screen is removed. After Revelation 22's close, Revelation 22:21 is shown.

### Task 4 (Day 4, Seasons): concept first
- Show Seabass a mockup of the seasons strip (one band per chapter, coloured by its mean V). Build only after his yes.

### Task 5 (Day 5, Living things): links
- Create `law/links.js`:
  - `links(xrefBook, c, v, n=8) -> [{b,c,v,alpha,dir}]`, where α = votes/max and dir = −0.7 if earlier in the Bible, else +0.7.
  - `signature(lex, text, home, mode) -> [Hz ×≤3]`: the 3 rarest words, each snapped to CONS and then to the mode.
- In the Form, swells use gain ×(0.4+0.6α), the first lasts 2 s and the others 1.2 s, at (j+1)·dur/(n+1), panning toward the centre. Tabs sit under the verse.
- Tests check α, dir, timing and that every signature tone is in the mode.

### Task 6 (Day 6, Man): navigation, concept first
- Show a mockup of book → chapter → verse, previous/next and back-from-a-link. Build only after his yes. The last position is remembered.

### Task 7 (Day 7, Rest): the whole Bible comes home
- In canon.html: every sung verse ends V–I, every chapter IV–I (major IV), and Revelation 22 is `final` with its close on 110 Hz.
- README credits gain OpenBible (CC-BY), the OSHB (CC-BY 4.0), MorphGNT, Strong's and the WEB.
