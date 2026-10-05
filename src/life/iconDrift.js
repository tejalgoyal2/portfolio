import { gsap } from 'gsap';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { measureMask } from './paper';
import { groundAtDoc } from './ground';
import { sheets, sheetAt, sheetOfDocY, toScreen, toLocal, coveredFrom, naturalLayout } from './sheets';
import { loadSprites, INKS_FOR } from './sprites';

/**
 * A few of the pencil icons (matita.dev, MIT) drift across the bare paper —
 * about one per 110,000 px² of screen, so 8 to 14 at a time: faint, slow,
 * wandering, turning gently. They're printed on the sheets (sheet-local
 * coordinates, so they scroll, stick and settle with their sheet, and vanish
 * under the sheet laid over them) and they steer around text: every icon
 * keeps out of the page's text boxes, padded, and turns away before it
 * reaches one.
 *
 * A press on bare paper (`life:press`) drops a stone in the water: a damped
 * sine wave rings out from the point and dies within ~360 px. Its crests are
 * drawn as faint wavering rings, and as the packet passes, nearby icons are
 * pushed out and rock, then settle back into their drift. Ripples overlap
 * freely.
 *
 * One fixed canvas, redrawn each frame (a dozen sprites and a few rings).
 * Paused while the tab is hidden. Reduced motion: the icons sit still and
 * there are no ripples.
 */

const PX = 40; // css px the sprites are rasterised at
const PAD = 12; // clearance kept from text, on top of the icon's radius
const SPACING = 150; // icons keep at least this far apart
const RIPPLE = { speed: 290, wave: 44, reach: 360, amp: 10 };
const RING_INK = { paper: 'rgba(213,30,34,', ink: 'rgba(254,67,62,', red: 'rgba(244,240,230,' };

