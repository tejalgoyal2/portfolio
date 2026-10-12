import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { startCar } from '../life/car';
import { hash } from '../life/spring';
import { prefs } from '../life/prefs';

gsap.registerPlugin(ScrollTrigger);

/**
 * Where the cream gives way to the ink spread, the ink rises as a mountain
 * range: a near ridge in solid ink that runs straight into Experience, and a
 * far one behind it, faint, that rises a little slower as you scroll past.
 * A little car drives over the near ridge — up the slopes, over the tops,
 * puffing exhaust — while the range crosses the screen.
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

export default function Ridge() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const svg = root.querySelector('svg');
    const far = root.querySelector('.ridge-far');
    const near = root.querySelector('.ridge-near');
    let ground = (x) => x * 0;
    let w = 1;
    let h = VB_H;

    const draw = () => {
      w = Math.max(1, root.clientWidth);
      h = root.clientHeight || VB_H;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const step = Math.max(110, w / 9);
      const f = range(w, h, 11, 0.04, 0.42, step * 0.8);
      const n = range(w, h, 47, 0.3, 0.62, step);
      far.setAttribute('d', f.d);
      near.setAttribute('d', n.d);
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
      scale: 1.1,
      pathAt: (s) => ({ x: s, y: ground(s) + 1.5, angle: slope(s) }),
      length: () => w,
      target: () => {
        if (prefs.reduced) return w * 0.62;
        const r = root.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9 + r.height)));
        return 40 + p * (w - 80);
      },
    });

    return () => {
      ro.disconnect();
      ctx.revert();
      stopCar();
    };
  }, []);

  return (
    <div ref={ref} className="ridge" aria-hidden="true">
      <svg viewBox={`0 0 1440 ${VB_H}`} preserveAspectRatio="none">
        <path className="ridge-far" d={`M0 ${VB_H}L0 60L360 20L720 70L1080 30L1440 64L1440 ${VB_H}Z`} />
        <path className="ridge-near" d={`M0 ${VB_H}L0 90L300 60L620 104L960 56L1260 98L1440 74L1440 ${VB_H}Z`} />
      </svg>
    </div>
  );
}
