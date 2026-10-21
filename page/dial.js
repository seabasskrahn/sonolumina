// Preview build: the rotary speed dial, ported from Logos Theta (index.html, build 2026101209):
// 1× to a settable max in 0.25 steps, drag or tap, − / + buttons, max saved on this phone.
// Build 2026101818: the dial starts at `min` (0.5× in Sonolumina, so − at 0.5× stays there instead of jumping to 1×),
// never goes past the max, and a typed max that is not a number from 1 to maxLimit is refused with a message (onInvalid).

const A0 = -135, A1 = 135, STEP = 0.25;
const pol = (a, r) => { const t = (a - 90) * Math.PI / 180; return [100 + r * Math.cos(t), 100 + r * Math.sin(t)]; };
const arc = (a, b, r) => { const [x0, y0] = pol(a, r), [x1, y1] = pol(b, r); return `M${x0} ${y0}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x1} ${y1}`; };

// get() → current speed; set(v) applies it; getMax()/setMax(m) the dial's top; capFor(v) → caption text.
export function mountDial(host, { get, set, getMax, setMax, capFor, min = 1, maxLimit = Infinity, onInvalid = () => {} }) {
  host.innerHTML = `<div id="dialW"><button class="ib step" type="button" data-d="-1" aria-label="Slower">−</button>
  <svg id="dial" viewBox="0 0 200 200" role="slider" aria-label="Speed dial" tabindex="0">
  <defs><radialGradient id="dialRings"><stop offset="0" stop-color="#2a2418"/><stop offset=".3" stop-color="#17150f"/><stop offset=".45" stop-color="#241f15"/>
  <stop offset=".62" stop-color="#14120d"/><stop offset=".78" stop-color="#1f1b13"/><stop offset="1" stop-color="#0f0e0b"/></radialGradient></defs>
  <path class="trk" fill="none" stroke="#3a352a" stroke-width="4" stroke-linecap="round"/><path class="arc" fill="none" stroke="#e6d6a8" stroke-width="4" stroke-linecap="round"/>
  <g class="ticks"></g>
  <circle cx="100" cy="100" r="58" fill="url(#dialRings)" stroke="#2a261e"/>
  <circle class="ptr" r="9" fill="#fff3c4" stroke="#0f0e0b" stroke-width="2"/>
  <text class="val" x="100" y="108" text-anchor="middle" fill="#fff3c4" font-size="28" font-family="Georgia, 'Times New Roman', serif">1×</text>
  <text class="cap" x="100" y="128" text-anchor="middle" fill="#a8a291" font-size="9.5" font-family="system-ui, sans-serif"></text></svg>
  <button class="ib step" type="button" data-d="1" aria-label="Faster">+</button>
  <div class="dmax"><label class="dim">Max <input type="number" class="mx" min="1" ${Number.isFinite(maxLimit) ? `max="${maxLimit}"` : ''} step="0.25" inputmode="decimal" aria-label="Speed maximum"></label>
  <button class="pill" type="button" data-m="set">Set max</button><button class="pill" type="button" data-m="now" title="Set max to current speed">Set max to current speed</button></div></div>`;
  const q = s => host.querySelector(s), dial = q('#dial');
  const max = () => Math.max(1, getMax());
  const v2a = v => max() <= min ? A0 : A0 + (Math.min(max(), Math.max(min, v)) - min) / (max() - min) * (A1 - A0);
  function ticks() {
    q('.trk').setAttribute('d', arc(A0, A1, 84));
    const m = max(), st = m <= 4 ? 0.5 : m <= 12 ? 1 : Math.ceil((m - 1) / 10);
    let h = '';
    for (let v = min; v <= m + 1e-9; v += (v < 1 ? 1 - min || st : st)) {
      const a = v2a(v), [x0, y0] = pol(a, 72), [x1, y1] = pol(a, 66), [tx, ty] = pol(a, 98);
      h += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#8f8a7c" stroke-width="1.5"/>` +
        (Number.isInteger(v) || v === min ? `<text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="10" fill="#8f8a7c" font-family="system-ui, sans-serif">${+v.toFixed(2)}</text>` : '');
    }
    q('.ticks').innerHTML = h; q('.mx').value = m;
  }
  function draw(v = get()) {
    v = +v; const a = v2a(v), [x, y] = pol(a, 84);
    q('.arc').setAttribute('d', a > A0 + 0.5 ? arc(A0, a, 84) : '');
    const p = q('.ptr'); p.setAttribute('cx', x); p.setAttribute('cy', y);
    q('.val').textContent = (+v.toFixed(2)) + '×';
    q('.cap').textContent = capFor(v);
    dial.setAttribute('aria-valuenow', v); dial.setAttribute('aria-valuemin', min); dial.setAttribute('aria-valuemax', max());
    dial.setAttribute('aria-valuetext', (+v.toFixed(2)) + '×, maximum ' + max() + '×');
  }
  const snap = v => +(Math.min(max(), Math.max(min, Math.round(v / STEP) * STEP))).toFixed(2);
  function to(v) { v = snap(v); if (v !== +get()) set(v); draw(v); }
  // Dragging: draw at once, apply at most every 180 ms (each change re-schedules the music).
  let drag = false, last = 0, pend = 0;
  const val = e => {
    const r = dial.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    const a = Math.max(A0, Math.min(A1, Math.atan2(x, -y) * 180 / Math.PI));
    return min + (a - A0) / (A1 - A0) * (max() - min);
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
  const setM = raw => {
    const t = String(raw ?? '').trim(), n = +t;
    if (!t || !Number.isFinite(n) || n < 1 || n > maxLimit) {
      onInvalid(`The maximum must be a number from 1× to ${maxLimit}×${t ? ` (you entered ${t})` : ''}`);
      q('.mx').value = max(); return;
    }
    onInvalid('');
    const m = Math.round(n / STEP) * STEP; setMax(m); ticks(); if (+get() > m) to(m); else draw();
  };
  host.querySelector('[data-m=set]').onclick = () => setM(q('.mx').value);
  host.querySelector('[data-m=now]').onclick = () => setM(Math.max(1, +get()));
  ticks(); draw();
  return { draw };
}
