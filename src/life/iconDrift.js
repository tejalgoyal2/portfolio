import { gsap } from 'gsap';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { measureMask } from './paper';
import { groundAtDoc } from './ground';
import { loadSprites, INKS_FOR } from './sprites';

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
 * bold, a quick dent where it landed — and dies out within ~420 px. As the
 * packet passes, nearby icons are shoved outward and rock, then settle back
 * into their drift. Ripples overlap freely.
 *
 * One fixed canvas, redrawn each frame (a dozen sprites and a few rings).
 * Paused while the tab is hidden. Reduced motion: the icons sit still and
 * there are no ripples.
 */

const PX = 40; // css px the sprites are rasterised at
const PAD = 12; // clearance kept from text, on top of the icon's radius
const SPACING = 150; // icons keep at least this far apart
const RIPPLE = { speed: 330, wave: 40, reach: 420, amp: 16, crests: 4 };
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

  function step(dt) {
    const still = prefs.reduced;
    const sy0 = window.scrollY;
    for (let k = ripples.length - 1; k >= 0; k--) {
      const rp = ripples[k];
      rp.prev = rp.R;
      rp.R = (clock - rp.t0) * RIPPLE.speed;
      if (rp.R - RIPPLE.wave * RIPPLE.crests > RIPPLE.reach) ripples.splice(k, 1);
    }
    for (const ic of icons) {
      ic.alpha = ic.dying ? ic.alpha - dt * 1.4 : Math.min(1, ic.alpha + dt * 0.8);
      if (still) continue;

      // the water: displaced while a packet passes, shoved as its front does
      ic.ox = ic.oy = ic.rock = 0;
      for (const rp of ripples) {
        const dx = ic.x - rp.x;
        const dy = ic.y - rp.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > RIPPLE.reach) continue;
        const env = Math.exp(-d / 210) * (1 - d / RIPPLE.reach);
        const behind = rp.R - d;
        if (behind > 0 && behind < RIPPLE.wave * RIPPLE.crests) {
          const u = RIPPLE.amp * env * Math.sin((2 * Math.PI * behind) / RIPPLE.wave) * Math.exp(-behind / (1.6 * RIPPLE.wave));
          ic.ox += (dx / d) * u;
          ic.oy += (dy / d) * u;
          ic.rock += u * 0.05;
        }
        if (rp.prev < d && rp.R >= d) {
          ic.vx += (dx / d) * 150 * env;
          ic.vy += (dy / d) * 150 * env;
          ic.av += (Math.random() < 0.5 ? -1 : 1) * 2.4 * env;
        }
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
    const sy0 = window.scrollY;
    drawRipples(sy0);
    for (const ic of icons) {
      const inks = INKS_FOR[groundAtDoc(ic.y)] || INKS_FOR.paper;
      const img = sprites[ic.sprite][inks[ic.accent ? 1 : 0]];
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
      const key = `${Math.round(window.scrollY)}|${icons.length}`;
      if (key === lastDrawKey) return;
      lastDrawKey = key;
    }
    draw();
  };

  const onPress = (e) => {
    if (prefs.reduced) return;
    const { x, y, ground } = e.detail;
    ripples.push({ x, y: y + window.scrollY, t0: clock, ground, R: 0, prev: 0 });
    if (ripples.length > 10) ripples.shift();
  };
  window.addEventListener('life:press', onPress);

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
    offLayout();
  };
}
