// Where the cube is and how it behaves (docs/REVAMP.md §2, docs/cube/CUBE.md):
// - big in the hero's right column; as the hero scrolls away it travels down
//   to a margin corner, sized to the margin, choosing a corner with no text in
//   it and tucking away when a full-width band (the wire, the filmstrip) passes;
// - always turning slowly (~0.15 rad/s);
// - if the cursor rests on empty paper for ~0.6 s it glides over, stops
//   ~120 px away (never under the cursor, never over text) and turns to face
//   it; onto content, it goes home;
// - within ~160 px it leans in, slows its turn and lights the face under the cursor;
// - touch: no following, a tap twists a face. Reduced motion: no turn, no follow.
import { Euler, Quaternion, Vector3 } from 'three';
import { gsap } from 'gsap';
import { pointer } from '../life/pointer';
import { prefs } from '../life/prefs';
import { groundAt } from '../life/ground';
import { isEmptyPaper, measureMask } from '../life/paper';
import { onLayout } from '../life/layout';
import { bus } from '../life/bus';
import { Spring, clamp, lerp, smoothstep } from '../life/spring';
import { CUBE_REACH } from './cube-view';

const FOLLOW_DELAY = 0.6;
const FOLLOW_GAP = 120;
const NEAR = 160;
const FOLLOW_SIZE = 150;
const TURN_RATE = 0.15;
const RIM_FOR = { paper: 0, ink: 1, red: 0.55 };

