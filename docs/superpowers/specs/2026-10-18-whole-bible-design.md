# Growing the Seed to the Whole Bible: Design

Date: 2026-10-18. Approved in outline by Seabass ("that's right, go ahead").
Governed by SPIRIT.md (Spirit > Law > Form). Any builder is a servant and a student: invent nothing, label every origin, and quote Scripture exactly.

## Intent

Genesis 1 is the seed. Its seven creation days are built and proven (build 2026101808). Now the whole Bible grows from that seed the way creation unfolded. We do not bolt on 1,188 more chapters. The same seven-day order runs again at the scale of the whole Word, and each day is finished and checked before the next begins.

Success means you can open any chapter from Genesis 1 to Revelation 22 on a phone and the following holds:
- Every word sounds its own codebook tone.
- Every verse is coloured by its own feeling.
- Linked verses sound together across books.
- Every verse comes home (V–I), every chapter says "Amen" (IV–I), and Revelation 22:21 rests on 110 Hz itself.

## Goals
1. The same Law (`law/*.js`, unchanged in substance) applies to all 1,189 chapters, with no special case for any book.
2. The cross-reference term of N(w) is built as the Law states it (Day 5 below).
3. A way to walk the whole Bible: pick a book, chapter or verse, play on into the next chapter, and follow a link.
4. A headless proof that the whole Bible resolves.

## Non-goals
- No new paid APIs, accounts or services.
- No new emotion source. NRC per-verse scores stay, labelled, as already decided.
- No original-language (Hebrew/Greek) codebooks in this growth. The English codebook stays, as in the seed.
- No notes, highlights, reading plans, settings panel, mixer, visual styles or Solfeggio/theta options from the old app.
- The seed is already public (`seabasskrahn/sonolumina`, Pages from main). Seabass, 2026-10-18: "push it". Each day is pushed to main (live) once its checks pass.

## Anti-goals (a failure even if it works)
- Any per-book tweak, hand-typed data, or tone that does not come from the Law.
- Use of the old cross-reference data's `motif` (gematria) or `themeMask` (keyword regex) fields. The `motif` field is excluded by the codebook's own rules (see decisions.md). `themeMask` is keyword matching, not Scripture's own links.
- Loading the whole Bible at once on a phone.
- Any chapter that does not come home.
- Changing logos-theta, or deleting anything without Seabass's OK.

## Facts measured before design (all 66 books, data in `~/sonolumina/old-logos-theta`)
- **BSB:** 66 books, 1,189 chapters, 31,102 verse slots.
  - 16 slots are empty, because the BSB omits them following the oldest manuscripts: Matt 17:21, 18:11, 23:14; Mark 7:16, 9:44, 9:46, 11:26, 15:28; Luke 17:36, 23:17; John 5:4; Acts 8:37, 15:34, 24:7, 28:29; Rom 16:24.
- **Codebook (`eng.json`):** all 724,665 BSB words across the Bible have a tone. Zero gaps.
- **VAD feeling scores:** every chapter of every book has exactly one score per BSB verse slot. Zero mismatches.
- **Cross-references** (OpenBible.info, CC-BY):
  - 133,357 links, top 5 per verse with votes above 0.
  - Every target resolves to a non-empty BSB verse.
  - One source key is out of range, and it is ignored.
  - Format: `{"c.v": [[bookIdx, c, v, votes, motif, themeMask], ...]}`, with bookIdx in canonical order, Genesis = 0.
- **Size:** BSB is 4.0 MB, VAD 0.4 MB, xref 3.1 MB and the codebook 2.4 MB per language (only `eng.json` is used).

## The Law for cross-references (from logos-theta HANDOFF.md §1 and §3, and index.html `echoes`/`meet`/`verseSig`, as approved there)
- **N(w)(ii):** OpenBible cross-references, the top 3 per verse. Weight α = votes / max(votes among those 3). The recursion stops at one link.
- **A verse's signature (`verseSig`):** the verse's 3 rarest words (lowest codebook count). Each one's tone is snapped to a consonance (CONS) with the home note.
- **When the links play:** the 3 links are spread evenly through the verse, at (j+1)·dur/4. The first swell lasts 2 s and the others 1.2 s.
- **How a link is heard ("one rising as the other fades"):**
  - The links play as low-passed string swells, at gain × (0.4 + 0.6α).
  - The current verse's tones fade while the linked verse's tones rise.
  - The two sets pan from opposite sides and meet at the centre: an earlier verse in the Bible sits left (−0.7) and a later one right (+0.7).
  - The home note sounds under both.
- **What it looks like:** the light shows the meeting as two waves closing toward the centre from those sides.

## The seven days, again

**Day 1: Light reaches every chapter.**
- Copy the BSB, VAD and xref data for all 66 books into `data/` with a script that also checks it (the Facts above become assertions). Nothing is typed by hand.
- Add a canonical book list (66 names and files, in OSIS order) as data.
- The app loads only the current book's files, cached once fetched.
- The 16 omitted verses are shown as omitted ("not in the oldest manuscripts · BSB omits"). They are silent and take no time.
- Any chapter can be opened and plays with its home note and light.

