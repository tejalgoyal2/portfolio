import { useEffect, useRef, useState } from 'react';

/**
 * Returns a value in [0, 1] representing how far down the document
 * the user has scrolled. Driven by scroll events with rAF throttling.
 * Heavy consumers should use the imperative ref form to avoid re-renders.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame;
    const compute = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? doc.scrollTop / max : 0;
      setProgress(p);
      frame = null;
    };

    const onScroll = () => {
      if (frame == null) frame = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame != null) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return progress;
}

/**
 * Imperative variant — exposes a mutable ref instead of triggering re-renders.
 * Wires into the same scroll/raf pipeline. Pass a callback to react to changes
 * without React state churn (use this from animation loops).
 */
export function useScrollProgressRef(onChange) {
  const ref = useRef(0);

  useEffect(() => {
    let frame;
    const compute = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? doc.scrollTop / max : 0;
      ref.current = p;
      onChange?.(p);
      frame = null;
    };

    const onScroll = () => {
      if (frame == null) frame = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame != null) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [onChange]);

  return ref;
}
