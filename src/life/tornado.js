import { gsap } from 'gsap';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { clamp, hash } from './spring';
import { loadSprites } from './sprites';

/**
 * The Skills type case gets its slugs delivered by weather.
 *
 * As the case comes up the page it's empty — just the category labels. Then a
 * tornado appears far off, up by the headline at the back right: small, hazy,
 * a smudge of a shadow under it. It comes on in a zig-zag, swinging towards
 * you and across, growing as it nears, and goes out past you at the front
 * left, dragging a trail of dust behind it. It's drawn in ink: spiral strands
 * winding up it, tilted, wobbling rings, curls flung off the top, its height
 * and shape breathing as it goes — and it's full of the tools of the trade,
 * their logos whirling round it in their own colours. Every skill is inside
 * it too; as the funnel passes over a skill's slot, the slug is flung out and
 * drops home. Scroll back and it comes back for them.
 *
 * Where it is follows the scroll on a critically damped spring with a speed
 * limit — it travels, it never lurches, however hard the page is flung — and
 * it turns slowly and steadily on its own clock. The funnel and everything in
 * it sit on real 3D geometry, projected: the near side of each ring and strand
 * is drawn on a canvas in front of the slugs, the far side on one behind them,
 * and things further away are smaller and fainter.
 *
 * Only runs while the section is on screen. Reduced motion (or no JS): the
 * slugs are simply in their places.
 */
