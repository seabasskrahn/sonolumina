# SonoLumina Gates 5-10 Plan

**Status: DRAFT PLAN. Nothing in it is built.** Written 2026-10-24 for owner review. It follows the Gate 3 and Gate 4 handoffs (docs/gate3-handoff.md, docs/gate4-handoff.md) and the Frequency Map canon ("SonoLumina Frequency Map — Garden Baseline", cross-coat-matrix-master/docs).

**Verse check:** Every verse quoted here was typed from memory and **must be checked against a printed KJV** before it goes into the game. Where text is uncertain, only the reference is given.

## Arc summary

Gates 2-4 set up a world that is whole: a named garden, two people (Sono and Lumina), a dwelling built and rested in, and Scripture-driven sound and light that resolve to the 110 Hz home note. Gates 5-10 follow the Narrasoma arc, from home through tension and back home again. **Gate 5** lets ordinary life settle into a faithful rhythm. **Gate 6** opens the world to a town and neighbors, so love of neighbor (Matthew 22:39) becomes something the player does. **Gate 7** is the low point. Hardship, famine and wandering pull the music away from home, and the Canonical Tension Graph is at its height. It stays peaceful: no enemies, no combat, no gore. **Gate 8** brings them back and restores what was lost. **Gate 9** shows the law written on hearts (Jeremiah 31:33) through how the people now act, with no scores. **Gate 10** reaches the Home Key: New Creation and Sabbath rest, where every voice resolves to 110 Hz for good.

## Shared rules (kept from Gates 2-4)

- Single-page HTML canvas. Local only, with no network access. Saves go to browser localStorage.
- Scripture alone: KJV text is embedded in the file. A=440 equal temperament. **No 432 Hz, no solfeggio, no letter-number tones.** No frequency carries meaning of its own; the music follows what the words mean.
- The world foundation is the Ten Commandments (Exodus 20) and Matthew 22:37-40, with the law on hearts from the beginning (Jeremiah 31:33). **There is no commandment poster, no morality score and no meter.**
- Peaceful: no enemies, no combat, nothing crude or dark. Sorrow is handled gently.
- Home note: **A2 = 110 Hz** (MIDI ROOT=45). Intervals from the Frequency Map, in equal temperament above home:

| Element | Interval | Note / Hz (above A2) |
|---|---|---|
| Universe / Home | baseline | A2 110.00 |
| River | major third | C#3 138.59 |
| Bridge | fourth | D3 146.83 |
| Garden | fifth | E3 164.81 |
| Town | major sixth | F#3 185.00 |
| Building | seventh (leading tone) | G#3 207.65 |
| Sono / Lumina | own harmonizing notes | e.g. C#3 / E3 (owner to confirm) |
| Site Alpha city (later) | octave above garden | E4 329.63 |

- Tension and resolution: dissonance means distance from home. It is the tension-graph weight × the emotion lexicon, and it shows up as unresolved intervals (seconds, tritone, a suspended 4th or 7th) above 110 Hz. Resolution moves step by step toward home: seventh → octave, fourth → third, fifth → root.
- Intertextual edge weights steer the conductor's cross-references: quotation 10, type-antitype 8, prophecy-fulfillment 6, allusion 4, echo 2, parallel 1.

---

## Gate 5 · Daily Life

**Description.** With the house standing, Sono and Lumina live in it. Each day has a shape: wake at dawn, eat, tend the garden, care for the deer, work from 07:00 to 18:00, gather in the evening, and sleep. Every seventh day all work stops for rest and the whole world gets quieter. The point of this gate is that ordinary, faithful life is good. Nothing goes wrong.

**Mechanics added.**
- Meals: three moments a day (dawn, noon, evening). The people pick fruit from named trees, which grows back over time, and eat at the hearth. There is no hunger meter. A meal is simply part of the schedule.
- Tending: watering from the river (carry water), clearing paths, and planting seeds into new beds that grow through visible stages over several days.
- The deer: a small herd that can be approached slowly, fed, and named. Trust grows with gentle repetition. It is stored as a number that is never shown; the only sign is that the deer come closer.
- Day planner: the player can lean the day toward tending, building or rest. Work hours and the seventh day are kept automatically, so the player cannot schedule work on day 7.
- Seventh day: a walk together, sitting by the river, and the Word card reading the Sabbath verses.

