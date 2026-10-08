import { gsap } from 'gsap';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { measureMask } from './paper';
import { groundAtDoc } from './ground';

/**
 * Water on the paper. A click on bare paper (`life:press`) drops a stone into
 * a real height-field: a damped wave equation on a coarse grid (one cell per
 * 5 css px), stepped at a fixed 60 Hz. The wave rings out, loses energy as it
 * spreads and dies out on its own; several drops interfere. Blocks of text are
 * islands — their cells are held flat, so the rings bend and reflect around a
 * paragraph instead of washing over it, and nothing is ever drawn on the text.
 *
 * It's drawn as light on a moving surface: each cell is shaded by its slope
 * against a light from the upper left (a bright face and a shadowed face per
 * crest) plus a little for its height, in inks chosen for the ground it's on,
 * then the coarse buffer is scaled up smoothly over the page. The surface is
 * also readable — sample(x, y) gives height and slope, which the drifting
 * icons ride (src/life/iconDrift.js).
 *
 * The grid is laid on the page: when it scrolls, the field shifts with it.
 * When the water is still, the simulation stops and costs nothing. Reduced
 * motion: no water.
 */

const CELL = 5; // css px per cell (4 on phones)
const STEP = 1 / 60;
const DAMP = 0.986;
const DROP = 9; // depth of the crater a drop punches
const DROP_R = 2.6; // its radius, in cells
const LIGHT = [-0.62, -0.78]; // light from the upper left

// per ground: highlight and shadow inks (rgb) and their strongest alpha
const SHADE = {
  paper: { hi: [255, 255, 252], hiA: 0.95, lo: [58, 40, 26], loA: 0.42 },
  ink: { hi: [246, 238, 222], hiA: 0.42, lo: [0, 0, 0], loA: 0.6 },
  red: { hi: [255, 222, 212], hiA: 0.5, lo: [58, 0, 4], loA: 0.5 },
};

export const water = {
  active: false,
  /** Height and slope of the surface under a viewport point. */
  sample(x, y) {
    return { h: 0, gx: 0, gy: 0, x, y };
  },
};

