# How the two voices fit together (Oct 18 2026)
The full sourced research, with every price and its URL, is in the PR description, and in `/workspace/sonolumina-voice-research.md` on the box. All prices were checked on 2026-10-18.

**Route 1, Talk (this branch):** Gemini Live, called from the phone with Seabass's own key (localStorage only, no server).
- Free tier: **$0**. Google may use the conversations to improve its products.
- Paid: $0.005/min audio in + $0.018/min audio out (ai.google.dev/gemini-api/docs/pricing). A typical call is about **$0.014/min**, at most about $0.023/min.
- The companion is given the chapter's BSB text and told to quote it word for word.

**Route 2, Reading (the ElevenLabs branch):** an LLM adds emotion tags to each verse, ElevenLabs renders it, and the audio is cached so each verse is paid for once.
- The LLM markup pass uses Gemini 3.8 Flash. It may only insert whitelisted tags; strip the tags and the text must equal the BSB exactly, or the markup is rejected. Cost: $0 on the free tier, or about $3–6 for the whole Bible on paid.
- Rendering uses **Eleven v4**. It costs the same $0.08/1K chars as v3, ElevenLabs recommends it, and it isn't labelled beta in the docs (check the in-app model picker). That is about $0.012 per verse, $0.31 per chapter, and $345–360 for the whole Bible, paid once.
- The Creator plan ends 25 Oct 2026. Its remaining credits (~770 verses) are best spent on key chapters, because paid-plan audio is commercially usable for good.
- On the Free plan (10k chars/month, about 3 chapters), audio is non-commercial forever and must credit elevenlabs.io. Use it for previews only.

**The two routes share one Gemini key:** the same free key powers Talk and the markup pass.

**Free on-phone fallback:**
- Reading: Gemini 3.8 Flash TTS on the free tier (~$0.0021 per verse if paid) for a natural voice, then Kokoro-82M (kokoro-js, ~86–92 MB one-time download, offline, no emotion), then the phone's own speechSynthesis (what `form/narrator.js` uses today).
- Talk: when there is no key, the demo shows the panel. A no-key voice chat is not possible without an LLM.

Avoid Hume, which shuts down on 13 Nov 2026. OpenAI Realtime and xAI voice both need a server to be used safely.
