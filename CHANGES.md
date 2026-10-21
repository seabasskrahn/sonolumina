# Build 2026102002: Back during playback

Kept as built: everything in 2026102001.

## Build 2026102101
- Reduced motion: when the phone asks for less motion (prefers-reduced-motion), all animations and transitions site-wide finish instantly (flash, verse fade, toast, progress, chips, switches, Talk dish). The static current-word glow stays; it marks the word and isn't motion.
- Following the reading scrolls with a jump instead of a glide under reduced motion.

## Build 2026102003
- APK download: not shown on this site (this repo had no APK link; nothing removed).
- Copy (Writing Bot items 2–7): dropped "(localStorage)" from the Talk key note; billing line now "If the project has no billing account, Google can’t charge it."; one empty-key message, "Paste your ElevenLabs API key first."; Begin hint "Press Begin. The verse that’s playing is explained here."; speed cap toast "Capped at 2×. Raise the maximum under the dial or in Settings."; one label "Set max to current speed".
- Settings › This phone: a Privacy note saying the optional ElevenLabs reader and Talk send text or audio to those services, only when used.

## New
Settings → Playback → "Back to an earlier chapter".
- **Keep playing** (the default, and how Back already worked): while the reading is playing, Back to a different chapter keeps going, from verse 1 of the chapter it returns to.
- **Stop audio**: that same Back ends the reading and shows the chapter. Begin starts it again.

A Back that stays on the same chapter (only the screen changes) does not stop the reading, in either choice. A phone that never saved this setting keeps playing.

# Build 2026102001: the World, and the strip ranked

Kept as built: everything in 2026101819.

## New
1. The World (☰ menu → World, or "See the whole Word as a world ›" under the strip). Every chapter, Genesis to
   Revelation, is a light standing in 3D. Its height is the number of verses, its colour is the strip's, bright dots
   mark where each book begins, and faint white lights past Revelation are the approved history entries. Two
   shapes: Spiral (Genesis at the centre) and Road (walk through the chapters). While the music plays, the chapter
   that is sounding rises with its verses. Drag to turn, pinch to come closer, tap a light to name it, and Open goes
   there. Drawn on plain canvas (form/world.js), with no library and no install. It runs only while the screen is
   open.
2. The seasons strip is ranked (variant B): each chapter is coloured by where its mean feeling falls among all 1,189,
   so the whole range from blue to gold shows. The light itself is unchanged.

## Proposed, not built
- History thread 3, "To proclaim liberty to the captives" (history/proposed/), is waiting for Seabass.

# Build 2026101818: audit fixes and the ☰ menu

Kept as built: Claude's Law and harmonics, the Begin / Voice on buttons, Talk, the tab bar, every feature of 2026101817.
The voice stays locked to the music from 0.5× to 3× (form/narrator.js and form/player.js are unchanged).

## Fixed (from a hands-on audit at phone size)
1. Genesis 1 opened showing 1:2 ("darkness over the deep") while the player bar said 1:1, so the screen and Begin
   disagreed. Listen now previews the verse Begin will start from (resumed or link verse, else verse 1); the bar,
   the verse and playback use one start verse.
2. Back: every screen (tab) and every chapter you choose is one history step; a sheet, the picker or the menu is one
   more on top. Back closes what is open first, then steps back through screens and chapters, and on the first screen
   stays in the app. The screen and the player always match the address (popstate restores the step's tab and
   chapter; a chapter that was playing goes on playing the one Back returned to). Chapters that play on by themselves
   replace the address instead of adding steps. Closing a sheet from its own ✕ no longer races a following step.
3. At 390–400 px Begin, Voice on and Talk were half under the player bar: the page now keeps room for the bar's real
   height, and on short phones the light is drawn smaller so the three buttons are in view on first load.
4. Speed − at 0.5× jumped to 1× (the dial started at 1×): the dial now runs from 0.5× and holds there.
5. The speed maximum is enforced everywhere (chips, dial, speed read); chips above it are struck through and the
   maximum is shown. A typed maximum outside 1–20× (e.g. −5) is refused with a message instead of silently becoming 1.
6. ElevenLabs: Forget key is shown (disabled) when no key is saved; saving an empty field says so.
7. Quick repeated verse taps each count; the sleep sheet closes after choosing; toasts sit above the player bar (at the
   top while a sheet is open, clear of the pitch slider); the book picker opens a book's chapters right under its row,
   scrolled into view; Repeat has aria-label and aria-pressed, sliders have labels; Origins strips curly quotes
   ("garden’" → garden). Gemini Live default re-checked against ai.google.dev/gemini-api/docs/models on 2026-10-19:
   gemini-3.8-live is listed as the default Live model, so it is unchanged.

## Added
- ☰ menu at the top left listing every screen and mode: Listen, Read, Recall, Notes, Search, Origins, Agent, Talk,
  Speed, Voice, Sleep timer, Up next, Speed read, Settings. The tab bar stays; Back closes the menu.
- tools/regress.py: phone-size (390×844, touch) regression checks for the above.

# Build 2026101817: the new player UI on Claude's Sonolumina, merged with Talk

