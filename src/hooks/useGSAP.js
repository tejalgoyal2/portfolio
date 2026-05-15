import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export function useGSAP(callback, deps = [], scope) {
  const ctx = useRef(null);

  useEffect(() => {
    ctx.current = gsap.context(() => {
      callback(gsap, ScrollTrigger);
    }, scope?.current || undefined);

    return () => ctx.current?.revert();
  }, deps);

  return ctx;
}
