import { gsap } from 'gsap';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { measureMask } from './paper';
import { groundAtDoc } from './ground';
import { loadSprites, INKS_FOR } from './sprites';
import { settings, onSettings } from './settings';
import { scroll } from './scroll';

/**
 * A few of the pencil icons (matita.dev, MIT) drift across the bare paper —
 * about one per 110,000 px² of screen, so 8 to 14 at a time: faint, slow,
 * wandering, turning gently. They're printed on the page (document
 * coordinates, so they scroll with it) and they steer around text: every icon
 * keeps out of the page's text boxes, padded, and turns away before it
 * reaches one.
 *
 * A press on bare paper (`life:press`) drops a stone in the water: a damped
 * wave rings out from the point — four wavering crests in press red, the first
 * bold, a quick dent where it landed — and dies out within ~420 px. As its
 * front passes, each icon nearby gets one push outward and sways back on a soft
 * spring (never shaken crest by crest, so overlapping ripples stay smooth). A
 * few small sparks fly out of the splash too, slowing as they go, and knock
 * any icon they run into.
 *
 * How many icons there are follows Page settings (src/life/settings.js), and
 * ripples can be switched off there.
 *
 * One fixed canvas, redrawn each frame while anything is moving fast (a
 * ripple, sparks, an icon swaying back, the page scrolling) and at 30 fps
 * while the icons only drift. Paused while the tab is hidden. Reduced motion:
 * the icons sit still and there are no ripples.
 */

const PX = 40; // css px the sprites are rasterised at
const PAD = 12; // clearance kept from text, on top of the icon's radius
const SPACING = 150; // icons keep at least this far apart
const RIPPLE = { speed: 330, wave: 40, reach: 420, crests: 4, push: 210 };
/** How fast a ripple's front travels, px/s (the skills time their icons to it). */
export const RIPPLE_SPEED = RIPPLE.speed;
const SPRING = { k: 14, damp: 5.2 }; // ~0.5 s sway back, one soft overshoot

