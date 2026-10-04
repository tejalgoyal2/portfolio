import { gsap } from 'gsap';
import { prefs } from './prefs';
import { pointer } from './pointer';
import { scroll } from './scroll';
import { groundAt } from './ground';

/**
 * Icon rain — what the DO NOT PRESS stamp does. A fistful of matita.dev's
 * hand-drawn pencil icons (MIT, vendored in ./icons) drops down the viewport
 * with a little circle physics: gravity, a floor, walls, and icons shouldering
 * each other into a pile. Scrolling, or flicking the pointer through the pile,
 * sends them flying off the sheet; after ~12 s the floor gives way and the
 * rest fall out by themselves. Each icon is inked for the ground it's over —
 * ink on the cream, paper on the dark spreads, a few in red.
 *
 * One fixed canvas that only ticks while icons are on screen. Reduced motion:
 * they arrive already piled, sit still, and fade out.
 */

const COUNT = 64;
const MAX = 140;
const LIFE = 12;
const GRAVITY = 2600;
const INKS = { ink: '#1c140e', paper: '#f4f0e6', red: '#d51e22', redLift: '#fe433e' };
const FOR_GROUND = {
  paper: ['ink', 'red'],
  ink: ['paper', 'redLift'],
  red: ['paper', 'ink'],
};

let sprites = null; // name → colour → HTMLImageElement
async function loadSprites(px) {
  if (sprites) return sprites;
  const { ICONS } = await import('./icons');
  const out = [];
  await Promise.all(
    ICONS.map(async (svg) => {
      const set = {};
      await Promise.all(
        Object.entries(INKS).map(
          ([name, hex]) =>
            new Promise((resolve) => {
              const src = svg
                .replace(/stroke="currentColor"/g, `stroke="${hex}"`)
                .replace(/width="24" height="24"/, `width="${px}" height="${px}"`);
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
              set[name] = img;
            })
        )
      );
      out.push(set);
    })
  );
  sprites = out;
  return sprites;
}

export function startIconRain(canvas) {
  const ctx = canvas.getContext('2d');
  let icons = [];
  let running = false;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let size = 44;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = document.documentElement.clientWidth;
    H = window.innerHeight;
    size = W < 720 ? 36 : 46;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  };
  resize();
  window.addEventListener('resize', resize);

  function spawn(n) {
    for (let i = 0; i < n && icons.length < MAX; i++) {
      const r = size * 0.42;
      icons.push({
        sprite: (Math.random() * sprites.length) | 0,
        accent: Math.random() < 0.22,
        r,
        x: r + Math.random() * (W - 2 * r),
        y: -r - Math.random() * H * 0.9,
        vx: (Math.random() - 0.5) * 120,
        vy: Math.random() * 160,
        a: Math.random() * Math.PI * 2,
        av: (Math.random() - 0.5) * 5,
        age: 0,
        free: false, // swept: no floor or walls, it leaves the sheet
        alpha: 1,
      });
    }
  }

  function step(dt) {
    const floorOpen = (ic) => ic.free || ic.age > LIFE;
    for (const ic of icons) {
      ic.age += dt;
      ic.vy += GRAVITY * dt;
      const damp = Math.exp(-0.35 * dt);
      ic.vx *= damp;
      ic.x += ic.vx * dt;
      ic.y += ic.vy * dt;
      ic.a += ic.av * dt;
      if (ic.age > LIFE) ic.alpha = Math.max(0, ic.alpha - dt * 1.2);
      if (floorOpen(ic)) continue;
      if (ic.y > H - ic.r) {
        ic.y = H - ic.r;
        if (ic.vy > 0) ic.vy = -ic.vy * 0.26;
        ic.vx *= 0.9;
        ic.av = ic.av * 0.6 + (ic.vx / ic.r) * 0.4; // roll along the floor
      }
      if (ic.x < ic.r) {
        ic.x = ic.r;
        ic.vx = Math.abs(ic.vx) * 0.4;
      } else if (ic.x > W - ic.r) {
        ic.x = W - ic.r;
        ic.vx = -Math.abs(ic.vx) * 0.4;
      }
    }
    // shoulder each other into a pile (a few relaxation passes)
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < icons.length; i++) {
        const a = icons[i];
        if (a.free) continue;
        for (let j = i + 1; j < icons.length; j++) {
          const b = icons[j];
          if (b.free) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const min = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min || d2 === 0) continue;
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          const push = (min - d) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          if (pass === 0) {
            const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rel < 0) {
              const imp = -rel * 0.6;
              a.vx -= nx * imp;
              a.vy -= ny * imp;
              b.vx += nx * imp;
              b.vy += ny * imp;
            }
          }
        }
      }
    }
  }

  function sweep(dt) {
    // a scroll flings the pile off the sheet, outward from the middle
    const sv = Math.abs(scroll.v);
    if (sv > 260) {
      for (const ic of icons) {
        if (ic.free) continue;
        ic.free = true;
        const dir = ic.x < W / 2 ? -1 : 1;
        ic.vx = dir * (500 + Math.random() * 900) * Math.min(2, sv / 900);
        ic.vy = -(500 + Math.random() * 700) * Math.min(1.6, sv / 900);
        ic.av = dir * (6 + Math.random() * 8);
      }
    }
    // a flick through the pile bats whatever it touches
    if (pointer.active && pointer.speed > 700) {
      for (const ic of icons) {
        const dx = ic.x - pointer.x;
        const dy = ic.y - pointer.y;
        if (dx * dx + dy * dy > (ic.r + 40) ** 2) continue;
        ic.vx += pointer.vx * 0.9;
        ic.vy += pointer.vy * 0.9 - 200;
        ic.av += pointer.vx / 120;
        if (Math.hypot(ic.vx, ic.vy) > 900) ic.free = true;
      }
    }
    void dt;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const ic of icons) {
      if (ic.y < -ic.r * 2) continue;
      const pair = FOR_GROUND[groundAt(ic.y)] || FOR_GROUND.paper;
      const img = sprites[ic.sprite][ic.accent ? pair[1] : pair[0]];
      ctx.globalAlpha = ic.alpha;
      ctx.save();
      ctx.translate(ic.x, ic.y);
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
        if (ic.age > LIFE) ic.alpha = Math.max(0, ic.alpha - dt * 1.2);
      }
    } else {
      sweep(dt);
      step(dt);
    }
    icons = icons.filter((ic) => ic.alpha > 0 && ic.y < H + ic.r * 3 && ic.x > -ic.r * 4 && ic.x < W + ic.r * 4);
    draw();
    if (icons.length === 0) {
      running = false;
      gsap.ticker.remove(tick);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const onRain = async () => {
    await loadSprites(Math.round(size * dpr));
    spawn(COUNT);
    if (prefs.reduced) {
      // settle the pile off-screen, then show it still
      for (let i = 0; i < 360; i++) step(1 / 60);
      for (const ic of icons) ic.age = Math.min(ic.age, 0.5);
    }
    if (!running) {
      running = true;
      gsap.ticker.add(tick);
    }
  };
  window.addEventListener('life:rain', onRain);

  return () => {
    window.removeEventListener('life:rain', onRain);
    window.removeEventListener('resize', resize);
    gsap.ticker.remove(tick);
  };
}
