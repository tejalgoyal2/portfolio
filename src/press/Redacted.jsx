import { useEffect, useLayoutEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gsap } from 'gsap';

gsap.registerPlugin(ScrollTrigger);

/**
 * A split-flap board, like an old station departures sign. The words are
 * always there to read — nothing covers them — but now and then they rattle:
 * each flap clatters through a few random characters (letters for letters,
 * digits for digits) and lands back on the real one, left to right. Each
 * character keeps exactly its own width the whole time, so nothing around it
 * moves, and it's a handful of text changes, nothing heavier.
 *
 * - trigger 'scroll' (a stat, a word in a bullet): rattles once as it comes
 *   into view.
 * - trigger 'hover' (the punchline in a blog title): rattles when you point
 *   at it (on touch, once as it comes on screen).
 *
 * The real text is always there for screen readers. Reduced motion: the
 * words are simply shown.
 *
 *   trigger: 'scroll' | 'hover'   tone: 'ink' | 'red'
 */
const FLIP = [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.15)' }, { transform: 'scaleY(1)' }];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const pickFor = (ch) => {
  const pool = /\d/.test(ch) ? DIGITS : /[a-z]/i.test(ch) ? LETTERS : null;
  if (!pool) return ch;
  const c = pool[(Math.random() * pool.length) | 0];
  return ch === ch.toLowerCase() ? c.toLowerCase() : c;
};

export default function Redacted({ children, trigger = 'scroll', tone = 'ink' }) {
  const text = String(children);
  const wrapRef = useRef(null);

  // lock each flap to its character's own width, measured with the real text in place
  useLayoutEffect(() => {
    const flaps = [...wrapRef.current.querySelectorAll('.flap')];
    flaps.forEach((f) => (f.style.width = ''));
    // every width read first, then all written: one layout, not one per letter
    const widths = flaps.map((f) => f.getBoundingClientRect().width.toFixed(2));
    flaps.forEach((f, i) => (f.style.width = `${widths[i]}px`));
  }, [text]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const flaps = [...wrap.querySelectorAll('.flap')];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = new Set();
    let busy = false;

    const flip = () => {
      if (busy) return;
      if (reduced) return;
      busy = true;
      let left = flaps.length;
      flaps.forEach((f, i) => {
        const real = text[i];
        if (/\s/.test(real)) {
          left--;
          return;
        }
        const turns = 5 + ((Math.random() * 5) | 0);
        let n = 0;
        const step = () => {
          n++;
          // a flap turning over: squashed flat and back (no reflow to restart it)
          f.animate(FLIP, 90);
          if (n >= turns) {
            f.textContent = real;
            if (--left <= 0) busy = false;
            return;
          }
          f.textContent = pickFor(real);
          const t = setTimeout(step, 42 + n * 6);
          timers.add(t);
        };
        const t = setTimeout(step, i * 38);
        timers.add(t);
      });
    };

    let st = null;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (trigger === 'scroll' || coarse) {
      st = ScrollTrigger.create({
        trigger: wrap,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          const t = setTimeout(flip, trigger === 'scroll' ? 150 : 900);
          timers.add(t);
        },
      });
    }
    if (trigger === 'hover') wrap.addEventListener('pointerenter', flip);
    return () => {
      st?.kill();
      wrap.removeEventListener('pointerenter', flip);
      timers.forEach(clearTimeout);
    };
  }, [text, trigger]);

  return (
    <span ref={wrapRef} className={`flapboard flapboard--${tone}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {[...text].map((ch, i) => (
          <span className="flap" key={i}>
            {ch === ' ' ? '\u00a0' : ch}
          </span>
        ))}
      </span>
    </span>
  );
}
