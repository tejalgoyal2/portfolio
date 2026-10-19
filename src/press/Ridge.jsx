import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { startCar } from '../life/car';
import { hash } from '../life/spring';
import { prefs } from '../life/prefs';
import { scroll } from '../life/scroll';
import { onLayout } from '../life/layout';

gsap.registerPlugin(ScrollTrigger);

/**
 * Where the cream gives way to the ink spread, the ink rises as a mountain
 * range: a near ridge in solid ink that runs straight into Experience, and a
 * far one behind it, faint, that rises a little slower as you scroll past.
 * Pines stand in clumps along both. A little camper van (surfboard on the
 * roof) drives over the near ridge as the range crosses the screen — and a
 * boulder is rolling after it. It keeps its distance while the van keeps
 * going — but it only rolls so fast, so a quick scroll leaves it behind and
 * it trundles up again after; it gains when the van slows, always nearly,
 * never quite. Turn the van round into it and the van's front tosses it up
 * into the air; it comes down further along and carries on. When they're
 * close a little "!" pops up over the van.
 *
 * The ridges are drawn for the real width (rounded peaks, eased valleys, from
 * a fixed seed so they're the same every visit). Reduced motion: the range is
 * still, the car parked on a summit.
 */
const VB_H = 160;

function range(w, h, seed, top, bottom, step) {
  // alternating summits and saddles, eased between with a cosine so the tops are round
  const pts = [];
  let x = -step * 0.5;
  for (let i = 0; x < w + step; i++) {
    const r = hash(seed + i * 7.31);
    const peak = i % 2 === 0;
    const y = peak ? h * (top + r * 0.22) : h * (bottom + r * 0.16);
    pts.push([x, y]);
    x += step * (0.7 + hash(seed + i * 3.7) * 0.6);
  }
  const at = (px) => {
    let k = 0;
    while (k < pts.length - 2 && pts[k + 1][0] < px) k++;
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[k + 1];
    const t = Math.min(1, Math.max(0, (px - x0) / (x1 - x0)));
    return y0 + (y1 - y0) * (1 - Math.cos(t * Math.PI)) * 0.5;
  };
  let d = `M0 ${h}`;
  for (let px = 0; px <= w; px += 6) d += `L${px} ${at(px).toFixed(1)}`;
  d += `L${w} ${at(w).toFixed(1)}L${w} ${h}Z`;
  return { d, at };
}

/** Clumps of pines standing on a ridge, as one silhouette path. */
function pines(w, at, seed, tall, every) {
  let d = '';
  for (let x = every * hash(seed) * 0.6; x < w; x += every * (0.7 + hash(seed + x) * 0.9)) {
    const n = 2 + ((hash(seed + x * 1.7) * 3) | 0);
    for (let k = 0; k < n; k++) {
      const tx = x + k * tall * 0.42 + hash(seed + x + k) * 6;
      const th = tall * (0.65 + hash(seed + tx * 0.3) * 0.55);
      const base = at(tx) + 3;
      const half = th * 0.26;
      // three tiers of boughs and a stub of trunk, all wound the same way so it fills solid
      for (let t = 0; t < 3; t++) {
        const y0 = base - th * (0.12 + t * 0.27);
        const hw = half * (1 - t * 0.24);
        d += `M${(tx - hw).toFixed(1)} ${y0.toFixed(1)}L${tx.toFixed(1)} ${(y0 - th * 0.42).toFixed(1)}L${(tx + hw).toFixed(1)} ${y0.toFixed(1)}Z`;
      }
      d += `M${(tx - 1.2).toFixed(1)} ${base}V${(base - th * 0.2).toFixed(1)}h2.4V${base}Z`;
    }
  }
  return d;
}

