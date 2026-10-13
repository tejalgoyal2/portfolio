// Where the cube is and how it behaves (docs/REVAMP.md §2, docs/cube/CUBE.md):
// - big in the hero's slot; as the hero scrolls away it travels down to its
//   one home in the margin (bottom right), sized to the margin, and slides out
//   past the edge while a full-width band (the wire, the rows, the filmstrip)
//   goes by;
// - it never follows the cursor: it only turns slowly (~0.15 rad/s), slows
//   down while the cursor is near so a face is easy to hit; a click twists the
//   face under it (Shift for the other way); hold and drag to turn the whole
//   cube and look at it from any side (it keeps the view, with a little glide);
// - at the end it comes back out of the margin into its own spot in Let's talk,
//   big again, so the last moves of the solve play where you can see them;
// - touch: a tap twists a face. Reduced motion: no turn.
import { Euler, Quaternion, Vector3 } from 'three';
import { gsap } from 'gsap';
import { pointer } from '../life/pointer';
import { prefs } from '../life/prefs';
import { groundAt } from '../life/ground';
import { measureMask } from '../life/paper';
import { onLayout } from '../life/layout';
import { bus } from '../life/bus';
import { Spring, clamp, lerp, smoothstep } from '../life/spring';
import { CUBE_REACH } from './cube-view';

const NEAR = 160;
const TURN_RATE = 0.15;
const EDGE_FOR = { paper: 0, ink: 1, red: 0.6 };

