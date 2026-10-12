import { bus } from './bus';
import { groundAt } from './ground';

/**
 * Empty paper vs. content. One definition decides where a click prints a
 * mark, where the type field may show, and where the cube is allowed to come
 * and sit — so all three agree about what "bare paper" is.
 */
// Things that are solid all over: anywhere on them is theirs.
const SOLID = [
  'a', 'button', 'input', 'textarea', 'select', 'label', 'img', 'video',
  '.case-file', '.opdesk-strip-wrap', '.wire', '.press-stamp', '.redacted', '.skill',
  '.running-head', '.press-loader', '[data-content]',
].join(',');
// Text: only the lines themselves are content — the bare paper beside a short
// line, or round a headline, is still paper you can press.
const WORDS = 'p, h1, h2, h3, h4, li, dt, dd, blockquote, figure, .kinetic';
const range = typeof document !== 'undefined' ? document.createRange() : null;

export function isEmptyPaper(el, x, y) {
  if (!el || el.nodeType !== 1 || el.closest(SOLID)) return false;
  const text = el.closest(WORDS);
  if (!text) return true;
  if (x == null) return false;
  range.selectNodeContents(text);
  for (const r of range.getClientRects()) {
    if (x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 3 && y <= r.bottom + 3) return false;
  }
  return true;
}

// What the type field keeps clear of. Text gets tight per-line boxes; the
// cards, the filmstrip and the wire band are masked whole.
const TEXT = 'p, h1, h2, h3, h4, li, dt, dd, blockquote, .kicker, .mast-kicker, .mast-cue, .contact-line-label, [data-mask-text]';
const BOXES = '.case-file, .opdesk-strip-wrap, .wire, .press-stamp, dl, .skill-list, img, video, [data-mask]';
const DECOR = '.seam'; // torn edges: no type under them, but the cube may pass

/**
 * Rects (document coordinates, padded) that the living type field must not
 * draw under — and, without the decor, the text the cube must not sit on.
 * Measured on layout changes only, never per frame.
 */
export function measureMask(pad = 10, decor = true) {
  const sy = window.scrollY;
  const out = [];
  const push = (r) => {
    if (r.width < 1 || r.height < 1) return;
    out.push({ x: r.left - pad, y: r.top + sy - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
  };
  const range = document.createRange();
  for (const el of document.querySelectorAll(TEXT)) {
    if (el.closest(BOXES)) continue; // already masked whole
    // KineticHeadline glyphs carry intro transforms; their inline wrapper's
    // line boxes are the stable footprint.
    const set = el.querySelector(':scope > .kh-set');
    if (set) {
      for (const r of set.getClientRects()) push(r);
      continue;
    }
    range.selectNodeContents(el);
    for (const r of range.getClientRects()) push(r);
  }
  for (const el of document.querySelectorAll(decor ? `${BOXES}, ${DECOR}` : BOXES)) push(el.getBoundingClientRect());
  return out;
}

/**
 * The one paper-press listener, and the difference between a click and a hold.
 *
 * - On the cube: a click twists the face under it (clockwise; Shift turns it back);
 *   holding and dragging turns the whole cube to see its other sides (mice
 *   and pens — on touch a drag scrolls the page, so a tap twists).
 * - A quick click on bare paper dispatches `life:press` {x, y, ground}: the
 *   registration mark and the water ripple.
 * - Holding past ~¼ s (a long-press on touch) starts printing instead:
 *   `life:hold` {phase: 'start' | 'end'} drives the ink ring that fills around
 *   the cursor, and letting go dispatches `life:burst` {x, y, ground, amount},
 *   amount 0..1 by how long it was held. The two never both fire.
 * - Moving off before the hold starts (a drag, a text selection, a scroll on
 *   touch) cancels the press; nothing prints.
 */
const HOLD_DELAY = { mouse: 230, touch: 420 }; // ms before a press becomes a hold
const HOLD_FULL = 1.6; // s of holding for the biggest splash
const SLOP = { mouse: 6, touch: 10 }; // px a press may wander before it's a drag

const emit = (type, detail) => window.dispatchEvent(new CustomEvent(type, { detail }));
let started = false;

export function startPaperPress() {
  if (started) return;
  started = true;
  const html = document.documentElement;
  let press = null;

  const end = () => {
    if (!press) return;
    clearTimeout(press.timer);
    if (press.holding) emit('life:hold', { phase: 'end' });
    html.classList.remove('is-holding', 'is-orbiting');
    press = null;
  };

  const startHold = () => {
    if (!press) return;
    press.holding = true;
    press.holdT0 = performance.now();
    html.classList.add('is-holding');
    window.getSelection?.()?.removeAllRanges();
    emit('life:hold', { phase: 'start', x: press.x, y: press.y, ground: groundAt(press.y) });
  };

  window.addEventListener('pointerdown', (e) => {
    if (html.classList.contains('press-booting')) return;
    const touch = e.pointerType === 'touch';
    if (!touch && e.button !== 0) return;
    const face = bus.cubeAt?.(e.clientX, e.clientY) || null;
    if (!face && !isEmptyPaper(e.target, e.clientX, e.clientY)) return;
    end();
    press = {
      id: e.pointerId,
      kind: touch ? 'touch' : 'mouse',
      x: e.clientX,
      y: e.clientY,
      x0: e.clientX,
      y0: e.clientY,
      face,
      holding: false,
      orbiting: false,
      t: performance.now(),
      vx: 0,
      vy: 0,
    };
    if (!face) press.timer = setTimeout(startHold, HOLD_DELAY[press.kind]);
  });

  window.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    press.x = e.clientX;
    press.y = e.clientY;
    const far = Math.hypot(press.x - press.x0, press.y - press.y0) > SLOP[press.kind];
    // a drag that starts on the cube turns the cube
    if (press.face && press.kind === 'mouse' && (press.orbiting || far)) {
      if (!press.orbiting) {
        press.orbiting = true;
        html.classList.add('is-orbiting');
        window.getSelection?.()?.removeAllRanges();
      }
      const now = performance.now();
      const dt = Math.max(1, now - press.t) / 1000;
      press.vx = press.vx * 0.6 + (dx / dt) * 0.4;
      press.vy = press.vy * 0.6 + (dy / dt) * 0.4;
      press.t = now;
      bus.orbit?.(dx, dy);
      return;
    }
    if (!press.holding && far) end();
  });

  window.addEventListener('pointerup', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const p = press;
    if (p.holding) {
      const held = (performance.now() - p.holdT0) / 1000;
      emit('life:burst', { x: p.x, y: p.y, ground: groundAt(p.y), amount: Math.min(1, held / HOLD_FULL) });
    } else if (p.orbiting) {
      // a flick lets it glide; a slow drag lets it stop where it is
      const still = performance.now() - p.t > 80;
      bus.release?.(still ? 0 : p.vx, still ? 0 : p.vy);
    } else if (p.face) {
      const turns = bus.twist?.(p.face, e.shiftKey);
      emit('life:twist', { x: p.x0, y: p.y0, turns });
    } else emit('life:press', { x: p.x0, y: p.y0, ground: groundAt(p.y0) });
    end();
  });

  window.addEventListener('pointercancel', end);
  window.addEventListener('blur', end);
  // a long-press is ours while it's printing: no context menu, no callout
  window.addEventListener('contextmenu', (e) => {
    if (press?.holding || press?.kind === 'touch') e.preventDefault();
  });
}

/** How full a hold is (0..1), for the ink ring. */
export const HOLD_SECONDS = HOLD_FULL;
