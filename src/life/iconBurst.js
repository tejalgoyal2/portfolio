import { gsap } from 'gsap';
import { prefs } from './prefs';
import { pointer } from './pointer';
import { scroll } from './scroll';
import { onLayout } from './layout';
import { groundAtDoc } from './ground';
import { loadSprites, INKS_FOR } from './sprites';

/**
 * Press and hold on bare paper to print: on release (`life:burst`), a splash
 * of pencil icons bursts from that point like ink off a press — the longer
 * the hold, the bigger the splash (6 to 36). They fall with simple physics
 * and come to rest on the top edges of the headlines and cards below them,
 * shouldering each other into small heaps. When the page scrolls they're
 * shaken off and fall away; whatever's left clears itself after ~12 s.
 *
 * The icons live on the page (document coordinates), so they scroll with it,
 * and each is inked for the ground it's over. One fixed canvas that only ticks
 * while icons exist. Reduced motion: the splash appears already
 * settled, sits still, and fades.
 */

const PX = 46;
const LIFE = 12;
const GRAVITY = 2400;
const MIN = 6;
const MAX = 36;

export function startIconBurst(canvas) {
  const ctx = canvas.getContext('2d');
  let icons = [];
  let running = false;
  let platforms = []; // { x0, x1, y } top edges, document coordinates
  let W = 0;
  let H = 0;
  let dpr = 1;
  let size = 40;
  let sprites = null;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = document.documentElement.clientWidth;
    H = window.innerHeight;
    size = W < 720 ? 32 : 40;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  };

  // where icons can land: the top edge of every headline (its capitals, not its
  // line box — and only its first line; the lines below are tucked under it)
  // and every card
  const metrics = document.createElement('canvas').getContext('2d');
  const capDrop = (el) => {
    // how far below an inline box's top the capitals start, from the font itself
    const cs = getComputedStyle(el);
    metrics.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = metrics.measureText('H');
    return Math.max(0, (m.fontBoundingBoxAscent || 0) - (m.actualBoundingBoxAscent || 0));
  };
  const measure = () => {
    resize();
    const out = [];
    const sy = window.scrollY;
    const add = (r, drop = 0) => {
      if (r.width >= 8) out.push({ x0: r.left, x1: r.right, y: r.top + drop + sy });
    };
    for (const set of document.querySelectorAll('.kinetic > .kh-set')) {
      const rects = [...set.getClientRects()].filter((r) => r.width > 8);
      if (!rects.length) continue;
      const drop = capDrop(set);
      const top = Math.min(...rects.map((r) => r.top));
      for (const r of rects) if (r.top - top < 4) add(r, drop);
    }
    const range = document.createRange();
    for (const el of document.querySelectorAll('.mast-plate .np')) {
      const drop = capDrop(el);
      range.selectNodeContents(el);
      for (const r of range.getClientRects()) add(r, drop);
    }
    for (const el of document.querySelectorAll('.case-file')) add(el.getBoundingClientRect());
    platforms = out;
  };
  const offLayout = onLayout(measure);
  window.addEventListener('resize', resize);
  measure();

  function burst(x, y, amount) {
    const p = { x, y: y + window.scrollY };
    const n = Math.round(MIN + (MAX - MIN) * Math.min(1, Math.max(0, amount)));
    const power = 0.7 + 0.6 * amount;
    for (let k = 0; k < n; k++) {
      // a splash: mostly up and out, a few straight up
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const sp = (380 + Math.random() * 620) * power;
      icons.push({
        sprite: (Math.random() * sprites.length) | 0,
        accent: Math.random() < 0.22,
        r: size * 0.4,
        x: p.x + (Math.random() - 0.5) * 8,
        y: p.y + (Math.random() - 0.5) * 8,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        a: Math.random() * Math.PI * 2,
        av: (Math.random() - 0.5) * 14,
        age: 0,
        resting: false,
        free: false, // shaken off: no more landing
        alpha: 1,
      });
    }
    if (icons.length > 160) icons = icons.slice(icons.length - 160);
  }

  function land(ic, prevY) {
    if (ic.free || ic.vy < 0) return false;
    for (const pl of platforms) {
      if (ic.x < pl.x0 - ic.r * 0.3 || ic.x > pl.x1 + ic.r * 0.3) continue;
      const top = pl.y - ic.r;
      if (prevY <= top + 0.5 && ic.y >= top) {
        ic.y = top;
        ic.vy = ic.vy > 220 ? -ic.vy * 0.28 : 0;
        ic.vx *= 0.82;
        ic.av = ic.av * 0.5 + (ic.vx / ic.r) * 0.5;
        return true;
      }
    }
    return false;
  }

  function step(dt) {
    // a scroll shakes everything loose
    if (Math.abs(scroll.v) > 160) {
      for (const ic of icons) {
        if (ic.free) continue;
        ic.free = true;
        ic.vy = Math.min(ic.vy, -(180 + Math.random() * 260));
        ic.vx += (Math.random() - 0.5) * 420;
        ic.av += (Math.random() - 0.5) * 10;
      }
    }
    // a flick through a heap bats whatever it touches
    if (pointer.active && pointer.speed > 900) {
      for (const ic of icons) {
        const sy = ic.y - window.scrollY;
        if ((ic.x - pointer.x) ** 2 + (sy - pointer.y) ** 2 > (ic.r + 36) ** 2) continue;
        ic.vx += pointer.vx * 0.8;
        ic.vy += pointer.vy * 0.8 - 160;
        ic.av += pointer.vx / 140;
        ic.resting = false;
      }
    }
    for (const ic of icons) {
      ic.age += dt;
      if (ic.age > LIFE) ic.alpha = Math.max(0, ic.alpha - dt * 1.3);
      const prevY = ic.y;
      ic.vy += GRAVITY * dt;
      ic.vx *= Math.exp(-0.5 * dt);
      ic.x += ic.vx * dt;
      ic.y += ic.vy * dt;
      ic.a += ic.av * dt;
      ic.resting = land(ic, prevY);
      if (ic.resting) ic.av *= Math.exp(-6 * dt);
    }
    // shoulder each other into heaps
    for (let pass = 0; pass < 3; pass++) {
      for (let a = 0; a < icons.length; a++) {
        const A = icons[a];
        if (A.free) continue;
        for (let b = a + 1; b < icons.length; b++) {
          const B = icons[b];
          if (B.free) continue;
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const min = A.r + B.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min || d2 === 0) continue;
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          const push = (min - d) / 2;
          A.x -= nx * push;
          A.y -= ny * push;
          B.x += nx * push;
          B.y += ny * push;
          if (pass === 0) {
            const rel = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
            if (rel < 0) {
              const imp = -rel * 0.55;
              A.vx -= nx * imp;
              A.vy -= ny * imp;
              B.vx += nx * imp;
              B.vy += ny * imp;
            }
          }
        }
      }
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sy = window.scrollY;
    for (const ic of icons) {
      const y = ic.y - sy;
      if (y < -ic.r * 2 || y > H + ic.r * 2) continue;
      const inks = INKS_FOR[groundAtDoc(ic.y)] || INKS_FOR.paper;
      const img = sprites[ic.sprite][inks[ic.accent ? 1 : 0]];
      ctx.globalAlpha = ic.alpha;
      ctx.save();
      ctx.translate(ic.x, y);
      ctx.rotate(ic.a);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  const tick = (time, deltaMs) => {
    if (document.hidden) return;
    const dt = Math.min(1 / 30, deltaMs / 1000);
    if (prefs.reduced) {
      for (const ic of icons) {
        ic.age += dt;
        if (ic.age > LIFE || Math.abs(scroll.v) > 160) ic.alpha = Math.max(0, ic.alpha - dt * 1.3);
      }
    } else step(dt);
    icons = icons.filter((ic) => {
      if (ic.alpha <= 0) return false;
      const y = ic.y - window.scrollY;
      return y < H + ic.r * 4 && ic.x > -ic.r * 6 && ic.x < W + ic.r * 6;
    });
    draw();
    if (icons.length === 0) {
      running = false;
      gsap.ticker.remove(tick);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const onBurst = async (e) => {
    const { x, y, amount } = e.detail;
    sprites = await loadSprites(Math.round(PX * dpr));
    burst(x, y, amount);
    if (prefs.reduced) {
      // let the splash settle off-screen, then show it still
      for (let k = 0; k < 240; k++) step(1 / 60);
      for (const ic of icons) ic.age = Math.min(ic.age, 0.5);
    }
    if (!running) {
      running = true;
      gsap.ticker.add(tick);
    }
  };
  window.addEventListener('life:burst', onBurst);

  return () => {
    window.removeEventListener('life:burst', onBurst);
    window.removeEventListener('resize', resize);
    offLayout();
    gsap.ticker.remove(tick);
  };
}
