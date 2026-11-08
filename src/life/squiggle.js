import { gsap } from 'gsap';
import { prefs } from './prefs';

/**
 * A headline that scribbles back. Move over a letter and it turns into a loop
 * of red pen, a coiled string drawn from top to bottom that keeps wriggling
 * for as long as you stay on it; move off and the letter springs back into
 * its place. On a touch screen a tap does it, and the scribble lets go by
 * itself after a beat.
 *
 * Only the letters you touch ever move, and only the few under the pointer
 * at any moment: one small SVG path each, redrawn on the shared GSAP ticker,
 * which stops the moment the last scribble is gone. Nothing runs on its own,
 * so there is no animation to sit through, and reduced motion gets none.
 * The letter underneath keeps its text (it is only made transparent), so
 * selecting and reading the headline are untouched.
 */
const NS = 'http://www.w3.org/2000/svg';
const DRAW = 0.32; // seconds to draw the string in
const HOLD = 0.75; // the least a scribble stays, so a fast flick still reads
const TURNS = 3.4; // how many loops of the coil, top to bottom
const POINTS = 56;

const live = new Map(); // letter -> its scribble
let ticking = false;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seeded = (el) => {
  // each letter wriggles in its own phase, the same every time
  const t = el.textContent || '';
  return ((t.charCodeAt(0) || 1) * 12.9898) % (Math.PI * 2);
};

function shape(s, now) {
  const { w, h } = s;
  const p = clamp01((now - s.t0) / DRAW);
  const n = Math.max(2, Math.round(POINTS * (1 - (1 - p) ** 3)));
  const ph = s.seed + (now - s.t0) * 9;
  const cx = w / 2;
  const R = w * 0.5;
  const top = h * 0.2;
  const span = h * 0.62;
  let d = '';
  for (let i = 0; i < n; i++) {
    const u = i / (POINTS - 1);
    const a = u * TURNS * Math.PI * 2 + ph;
    const x = cx + R * Math.cos(a) * (0.82 + 0.18 * Math.sin(u * 9 + ph * 0.7));
    const y = top + u * span + R * 0.62 * Math.sin(a) + Math.sin(u * 5 - ph * 0.4) * h * 0.012;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  s.path.setAttribute('d', d);
}

function release(el, s) {
  live.delete(el);
  s.svg.remove();
  el.removeAttribute('data-squig');
  el.classList.add('kh-back');
  el.addEventListener('animationend', () => el.classList.remove('kh-back'), { once: true });
}

function tick() {
  const now = performance.now() / 1000;
  for (const [el, s] of live) {
    if (!s.hover && now - s.t0 > HOLD && now - s.left > 0.12) release(el, s);
    else shape(s, now);
  }
  if (!live.size) {
    gsap.ticker.remove(tick);
    ticking = false;
  }
}

function grab(el, touch) {
  const now = performance.now() / 1000;
  const had = live.get(el);
  if (had) {
    had.hover = !touch;
    had.left = touch ? now : had.left;
    return;
  }
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (!w || !h) return;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'kh-squig');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', (h * 0.075).toFixed(2));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  el.appendChild(svg);
  el.dataset.squig = '';
  const s = { svg, path, w, h, t0: now, seed: seeded(el), hover: !touch, left: now };
  live.set(el, s);
  shape(s, now);
  if (!ticking) {
    ticking = true;
    gsap.ticker.add(tick);
  }
}

/** Make a set headline scribble under the pointer. Returns the undo. */
export function squiggle(root) {
  if (!root) return () => {};
  const letter = (e) => {
    if (prefs.reduced) return null;
    const el = e.target instanceof Element ? e.target.closest('.kh-char') : null;
    return el && root.contains(el) && el.textContent.trim() ? el : null;
  };
  const over = (e) => {
    const el = letter(e);
    if (el) grab(el, e.pointerType === 'touch');
  };
  const out = (e) => {
    const el = e.target instanceof Element ? e.target.closest('.kh-char') : null;
    const s = el && live.get(el);
    if (s && e.pointerType !== 'touch') {
      s.hover = false;
      s.left = performance.now() / 1000;
    }
  };
  root.addEventListener('pointerover', over);
  root.addEventListener('pointerdown', over);
  root.addEventListener('pointerout', out);
  return () => {
    root.removeEventListener('pointerover', over);
    root.removeEventListener('pointerdown', over);
    root.removeEventListener('pointerout', out);
    for (const [el, s] of [...live]) if (root.contains(el)) release(el, s);
  };
}
