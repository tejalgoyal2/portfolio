import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { pointer } from '../life/pointer';
import { prefs } from '../life/prefs';
import { onLayout } from '../life/layout';
import { Spring, smoothstep } from '../life/spring';
import { scroll } from '../life/scroll';

/**
 * The nameplate letters, set as separate sorts so each can take more ink.
 * Near the cursor (or a finger on touch) a letter's Fraunces optical size
 * drops from display (144) toward text cuts, which thickens its hairlines the
 * way an over-inked forme squeezes ink out — then springs back as you leave.
 *
 * Each sort's width is locked to its resting advance, and the lower optical
 * size (which is wider) is squeezed back into that advance with a matching
 * scaleX, so an inked letter gets heavier without shoving or colliding with
 * its neighbours. This is the one effect that animates a font axis rather
 * than only a transform; just the letters that changed are written, and
 * nothing runs when the pointer is away. Reduced motion: the plate stays as set.
 *
 * When the name first lands on the page (`press:landed`, from the loader — or
 * straight away if the press already ran this visit), an invisible pen runs
 * along it from the T to the L, inking each letter as it passes, so the
 * nameplate settles into the page with one bright pass of ink.
 */
const SWEEP = 2.3; // seconds, T to L: slow enough to watch the ink travel
const OPSZ_REST = 144;
const OPSZ_INKED = 28;
const WGHT_REST = 860;
const WGHT_INKED = 900;

const axes = (v) => `"opsz" ${(OPSZ_REST + (OPSZ_INKED - OPSZ_REST) * v).toFixed(1)}, "wght" ${(WGHT_REST + (WGHT_INKED - WGHT_REST) * v).toFixed(0)}, "SOFT" 0, "WONK" 0`;

export default function Nameplate({ text }) {
  const ref = useRef(null);

  useEffect(() => {
    const plate = ref.current;
    if (!plate) return;
    const sorts = [...plate.querySelectorAll('.np-sort')];
    const springs = sorts.map(() => new Spring(0, 0.42, 0.62));
    const written = sorts.map(() => -1);
    sorts.forEach((s) => (s.style.fontVariationSettings = axes(0)));

    // letter centres relative to the plate, the plate's document box, and how
    // much each letter must be squeezed to keep its fully inked cut in its advance
    let centres = [];
    let squeeze = sorts.map(() => 1);
    let awake = false;
    let box = { x: 0, y: 0, w: 0, h: 0 };
    let reach = 120;
    const measure = () => {
      // measured upright and unscaled, whatever else is moving them, so a
      // re-measure mid-animation never locks in a tilted letter's wider box
      const unlock = (v) =>
        sorts.forEach((s) => {
          s.style.width = '';
          s.style.transform = '';
          s.style.translate = 'none';
          s.style.rotate = 'none';
          s.style.fontVariationSettings = axes(v);
        });
      unlock(0);
      const pr = plate.getBoundingClientRect();
      box = { x: pr.left, y: pr.top + window.scrollY, w: pr.width, h: pr.height };
      centres = sorts.map((s) => {
        const r = s.getBoundingClientRect();
        return { x: r.left + r.width / 2 - pr.left, y: r.top + r.height / 2 - pr.top, w: r.width };
      });
      unlock(1);
      squeeze = sorts.map((s, i) => Math.min(1, centres[i].w / Math.max(1, s.getBoundingClientRect().width)));
      unlock(0);
      sorts.forEach((s, i) => {
        s.style.translate = '';
        s.style.rotate = '';
        s.style.width = `${centres[i].w}px`;
        written[i] = -1; // repaint from rest on the next tick
      });
      awake = true;
      reach = Math.max(90, pr.height * 0.95);
    };
    measure();
    const offLayout = onLayout(measure);

    // the landing sweep: a virtual pointer travelling the plate, eased
    let sweepT = -1;
    const startSweep = () => {
      if (prefs.reduced) return;
      sweepT = 0;
      awake = true;
    };
    window.addEventListener('press:landed', startSweep);
    const early = sessionStorage.getItem('press-loaded') ? setTimeout(startSweep, 500) : 0;

    const tick = (time, deltaMs) => {
      if (prefs.reduced) return;
      const dt = Math.min(0.05, deltaMs / 1000);
      let sx = null;
      if (sweepT >= 0) {
        sweepT += dt / SWEEP;
        const u = sweepT < 0.5 ? 2 * sweepT * sweepT : 1 - (-2 * sweepT + 2) ** 2 / 2;
        sx = -reach * 0.6 + (box.w + reach * 1.2) * u;
        if (sweepT >= 1) sweepT = -1;
      }
      // read where the plate is now — one rect, and only while a pointer is
      // about somewhere near where the plate sits (judged from its cached box,
      // so further down the page nothing is read at all)
      const top = box.y - scroll.y;
      const roughly =
        pointer.active && pointer.y > top - reach * 2 && pointer.y < top + box.h * 1.4 + reach * 2;
      const live = roughly ? plate.getBoundingClientRect() : null;
      const k = live ? live.width / (box.w || 1) : 1;
      const near =
        !!live &&
        pointer.x > live.left - reach &&
        pointer.x < live.right + reach &&
        pointer.y > live.top - reach &&
        pointer.y < live.bottom + reach;
      if (!near && !awake && sx === null) return;

      let moving = false;
      for (let i = 0; i < sorts.length; i++) {
        const c = centres[i];
        const sp = springs[i];
        sp.target = 0;
        if (near) {
          const d = Math.hypot(pointer.x - (live.left + c.x * k), (pointer.y - (live.top + c.y * k)) * 1.15);
          sp.target = 1 - smoothstep(0, reach, d);
        }
        if (sx !== null) sp.target = Math.max(sp.target, 1 - smoothstep(0, reach * 0.9, Math.abs(sx - c.x)));
        sp.step(dt);
        if (!sp.settled) moving = true;
        const v = Math.max(0, Math.min(1, sp.value));
        if (Math.abs(v - written[i]) > 0.004) {
          written[i] = v;
          sorts[i].style.fontVariationSettings = axes(v);
          sorts[i].style.transform = v > 0.004 ? `scaleX(${(1 + (squeeze[i] - 1) * v).toFixed(4)})` : '';
        }
      }
      awake = near || moving || sx !== null;
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      offLayout();
      clearTimeout(early);
      window.removeEventListener('press:landed', startSweep);
      sorts.forEach((s) => {
        s.style.width = '';
        s.style.fontVariationSettings = '';
        s.style.transform = '';
      });
    };
  }, [text]);

  return (
    <span ref={ref} className="np" aria-hidden="true">
      {[...text].map((ch, i) =>
        ch === ' ' ? (
          <span className="np-space" key={i}>
            {' '}
          </span>
        ) : (
          <span className="np-sort" key={i}>
            {ch}
          </span>
        )
      )}
    </span>
  );
}
