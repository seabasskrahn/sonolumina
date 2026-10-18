// The Form, Day 1: Light.
// "And God said, 'Let there be light,' and there was light." (Genesis 1:3, BSB)
// The home note sounds; the light on screen is drawn only from what is
// actually sounding, measured live from the audio. Light follows sound.

import { F0, HARMONICS, dishProfile } from '../law/home.js';

const RISE = 3;      // seconds for the tone to swell
const HOLD = 7;      // seconds it sustains
const FALL = 4;      // seconds it settles back to silence

export function createLight(canvas) {
  const ctx2d = canvas.getContext('2d');
  const profile = dishProfile(HARMONICS, 256);
  let audio = null, analyser = null, fine = null, buf = null, level = 0, playing = false;

  function sound() {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    if (!analyser) {
      analyser = audio.createAnalyser();
      analyser.fftSize = 1024;
      buf = new Float32Array(analyser.fftSize);
      analyser.connect(audio.destination);
      // A second, fine-grained analyser (about 1.5 Hz per bin) for pitch checks.
      fine = audio.createAnalyser();
      fine.fftSize = 32768;
      analyser.connect(fine);
    }
    const t = audio.currentTime + 0.05;
    const master = audio.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.5, t + RISE);
    master.gain.setValueAtTime(0.5, t + RISE + HOLD);
    master.gain.exponentialRampToValueAtTime(0.0001, t + RISE + HOLD + FALL);
    master.connect(analyser);
    const total = HARMONICS.reduce((s, h) => s + h.amp, 0);
    for (const h of HARMONICS) {
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.frequency.value = F0 * h.ratio;
      g.gain.value = h.amp / total;
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + RISE + HOLD + FALL + 0.1);
    }
    playing = true;
    return (RISE + HOLD + FALL) * 1000;
  }

  // Loudness (RMS) of what is really coming out, 0..1.
  function measure() {
    if (!analyser) return 0;
    analyser.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.min(1, Math.sqrt(s / buf.length) * 4);
  }

  function frame() {
    const W = canvas.width, H = canvas.height;
    // Gentle smoothing so brightness never flickers (no flashing).
    level += (measure() - level) * 0.08;
    const img = ctx2d.createImageData(W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const r = Math.hypot(x - cx, y - cy) / R;
        const i = (y * W + x) * 4;
        if (r > 1) { img.data[i + 3] = 255; continue; }
        const v = profile[Math.round(r * 255)] * level;
        // Warm white light: the dish glows where it vibrates.
        img.data[i] = 255 * Math.min(1, v * 1.6);
        img.data[i + 1] = 235 * Math.min(1, v * 1.5);
        img.data[i + 2] = 190 * Math.min(1, v * 1.3);
        img.data[i + 3] = 255;
      }
    }
    ctx2d.putImageData(img, 0, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Strongest frequency actually sounding, in Hz (for honest checks).
  function peakHz() {
    if (!fine) return 0;
    const bins = new Float32Array(fine.frequencyBinCount);
    fine.getFloatFrequencyData(bins);
    let best = 1;
    for (let i = 2; i < bins.length - 1; i++) if (bins[i] > bins[best]) best = i;
    // Parabolic interpolation between neighbouring bins.
    const [a, b, c] = [bins[best - 1], bins[best], bins[best + 1]];
    const shift = 0.5 * (a - c) / (a - 2 * b + c || 1);
    return (best + shift) * audio.sampleRate / fine.fftSize;
  }

  return {
    sound,
    peakHz,
    get level() { return level; },
    get playing() { return playing; },
  };
}