export function createPresence(view, hitBtn) {
  const slotEl = document.querySelector('[data-cube-home="hero"]');
  const containerEl = document.querySelector('.press-container');

  let slot = null;
  let containerW = window.innerWidth * 0.92;
  let mask = [];
  const measure = () => {
    const sy = window.scrollY;
    if (slotEl) {
      const r = slotEl.getBoundingClientRect();
      slot = { x: r.left, y: r.top + sy, w: r.width, h: r.height };
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
      y: bottom ? vh() - 22 - s / 2 : 30 + s / 2,
    };
  }

  /** How much text (and off-screen) a circle at (cx, cy) would cover. */
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
    const out = Math.max(0, r - cx) + Math.max(0, cx + r - vw()) + Math.max(0, r - cy) + Math.max(0, cy + r - vh());
    return s + out * r * 4;
  }

  let cornerIdx = 0;
  function pickCorner(s) {
    const r = s * 0.46;
    const free = (i) => {
      const c = corner(i, s);
      return overlap(c.x, c.y, r) < 1;
    };
    if (cornerIdx >= 0 && free(cornerIdx)) return cornerIdx;
    for (const i of [0, 1, 2, 3]) if (free(i)) return i;
    return -1;
  }

  function chooseFollow(r, hx, hy) {
    let best = null;
    let bestScore = Infinity;
    const dist = FOLLOW_GAP + r * 0.75;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const cx = pointer.x + Math.cos(a) * dist;
      const cy = pointer.y + Math.sin(a) * dist;
      const score = overlap(cx, cy, r) + Math.hypot(cx - hx, cy - hy) * 0.6;
      if (score < bestScore) {
        bestScore = score;
        best = [cx, cy];
      }
    }
    if (best && overlap(best[0], best[1], r) > r * r * 0.08) return null;
    return best;
  }

  const dockX = new Spring(0, 0.55, 0.86);
  const dockY = new Spring(0, 0.55, 0.86);
  const tuck = new Spring(1, 0.45, 1);
  const offX = new Spring(0, 0.62, 0.86);
  const offY = new Spring(0, 0.62, 0.86);
  const followAmt = new Spring(0, 0.5, 1);
  const leanX = new Spring(0, 0.4, 0.8);
  const leanY = new Spring(0, 0.4, 0.8);
  const turnRate = new Spring(1, 0.6, 1);
  const hover = new Spring(0, 0.12, 1);
  const rim = new Spring(0, 0.5, 1);
  const shown = new Spring(0, 0.7, 1);

  // starts (and, under reduced motion, stays) on a three-quarter view
  const TURN_REST = 1.1;
  let turn = TURN_REST;
  let following = false;
  let followX = 0;
  let followY = 0;
  let under = null;
  let frame = 0;
  let first = true;
  const spin = { v: 0 };
  const state = { x: 0, y: 0, r: 0 };

  const q = new Quaternion();
  const qLean = new Quaternion();
  const qSpin = new Quaternion();
  const e = new Euler();
  const baseQ = new Quaternion().setFromEuler(new Euler(0.5, -0.7, 0, 'XYZ'));
  const turnAxis = new Vector3(0.18, 1, 0.12).normalize();
  const upAxis = new Vector3(0, 1, 0);
  const turnQ = new Quaternion();
  const hoverN = { R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1] };
  let lastHit = '';

  function update(dt) {
    frame++;
    const reduced = prefs.reduced;
    const W = vw();
    const H = vh();

    // ---- home: the hero slot, travelling to a docked margin corner
    const ds = dockSize();
    if (frame % 3 === 1 || first) {
      const c = pickCorner(ds);
      if (c >= 0) cornerIdx = c;
      tuck.target = c >= 0 ? 1 : 0;
    }
    const cp = corner(cornerIdx, ds);
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

    // ---- follow a cursor resting on empty paper (fine pointers only)
    const lenisV = Math.abs(window.__lenis?.velocity || 0);
    if (pointer.active && (frame % 5 === 0 || pointer.rest < 0.05)) under = document.elementFromPoint(pointer.x, pointer.y);
    const canFollow = prefs.fine && !reduced && pointer.active && W >= 720 && lenisV < 2;
    const overCube = !!bus.cursorHint;
    const onPaper = isEmptyPaper(under);
    const homeX = lerp(sx, dockX.value, t);
    const homeY = lerp(sy, dockY.value, t);
    if (canFollow && onPaper && !overCube && pointer.rest > FOLLOW_DELAY && !following) {
      const spot = chooseFollow(FOLLOW_SIZE * 0.5, homeX, homeY);
      if (spot) {
        following = true;
        [followX, followY] = spot;
      }
    }
    if (following && (!canFollow || (!onPaper && !overCube))) following = false;
    if (following && pointer.rest > FOLLOW_DELAY && !overCube) {
      const d = Math.hypot(pointer.x - followX, pointer.y - followY);
      if (d > FOLLOW_GAP * 2.2 || d < FOLLOW_GAP * 0.6) {
        const spot = chooseFollow(FOLLOW_SIZE * 0.5, homeX, homeY);
        if (spot) [followX, followY] = spot;
      }
    }

    offX.target = following ? followX - homeX : 0;
    offY.target = following ? followY - homeY : 0;
    followAmt.target = following ? 1 : 0;
    if (first || reduced) {
      dockX.snap(dockX.target);
      dockY.snap(dockY.target);
      tuck.snap(tuck.target);
      offX.snap(offX.target);
      offY.snap(offY.target);
      followAmt.snap(followAmt.target);
    } else {
      dockX.step(dt);
      dockY.step(dt);
      tuck.step(dt);
      offX.step(dt);
      offY.step(dt);
      followAmt.step(dt);
    }

    const baseSize = lerp(ss, ds * clamp(tuck.value, 0, 1.2), t);
    const size = lerp(baseSize, FOLLOW_SIZE, followAmt.value);
    const float = reduced ? 0 : Math.sin(performance.now() / 1000 * 0.9) * 3;
    const cx = lerp(sx, dockX.value, t) + offX.value;
    const cy = lerp(sy, dockY.value, t) + offY.value + float * (1 - t * 0.6);
    const rad = Math.max(0, size / 2);

    // ---- near the cursor: lean in, slow the turn, light the face under it
    const dc = pointer.active ? Math.hypot(pointer.x - cx, pointer.y - cy) - rad * 0.7 : Infinity;
    const near = prefs.fine && dc < NEAR;
    const face = pointer.active && prefs.fine && rad > 8 ? view.pick(pointer.x, pointer.y) : null;
    bus.cursorHint = face ? 'twist' : null;
    turnRate.target = reduced ? 0 : near || following ? 0.15 : 1;
    turnRate.step(dt);
    turn += dt * TURN_RATE * turnRate.value;
    const lean = near && !reduced ? 1 - clamp(dc / NEAR) : 0;
    const toX = pointer.x - cx;
    const toY = pointer.y - cy;
    const len = Math.hypot(toX, toY) || 1;
    leanY.target = following ? (toX / len) * 0.5 : (toX / len) * 0.32 * lean;
    leanX.target = following ? (toY / len) * 0.4 : (toY / len) * 0.26 * lean;
    leanX.step(dt);
    leanY.step(dt);
    hover.target = face ? 1 : 0;
    hover.step(dt);
    rim.target = RIM_FOR[groundAt(cy)] ?? 0;
    if (first) rim.snap(rim.target);
    else rim.step(dt);

    // ---- write the transform (the camera maps one unit to one CSS pixel)
    const g = view.group;
    g.position.set(cx - W / 2, H / 2 - cy, 0);
    const show = shown.step(dt);
    g.scale.setScalar(Math.max(0.001, (rad / CUBE_REACH) * (0.92 + 0.08 * show)));
    turnQ.setFromAxisAngle(turnAxis, reduced ? TURN_REST : turn);
    qSpin.setFromAxisAngle(upAxis, spin.v);
    e.set(leanX.value, leanY.value, 0, 'XYZ');
    qLean.setFromEuler(e);
    q.copy(qLean).multiply(qSpin).multiply(baseQ).multiply(turnQ);
    g.quaternion.copy(q);
    first = false;

    const u = view.uniforms;
    u.uHover.value = hover.value;
    if (face) u.uHoverN.value.set(...hoverN[face]);
    u.uRim.value = rim.value;

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

  /** One celebratory turn when the solve completes. */
  function celebrate() {
    if (prefs.reduced) return;
    gsap.fromTo(spin, { v: 0 }, { v: Math.PI * 2, duration: 1.5, ease: 'power3.inOut', overwrite: true });
  }

  function reveal() {
    shown.target = 1;
  }

  function dispose() {
    offLayout();
    bus.cursorHint = null;
  }

  return { update, celebrate, reveal, dispose, state };
}
