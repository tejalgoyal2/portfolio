import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * The press's single source of motion truth. One Lenis instance drives one
 * rAF loop (gsap.ticker), and ScrollTrigger updates off Lenis — so there is
 * never a second rAF fighting it (the v2 battery/jank bug). Every scroll
 * animation in the site hangs off this. Exposes window.__lenis for modules
 * that need to programmatically scroll (loader skip, nav).
 */
export function usePressScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      lerp: reduced ? 1 : 0.1,
      smoothWheel: !reduced,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });
    window.__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.defaults({ markers: false });

    // After fonts settle, layout shifts — recompute trigger positions.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      delete window.__lenis;
    };
  }, []);
}