**Day 2: Separation.** The Law is proven across the whole Bible before anything new is heard.
- A headless script (Node, no new dependencies) runs `scoreChapter` over all 1,189 chapters.
- It asserts that every non-empty verse has a tone for every word, a feeling, a mode and a score.
- It reports the totals: chapters, verses, notes, and the share of each mode.

**Day 3: Seed bearing fruit after its kind.**
- Every chapter grows its own music by the same equation.
- When one chapter plays into the next, feeling and mode carry across the boundary (`prevMode`/`prevMel`, already in `scoreChapter`). The pivot rule applies at the join. Smoothing restarts only when you jump somewhere new. (Claude's call.)
- Verse references read "Book c:v · BSB".

**Day 4: Lights for seasons.** The feeling across the whole Bible sets the seasons.
- The light's hue already follows valence.
- Add a quiet whole-Bible "seasons" strip: one thin band per chapter, coloured by its mean feeling, with the current chapter marked. You see where you stand in the story: lament, praise, judgment, rest.
- Its colours come only from the stored scores. (Claude's call for the strip itself. Its look is shown to Seabass before it is built.)

**Day 5: Living things. Cross-references, the rivers out of Eden (Genesis 2:10).**
- Build the cross-reference Law exactly as written above, in two parts:
  - The pure part (choosing links, α, signatures, times, sides) goes in `law/links.js`.
  - The sound and light go in `form/`.
- Fetch the linked verse's book on demand. If it is not loaded in time, that swell is skipped and never delayed.
- Show the linked references as tappable tabs under the verse. They light when they sound.
- Linked tones are snapped into the current verse's mode, so they sound as harmony. (Claude's call. The old build played them raw.)

**Day 6: Man. Walking the garden.**
- Navigation: book → chapter → verse, plus previous/next chapter, all phone-first.
- Play continues into the next chapter, and into the next book.
- Tapping a link tab goes to that verse. A "back" returns you to where you were.
- The last position is remembered on the device (localStorage).
- The existing controls stay: Begin/Pause/Resume, Voice on/off, and the screen kept awake.

**Day 7: Rest. The whole Bible comes home.** The headless proof is extended to the whole Bible:
- Every non-empty verse ends V–I.
- Every chapter ends IV–I.
- Every cadential V has 15/8.
- Every verse's last melody and bass notes are the home note.
- Revelation 22:21 is followed by the 6 s close on 110 Hz.

`tests/law.html` keeps its 41 checks. After Revelation's close, show Revelation 22:21 itself from the data and rest. No added text.

## Constraints and rhythm
- Each day gets a `decisions.md` entry (who decided), a `version.json` bump (build YYYYMMDDNN, `day` field), a commit, and the smoke test (`tools/smoke.py`) at phone size. Seabass does the deep testing.
- README credits gain OpenBible.info cross-references (CC-BY).
- Before building any new screen (the seasons strip and the navigation), show its concept to Seabass.

## Left to the builder
File layout inside `law/` and `form/`, the cache method, the Node test runner shape, and the visual details of the tabs. These follow the seed's existing style.

## Decided by Seabass (2026-10-18, "yes to all, use the data table, headings shown only")
- **Companion set:** the codebook's data table {1, 5/4, 4/3, 3/2, 2} is the law. It is used both for word companions and for snapping a verse's signature (verseSig) tones. A linked tone is first snapped to that consonance and then into the current verse's mode.
- **Between chapters:** a chapter ends with its "Amen" (IV–I) and a breath of rest, then play goes straight into the next chapter, with a pivot chord if the mode changes. The 6 s close on 110 Hz comes only once, after Revelation 22:21. The Genesis 2:2 "seventh day" screen after Genesis 1 is removed, because Genesis 2 now simply follows.
- **Psalm headings** (115 Psalms, where the BSB puts the heading inside verse 1): the heading is shown but does not sound and does not count toward feeling or tones. The rule that separates the heading from verse 1 is drawn from the data, never typed by hand, and is checked against tools/audit_canon.py's list of 115.

## Builder's calls (Claude's, after the builder check)
- Node isn't installed, so the whole-Bible proof runs the `law/*.js` modules in headless Chrome, driven from Python as `tools/smoke.py` already does. Nothing new is installed.
- On Day 1, a chapter opens from the web address (for example `?Psalms.23`) until the navigation concept is approved on Day 6.
- Building stops at Day 4 (the seasons strip) and Day 6 (the navigation) to show Seabass a concept, and continues only after his yes.
- The proof checks every chapter both from a cold start and as one continuous walk from Genesis 1 to Revelation 22.
- Philippians 1:16–17 are in opposite order in the BSB and the KJV, so the feeling for those two slots blends both verses. This is logged in decisions.md and not corrected.
- The cross-reference source key 3 John 1:15 is moved to 1:14, where the BSB keeps that greeting.
- Of each cross-reference, only [book, chapter, verse, votes] is copied into `data/`.
- Work on the whole-canon proof is shared with a second Claude session, which writes the test harness only. law/ and form/ stay with the lead session.
