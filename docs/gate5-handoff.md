# Sonolumina — Gate 5 · Daily Life (handoff for other agents)

Plan-faithful build (Grok CLI). This is an alternative to Claude's open
PR #3, which builds a different Gate 5 (two meals, a hunger label, one
deer, and no seed beds or day planner). This branch does not change
`gates/sonolumina_gate3.html` or the Gate 4 handoff. The two builds are
meant to be compared, not merged together.

Source file: gates/sonolumina_gate5.html — one self-contained page, no
network, copied from Gate 3 on this branch (that file already includes
Gate 4 sound and light) and extended. Save key
`sonolumina.first-garden.v4`.
Date: 2026-10-24.

## Principle (must be kept by every agent)

Scripture alone. KJV text (public domain) is carried inside the file.
Nothing converts letters to numbers, and no frequency carries meaning of
its own; tuning is ordinary A=440 equal temperament. (This is why Logos
Theta was retired: binaural beats, solfeggio and letter-number tones.)
The music follows the MEANING of the words, as a hand-written, revisable
interpretation.

No enemies. No scores. No hunger meter and no hunger label. A meal is
the shape of the day, not a failure.

## What Gate 5 adds

- **The day, dawn to sleep.** Life runs from morning through night. Work
  stays between 07:00 and 18:00 by itself. At night they rest, inside
  once the home can hold them.

- **The seventh day.** When `world.day % 7 === 0`, all work stops. They
  walk together and sit by the river. The garden is quieter: slower
  steps, a pale wash, fewer motes, and the drone below. The Day book
  cannot put tending or building on that day, and Home cannot start the
  work. A lean stored for the other days is left as it was and returns
  tomorrow. Meals still happen. They are not work.

- **Three meals** at the hearth: dawn, noon, and evening, fruit from the
  named trees (fig, olive, pomegranate, almond, grape, date). The trees
  regrow. Both people sit before the meal is marked. A missed window
  simply passes. There is nothing to "feed" a meter.

- **Tending.** They carry water from the river, clear paths (the clutter
  comes back after a few days), and plant seed beds. A bed moves through
  seed, sprout, leaves, bud, and bearing, one stage a dawn, and only if
  it was watered. An unwatered bed waits. Nothing dies and nothing goes
  wrong.

- **A small herd.** Three deer, not one. Come slowly and they step
  closer. Come fast and they step back. Feeding and quiet waiting raise
  a hidden number. That number is never shown. The only sign is that
  they come closer. The number does not fall.

- **The Day book.** Tend, build, or rest. A fresh garden leans toward
  tending, so the house does not start by itself. Home's "begin" leans
  the day toward building. "Set aside" leans it toward rest. On the
  seventh day the Word card reads the Sabbath verses (Exodus 20:8–11,
  Genesis 2:2–3).

## Code notes

- Save version 4 only. A Gate 3 (`sonolumina.first-garden.v3`) or Gate 2
  (`…v2`) garden is read and left byte for byte where it was. Names, the
  house, and a build that was already under way come forward. This gate
  never writes the old keys. The first save here creates v4.

- v4 adds `meals`, `beds[]`, `deer[]` (name and the hidden number), and
  `planner`. Also, beyond the short list: `fruit[]` (what is on the
  trees), `paths[]` (which stretches are blocked), and `heard[]` (the
  Word card's recent verses, capped at 40). Gate 3 and Gate 4 did not
  keep a verse log.

- `SonoLumina.snapshot().daily` lists meals, the stored lean, today's
  effective lean, beds, deer id/name/place, blocked paths, and fruit.
  It does not include the hidden deer number. `homeHz` is 110.
  `music.mode` reports what is actually heard: `drone` on the seventh
  day, `home` while they are eating, otherwise `ionian`.

- **Harmony.** `pitch()` is forced to Ionian for the whole day, so a
  Lydian raised fourth or a Mixolydian flat seventh cannot hang. The
  hour still names the phase and sets the tempo (dawn 64, day 80,
  evening 68, night 52, rest 60). Garden E3 (MIDI 52, about 164.81 Hz)
  and river C#3 (MIDI 49, about 138.59 Hz) sound through an ordinary
  day. A meal lands on the A2 home chord (A2, C#3, E3, and a soft A3).
  While the day leans toward building, inside work hours, a pulse on
  G#3 (MIDI 56, about 207.65 Hz) is the seventh that has not gone home
  yet. At 18:00 on a working day that G# resolves to A, and the Word
  card reads Psalm 104:23, then the evening meal's verse. The seventh
  day is a sustained 110 Hz drone with soft thirds (C# only), tempo 48,
  master gain about 0.4 instead of 0.8. The only suspension is a fourth
  (D3, MIDI 50) on the first step of a bar, resolved to C#3 on step 4,
  and forced home by step 7 if it is still open. No 432 Hz. No solfeggio.

- Cross-references still use Gate 4's flat weight of 0.45. The plan's
  edge-weight table is not built yet.

- Scripture is 40 cards. The 31 inherited from Gate 4 were checked
  against `data/kjv`. One card, `Lamentations 3:22–23`, is those two
  verses joined, as Gate 4 wrote it; each half matches the file. The
  nine verses added here were copied from that JSON, including the
  apostrophe in Psalm 104:15 ("man's", U+2019). None are marked VERIFY.
  Psalm 104:23's companions are Genesis 1:5, Ecclesiastes 3:1, and
  Genesis 2:15.

## Tested (node --check, headless Chrome)

The script inside the page passes `node --check`. Headless Chrome loaded
the file with no exception and no console error. The only request was
the page itself.

On a fresh garden at 3×, within about twenty seconds: the dawn meal was
shared, two beds were planted (herb, grain), the blocked paths were
cleared, and one person was going to the river for water. The visible
page had none of these words: hunger, trust, score, 432, solfeggio.
The save held the deer numbers (small integers). The snapshot did not.

A synthetic Gate 3 save was left byte for byte unchanged. v4 was
written. Sono and Lumina, a garden name, and a house already under way
(leaning toward building) came forward. The v2 key was not created.

Loaded on day 7 at 10:00, with the dawn meal already shared: the Day
book read Rest, Tend and Build were refused even when forced, Home
would not start the work, the stored lean stayed "tend", the music mode
was `drone`, both people went to sit by the river, and the Word card
read Exodus 20:9. Beds and paths were left alone.

A day carried across 18:00 put Psalm 104:23 on the card ("Man goeth
forth unto his work and to his labour until the evening.").

## To check

- Hear it. The home chord at a meal, the G# pulse while they are
  raising the house, the resolution at 18:00, and the quieter seventh
  day. Headphones will tell more than this smoke test.

- The theme tags and cross-references are still a first interpretation,
  as in Gate 4. Seabass should review them.

- A printed KJV is the second proof if he wants one. The wording in
  this file was compared to `data/kjv`, not typed from memory.

## Next ideas

Gate 6 from `docs/gates-5-10-plan.md`, on top of whichever Gate 5
Seabass keeps. Do not fold this file into PR #3. They answer the same
gate with different choices, and the plan is the one this file follows.

## Home note

The home note is **110 Hz (A2)**, `ROOT=45`, A=440 equal temperament,
the same root Gate 4 uses after commit 3445a33.
