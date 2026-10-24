# Sonolumina — Gate 4 · Sound & Light (handoff for other agents)

Playable build (Claude artifact, same link as Gate 3, private until
shared):
[<u>https://claude.ai/artifact/36UL85hVfzDmS34Zt4QtZi</u>](https://claude.ai/artifact/36UL85hVfzDmS34Zt4QtZi)
Source file: sonolumina_gate4.html — single self-contained page, no
network, built on Gate 3 · The Dwelling. Save format unchanged (v3).
Date: 2026-10-24.

## Principle (must be kept by every agent)

Scripture alone. KJV text (public domain) is carried inside the file.
Nothing converts letters to numbers, and no frequency carries meaning of
its own; tuning is ordinary A=440 equal temperament. (This is why Logos
Theta was retired: binaural beats, solfeggio and letter-number tones.)
The music follows the MEANING of the words, as a hand-written, revisable
interpretation.

## What Gate 4 adds

- **The Word card** (bottom of the world view) shows the verse for this
  moment, the verses read with it (cross-references), and the themes the
  conductor hears. Tap it to read the verse in full.

- **Moment → verse:** an event first (naming → Gen 2:19; house stage →
  Ps 127:1; house finished → Gen 1:31), then scale (Universe → Ps 147:4,
  Galaxy → Ps 19:1), then the hour and activity (night, rest day Gen
  2:2/2:3/Ex 20:11, dawn Gen 1:3 / Lam 3:22–23, evening Gen 1:5, work
  Gen 2:15 / Ps 90:17, river Gen 2:10, house Ps 127:1 / Prov 24:3,
  garden Gen 2:8 / 2:9). 31 verses; every cross-reference resolves.

- **The conductor (an early form of "the Craft"):** the verse's themes
  (weight 1) plus its cross-references' themes (0.45 each) are combined,
  and time adjusts them (night leans toward rest and the heavens). Ten
  themes, each a voice: light (high bells), water (flowing arpeggio),
  growth (warm pad), work (plucked pulse), rest (low drone), name
  (call-and-answer motif), home (warm low chord), heavens (high
  shimmer), peace (soft thirds), praise (bright chord swell). The
  orchestra eases toward a new meaning gradually instead of switching.

- **Live, never the same twice:** the hour sets mode and pace (dawn
  Lydian 64, day Ionian 80, evening Mixolydian 68, night 52, rest day
  60); each bar's chord is chosen in the moment; tempo drifts with work
  and rest.

- **Light:** every note is also a mote of light where its meaning lives
  (water on the river, growth on the trees, work at the pile, home at
  the house, rest and peace near the people, name on named things), plus
  a faint wash in the colour of the leading theme. The light plays even
  with sound off.

- **♪ button** turns sound on or off (off by default; browsers need a
  tap to start audio). Pausing life pauses the music.

## Code notes

- New sections: SCRIPTURE, THEMES,
  word/momentVerse/hearVerse/updateWord/hearMoment,
  MODES/PHASES/NEXT_CHORD, music/startAudio/tone/voice/playStep/conduct
  (60 ms look-ahead scheduler),
  LIGHT_COLORS/spawnMote/moteHome/paintLight.

- Hooks: announceName → hearMoment('Genesis 2:19') + call motif; deposit
  stage complete → hearMoment.

- Debug: SonoLumina.snapshot() adds word {ref, text, with, themes},
  music {on, phase, mode, tempo, chord, motes}, scripture {verses,
  missingLinks}.

## Tested (Playwright, 412×900)

Verse selection across dawn, work, river, universe, night; audio starts
and schedules; no missing cross-references; no console errors.

## To check

- ~~Proof the KJV verse text~~ Done 2026-10-24: all verse texts in
  gates/sonolumina_gate4.html match data/kjv word for word (checked by script).

- The theme tags and cross-reference choices are a first interpretation.
  Seabass should review them; they are meant to grow into the Craft.

## Next ideas

More verses and cross-references (a growing link graph); people humming
or speaking verses; Gate 5 daily life (eating, tending, the deer) with
its own verses.

## Home note

The home note is now **110 Hz (A2)**, unified with the main SonoLumina app (`ROOT=45` in MIDI, A=440 equal temperament unchanged). Gate 4 previously used D3 (about 147 Hz, `ROOT=50`). All modes and chords derive from the new root.
