# Sonolumina

Scripture heard and seen: the Word taking form in sound and light.
Governed by [SPIRIT.md](SPIRIT.md) (Spirit > Law > Form).

- `law/`: the Law. Pure data and math, with no sound and no screen.
- `form/`: the Form. Sound, light and what you touch.
- `data/`: Scripture and reference data, never typed by hand.

Built in the order of the creation days:
1. Light: the home note, and light drawn from what sounds. **(done)**
2. Separation: the Law apart from the Form, and proven on its own. **(done)**
3. Seed bearing fruit: each word's tone from the codebook. **(done)**
4. Lights for seasons: time at three scales, feeling setting mode, tempo and colour. **(done)**
5. Living things: the Score's voices and harmony, and the Chladni figures. **(done)**
6. Man: the reading voice, Begin/Pause/Resume, Voice on/off, screen kept awake. **(done)**
7. Rest: resolution. Everything comes home to 110 Hz.

## Sources and credits
- Text: Berean Standard Bible (BSB), public domain.
- Word codebook: built from the KJV and BSB text alone (first appearance, counts, companions). Rebuilt and matched entry for entry by `tools/verify_codebook.py`.
- Verse feeling: NRC Valence, Arousal, and Dominance Lexicon (Saif M. Mohammad, National Research Council Canada, 2018). It is a modern English word list, not from Scripture. Research/non-commercial use with credit; only per-verse scores (built by logos-theta `tools/build_vad.py`) are shipped, never the lexicon.
- Modes in just intonation; feeling → mode is a Western musical convention.
- Home note 110 Hz: a human tuning choice, not from Scripture.
- Overtones: the harmonic series (physics).
- Dish ripple: Bessel J0 (Abramowitz & Stegun 9.4.1, 9.4.3); cymatics after Ernst Chladni (1787).

No frequency is named in Scripture. Sonolumina makes no medical or spiritual claims for any sound.

## Checks
- `python3 -I tools/verify_codebook.py <dir with kjv/ and bsb/>` rebuilds the codebook from the Law and compares it.
- Open `tests/law.html` in a browser to run the Law tests.
- `python3 tools/smoke.py <url> <seconds> <shot.png> [js expression] [tap|notap]` drives headless Chrome at phone size.
