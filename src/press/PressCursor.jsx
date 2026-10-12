import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { bus } from '../life/bus';
import { groundAt } from '../life/ground';
import { nib, onNib } from '../life/nib';

/**
 * The cursor is your pen: one of the site's pointy pencil icons, its tip
 * exactly where you point (yours to choose — the chip in the running head
 * swaps it, Page settings lists them all, or hands back your own cursor). It
 * leans a little into the direction you move, like a pen pushed across paper.
 *
 * - Over links and buttons it lifts a touch (bigger, more upright) — no ring.
 * - Elements can ask for a small mark beside the tip with
 *   data-cursor="twist | wheel | nib"; the WebGL stage asks for "twist" over
 *   the cube (bus.cursorHint), and dragging the cube shows "orbit".
 * - A click that twists a face draws a quarter-turn arrow round the point,
 *   the way the face went (life:twist).
 *
 * It's inked for the stock under it — ink on cream, cream on ink and red —
 * easing between them. Fine pointers only; on touch the OS cursor stays.
 */
const STATES = ['twist', 'wheel', 'nib', 'orbit'];
const SIZE = 40; // css px
const INK_FOR = { paper: 'var(--ink)', ink: 'var(--paper)', red: 'var(--paper)' };

export default function PressCursor() {
  const penRef = useRef(null);
  const leanRef = useRef(null);
  const iconRef = useRef(null);
  const markRef = useRef(null);
  const flickRef = useRef(null);
  const [fine] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches);
  const [system, setSystem] = useState(() => nib().name === 'system');

  // the pen's icon: loaded with the rest of the icons, swapped on request
  useEffect(() => {
    if (!fine) return;
    let cancelled = false;
    let icons = null;
    const paint = (n, animate = true) => {
      setSystem(n.name === 'system');
      const el = iconRef.current;
      if (!icons || !el || !n.tip) return;
      const k = SIZE / 24;
      el.innerHTML = icons[n.name] || '';
      el.style.setProperty('--rot', `${n.rot}deg`);
      el.style.setProperty('--tx', `${(-n.tip[0] * k).toFixed(2)}px`);
      el.style.setProperty('--ty', `${(-n.tip[1] * k).toFixed(2)}px`);
      if (animate) gsap.fromTo(leanRef.current, { scale: 0.3 }, { scale: 1, duration: 0.55, ease: 'back.out(2.2)' });
    };
    import('../life/icons').then(({ ICON }) => {
      if (cancelled) return;
      icons = ICON;
      paint(nib(), false);
    });
    const off = onNib((n) => paint(n));
    return () => {
      cancelled = true;
      off();
    };
  }, [fine]);

  useEffect(() => {
    if (!fine || system) return;

    const html = document.documentElement;
    html.classList.add('cursor-hidden');
    const pen = penRef.current;
    const mark = markRef.current;
    const lean = gsap.quickTo(leanRef.current, 'rotation', { duration: 0.6, ease: 'power3' });
    const markX = gsap.quickTo(mark, 'x', { duration: 0.22, ease: 'power3' });
    const markY = gsap.quickTo(mark, 'y', { duration: 0.22, ease: 'power3' });
    gsap.set(mark, { x: -100, y: -100 });

    let hovered = null; // data-cursor of the element under the pointer
    let lastX = 0;
    let ground = '';
    let seen = false;
    const move = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      // the tip is the pointer: no lag at all
      pen.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (!seen) {
        seen = true;
        pen.classList.add('is-on');
      }
      markX(x + 22);
      markY(y + 20);
      hovered = e.target.closest?.('[data-cursor]')?.dataset.cursor ?? null;
      html.classList.toggle('cursor-over-link', !!e.target.closest?.('a, button, [data-magnetic], label, select'));
      // and leans into the stroke, a little
      const vx = x - lastX;
      lastX = x;
      lean(Math.max(-16, Math.min(16, vx * 0.9)));
      const g = groundAt(y);
      if (g !== ground) {
        ground = g;
        pen.style.setProperty('--pen-ink', INK_FOR[g] || INK_FOR.paper);
        mark.dataset.ground = g;
      }
    };
    const leave = () => pen.classList.remove('is-on');
    const enter = () => seen && pen.classList.add('is-on');

    let shown = null;
    const sync = () => {
      const want = html.classList.contains('is-orbiting') ? 'orbit' : bus.cursorHint || hovered;
      const state = STATES.includes(want) ? want : null;
      if (state === shown) return;
      shown = state;
      if (state) mark.dataset.state = state;
      else delete mark.dataset.state;
      html.classList.toggle('cursor-has-mark', !!state);
    };

    // a twist: a quarter-turn arrow draws itself round the point, the way the face went
    const onTwist = (e) => {
      const el = flickRef.current;
      if (!el) return;
      const cw = e.detail.turns !== 3;
      el.dataset.ground = groundAt(e.detail.y);
      const [arc, head] = el.querySelectorAll('path');
      gsap.killTweensOf([el, arc, head]);
      gsap.set(el, { x: e.detail.x, y: e.detail.y, scaleX: cw ? 1 : -1, opacity: 1, rotate: -20 });
      gsap.set(head, { opacity: 0, scale: 0.4, svgOrigin: '21.2 -21.2' });
      gsap
        .timeline()
        .fromTo(arc, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.inOut' }, 0)
        .to(el, { rotate: 10, duration: 0.5, ease: 'power2.inOut' }, 0)
        .to(head, { opacity: 1, scale: 1, duration: 0.18, ease: 'back.out(3)' }, 0.36)
        .to(el, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0.75);
    };

    const down = () => html.classList.add('cursor-down');
    const up = () => html.classList.remove('cursor-down');

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    document.addEventListener('pointerleave', leave);
    document.addEventListener('pointerenter', enter);
    window.addEventListener('life:twist', onTwist);
    gsap.ticker.add(sync);

    return () => {
      html.classList.remove('cursor-hidden', 'cursor-over-link', 'cursor-down', 'cursor-has-mark');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerenter', enter);
      window.removeEventListener('life:twist', onTwist);
      gsap.ticker.remove(sync);
    };
  }, [fine, system]);

  if (!fine) return null;

  return (
    <div className={`press-cursor${system ? ' is-system' : ''}`} aria-hidden="true">
      <div ref={penRef} className="press-pen">
        <div ref={leanRef} className="press-pen-lean">
          <div ref={iconRef} className="press-pen-icon" />
        </div>
      </div>
      <div ref={markRef} className="press-cursor-mark">
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
      {/* a quarter turn over the top of the point, drawn clockwise; mirrored for anticlockwise */}
      <svg ref={flickRef} className="cursor-flick" viewBox="-40 -40 80 80">
        <path d="M-21.2 -21.2A30 30 0 0 1 21.2 -21.2" pathLength="1" />
        <path d="M18.9 -29.9 21.2 -21.2 12.5 -23.5" />
      </svg>
    </div>
  );
}
