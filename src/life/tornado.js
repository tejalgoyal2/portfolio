import { gsap } from 'gsap';
import { prefs } from './prefs';
import { onLayout } from './layout';
import { clamp, hash } from './spring';

/**
 * The Skills type case gets its slugs delivered by weather.
 *
 * As the case comes up the page it's empty — just the category labels — and
 * the wind gets up: long pen strokes of air curl across it, and a few leaves
 * tumble through. Then a tornado comes in from the right, drawn in ink like
 * everything else: a funnel of sketchy rings, its axis swaying, debris
 * climbing round it, dust where it touches down. Every skill is inside it,
 * whirling. As the funnel passes over a skill's slot, that slug is flung out
 * and drops home; by the time it has crossed, the case is set. Scroll back and
 * it comes back for them.
 *
 * Where the tornado is follows the scroll (eased, so it travels rather than
 * jumps); its spin runs on its own clock, so it stays alive while you pause.
 * The funnel is real geometry: rings and slugs sit on a swaying 3D helix,
 * projected — the near side of each ring is drawn on a canvas in front of the
 * slugs, the far side on one behind them, and slugs on the far side of the
 * spin are smaller.
 *
 * Only runs while the section is on screen. Reduced motion (or no JS): the
 * slugs are simply in their places.
 */
