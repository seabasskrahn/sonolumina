# The Conductor — the Craft played live

Status: **proposed design, not built.** Written 2026-10-24 by Claude, for Seabass to direct (SPIRIT §9).

## What Seabass asked for
- The cross-references should sound like a full orchestra working together, not one verse at a time with a beep per link. (First step built on branch `perfect-1`: `law/links.js orchestra`.)
- An orchestrator that reads everything a verse connects to, works out the meaning that builds up, and makes the background music live, so the story carries emotional and spiritual depth.
- The orchestrator should be intelligent and make real interpretive calls in the moment: an AI "brain".
- The Craft is a skill, not a fixed formula. Time is a factor in how it is worked out live, even if that means a passage does not sound the same every time.
- An idea: a brain built from the Bible, with the books as its nodes.

## The shape: a conductor in front of the score
The music already playing (`law/chapter.js` → `form/player.js`) is the score as written. The conductor stands in front of it and decides how this moment is played. It never writes new notes from nothing. Its moves are a short list, each with limits:

| Move | What it changes | Limit (the Craft's guardrails) |
|---|---|---|
| Lead | which linked verses come forward, and in what order | only real links (OpenBible), at most 8 |
| Dynamics | how fast the orchestra builds and how loud it peaks | under the mix cap (Σ gain² ≤ 0.1²) |
| Rubato | small tempo pushes and pulls | ±15% of 54 + 30A BPM |
| Colour | brightness and register of the seats | inside the current mode |
| Breath | a held silence before a turning point | at most 2 s, never inside a word |
| Turn | moving a mode change earlier or later by a verse, at a real turn in the text (Lamentations 3:22) | only to a neighbouring band, through the pivot chord |

What never moves: every verse ends V–I, every chapter ends on its Amen, Revelation 22 ends on 110 Hz, the text is the BSB word for word, and every tone stays in its mode. These are the same checks `tests/canon.html` runs today, so **every directive is checked by the tests before it is played.** If a directive fails a check or arrives late, that verse plays exactly as written. The music never waits for the conductor.

A directive for one verse is a small piece of JSON, for example:
```json
{ "verse": "Lamentations 3:22", "lead": ["Psalms 136:1", "Isaiah 54:8"], "build": 0.6, "peak": 0.8,
  "rubato": -0.08, "breath": 1.2, "turn": "early", "why": "the first word of hope after 21 verses of grief" }
```
The `why` line is shown on screen as the conductor's interpretation, labelled as AI, never as Scripture (SPIRIT §7).

## Time, worked out live
The conductor reads a few verses ahead (about 30 seconds) and remembers what has already been heard in this sitting. So the same chapter can sound different depending on the road that led to it: Isaiah 53 after Psalm 22 is not Isaiah 53 opened cold. This is the "time as a factor" Seabass described. Determinism is given up only inside the guardrails above.

## The Bible brain: books as nodes
This can be built first with no AI at all, and it gives the conductor its memory:
- **66 nodes**, one per book. **Edges** are the cross-references between books, weighted by votes (133,357 links in `data/xref`, at most 5 per verse).
- When a linked verse sounds, its book's node lights up and passes some of that to its neighbours. Lights fade over time (a half-life of about one chapter).
- What is lit at any moment is the meaning that has built up: after Genesis 22, Hebrews and Romans are glowing. It can drive which seats lead and how full the orchestra is, by fixed rules, before any AI is involved.
- The World screen could show it: the books glowing as the music goes.

## Where it runs
Sonolumina has no server today, and Talk sends text from the phone to the AI service with the reader's own key. Two options:
1. **On the phone, with the reader's key** (like Talk). Simple, works anywhere, but needs a key and costs a little per chapter.
2. **On Seabass's home server, as a module of the Matrix.** One foundation for both projects, which is the merge he ordered on Oct 15. The phone asks the server for directives, and plays the score as written when it can't reach it.

## Steps, each one checkable
1. **Orchestra** — linked verses sound together. *Built (proposed), branch `perfect-1`.*
2. **Bible brain** — the 66-node activation in `law/`, deterministic, with tests (it lights up and fades, using only real links), driving lead and fullness.
3. **Directive format and validator** — the JSON above, checked by the canon rules, with fallback to the written score. A rule-based conductor uses it first.
4. **AI conductor** — an AI fills in the directives a few verses ahead, behind a setting (Off / Rules / AI), labelled on screen, with every `why` logged.
5. **On the Matrix** — the conductor moves to the home server as a shared module.

## Open questions for Seabass
- Which AI should conduct: Claude, Gemini (already used by Talk) or Grok? And where should it run: on the phone with a key, or on the home server?
- Is "Turn" allowed, or should the mode always follow the feeling data as it does now?
- Should the conductor's `why` be shown on screen while it plays, or only in a log?
- Should the folder `law/` be renamed `craft/` now? It is a mechanical change; it was left alone so this branch stays easy to review.
