import { useEffect, useLayoutEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gsap } from 'gsap';

gsap.registerPlugin(ScrollTrigger);

/**
 * A split-flap board, like an old station departures sign. The words sit on
 * blank flaps; when it's their turn each flap clatters through a few random
 * characters — letters for letters, digits for digits — and lands on the
 * real one, left to right, so the word arrives with a little rattle rather
 * than being uncovered. Each character keeps exactly its own width the whole
 * time, so nothing around it moves.
 *
 * - trigger 'scroll' (a stat, a word in a bullet): flips as it comes into view.
 * - trigger 'hover' (the punchline in a blog title): waits blank until you
 *   point at it (on touch, a moment after it's on screen); point again for
 *   another rattle.
 *
 * The real text is always there for screen readers. Reduced motion: the
 * words are simply shown.
 *
 *   trigger: 'scroll' | 'hover'   tone: 'ink' | 'red'
 */
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
    flaps.forEach((f) => (f.style.width = `${f.getBoundingClientRect().width.toFixed(2)}px`));
    flaps.forEach((f, i) => {
      if (!/\s/.test(text[i])) f.textContent = '·';
    });
  }, [text]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const flaps = [...wrap.querySelectorAll('.flap')];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = new Set();
    let busy = false;

    const flip = () => {
      if (busy) return;
      busy = true;
      wrap.classList.add('is-shown');
      if (reduced) {
        flaps.forEach((f, i) => (f.textContent = text[i]));
        busy = false;
        return;
      }
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
          f.classList.remove('is-flip');
          void f.offsetWidth;
          f.classList.add('is-flip');
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
