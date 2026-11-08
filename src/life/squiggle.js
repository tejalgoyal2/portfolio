import { prefs } from './prefs';

/**
 * A headline that scribbles back (after Wealthsimple's "Something Good").
 * Touch a letter and a single hand-drawn loop is painted over it, once, in
 * about half a second: a brush that starts loaded and runs dry, its bristles
 * dropping out towards the tail. Then it holds still. Leave the letter and it
 * comes back; touch it again and a different loop is painted.
 *
 * Each loop is one of a few figures, drawn by hand as points and smoothed
 * into a curve, flipped either way and fitted inside the letter's own box
 * with a little room round it, so it reads as a mark on the letter rather
 * than a sticker over the line. Ink is the paper's own: press red mostly,
 * now and then the black or the blue plate.
 *
 * Only the letter you touch draws, on a canvas of its own that exists only
 * while it shows, and only for the half second it paints. The letter's text
 * stays underneath (made transparent), so the headline still reads and
 * selects. Reduced motion: the loop appears whole, with no drawing.
 */
const DRAW_MS = 550;
const TOUCH_HOLD_MS = 650;
const SPILL = 0.22; // how far past each side of the letter the loop may reach, as a share of its width // a tap has no "leave": the mark stays a moment after it's painted

// The figures, by hand, in their own little grid (x right, y down). Loose and loopy,
// one or two crossings each, the way a pen goes when nobody's checking.
const FIGURES = [
  // a loop-the-loop, two turns going right
  [[0, 30], [8, 22], [16, 12], [22, 4], [20, 0], [14, 2], [12, 10], [16, 20], [24, 26], [32, 22], [38, 12], [40, 4], [36, 0], [31, 4], [32, 14], [38, 24], [46, 28], [54, 22], [58, 14], [60, 8]],
  // a curl that opens out into a tail
  [[2, 22], [10, 26], [20, 24], [26, 16], [24, 8], [16, 4], [10, 8], [12, 16], [22, 22], [34, 22], [42, 16], [44, 8], [40, 2], [34, 4], [34, 12], [40, 20], [50, 24], [58, 20]],
  // one fat loop and away
  [[0, 8], [10, 4], [22, 4], [32, 10], [36, 20], [32, 30], [22, 34], [14, 30], [14, 22], [22, 16], [34, 16], [44, 22], [50, 32], [56, 38], [60, 40]],
  // a squiggle that can't decide
  [[0, 20], [6, 8], [12, 2], [17, 10], [18, 24], [22, 34], [28, 31], [30, 18], [33, 6], [38, 2], [42, 12], [44, 26], [48, 34], [54, 30], [58, 20]],
].flatMap((f) => [false, true].flatMap((flipX) => [false, true].map((flipY) => ({ f, flipX, flipY }))));

const INKS = [
  ['--red', 3],
  ['--ink', 1],
  ['--blue-plate', 1],
];

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hash = (n) => {
  const t = Math.sin(n * 127.1) * 43758.5453;
  return t - Math.floor(t);
};
// smooth 1D value noise
const noise = (seed, x) => {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return hash(seed * 57 + i) * (1 - s) + hash(seed * 57 + i + 1) * s;
};