const INK = [28, 22, 18];
const RED = [213, 30, 34];
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a.toFixed(3)})`;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

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
  let ground = 0; // y the funnel touches down on (section coordinates)
  let top = 0; // the case's top edge
  let funnelH = 480;
  let homes = []; // each slug's resting centre, section coordinates

  const S = slugs.map((el, i) => ({
    el,
    h: 0.16 + hash(i * 3.17) * 0.74, // height up the funnel, 0..1
    th: hash(i * 5.3) * Math.PI * 2,
    w: 1.6 + hash(i * 1.9) * 1.4,
    tilt: (hash(i * 7.7) - 0.5) * 50,
    b: 0, // 0 in the funnel … 1 home
    goal: 0,
    w0: 0,
    h0: 0,
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
    ground = gr.bottom - sr.top + 20;
    funnelH = clamp(gr.height + 160, 380, 640);
    homes = slugs.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
    });
    S.forEach((s, i) => {
      s.w0 = slugs[i].offsetWidth;
      s.h0 = slugs[i].offsetHeight;
    });
    frame(0);
  };

  // ---- the weather
  const winds = Array.from({ length: 9 }, (_, i) => ({
    y: hash(i * 2.3),
    x: hash(i * 4.1) * 1.4 - 0.2,
    len: 160 + hash(i * 6.6) * 220,
    sp: 260 + hash(i * 8.8) * 200,
    curl: hash(i * 9.9) < 0.45,
    ph: hash(i * 1.1) * 10,
  }));
  const leaves = Array.from({ length: 11 }, (_, i) => ({
    x: hash(i * 3.3) * 1.2,
    y: hash(i * 5.5),
    vx: 0,
    vy: 0,
    a: hash(i * 7.1) * 6,
    av: 0,
    s: 7 + hash(i * 2.2) * 6,
    red: i % 4 === 0,
    caught: 0,
    oth: hash(i * 4.4) * 6,
    oh: 0.2 + hash(i * 6.2) * 0.6,
  }));

  let clock = 0;
  let prog = 0; // eased scroll progress
  let on = false;

  const progress = () => {
    const r = grid.getBoundingClientRect();
    const vh = window.innerHeight;
    // from the case's top at the bottom of the screen to it nearing the top
    return clamp((vh * 1.0 - r.top) / (vh * 0.8), 0, 1);
  };

  // where the funnel is: off to the right, across, gone left
  const funnelX = (p) => {
    const q = clamp((p - 0.22) / 0.7, 0, 1);
    return W + 280 - (W + 560) * ease(q);
  };
  const windAmt = (p) => clamp(p / 0.12, 0, 1) * (1 - clamp((p - 0.85) / 0.15, 0, 1));

  /** The funnel's axis and radius at height u (0 ground … 1 top). */
  const axis = (cx, u) => cx + Math.sin(u * 3.1 + clock * 1.3) * 26 * u + Math.sin(clock * 0.7) * 10 * u * u;
  const radius = (u) => 16 + 175 * u ** 1.5;

  function drawRing(ctx, cx, u, side, alpha, lw, j) {
    const y = ground - u * funnelH;
    const r = radius(u);
    const ry = r * 0.24;
    const ax = axis(cx, u);
    // a sketchy ring: drawn in broken arcs that spin, near half or far half
    const spin = clock * (3.4 - u * 1.6) + j * 1.7;
    ctx.lineWidth = lw;
    ctx.strokeStyle = rgba(INK, alpha);
    for (let k = 0; k < 3; k++) {
      const a0 = spin + k * 2.2;
      const a1 = a0 + 1.3 + hash(j * 11 + k) * 0.8;
      ctx.beginPath();
      let started = false;
      for (let a = a0; a <= a1; a += 0.12) {
        const near = Math.sin(a) > 0;
        if (near !== (side === 'front')) {
          started = false;
          continue;
        }
        const px = ax + Math.cos(a) * r;
        const py = y + Math.sin(a) * ry;
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  function drawFunnel(cx, presence) {
    if (presence <= 0.01) return;
    const rings = 22;
    for (let j = 0; j < rings; j++) {
      const u = (j + 0.5) / rings;
      const a = presence * (0.25 + 0.45 * (1 - Math.abs(u - 0.55)));
      drawRing(bctx, cx, u, 'back', a * 0.55, 1.1, j);
      drawRing(fctx, cx, u, 'front', a, 1.5 + (1 - u) * 0.6, j);
    }
    // debris climbing the spiral
    for (let i = 0; i < 46; i++) {
      const u = (hash(i * 1.3) + clock * (0.08 + hash(i * 2.9) * 0.08)) % 1;
      const th = hash(i * 3.7) * 6.28 + clock * (3 - u * 1.5);
      const r = radius(u) * (0.7 + hash(i * 5.1) * 0.35);
      const px = axis(cx, u) + Math.cos(th) * r;
      const py = ground - u * funnelH + Math.sin(th) * r * 0.24;
      const ctx = Math.sin(th) > 0 ? fctx : bctx;
      ctx.fillStyle = rgba(i % 7 === 0 ? RED : INK, presence * (0.5 - u * 0.25));
      ctx.fillRect(px, py, 2.2, 2.2);
    }
    // dust where it touches down
    for (let i = 0; i < 7; i++) {
      const t = (clock * 0.9 + i / 7) % 1;
      const r = 20 + t * 70;
      fctx.strokeStyle = rgba(INK, presence * 0.35 * (1 - t));
      fctx.lineWidth = 1.2;
      fctx.beginPath();
      fctx.ellipse(axis(cx, 0) + (i % 2 ? 1 : -1) * t * 30, ground + 4, r, r * 0.18, 0, Math.PI * 1.05, Math.PI * 1.95);
      fctx.stroke();
    }
  }

  function drawWind(amt, cx) {
    if (amt <= 0.01) return;
    const area = { y0: top - 60, y1: ground - 20 };
    bctx.lineCap = 'round';
    for (const wd of winds) {
      // each gust is a pen stroke of air: a head that runs on, a tail that fades
      const span = W + wd.len * 2;
      const head = ((wd.x * span + clock * wd.sp) % span) - wd.len;
      const y = area.y0 + wd.y * (area.y1 - area.y0);
      const pts = [];
      for (let q = 0; q <= 1.0001; q += 0.04) {
        const x = head - q * wd.len;
        let yy = y + Math.sin(x * 0.012 + wd.ph + clock) * 9;
        // a curl near the head, now and then
        if (wd.curl && q < 0.3) {
          const c = (0.3 - q) / 0.3;
          yy -= Math.sin(c * Math.PI) * 16;
        }
        // the funnel draws the air in towards it
        const d = x - cx;
        yy += Math.exp(-(d * d) / 60000) * (ground - funnelH * 0.4 - yy) * 0.25;
        pts.push([x, yy, q]);
      }
      for (let k = 1; k < pts.length; k++) {
        const [x0, y0] = pts[k - 1];
        const [x1, y1, q] = pts[k];
        bctx.strokeStyle = rgba(INK, amt * 0.32 * (1 - q) ** 1.4);
        bctx.lineWidth = 1.6 * (1 - q * 0.6);
        bctx.beginPath();
        bctx.moveTo(x0, y0);
        bctx.lineTo(x1, y1);
        bctx.stroke();
      }
    }
  }

  function drawLeaf(ctx, lf, x, y, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lf.a);
    ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(lf.a * 1.7)));
    const s = lf.s;
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(0, -s * 0.75, s, 0);
    ctx.quadraticCurveTo(0, s * 0.75, -s, 0);
    ctx.fillStyle = rgba(lf.red ? RED : [233, 226, 210], alpha * (lf.red ? 0.55 : 0.9));
    ctx.fill();
    ctx.strokeStyle = rgba(lf.red ? RED : INK, alpha * 0.8);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, 0);
    ctx.lineTo(s * 1.25, 0);
    ctx.stroke();
    ctx.restore();
  }

  function stepLeaves(dt, amt, cx, presence) {
    const y0 = top - 40;
    const y1 = ground - 30;
    for (const lf of leaves) {
      const lx = lf.x * W;
      const ly = y0 + lf.y * (y1 - y0);
      const near = Math.abs(lx - cx) < 220 && presence > 0.3;
      lf.caught += ((near ? 1 : 0) - lf.caught) * (1 - Math.exp(-(near ? 3 : 1.2) * dt));
      // on the wind: drift left, flutter, spin
      lf.x -= ((90 + lf.s * 8) * amt * dt) / Math.max(1, W);
      lf.y += Math.sin(clock * 2 + lf.oth) * 0.0009;
      lf.a += (1.4 + Math.sin(clock + lf.oth)) * dt * (lf.red ? -1 : 1);
      if (lf.x < -0.08) {
        lf.x = 1.08;
        lf.y = Math.random();
      }
      lf.oth += dt * (3 - lf.oh);
      const ou = lf.oh;
      const ox = axis(cx, ou) + Math.cos(lf.oth) * radius(ou) * 0.9;
      const oy = ground - ou * funnelH + Math.sin(lf.oth) * radius(ou) * 0.22;
      const k = lf.caught;
      const x = lx + (ox - lx) * k;
      const y = ly + (oy - ly) * k;
      const alpha = Math.max(amt * (1 - k), presence * k);
      if (alpha < 0.02) continue;
      drawLeaf(k > 0.5 && Math.sin(lf.oth) > 0 ? fctx : bctx, lf, x, y, alpha);
    }
  }

  function placeSlugs(dt, cx) {
    for (let i = 0; i < S.length; i++) {
      const s = S[i];
      const home = homes[i];
      if (!home) continue;
      // the funnel has passed over this slot: fling the slug home (and back up if it returns)
      s.goal = cx < home.x + 30 ? 1 : 0;
      const rate = s.goal ? 1.5 : 2.4;
      s.b = clamp(s.b + (s.goal ? 1 : -1) * rate * dt, 0, 1);
      if (dt === 0) s.b = s.goal;
      s.th += s.w * dt * (1.2 - s.h * 0.5);
      const u = s.h;
      const r = radius(u) * 0.78;
      const depth = Math.sin(s.th); // +1 near, −1 far
      const ox = axis(cx, u) + Math.cos(s.th) * r;
      const oy = ground - u * funnelH + depth * r * 0.24;
      const k = ease(s.b);
      // an arc on the way home, so it's thrown rather than slid
      const lift = Math.sin(Math.PI * k) * 70;
      const x = ox + (home.x - ox) * k;
      const y = oy + (home.y - oy) * k - lift;
      const scale = (0.66 + 0.2 * depth) * (1 - k) + k;
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
      el.style.opacity = (0.55 + 0.45 * Math.max(k, (depth + 1) / 2)).toFixed(2);
    }
  }

  function frame(dt) {
    clock += dt;
    const target = progress();
    prog += (target - prog) * (dt === 0 ? 1 : 1 - Math.exp(-3.2 * dt));
    const cx = funnelX(prog);
    // fully faded in while on screen; out once it's gone
    const presence = clamp((W + 260 - cx) / 200, 0, 1) * clamp((cx + 260) / 200, 0, 1);
    for (const ctx of [bctx, fctx]) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
    }
    const amt = windAmt(prog);
    drawWind(amt, cx);
    stepLeaves(dt, amt, cx, presence);
    drawFunnel(cx, presence);
    placeSlugs(dt, cx);
  }

  const tick = (t, deltaMs) => {
    if (!on || document.hidden) return;
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
