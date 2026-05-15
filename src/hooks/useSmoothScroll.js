import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './useGSAP';

let lenisInstance = null;

export function useSmoothScroll() {
  const lenis = useRef(null);

  useEffect(() => {
    if (lenisInstance) {
      lenis.current = lenisInstance;
      return;
    }

    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenisInstance = instance;
    lenis.current = instance;

    instance.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      instance.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      instance.destroy();
      lenisInstance = null;
    };
  }, []);

  return lenis;
}

export function getLenis() {
  return lenisInstance;
}
