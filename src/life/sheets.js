import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefs } from './prefs';

/**
 * The page as a pile of printed sheets. Each section is a sheet (.sheet) that
 * slides up over the one before it; the covered sheet stays put (CSS sticky —
 * a tall sheet sticks once its bottom reaches the viewport bottom, so it has
 * been read through first) and settles back into the pile: it scales to 0.96
 * around the middle of what's still showing and darkens slightly, scrubbed to
 * how much of it is covered. Scrolling up lifts the sheets off again. Only the
 * covered sheet ever changes; the one you're reading moves with the scroll.
 * Reduced motion: the same stacking, no scale.
 *
 * Sticky moves things away from where they sit in the flow, so everything that
 * caches positions measures inside naturalLayout(), which briefly un-sticks the
 * sheets. This module also maps between viewport and sheet-local coordinates,
 * so canvases can draw onto a particular sheet (and be clipped where the next
 * one covers it).
 */
const SETTLE = 0.04; // how far a fully covered sheet scales back
const SHADE = 0.16; // how much darker it gets

export const sheets = []; // { el, shade, top, h, stick, screenTop, p, s, origin }

let started = false;
let vh = 1;

/**
 * Run fn with the sheets un-stuck and unscaled, so measurements are in the
 * flow. At the very top of the page nothing can be stuck or settled yet, so
 * there's nothing to undo — and that's where all the load-time measuring
 * happens, so it skips the (whole-page) re-layout there.
 */
export function naturalLayout(fn) {
  const html = document.documentElement;
  if (html.classList.contains('measuring') || window.scrollY < 1) return fn();
  html.classList.add('measuring');
  try {
    return fn();
  } finally {
    html.classList.remove('measuring');
  }
}

/** Re-measure every sheet in the flow (layout.js calls this before anyone else). */
export function measureSheets() {
  vh = window.innerHeight;
  naturalLayout(() => {
    const sy = window.scrollY;
    for (const sh of sheets) {
      const r = sh.el.getBoundingClientRect();
      sh.top = r.top + sy;
      sh.h = r.height;
      sh.stick = Math.min(0, vh - sh.h);
      sh.el.style.top = `${sh.stick}px`;
    }
  });
}

function frame() {
  const sy = window.scrollY;
  const n = sheets.length;
  for (let i = 0; i < n; i++) {
    const sh = sheets[i];
    sh.screenTop = Math.max(sh.top - sy, sh.stick);
  }
  for (let i = 0; i < n; i++) {
    const sh = sheets[i];
    const stuck = sh.top - sy <= sh.stick;
    const visTop = Math.max(sh.screenTop, 0);
    const visBot = Math.min(sh.screenTop + sh.h, vh);
    const next = sheets[i + 1];
    let p = 0;
    if (stuck && next && visBot > visTop) p = Math.min(1, Math.max(0, (visBot - next.screenTop) / (visBot - visTop)));
    sh.origin = (visTop + visBot) / 2 - sh.screenTop;
    const s = prefs.reduced ? 1 : 1 - SETTLE * p;
    if (Math.abs(s - sh.s) > 0.0002 || Math.abs(p - sh.p) > 0.002) {
      sh.s = s;
      sh.p = p;
      sh.el.style.transformOrigin = `50% ${sh.origin.toFixed(1)}px`;
      sh.el.style.transform = s < 0.9999 ? `scale(${s.toFixed(4)})` : '';
      sh.shade.style.opacity = (SHADE * p).toFixed(3);
    }
  }
}

export function startSheets() {
  if (started) return;
  started = true;
  for (const el of document.querySelectorAll('.sheet')) {
    let shade = el.querySelector(':scope > .sheet-shade');
    if (!shade) {
      shade = document.createElement('div');
      shade.className = 'sheet-shade';
      shade.setAttribute('aria-hidden', 'true');
      el.appendChild(shade);
    }
    sheets.push({ el, shade, top: 0, h: 0, stick: 0, screenTop: 0, p: 0, s: 1, origin: 0 });
  }
  // ScrollTrigger measures its triggers in the flow too
  ScrollTrigger.addEventListener('refreshInit', () => {
    if (window.scrollY >= 1) document.documentElement.classList.add('measuring');
  });
  ScrollTrigger.addEventListener('refresh', () => document.documentElement.classList.remove('measuring'));
  measureSheets();
  frame();
  gsap.ticker.add(frame);
}

/** The sheet showing at viewport height y (the top-most one there). */
export function sheetAt(y) {
  for (let i = sheets.length - 1; i >= 0; i--) {
    const sh = sheets[i];
    if (y >= sh.screenTop && y < sh.screenTop + sh.h) return i;
  }
  return -1;
}

/** Index of the sheet a document-coordinate y falls in, in the flow. */
export function sheetOfDocY(y) {
  for (let i = sheets.length - 1; i >= 0; i--) if (y >= sheets[i].top) return i;
  return 0;
}

/** Sheet-local point → viewport point (applies stick and settle). */
export function toScreen(i, x, ly) {
  const sh = sheets[i];
  const cx = document.documentElement.clientWidth / 2;
  return { x: cx + (x - cx) * sh.s, y: sh.screenTop + sh.origin + (ly - sh.origin) * sh.s, s: sh.s };
}

/** Viewport point → sheet-local point on sheet i. */
export function toLocal(i, x, y) {
  const sh = sheets[i];
  const cx = document.documentElement.clientWidth / 2;
  return { x: cx + (x - cx) / sh.s, y: sh.origin + (y - sh.screenTop - sh.origin) / sh.s };
}

/** Where sheet i stops being visible: the top of the sheet laid over it. */
export function coveredFrom(i) {
  const next = sheets[i + 1];
  return next ? Math.max(0, next.screenTop) : Infinity;
}

/** The scroll offset at which the sheet holding `el` sticks (in the flow). */
export function stickScroll(el) {
  const host = el.closest('.sheet');
  if (!host) return Infinity;
  return naturalLayout(() => {
    const r = host.getBoundingClientRect();
    return r.top + window.scrollY - Math.min(0, window.innerHeight - r.height);
  });
}
