import { gsap } from 'gsap';
import { pointer } from './pointer';
import { prefs } from './prefs';
import { scroll } from './scroll';
import { onLayout } from './layout';
import { Spring, clamp, smoothstep } from './spring';

/**
 * Big headlines behave like type still loose in the stick.
 *
 * - Near the cursor (or a finger), letters lift a little and tip away from it,
 *   then drop back into place with a small bounce when it leaves.
 * - Scroll speed gently skews the whole headline, springing back to upright
 *   as the page settles.
 *
 * The lift uses the CSS `translate` / `rotate` properties, which compose with
 * the `transform` GSAP already uses for the intro, so the two never fight.
 * One ticker serves every headline; headlines off-screen or at rest cost
 * nothing. Reduced motion: neither runs.
 */
const MAX_SKEW = 4; // degrees
const heads = new Set();
let io = null;
let started = false;

function measure(h) {
  const r = h.root.getBoundingClientRect();
  h.box = { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
  h.fs = parseFloat(getComputedStyle(h.root).fontSize) || 48;
  h.offs = h.chars.map((c) => {
    const cr = c.getBoundingClientRect();
    return { x: cr.left + cr.width / 2 - r.left, y: cr.top + cr.height / 2 - r.top };
  });
}

function tick(time, deltaMs) {
  if (prefs.reduced) return;
  const dt = Math.min(0.05, deltaMs / 1000);
  const skewTarget = clamp(-scroll.v / 1400, -1, 1) * MAX_SKEW;
  for (const h of heads) {
    if (!h.visible) continue;

    // ---- scroll skew
    h.skew.target = skewTarget;
    h.skew.step(dt);
    const sk = Math.abs(h.skew.value) < 0.01 ? 0 : h.skew.value;
    if (Math.abs(sk - h.lastSkew) > 0.005) {
      h.lastSkew = sk;
      h.root.style.transform = sk ? `skewX(${sk.toFixed(3)}deg)` : '';
    }

    // ---- loose type near the pointer
    const top = h.box.y - window.scrollY;
    const reach = h.fs * 1.15;
    const near =
      pointer.active &&
      pointer.x > h.box.x - reach &&
      pointer.x < h.box.x + h.box.w + reach &&
      pointer.y > top - reach &&
      pointer.y < top + h.box.h + reach;
    if (!near && !h.awake) continue;
    let moving = false;
    for (let i = 0; i < h.chars.length; i++) {
      const o = h.offs[i];
      const dx = h.box.x + o.x - pointer.x;
      const dy = top + o.y - pointer.y;
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

/** Let a headline's set glyphs come loose. Returns the undo. */
export function looseType(root) {
  if (!root) return () => {};
  start();
  const chars = [...root.querySelectorAll('.kh-char')];
  const h = {
    root,
    chars,
    offs: [],
    box: { x: 0, y: 0, w: 0, h: 0 },
    fs: 48,
    ly: chars.map(() => new Spring(0, 0.32, 0.42)),
    lr: chars.map(() => new Spring(0, 0.32, 0.42)),
    wy: chars.map(() => 0),
    wr: chars.map(() => 0),
    skew: new Spring(0, 0.55, 0.62),
    lastSkew: 0,
    awake: false,
    visible: false,
  };
  measure(h);
  heads.add(h);
  io.observe(root);
  return () => {
    heads.delete(h);
    io.unobserve(root);
    root.style.transform = '';
    chars.forEach((c) => {
      c.style.translate = '';
      c.style.rotate = '';
    });
  };
}
