import { gsap } from 'gsap';
import { pointer } from './pointer';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { Spring, clamp, smoothstep } from './spring';
import { scroll } from './scroll';

/**
 * Big headlines behave like type still loose in the stick: near the cursor
 * (or a finger), letters lift a little and tip away from it, then drop back
 * into place with a small bounce when it leaves. sweep() plays that once
 * along a headline on its own, to show the letters are loose; a zigzag sweep
 * takes it a line at a time, left to right, then back right to left, and on,
 * the way a hand would run along it.
 *
 * The lift uses the CSS `translate` / `rotate` properties, which compose with
 * the `transform` GSAP already uses for the intro, so the two never fight.
 * One ticker serves every headline; headlines off-screen or at rest cost
 * nothing, and a headline's box is only read while the pointer is somewhere
 * near where it sits (judged from where it was last laid out), all the reads
 * before any of the writes. Reduced motion: it doesn't run.
 */
const heads = new Set();
const SWEEP = 1.6; // seconds for a sweep to cross a headline
const ZIG = 0.9; // seconds a zigzag sweep spends on each line
let io = null;
let started = false;

function measure(h) {
  const r = h.root.getBoundingClientRect();
  h.w = r.width || 1;
  h.top = r.top + window.scrollY;
  h.h = r.height;
  h.fs = parseFloat(getComputedStyle(h.root).fontSize) || 48;
  h.offs = h.chars.map((c) => {
    const cr = c.getBoundingClientRect();
    return { x: cr.left + cr.width / 2 - r.left, y: cr.top + cr.height / 2 - r.top };
  });
}

function tick(time, deltaMs) {
  if (prefs.reduced) return;
  const dt = Math.min(0.05, deltaMs / 1000);
  // which headlines need a look this frame, then every rect read at once
  const due = [];
  for (const h of heads) {
    if (!h.visible) continue;
    if (!h.awake && h.sweep < 0) {
      if (!pointer.active) continue;
      const top = h.top - scroll.y;
      const margin = h.fs * 3 + 160;
      if (pointer.y < top - margin || pointer.y > top + h.h + margin) continue;
    }
    due.push(h);
  }
  const rects = due.map((h) => h.root.getBoundingClientRect());
  for (let n = 0; n < due.length; n++) {
    const h = due[n];
    const live = rects[n];
    const k = live.width / h.w;
    const reach = h.fs * 1.15 * k;
    // a sweep is a cursor that isn't there, passing once along the line
    let px = pointer.x;
    let py = pointer.y;
    let swept = false;
    if (h.sweep >= 0 && h.lines) {
      const L = h.lines.length;
      h.sweep += dt / (ZIG * L);
      const at = Math.min(1, h.sweep) * L;
      const n = Math.min(L - 1, Math.floor(at));
      const t = at - n;
      const u = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const line = h.lines[n];
      const a0 = live.left + (line.x0 * k - reach);
      const a1 = live.left + (line.x1 * k + reach);
      px = n % 2 ? a1 + (a0 - a1) * u : a0 + (a1 - a0) * u;
      py = live.top + line.y * k;
      swept = true;
      if (h.sweep >= 1) {
        h.sweep = -1;
        h.lines = null;
      }
    } else if (h.sweep >= 0) {
      h.sweep += dt / SWEEP;
      const u = 1 - (1 - Math.min(1, h.sweep)) ** 2.2; // quick off, long settle
      px = live.left - reach + (live.width + reach * 2) * u;
      py = live.top + live.height * 0.55;
      swept = true;
      if (h.sweep >= 1) h.sweep = -1;
    }
    const near =
      swept ||
      (pointer.active &&
        pointer.x > live.left - reach &&
        pointer.x < live.right + reach &&
        pointer.y > live.top - reach &&
        pointer.y < live.bottom + reach);
    if (!near && !h.awake) continue;
    let moving = false;
    for (let i = 0; i < h.chars.length; i++) {
      const o = h.offs[i];
      const dx = live.left + o.x * k - px;
      const dy = live.top + o.y * k - py;
      const f = near ? 1 - smoothstep(0, reach, Math.hypot(dx, dy * 1.2)) : 0;
      const ly = h.ly[i];
      const lr = h.lr[i];
      ly.target = -f * h.fs * 0.11;
      lr.target = f * clamp(dx / reach, -1, 1) * 5;
      ly.step(dt);
      lr.step(dt);
      if (!ly.settled || !lr.settled) moving = true;
      const y = Math.abs(ly.value) < 0.02 ? 0 : ly.value;
      const r = Math.abs(lr.value) < 0.02 ? 0 : lr.value;
      if (Math.abs(y - h.wy[i]) > 0.05 || Math.abs(r - h.wr[i]) > 0.05) {
        h.wy[i] = y;
        h.wr[i] = r;
        const c = h.chars[i].style;
        c.translate = y ? `0 ${y.toFixed(2)}px` : '';
        c.rotate = r ? `${r.toFixed(2)}deg` : '';
      }
    }
    h.awake = near || moving;
  }
}

function start() {
  if (started) return;
  started = true;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) for (const h of heads) if (h.root === e.target) h.visible = e.isIntersecting;
    },
    { rootMargin: '120px 0px' }
  );
  onLayout(() => heads.forEach(measure));
  gsap.ticker.add(tick);
}

/**
 * Run the lift once along a headline, as if a cursor had passed over it — so
 * people see the letters are loose and go and try it themselves.
 */
export function sweep(root, zigzag = false) {
  if (prefs.reduced) return;
  for (const h of heads) if (h.root === root) {
    measure(h);
    h.lines = zigzag ? linesOf(h) : null;
    h.sweep = 0;
    h.awake = true;
  }
}

// the headline's lines as it's set now: each one's middle and its two ends
function linesOf(h) {
  const lines = [];
  for (const o of h.offs) {
    const line = lines.find((l) => Math.abs(l.y - o.y) < h.fs * 0.4);
    if (line) {
      line.x0 = Math.min(line.x0, o.x);
      line.x1 = Math.max(line.x1, o.x);
    } else lines.push({ y: o.y, x0: o.x, x1: o.x });
  }
  return lines.sort((a, b) => a.y - b.y);
}

/** Let a headline's set glyphs come loose. Returns the undo. */
export function looseType(root) {
  if (!root) return () => {};
  start();
  const chars = [...root.querySelectorAll('.kh-char')];
  const h = {
    root,
    chars,
    offs: [],
    w: 1,
    fs: 48,
    ly: chars.map(() => new Spring(0, 0.32, 0.42)),
    lr: chars.map(() => new Spring(0, 0.32, 0.42)),
    wy: chars.map(() => 0),
    wr: chars.map(() => 0),
    awake: false,
    visible: false,
    sweep: -1,
  };
  measure(h);
  heads.add(h);
  io.observe(root);
  return () => {
    heads.delete(h);
    io.unobserve(root);
    chars.forEach((c) => {
      c.style.translate = '';
      c.style.rotate = '';
    });
  };
}
