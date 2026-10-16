import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefs } from './prefs';

gsap.registerPlugin(ScrollTrigger);

/**
 * The Profile's margin notes are written out by a pencil, one after the other
 * in a single unbroken run of the pen — played once as they come up, and
 * finished before you'd be reading them. The words never change place: it's a
 * clip. Reduced motion: the notes are simply there.
 *
 *   handwrite(ul)
 */
const once = (el, start, fn) => ScrollTrigger.create({ trigger: el, start, once: true, onEnter: fn });

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
  // set straight onto the pen every frame (a fresh gsap.set each frame would re-read its styles)
  const penX = gsap.quickSetter(pen, 'x', 'px');
  const penY = gsap.quickSetter(pen, 'y', 'px');

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
            penX(x0 + w * k);
            penY(y0 - 4 + wobble);
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