export function startIconDrift(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let dpr = 1;
  let W = 0;
  let H = 0;
  let sprites = null;
  let mask = []; // per sheet: text boxes in sheet-local coordinates, sorted by y
  const icons = [];
  const ripples = [];
  let clock = 0;
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
    const per = sheets.map(() => []);
    for (const b of measureMask(PAD)) {
      const i = sheetOfDocY(b.y + b.h / 2);
      if (per[i]) per[i].push({ x: b.x, y: b.y - sheets[i].top, w: b.w, h: b.h });
    }
    per.forEach((list) => list.sort((a, b) => a.y - b.y));
    mask = per;
    // the layout moved: anything now sitting on text fades away and is replaced
    for (const ic of icons) if (!free(ic.i, ic.x, ic.y, ic.r)) ic.dying = true;
  };

  /** Is a circle on sheet i clear of text, inside the sheet and the page? */
  function free(i, x, y, r) {
    const sh = sheets[i];
    if (!sh || x < r || x > W - r || y < r || y > sh.h - r) return false;
    const list = mask[i] || [];
    for (const b of list) {
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
    for (let tries = 0; tries < 40; tries++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      const i = sheetAt(sy);
      if (i < 0 || sy >= coveredFrom(i)) continue;
      const p = toLocal(i, sx, sy);
      const size = 26 + Math.random() * 12;
      const r = size / 2;
      if (!free(i, p.x, p.y, r)) continue;
      if (icons.some((o) => o.i === i && Math.hypot(o.x - p.x, o.y - p.y) < SPACING)) continue;
      icons.push({
        i,
        x: p.x,
        y: p.y,
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
        ox: 0,
        oy: 0,
        rock: 0,
        alpha: fadeIn ? 0 : 1,
        peak: 0.16 + Math.random() * 0.1,
        dying: false,
      });
      return true;
    }
    return false;
  }

  const onPress = (e) => {
    if (prefs.reduced) return;
    const { x, y, ground } = e.detail;
    const i = sheetAt(y);
    if (i < 0) return;
    const p = toLocal(i, x, y);
    ripples.push({ i, x: p.x, y: p.y, t0: clock, ground, R: 0 });
    if (ripples.length > 10) ripples.shift();
  };
  window.addEventListener('life:press', onPress);

  function step(dt) {
    const still = prefs.reduced;
    // ripples advance and die out
    for (let k = ripples.length - 1; k >= 0; k--) {
      const rp = ripples[k];
      rp.prev = rp.R;
      rp.R = (clock - rp.t0) * RIPPLE.speed;
      if (rp.R - RIPPLE.wave * 3 > RIPPLE.reach) ripples.splice(k, 1);
    }

    for (const ic of icons) {
      // fade in, or out when dying
      ic.alpha = ic.dying ? ic.alpha - dt * 1.4 : Math.min(1, ic.alpha + dt * 0.8);
      ic.ox = ic.oy = ic.rock = 0;
      if (still) continue;

      // the water: displacement while a packet passes, a push as its front does
      for (const rp of ripples) {
        if (rp.i !== ic.i) continue;
        const dx = ic.x - rp.x;
        const dy = ic.y - rp.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > RIPPLE.reach) continue;
        const env = Math.exp(-d / 170) * (1 - d / RIPPLE.reach);
        const behind = rp.R - d;
        if (behind > 0 && behind < RIPPLE.wave * 3) {
          const u = RIPPLE.amp * env * Math.sin((2 * Math.PI * behind) / RIPPLE.wave) * Math.exp(-behind / (1.4 * RIPPLE.wave));
          ic.ox += (dx / d) * u;
          ic.oy += (dy / d) * u;
          ic.rock += u * 0.04;
        }
        if (rp.prev < d && rp.R >= d) {
          ic.vx += (dx / d) * 80 * env;
          ic.vy += (dy / d) * 80 * env;
          ic.av += (Math.random() < 0.5 ? -1 : 1) * 1.6 * env;
        }
      }

      // a slow random walk, turning away from text before it gets there
      ic.dir += (Math.random() - 0.5) * 0.9 * dt;
      const ahead = 34;
      if (!free(ic.i, ic.x + Math.cos(ic.dir) * ahead, ic.y + Math.sin(ic.dir) * ahead, ic.r)) ic.dir += 2.4 * dt;
      const decay = Math.exp(-2.2 * dt);
      ic.vx *= decay;
      ic.vy *= decay;
      const nx = ic.x + (Math.cos(ic.dir) * ic.speed + ic.vx) * dt;
      const ny = ic.y + (Math.sin(ic.dir) * ic.speed + ic.vy) * dt;
      if (free(ic.i, nx, ny, ic.r)) {
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

    // off screen, or covered by the next sheet: retire, then keep the count up
    for (let k = icons.length - 1; k >= 0; k--) {
      const ic = icons[k];
      const s = toScreen(ic.i, ic.x, ic.y);
      const gone = s.x < -120 || s.x > W + 120 || s.y < -160 || s.y > H + 160;
      if (s.y - ic.r > coveredFrom(ic.i)) ic.dying = true;
      if (gone || ic.alpha <= 0) icons.splice(k, 1);
    }
    let alive = icons.filter((ic) => !ic.dying).length;
    let spawns = alive < target() - 3 ? 3 : 1;
    while (alive < target() && spawns-- > 0 && spawn(!still)) alive++;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const bySheet = new Map();
    for (const ic of icons) {
      if (!bySheet.has(ic.i)) bySheet.set(ic.i, { icons: [], ripples: [] });
      bySheet.get(ic.i).icons.push(ic);
    }
    for (const rp of ripples) {
      if (!bySheet.has(rp.i)) bySheet.set(rp.i, { icons: [], ripples: [] });
      bySheet.get(rp.i).ripples.push(rp);
    }
    for (const [i, group] of bySheet) {
      const sh = sheets[i];
      if (!sh) continue;
      const top = Math.max(0, sh.screenTop);
      const bottom = Math.min(H, coveredFrom(i));
      if (bottom <= top) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, W, bottom - top);
      ctx.clip();

      for (const rp of group.ripples) {
        const c = toScreen(i, rp.x, rp.y);
        const age = clock - rp.t0;
        for (let j = 0; j < 3; j++) {
          const rj = rp.R - j * RIPPLE.wave;
          if (rj <= 2 || rj > RIPPLE.reach) continue;
          const alpha = 0.34 * Math.exp(-rj / 150) * (1 - rj / RIPPLE.reach) * (1 - j * 0.3) * Math.min(1, age / 0.08);
          if (alpha < 0.01) continue;
          ctx.strokeStyle = `${RING_INK[rp.ground] || RING_INK.paper}${alpha.toFixed(3)})`;
          ctx.lineWidth = 1.3 * (1 - j * 0.22);
          ctx.beginPath();
          const n = Math.max(48, Math.round(rj * 0.5));
          for (let q = 0; q <= n; q++) {
            const th = (q / n) * Math.PI * 2;
            const rr = (rj + Math.sin(th * 6 + j * 1.3 + age * 4) * 1.5) * c.s;
            const px = c.x + Math.cos(th) * rr;
            const py = c.y + Math.sin(th) * rr;
            if (q === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }

      for (const ic of group.icons) {
        const s = toScreen(i, ic.x + ic.ox, ic.y + ic.oy);
        const inks = INKS_FOR[groundAtDoc(sh.top + ic.y)] || INKS_FOR.paper;
        const img = sprites[ic.sprite][inks[ic.accent ? 1 : 0]];
        const size = ic.size * s.s;
        ctx.globalAlpha = Math.max(0, ic.alpha) * ic.peak;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(ic.a + ic.rock);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
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
      const key = `${Math.round(window.scrollY)}|${icons.length}|${sheets.map((s) => s.s.toFixed(3)).join()}`;
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
    naturalLayout(measure);
    for (let k = 0; k < target(); k++) spawn(true);
    canvas.classList.add('is-ready');
  });
  gsap.ticker.add(tick);

  return () => {
    cancelled = true;
    gsap.ticker.remove(tick);
    window.removeEventListener('life:press', onPress);
    window.removeEventListener('resize', resize);
    offLayout();
  };
}
