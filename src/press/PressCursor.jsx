import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { nib, onNib, NIBS, LOANERS } from '../life/nib';
import { bus } from '../life/bus';

/**
 * The cursor is your pen: one of the site's pointy pencil icons, its tip
 * exactly where you point (yours to choose — the chip in the running head
 * swaps it, Page settings lists them all, or hands back your own cursor). It
 * leans a little into the direction you move, like a pen pushed across paper.
 *
 * - Over links and buttons it lifts a touch (bigger, more upright) — no ring.
 * - Elements can ask for a small mark beside the tip with
 *   data-cursor="nib".
 * - A couple of places hand you a fitting pen while you're over them
 *   (data-pen: a pencil on the blog cards, a rocket in Let's talk), and over
 *   the cube — or while you turn it — the cursor is a little turning arrow,
 *   the way a click will turn the face: clockwise, or mirrored while Shift is
 *   held (Shift turns it back). The turn itself is drawn round the cube
 *   (src/gl/notes.js), not here.
 *
 * It's inked for whatever is actually under it — the first solid background
 * up the tree, a paper card on the ink spread included — easing between ink
 * and cream. Fine pointers only; on touch the OS cursor stays.
 */
const STATES = ['nib'];
const ALL_PENS = () => [...NIBS, ...LOANERS];
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
      el.innerHTML = icons[n.icon || n.name] || '';
      el.style.setProperty('--rot', `${n.rot}deg`);
      el.style.setProperty('--flip', n.flip ? '-1' : '1');
      el.style.setProperty('--tx', `${(-n.tip[0] * k).toFixed(2)}px`);
      el.style.setProperty('--ty', `${(-n.tip[1] * k).toFixed(2)}px`);
      if (animate) gsap.fromTo(leanRef.current, { scale: 0.3 }, { scale: 1, duration: 0.55, ease: 'back.out(2.2)', overwrite: true });
    };
    // which pen: turning arrow over the cube, else what a thing hands you, else your own
    let over = null;
    const onOver = (e) => (over = e.target.closest?.('[data-pen]')?.dataset.pen || null);
    window.addEventListener('pointerover', onOver);
    // Shift turns a face the other way, so the arrow shows it before you click
    let shift = false;
    const onKey = (e) => (shift = e.shiftKey);
    const onMove = (e) => (shift = e.shiftKey);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('pointermove', onMove, { passive: true });
    const offShift = () => (shift = false);
    window.addEventListener('blur', offShift);
    const choose = () => {
      const mine = nib();
      if (mine.name === 'system' || !icons) return;
      const turning = bus.cursorHint === 'rotate' || document.documentElement.classList.contains('is-orbiting');
      const want = turning ? (shift ? 'rotate-ccw' : 'rotate-cw') : over;
      paint(want ? ALL_PENS().find((x) => x.name === want) || mine : mine);
    };
    gsap.ticker.add(choose);
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
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', offShift);
      gsap.ticker.remove(choose);
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
    let menuUntil = 0;
    let lastFix = 0;
    // macOS shows its own cursor for its menus and popovers (a right-click,
    // Look Up…) and the browser doesn't hide it again until the style changes —
    // so after any of those, keep re-asserting the hidden cursor for a while
    const fix = () => {
      html.classList.remove('cursor-hidden');
      void html.offsetWidth;
      requestAnimationFrame(() => html.classList.add('cursor-hidden'));
    };
    const soon = () => (menuUntil = performance.now() + 5000);
    const move = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      // the tip is the pointer: no lag at all
      pen.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (!seen || !pen.classList.contains('is-on')) {
        seen = true;
        pen.classList.add('is-on');
      }
      const now = performance.now();
      if (now < menuUntil && now - lastFix > 140) {
        lastFix = now;
        fix();
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
      soon();
      pen.classList.remove('is-on');
    };
    const onFocus = () => {
      soon();
      fix();
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

    const down = () => html.classList.add('cursor-down');
    const up = () => html.classList.remove('cursor-down');

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    document.addEventListener('pointerleave', leave);
    document.addEventListener('pointerenter', enter);
    window.addEventListener('contextmenu', onMenu);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', soon);
    window.addEventListener('pointerdown', fix);
    document.addEventListener('visibilitychange', onFocus);
    gsap.ticker.add(sync);

    return () => {
      html.classList.remove('cursor-hidden', 'cursor-over-link', 'cursor-down', 'cursor-has-mark');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerenter', enter);
      window.removeEventListener('contextmenu', onMenu);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', soon);
      window.removeEventListener('pointerdown', fix);
      document.removeEventListener('visibilitychange', onFocus);
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
        {/* nib — a pen nib with its breather hole and slit, for the gratitude input */}
        <svg className="cursor-mark cursor-mark--nib" viewBox="0 0 56 56">
          <path d="M28 49 16.5 29 22 13h12l5.5 16z" />
          <circle cx="28" cy="27" r="2.6" />
          <path d="M28 30v15" />
        </svg>
      </div>
    </div>
  );
}