export function startWater(canvas) {
  const ctx = canvas.getContext('2d');
  const buf = document.createElement('canvas');
  const bctx = buf.getContext('2d');
  let cell = CELL;
  let gw = 0;
  let gh = 0;
  let cur = new Float32Array(0);
  let prev = new Float32Array(0);
  let wall = new Uint8Array(0);
  let rowGround = [];
  let image = null;
  let mask = [];
  let originY = 0; // document y of grid row 0
  let acc = 0;
  let quiet = 0;
  let W = 0;
  let H = 0;
  let dpr = 1;

  const rebuild = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = document.documentElement.clientWidth;
    H = window.innerHeight;
    cell = W < 720 ? 4 : CELL;
    gw = Math.ceil(W / cell) + 2;
    gh = Math.ceil(H / cell) + 2;
    cur = new Float32Array(gw * gh);
    prev = new Float32Array(gw * gh);
    wall = new Uint8Array(gw * gh);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    buf.width = gw;
    buf.height = gh;
    image = bctx.createImageData(gw, gh);
    originY = Math.floor(window.scrollY / cell) * cell;
    paintWalls();
    water.active = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // text blocks are islands; the ground decides the inks
  function paintWalls() {
    wall.fill(0);
    for (const b of mask) {
      const r0 = Math.floor((b.y - originY) / cell);
      const r1 = Math.floor((b.y + b.h - originY) / cell);
      if (r1 < 0 || r0 >= gh) continue;
      const c0 = Math.max(0, Math.floor(b.x / cell));
      const c1 = Math.min(gw - 1, Math.floor((b.x + b.w) / cell));
      for (let r = Math.max(0, r0); r <= Math.min(gh - 1, r1); r++) wall.fill(1, r * gw + c0, r * gw + c1 + 1);
    }
    rowGround = [];
    for (let r = 0; r < gh; r++) rowGround.push(SHADE[groundAtDoc(originY + (r + 0.5) * cell)] || SHADE.paper);
  }

  const measure = () => {
    mask = measureMask(4);
    rebuild();
  };

  /** Keep the grid on the paper: move it by whole rows as the page scrolls. */
  function follow() {
    const want = Math.floor(window.scrollY / cell) * cell;
    const rows = (want - originY) / cell;
    if (rows === 0) return;
    originY = want;
    const n = rows * gw;
    if (Math.abs(rows) >= gh) {
      cur.fill(0);
      prev.fill(0);
    } else if (rows > 0) {
      cur.copyWithin(0, n);
      prev.copyWithin(0, n);
      cur.fill(0, cur.length - n);
      prev.fill(0, prev.length - n);
    } else {
      cur.copyWithin(-n, 0, cur.length + n);
      prev.copyWithin(-n, 0, prev.length + n);
      cur.fill(0, 0, -n);
      prev.fill(0, 0, -n);
    }
    paintWalls();
  }

  function drop(x, y) {
    const cx = x / cell;
    const cy = (y + window.scrollY - originY) / cell;
    const R = Math.ceil(DROP_R * 2.2);
    for (let r = Math.floor(cy) - R; r <= Math.floor(cy) + R; r++) {
      if (r < 1 || r >= gh - 1) continue;
      for (let c = Math.floor(cx) - R; c <= Math.floor(cx) + R; c++) {
        if (c < 1 || c >= gw - 1) continue;
        // a stone's splash: a crater with a raised lip, which rings out as a
        // train of crests rather than a single swell
        const d2 = ((c - cx) ** 2 + (r - cy) ** 2) / (DROP_R * DROP_R);
        const i = r * gw + c;
        if (!wall[i]) cur[i] += DROP * (1 - d2) * Math.exp(-d2);
      }
    }
    water.active = true;
    quiet = 0;
  }

  function step() {
    let energy = 0;
    for (let r = 1; r < gh - 1; r++) {
      const row = r * gw;
      for (let c = 1; c < gw - 1; c++) {
        const i = row + c;
        if (wall[i]) {
          prev[i] = 0;
          continue;
        }
        const v = ((cur[i - 1] + cur[i + 1] + cur[i - gw] + cur[i + gw]) * 0.5 - prev[i]) * DAMP;
        prev[i] = v;
        energy += v < 0 ? -v : v;
      }
    }
    const t = cur;
    cur = prev;
    prev = t;
    return energy;
  }

  function render() {
    const d = image.data;
    for (let r = 0; r < gh; r++) {
      const g = rowGround[r] || SHADE.paper;
      const row = r * gw;
      for (let c = 0; c < gw; c++) {
        const i = row + c;
        const o = i * 4;
        if (wall[i] || c === 0 || c === gw - 1 || r === 0 || r === gh - 1) {
          d[o + 3] = 0;
          continue;
        }
        const sx = cur[i + 1] - cur[i - 1];
        const sy = cur[i + gw] - cur[i - gw];
        let s = (sx * LIGHT[0] + sy * LIGHT[1]) * 0.75 + cur[i] * 0.06;
        if (s > 1) s = 1;
        else if (s < -1) s = -1;
        if (s >= 0) {
          d[o] = g.hi[0];
          d[o + 1] = g.hi[1];
          d[o + 2] = g.hi[2];
          d[o + 3] = s * g.hiA * 255;
        } else {
          d[o] = g.lo[0];
          d[o + 1] = g.lo[1];
          d[o + 2] = g.lo[2];
          d[o + 3] = -s * g.loA * 255;
        }
      }
    }
    bctx.putImageData(image, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // the grid sits on whole rows of the page; offset by the part-row scrolled
    const off = originY - window.scrollY;
    ctx.drawImage(buf, 0, off, gw * cell, gh * cell);
  }

  water.sample = (x, y) => {
    const c = Math.round(x / cell);
    const r = Math.round((y + window.scrollY - originY) / cell);
    if (!water.active || c < 1 || c >= gw - 1 || r < 1 || r >= gh - 1) return { h: 0, gx: 0, gy: 0 };
    const i = r * gw + c;
    return { h: cur[i], gx: (cur[i + 1] - cur[i - 1]) / (2 * cell), gy: (cur[i + gw] - cur[i - gw]) / (2 * cell) };
  };

  const onPress = (e) => {
    if (prefs.reduced) return;
    drop(e.detail.x, e.detail.y);
  };
  window.addEventListener('life:press', onPress);

  const tick = (time, deltaMs) => {
    if (!water.active || document.hidden) return;
    follow();
    acc += Math.min(0.1, deltaMs / 1000);
    let energy = 1;
    while (acc >= STEP) {
      energy = step();
      acc -= STEP;
    }
    render();
    // gone still: stop simulating until the next drop
    quiet = energy < gw * gh * 0.0004 ? quiet + 1 : 0;
    if (quiet > 20) {
      water.active = false;
      cur.fill(0);
      prev.fill(0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const offLayout = onLayout(measure);
  window.addEventListener('resize', rebuild);
  measure();
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener('life:press', onPress);
    window.removeEventListener('resize', rebuild);
    offLayout();
    water.active = false;
  };
}
