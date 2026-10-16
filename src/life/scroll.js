import { onLayout } from './layout';

/**
 * The page's scroll, read once a frame: position, speed in px/s (signed,
 * positive = down, lightly smoothed) and how far it can go. Everything that
 * runs per frame reads these instead of window.scrollY / scrollHeight — the
 * browser recomputes styles to answer those whenever anything has been
 * written since the last frame, so asking a dozen times a frame (as each
 * effect used to) meant a dozen style recalcs. Sampled right after Lenis
 * moves the page (src/press/usePressScroll.js), before anyone draws; the
 * page height only when the layout changes.
 */
export const scroll = { y: 0, v: 0, max: 0, vh: 0 };

let started = false;
const measure = () => {
  scroll.vh = window.innerHeight;
  scroll.max = Math.max(0, document.documentElement.scrollHeight - scroll.vh);
};

export function startScroll() {
  if (started || typeof window === 'undefined') return;
  started = true;
  scroll.y = window.scrollY;
  measure();
  onLayout(measure);
}

/** Once a frame, first thing (after Lenis has moved the page). */
export function sampleScroll(deltaMs) {
  if (!started) startScroll();
  const dt = Math.max(1e-3, deltaMs / 1000);
  const y = window.scrollY;
  const raw = (y - scroll.y) / dt;
  scroll.v += (raw - scroll.v) * Math.min(1, dt * 14);
  if (Math.abs(scroll.v) < 0.5) scroll.v = 0;
  scroll.y = y;
}
