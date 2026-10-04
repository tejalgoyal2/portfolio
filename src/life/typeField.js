import { gsap } from 'gsap';
import { prefs, onPrefsChange } from './prefs';
import { onLayout } from './layout';
import { groundBands } from './ground';
import { measureMask } from './paper';

/**
 * The living type field — the paper's own type bed showing through. A faint
 * grid of JetBrains Mono sorts is printed across every bit of bare paper
 * (ghost ink on the cream, ghost paper on the dark spreads), kept out from
 * under text by a mask measured from the page. Slow patches of ink drift
 * across it and now and then a sort flips to another, so the page is quietly
 * alive even when nobody touches it.
 *
 * A press on empty paper (`life:press`) sends a ripple ring out through it:
 * sorts brighten and scramble as the front passes (red at the front, fading
 * behind) and the ring keeps going to the screen edges. Every press is its own
 * ripple, so several cross and overlap.
 *
 * One fixed 2D canvas. The field is laid out in document coordinates — it's
 * printed on the paper, so it scrolls with the page: a scroll shifts the
 * canvas by blitting it onto itself and only the newly exposed rows are drawn.
 * Each cell remembers what it last drew and is repainted only when its glyph,
 * ink level or colour changes. Paused while the tab is hidden. Reduced motion:
 * the field is still and faint, with no ripples.
 */

const GLYPHS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789§¶†*';
const N_ALNUM = 62;
const N_GLYPHS = GLYPHS.length;

// colours per ground: the field ink, the ripple front, and the ambient alpha range
const INKS = { ink: '#1c140e', paper: '#f4f0e6', red: '#d51e22', redLift: '#fe433e' };
const GROUND = [
  /* paper */ { field: 'ink', front: 'red', lo: 0.03, hi: 0.115 },
  /* ink   */ { field: 'paper', front: 'redLift', lo: 0.035, hi: 0.115 },
  /* red   */ { field: 'paper', front: 'ink', lo: 0.03, hi: 0.1 },
];
const GROUND_INDEX = { paper: 0, ink: 1, red: 2 };
const COLOUR_INDEX = { ink: 0, paper: 1, red: 2, redLift: 3 };
const COLOUR_NAMES = ['ink', 'paper', 'red', 'redLift'];

const SPEED = 640; // css px / s
const BAND = 110; // css px from the front to where the ripple has faded
const MAX_RIPPLES = 10;
// ink levels are stored as sqrt(alpha) in 5 bits, so the faint end — where the
// ambient field lives — gets most of the steps
const LEVELS = 31;
const EMPTY = 0xfffe;
const STALE = 0xffff;

