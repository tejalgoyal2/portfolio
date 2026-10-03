import { bus } from './bus';
import { groundAt } from './ground';
import { pointer } from './pointer';

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
 * The one paper-press listener. A press on the cube twists it; a press on
 * bare paper dispatches `life:press` {x, y, ground} for the registration mark
 * and the type-field ripple. Mice and pens react on pointer-down; touch waits
 * for a tap (click) so a scroll gesture never prints anything.
 */
let started = false;
export function startPaperPress() {
  if (started) return;
  started = true;

  const press = (x, y, target) => {
    if (document.documentElement.classList.contains('press-booting')) return;
    const face = bus.cubeAt?.(x, y);
    if (face) {
      bus.twist?.(face);
      return;
    }
    if (!isEmptyPaper(target)) return;
    window.dispatchEvent(new CustomEvent('life:press', { detail: { x, y, ground: groundAt(y) } }));
  };

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    press(e.clientX, e.clientY, e.target);
  });
  window.addEventListener('click', (e) => {
    if ((e.pointerType || pointer.type) !== 'touch') return;
    press(e.clientX, e.clientY, e.target);
  });
}
