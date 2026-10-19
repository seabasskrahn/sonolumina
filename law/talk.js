// The Law for Talk: what the voice companion is told, and the sound it is sent and sent back.
// Pure functions only, with no sound and no screen. The chat is an AI, not Scripture, and it says so.

export const TALK_SOURCE = 'Talk: an AI voice (Google Gemini Live), not Scripture; Scripture quoted from the BSB shown here';

// The words of the current chapter, numbered, so every quote can be checked against the text itself.
export function chapterContext(name, chapter, verses, verse) {
  const lines = verses.map((t, i) => (t && t.trim() ? `${chapter}:${i + 1} ${t.trim()}` : `${chapter}:${i + 1} (omitted in the BSB: not in the oldest manuscripts)`));
  const at = verse ? `The reader is at ${name} ${chapter}:${verse}: "${(verses[verse - 1] || '').trim()}"` : `The reader is in ${name} ${chapter}.`;
  return `${at}\n\nThe full text of ${name} ${chapter} (Berean Standard Bible, BSB):\n${lines.join('\n')}`;
}

// The system instruction: truthful, reverent, Scripture quoted exactly.
export function systemPrompt(ctx) {
  return [
    'You are a quiet, reverent voice companion inside Sonolumina, an app where the Bible is heard and seen.',
    'You speak with the reader aloud, like a thoughtful friend on a phone call: warm, unhurried, brief (usually two to four sentences), and you let them lead.',
    'Truth first:',
    '- Never invent Scripture. When you quote the chapter below, quote it word for word from the text given, and say the reference (book chapter:verse).',
    '- When you quote any other verse, quote the Berean Standard Bible only if you are certain of the exact words; otherwise paraphrase and say plainly that you are paraphrasing, with the reference.',
    '- If you do not know, or the text does not say, say so. Do not guess at references, dates, names or numbers.',
    '- Keep what Scripture says apart from interpretation. Name interpretations as interpretations, and where faithful Christians differ, say so fairly without taking sides.',
    '- You are an AI, not a pastor, prophet or the voice of God. Never claim revelation, and never claim to speak for God beyond what Scripture says.',
    '- Make no medical or spiritual claims for any sound or frequency.',
    'Reverence: treat the text and the reader with respect. No jokes at the expense of Scripture. If the reader is in distress, be gentle, and point them to real people who can help, and to emergency services if they may be in danger.',
    'Speak in plain spoken sentences: no lists, no markdown, no reading out of symbols.',
    '',
    ctx,
  ].join('\n');
}

// The first message on the socket (Gemini Live BidiGenerateContentSetup, raw WebSocket form).
// responseModalities sits inside generationConfig: Google's server rejected it at the top of setup
// ("Unknown name responseModalities at 'setup'", seen 2026-10-18), whatever the guide shows.
export function setupMessage(model, ctx) {
  return {
    setup: {
      model: `models/${model}`,
      generationConfig: { responseModalities: ['AUDIO'] },
      systemInstruction: { parts: [{ text: systemPrompt(ctx) }] },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  };
}

// Microphone samples (float, any rate) → 16 kHz 16-bit little-endian PCM, as the Live API asks.
export function downsample(input, fromRate, toRate = 16000) {
  if (fromRate === toRate) return Float32Array.from(input);
  const ratio = fromRate / toRate, n = Math.floor(input.length / ratio), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * ratio), b = Math.min(input.length, Math.floor((i + 1) * ratio));
    let s = 0; for (let j = a; j < b; j++) s += input[j];
    out[i] = b > a ? s / (b - a) : input[a] || 0;
  }
  return out;
}
export function floatToPcm16(f) {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) { const x = Math.max(-1, Math.min(1, f[i])); out[i] = x < 0 ? x * 0x8000 : x * 0x7fff; }
  return out;
}
export function pcm16ToFloat(i16) {
  const out = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] / 0x8000;
  return out;
}
export function bytesToBase64(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function base64ToBytes(b64) {
  const s = atob(b64), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
// The rate of returned audio, read from its mime type ("audio/pcm;rate=24000"); 24 kHz if unnamed.
export function rateOf(mime) { const m = /rate=(\d+)/.exec(mime || ''); return m ? +m[1] : 24000; }
