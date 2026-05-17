import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * The press registration cursor — a printer's crosshair/nib that the magnetic
 * LERP (kept from v2, which Tejal liked) pulls toward interactive type. Uses
 * mix-blend-mode: difference so the same mark reads on cream paper AND on ink
 * spreads — one cursor, both grounds, by design. Fine-pointer only; on touch
 * the OS cursor stays.
 */
export default function PressCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [fine] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
  );

  useEffect(() => {
    if (!fine) return;

    document.documentElement.classList.add('cursor-hidden');
    const dot = dotRef.current;
    const ring = ringRef.current;
    gsap.set([dot, ring], { x: -100, y: -100 });

    const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.38, ease: 'power3' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.38, ease: 'power3' });

    const move = (e) => {
      let tx = e.clientX;
      let ty = e.clientY;
      // Magnetic pull: when over a magnetic target, bias the ring toward its centre.
      const mag = e.target.closest?.('[data-magnetic], a, button');
      if (mag) {
        const r = mag.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        tx = e.clientX + (cx - e.clientX) * 0.35;
        ty = e.clientY + (cy - e.clientY) * 0.35;
        ring.classList.add('is-locked');
      } else {
        ring.classList.remove('is-locked');
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(tx);
      ringY(ty);
    };

    const down = () => ring.classList.add('is-down');
    const up = () => ring.classList.remove('is-down');

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);

    return () => {
      document.documentElement.classList.remove('cursor-hidden');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, [fine]);

  if (!fine) return null;

  return (
    <>
      <div ref={dotRef} className="press-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="press-cursor-ring" aria-hidden="true">
        <span className="press-cross press-cross--h" />
        <span className="press-cross press-cross--v" />
      </div>
    </>
  );
}
