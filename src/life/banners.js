import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SECTIONS } from '../data/sections';
import { prefs } from './prefs';
import { pointer } from './pointer';
import { scroll } from './scroll';

gsap.registerPlugin(ScrollTrigger);

/**
 * The section banners: each section's name set in huge wood type and hung up
 * to dry behind it — every letter pegged to a sagging string, swinging from
 * its peg.
 *
 * - Brush past a letter and it swings, the way your hand moved; a hard scroll
 *   sets the whole line swaying, each letter a beat behind the last.
 * - Where the pen touches a letter it soaks up ink, then slowly dries back to
 *   an outline — so you can leave the name half-inked as you go.
 * - The line drifts sideways as the section passes (a slow parallax).
 *
 * Real motion only: each letter is a damped pendulum on a transform. Banners
 * sit behind the content and never take a click; they only run while their
 * section is on screen. Reduced motion: they hang still (the ink still works).
 */
const K = 16; // spring of the swing
const DAMP = 1.5; // light: it swings a few times and settles
const MAX = 0.42; // rad
const INK_IN = 2.6; // per second while the pen is on it
const INK_OUT = 0.09; // drying, per second

export function startBanners(root = document) {
  const made = [];
  for (const { key, label } of SECTIONS.slice(1)) {
    const section = root.querySelector(`[data-section="${key}"]`);
    if (!section) continue;
    const el = document.createElement('div');
    el.className = 'folio';
    el.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    line.setAttribute('class', 'folio-string');
    line.setAttribute('preserveAspectRatio', 'none');
    line.setAttribute('viewBox', '0 0 100 10');
    line.innerHTML = '<path d="M0 1 Q50 9 100 1" vector-effect="non-scaling-stroke"/>';
    el.appendChild(line);
    const letters = [...label].map((ch, i) => {
      const s = document.createElement('span');
      s.className = ch === ' ' ? 'folio-gap' : 'folio-sort';
      s.textContent = ch === ' ' ? ' ' : ch;
      s.style.setProperty('--i', i);
      el.appendChild(s);
      return s;
    });
    section.prepend(el);

    const sorts = letters.filter((s) => s.classList.contains('folio-sort'));
    const n = sorts.length;
    const st = sorts.map((s, i) => {
      // hang lower in the middle of the line, where the string sags
      const u = n > 1 ? i / (n - 1) : 0.5;
      s.style.setProperty('--sag', `${(Math.sin(u * Math.PI) * 0.09).toFixed(3)}em`);
      return { el: s, th: 0, w: 0, ink: 0, was: false, written: '' };
    });

    const slide = prefs.reduced
      ? null
      : gsap.timeline({ scrollTrigger: { trigger: section, start: 'top bottom', end: 'top -60%', scrub: 0.6 } });
    slide?.fromTo(el, { xPercent: 10 }, { xPercent: -30, ease: 'none' });

    let on = false;
    const io = new IntersectionObserver(([e]) => (on = e.isIntersecting));
    io.observe(section);
    let lastV = 0;

    const tick = (t, deltaMs) => {
      if (!on || document.hidden) return;
      const dt = Math.min(0.05, deltaMs / 1000);
      const dv = scroll.v - lastV;
      lastV = scroll.v;
      for (let i = 0; i < st.length; i++) {
        const s = st[i];
        const r = s.el.getBoundingClientRect();
        const over =
          pointer.active &&
          pointer.x > r.left - 10 &&
          pointer.x < r.right + 10 &&
          pointer.y > r.top &&
          pointer.y < r.bottom;
        if (!prefs.reduced) {
          // the hand brushes it the way it was moving; a scroll jolts the line, letter by letter
          if (over && !s.was) s.w += Math.max(-2.6, Math.min(2.6, pointer.vx * 0.0011));
          s.w += dv * 0.00002 * (1 + 0.15 * Math.sin(i * 1.7));
          s.w += (-K * s.th - DAMP * s.w) * dt;
          s.th = Math.max(-MAX, Math.min(MAX, s.th + s.w * dt));
        }
        s.was = over;
        s.ink = over ? Math.min(1, s.ink + INK_IN * dt) : Math.max(0, s.ink - INK_OUT * dt);
        const key = `${s.th.toFixed(3)}|${s.ink.toFixed(2)}`;
        if (key !== s.written) {
          s.written = key;
          s.el.style.rotate = `${s.th.toFixed(4)}rad`;
          s.el.style.setProperty('--ink', s.ink.toFixed(2));
        }
      }
    };
    gsap.ticker.add(tick);
    made.push(() => {
      gsap.ticker.remove(tick);
      io.disconnect();
      slide?.revert();
      el.remove();
    });
  }
  return () => made.forEach((f) => f());
}
