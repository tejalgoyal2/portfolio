import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { bus } from '../life/bus';

/**
 * The press registration cursor — a printer's crosshair/nib that the magnetic
 * LERP (kept from v2, which Tejal liked) pulls toward interactive type. Uses
 * mix-blend-mode: difference so the same mark reads on cream paper AND on ink
 * spreads — one cursor, both grounds, by design. Fine-pointer only; on touch
 * the OS cursor stays.
 *
 * The ring changes per target. An element can ask for a state with
 * data-cursor="twist | wheel | nib"; the WebGL stage asks for "twist" itself
 * while the pointer is over the cube (bus.cursorHint), since the canvas has no
 * DOM to hover. In a state the crosshair gives way to that mark: a twist arc
 * for the cube, a steering wheel for the car, a pen nib for the gratitude input.
 */
const STATES = ['twist', 'wheel', 'nib'];

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

    let hovered = null; // data-cursor of the element under the pointer
    const move = (e) => {
      let tx = e.clientX;
      let ty = e.clientY;
      hovered = e.target.closest?.('[data-cursor]')?.dataset.cursor ?? null;
      // Magnetic pull: when over a magnetic target, bias the ring toward its centre.
      const mag = e.target.closest?.('[data-magnetic], a, button');
      if (mag && !hovered) {
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

    // the cube moves under a still pointer, so the state is re-read every frame
    let shown = null;
    const sync = () => {
      const want = bus.cursorHint || hovered;
      const state = STATES.includes(want) ? want : null;
      if (state === shown) return;
      shown = state;
      if (state) ring.dataset.state = state;
      else delete ring.dataset.state;
    };

    const down = () => ring.classList.add('is-down');
    const up = () => ring.classList.remove('is-down');

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    gsap.ticker.add(sync);

    return () => {
      document.documentElement.classList.remove('cursor-hidden');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      gsap.ticker.remove(sync);
    };
  }, [fine]);

  if (!fine) return null;

  return (
    <>
      <div ref={dotRef} className="press-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="press-cursor-ring" aria-hidden="true">
        <span className="press-cross press-cross--h" />
        <span className="press-cross press-cross--v" />
        {/* twist — a three-quarter turn with an arrowhead, for the cube */}
        <svg className="cursor-mark cursor-mark--twist" viewBox="0 0 56 56">
          <path d="M28 8a20 20 0 1 1-20 20" />
          <path d="M3 22.5 8 28.6l6.2-5" />
        </svg>
        {/* wheel — rim, hub and three spokes, for the car */}
        <svg className="cursor-mark cursor-mark--wheel" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="20" />
          <circle cx="28" cy="28" r="5" />
          <path d="M23 28H8.5M33 28h14.5M28 33v14.4" />
        </svg>
        {/* nib — a pen nib with its breather hole and slit, for the gratitude input */}
        <svg className="cursor-mark cursor-mark--nib" viewBox="0 0 56 56">
          <path d="M28 49 16.5 29 22 13h12l5.5 16z" />
          <circle cx="28" cy="27" r="2.6" />
          <path d="M28 30v15" />
        </svg>
      </div>
    </>
  );
}
