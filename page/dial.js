// Preview build: the rotary speed dial, ported from Logos Theta (index.html, build 2026101209):
// 1× to a settable max in 0.25 steps, drag or tap, − / + buttons, max saved on this phone.

const A0 = -135, A1 = 135, STEP = 0.25;
const pol = (a, r) => { const t = (a - 90) * Math.PI / 180; return [100 + r * Math.cos(t), 100 + r * Math.sin(t)]; };
const arc = (a, b, r) => { const [x0, y0] = pol(a, r), [x1, y1] = pol(b, r); return `M${x0} ${y0}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x1} ${y1}`; };

// get() → current speed; set(v) applies it; getMax()/setMax(m) the dial's top; capFor(v) → caption text.
export function mountDial(host, { get, set, getMax, setMax, capFor }) {
  host.innerHTML = `<div id="dialW"><button class="ib" type="button" data-d="-1" aria-label="Slower">−</button>
  <svg id="dial" viewBox="0 0 200 200" role="slider" aria-label="Speed dial" tabindex="0">
  <path class="trk" fill="none" stroke="#2a2735" stroke-width="14" stroke-linecap="round"/><path class="arc" fill="none" stroke="#d9b65a" stroke-width="14" stroke-linecap="round"/>
  <g class="ticks"></g><circle class="ptr" r="11" fill="#ece9f2" stroke="#d9b65a" stroke-width="3"/>
  <circle cx="100" cy="100" r="56" fill="#1b1a23" stroke="#33303f"/>
  <text class="val" x="100" y="108" text-anchor="middle" fill="#ece9f2" font-size="26" font-weight="600">1×</text>
  <text class="cap" x="100" y="128" text-anchor="middle" fill="#9a95a8" font-size="10"></text></svg>
  <button class="ib" type="button" data-d="1" aria-label="Faster">+</button>
  <div class="dmax"><label class="dim">Max <input type="number" class="mx" min="1" step="0.25" inputmode="decimal"></label>
  <button class="pill" type="button" data-m="set">Set max</button><button class="pill" type="button" data-m="now" title="Use current speed as max">Max = now</button></div></div>`;
  const q = s => host.querySelector(s), dial = q('#dial');
  const max = () => Math.max(1, getMax());
  const v2a = v => max() <= 1 ? A0 : A0 + (Math.min(max(), Math.max(1, v)) - 1) / (max() - 1) * (A1 - A0);
  function ticks() {
    q('.trk').setAttribute('d', arc(A0, A1, 84));
    const m = max(), st = m <= 4 ? 0.5 : m <= 12 ? 1 : Math.ceil((m - 1) / 10);
    let h = '';
    for (let v = 1; v <= m + 1e-9; v += st) {
      const a = v2a(v), [x0, y0] = pol(a, 72), [x1, y1] = pol(a, 66), [tx, ty] = pol(a, 98);
      h += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#9a95a8" stroke-width="2"/>` +
        (Number.isInteger(v) ? `<text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="11" fill="#9a95a8">${v}</text>` : '');
    }
    q('.ticks').innerHTML = h; q('.mx').value = m;
  }
  function draw(v = get()) {
    v = +v; const a = v2a(v), [x, y] = pol(a, 84);
    q('.arc').setAttribute('d', a > A0 + 0.5 ? arc(A0, a, 84) : '');
    const p = q('.ptr'); p.setAttribute('cx', x); p.setAttribute('cy', y);
    q('.val').textContent = (+v.toFixed(2)) + '×';
    q('.cap').textContent = capFor(v);
    dial.setAttribute('aria-valuenow', v);
  }
  const snap = v => +(Math.round(Math.min(max(), Math.max(1, v)) / STEP) * STEP).toFixed(2);
  function to(v) { v = snap(v); if (v !== +get()) set(v); draw(v); }
  // Dragging: draw at once, apply at most every 180 ms (each change re-schedules the music).
  let drag = false, last = 0, pend = 0;
  const val = e => {
    const r = dial.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    const a = Math.max(A0, Math.min(A1, Math.atan2(x, -y) * 180 / Math.PI));
    return 1 + (a - A0) / (A1 - A0) * (max() - 1);
  };
  const apply = v => {
    const t = performance.now(); clearTimeout(pend);
    if (t - last > 180) { last = t; to(v); } else { draw(snap(v)); pend = setTimeout(() => { last = performance.now(); to(v); }, 190); }
  };
  dial.addEventListener('pointerdown', e => { drag = true; dial.setPointerCapture?.(e.pointerId); apply(val(e)); });
  dial.addEventListener('pointermove', e => { if (drag) apply(val(e)); });
  const up = e => { if (!drag) return; drag = false; clearTimeout(pend); to(val(e)); };
  dial.addEventListener('pointerup', up); dial.addEventListener('pointercancel', () => { drag = false; });
  dial.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { to(+get() + STEP); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { to(+get() - STEP); e.preventDefault(); }
  });
  host.querySelectorAll('[data-d]').forEach(b => b.onclick = () => to(+get() + STEP * +b.dataset.d));
  const setM = m => { m = Math.round(Math.max(1, +m || 1) / STEP) * STEP; setMax(m); ticks(); if (+get() > m) to(m); else draw(); };
  host.querySelector('[data-m=set]').onclick = () => setM(q('.mx').value);
  host.querySelector('[data-m=now]').onclick = () => setM(Math.max(1, +get()));
  ticks(); draw();
  return { draw };
}