/** The offset an icon was pushed by eases home on a spring — smooth however many hits it took. */
function springBack(o, dt) {
  // a few substeps keep the spring steady on a slow frame
  const n = dt > 0.02 ? 2 : 1;
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    o.ovx += (-SPRING.k * o.ox - SPRING.damp * o.ovx) * h;
    o.ovy += (-SPRING.k * o.oy - SPRING.damp * o.ovy) * h;
    o.ox += o.ovx * h;
    o.oy += o.ovy * h;
    o.rockV += (-SPRING.k * 0.8 * o.rock - SPRING.damp * o.rockV) * h;
    o.rock += o.rockV * h;
  }
}
const RING_INK = { paper: [213, 30, 34], ink: [254, 67, 62], red: [244, 240, 230] };

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
  const ripples = [];
  let clock = 0;
  let lastDrawKey = '';
  let lastDrawY = NaN;
  let sinceDraw = 0;

  const resize = () => {
    // faint doodles and soft rings don't need a full retina buffer: 1.5× is
    // crisp enough and almost halves the canvas's memory on a 2× screen
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

  const target = () => Math.round(Math.max(8, Math.min(14, (W * H) / 110000)) * settings.drift);
  const sparks = [];

  function spawn(fadeIn = true) {
    const sy0 = scroll.y;
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
        sprite: (Math.random() * sprites.count) | 0,
        img: null,
        accent: Math.random() < 0.16,
        dir: Math.random() * Math.PI * 2,
        speed: 6 + Math.random() * 8,
        a: Math.random() * Math.PI * 2,
        av0: (Math.random() - 0.5) * 0.3,
        av: 0,
        vx: 0,
        vy: 0,
        ox: 0,
        oy: 0,
        ovx: 0,
        ovy: 0,
        rock: 0,
        rockV: 0,
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
    const sy0 = scroll.y;
    for (let k = ripples.length - 1; k >= 0; k--) {
      const rp = ripples[k];
      rp.prev = rp.R;
      rp.R = (clock - rp.t0) * RIPPLE.speed;
      if (rp.R - RIPPLE.wave * RIPPLE.crests > RIPPLE.reach) ripples.splice(k, 1);
    }
    for (const ic of icons) {
      ic.alpha = ic.dying ? ic.alpha - dt * 1.4 : Math.min(1, ic.alpha + dt * 0.8);
      if (still) continue;

      // the water: one push outward as a ripple's front passes, and a soft
      // spring sways the icon back (slightly under-damped: a single bob)
      for (const rp of ripples) {
        const dx = ic.x - rp.x;
        const dy = ic.y - rp.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > RIPPLE.reach || !(rp.prev < d && rp.R >= d)) continue;
        const env = Math.exp(-d / 210) * (1 - d / RIPPLE.reach);
        ic.ovx += (dx / d) * RIPPLE.push * env;
        ic.ovy += (dy / d) * RIPPLE.push * env;
        ic.vx += (dx / d) * 60 * env;
        ic.vy += (dy / d) * 60 * env;
        ic.rockV += (Math.random() < 0.5 ? -1 : 1) * 1.6 * env;
      }
      springBack(ic, dt);

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

    // sparks from a splash: fly out, slow down, fade; they knock icons they hit
    for (let k = sparks.length - 1; k >= 0; k--) {
      const sp = sparks[k];
      sp.age += dt;
      const drag = Math.exp(-2.6 * dt);
      sp.vx *= drag;
      sp.vy *= drag;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.a += sp.av * dt;
      sp.av *= drag;
      for (const ic of icons) {
        const dx = ic.x + ic.ox - sp.x;
        const dy = ic.y + ic.oy - sp.y;
        const d = Math.hypot(dx, dy) || 1;
        const reach = ic.r + sp.r;
        if (d < reach && !sp.hit.has(ic)) {
          sp.hit.add(ic);
          const sp2 = Math.hypot(sp.vx, sp.vy);
          ic.ovx += (dx / d) * (40 + sp2 * 0.55);
          ic.ovy += (dy / d) * (40 + sp2 * 0.55);
          ic.vx += (dx / d) * sp2 * 0.18;
          ic.vy += (dy / d) * sp2 * 0.18;
          ic.rockV += (Math.random() < 0.5 ? -1 : 1) * 2.2;
          // and the spark glances off
          sp.vx = -sp.vx * 0.35 + (Math.random() - 0.5) * 40;
          sp.vy = -sp.vy * 0.35 + (Math.random() - 0.5) * 40;
        }
      }
      if (sp.age > sp.life) sparks.splice(k, 1);
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

  function drawRipples(sy0) {
    for (const rp of ripples) {
      const cx = rp.x;
      const cy = rp.y - sy0;
      const age = clock - rp.t0;
      const [r, g, b] = RING_INK[rp.ground] || RING_INK.paper;
      // the dent where the stone went in
      if (age < 0.35) {
        const k = 1 - age / 0.35;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 34 + age * 120);
        grad.addColorStop(0, `rgba(${r},${g},${b},${(0.22 * k).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 34 + age * 120, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let j = 0; j < RIPPLE.crests; j++) {
        const rj = rp.R - j * RIPPLE.wave;
        if (rj <= 2 || rj > RIPPLE.reach) continue;
        const fade = (1 - rj / RIPPLE.reach) ** 1.4;
        const alpha = 0.62 * fade * (1 - j * 0.22) * Math.min(1, age / 0.06);
        if (alpha < 0.01) continue;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.lineWidth = (j === 0 ? 2.6 : 1.6) * (0.6 + 0.4 * fade);
        ctx.beginPath();
        const n = Math.max(56, Math.round(rj * 0.6));
        for (let q = 0; q <= n; q++) {
          const th = (q / n) * Math.PI * 2;
          const rr = rj + Math.sin(th * 7 + j * 1.3 + age * 5) * 2 * fade + Math.sin(th * 3 - age * 3) * 1.4;
          const px = cx + Math.cos(th) * rr;
          const py = cy + Math.sin(th) * rr;
          if (q === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sy0 = scroll.y;
    drawRipples(sy0);
    for (const sp of sparks) {
      const inks = INKS_FOR[sp.ground] || INKS_FOR.paper;
      const img = (sp.img = sprites.get(sp.sprite, inks[sp.accent ? 1 : 0]) || sp.img);
      if (!img) continue;
      // in quick, out slow
      const t = sp.age / sp.life;
      ctx.globalAlpha = Math.min(1, sp.age / 0.08) * (1 - t) ** 1.6 * 0.6;
      ctx.save();
      ctx.translate(sp.x, sp.y - sy0);
      ctx.rotate(sp.a);
      const s = sp.size * (0.6 + 0.4 * Math.min(1, sp.age / 0.2));
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    for (const ic of icons) {
      const inks = INKS_FOR[groundAtDoc(ic.y)] || INKS_FOR.paper;
      // a new ink is made the first time it's needed; until then the old one stands in
      const img = (ic.img = sprites.get(ic.sprite, inks[ic.accent ? 1 : 0]) || ic.img);
      if (!img) continue;
      ctx.globalAlpha = Math.max(0, ic.alpha) * ic.peak;
      ctx.save();
      ctx.translate(ic.x + ic.ox, ic.y + ic.oy - sy0);
      ctx.rotate(ic.a + ic.rock);
      ctx.drawImage(img, -ic.size / 2, -ic.size / 2, ic.size, ic.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  const tick = (time, deltaMs) => {
    if (!sprites || document.hidden) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    clock += dt;
    step(dt);
    if (prefs.reduced) {
      // still icons: repaint only when the page has moved
      const key = `${Math.round(scroll.y)}|${icons.length}`;
      if (key === lastDrawKey) return;
      lastDrawKey = key;
    }
    // only drifting: a slow wander reads the same at 30 fps, for half the work
    sinceDraw += dt;
    const busy =
      ripples.length > 0 ||
      sparks.length > 0 ||
      scroll.y !== lastDrawY ||
      icons.some((ic) => ic.alpha < 1 || Math.abs(ic.ox) + Math.abs(ic.oy) > 0.3 || Math.abs(ic.rock) > 0.004);
    if (!busy && sinceDraw < 1 / 30 - 0.002) return;
    sinceDraw = 0;
    lastDrawY = scroll.y;
    draw();
  };

  const onPress = (e) => {
    if (prefs.reduced || !settings.ripples || !sprites) return;
    const { x, y, ground } = e.detail;
    const docY = y + window.scrollY;
    ripples.push({ x, y: docY, t0: clock, ground, R: 0, prev: 0 });
    if (ripples.length > 10) ripples.shift();
    // a handful of sparks thrown out of the splash, evenly round with a wobble
    const n = 5 + ((Math.random() * 3) | 0);
    const th0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const th = th0 + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const v = 300 + Math.random() * 260;
      sparks.push({
        x,
        y: docY,
        vx: Math.cos(th) * v,
        vy: Math.sin(th) * v,
        r: 9,
        size: 16 + Math.random() * 7,
        a: Math.random() * Math.PI * 2,
        av: (Math.random() - 0.5) * 9,
        sprite: (Math.random() * sprites.count) | 0,
        img: null,
        accent: Math.random() < 0.4,
        ground,
        age: 0,
        life: 1.5 + Math.random() * 0.7,
        hit: new Set(),
      });
    }
    if (sparks.length > 40) sparks.splice(0, sparks.length - 40);
  };
  window.addEventListener('life:press', onPress);
  // fewer or more icons, from Page settings: the extras drift off or float in
  const offSettings = onSettings((_, key) => {
    if (key !== 'drift') return;
    const alive = icons.filter((ic) => !ic.dying);
    for (let i = target(); i < alive.length; i++) alive[i].dying = true;
  });

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
    window.removeEventListener('life:press', onPress);
    window.removeEventListener('resize', resize);
    offSettings();
    offLayout();
  };
}