**Scripture / theme.** Genesis 2:15 ("to dress it and to keep it"); Genesis 1:29; Psalm 104:14-15, 104:23 ("Man goeth forth unto his work and to his labour until the evening"); Ecclesiastes 3:1; Exodus 20:8-11; Genesis 2:2-3; Proverbs 12:10 (care for beasts); Psalm 42:1 (the deer). Themes: work, rest, growth, water, home.

**Music / frequency.** This is still the Frequency Map's Gate 4-5 scope. The garden fifth (E3) and river third (C#3) carry the day, and the meal moments land on the home chord (A2). The work pulse sits on the building seventh (G#3), which resolves to A every evening at 18:00. The seventh day is a sustained 110 Hz drone with soft thirds. Tension stays very low: only suspensions that resolve within a bar.

**How it advances the arc.** It sets up the home baseline that the player will later miss. The Source Arc Envelope is at "home, settled."

**Carry-over / save.** New save key `sonolumina.first-garden.v4` adds `meals`, `beds[]`, `deer[]` (names and hidden trust), and `planner`. The v3 save migrates automatically and is left untouched. The house, names and Word history carry forward.

---

## Gate 6 · The Wider World

**Description.** A path across a new **bridge** (a fourth) leads to a small **town** (a sixth) with a handful of neighbors. Each neighbor has a name, a home and a simple need: a fence to mend, a meal to share, a child's lost lamb to find, a widow's water to carry. Sono and Lumina can help, trade gifts, and invite people to their hearth. Love of neighbor becomes something the player chooses to do day by day.

**Mechanics added.**
- Bridge build, using the Gate 3 stage system: stone piers, a timber deck, and rails.
- Town scene: 5-8 neighbor NPCs on daily routines, each with their own home and work hours. The town keeps the seventh day too.
- Needs board: no quests, no XP. A neighbor's need appears as a small visual cue at their door, and helping is optional. Each kindness is remembered in a local `kindnesses[]` log, which is never shown as a score.
- Hospitality: invite neighbors to a shared meal at the house. The meal table and voices get fuller.
- Gifts: produce from the Gate 5 beds can be given away freely. There is no currency.

**Scripture / theme.** Matthew 22:37-40 ("Thou shalt love thy neighbour as thyself" — verse 39); Luke 10:25-37 (the Good Samaritan); Leviticus 19:18; Romans 12:13; Proverbs 3:27-28; Hebrews 13:2. Themes: home, peace, work, name, praise.

