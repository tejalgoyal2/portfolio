import { gsap } from 'gsap';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { measureMask } from './paper';
import { groundAtDoc } from './ground';
import { water } from './water';
import { loadSprites, INKS_FOR } from './sprites';

/**
 * A few of the pencil icons (matita.dev, MIT) drift across the bare paper —
 * about one per 110,000 px² of screen, so 8 to 14 at a time: faint, slow,
 * wandering, turning gently. They're printed on the page (document
 * coordinates, so they scroll with it) and they steer around text: every icon
 * keeps out of the page's text boxes, padded, and turns away before it
 * reaches one.
 *
 * They float on the water (src/life/water.js): where a ripple passes, an icon
 * is lifted and shoved along the slope of the wave, tips with it, and then
 * settles back into its drift as the water calms.
 *
 * One fixed canvas, redrawn each frame (a dozen sprites). Paused while the tab
 * is hidden. Reduced motion: the icons sit still.
 */

const PX = 40; // css px the sprites are rasterised at
const PAD = 12; // clearance kept from text, on top of the icon's radius
const SPACING = 150; // icons keep at least this far apart

export function startIconDrift(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let dpr = 1;
  let W = 0;
  let H = 0;
  let sprites = null;
  let mask = []; // text boxes in document coordinates, sorted by y
  let docH = 0;
  const icons = [];
  let lastDrawKey = '';

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = document.documentElement.clientWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    lastDrawKey = '';
  };
  const measure = () => {
    resize();
    mask = measureMask(PAD).sort((a, b) => a.y - b.y);
    docH = document.documentElement.scrollHeight;
    // the layout moved: anything now sitting on text fades away and is replaced
    for (const ic of icons) if (!free(ic.x, ic.y, ic.r)) ic.dying = true;
  };

  /** Is a circle clear of text and inside the page? */
  function free(x, y, r) {
    if (x < r || x > W - r || y < r || y > docH - r) return false;
    for (const b of mask) {
      if (b.y > y + r) break;
      if (b.y + b.h < y - r) continue;
      const nx = Math.max(b.x, Math.min(x, b.x + b.w));
      const ny = Math.max(b.y, Math.min(y, b.y + b.h));
      if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return false;
    }
    return true;
  }

  const target = () => Math.max(8, Math.min(14, Math.round((W * H) / 110000)));

  function spawn(fadeIn = true) {
    const sy0 = window.scrollY;
    for (let tries = 0; tries < 40; tries++) {
      const x = Math.random() * W;
      const y = sy0 + Math.random() * H;
      const size = 26 + Math.random() * 12;
      const r = size / 2;
      if (!free(x, y, r)) continue;
      if (icons.some((o) => Math.hypot(o.x - x, o.y - y) < SPACING)) continue;
      icons.push({
        x,
        y,
        r,
        size,
        sprite: (Math.random() * sprites.length) | 0,
        accent: Math.random() < 0.16,
        dir: Math.random() * Math.PI * 2,
        speed: 6 + Math.random() * 8,
        a: Math.random() * Math.PI * 2,
        av0: (Math.random() - 0.5) * 0.3,
        av: 0,
        vx: 0,
        vy: 0,
        lift: 0,
        tip: 0,
        alpha: fadeIn ? 0 : 1,
        peak: 0.16 + Math.random() * 0.1,
        dying: false,
      });
      return true;
    }
    return false;
  }

  function step(dt) {
    const still = prefs.reduced;
    const sy0 = window.scrollY;
    for (const ic of icons) {
      ic.alpha = ic.dying ? ic.alpha - dt * 1.4 : Math.min(1, ic.alpha + dt * 0.8);
      if (still) continue;

      // ride the water: shoved down the slope, lifted on a crest, tipped with it
      const w = water.active ? water.sample(ic.x, ic.y - sy0) : null;
      if (w) {
        ic.vx -= w.gx * 5200 * dt;
        ic.vy -= w.gy * 5200 * dt;
        ic.av += w.gx * 26 * dt;
        ic.lift += (w.h - ic.lift) * Math.min(1, dt * 14);
        ic.tip += (w.gx * 6 - ic.tip) * Math.min(1, dt * 10);
      } else {
        ic.lift *= Math.exp(-6 * dt);
        ic.tip *= Math.exp(-6 * dt);
      }

      // a slow random walk, turning away from text before it gets there
      ic.dir += (Math.random() - 0.5) * 0.9 * dt;
      const ahead = 34;
      if (!free(ic.x + Math.cos(ic.dir) * ahead, ic.y + Math.sin(ic.dir) * ahead, ic.r)) ic.dir += 2.4 * dt;
      const decay = Math.exp(-1.8 * dt);
      ic.vx *= decay;
      ic.vy *= decay;
      const nx = ic.x + (Math.cos(ic.dir) * ic.speed + ic.vx) * dt;
      const ny = ic.y + (Math.sin(ic.dir) * ic.speed + ic.vy) * dt;
      if (free(nx, ny, ic.r)) {
        ic.x = nx;
        ic.y = ny;
      } else {
        ic.vx *= -0.4;
        ic.vy *= -0.4;
        ic.dir += Math.PI * 0.5;
      }
      ic.av += (ic.av0 - ic.av) * (1 - Math.exp(-1.5 * dt));
      ic.a += ic.av * dt;
    }

    // off screen: retire, then keep the count up
    for (let k = icons.length - 1; k >= 0; k--) {
      const ic = icons[k];
      const y = ic.y - sy0;
      const gone = ic.x < -120 || ic.x > W + 120 || y < -160 || y > H + 160;
      if (gone || ic.alpha <= 0) icons.splice(k, 1);
    }
    let alive = icons.filter((ic) => !ic.dying).length;
    let spawns = alive < target() - 3 ? 3 : 1;
    while (alive < target() && spawns-- > 0 && spawn(!still)) alive++;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sy0 = window.scrollY;
    for (const ic of icons) {
      const inks = INKS_FOR[groundAtDoc(ic.y)] || INKS_FOR.paper;
      const img = sprites[ic.sprite][inks[ic.accent ? 1 : 0]];
      // lifted on a crest it rides a touch larger and darker
      const lift = Math.max(-1, Math.min(1, ic.lift / 3));
      const size = ic.size * (1 + lift * 0.18);
      ctx.globalAlpha = Math.max(0, ic.alpha) * Math.min(0.75, ic.peak * (1 + Math.abs(lift) * 1.2));
      ctx.save();
      ctx.translate(ic.x, ic.y - sy0);
      ctx.rotate(ic.a + ic.tip);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  const tick = (time, deltaMs) => {
    if (!sprites || document.hidden) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    step(dt);
    if (prefs.reduced) {
      // still icons: repaint only when the page has moved
      const key = `${Math.round(window.scrollY)}|${icons.length}`;
      if (key === lastDrawKey) return;
      lastDrawKey = key;
    }
    draw();
  };

  let cancelled = false;
  const offLayout = onLayout(measure);
  window.addEventListener('resize', resize);
  loadSprites(Math.round(PX * Math.min(window.devicePixelRatio || 1, 2))).then((s) => {
    if (cancelled) return;
    sprites = s;
    measure();
    for (let k = 0; k < target(); k++) spawn(true);
    canvas.classList.add('is-ready');
  });
  gsap.ticker.add(tick);

  return () => {
    cancelled = true;
    gsap.ticker.remove(tick);
    window.removeEventListener('resize', resize);
    offLayout();
  };
}
