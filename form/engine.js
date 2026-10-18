// The Form: one sound engine for everything that is heard.
// All tones pass through one output, which is measured live so that the
// light can follow what is actually sounding.

export function createEngine(given = null) {
  let ctx = given, out = null, analyser = null, fine = null, buf = null;
  const sounding = new Set();   // tones playing now: { ratio, amp, end }

  function start() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if (!out) {
      out = ctx.createGain();
      out.gain.value = 0.8;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.ratio.value = 12;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      buf = new Float32Array(analyser.fftSize);
      // A second, fine-grained analyser (about 1.5 Hz per bin) for pitch checks.
      fine = ctx.createAnalyser();
      fine.fftSize = 32768;
      out.connect(limiter).connect(analyser).connect(ctx.destination);
      analyser.connect(fine);
    }
    return ctx;
  }

  // One soft sine tone with its envelope. Times are AudioContext seconds.
  // ratio is relative to the home note; it is tracked so the dish can draw it.
  function tone({ freq, ratio, at, dur, gain = 0.2, attack = 0.04, release = 0.25, dest = out }) {
    const t = Math.max(at, ctx.currentTime);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    const item = { ratio, amp: gain, start: t, end: t + dur, freq };
    sounding.add(item);
    osc.onended = () => sounding.delete(item);
    return item;
  }

  // Record a tone made elsewhere (by an instrument) so the dish can draw it.
  function track(freq, amp, start, end, tag = '', home = 110) {
    const item = { ratio: freq / home, amp, start, end, freq, tag };
    sounding.add(item);
    setTimeout(() => sounding.delete(item), (end - ctx.currentTime) * 1000 + 200);
    return item;
  }

  // Tones sounding at this instant (for the dish).
  function now() {
    if (!ctx) return [];
    const t = ctx.currentTime;
    return [...sounding].filter(s => s.start <= t && s.end > t);
  }

  // Loudness (RMS) of what is really coming out, 0..1.
  function level() {
    if (!analyser) return 0;
    analyser.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.min(1, Math.sqrt(s / buf.length) * 4);
  }

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
    return (best + shift) * ctx.sampleRate / fine.fftSize;
  }

  return {
    start, tone, track, now, level, peakHz,
    get ctx() { return ctx; },
    get out() { return out; },
    get time() { return ctx ? ctx.currentTime : 0; },
  };
}
