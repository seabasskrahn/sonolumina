// Preview build: what this phone remembers (localStorage only; nothing leaves the phone).
// Settings, highlights and notes, and the Recall deck each live under their own key.

const KEYS = { settings: 'sonolumina.settings', marks: 'sonolumina.marks', recall: 'sonolumina.recall' };
export const SPEEDS = ['0.5', '0.75', '1', '1.25', '1.5', '2', '2.5', '3'];   // the Logos Theta speed menu
export const DEFAULTS = {
  speed: 1, dialMax: 10, deviceTop: 1.4, autoplay: true, repeat: 'off', resume: true,
  // What Back does to an earlier chapter while the reading is playing.
  // 'play' (default): keep playing from verse 1. 'stop': end the reading.
  backMid: 'play',
  voiceOn: true, voiceName: '', pitch: 1,
  voiceEngine: 'device', elVoice: '', elVoiceName: '', elModel: 'eleven_multilingual_v2', elStability: 0.5, elSimilarity: 0.75, elStyle: 0.2, elExpressive: false,
  rsvpChunk: 1, showKJV: true, showOrig: false, dish: 'full', textSize: 1,
  queue: [], tab: 'listen',
};
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export function loadSettings() {
  const S = { ...DEFAULTS, ...read(KEYS.settings, {}) };
  S.speed = +S.speed > 0 ? +S.speed : 1;
  S.dialMax = Math.max(1, +S.dialMax || 10);
  if (S.backMid !== 'play' && S.backMid !== 'stop') S.backMid = 'play';
  if (!Array.isArray(S.queue)) S.queue = [];
  return S;
}
export const saveSettings = S => write(KEYS.settings, S);
export const resetSettings = () => { try { localStorage.removeItem(KEYS.settings); } catch {} };

// Highlights and notes: { "book.chapter.verse": { hl: 'gold'|'rose'|'sky'|'sage'|'', note: '', t } } (book = index into canon).
export const marks = read(KEYS.marks, {});
export function mark(key, patch) {
  const m = { hl: '', note: '', ...(marks[key] || {}), ...patch, t: Date.now() };
  if (!m.hl && !m.note) delete marks[key]; else marks[key] = m;
  write(KEYS.marks, marks);
}

// Recall: spaced review, a light SM-2. { key: { due (ms), iv (days), ease, reps, added } }.
export const recall = read(KEYS.recall, {});
const DAY = 864e5;
export function addRecall(key) { if (!recall[key]) recall[key] = { due: Date.now(), iv: 0, ease: 2.5, reps: 0, added: Date.now() }; write(KEYS.recall, recall); }
export function dropRecall(key) { delete recall[key]; write(KEYS.recall, recall); }
export function grade(key, g) {   // g: 0 again, 1 hard, 2 good, 3 easy
  const r = recall[key]; if (!r) return;
  if (g === 0) { r.iv = 0; r.ease = Math.max(1.3, r.ease - 0.2); r.due = Date.now() + 10 * 60e3; r.reps = 0; }
  else {
    r.iv = g === 1 ? Math.max(1, r.iv * 1.2) : g === 2 ? (r.reps ? Math.max(1, r.iv) * r.ease : 1) : Math.max(1, r.iv || 1) * r.ease * 1.3;
    r.ease = Math.max(1.3, r.ease + (g === 1 ? -0.15 : g === 3 ? 0.15 : 0));
    r.reps++; r.due = Date.now() + r.iv * DAY;
  }
  write(KEYS.recall, recall);
}
export const exportAll = () => JSON.stringify({ app: 'Sonolumina preview', at: new Date().toISOString(), marks, recall }, null, 1);
