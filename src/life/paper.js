import { bus } from './bus';
import { groundAt } from './ground';

/**
 * Empty paper vs. content. One definition decides where a click prints a
 * mark, where the type field may show, and where the cube is allowed to come
 * and sit — so all three agree about what "bare paper" is.
 */
const CONTENT = [
  'a', 'button', 'input', 'textarea', 'select', 'label',
  'p', 'h1', 'h2', 'h3', 'h4', 'li', 'dt', 'dd', 'blockquote', 'img', 'video', 'figure',
  '.kinetic', '.case-file', '.opdesk-strip-wrap', '.wire', '.press-stamp', '.redacted',
  '.press-loader', '[data-content]',
].join(',');

export const isEmptyPaper = (el) => !!el && el.nodeType === 1 && !el.closest(CONTENT);

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
 * - A press on the cube twists it (mice and pens at once; touch on a tap).
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
    html.classList.remove('is-holding');
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
    if (face && !touch) {
      bus.twist?.(face);
      return;
    }
    if (!face && !isEmptyPaper(e.target)) return;
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
    };
    if (!face) press.timer = setTimeout(startHold, HOLD_DELAY[press.kind]);
  });

  window.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    press.x = e.clientX;
    press.y = e.clientY;
    if (!press.holding && Math.hypot(press.x - press.x0, press.y - press.y0) > SLOP[press.kind]) end();
  });

  window.addEventListener('pointerup', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const p = press;
    if (p.holding) {
      const held = (performance.now() - p.holdT0) / 1000;
      emit('life:burst', { x: p.x, y: p.y, ground: groundAt(p.y), amount: Math.min(1, held / HOLD_FULL) });
    } else if (p.face) bus.twist?.(p.face);
    else emit('life:press', { x: p.x0, y: p.y0, ground: groundAt(p.y0) });
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
