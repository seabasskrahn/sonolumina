// The Form: the dish. Light drawn only from what is sounding.
// Each frame: the tones sounding now set the ring pattern (law/home.js),
// and the measured loudness sets the brightness. Light follows sound.

import { dishProfile } from '../law/home.js';

const STEPS = 256;

export function createDish(canvas, engine, colour = () => [255, 235, 190]) {
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

  function frame() {
    const tones = engine.now();
    const k = tones.map(t => `${t.ratio.toFixed(4)}:${t.amp.toFixed(3)}`).sort().join(',');
    if (k !== key) { key = k; profile = dishProfile(tones, STEPS); }
    // Gentle smoothing so brightness never flickers (no flashing).
    level += (engine.level() - level) * 0.08;
    const [cr, cg, cb] = colour();
    const d = img.data;
    for (let i = 0, p = 0; i < rIdx.length; i++, p += 4) {
      const ri = rIdx[i];
      const v = ri < 0 ? 0 : profile[ri] * level;
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
