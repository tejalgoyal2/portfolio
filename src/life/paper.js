import { bus } from './bus';
import { groundAt } from './ground';
import { found } from './discover';
import { warmSound } from './sound';
import { settings } from './settings';

/**
 * Empty paper vs. content. One definition decides where a click prints a
 * mark, where the type field may show, and where the cube is allowed to come
 * and sit — so all three agree about what "bare paper" is.
 */
// Things that are solid all over: anywhere on them is theirs.
const SOLID = [
  'a', 'button', 'input', 'textarea', 'select', 'label', 'img', 'video',
  '.tile', '.opdesk-strip-wrap', '.wire', '.press-stamp', '.redacted', '.skill',
  '.running-head', '.press-loader', '[data-content]',
].join(',');
// Text: only the lines themselves are content — the bare paper beside a short
// line, or round a headline, is still paper you can press.
const WORDS = 'p, h1, h2, h3, h4, li, dt, dd, blockquote, figure, .kinetic';
/** Page furniture that floats over the cube: it takes its own clicks. */
export const OVER_UI = '.running-head, [data-ui]';
const DECOY = '.kh-ghost, .kh-spread, .about-pq-ghost, [aria-hidden="true"]:not(.kh-set):not(.kh-set *)';
const range = typeof document !== 'undefined' ? document.createRange() : null;

export function isEmptyPaper(el, x, y) {
  if (!el || el.nodeType !== 1 || el.closest(SOLID)) return false;
  const text = el.closest(WORDS);
  if (!text) return true;
  if (x == null) return false;
  // the glyphs only: whole boxes of decoration inside (a headline's ghost and
  // spread, a quote's off-register copy) would cover the paper round the words
  const walk = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!n.nodeValue.trim() || n.parentElement.closest(DECOY)) continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 3 && y <= r.bottom + 3) return false;
    }
  }
  return true;
}

// What the type field keeps clear of. Text gets tight per-line boxes; the
// cards, the filmstrip and the wire band are masked whole.
const TEXT = 'p, h1, h2, h3, h4, li, dt, dd, blockquote, .kicker, .mast-kicker, .mast-cue, .contact-line-label, [data-mask-text]';
const BOXES = '.tile, .opdesk-strip-wrap, .wire, .press-stamp, dl, .skill-list, img, video, [data-mask]';
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
 * The one paper-press listener: a click, or a drag on the cube.
 *
 * - On the cube: a click twists the face under it (clockwise; Shift turns it back);
 *   holding and dragging turns the whole cube to see its other sides (mice
 *   and pens — on touch a drag scrolls the page, so a tap twists).
 * - A quick click on bare paper dispatches `life:press` {x, y, ground}: the
 *   registration mark and the water ripple.
 * - A drag anywhere else is left alone, so text selects the way it always does.
 */
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
    html.classList.remove('is-orbiting');
    press = null;
  };

  window.addEventListener('pointerdown', (e) => {
    if (html.classList.contains('press-booting')) return;
    const touch = e.pointerType === 'touch';
    if (!touch && e.button !== 0) return;
    // the running head and its Page settings card sit above everything: a click there is theirs, never the cube's
    if (e.target.closest?.(OVER_UI)) return;
    const face = bus.cubeAt?.(e.clientX, e.clientY) || null;
    if (!face && !isEmptyPaper(e.target, e.clientX, e.clientY)) return;
    if (face) {
      try {
        warmSound();
      } catch {
        /* no sound, then */
      }
    }
    end();
    press = {
      id: e.pointerId,
      kind: touch ? 'touch' : 'mouse',
      x: e.clientX,
      y: e.clientY,
      x0: e.clientX,
      y0: e.clientY,
      face,
      orbiting: false,
      t: performance.now(),
      vx: 0,
      vy: 0,
    };
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
    if (far) end();
  });

  window.addEventListener('pointerup', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const p = press;
    if (p.orbiting) {
      // a flick lets it glide; a slow drag lets it stop where it is
      const still = performance.now() - p.t > 80;
      bus.release?.(still ? 0 : p.vx, still ? 0 : p.vy);
    } else if (p.face) {
      const turns = bus.twist?.(p.face, e.shiftKey);
      emit('life:twist', { x: p.x0, y: p.y0, turns });
    } else {
      emit('life:press', { x: p.x0, y: p.y0, ground: groundAt(p.y0) });
      if (settings.ripples) found('ripple');
    }
    end();
  });

  window.addEventListener('pointercancel', end);
  window.addEventListener('blur', end);
}