export default function Ridge() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const svg = root.querySelector('.ridge-land');
    const far = root.querySelector('.ridge-far');
    const near = root.querySelector('.ridge-near');
    let ground = (x) => x * 0;
    let w = 1;
    let h = VB_H;

    let docTop = 0;
    const place = () => (docTop = root.getBoundingClientRect().top + scroll.y);
    const draw = () => {
      place();
      w = Math.max(1, root.clientWidth);
      h = root.clientHeight || VB_H;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const step = Math.max(110, w / 9);
      const f = range(w, h, 11, 0.04, 0.42, step * 0.8);
      const n = range(w, h, 47, 0.3, 0.62, step);
      far.setAttribute('d', f.d + pines(w, f.at, 3, 14, 210));
      near.setAttribute('d', n.d + pines(w, n.at, 29, 30, 260));
      ground = n.at;
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(root);

    const ctx = gsap.context(() => {
      if (prefs.reduced) return;
      gsap.fromTo(
        far,
        { y: 26 },
        { y: 0, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom 30%', scrub: true } }
      );
    }, root);

    const slope = (x) => Math.atan2(ground(x + 6) - ground(x - 6), 12);
    const stopCar = startCar(root, {
      kind: 'van',
      scale: 1.1,
      pathAt: (s) => ({ x: s, y: ground(s) + 1.5, angle: slope(s) }),
      length: () => w,
      target: () => {
        if (prefs.reduced) return w * 0.62;
        // where the ridge is on screen, from its cached place on the page
        const top = docTop - scroll.y;
        const vh = scroll.vh;
        const p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.9 + h)));
        return 40 + p * (w - 80);
      },
    });

    // the boulder: rolls after the van along the same ground
    const rock = root.querySelector('.ridge-boulder');
    const yikes = root.querySelector('.ridge-yikes');
    const car = stopCar.state;
    const R = 15;
    const MAXV = 240; // the boulder rolls at its own pace: a fast scroll leaves it behind
    const G = 1500; // gravity, px/s², when it's been thrown
    let side = -1; // which side of the van it's on (along the road)
    let bs = car.s - 140;
    let bv = 0;
    let roll = 0;
    let prevBs = bs;
    let air = null; // { vx, vy, y, bounced } while it's flying: a real arc, in the ridge's own px
    let on = false;
    const io = new IntersectionObserver(([e]) => (on = e.isIntersecting));
    io.observe(root);
    const offLayout = onLayout(place);
    const chase = (t, deltaMs) => {
      if (!on || document.hidden) return;
      const dt = Math.min(0.05, deltaMs / 1000);
      let h = 0;
      if (prefs.reduced) {
        bs = car.s + side * 70;
      } else if (air) {
        // thrown: a plain ballistic arc on screen — on at a steady pace, up and
        // down under gravity — whatever the hills below are doing
        bs += air.vx * dt;
        air.vy += G * dt;
        air.y += air.vy * dt;
        // the ends of the ridge: it knocks off them and comes back in
        if (bs < R || bs > w - R) {
          bs = Math.max(R, Math.min(w - R, bs));
          air.vx *= -0.5;
        }
        const floor = ground(bs) + 1.5 - R;
        if (air.vy > 0 && air.y >= floor) {
          if (!air.bounced && air.vy > 260) {
            // one small bounce, then it rolls on
            air.bounced = true;
            air.y = floor;
            air.vy *= -0.32;
            air.vx *= 0.7;
          } else {
            bv = air.vx * 0.6;
            air = null;
            side = bs > car.s ? 1 : -1;
          }
        }
        if (air) h = Math.max(0, floor - air.y);
      } else {
        // it keeps after the van, never faster than it can roll; when the van
        // turns back towards it, it just keeps coming
        const gap = 64 + Math.min(110, Math.abs(car.v) * 0.3);
        const approaching = side * car.v > 20;
        const goal = approaching ? car.s : car.s + side * gap;
        const want = Math.max(-MAXV, Math.min(MAXV, (goal - bs) * 3));
        bv += (want - bv) * (1 - Math.exp(-3 * dt));
        bs += bv * dt;
        // the van's front meets it: tossed up into the air, on in the van's direction
        const contact = 38 * 1.1 + R - 4;
        if (approaching && Math.abs(bs - car.s) < contact) {
          const dir = Math.sign(car.v) || -side;
          // a harder hit throws it further and higher, within reason
          const hit = Math.min(1, Math.abs(car.v) / 420);
          air = { vx: dir * (150 + hit * 170), vy: -(330 + hit * 220), y: ground(bs) + 1.5 - R, bounced: false };
          side = dir;
        }
      }
      // it rolls with the distance it covers — in the air too, so the spin matches the flight
      roll += (bs - prevBs) / R;
      prevBs = bs;
      const y = ground(bs) + 1.5 - R - h;
      rock.style.transform = `translate3d(${(bs - R).toFixed(1)}px,${(y - R).toFixed(1)}px,0) rotate(${roll.toFixed(3)}rad)`;
      const close = !air && Math.abs(bs - car.s) < 100 && Math.abs(car.v) + Math.abs(bv) > 30;
      if (close !== yikes.classList.contains('is-on')) yikes.classList.toggle('is-on', close);
      if (close) yikes.style.translate = `${car.x.toFixed(1)}px ${(car.y - 54).toFixed(1)}px`;
    };
    gsap.ticker.add(chase);

    return () => {
      ro.disconnect();
      io.disconnect();
      offLayout();
      ctx.revert();
      stopCar();
      gsap.ticker.remove(chase);
    };
  }, []);

  return (
    <div ref={ref} className="ridge" aria-hidden="true">
      <svg className="ridge-land" viewBox={`0 0 1440 ${VB_H}`} preserveAspectRatio="none">
        <path className="ridge-far" d={`M0 ${VB_H}L0 60L360 20L720 70L1080 30L1440 64L1440 ${VB_H}Z`} />
        <path className="ridge-near" d={`M0 ${VB_H}L0 90L300 60L620 104L960 56L1260 98L1440 74L1440 ${VB_H}Z`} />
      </svg>
      <svg className="ridge-boulder" viewBox="-16 -16 32 32" width="30" height="30">
        <path d="M-14 2C-15 -7 -8 -14 1 -14C9 -14 15 -8 14 1C14 9 8 15 -1 14C-9 14 -14 9 -14 2Z" />
        <path className="ridge-crack" d="M-6 -9 -2 -3 -7 2M4 -10 3 -4 9 0M-3 6 2 3 4 9" />
      </svg>
      <span className="ridge-yikes">!</span>
    </div>
  );
}
