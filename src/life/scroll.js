import { gsap } from 'gsap';

/**
 * Scroll speed in px/s, measured from window.scrollY each frame so it works
 * the same for Lenis-smoothed wheels and for native touch scrolling. `v` is
 * signed (positive = scrolling down) and lightly smoothed.
 */
export const scroll = { y: 0, v: 0 };

let started = false;
export function startScroll() {
  if (started || typeof window === 'undefined') return;
  started = true;
  scroll.y = window.scrollY;
  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.max(1e-3, deltaMs / 1000);
    const y = window.scrollY;
    const raw = (y - scroll.y) / dt;
    scroll.v += (raw - scroll.v) * Math.min(1, dt * 14);
    if (Math.abs(scroll.v) < 0.5) scroll.v = 0;
    scroll.y = y;
  });
}
