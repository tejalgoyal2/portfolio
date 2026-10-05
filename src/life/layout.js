import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { naturalLayout, measureSheets } from './sheets';

/**
 * One "the layout may have moved" signal for everything that caches positions
 * in document coordinates (the ground map, text masks, cube homes, letter
 * centres). Fires once per frame at most, after window resizes, body size
 * changes, late font swaps and ScrollTrigger refreshes. Subscribers run inside
 * naturalLayout(), so what they measure is where things sit in the flow, not
 * where a stuck sheet happens to be holding them.
 */
const subs = new Set();
let raf = 0;
let started = false;

const fire = () => {
  raf = 0;
  naturalLayout(() => {
    measureSheets();
    subs.forEach((fn) => fn());
  });
};

export function relayout() {
  if (!raf) raf = requestAnimationFrame(fire);
}

function start() {
  if (started) return;
  started = true;
  window.addEventListener('resize', relayout);
  new ResizeObserver(relayout).observe(document.body);
  document.fonts?.ready.then(relayout);
  ScrollTrigger.addEventListener('refresh', relayout);
}

export function onLayout(fn) {
  start();
  subs.add(fn);
  return () => subs.delete(fn);
}
