import { gsap } from 'gsap';
import { pointer } from './pointer';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { Spring, clamp, smoothstep } from './spring';

/**
 * Big headlines behave like type still loose in the stick: near the cursor
 * (or a finger), letters lift a little and tip away from it, then drop back
 * into place with a small bounce when it leaves. sweep() plays that once
 * along a headline on its own, to show the letters are loose.
 *
 * The lift uses the CSS `translate` / `rotate` properties, which compose with
 * the `transform` GSAP already uses for the intro, so the two never fight.
 * One ticker serves every headline; headlines off-screen or at rest cost
 * nothing. Reduced motion: it doesn't run.
 */
const heads = new Set();
const SWEEP = 1.6; // seconds for a sweep to cross a headline
let io = null;
let started = false;

function measure(h) {
  const r = h.root.getBoundingClientRect();
  h.w = r.width || 1;
  h.fs = parseFloat(getComputedStyle(h.root).fontSize) || 48;
  h.offs = h.chars.map((c) => {
    const cr = c.getBoundingClientRect();
    return { x: cr.left + cr.width / 2 - r.left, y: cr.top + cr.height / 2 - r.top };
  });
}

function tick(time, deltaMs) {
  if (prefs.reduced) return;
  const dt = Math.min(0.05, deltaMs / 1000);
  for (const h of heads) {
    if (!h.visible) continue;
    if (!pointer.active && !h.awake) continue;
    // where this headline is now (one rect, only while a pointer is about)
    const live = h.root.getBoundingClientRect();
    const k = live.width / h.w;
    const reach = h.fs * 1.15 * k;
    // a sweep is a cursor that isn't there, passing once along the line
    let px = pointer.x;
    let py = pointer.y;
    let swept = false;
    if (h.sweep >= 0) {
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
export function sweep(root) {
  if (prefs.reduced) return;
  for (const h of heads) if (h.root === root) {
    measure(h);
    h.sweep = 0;
    h.awake = true;
  }
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
