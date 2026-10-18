// The Form: the instruments of the Score. Plain Web Audio synthesis, no samples.
// Each voice plays what the Law decided (law/chapter.js) and reports its tone
// to the engine so the light can follow it.

export function createVoices(engine) {
  const ctx = engine.ctx;
  // One bus per section, through a master low-pass whose brightness follows dominance.
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 1500;
  const music = ctx.createGain();   // music level follows arousal
  tone.connect(music).connect(engine.out);
  const bus = {};
  // Section levels, set from measurement (tests/mix.html) so every section
  // sits near −33 dBFS RMS, like instruments in a balanced mix.
  const LEVEL = { bass: 0.305, pad: 0.406, counter: 1.12, melody: 1.245 };
  for (const [name, level] of Object.entries(LEVEL)) {
    bus[name] = ctx.createGain();
    bus[name].gain.value = level;
    bus[name].connect(tone);
  }
  const done = (nodes, last) => { last.onended = () => nodes.forEach(n => n.disconnect()); };

  // Cello: a sawtooth through a moving low-pass, on the chord root.
  function cello(f, t, d, v) {
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), a = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f;
    lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(260, t);
    lp.frequency.linearRampToValueAtTime(620, t + 0.25);
    lp.frequency.exponentialRampToValueAtTime(380, t + d);
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(v, t + 0.14);
    a.gain.setValueAtTime(v, t + d);
    a.gain.linearRampToValueAtTime(0, t + d + 0.6);
    o.connect(lp).connect(a).connect(bus.bass);
    o.start(t); o.stop(t + d + 0.7);
    done([o, lp, a], o);
    engine.track(f, v, t, t + d);
  }

  // Strings: two detuned saws per chord tone, slow attack, vibrato that grows in.
  function strings(fs, t, d, v) {
    const lp = ctx.createBiquadFilter(), a = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.3;
    vib.frequency.value = 5.2;
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(4, t + 1.5);
    vib.connect(vg);
    const hold = Math.max(1.2, d);
    const os = [];
    for (const f of fs) for (const cents of [-8, 8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents;
      vg.connect(o.detune); o.connect(lp); os.push(o);
      engine.track(f, v / 2, t, t + hold);
    }
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(v, t + 1.2);
    a.gain.setValueAtTime(v, t + hold);
    a.gain.linearRampToValueAtTime(0, t + hold + 1.6);
    lp.connect(a).connect(bus.pad);
    for (const o of [...os, vib]) { o.start(t); o.stop(t + hold + 1.7); }
    done([...os, vib, vg, lp, a], vib);
  }

  // Electric piano: two-operator FM with a short bright tine, for the broken chords.
  function epiano(f, t, d, v) {
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain();
    const tn = ctx.createOscillator(), tg = ctx.createGain(), a = ctx.createGain();
    c.frequency.value = f; m.frequency.value = f; tn.frequency.value = f * 14;
    mg.gain.setValueAtTime(f * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.25, t + 0.45);
    tg.gain.setValueAtTime(f * 0.8, t);
    tg.gain.exponentialRampToValueAtTime(1, t + 0.06);
    m.connect(mg).connect(c.frequency);
    tn.connect(tg).connect(c.frequency);
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(v, t + 0.006);
    a.gain.exponentialRampToValueAtTime(v * 0.3, t + 0.5);
    a.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.3);
    c.connect(a).connect(bus.counter);
    for (const o of [c, m, tn]) { o.start(t); o.stop(t + d + 1.4); }
    done([c, m, tn, mg, tg, a], c);
    engine.track(f, v, t, t + d);
  }

  // Celesta: a bell of three sine partials (1×, 2×, 4×), for the melody words.
  function celesta(f, t, v) {
    const parts = [[1, 1, 1.8], [4, 0.22, 0.35], [2, 0.12, 0.8]];
    for (const [r, l, decay] of parts) {
      const o = ctx.createOscillator(), a = ctx.createGain();
      o.frequency.value = f * r;
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(v * l, t + 0.004);
      a.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(a).connect(bus.melody);
      o.start(t); o.stop(t + decay + 0.05);
      done([o, a], o);
    }
    engine.track(f, v, t, t + 0.9, 'melody');
  }

  function brightness(hz, t) { tone.frequency.setTargetAtTime(Math.min(2400, hz), t, 1.5); }
  function loudness(x, t) { music.gain.setTargetAtTime(x, t, 1.2); }

  return { cello, strings, epiano, celesta, brightness, loudness, bus };
}
