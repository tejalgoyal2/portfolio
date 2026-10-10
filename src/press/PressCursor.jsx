import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { bus } from '../life/bus';
import { nib, onNib } from '../life/nib';

/**
 * The cursor is your pen. A small press-red point marks exactly where you
 * are; beside it rides one of the site's pencil icons (yours to choose — the
 * chip in the running head swaps it), trailing a touch behind and leaning
 * into the direction you move, like a pen tilted as it's pushed across paper.
 *
 * - Over links and buttons the pen lifts (bigger, upright) and the point
 *   opens into a small ring that the magnetic pull draws to the target.
 * - Elements can ask for a mark with data-cursor="twist | wheel | nib"; the
 *   WebGL stage asks for "twist" over the cube itself (bus.cursorHint), and
 *   dragging the cube shows "orbit". A click that twists a face flicks an
 *   arrow round the point in the direction it turned (life:twist).
 *
 * The pen is drawn in paper white under difference blending, so it re-inks
 * itself per pixel over cream, ink and red — no flipping between colours.
 * Fine pointers only; on touch the OS cursor stays.
 */
const STATES = ['twist', 'wheel', 'nib', 'orbit'];

export default function PressCursor() {
  const dotRef = useRef(null);
  const penRef = useRef(null);
  const ringRef = useRef(null);
  const flickRef = useRef(null);
  const [fine] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches);

  // the pen's icon: loaded with the rest of the icons, swapped on request
  useEffect(() => {
    if (!fine) return;
    let cancelled = false;
    let icons = null;
    const paint = (n) => {
      if (!icons || !penRef.current) return;
      penRef.current.innerHTML = (icons[n.name] || '').replace(/stroke="currentColor"/g, 'stroke="#fff"');
      gsap.fromTo(penRef.current, { scale: 0.4, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2)' });
    };
    import('../life/icons').then(({ ICON }) => {
      if (cancelled) return;
      icons = ICON;
      paint(nib());
    });
    const off = onNib(paint);
    return () => {
      cancelled = true;
      off();
    };
  }, [fine]);

  useEffect(() => {
    if (!fine) return;

    document.documentElement.classList.add('cursor-hidden');
    const dot = dotRef.current;
    const pen = penRef.current.parentElement;
    const ring = ringRef.current;
    gsap.set([dot, pen, ring], { x: -100, y: -100 });

    const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
    const penX = gsap.quickTo(pen, 'x', { duration: 0.32, ease: 'power3' });
    const penY = gsap.quickTo(pen, 'y', { duration: 0.32, ease: 'power3' });
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.3, ease: 'power3' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.3, ease: 'power3' });
    const lean = gsap.quickTo(pen, 'rotation', { duration: 0.5, ease: 'power2' });

    let hovered = null; // data-cursor of the element under the pointer
    let lastX = 0;
    const move = (e) => {
      let tx = e.clientX;
      let ty = e.clientY;
      hovered = e.target.closest?.('[data-cursor]')?.dataset.cursor ?? null;
      const mag = e.target.closest?.('[data-magnetic], a, button');
      if (mag && !hovered && !bus.cursorHint) {
        const r = mag.getBoundingClientRect();
        tx = e.clientX + (r.left + r.width / 2 - e.clientX) * 0.35;
        ty = e.clientY + (r.top + r.height / 2 - e.clientY) * 0.35;
        document.documentElement.classList.add('cursor-over-link');
      } else document.documentElement.classList.remove('cursor-over-link');
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(tx);
      ringY(ty);
      // the pen rides just below-right of the point
      penX(e.clientX + 14);
      penY(e.clientY + 14);
      // and leans into the stroke
      const vx = e.clientX - lastX;
      lastX = e.clientX;
      lean(Math.max(-28, Math.min(28, vx * 1.6)));
    };

    let shown = null;
    const sync = () => {
      const html = document.documentElement;
      const want = html.classList.contains('is-orbiting') ? 'orbit' : bus.cursorHint || hovered;
      const state = STATES.includes(want) ? want : null;
      if (state === shown) return;
      shown = state;
      if (state) ring.dataset.state = state;
      else delete ring.dataset.state;
      html.classList.toggle('cursor-has-mark', !!state);
    };

    // a twist: an arrow flicks round the point the way the face turned
    const onTwist = (e) => {
      const el = flickRef.current;
      if (!el) return;
      const cw = e.detail.turns !== 3;
      gsap.set(el, { x: e.detail.x, y: e.detail.y, scaleX: cw ? 1 : -1 });
      gsap.fromTo(el, { rotate: 0, opacity: 1 }, { rotate: cw ? 120 : -120, opacity: 0, duration: 0.7, ease: 'power2.out' });
    };

    const down = () => document.documentElement.classList.add('cursor-down');
    const up = () => document.documentElement.classList.remove('cursor-down');

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('life:twist', onTwist);
    gsap.ticker.add(sync);

    return () => {
      const html = document.documentElement;
      html.classList.remove('cursor-hidden', 'cursor-over-link', 'cursor-down', 'cursor-has-mark');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('life:twist', onTwist);
      gsap.ticker.remove(sync);
    };
  }, [fine]);

  if (!fine) return null;

  return (
    <>
      <div className="press-pen" aria-hidden="true">
        <div ref={penRef} className="press-pen-icon" />
      </div>
      <div ref={dotRef} className="press-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="press-cursor-ring" aria-hidden="true">
        {/* twist — a three-quarter turn with an arrowhead, for the cube */}
        <svg className="cursor-mark cursor-mark--twist" viewBox="0 0 56 56">
          <path d="M28 8a20 20 0 1 1-20 20" />
          <path d="M3 22.5 8 28.6l6.2-5" />
        </svg>
        {/* orbit — two arcs round a centre, while you turn the cube */}
        <svg className="cursor-mark cursor-mark--orbit" viewBox="0 0 56 56">
          <ellipse cx="28" cy="28" rx="21" ry="9" />
          <ellipse cx="28" cy="28" rx="9" ry="21" />
          <circle cx="28" cy="28" r="2.5" />
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
      <svg ref={flickRef} className="cursor-flick" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 8a24 24 0 0 1 24 24" />
        <path d="M49 25.5 56 32.6l6-6.6" />
      </svg>
    </>
  );
}