const INK = [28, 22, 18];
const RED = [213, 30, 34];
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${Math.max(0, a).toFixed(3)})`;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const bez = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;

export function startTornado(section) {
  if (prefs.reduced) return () => {};
  const grid = section.querySelector('.skill-index');
  const slugs = [...section.querySelectorAll('.skill')];
  if (!grid || !slugs.length) return () => {};

  const back = document.createElement('canvas');
  const front = document.createElement('canvas');
  back.className = 'tornado-canvas tornado-canvas--back';
  front.className = 'tornado-canvas tornado-canvas--front';
  back.setAttribute('aria-hidden', 'true');
  front.setAttribute('aria-hidden', 'true');
  section.prepend(back);
  section.appendChild(front);
  const bctx = back.getContext('2d');
  const fctx = front.getContext('2d');
  section.classList.add('has-tornado');

  let W = 0;
  let H = 0;
  let dpr = 1;
  let ground = 0; // the case's foot (section coordinates)
  let head = 0; // the headline's top, where it first appears
  let funnelH = 480;
  let homes = [];
  let P = null; // the U the funnel's foot travels along

  // debris: pencil icons, brand marks, paper scraps
  let icons = [];
  let brands = [];
  // debris is loaded the first time the section comes near, a little at a time:
  // the tools of the trade (a couple of dozen of them), in their own colours
  let fetched = false;
  const fetchDebris = () => {
    if (fetched) return;
    fetched = true;
    loadSprites(40).then((s) => (icons = s.map((set) => set.ink)));
    import('./brands').then(({ BRAND, brandSprites }) => {
      const all = Object.keys(BRAND);
      const pick = all.filter((_, i) => hash(i * 4.7) < 28 / all.length);
      brandSprites(56, null, pick).then((b) => (brands = b));
    });
  };
  const debris = Array.from({ length: 46 }, (_, i) => ({
    kind: i % 6 === 5 ? 'scrap' : i % 6 === 4 ? 'icon' : 'brand',
    pick: (hash(i * 9.1) * 1000) | 0,
    u0: hash(i * 1.3),
    rise: 0.05 + hash(i * 2.9) * 0.08,
    th: hash(i * 3.7) * 6.28,
    rf: 0.6 + hash(i * 5.1) * 0.5,
    size: 16 + hash(i * 6.3) * 14,
    spin: (hash(i * 7.3) - 0.5) * 6,
  }));

  const S = slugs.map((el, i) => ({
    el,
    h: 0.14 + hash(i * 3.17) * 0.74,
    th: hash(i * 5.3) * Math.PI * 2,
    w: 0.8 + hash(i * 1.9) * 0.6,
    tilt: (hash(i * 7.7) - 0.5) * 50,
    b: 0,
  }));

  const measure = () => {
    // sketchy ink lines don't need full Retina: 1.5× is plenty, and a lot lighter
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    slugs.forEach((el) => (el.style.transform = ''));
    const sr = section.getBoundingClientRect();
    W = section.clientWidth;
    H = section.offsetHeight;
    for (const c of [back, front]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.style.width = `${W}px`;
      c.style.height = `${H}px`;
    }
    const gr = grid.getBoundingClientRect();
    const hd = section.querySelector('.skills-head')?.getBoundingClientRect() || gr;
    head = hd.top - sr.top;
    ground = gr.bottom - sr.top + 10;
    funnelH = clamp(gr.height + 140, 360, 620);
    // from far off up by the headline (back right), round towards you, out at the front left
    P = {
      x: [W * 0.92, W * 0.62, -W * 0.3],
      y: [head + funnelH * 0.32, ground + 20, ground + 200],
    };
    trail.length = 0;
    homes = slugs.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
    });
    frame(0);
  };

  // the dust it drags behind it: where its foot has been
  const trail = [];
  let trailClock = 0;

  let clock = 0;
  let prog = 0;
  let pv = 0;
  let on = false;

  // it shows up as the headline comes on screen, and is through by the time
  // the case reaches the top
  const headEl = section.querySelector('.skills-head') || grid;
  const progress = () => {
    const r = headEl.getBoundingClientRect();
    const vh = window.innerHeight;
    return clamp((vh * 0.85 - r.top) / (vh * 1.05), 0, 1);
  };

  /** The funnel at a point of its run: foot position, size (depth), presence. */
  function funnelAt(p) {
    const q = smoother(clamp((p - 0.1) / 0.8, 0, 1));
    // the U, with a zig-zag on it: swinging across and in and out as it comes
    const zig = Math.sin(q * Math.PI * 3);
    const gx = bez(P.x[0], P.x[1], P.x[2], q) + zig * W * 0.07 * (0.4 + q);
    const gy = bez(P.y[0], P.y[1], P.y[2], q) + zig * 18 * q;
    const s = 0.18 + 1.2 * q ** 1.2 + zig * 0.07 * q;
    const fade = clamp(q / 0.05, 0, 1) * clamp((gx + W * 0.26) / (W * 0.2), 0, 1);
    return { q, gx, gy, s, alpha: fade * (0.32 + 0.68 * Math.min(1, s)) };
  }

  // the axis leans back from the way it's going (up and to the right) and sways
  // and its height and shape breathe as it goes
  const lean = () => 60 + Math.sin(clock * 0.45) * 24;
  const axisX = (f, u) => f.gx + (lean() * u ** 1.6 + Math.sin(u * 3.1 + clock * 0.9) * 24 * u + Math.sin(clock * 0.5) * 12 * u * u) * f.s;
  const tall = () => funnelH * (1 + 0.08 * Math.sin(clock * 0.55));
  const yAt = (f, u) => f.gy - u * tall() * f.s;
  const radius = (f, u) => (14 + 170 * u ** (1.5 + 0.22 * Math.sin(clock * 0.4))) * f.s;

  function strokeSplit(f, pts, lw, alpha, tint = INK) {
    // pts: [x, y, near(bool), fade]; consecutive runs go to the near or far canvas
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const ctx = b[2] ? fctx : bctx;
      ctx.strokeStyle = rgba(tint, alpha * b[3] * (b[2] ? 1 : 0.55));
      ctx.lineWidth = lw * (b[2] ? 1 : 0.7);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }

  function drawFunnel(f) {
    if (f.alpha <= 0.01) return;
    for (const c of [bctx, fctx]) c.lineCap = 'round';
    // spiral strands winding up the funnel
    for (let k = 0; k < 7; k++) {
      const pts = [];
      const th0 = (k / 7) * Math.PI * 2;
      for (let u = 0.02; u <= 1.0001; u += 0.025) {
        const a = th0 + u * Math.PI * 4.6 - clock * (1.5 - u * 0.5);
        const r = radius(f, u) * (0.92 + 0.08 * Math.sin(k * 2.1 + u * 9 + clock));
        const x = axisX(f, u) + Math.cos(a) * r;
        const y = yAt(f, u) + Math.sin(a) * r * 0.26;
        const fade = Math.sin(Math.PI * Math.min(1, u * 1.05)) * (0.55 + 0.45 * Math.sin(k * 1.7 + clock * 0.7) ** 2);
        pts.push([x, y, Math.sin(a) > 0, fade]);
      }
      strokeSplit(f, pts, (1 + (k % 3) * 0.45) * Math.max(0.6, f.s), f.alpha * 0.75);
    }
    // tilted, wobbling rings, drawn in broken arcs
    const rings = 13;
    for (let j = 0; j < rings; j++) {
      const u = (j + 0.6) / rings;
      const r0 = radius(f, u);
      const tilt = Math.atan2(axisX(f, u + 0.04) - axisX(f, u - 0.04), funnelH * f.s * 0.08) * 0.35 + Math.sin(clock * 0.9 + j) * 0.09;
      const cx = axisX(f, u);
      const cy = yAt(f, u);
      const spin = clock * (1.7 - u * 0.7) + j * 1.7;
      for (let k = 0; k < 2 + (j % 2); k++) {
        const a0 = spin + k * 2.4 + hash(j * 5 + k) * 0.8;
        const len = 0.9 + hash(j * 11 + k) * 1.4;
        const pts = [];
        for (let a = a0; a <= a0 + len; a += 0.1) {
          const r = r0 * (1 + 0.08 * Math.sin(3 * a + j + clock * 2));
          const ex = Math.cos(a) * r;
          const ey = Math.sin(a) * r * 0.24;
          pts.push([cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt), Math.sin(a) > 0, 1]);
        }
        const a = f.alpha * (0.25 + 0.45 * (1 - Math.abs(u - 0.55)));
        strokeSplit(f, pts, (1.2 + (1 - u) * 0.8) * Math.max(0.6, f.s), a);
      }
    }
    // curls flung off the top
    for (let k = 0; k < 4; k++) {
      const a0 = clock * 0.9 + k * 1.57;
      const pts = [];
      for (let t = 0; t <= 1; t += 0.06) {
        const a = a0 + t * 2.4;
        const r = radius(f, 1) * (1 + t * 0.55);
        pts.push([axisX(f, 1) + Math.cos(a) * r, yAt(f, 1) - t * 26 * f.s + Math.sin(a) * r * 0.22, Math.sin(a) > 0, 1 - t]);
      }
      strokeSplit(f, pts, 1.1 * Math.max(0.6, f.s), f.alpha * 0.5);
    }
    // debris climbing the spiral
    for (let i = 0; i < debris.length; i++) {
      const d = debris[i];
      const u = (d.u0 + clock * d.rise * 0.7) % 1;
      const th = d.th + clock * (1.3 - u * 0.5);
      const r = radius(f, u) * d.rf;
      const x = axisX(f, u) + Math.cos(th) * r;
      const y = yAt(f, u) + Math.sin(th) * r * 0.26;
      const near = Math.sin(th) > 0;
      const ctx = near ? fctx : bctx;
      const depth = (0.75 + 0.25 * Math.sin(th)) * f.s;
      const a = f.alpha * Math.sin(Math.PI * u) * (near ? 0.9 : 0.5);
      if (a < 0.02) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.rotate(clock * d.spin * 0.4 + th * 0.5);
      const sz = d.size * depth;
      if (d.kind === 'brand' && brands.length) {
        const b = brands[d.pick % brands.length];
        const k = sz / Math.max(b.w, b.h);
        ctx.drawImage(b.img, (-b.w * k) / 2, (-b.h * k) / 2, b.w * k, b.h * k);
      } else if (d.kind === 'icon' && icons.length) {
        ctx.drawImage(icons[d.pick % icons.length], -sz / 2, -sz / 2, sz, sz);
      } else {
        // a scrap of paper, catching the light as it turns
        ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.cos(clock * d.spin)));
        ctx.fillStyle = 'rgba(244,240,230,0.95)';
        ctx.strokeStyle = rgba(i % 4 === 0 ? RED : INK, 0.8);
        ctx.lineWidth = 1;
        ctx.fillRect(-sz * 0.35, -sz * 0.25, sz * 0.7, sz * 0.5);
        ctx.strokeRect(-sz * 0.35, -sz * 0.25, sz * 0.7, sz * 0.5);
      }
      ctx.restore();
    }
    // its shadow on the ground: soft, wider the nearer it is
    const sh = fctx.createRadialGradient(axisX(f, 0), f.gy + 6, 0, axisX(f, 0), f.gy + 6, 120 * f.s);
    sh.addColorStop(0, rgba(INK, 0.12 * f.alpha));
    sh.addColorStop(1, rgba(INK, 0));
    bctx.fillStyle = sh;
    bctx.beginPath();
    bctx.ellipse(axisX(f, 0), f.gy + 6, 120 * f.s, 22 * f.s, 0, 0, Math.PI * 2);
    bctx.fill();
    // dust where it touches down
    for (let i = 0; i < 7; i++) {
      const t = (clock * 0.85 + i / 7) % 1;
      const r = (22 + t * 80) * f.s;
      fctx.strokeStyle = rgba(INK, f.alpha * 0.32 * (1 - t));
      fctx.lineWidth = 1.2;
      fctx.beginPath();
      fctx.ellipse(axisX(f, 0) + (i % 2 ? 1 : -1) * t * 34 * f.s, f.gy + 4, r, r * 0.18, 0, Math.PI * 1.05, Math.PI * 1.95);
      fctx.stroke();
    }
  }

  function drawTrail(f) {
    // a dusty wake: puffs and scuffs along the way it came, fading behind it
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const age = (clock - t.t) / 2.2;
      if (age >= 1) continue;
      const a = (1 - age) ** 1.5 * f.alpha * 0.5;
      const r = (16 + age * 46) * t.s;
      bctx.strokeStyle = rgba(INK, a * 0.6);
      bctx.lineWidth = 1.1;
      bctx.beginPath();
      bctx.ellipse(t.x + Math.sin(i * 2.3) * 10 * t.s, t.y - age * 22 * t.s, r, r * 0.3, 0, Math.PI * 1.1, Math.PI * 1.9);
      bctx.stroke();
      if (i % 3 === 0) {
        bctx.fillStyle = rgba(INK, a * 0.5);
        bctx.fillRect(t.x + Math.cos(i * 1.7) * r, t.y - age * 30 * t.s - 4, 2, 2);
      }
    }
  }

  function placeSlugs(dt, f) {
    for (let i = 0; i < S.length; i++) {
      const s = S[i];
      const home = homes[i];
      if (!home) continue;
      const u = s.h;
      // the funnel has passed over this slot: fling the slug home (and back up if it returns)
      const goal = axisX(f, u) < home.x + 30 ? 1 : 0;
      s.b = dt === 0 ? goal : clamp(s.b + (goal ? 1.4 : -1.6) * dt, 0, 1);
      s.th += s.w * dt * (1.2 - u * 0.5);
      const r = radius(f, u) * 0.78;
      const depth = Math.sin(s.th);
      const ox = axisX(f, u) + Math.cos(s.th) * r;
      const oy = yAt(f, u) + depth * r * 0.26;
      const k = ease(s.b);
      const lift = Math.sin(Math.PI * k) * 70;
      const x = ox + (home.x - ox) * k;
      const y = oy + (home.y - oy) * k - lift;
      const scale = (0.62 + 0.2 * depth) * f.s * (1 - k) + k;
      const rot = (s.tilt + Math.sin(s.th * 2) * 30) * (1 - k);
      const el = s.el;
      if (k >= 0.999) {
        if (el.style.transform) {
          el.style.transform = '';
          el.style.zIndex = '';
          el.style.opacity = '';
        }
        continue;
      }
      el.style.transform = `translate3d(${(x - home.x).toFixed(1)}px,${(y - home.y).toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      el.style.zIndex = depth > 0 || k > 0.5 ? '3' : '1';
      const seen = Math.max(k, f.alpha * (0.5 + 0.5 * (depth + 1) / 2));
      el.style.opacity = seen.toFixed(2);
    }
  }

  function frame(dt) {
    clock += dt;
    const target = progress();
    if (dt === 0) {
      prog = target;
      pv = 0;
    } else {
      // a critically damped spring with a speed limit: it gathers pace and
      // eases in, and however hard the page is flung it never races
      const k = 8;
      pv += (k * (target - prog) - 2 * Math.sqrt(k) * pv) * dt;
      pv = clamp(pv, -0.45, 0.45);
      prog += pv * dt;
    }
    const f = funnelAt(prog);
    for (const ctx of [bctx, fctx]) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
    }
    trailClock += dt;
    if (trailClock > 0.07 && f.alpha > 0.05) {
      trailClock = 0;
      trail.push({ x: axisX(f, 0), y: f.gy, s: f.s, t: clock });
      if (trail.length > 34) trail.shift();
    }
    drawTrail(f);
    drawFunnel(f);
    placeSlugs(dt, f);
  }

  const tick = (t, deltaMs) => {
    if (!on || document.hidden || !P) return;
    frame(Math.min(0.05, deltaMs / 1000));
  };
  // the canvases only hold pixels while the section is near the screen
  const io = new IntersectionObserver(
    ([e]) => {
      on = e.isIntersecting;
      if (on) {
        fetchDebris();
        measure();
      }
      else for (const c of [back, front]) c.width = c.height = 0;
    },
    { rootMargin: '700px 0px' }
  );
  io.observe(section);
  const offLayout = onLayout(measure);
  window.addEventListener('resize', measure);
  measure();
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    io.disconnect();
    offLayout();
    window.removeEventListener('resize', measure);
    back.remove();
    front.remove();
    section.classList.remove('has-tornado');
    slugs.forEach((el) => {
      el.style.transform = '';
      el.style.zIndex = '';
      el.style.opacity = '';
    });
  };
}
