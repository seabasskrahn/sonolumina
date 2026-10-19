# Sonolumina

Scripture heard and seen: the Word taking form in sound and light.
Governed by [SPIRIT.md](SPIRIT.md) (Spirit > Law > Form).

- `law/`: the Law. Pure data and math, with no sound and no screen.
- `form/`: the Form. Sound, light and what you touch.
- `data/`: Scripture and reference data, never typed by hand.

Built in the order of the creation days, first on Genesis 1 (all seven done), then grown to the whole Bible:
1. Light: any of the 1,189 chapters opens (`?Psalms.23`). **(done)**
2. Separation: the Law proven on every chapter, apart from the Form (`tests/canon.html`). **(done)**
3. Seed bearing fruit: chapters flow on, one into the next, Genesis 1 to Revelation 22. **(done)**
4. Lights for seasons: a strip of all 1,189 chapters, each coloured by its feeling with the light's own hue rule; tap to open one. **(done)**
5. Living things: linked verses sound together. **(done)**
6. Man: previous and next, a picker of books and chapters, a link opens at its verse with a way back, and the last place is remembered on the phone. **(done)**
7. Rest: the whole Bible comes home. Every sung verse ends V–I, every chapter ends on the major IV–I "Amen", and only Revelation 22 closes on 110 Hz itself. **(done)**

After the Word (SPIRIT §11): when Revelation 22 has come home, "Here Scripture ends. What follows is history, not Scripture." The history is shown and never sounded; only the verse each entry grew from sings, by the same Law, and the last entry closes on 110 Hz. Entries are researched by Claude, approved by Seabass, kept in `history/approved/` and built into `data/history.json` by `tools/build_history.py`, which checks every quoted verse against the BSB. Entries are grouped into threads (1: the Word in every tongue; 2: "I was sick and you looked after Me"), each in date order, played one after another. Open one with `?After.1`.

Talk (prototype, branch `voice-chat`): a live voice conversation about the chapter on screen, straight from the phone to Google's Gemini Live API with the reader's own key (kept only in that phone's localStorage; no server). The voice is an AI, not Scripture, and is labelled so; it is given the chapter's BSB text and told to quote it word for word with references, and to say when it does not know. Tap **Talk**; with no key, **Try the demo** plays a mock reply. Tests: `python3 tools/run_canon.py tests/talk.html 60` (24 checks) and `python3 tools/talk_e2e.py` (the panel end to end in headless Chrome with a fake microphone: overlap, background, Back, errors, timeout, echo guard, mic denied).

## Sources and credits
- Text: Berean Standard Bible (BSB), public domain.
- Word codebook: built from the KJV and BSB text alone (words ranked by how often Scripture uses them, counts, companions). Rebuilt and matched entry for entry by `tools/verify_codebook.py`.
- Verse feeling: NRC Valence, Arousal, and Dominance Lexicon (Saif M. Mohammad, National Research Council Canada, 2018). It is a modern English word list, not from Scripture. Research/non-commercial use with credit; only per-verse scores (built by `tools/build_vad.py --headings --align`) are shipped, never the lexicon.
- Psalm headings: the BSB's own USFM (bereanbible.com), public domain.
- Hebrew text and verse map: Open Scriptures Hebrew Bible (OSHB), based on the Westminster Leningrad Codex (public domain); OSHB under CC BY 4.0.
- Greek text: MorphGNT SBLGNT. The SBLGNT text is under the SBLGNT EULA (sblgnt.com/license); the MorphGNT parsing and lemmas are CC BY-SA 3.0.
- Strong's Hebrew and Greek dictionaries: James Strong (1894), public domain; JSON by Open Scriptures, CC BY-SA. Glosses are used for feeling scores only.
- World English Bible (WEB): ebible.org, public domain. Used for feeling scores only.
- Cross references: OpenBible.info, CC BY. Their weights are reader votes, labelled as votes; they are not Scripture.
- Modes in just intonation; feeling → mode is a Western musical convention.
- Home note 110 Hz: a human tuning choice, not from Scripture.
- Overtones: the harmonic series (physics).
- Dish ripple: Bessel J0 (Abramowitz & Stegun 9.4.1, 9.4.3); cymatics after Ernst Chladni (1787).

No frequency is named in Scripture. Sonolumina makes no medical or spiritual claims for any sound.

## Checks
- `python3 -I tools/verify_codebook.py <dir with kjv/ and bsb/>` rebuilds the codebook from the Law and compares it.
- Open `tests/law.html` in a browser to run the Law tests (77 checks, including every resolution rule on Genesis 1 as heard).
- `python3 -I tools/run_canon.py` runs `tests/canon.html`: the whole Bible, every chapter cold and as one walk (25 checks).
- Open `tests/mix.html` to measure the balance of the four sections.
- `python3 tools/smoke.py <url> <seconds> <shot.png> [js expression] [tap|notap]` drives headless Chrome at phone size.