**Music / frequency.** The bridge enters as the fourth (D3) and the town as the sixth (F#3). Each neighbor gets a harmonizing note drawn from the A major scale, so everyone who belongs resolves to baseline. When a kindness is done, the neighbor's note joins the home chord briefly. A shared meal sounds every present voice resolving onto 110 Hz together. Optional: hints that the Site Alpha city could later sit an octave above the garden (E4). Not built here.

**How it advances the arc.** It widens the circle of home. The tension graph begins to register small needs, which are gentle open intervals that kindness resolves.

**Carry-over / save.** v4 → adds `bridge`, `town.neighbors[]` (name, home, trust), and `kindnesses[]`. The garden and house are unchanged.

---

## Gate 7 · Trial and Exile

**Description.** A season of hardship comes. The rains fail, the garden fruit shrinks, and the river runs low. Sono and Lumina, with some neighbors, have to leave home for a time and walk to a far place to find food. It echoes the Fall and Genesis 3, Joseph's famine and Ruth's journey. It is sorrow, not horror. There are no enemies, no death on screen, no gore and no punishment mechanics. The people keep the seventh day even on the road, share what little they have, and the Word card goes on reading.

**Mechanics added.**
- Season shift: the palette dims, trees thin, and the river shrinks visually. This is scripted, and the player cannot fail it.
- Journey map: a short wandering path through 3-5 waypoints (wells, a stranger's field to glean in, a shelter). The player chooses the route and pace. Every route reaches the end.
- Sharing: food is scarce and shown as a few baskets. Giving to a neighbor is always possible and always noticed by the music.
- Rest on the road: day 7 still stops travel. A tent replaces the house.
- Gentle sorrow beats: the people sit quietly and the Word card shows lament verses. The player can stay as long as they like.
- Accessibility: an optional "gentle mode" that shortens this gate.

**Scripture / theme.** Genesis 3:17-19, 3:23-24 (sent out of the garden: cite only, check text); Genesis 41:54-57 (famine); Ruth 1-2 (journey and gleaning); Psalm 137:1; Lamentations 3:22-23 ("his compassions fail not. They are new every morning"); Psalm 23:4; Isaiah 43:2. Themes: water (absent), rest, peace, heavens, name.

**Music / frequency.** This is the Canonical Tension Graph at its peak. The home note is left unstated: the bass avoids A2. Voices sit on the seventh and the fourth without resolving, add a tritone color (D# against A) where the lament weight is highest, and use minor modes (Aeolian/Dorian) as the base. The emotion lexicon controls volume and timbre (softer, thinner), not just pitch. Hope stays audible: each act of sharing or each seventh day briefly sounds a third or fifth over a hint of 110 Hz, foreshadowing the return. Nothing is harsh or loud.

**How it advances the arc.** This is the far point of the Source Arc Envelope: distance from home. It gives the final resolution its weight.

**Carry-over / save.** v4 → `season`, `journey` (waypoint, day), `stores`. The house and garden are saved as "waiting," not destroyed. Named things keep their names.

---

## Gate 8 · Return and Restoration

**Description.** The rains return and the road leads home. The garden is overgrown and the house is weathered, but both are still there. Sono and Lumina, with neighbors who now help in turn, restore the beds, repair the house, rebuild the bridge, and replant. Neighbors who were helped in Gate 6 come back to help. It is a homecoming of shared labor and joy.

**Mechanics added.**
- Restoration tasks: reuse the Gate 3 stage system to repair the roof, walls, bridge and beds. Each restored place gets its color and voice back.
- Neighbor reciprocity: neighbors from `kindnesses[]` arrive to help. This is shown through behavior, not a reward screen.
- Replanting: seeds saved during the journey grow into a fuller garden than before.
- Feast of return: a shared meal once restoration is complete.

**Scripture / theme.** Joel 2:25 ("I will restore to you the years that the locust hath eaten"); Ezra 3 and Nehemiah 2-6 (rebuilding after exile); Luke 15:11-24; Isaiah 58:12; Psalm 126:1-6; Amos 9:14. Themes: growth, work, home, praise, water.

**Music / frequency.** Dissonance resolves step by step as each place is restored. The seventh resolves to the octave, the fourth to the third, and the tritone falls away. Restored elements re-enter on their map intervals (garden E3, river C#3, bridge D3, town F#3), and the bass gets 110 Hz back. Major modes return. The feast lands on a full A major chord rooted at 110 Hz, the first complete home cadence since Gate 6.

**How it advances the arc.** The envelope turns from tension back toward home. Prophecy-fulfillment edges (weight 6) link the Gate 7 laments to the Gate 8 restoration verses.

**Carry-over / save.** v4 → `restoration` per site. The journey record stays as memory: the Word card can recall it.

---

## Gate 9 · Law Written on Hearts

**Description.** Life is restored, and something deeper shows. The people, and the town, now live out the law without being told. They rest on the seventh day by choice, tell the truth, honor their elders, share instead of taking, leave the neighbor's things alone, and give thanks. The player sees this in what people do: unprompted kindness, honest trades, families gathered, quarrels made up. Nothing announces it and nothing scores it.

**Mechanics added.**
- Behavior layer: NPC and companion routines gain heart-driven choices, each tied quietly in code to a commandment or to Matthew 22:37-40. Examples: returning a lost item (8th), keeping the Sabbath (4th), visiting parents (5th), speaking truly at the well (9th), contentment instead of coveting (10th), and morning thanksgiving and prayer (1st-3rd).
- Reconciliation moments: a small misunderstanding between neighbors resolves through apology and forgiveness, scripted and gentle.
- Player as example: the player's own choices from Gates 5-8 (sharing, rest, kindness) tilt which behaviors spread. This is shown only through how the town looks and sounds.
- Optional reading: the Word card can show Exodus 20 in full when the player taps a quiet moment. It is the text itself, never a checklist.

**Scripture / theme.** Jeremiah 31:33 ("I will put my law in their inward parts, and write it in their hearts"); Ezekiel 36:26-27; Exodus 20:1-17; Deuteronomy 6:4-6; Matthew 22:37-40; Romans 13:8-10; Hebrews 8:10 (quotation of Jeremiah 31:33, edge weight 10); Galatians 5:22-23. Themes: peace, home, name, praise, rest.

**Music / frequency.** Harmony is stable and the voices act independently, like counterpoint. Each person's own note moves freely and lands consonant with the others without being forced. Heart-driven acts sound short resolving figures to 110 Hz. The tension graph sits near zero. The Hebrews 8:10 → Jeremiah 31:33 quotation edge (10) is the strongest link the conductor uses here.

**How it advances the arc.** Home becomes inward as well as outward, so the world is ready for the final resolution.

**Carry-over / save.** v4 → `hearts` (hidden per-NPC tendencies), derived from `kindnesses[]` and journey choices. Never displayed.

---

## Gate 10 · Home Key: New Creation

**Description.** The final gate. The world is made new: the garden, river, town and house shine with their full light, the river runs clear (Revelation 22:1-2), and every named creature, neighbor and place gathers. It ends in an unending Sabbath rest, with no more work hours, no night to fear and no sorrow. The player can walk freely, revisit every named thing, and listen. The game does not "end." It rests.

**Mechanics added.**
- New Creation transform: every scene gets its final palette. Named things keep their names (continuity of the Gate 2 naming).
- Perpetual rest mode: the work clock retires and all activity is walking, observing, naming, gathering for meals together, and praise.
- Remembrance walk: an optional path past markers from Gates 2-9 (first naming, the house, the bridge, the road, the restoration). Each marker plays its moment's verse and motif.
- The Site Alpha city could appear here as the descending city, an octave above the garden (E4). This is an owner decision and could also be a later gate (see Open Questions).
- Ending card: a final verse and a quiet "rest here" option. Play can continue forever.

**Scripture / theme.** Revelation 21:1-5 (verse 4: "God shall wipe away all tears from their eyes" — check text); Revelation 22:1-5; Isaiah 65:17; Isaiah 11:6-9; Hebrews 4:9 ("There remaineth therefore a rest to the people of God"); Genesis 2:2-3 (type-antitype with Hebrews 4, weight 8); Romans 8:21; Psalm 150. Themes: all ten, led by home, rest, praise, light.

**Music / frequency.** This is the Home Key. Every voice (universe, garden, river, bridge, town, building, people, neighbors, deer) resolves to 110 Hz and its octaves in a final sustained cadence, then settles into an endless, quiet, consonant texture rooted on A2. Any city layer sits an octave above the garden. The tension graph is zero. The building's seventh (G#3) resolves to A for good, the leading tone finally home.

**How it advances the arc.** The Source Arc Envelope closes at home. The Narrasoma thesis ("always resolving to home") is complete.

**Carry-over / save.** v4 → `newCreation: true`. All earlier state is kept as memory for the remembrance walk. Saves from any earlier gate load into their own gate.

---

## Open questions for the owner

1. **The Fall:** should Gate 7 depict the Fall (Genesis 3) directly, or only as a famine/exile season in its pattern? This plan currently leans toward echo and pattern, gently.
2. **Sono and Lumina's notes:** confirm each person's harmonizing note (e.g. C#3 and E3) and final Hz values (the Frequency Map says these are pending the divergence test).
3. **Site Alpha:** does the city enter at Gate 10 as the New Jerusalem, or stay in a separate later gate (the map earlier planned gates 6-12)? Should it be +1 or +2 octaves above the garden?
4. **Death:** should Gate 7 show any death (e.g. of an old neighbor or animal), or avoid it completely? This plan avoids it.
5. **Player agency in Gate 7:** should the player be able to make the exile shorter or gentler, or should it be a fixed, scripted season?
6. **Emotion lexicon:** how should its scores map to volume and timbre versus pitch (an open question in the map)?
7. **Gate 9:** is "behavior-only" strict enough, or may the Word card ever name which commandment a behavior reflects?
8. **Gate 10 ending:** end with a credits/rest card, or keep the world explorable forever with no closing card?
9. **Repo save key:** keep a single v4 key across gates 5-10, or bump the version per gate?
10. **Verses:** every quoted verse must be proofed against a printed KJV, and theme tags and cross-references reviewed as a first interpretation.