Kept as built: Claude's Law (law/, untouched), the harmonics light (dish, default "full"), the
Begin / Voice on buttons (Talk now sits beside them, from main a36260e), the seasons strip, linked-verse
swells, the Amen close and After the Word.

## Added (provenance)
| Piece | From | What is in this repo |
|---|---|---|
| Playback speed 0.5–3× chips, "Playback speed" sheet, Speed button on the player bar | old Super Grok app (Logos Theta, logos-theta-site index.html l.719, 723, 757–764) | form/player.js speed clock (Form-level multiplier: music, words, voice on one clock; Law unchanged), index.html sheet |
| Rotary speed dial, 0.25 steps, settable max (saved) | old app (l.717–718, 800–817) | page/dial.js |
| Speed read (RSVP) | old app | index.html #rsvp |
| Verse controls: repeat, verse step, chapter step, sleep timer, Up next, auto play, highlights and notes, resume to the verse | old app (YouVersion-style) | index.html, page/store.js |
| Study tabs: Read (BSB + KJV + Hebrew/Greek), Recall, Notes, Search, Origins | old app | page/study.js; Hebrew Joshua–Malachi from OSHB WLC (CC BY 4.0) via tools/build_hebrew.py |
| Settings page (persisted) | old app | index.html #settings |
| Phone voice picker: English first, most natural first (Apple Premium/Enhanced, Siri, Microsoft Natural/Online, Google, Neural), pitch, Test, top rate | new (old app had a plain picker) | form/narrator.js |
| ElevenLabs reader (optional, the reader's own key) | new | form/eleven.js |
| Expressive reading (ElevenLabs v3 tags, off by default) | the Scribe's markup | data/expression/Genesis.1–3.json (verbatim), hashes in data/expression-meta/index.json |
| Agent card (link to Paperclip on the tailnet, no embed, no API calls) | new | Agent tab |
| Talk panel | main (a36260e) | unchanged; the new player bar, Read tab and verse sheet also wait while a call is live |

## Voice and speed (Seabass, 2026-10-18)
- From 0.5× to 3× the voice speeds up with the music and never goes silent; voice, highlight and
  harmonics stay on the same verse (a new verse always starts on time). Above 3× (dial only) the voice rests.
- Phone voice: rate = music pace × speed, held at the "Phone voice top rate" (default 1.4×, choices 2×, 3×).
  Past it the voice keeps in step by starting each verse on time (ends of long verses are cut); the
  player bar shows "in step" and the speed sheet says so. Phone speech cannot be recorded in a browser,
  so it cannot be pre-rendered.
- ElevenLabs/cached audio: one audio element, preservesPitch on, playbackRate = speed × fit to the verse length.

## ElevenLabs setup (for Seabass)
1. ElevenLabs account → Profile → API keys → create a key (text-to-speech and voices read access).
2. In the app: Settings → Voice (or the Voice button on the player bar) → ElevenLabs → paste the key → Save.
   The key is kept only in this phone's localStorage (sonolumina.elevenlabs.key); it is never in the repo,
   the build or the site. Reading uses your credits; each verse is cached in IndexedDB after its first reading.
3. Choose a voice (▶ Preview plays ElevenLabs' free sample), a model (default eleven_multilingual_v2),
   and the stability / similarity / style sliders. Expressive reading (v3) is optional and off by default.
4. On any error, quota or offline, the phone voice takes over with a notice and ElevenLabs is retried after 5 minutes.
- CORS: api.elevenlabs.io answers browser calls (access-control-allow-origin *); no proxy.

## Rules kept
- Tags are stripped before the display, word tones, feeling, Speed read and visuals; tagged text goes only to eleven_v3,
  and only when the verse's plain-text hash matches. Never to the phone voice.
- All rendered API text is escaped; no third-party scripts. tools/check_build.sh checks build numbers, key-like strings, scripts, JSON.

## Tests (2026-10-18/19, headless Chrome, 390x844 touch)
PASS: law.html 77/77 · canon.html 25/25 (1,189 chapters) · talk.html 24/24 · talk_e2e.py 19/19 · mix spread 0.1 dB
(and the old OfflineAudioContext exception is gone) · all 1,189 chapters load with 0 console errors (before the Talk merge)
· smokes Genesis.4, Psalms 117–119, Revelation 22 → After the Word, mid-chapter speed changes, 0 errors · settings,
voice and pitch persist across reload · back button closes a menu, then steps back, never leaves · 3× autoplay 320 s:
heap 4.7 → 9.7 MB, flattening (not a proof of no growth) · voice speaks one utterance per verse, on its verse, at
0.5, 1, 1.5, 2, 2.5, 3× · ElevenLabs with a mocked API: voices, models, per-verse stream, cache (repeat = no new
call), fallback on 429 and offline with notice, v3 only for checked markup, key never in settings.
UNVERIFIED: a live ElevenLabs call (no key on the box) · real phones: how fast each phone voice really goes,
iOS first-tap audio unlock, audio playbackRate above 2× on iOS Safari, long-run memory on a phone.
Mason's PR #1 validator: words all match, but its draft tag allowlist lacks [warmly] [ominous] [slyly] [hushed]
[fearful] [stern], which the Scribe's guide uses (PR #1 not touched).
