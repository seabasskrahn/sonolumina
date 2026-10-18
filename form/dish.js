// The Form: the dish. Light drawn only from what is sounding.
// Each frame: the tones sounding now set the ring pattern (law/home.js),
// and the measured loudness sets the brightness. Light follows sound.

import { dishProfile, chladniMode, chladni } from '../law/home.js';

const STEPS = 256;

export function createDish(canvas, engine, colour = () => [255, 235, 190]) {
  let rgb = colour();
  const g = canvas.getContext('2d');
  let level = 0, key = '', profile = new Float32Array(STEPS);
  const W = canvas.width, H = canvas.height, R = Math.min(W, H) / 2;
  // Distance from centre for each pixel, computed once.
  const rIdx = new Int16Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const r = Math.hypot(x - W / 2 + 0.5, y - H / 2 + 0.5) / R;
    rIdx[y * W + x] = r > 1 ? -1 : Math.round(r * (STEPS - 1));
  }
  const img = g.createImageData(W, H);
  // Chladni sand: bright where the plate is still (near the zero lines).
  let modeKey = '', sand = new Float32Array(W * H), old = new Float32Array(W * H), sandLevel = 0, mix = 1;
  function makeSand([n, m]) {
    [old, sand] = [sand, old];
    // Blend from whatever was showing, so figures crossfade instead of jumping.
    // After the swap, old holds the figure that was fading in, sand the one fading out.
    for (let i = 0; i < old.length; i++) old[i] = old[i] * mix + sand[i] * (1 - mix);
    mix = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const z = Math.abs(chladni(n, m, x / (W - 1), y / (H - 1)));
      sand[y * W + x] = Math.max(0, 1 - z / 0.12);
    }
  }

  function frame() {
    const tones = engine.now();
    const k = tones.map(t => `${t.ratio.toFixed(4)}:${t.amp.toFixed(3)}`).sort().join(',');
    if (k !== key) { key = k; profile = dishProfile(tones, STEPS); }
    const mel = tones.filter(t => t.tag === 'melody').sort((a, b) => b.start - a.start)[0];
    if (mel) {
      const nm = chladniMode(mel.ratio), mk = nm.join(',');
      if (mk !== modeKey) { modeKey = mk; makeSand(nm); }
    }
    sandLevel += ((mel ? 1 : 0) - sandLevel) * 0.03;
    mix = Math.min(1, mix + 0.04);   // about 0.4 s crossfade
    // Gentle smoothing so brightness never flickers (no flashing).
    level += (engine.level() - level) * 0.08;
    // Colour glides toward its target so seasons change gently.
    const want = colour();
    rgb = rgb.map((c, i) => c + (want[i] - c) * 0.02);
    const [cr, cg, cb] = rgb;
    // Perceived brightness: the square root of loudness, so the light stays
    // visible while the music dips under the voice.
    const lv = Math.sqrt(level);
    const d = img.data;
    for (let i = 0, p = 0; i < rIdx.length; i++, p += 4) {
      const ri = rIdx[i];
      const v = ri < 0 ? 0 : (profile[ri] * 0.75 + (sand[i] * mix + old[i] * (1 - mix)) * sandLevel * 0.6) * lv;
      d[p] = cr * Math.min(1, v * 1.6);
      d[p + 1] = cg * Math.min(1, v * 1.5);
      d[p + 2] = cb * Math.min(1, v * 1.3);
      d[p + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { get level() { return level; } };
}