export function createPresence(view, hitBtn) {
  const slotEl = document.querySelector('[data-cube-home="hero"]');
  const finaleEl = document.querySelector('[data-cube-home="contact"]');
  const containerEl = document.querySelector('.press-container');

  // the slot and the page's text, in document coordinates
  let slot = null; // { x, y, w, h }
  let finale = null;
  let containerW = window.innerWidth * 0.92;
  let mask = []; // { x, y, w, h }
  const measure = () => {
    const sy = window.scrollY;
    if (slotEl) {
      const r = slotEl.getBoundingClientRect();
      slot = { x: r.left, y: r.top + sy, w: r.width, h: r.height };
    }
    if (finaleEl) {
      const r = finaleEl.getBoundingClientRect();
      finale = r.width > 0 ? { x: r.left, y: r.top + sy, w: r.width, h: r.height } : null;
    }
    if (containerEl) containerW = containerEl.getBoundingClientRect().width;
    mask = measureMask(4, false);
  };
  measure();
  const offLayout = onLayout(measure);

  const vw = () => document.documentElement.clientWidth;
  const vh = () => window.innerHeight;
  const phone = () => vw() < 720;
  const margin = () => (vw() - containerW) / 2;
  const dockSize = () => (phone() ? 58 : clamp(margin() - 18, 64, 150));

  /** Corner centres: 0 bottom-right, 1 top-right, 2 bottom-left, 3 top-left. */
  function corner(i, s) {
    const m = phone() ? 10 : Math.max(8, (margin() - s) / 2);
    const right = i === 0 || i === 1;
    const bottom = i === 0 || i === 2;
    return {
      x: right ? vw() - m - s / 2 : m + s / 2,
      y: bottom ? vh() - 22 - s / 2 : 52 + s / 2,
    };
  }

  /** How much text a circle at (cx, cy) would cover. */
  function overlap(cx, cy, r) {
    const sy = window.scrollY;
    let s = 0;
    for (const b of mask) {
      const top = b.y - sy;
      if (top > cy + r || top + b.h < cy - r) continue;
      const ox = Math.max(0, Math.min(cx + r, b.x + b.w) - Math.max(cx - r, b.x));
      const oy = Math.max(0, Math.min(cy + r, top + b.h) - Math.max(cy - r, top));
      s += ox * oy;
    }
    return s;
  }

  // one home in the margin, bottom right. When something full-width passes
  // through it (the wire, the work rows, the filmstrip) the cube slides out
  // past the edge and back — never hopping corner to corner. Decided with a
  // little patience either way, so a band skimming past doesn't flick it.
  let blockedFor = 0;
  let clearFor = 0;
  let blocked = false;

  const dockX = new Spring(0, 0.55, 0.86);
  const dockY = new Spring(0, 0.55, 0.86);
  const away = new Spring(0, 0.75, 1);
  const turnRate = new Spring(1, 0.6, 1);
  const edge = new Spring(0, 0.5, 1);
  const shown = new Spring(0, 0.7, 1);

  // starts (and, under reduced motion, stays) on a three-quarter view
  const TURN_REST = 1.1;
  let turn = TURN_REST;
  let frame = 0;
  let first = true;
  const spin = { v: 0 };
  const pop = { v: 1 };
  // the visitor's own view of the cube: a drag turns it, and it glides to rest
  const orbitQ = new Quaternion();
  const dragQ = new Quaternion();
  const axisX = new Vector3(1, 0, 0);
  let dragging = false;
  let glideX = 0;
  let glideY = 0;
  const ORBIT = 0.0085; // rad per px dragged
  function orbit(dx, dy) {
    dragging = true;
    glideX = glideY = 0;
    dragQ.setFromAxisAngle(upAxis, dx * ORBIT);
    orbitQ.premultiply(dragQ);
    dragQ.setFromAxisAngle(axisX, dy * ORBIT);
    orbitQ.premultiply(dragQ);
  }
  function release(vx, vy) {
    dragging = false;
    glideX = Math.max(-1600, Math.min(1600, vx));
    glideY = Math.max(-1600, Math.min(1600, vy));
  }
  const state = { x: 0, y: 0, r: 0 };

  const q = new Quaternion();
  const qSpin = new Quaternion();
  const baseQ = new Quaternion().setFromEuler(new Euler(0.5, -0.7, 0, 'XYZ'));
  const turnAxis = new Vector3(0.18, 1, 0.12).normalize();
  const upAxis = new Vector3(0, 1, 0);
  const turnQ = new Quaternion();
  let lastHit = '';

  function update(dt) {
    frame++;
    const reduced = prefs.reduced;
    const W = vw();
    const H = vh();

    // ---- home: the hero slot, travelling to a docked margin corner
    const ds = dockSize();
    const cp = corner(0, ds);
    if (frame % 3 === 1 || first) blocked = overlap(cp.x, cp.y, ds * 0.46) >= 1;
    if (blocked) {
      blockedFor += dt;
      clearFor = 0;
    } else {
      clearFor += dt;
      blockedFor = 0;
    }
    if (first) away.target = blocked ? 1 : 0;
    else if (blockedFor > 0.2) away.target = 1;
    else if (clearFor > 0.45) away.target = 0;
    dockX.target = cp.x;
    dockY.target = cp.y;
    let sx = cp.x;
    let sy = cp.y;
    let ss = ds;
    let t = 1;
    if (slot) {
      sx = slot.x + slot.w / 2;
      sy = slot.y + slot.h / 2 - window.scrollY;
      ss = slot.w;
      t = smoothstep(H * 0.42, -H * 0.04, sy);
    }
    if (first || reduced) {
      dockX.snap(dockX.target);
      dockY.snap(dockY.target);
      away.snap(away.target);
    } else {
      dockX.step(dt);
      dockY.step(dt);
      away.step(dt);
    }

    let size = lerp(ss, ds, t);
    const float = reduced ? 0 : Math.sin((performance.now() / 1000) * 0.9) * 3;
    // slid out past the right edge while something wide goes by
    const out = clamp(away.value, 0, 1.1) * (W - dockX.value + ds * 0.6);
    let cx = lerp(sx, dockX.value + out, t);
    let cy = lerp(sy, dockY.value, t) + float * (1 - t * 0.6);
    // the finale: out of the margin and into its spot in Let's talk
    if (finale) {
      const fy = finale.y + finale.h / 2 - window.scrollY;
      const u = smoothstep(H * 1.05, H * 0.5, fy);
      if (u > 0) {
        cx = lerp(cx, finale.x + finale.w / 2, u);
        cy = lerp(cy, fy + float * 0.6, u);
        size = lerp(size, finale.w, u);
      }
    }
    const rad = Math.max(0, size / 2);

    // ---- near the cursor: slow the turn so a face is easy to hit
    const dc = pointer.active ? Math.hypot(pointer.x - cx, pointer.y - cy) - rad * 0.7 : Infinity;
    const near = prefs.fine && dc < NEAR;
    turnRate.target = reduced || dragging ? 0 : near ? 0.15 : 1;
    // a released drag glides a moment, then stops
    if (!dragging && (Math.abs(glideX) > 1 || Math.abs(glideY) > 1)) {
      const f = Math.exp(-4 * dt);
      dragQ.setFromAxisAngle(upAxis, glideX * dt * ORBIT);
      orbitQ.premultiply(dragQ);
      dragQ.setFromAxisAngle(axisX, glideY * dt * ORBIT);
      orbitQ.premultiply(dragQ);
      glideX *= f;
      glideY *= f;
    }
    turnRate.step(dt);
    turn += dt * TURN_RATE * turnRate.value;
    edge.target = EDGE_FOR[groundAt(cy)] ?? 0;
    if (first) edge.snap(edge.target);
    else edge.step(dt);

    // ---- write the transform (the camera maps one unit to one CSS pixel)
    const g = view.group;
    g.position.set(cx - W / 2, H / 2 - cy, 0);
    const show = shown.step(dt);
    g.scale.setScalar(Math.max(0.001, (rad / CUBE_REACH) * (0.92 + 0.08 * show) * pop.v));
    turnQ.setFromAxisAngle(turnAxis, reduced ? TURN_REST : turn);
    qSpin.setFromAxisAngle(upAxis, spin.v);
    q.copy(orbitQ).multiply(qSpin).multiply(baseQ).multiply(turnQ);
    g.quaternion.copy(q);
    first = false;

    view.setEdge(edge.value);

    state.x = cx;
    state.y = cy;
    state.r = rad;

    // ---- the keyboard handle rides over the cube (transform only)
    if (hitBtn) {
      const s = Math.round(rad * 2);
      const key = `${s}`;
      if (key !== lastHit) {
        lastHit = key;
        hitBtn.style.width = hitBtn.style.height = `${s}px`;
      }
      hitBtn.style.transform = `translate3d(${(cx - rad).toFixed(1)}px,${(cy - rad).toFixed(1)}px,0)`;
    }
  }

  /** The solve completes: a hop and one full turn, settling back. */
  function celebrate() {
    if (prefs.reduced) return;
    gsap.fromTo(spin, { v: 0 }, { v: Math.PI * 2, duration: 1.6, ease: 'power3.inOut', overwrite: true });
    gsap.timeline({ overwrite: true })
      .to(pop, { v: 1.14, duration: 0.35, ease: 'power2.out' })
      .to(pop, { v: 1, duration: 1.1, ease: 'elastic.out(1, 0.45)' });
  }

  function reveal() {
    shown.target = 1;
  }

  function dispose() {
    offLayout();
    bus.cursorHint = null;
  }

  return { update, celebrate, reveal, dispose, orbit, release, state };
}
