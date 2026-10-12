import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefs } from './prefs';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Three ways the Profile gets its words onto the page, each played once as
 * the text comes up — and each finished before you'd be reading that line. The
 * words never change place: everything here is opacity, a clip or a transform
 * on letters that are already laid out. Reduced motion: the text is printed.
 *
 *   typeOut(p)    the lead is typed: word by word behind a red caret, with a
 *                 beat at the commas and stops (the drop cap is struck first)
 *   settle(p)     the body arrives jumbled — every letter small, tipped and
 *                 scattered — and shakes itself into place, fast then easing
 *   handwrite(ul) the margin notes are written out by a pencil, one after the
 *                 other in a single unbroken run of the pen
 */
const once = (el, start, fn) => ScrollTrigger.create({ trigger: el, start, once: true, onEnter: fn });

export function typeOut(p) {
  if (prefs.reduced) return () => {};
  const text = p.textContent;
  const original = p.innerHTML;
  // the first letter stays a bare text node so ::first-letter still makes the drop cap
  const [, first, rest] = text.match(/^(\s*\S)([\s\S]*)$/) || [null, '', text];
  p.textContent = first;
  const words = [];
  for (const part of rest.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      p.appendChild(document.createTextNode(part));
      continue;
    }
    const w = document.createElement('span');
    w.className = 'tw';
    w.textContent = part;
    p.appendChild(w);
    words.push(w);
  }
  const caret = document.createElement('span');
  caret.className = 'tw-caret';
  caret.setAttribute('aria-hidden', 'true');
  p.appendChild(caret);
  p.classList.add('is-typing');
  // measured from boxes, not offsets: inline offsets go wrong round the floated drop cap
  const at = (w) => {
    const o = p.getBoundingClientRect();
    const r = w.getBoundingClientRect();
    caret.style.transform = `translate(${(r.right - o.left + 2).toFixed(1)}px, ${(r.top - o.top).toFixed(1)}px)`;
    caret.style.height = `${r.height.toFixed(1)}px`;
  };
  at(words[0]);

  let timer = 0;
  const st = once(p, 'top 82%', () => {
    let i = 0;
    const next = () => {
      const w = words[i++];
      if (!w) {
        caret.classList.add('is-done');
        return;
      }
      w.classList.add('is-in');
      at(w);
      const beat = /[,;:—]$/.test(w.textContent) ? 110 : /[.!?]$/.test(w.textContent) ? 200 : 0;
      timer = setTimeout(next, 9 + Math.random() * 14 + beat * 0.7);
    };
    next();
  });
  return () => {
    clearTimeout(timer);
    st.kill();
    p.innerHTML = original;
    p.classList.remove('is-typing');
  };
}

export function settle(p) {
  if (prefs.reduced) return () => {};
  const split = SplitText.create(p, { type: 'words,chars', charsClass: 'jc', aria: 'none' });
  const chars = split.chars;
  const rnd = gsap.utils.random;
  gsap.set(chars, {
    opacity: 0,
    scale: () => rnd(0.25, 0.5),
    x: () => rnd(-14, 14),
    y: () => rnd(-12, 12),
    rotation: () => rnd(-50, 50),
  });
  let tween = null;
  const st = once(p, 'top 86%', () => {
    tween = gsap.to(chars, {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
      duration: 0.85,
      ease: 'expo.out',
      // in reading order, but not in lockstep: a little shuffle in the timing
      stagger: { each: 0.0045, from: 'start' },
      delay: 0.05,
    });
  });
  return () => {
    st.kill();
    tween?.kill();
    split.revert();
  };
}

export function handwrite(list, penSvg) {
  if (prefs.reduced) return () => {};
  const items = [...list.children];
  items.forEach((li) => li.classList.add('hw'));
  const pen = document.createElement('span');
  pen.className = 'hw-pen';
  pen.setAttribute('aria-hidden', 'true');
  pen.innerHTML = penSvg;
  list.appendChild(pen);
  gsap.set(items, { clipPath: 'inset(-20% 100% -30% 0)' });

  let tl = null;
  const st = once(list, 'top 80%', () => {
    tl = gsap.timeline();
    tl.set(pen, { opacity: 1 });
    items.forEach((li, i) => {
      const w = li.offsetWidth;
      const x0 = li.offsetLeft;
      const y0 = li.offsetTop + li.offsetHeight * 0.78;
      const dur = Math.max(0.45, w / 210);
      // the pen hops to the start of the line (an arc through the air), then writes it
      tl.to(pen, { x: x0, y: y0, duration: i === 0 ? 0.01 : 0.28, ease: 'power2.inOut' });
      const prog = { p: 0 };
      tl.to(
        prog,
        {
          p: 1,
          duration: dur,
          ease: 'none',
          onUpdate() {
            const k = prog.p;
            li.style.clipPath = `inset(-20% ${((1 - k) * 100).toFixed(2)}% -30% 0)`;
            // the hand makes letters: a quick up-and-down scribble as it moves along
            const wobble = Math.sin(k * w * 0.42) * 3.2 + Math.sin(k * w * 0.13) * 1.6;
            gsap.set(pen, { x: x0 + w * k, y: y0 - 4 + wobble });
          },
        },
        '>'
      );
    });
    tl.to(pen, { opacity: 0, y: '-=14', duration: 0.4, ease: 'power1.in' }, '+=0.15');
    tl.add(() => items.forEach((li) => (li.style.clipPath = 'none')));
  });
  return () => {
    st.kill();
    tl?.kill();
    pen.remove();
    items.forEach((li) => {
      li.classList.remove('hw');
      li.style.clipPath = '';
    });
  };
}
