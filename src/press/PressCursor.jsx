import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { nib, onNib, NIBS, LOANERS } from '../life/nib';
import { fireImpact } from './PressImpacts';

// what a face says when it turns
const TWIST_WORDS = ['KRK!', 'KLAK!', 'ZZIP!', 'TWIST!', 'KLIK!', 'SHK!', 'VRRT!'];
let lastWord = -1;

/**
 * The cursor is your pen: one of the site's pointy pencil icons, its tip
 * exactly where you point (yours to choose — the chip in the running head
 * swaps it, Page settings lists them all, or hands back your own cursor). It
 * leans a little into the direction you move, like a pen pushed across paper.
 *
 * - Over links and buttons it lifts a touch (bigger, more upright) — no ring.
 * - Elements can ask for a small mark beside the tip with
 *   data-cursor="wheel | nib"; dragging the cube shows "orbit".
 * - Some things hand you a fitting pen while you're over them
 *   (data-pen="pen-nib" on the blog cards, a set square on the case files…).
 * - A click that twists a face draws a quarter-turn arrow round the point,
 *   the way the face went (life:twist).
 *
 * It's inked for whatever is actually under it — the first solid background
 * up the tree, a paper card on the ink spread included — easing between ink
 * and cream. Fine pointers only; on touch the OS cursor stays.
 */
const STATES = ['wheel', 'nib', 'orbit'];
const SIZE = 40; // css px

// what colour is really under the pointer: the first solid background up the tree
let probe = null;
const lumOf = (css) => {
  probe ||= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = 'rgba(0,0,0,0)';
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return a < 128 ? -1 : (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
let cache = new WeakMap();
setInterval(() => (cache = new WeakMap()), 1500); // grounds re-ink (the running head), so forget now and then
function darkUnder(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    let l = cache.get(n);
    if (l === undefined) {
      l = lumOf(getComputedStyle(n).backgroundColor);
      cache.set(n, l);
    }
    if (l >= 0) return l < 0.45;
    const g = n.dataset?.ground;
    if (g) return g !== 'paper';
  }
  return false;
}

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
    let shown = '';
    const paint = (n, animate = true) => {
      setSystem(n.name === 'system');
      const el = iconRef.current;
      if (!icons || !el || !n.tip || shown === n.name) return;
      shown = n.name;
      const k = SIZE / 24;
      el.innerHTML = icons[n.name] || '';
      el.style.setProperty('--rot', `${n.rot}deg`);
      el.style.setProperty('--tx', `${(-n.tip[0] * k).toFixed(2)}px`);
      el.style.setProperty('--ty', `${(-n.tip[1] * k).toFixed(2)}px`);
      if (animate) gsap.fromTo(leanRef.current, { scale: 0.3 }, { scale: 1, duration: 0.55, ease: 'back.out(2.2)', overwrite: true });
    };
    // the pen a thing hands you while you're over it, else your own
    let over = null;
    const onOver = (e) => {
      const want = e.target.closest?.('[data-pen]')?.dataset.pen || null;
      if (want === over) return;
      over = want;
      const mine = nib();
      if (mine.name === 'system') return;
      paint(want ? [...NIBS, ...LOANERS].find((x) => x.name === want) || mine : mine);
    };
    window.addEventListener('pointerover', onOver);
    import('../life/icons').then(({ ICON }) => {
      if (cancelled) return;
      icons = ICON;
      paint(nib(), false);
    });
    const off = onNib((n) => paint(n));
    return () => {
      cancelled = true;
      off();
      window.removeEventListener('pointerover', onOver);
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
    let dark = null;
    let seen = false;
    let afterMenu = false;
    const move = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      // the tip is the pointer: no lag at all
      pen.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (!seen || afterMenu) {
        seen = true;
        pen.classList.add('is-on');
      }
      // back from a context menu: the browser forgets cursor:none until the
      // style changes, so take it off and put it back
      if (afterMenu) {
        afterMenu = false;
        html.classList.remove('cursor-hidden');
        requestAnimationFrame(() => html.classList.add('cursor-hidden'));
      }
      markX(x + 22);
      markY(y + 20);
      hovered = e.target.closest?.('[data-cursor]')?.dataset.cursor ?? null;
      html.classList.toggle('cursor-over-link', !!e.target.closest?.('a, button, [data-magnetic], label, select'));
      // and leans into the stroke, a little
      const vx = x - lastX;
      lastX = x;
      lean(Math.max(-16, Math.min(16, vx * 0.9)));
      const d = darkUnder(e.target);
      if (d !== dark) {
        dark = d;
        pen.style.setProperty('--pen-ink', d ? 'var(--paper)' : 'var(--ink)');
        mark.dataset.ground = d ? 'ink' : 'paper';
      }
    };
    const leave = () => pen.classList.remove('is-on');
    const onMenu = () => {
      afterMenu = true;
      pen.classList.remove('is-on');
    };
    const enter = () => seen && pen.classList.add('is-on');

    let shown = null;
    const sync = () => {
      const want = html.classList.contains('is-orbiting') ? 'orbit' : hovered;
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
      el.dataset.ground = darkUnder(document.elementFromPoint(e.detail.x, e.detail.y)) ? 'ink' : 'paper';
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
      // the comic bit: speed lines flick off the arrow, and the face says something
      const lines = el.querySelectorAll('.flick-line');
      gsap.fromTo(lines, { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: -1, duration: 0.5, ease: 'power2.out', stagger: 0.04, delay: 0.3 });
      let w = (Math.random() * TWIST_WORDS.length) | 0;
      if (w === lastWord) w = (w + 1) % TWIST_WORDS.length;
      lastWord = w;
      const side = cw ? 1 : -1;
      setTimeout(() => fireImpact(TWIST_WORDS[w], e.detail.x + side * 46, e.detail.y - 40, 'red', 'sm'), 260);
    };

    const down = () => html.classList.add('cursor-down');
    const up = () => html.classList.remove('cursor-down');

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    document.addEventListener('pointerleave', leave);
    document.addEventListener('pointerenter', enter);
    window.addEventListener('life:twist', onTwist);
    window.addEventListener('contextmenu', onMenu);
    gsap.ticker.add(sync);

    return () => {
      html.classList.remove('cursor-hidden', 'cursor-over-link', 'cursor-down', 'cursor-has-mark');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerenter', enter);
      window.removeEventListener('life:twist', onTwist);
      window.removeEventListener('contextmenu', onMenu);
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
        <path className="flick-line" d="M27 -27 34 -33" pathLength="1" />
        <path className="flick-line" d="M30 -18 39 -19" pathLength="1" />
        <path className="flick-line" d="M22 -35 24 -43" pathLength="1" />
      </svg>
    </div>
  );
}
