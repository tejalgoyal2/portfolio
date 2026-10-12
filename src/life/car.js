import { gsap } from 'gsap';
import { prefs } from './prefs';

/**
 * A little line-drawn car that drives along a path as you scroll — over the
 * rule under the Profile headline, over the mountains into Experience.
 *
 * It doesn't snap to the scroll: the scroll sets where it's heading and the
 * car drives there — pulling away, cruising, easing to a stop — on a soft
 * spring, so a flick of the wheel is a burst of speed, not a teleport. The
 * wheels turn with the distance covered, the body squats back when it pulls
 * away and dips when it brakes, it faces the way it's going, and while it's
 * moving it puffs little clouds of exhaust that drift back and fade.
 *
 * Only runs while its host is on screen. Reduced motion: parked, no puffs.
 *
 *   startCar(host, { pathAt(s) → { x, y, angle }, length(), target() → s, scale })
 */
const W = 64;
const BASE = 27; // where the wheels touch the ground, in the drawing's units
export const CAR_SVG = `<svg class="car-svg" viewBox="0 0 64 30" width="64" height="30" aria-hidden="true">
  <g class="car-body">
    <path class="car-shell" d="M4 22V16Q4 13 7 13H14L20 6.5Q21.5 5 24 5H38Q40.5 5 42 6.5L48 13L56 14Q60 14.8 60 18V22H54.5A6.5 6.5 0 0 0 41.5 22H22.5A6.5 6.5 0 0 0 9.5 22Z"/>
    <path class="car-glass" d="M22.5 12 25.8 7.6H31V12ZM33 12V7.6H38.2L41.6 12Z"/>
    <path class="car-stripe" d="M10 17.4H54"/>
    <circle class="car-lamp" cx="57.4" cy="16.4" r="1.1"/>
    <path class="car-pipe" d="M4.2 20.6H1.6"/>
  </g>
  <g transform="translate(16 22)"><g class="car-spin"><circle r="5"/><path d="M-3.2 0H3.2M0 -3.2V3.2"/></g></g>
  <g transform="translate(48 22)"><g class="car-spin"><circle r="5"/><path d="M-3.2 0H3.2M0 -3.2V3.2"/></g></g>
</svg>`;

export function startCar(host, { pathAt, length, target, scale = 1, className = '' }) {
  const el = document.createElement('div');
  el.className = `press-car ${className}`.trim();
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = CAR_SVG;
  el.style.setProperty('--car-scale', scale);
  host.appendChild(el);
  const body = el.querySelector('.car-body');
  const wheels = [...el.querySelectorAll('.car-spin')];

  let s = target();
  let v = 0;
  let face = 1;
  let spin = 0;
  let pitch = 0;
  let puffClock = 0;
  let on = false;

  const place = (dt) => {
    const len = Math.max(1, length());
    const goal = Math.max(0, Math.min(len, target()));
    if (prefs.reduced || dt === 0) {
      s = goal;
      v = 0;
    } else {
      // drive there: a soft spring (pull away, cruise, ease in), with a top speed
      const prevV = v;
      v += (7 * (goal - s) - 5.2 * v) * dt;
      v = Math.max(-900, Math.min(900, v));
      s += v * dt;
      const accel = (v - prevV) / dt;
      // squat back pulling away, dip braking — about the rear wheel
      const want = Math.max(-5, Math.min(5, -accel * 0.004 * face));
      pitch += (want - pitch) * (1 - Math.exp(-10 * dt));
      spin += (v * dt) / (5 * scale);
      if (v > 6) face = 1;
      else if (v < -6) face = -1;
    }
    const p = pathAt(s);
    const k = scale;
    el.style.transform = `translate3d(${(p.x - (W / 2) * k).toFixed(1)}px, ${(p.y - BASE * k).toFixed(1)}px, 0) rotate(${p.angle.toFixed(2)}rad) scaleX(${face})`;
    body.setAttribute('transform', `rotate(${(pitch * face).toFixed(2)} 16 22)`);
    const deg = ((spin * 180) / Math.PI).toFixed(1);
    wheels.forEach((w) => w.setAttribute('transform', `rotate(${deg})`));

    // exhaust while it's moving: more often the faster it goes
    const speed = Math.abs(v);
    puffClock -= dt;
    if (!prefs.reduced && speed > 28 && puffClock <= 0) {
      puffClock = Math.max(0.06, 0.2 - speed / 3000);
      puff(p, k);
    }
  };

  function puff(p, k) {
    // the pipe, behind the car, turned with the road
    const back = -face * (W / 2 - 1.5) * k;
    const up = -(BASE - 20.6) * k;
    const c = Math.cos(p.angle);
    const sn = Math.sin(p.angle);
    const x = p.x + back * c - up * sn;
    const y = p.y + back * sn + up * c;
    const dot = document.createElement('span');
    dot.className = 'car-puff';
    const r = (3 + Math.random() * 3) * k;
    dot.style.width = dot.style.height = `${r * 2}px`;
    dot.style.left = `${x - r}px`;
    dot.style.top = `${y - r}px`;
    host.appendChild(dot);
    const dx = -face * (14 + Math.random() * 16) * k;
    const dy = -(8 + Math.random() * 12) * k;
    const a = dot.animate(
      [
        { transform: 'translate(0,0) scale(0.35)', opacity: 0.7 },
        { transform: `translate(${dx * 0.5}px,${dy * 0.4}px) scale(1)`, opacity: 0.45, offset: 0.35 },
        { transform: `translate(${dx}px,${dy}px) scale(1.7)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)' }
    );
    a.onfinish = () => dot.remove();
  }

  const tick = (time, deltaMs) => {
    if (!on || document.hidden) return;
    place(Math.min(0.05, deltaMs / 1000));
  };
  const io = new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    if (on) place(0);
  });
  io.observe(host);
  gsap.ticker.add(tick);
  place(0);

  return () => {
    io.disconnect();
    gsap.ticker.remove(tick);
    el.remove();
    host.querySelectorAll('.car-puff').forEach((d) => d.remove());
  };
}
