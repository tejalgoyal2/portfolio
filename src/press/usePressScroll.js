import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sampleScroll } from '../life/scroll';

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
    // the press may already be running (the loader's effect runs before this
    // one): the page holds still until it hands over, or a scroll during the
    // opening would carry the masthead off before the name lands in it
    if (document.documentElement.classList.contains('press-booting')) lenis.stop();

    lenis.on('scroll', ScrollTrigger.update);

    // prioritised so Lenis moves the page before anything else reads the
    // scroll this frame (canvases that track the paper stay in step with it),
    // and the scroll is sampled once, there, for everyone (src/life/scroll.js)
    const raf = (time, deltaMs) => {
      lenis.raf(time * 1000);
      // Lenis knows where it just put the page; asking the window would make
      // the browser settle the styles ScrollTrigger just wrote, mid-frame
      sampleScroll(deltaMs, lenis.animatedScroll);
    };
    gsap.ticker.add(raf, false, true);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.defaults({ markers: false });

    // After fonts settle, layout shifts — recompute trigger positions. Again
    // whenever more faces come in: they're declared in two batches, after the
    // first frame and after load (life/fonts.js).
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    document.fonts?.addEventListener('loadingdone', refresh);

    return () => {
      document.fonts?.removeEventListener('loadingdone', refresh);
      gsap.ticker.remove(raf);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      delete window.__lenis;
    };
  }, []);
}