// Catmull-Rom through the hand points, four steps per span
function spline(pts) {
  const out = [{ x: pts[0][0], y: pts[0][1] }];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 1; k <= 4; k++) {
      const t = k / 4;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a, b, c2, d) => 0.5 * (2 * b + (c2 - a) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push({ x: c(p0[0], p1[0], p2[0], p3[0]), y: c(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  return out;
}

// the figure, fitted inside the letter's box with `inset` all round, a touch off-centre
function fit({ f, flipX, flipY }, w, h, inset) {
  const pts = spline(f);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  const bw = Math.max(1, w - inset * 2);
  const bh = Math.max(1, h - inset * 2);
  const k = 0.88 * Math.min(bw / (x1 - x0 || 1), bh / (y1 - y0 || 1));
  const sw = bw - (x1 - x0) * k;
  const sh = bh - (y1 - y0) * k;
  const ox = inset + sw / 2 + (Math.random() - 0.5) * Math.min(sw, bw * 0.12);
  const oy = inset + sh / 2 + (Math.random() - 0.5) * Math.min(sh, bh * 0.12);
  return pts.map((p) => {
    let x = ox + (p.x - x0) * k;
    let y = oy + (p.y - y0) * k;
    if (flipX) x = w - x;
    if (flipY) y = h - y;
    return { x: clamp(x, inset, w - inset), y: clamp(y, inset, h - inset) };
  });
}

// along the path: how far the brush has gone, how much paint is left, how wide it is
function brushPath(pts, wobble, width) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const full = Math.max(1, total / (1 - 0.32)); // the tail ends with about a third of the paint
  const out = [];
  let travelled = 0;
  let speed = 1;
  let px = 0, py = 0;
  pts.forEach((p, i) => {
    const x = p.x + Math.sin(i * 0.07) * wobble;
    const y = p.y + Math.cos(i * 0.055) * wobble;
    const step = i ? Math.hypot(x - px, y - py) : 0;
    travelled += step;
    speed = speed * 0.85 + step * 0.15;
    const level = clamp(1 - travelled / full, 0, 1);
    const slow = clamp(0.75 + 0.6 / (speed + 0.5), 0.7, 1.9); // slower bits of the stroke pool a little
    out.push({ x, y, travelled, level, r: 0.5 * width * (0.6 + 0.4 * level) * (0.9 + 0.1 * slow) });
    px = x;
    py = y;
  });
  for (let pass = 0; pass < 3; pass++) {
    const r = out.map((p, i) => (out[Math.max(0, i - 1)].r + 2 * p.r + out[Math.min(out.length - 1, i + 1)].r) / 4);
    r.forEach((v, i) => (out[i].r = v));
  }
  return out;
}

// bristles: thin lines spread across the brush, each dropping out as the paint runs dry
const bristles = (n, spread, tone) =>
  Array.from({ length: n }, (_, i) => {
    const a = Math.random() * TAU;
    const d = Math.sqrt(Math.random()) * spread;
    return { ox: Math.cos(a) * d, oy: Math.sin(a) * d, edge: d, seed: i * 13.7 + tone, freq: 0.06 + Math.random() * 0.14, alpha: 0.1 + Math.random() * 0.3, weight: 0.1 + Math.random() * 0.2, bias: (Math.random() - 0.5) * 0.2 };
  });

// a CSS colour (oklch and all) as rgb numbers, by painting a pixel
let probe;
function rgbOf(css) {
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) return [200, 40, 30];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}
function pickInk(el) {
  const total = INKS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  let name = INKS[0][0];
  for (const [n, w] of INKS) if ((r -= w) < 0) { name = n; break; }
  return rgbOf(getComputedStyle(el).getPropertyValue(name).trim() || '#c0392b');
}
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const shade = ([r, g, b], k) => [r * (1 - k), g * (1 - k), b * (1 - k)];
const tint = ([r, g, b], k) => [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k];

/** Paint one loop on `canvas` (CSS size w × h). Returns render(progress 0..1). */
function painter(canvas, w, h, lw, ink) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const width = Math.max(1.5, 0.11 * Math.min(lw, h));
  const wobble = width * 0.45;
  const fig = FIGURES[Math.floor(Math.random() * FIGURES.length)];
  const path = brushPath(fit(fig, w, h, width / 2 + wobble * 1.5), wobble, width);
  const fine = bristles(36, 1, 5);
  const loose = bristles(10, 0.8, 50);
  const turn = Math.random() * TAU;
  const cos = Math.cos(turn), sin = Math.sin(turn);
  const dark = rgba(shade(ink, 0.35), 1);
  const light = rgba(tint(ink, 0.3), 1);
  let drawn = 0;

  const strands = (set, colour, from, to) => {
    ctx.strokeStyle = colour;
    for (const b of set) {
      const dx = (b.ox * cos - b.oy * sin) * width * 0.5;
      const dy = (b.ox * sin + b.oy * cos) * width * 0.5;
      ctx.globalAlpha = b.alpha;
      ctx.lineWidth = width * b.weight;
      ctx.beginPath();
      let down = false;
      for (let i = Math.max(1, from); i < to; i++) {
        const p = path[i];
        const wet = 0.7 * noise(b.seed, p.travelled * b.freq) + 0.3 * noise(b.seed + 99, p.travelled * 0.05);
        if (wet < 0.5 + 0.55 * p.level + b.bias - 0.15 * b.edge) {
          if (!down) ctx.moveTo(path[i - 1].x + dx, path[i - 1].y + dy);
          ctx.lineTo(p.x + dx, p.y + dy);
          down = true;
        } else down = false;
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  return (t) => {
    const upto = Math.max(2, Math.ceil(path.length * clamp(t, 0, 1)));
    if (upto <= drawn) return;
    const from = Math.max(1, drawn);
    const level = path[upto - 1].level;
    let r = 0;
    for (let i = from - 1; i < upto; i++) r += path[i].r;
    const body = rgba(ink, 0.18 + 0.72 * level ** 0.8);
    ctx.fillStyle = body;
    ctx.strokeStyle = body;
    ctx.lineWidth = (2 * r) / (upto - from + 1);
    if (drawn === 0) {
      ctx.beginPath();
      ctx.arc(path[0].x, path[0].y, path[0].r, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(path[from - 1].x, path[from - 1].y);
    for (let i = from; i < upto; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    strands(fine, dark, from, upto);
    strands(loose, light, from, upto);
    drawn = upto;
  };
}

const live = new Map(); // letter -> { canvas, raf, hover, done, timer }

function drop(el) {
  const s = live.get(el);
  if (!s) return;
  cancelAnimationFrame(s.raf);
  clearTimeout(s.timer);
  s.canvas.remove();
  el.removeAttribute('data-squig');
  live.delete(el);
}

// the mark goes once it's painted and the pointer has gone
function settle(el) {
  const s = live.get(el);
  if (s && s.done && !s.hover) drop(el);
}

function paint(el, touch) {
  drop(el); // a fresh touch is a fresh loop
  // Anton's letters are tall and narrow, so the canvas reaches a little past the
  // letter on each side (SPILL), giving the loop room to be read as a loop
  const lw = el.offsetWidth;
  const h = el.offsetHeight;
  if (!lw || !h) return;
  const w = lw * (1 + SPILL * 2);
  const canvas = document.createElement('canvas');
  canvas.className = 'kh-squig';
  canvas.setAttribute('aria-hidden', 'true');
  el.appendChild(canvas);
  el.dataset.squig = '';
  const render = painter(canvas, w, h, lw, pickInk(el));
  const s = { canvas, raf: 0, timer: 0, hover: !touch, done: false };
  live.set(el, s);
  const finish = () => {
    s.done = true;
    if (touch) s.timer = setTimeout(() => drop(el), TOUCH_HOLD_MS);
    else settle(el);
  };
  if (prefs.reduced) {
    render(1);
    finish();
    return;
  }
  const t0 = performance.now();
  const frame = (now) => {
    const t = Math.min(1, (now - t0) / DRAW_MS);
    render(t);
    if (t < 1) s.raf = requestAnimationFrame(frame);
    else finish();
  };
  s.raf = requestAnimationFrame(frame);
}

/** Make a set headline scribble under the pointer. Returns the undo. */
export function squiggle(root) {
  if (!root) return () => {};
  const letterAt = (e) => {
    const el = e.target instanceof Element ? e.target.closest('.kh-char') : null;
    return el && root.contains(el) && el.textContent.trim() ? el : null;
  };
  const enter = (e) => {
    const el = letterAt(e);
    if (!el) return;
    // pointerover bubbles from the canvas too: only a real arrival paints
    if (live.get(el)?.hover && e.pointerType !== 'touch') return;
    paint(el, e.pointerType === 'touch');
  };
  const leave = (e) => {
    const el = letterAt(e);
    if (!el || e.pointerType === 'touch') return;
    if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
    const s = live.get(el);
    if (s) {
      s.hover = false;
      settle(el);
    }
  };
  root.addEventListener('pointerover', enter);
  root.addEventListener('pointerout', leave);
  return () => {
    root.removeEventListener('pointerover', enter);
    root.removeEventListener('pointerout', leave);
    for (const el of [...live.keys()]) if (root.contains(el)) drop(el);
  };
}
