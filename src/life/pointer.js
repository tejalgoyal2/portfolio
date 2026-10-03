import { gsap } from 'gsap';

/**
 * One shared pointer for the whole life layer: position, smoothed velocity,
 * how long it has rested, and what it's over. A single set of window
 * listeners feeds it; everything else reads it inside its gsap.ticker
 * callback, so no module adds its own pointermove or rAF loop.
 *
 * A touch pointer is only `active` while the finger is down.
 */
export const pointer = {
  x: -1e4,
  y: -1e4,
  vx: 0,
  vy: 0,
  speed: 0,
  active: false,
  down: false,
  rest: 0,
  target: null,
  type: 'mouse',
};

let started = false;

export function startPointer() {
  if (started || typeof window === 'undefined') return;
  started = true;
  let lastT = 0;
  let lastMove = 0;

  const place = (e) => {
    const t = performance.now();
    if (pointer.active && t > lastT) {
      const dt = Math.min(0.1, (t - lastT) / 1000);
      const k = 0.35;
      pointer.vx += ((e.clientX - pointer.x) / dt - pointer.vx) * k;
      pointer.vy += ((e.clientY - pointer.y) / dt - pointer.vy) * k;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.target = e.target;
    pointer.type = e.pointerType || 'mouse';
    lastT = t;
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      place(e);
      pointer.active = pointer.type !== 'touch' || pointer.down;
      pointer.rest = 0;
      lastMove = performance.now();
    },
    { passive: true }
  );
  window.addEventListener(
    'pointerdown',
    (e) => {
      pointer.down = true;
      place(e);
      pointer.active = true;
      pointer.rest = 0;
    },
    { passive: true }
  );
  const lift = (e) => {
    pointer.down = false;
    if ((e.pointerType || pointer.type) === 'touch') pointer.active = false;
  };
  window.addEventListener('pointerup', lift, { passive: true });
  window.addEventListener('pointercancel', lift, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    pointer.active = false;
  });
  window.addEventListener('blur', () => {
    pointer.active = false;
    pointer.down = false;
  });

  gsap.ticker.add((time, deltaMs) => {
    const dt = deltaMs / 1000;
    pointer.rest += dt;
    // the pointer stopped: let its velocity bleed away instead of sticking
    if (performance.now() - lastMove > 40) {
      const f = Math.exp(-dt * 10);
      pointer.vx *= f;
      pointer.vy *= f;
    }
    pointer.speed = Math.hypot(pointer.vx, pointer.vy);
  });
}
