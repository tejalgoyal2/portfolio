import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SECTIONS } from '../data/sections';
import { prefs } from './prefs';
import { pointer } from './pointer';
import { scroll } from './scroll';
import { onLayout } from './layout';

gsap.registerPlugin(ScrollTrigger);

/**
 * The section banners: each section's name set in huge wood type and hung up
 * to dry behind it — every letter pegged to a sagging string, swinging from
 * its peg.
 *
 * - The wind blows by on its own: every few seconds a gust runs along the
 *   line, one way then the other, pushing each letter as it passes the way a
 *   hand swept across them would.
 * - Your cursor passing near is a breeze too: its movement is smoothed over a
 *   moment (so a quick wiggle does nothing much) and pushes the nearby
 *   letters gently the way it went; a hard scroll sets the whole line swaying.
 *   The swing is slow and lightly damped, so it dies away over several seconds.
 * - Where the pen touches a letter it soaks up ink, then slowly dries back to
 *   an outline — so you can leave the name half-inked as you go.
 * - The line drifts sideways as the section passes (a slow parallax).
 *
 * Real motion only: each letter is a damped pendulum on a transform. Banners
 * sit behind the content and never take a click; they only run while their
 * section is on screen. Reduced motion: they hang still (the ink still works).
 */
const K = 5.5; // a slow swing: about a two-and-a-half second period
const DAMP = 0.42; // very light: it dies away over several seconds
const MAX = 0.3; // rad
const INK_IN = 2.6; // per second while the pen is on it
const INK_OUT = 0.09; // drying, per second
const GUST = 1.7; // seconds for a gust to cross the line
const GUST_V = 950; // px/s: about a hand swept across
const LULL = [2.6, 5.2]; // seconds between gusts

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
      return { el: s, th: 0, w: 0, ink: 0, written: '' };
    });

    const slide = prefs.reduced
      ? null
      : gsap.timeline({ scrollTrigger: { trigger: section, start: 'top bottom', end: 'top -60%', scrub: 0.6 } });
    slide?.fromTo(el, { xPercent: 10 }, { xPercent: -30, ease: 'none' });

    // where the line and its letters sit, measured when the layout changes —
    // never per frame (the slide is a known translate, read from gsap's own cache)
    const geo = { left: 0, top: 0, w: 1, h: 1, at: [] };
    const measure = () => {
      const r = el.getBoundingClientRect();
      const xp = (gsap.getProperty(el, 'xPercent') || 0) / 100;
      geo.left = r.left - xp * r.width;
      geo.top = r.top + scroll.y;
      geo.w = r.width;
      geo.h = r.height;
      geo.at = st.map((s) => {
        const lr = s.el.getBoundingClientRect();
        return { x: lr.left - r.left, y: lr.top - r.top, w: lr.width, h: lr.height };
      });
    };
    measure();
    const offLayout = onLayout(measure);

    let on = false;
    const io = new IntersectionObserver(([e]) => (on = e.isIntersecting));
    io.observe(section);
    let lastV = 0;
    let breeze = 0; // smoothed push from the cursor
    let jolt = 0; // smoothed push from the scroll
    // the wind's own gusts: where one is along the line (0..1), which way, and the lull before the next
    let gust = -1;
    let gustDir = Math.random() < 0.5 ? 1 : -1;
    let lull = 0.6 + Math.random() * 1.2;

    const tick = (t, deltaMs) => {
      if (!on || document.hidden) return;
      const dt = Math.min(0.05, deltaMs / 1000);
      const dv = scroll.v - lastV;
      lastV = scroll.v;
      const bx = geo.left + ((gsap.getProperty(el, 'xPercent') || 0) / 100) * geo.w;
      const by = geo.top - scroll.y;
      const inBand = pointer.active && pointer.y > by - 40 && pointer.y < by + geo.h + 20;
      const smooth = 1 - Math.exp(-dt / 0.35);
      breeze += ((inBand ? Math.max(-1600, Math.min(1600, pointer.vx)) : 0) - breeze) * smooth;
      jolt += (Math.max(-40000, Math.min(40000, dv / Math.max(dt, 1e-3))) - jolt) * smooth;
      let gx = 0;
      let gv = 0;
      if (gust < 0) {
        lull -= dt;
        if (lull <= 0) gust = 0;
      } else {
        gust += dt / GUST;
        // it builds and fades as it crosses, like a hand coming in and lifting off
        gv = GUST_V * gustDir * Math.sin(Math.min(1, gust) * Math.PI);
        gx = bx + geo.w * (gustDir > 0 ? gust : 1 - gust);
        if (gust >= 1) {
          gust = -1;
          gustDir = -gustDir;
          lull = LULL[0] + Math.random() * (LULL[1] - LULL[0]);
        }
      }
      for (let i = 0; i < st.length; i++) {
        const s = st[i];
        const a = geo.at[i];
        const rl = bx + a.x;
        const rt = by + a.y;
        const over = inBand && pointer.x > rl - 10 && pointer.x < rl + a.w + 10 && pointer.y > rt && pointer.y < rt + a.h;
        if (!prefs.reduced) {
          // the breeze is strongest on the letters nearest the cursor
          const cx = rl + a.w / 2;
          const near = Math.exp(-(((pointer.x - cx) / 260) ** 2));
          const wind = gv ? gv * 0.0016 * Math.exp(-(((gx - cx) / 260) ** 2)) : 0;
          const push = breeze * 0.0016 * near + wind + jolt * 0.0000016 * (1 + 0.2 * Math.sin(i * 1.7));
          s.w += (push - K * s.th - DAMP * s.w) * dt;
          s.th = Math.max(-MAX, Math.min(MAX, s.th + s.w * dt));
        }
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
      offLayout();
      io.disconnect();
      slide?.revert();
      el.remove();
    });
  }
  return () => made.forEach((f) => f());
}