const pickBase = () => {
  // mostly letters and figures, the odd printer's mark
  const r = Math.random();
  return r < 0.975 ? (Math.random() * N_ALNUM) | 0 : N_ALNUM + ((Math.random() * (N_GLYPHS - N_ALNUM)) | 0);
};
const scramble = (cell, id, step) => {
  let h = Math.imul(cell ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(id + 1, 0xc2b2ae35) ^ Math.imul(step + 7, 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) % N_ALNUM;
};

export function startTypeField(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  let dpr = 1;
  let W = 0; // device px
  let H = 0;
  let cw = 9; // device px per cell
  let ch = 16;
  let fontPx = 11;
  let cols = 0;
  let rows = 0; // document rows
  let glyph = new Uint8Array(0);
  let mask = new Uint8Array(0);
  let drawn = new Uint16Array(0);
  let rowGround = new Uint8Array(0);
  let atlas = [];
  let scrollD = 0; // device px the canvas content is currently drawn at
  let ready = false;
  const ripples = [];
  let rippleId = 0;
  let clock = 0;

  function buildAtlas() {
    atlas = COLOUR_NAMES.map((name) => {
      const a = document.createElement('canvas');
      a.width = cw * N_GLYPHS;
      a.height = ch;
      const g = a.getContext('2d');
      g.fillStyle = INKS[name];
      g.font = `400 ${fontPx * dpr}px "JetBrains Mono", ui-monospace, monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let i = 0; i < N_GLYPHS; i++) g.fillText(GLYPHS[i], i * cw + cw / 2, ch / 2 + dpr * 0.5);
      return a;
    });
  }

  function measureGround() {
    rowGround = new Uint8Array(rows);
    const bands = groundBands();
    for (let r = 0; r < rows; r++) {
      const y = ((r + 0.5) * ch) / dpr;
      let gi = 0;
      for (const b of bands)
        if (y >= b.top && y < b.bottom) {
          gi = GROUND_INDEX[b.ground] ?? 0;
          break;
        }
      rowGround[r] = gi;
    }
  }

  function measureMaskCells() {
    mask = new Uint8Array(cols * rows);
    for (const b of measureMask(6)) {
      const c0 = Math.max(0, Math.floor((b.x * dpr) / cw));
      const c1 = Math.min(cols - 1, Math.floor(((b.x + b.w) * dpr) / cw));
      const r0 = Math.max(0, Math.floor((b.y * dpr) / ch));
      const r1 = Math.min(rows - 1, Math.floor(((b.y + b.h) * dpr) / ch));
      for (let r = r0; r <= r1; r++) mask.fill(1, r * cols + c0, r * cols + c1 + 1);
    }
  }

  function rebuild() {
    const cssW = document.documentElement.clientWidth;
    const cssH = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const phone = cssW < 720;
    fontPx = phone ? 10 : 11;
    cw = Math.round((phone ? 8 : 9) * dpr);
    ch = Math.round((phone ? 15 : 16) * dpr);
    W = Math.round(cssW * dpr);
    H = Math.round(cssH * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const docH = document.documentElement.scrollHeight;
    const nextCols = Math.ceil(W / cw);
    const nextRows = Math.ceil((docH * dpr) / ch) + 2;
    if (nextCols !== cols || nextRows !== rows) {
      const old = glyph;
      const oldCols = cols;
      cols = nextCols;
      rows = nextRows;
      glyph = new Uint8Array(cols * rows);
      for (let i = 0; i < glyph.length; i++) {
        const r = (i / cols) | 0;
        const c = i - r * cols;
        glyph[i] = c < oldCols && r * oldCols + c < old.length ? old[r * oldCols + c] : pickBase();
      }
    }
    drawn = new Uint16Array(cols * rows).fill(STALE);
    buildAtlas();
    measureGround();
    measureMaskCells();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    scrollD = Math.round(window.scrollY * dpr);
  }

  // ---- ripples
  const onPress = (e) => {
    if (prefs.reduced || !ready) return;
    const { x, y } = e.detail;
    ripples.push({ x: x * dpr, y: (y + window.scrollY) * dpr, t0: clock, id: rippleId++, r: 0, prev: 0 });
    if (ripples.length > MAX_RIPPLES) ripples.shift();
  };
  window.addEventListener('life:press', onPress);

  // ---- draw
  const ambient = (c, r, t) => {
    // two slow interfering waves make soft patches of heavier ink that drift
    const a = Math.sin(c * 0.041 + t * 0.11 + 1.7 * Math.sin(r * 0.057 - t * 0.05));
    const b = Math.sin(r * 0.033 - t * 0.075 + 1.3 * Math.sin(c * 0.027 + t * 0.043));
    const p = 0.5 + 0.5 * a * b;
    const s = Math.min(1, Math.max(0, (p - 0.42) / 0.5));
    return s * s * (3 - 2 * s);
  };

  function shiftTo(target) {
    const dy = target - scrollD;
    if (dy === 0) return;
    const first = Math.floor(scrollD / ch);
    const last = Math.min(rows - 1, Math.floor((scrollD + H) / ch));
    if (Math.abs(dy) >= H) {
      ctx.clearRect(0, 0, W, H);
      for (let r = Math.max(0, first); r <= last; r++) drawn.fill(STALE, r * cols, (r + 1) * cols);
    } else {
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(canvas, 0, -dy);
      ctx.globalCompositeOperation = 'source-over';
      // rows that left the viewport must repaint when they come back
      const nFirst = Math.floor(target / ch);
      const nLast = Math.floor((target + H) / ch);
      for (let r = Math.max(0, first); r <= last; r++) {
        if (r < nFirst || r > nLast) drawn.fill(STALE, r * cols, (r + 1) * cols);
      }
      // the strip uncovered by the blit is blank now — repaint it
      if (dy > 0) {
        const r0 = Math.max(0, Math.floor((target + H - dy) / ch));
        for (let r = r0; r <= Math.min(rows - 1, nLast); r++) drawn.fill(STALE, r * cols, (r + 1) * cols);
      } else {
        const r1 = Math.floor((target - dy) / ch);
        for (let r = Math.max(0, nFirst); r <= Math.min(rows - 1, r1); r++) drawn.fill(STALE, r * cols, (r + 1) * cols);
      }
    }
    scrollD = target;
  }

  function draw(dt, still) {
    const target = Math.round(window.scrollY * dpr);
    shiftTo(target);
    const t = still ? 0 : clock;
    const r0 = Math.max(0, Math.floor(scrollD / ch));
    const r1 = Math.min(rows - 1, Math.floor((scrollD + H) / ch));
    const view0 = scrollD;
    const view1 = scrollD + H;

    // advance ripples; retire the ones that have run past every edge
    const speed = SPEED * dpr;
    const band = BAND * dpr;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.prev = rp.r;
      rp.r = (clock - rp.t0) * speed;
      const far = Math.max(Math.hypot(rp.x, rp.y - view0), Math.hypot(W - rp.x, rp.y - view0), Math.hypot(rp.x, rp.y - view1), Math.hypot(W - rp.x, rp.y - view1));
      if (rp.r - band > far) ripples.splice(i, 1);
    }

    // a few sorts flip on their own
    if (!still) {
      const flips = 5;
      for (let k = 0; k < flips; k++) {
        const r = r0 + ((Math.random() * (r1 - r0 + 1)) | 0);
        const c = (Math.random() * cols) | 0;
        glyph[r * cols + c] = pickBase();
      }
    }

    const nR = ripples.length;
    for (let r = r0; r <= r1; r++) {
      const gs = GROUND[rowGround[r]];
      const fieldC = COLOUR_INDEX[gs.field];
      const frontC = COLOUR_INDEX[gs.front];
      const lo = gs.lo;
      const span = gs.hi - gs.lo;
      const yDoc = (r + 0.5) * ch;
      const yScr = r * ch - scrollD;
      const rowBase = r * cols;
      for (let c = 0; c < cols; c++) {
        const i = rowBase + c;
        let key = EMPTY;
        if (!mask[i]) {
          let g = glyph[i];
          let alpha = lo + span * ambient(c, r, t);
          let colour = fieldC;
          if (nR) {
            const xDoc = (c + 0.5) * cw;
            let best = 0;
            let bestG = -1;
            for (let k = 0; k < nR; k++) {
              const rp = ripples[k];
              const dx = xDoc - rp.x;
              const dy = yDoc - rp.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              const x = rp.r - d; // how far behind the front this sort is
              if (x < 0 || x > band) continue;
              // the front just crossed this sort: it settles on a new glyph
              if (d > rp.prev) glyph[i] = pickBase();
              const f = 1 - x / band;
              const I = f * f * (0.55 + 0.45 / (1 + d / (900 * dpr)));
              if (I > best) {
                best = I;
                bestG = scramble(i, rp.id, (x / (24 * dpr)) | 0);
              }
            }
            if (best > 0) {
              g = bestG;
              if (best > 0.55) {
                colour = frontC;
                alpha = 0.3 + 0.6 * best;
              } else alpha = Math.min(0.6, alpha + best * 0.55);
            }
          }
          const lv = Math.min(LEVELS, Math.round(Math.sqrt(alpha) * LEVELS));
          key = lv === 0 ? EMPTY : g | (lv << 7) | (colour << 12);
        }
        if (drawn[i] === key) continue;
        const x = c * cw;
        ctx.clearRect(x, yScr, cw, ch);
        if (key !== EMPTY) {
          const lv = ((key >> 7) & 31) / LEVELS;
          ctx.globalAlpha = lv * lv;
          ctx.drawImage(atlas[key >> 12], (key & 127) * cw, 0, cw, ch, x, yScr, cw, ch);
        }
        drawn[i] = key;
      }
    }
    ctx.globalAlpha = 1;
  }

  let stillDrawn = false;
  const tick = (time, deltaMs) => {
    if (!ready || document.hidden) return;
    const dt = Math.min(0.1, deltaMs / 1000);
    if (prefs.reduced) {
      // still field: redraw only when the page scrolls or the layout moves
      const target = Math.round(window.scrollY * dpr);
      if (stillDrawn && target === scrollD) return;
      ripples.length = 0;
      draw(dt, true);
      stillDrawn = true;
      return;
    }
    clock += dt;
    draw(dt, false);
  };

  const relayoutField = () => {
    if (!ready) return;
    rebuild();
    stillDrawn = false;
  };
  const offLayout = onLayout(relayoutField);
  const offPrefs = onPrefsChange(() => (stillDrawn = false));

  let cancelled = false;
  (document.fonts?.load(`400 11px "JetBrains Mono"`) || Promise.resolve()).finally(() => {
    if (cancelled) return;
    ready = true;
    rebuild();
    canvas.classList.add('is-ready');
  });
  gsap.ticker.add(tick);

  return () => {
    cancelled = true;
    gsap.ticker.remove(tick);
    window.removeEventListener('life:press', onPress);
    offLayout();
    offPrefs();
  };
}
