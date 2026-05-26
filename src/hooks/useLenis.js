import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Bootstrap Lenis smooth scroll and tie it to a RAF loop.
 * Returns the Lenis instance via a global event so other hooks (scroll
 * progress, scroll triggers) can subscribe without prop-drilling.
 */
export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    // expose for other modules
    window.__lenis = lenis;

    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);
}
