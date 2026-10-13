import { gsap } from 'gsap';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { clamp, hash } from './spring';
import { loadSprites, INKS } from './sprites';

/**
 * The Skills type case gets its slugs delivered by weather.
 *
 * As the case comes up the page it's empty — just the category labels — and
 * the wind gets up: strokes of air of every sort (long easy gusts, a
 * loop-the-loop, a doubled stroke, a broken one) and leaves of every sort
 * tumbling through. Then the tornado arrives. It doesn't slide in from the
 * side: it comes from far off at the back right, small and hazy, swings round
 * towards you in a wide U and goes out past you at the front left — growing as
 * it comes, leaning back from the way it's going, swaying. It's drawn in ink:
 * spiral strands winding up it, tilted, wobbling rings, curls flung off the
 * top, dust at its foot, and debris climbing it — pencil icons, scraps of
 * paper, the logos of the tools themselves. Every skill is inside it,
 * whirling; as the funnel passes over a skill's slot, the slug is flung out
 * and drops home. Scroll back and it comes back for them.
 *
 * Where the tornado is follows the scroll on a critically damped spring (it
 * travels, never jumps); its spin runs on its own clock, so it stays alive
 * while you pause. The funnel and everything in it sit on real 3D geometry,
 * projected: the near side of each ring and strand is drawn on a canvas in
 * front of the slugs, the far side on one behind them, and things further
 * away are smaller and fainter.
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
  let top = 0; // the case's top edge
  let funnelH = 480;
  let homes = [];
  let P = null; // the U the funnel's foot travels along

  // debris: pencil icons, brand marks, paper scraps
  let icons = [];
  let brands = [];
  loadSprites(40).then((s) => (icons = s.map((set) => set.ink)));
  import('./brands').then(({ brandSprites }) => brandSprites(48, INKS.ink).then((b) => (brands = b)));
  const debris = Array.from({ length: 40 }, (_, i) => ({
    kind: i % 3 === 0 ? 'brand' : i % 3 === 1 ? 'icon' : 'scrap',
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
    w: 1.5 + hash(i * 1.9) * 1.3,
    tilt: (hash(i * 7.7) - 0.5) * 50,
    b: 0,
  }));

  const measure = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    top = gr.top - sr.top;
    ground = gr.bottom - sr.top + 10;
    funnelH = clamp(gr.height + 140, 360, 620);
    // from far back right (high on the page, small), round towards you, out at the front left
    P = {
      x: [W + 140, W * 0.66, -W * 0.32],
      y: [top + 40, ground + 30, ground + 190],
    };
    homes = slugs.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
    });
    frame(0);
  };

  // ---- the weather
  const WINDS = ['gust', 'loop', 'double', 'gust', 'dash', 'loop', 'gust', 'double', 'dash', 'gust'];
  const winds = WINDS.map((kind, i) => ({
    kind,
    y: hash(i * 2.3),
    x: hash(i * 4.1) * 1.4 - 0.2,
    len: 170 + hash(i * 6.6) * 240,
    sp: 240 + hash(i * 8.8) * 200,
    ph: hash(i * 1.1) * 10,
    w: 1.1 + hash(i * 3.3) * 0.9,
  }));
  const LEAVES = ['almond', 'round', 'maple', 'long', 'almond', 'oak', 'round', 'long', 'maple', 'almond', 'oak', 'round', 'long'];
  const leaves = LEAVES.map((shape, i) => ({
    shape,
    x: hash(i * 3.3) * 1.2,
    y: hash(i * 5.5),
    a: hash(i * 7.1) * 6,
    s: 6 + hash(i * 2.2) * 7,
    tone: i % 4 === 0 ? 'red' : i % 5 === 2 ? 'ink' : 'paper',
    caught: 0,
    oth: hash(i * 4.4) * 6,
    oh: 0.2 + hash(i * 6.2) * 0.6,
  }));

  let clock = 0;
  let prog = 0;
  let pv = 0;
  let on = false;

  const progress = () => {
    const r = grid.getBoundingClientRect();
    const vh = window.innerHeight;
    return clamp((vh * 1.0 - r.top) / (vh * 0.85), 0, 1);
  };

  /** The funnel at a point of its run: foot position, size (depth), presence. */
  function funnelAt(p) {
    const q = smoother(clamp((p - 0.16) / 0.76, 0, 1));
    const gx = bez(P.x[0], P.x[1], P.x[2], q);
    const gy = bez(P.y[0], P.y[1], P.y[2], q);
    const s = 0.3 + 1.0 * q ** 1.15;
    const fade = clamp(q / 0.06, 0, 1) * clamp((gx + W * 0.28) / (W * 0.2), 0, 1);
    return { q, gx, gy, s, alpha: fade * (0.42 + 0.58 * Math.min(1, s)) };
  }

  // the axis leans back from the way it's going (up and to the right) and sways
  const axisX = (f, u) => f.gx + (70 * u ** 1.6 + Math.sin(u * 3.1 + clock * 1.25) * 24 * u + Math.sin(clock * 0.6) * 12 * u * u) * f.s;
  const yAt = (f, u) => f.gy - u * funnelH * f.s;
  const radius = (f, u) => (14 + 170 * u ** 1.5) * f.s;

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
        const a = th0 + u * Math.PI * 4.6 - clock * (3.1 - u * 1.4);
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
      const spin = clock * (3.6 - u * 1.8) + j * 1.7;
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
      const a0 = clock * 1.6 + k * 1.57;
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
      const u = (d.u0 + clock * d.rise) % 1;
      const th = d.th + clock * (2.8 - u * 1.3);
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
      ctx.rotate(clock * d.spin + th);
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

  function drawWind(amt, f) {
    if (amt <= 0.01) return;
    const y0 = top - 70;
    const y1 = ground - 20;
    bctx.lineCap = 'round';
    for (const wd of winds) {
      const span = W + wd.len * 2;
      const head = ((wd.x * span + clock * wd.sp) % span) - wd.len;
      const y = y0 + wd.y * (y1 - y0);
      const pts = [];
      for (let q = 0; q <= 1.0001; q += 0.03) {
        let x = head - q * wd.len;
        let yy = y + Math.sin(x * 0.011 + wd.ph + clock) * 9;
        if (wd.kind === 'loop' && q > 0.3 && q < 0.62) {
          // a loop-the-loop in the middle of the stroke
          const c = ((q - 0.3) / 0.32) * Math.PI * 2;
          x += Math.sin(c) * 16;
          yy -= (1 - Math.cos(c)) * 14;
        }
        // the funnel draws the air in towards it
        const d = x - f.gx;
        yy += Math.exp(-(d * d) / (70000 * f.s)) * (f.gy - funnelH * f.s * 0.4 - yy) * 0.22 * f.alpha;
        pts.push([x, yy, q]);
      }
      const passes = wd.kind === 'double' ? [0, 5] : [0];
      for (const off of passes) {
        for (let k = 1; k < pts.length; k++) {
          const [xa, ya] = pts[k - 1];
          const [xb, yb, q] = pts[k];
          if (wd.kind === 'dash' && Math.floor(q * 9) % 2) continue;
          bctx.strokeStyle = rgba(INK, amt * 0.42 * (1 - q) ** 1.3 * (off ? 0.6 : 1));
          bctx.lineWidth = wd.w * (1 - q * 0.6) * (off ? 0.6 : 1);
          bctx.beginPath();
          bctx.moveTo(xa, ya + off);
          bctx.lineTo(xb, yb + off);
          bctx.stroke();
        }
      }
    }
  }

  function leafPath(ctx, shape, s) {
    ctx.beginPath();
    if (shape === 'round') ctx.ellipse(0, 0, s * 0.75, s * 0.62, 0, 0, Math.PI * 2);
    else if (shape === 'long') {
      ctx.moveTo(-s * 1.4, 0);
      ctx.quadraticCurveTo(0, -s * 0.4, s * 1.4, 0);
      ctx.quadraticCurveTo(0, s * 0.4, -s * 1.4, 0);
    } else if (shape === 'maple') {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const r = k % 2 ? s * 0.45 : s;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
    } else if (shape === 'oak') {
      ctx.moveTo(-s * 1.1, 0);
      for (let k = 0; k <= 6; k++) {
        const x = -s * 1.1 + (k / 6) * s * 2.2;
        ctx.quadraticCurveTo(x - s * 0.18, -s * (k % 2 ? 0.75 : 0.45), x, -s * 0.3);
      }
      for (let k = 6; k >= 0; k--) {
        const x = -s * 1.1 + (k / 6) * s * 2.2;
        ctx.quadraticCurveTo(x + s * 0.18, s * (k % 2 ? 0.75 : 0.45), x, s * 0.3);
      }
    } else {
      ctx.moveTo(-s, 0);
      ctx.quadraticCurveTo(0, -s * 0.75, s, 0);
      ctx.quadraticCurveTo(0, s * 0.75, -s, 0);
    }
  }

  function drawLeaf(ctx, lf, x, y, alpha, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lf.a);
    ctx.scale(scale, scale * (0.5 + 0.5 * Math.abs(Math.cos(lf.a * 1.7))));
    leafPath(ctx, lf.shape, lf.s);
    ctx.fillStyle =
      lf.tone === 'red' ? rgba(RED, alpha * 0.55) : lf.tone === 'ink' ? rgba(INK, alpha * 0.7) : `rgba(233,226,210,${(alpha * 0.92).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = rgba(lf.tone === 'red' ? RED : INK, alpha * 0.8);
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
    if (lf.shape !== 'round' && lf.shape !== 'maple') {
      ctx.beginPath();
      ctx.moveTo(-lf.s * 0.9, 0);
      ctx.lineTo(lf.s * 1.3, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function stepLeaves(dt, amt, f) {
    const y0 = top - 50;
    const y1 = ground - 30;
    for (const lf of leaves) {
      const lx = lf.x * W;
      const ly = y0 + lf.y * (y1 - y0);
      const near = Math.abs(lx - f.gx) < 240 * f.s + 60 && f.alpha > 0.3;
      lf.caught += ((near ? 1 : 0) - lf.caught) * (1 - Math.exp(-(near ? 2.5 : 1) * dt));
      lf.x -= ((80 + lf.s * 9) * amt * dt) / Math.max(1, W);
      lf.y += Math.sin(clock * 2 + lf.oth) * 0.0008;
      lf.a += (1.3 + Math.sin(clock + lf.oth)) * dt * (lf.tone === 'red' ? -1 : 1);
      if (lf.x < -0.08) {
        lf.x = 1.08;
        lf.y = Math.random();
      }
      lf.oth += dt * (2.8 - lf.oh);
      const u = lf.oh;
      const ox = axisX(f, u) + Math.cos(lf.oth) * radius(f, u) * 0.9;
      const oy = yAt(f, u) + Math.sin(lf.oth) * radius(f, u) * 0.24;
      const k = lf.caught;
      const x = lx + (ox - lx) * k;
      const y = ly + (oy - ly) * k;
      const alpha = Math.max(amt * (1 - k), f.alpha * k);
      if (alpha < 0.02) continue;
      drawLeaf(k > 0.5 && Math.sin(lf.oth) > 0 ? fctx : bctx, lf, x, y, alpha, 1 + (f.s - 1) * k);
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
      s.b = dt === 0 ? goal : clamp(s.b + (goal ? 1.5 : -2.2) * dt, 0, 1);
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
      // a critically damped spring: it gathers pace and eases in, never jumps
      const k = 10;
      pv += (k * (target - prog) - 2 * Math.sqrt(k) * pv) * dt;
      prog += pv * dt;
    }
    const f = funnelAt(prog);
    for (const ctx of [bctx, fctx]) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
    }
    const amt = clamp(prog / 0.12, 0, 1) * (1 - clamp((prog - 0.85) / 0.15, 0, 1));
    drawWind(amt, f);
    stepLeaves(dt, amt, f);
    drawFunnel(f);
    placeSlugs(dt, f);
  }

  const tick = (t, deltaMs) => {
    if (!on || document.hidden || !P) return;
    frame(Math.min(0.05, deltaMs / 1000));
  };
  const io = new IntersectionObserver(([e]) => (on = e.isIntersecting), { rootMargin: '200px 0px' });
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
