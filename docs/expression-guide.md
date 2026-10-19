# Sonolumina verse markup guide (for ElevenLabs v3 expressive reading)
The Scribe, Oct 18 2026. Applies to `<Book>.<chapter>.json` files shaped `{"1": "tagged text", ...}`.

## The one rule
The words are exactly the BSB text: no words added, dropped, reordered, or re-spelled, and the punctuation and quote marks are kept as they are. Tags only shape delivery. If you remove every `[tag]`, the verse must match BSB character for character, apart from extra spaces. `check.py` tests this.

## Allowed tags (closed set)
Tone: `[reverent]` `[solemn]` `[softly]` `[gently]` `[warmly]` `[calm]` `[hushed]` `[joyful]` `[sorrowful]` `[stern]` `[fearful]` `[ominous]` `[slyly]`
Pauses: `[short pause]` (a breath between clauses) and `[long pause]` (a scene or day ends, or a weighty line lands).
Add a new tag only by listing it here first. No sound effects, no laughs, cries or sighs, and no accents.

## Placement rules
1. Put a tag directly before the words it shapes, with one space after it. A tag holds until the next tag or the end of the verse.
2. Use at most 2 tone tags per verse, and leave most verses with none. The narrator's default is a calm, reverent read.
3. A tag needs a clear cue in the text: God speaking, a turn in the story, a blessing, a curse, or fear. Don't tag for decoration.
4. Character voices stay restrained. The serpent can be `[slyly]`, but it is never comic.
5. Don't use pauses to replace punctuation. Commas and dashes already pace the reading, so use `[short pause]` only where a beat matters.
6. Don't use quotes, caps or ellipses for emphasis. They would change the text.

## Checking
Run `python3 check.py Genesis 1` (book name as in data/bsb, then the chapter). It reports any tag that isn't allowed and any verse whose words changed.

## Open questions
- ElevenLabs v3 audio tags are free-form cues, not a fixed list. `[whispers]`, `[sad]`, `[excited]`, `[short pause]` and `[long pause]` are documented examples. My tone words, like `[reverent]` and `[ominous]`, should work the same way, but each one needs a test listen. `[short pause]` and `[long pause]` are the safest.
- The tags must be removed before the text goes to the visuals, the word tones or the RSVP speed reader. Otherwise `[solemn]` would be scored as a word.
- Tags shouldn't go to non-v3 voices or to the browser's built-in speech, because those would read them out loud.
