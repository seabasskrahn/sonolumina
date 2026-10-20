// The Form, the World view: the whole Word as lights in a 3D space you can turn and walk through (Seabass asked for
// "a 3d environment build on the word"; concept/world.html was the mockup). Plain canvas, no library.
// Every light is one chapter in canon order: its height is the chapter's verse count, its colour is the seasons
// strip's (the rank of its mean feeling, the light's own hue rule). Faint white lights beyond Revelation are the
// approved history entries. Shapes: 'A' a spiral out from Genesis, 'B' a road walked from Genesis to Revelation.
// Only the shapes and the camera are design choices; every number drawn comes from the app's data.

export function createWorld(canvas, { counts, rank, hue, starts, after, onPick }) {
  const N = counts.length, g = canvas.getContext('2d');
  const bookStart = new Set(starts);
  let shape = 'A', W = 1, Ht = 1, on = false, raf = 0, last = 0;
  let cur = 0, verse = 1, sel = -1;
  const cam = { yaw: 0.6, pitch: 0.55, dist: 15, z: 0 }, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const col = (V, l = 0) => `hsl(${hue(V)},60%,${45 + 25 * V + l}%)`;
  const H = c => 0.15 + 2.2 * c / 176;   // Psalm 119, the longest chapter (176 verses), is the tallest light

  function place(i) {
    const t = i < N ? i : N + 6 + (i - N) * 4;
    if (shape === 'A') {
      const r = 0.6 + 9 * Math.sqrt(t / (N - 1)), a = t * 0.0185 * Math.PI * 2 / Math.sqrt(1 + t / 60);
      return [r * Math.cos(a), r * Math.sin(a)];
    }
    return [(t % 2 ? 1 : -1) * 1.4, t * 0.12];
  }
  // Shape B's camera walks with the chapter that is playing (or where the listener has walked to).
  let walk = 0;
  function view() {
    if (shape === 'A') return { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, at: [0, 0.6, 0], base: 0.55 };
    return { yaw: cam.yaw * 0.3, pitch: 0.12 + cam.pitch * 0.2, dist: 0, at: [0, 0.9, walk - 1.5], base: 0.62 };
  }
  function proj(x, y, z, v) {
    x -= v.at[0]; y -= v.at[1]; z -= v.at[2];
    const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + v.dist;
    if (z2 < 0.05) return null;
    const f = Math.min(W, Ht) * 0.9 / z2;
    return [W / 2 + x1 * f, Ht * v.base - y1 * f, f];
  }

  let pts = [];
  function draw() {
    const v = view(), dpr = devicePixelRatio || 1;
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, W, Ht);
    g.globalCompositeOperation = 'lighter';
    pts = [];
    for (let i = 0; i < N; i++) {
      const [x, z] = place(i);
      // The chapter that is playing rises with its verses: its light grows to full height as the last verse sounds.
      const full = H(counts[i]), h = i === cur ? full * (0.35 + 0.65 * verse) * 1.25 : full;
      const a = proj(x, 0, z, v), b = proj(x, h, z, v);
      if (!a || !b) continue;
      const w = Math.max(1, a[2] * 0.035);
      g.strokeStyle = col(rank[i]); g.globalAlpha = 0.75; g.lineWidth = w;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.globalAlpha = 1; g.fillStyle = col(rank[i], 15);
      g.beginPath(); g.arc(b[0], b[1], w * 1.3, 0, 7); g.fill();
      if (bookStart.has(i)) { g.globalAlpha = 0.9; g.fillStyle = '#e9e2cf'; g.beginPath(); g.arc(a[0], a[1], w * 1.1, 0, 7); g.fill(); }
      pts.push([b[0], b[1], i]);
      if (i === cur || i === sel) ring(b, w, i === cur ? '#fff' : '#e2b65a', dpr);
    }
    for (let k = 0; k < after.length; k++) {
      const i = N + k, [x, z] = place(i), b = proj(x, 0.5, z, v);
      if (!b) continue;
      g.globalAlpha = 0.45; g.fillStyle = '#fff';
      g.beginPath(); g.arc(b[0], b[1], Math.max(1, b[2] * 0.03), 0, 7); g.fill();
      pts.push([b[0], b[1], i]);
      if (i === cur || i === sel) ring(b, Math.max(1, b[2] * 0.03), i === cur ? '#fff' : '#e2b65a', dpr);
    }
    g.globalAlpha = 1;
  }
  function ring(b, w, c, dpr) {
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.strokeStyle = c; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.arc(b[0], b[1], w * 1.3 + 6 * dpr, 0, 7); g.stroke();
    g.globalCompositeOperation = 'lighter';
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (shape === 'A' && !still && !drag) cam.yaw += dt * 0.05;
    if (shape === 'B' && !drag) { const goal = place(sel >= 0 ? sel : cur)[1]; walk += (goal - walk) * Math.min(1, dt * 2); }
    draw();
    raf = on ? requestAnimationFrame(frame) : 0;
  }
  function size() {
    const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    W = canvas.width = Math.max(1, Math.round(r.width * dpr)); Ht = canvas.height = Math.max(1, Math.round(r.height * dpr));
  }

  // Touch and mouse: drag turns (A) or walks (B); pinch or wheel comes closer; a tap picks the nearest light.
  let drag = null, pinch = 0;
  const touches = new Map();
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); touches.set(e.pointerId, [e.clientX, e.clientY]); drag = { moved: 0 }; });
  canvas.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return;
    const p0 = touches.get(e.pointerId); touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) {
      const [p, q] = [...touches.values()], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (pinch) zoom(pinch / d); pinch = d; if (drag) drag.moved = 99; return;
    }
    const dx = e.clientX - p0[0], dy = e.clientY - p0[1];
    if (drag) drag.moved += Math.abs(dx) + Math.abs(dy);
    if (shape === 'A') { cam.yaw += dx * 0.008; cam.pitch = Math.max(0.05, Math.min(1.45, cam.pitch + dy * 0.006)); }
    else { cam.yaw = Math.max(-2, Math.min(2, cam.yaw + dx * 0.006)); walk = Math.max(0, Math.min(place(N + after.length)[1], walk + dy * 0.05)); sel = -1; }
  });
  const up = e => {
    touches.delete(e.pointerId); if (touches.size < 2) pinch = 0;
    if (drag && drag.moved < 8 && touches.size === 0) {
      const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1, x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
      let best = -1, bd = 30 * dpr;
      for (const p of pts) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) bd = d, best = p[2]; }
      if (best >= 0) { sel = best; onPick(best); }
    }
    if (touches.size === 0) drag = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  function zoom(k) { if (shape === 'A') cam.dist = Math.max(3, Math.min(30, cam.dist * k)); else walk = Math.max(0, walk + (k > 1 ? -1 : 1) * 1.5); }
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
  addEventListener('resize', () => { if (on) size(); });

  return {
    // Run only while the World screen is showing, so it costs nothing otherwise.
    show(yes) {
      on = yes;
      if (on) { size(); walk = place(cur)[1]; if (!raf) raf = requestAnimationFrame(t => { last = t; frame(t); }); }
    },
    setShape(s) {
      shape = s === 'B' ? 'B' : 'A';
      cam.yaw = shape === 'A' ? 0.6 : 0; cam.pitch = shape === 'A' ? 0.55 : 0; walk = place(sel >= 0 ? sel : cur)[1];
    },
    // i: chapter index 0..N-1, or N + k for history entry k. frac: how far through the chapter's verses (0..1).
    setCurrent(i, frac = 1) { if (i !== cur) sel = -1; cur = i; verse = Math.max(0, Math.min(1, frac)); },
    get shape() { return shape; },
    get selected() { return sel; },
  };
}
