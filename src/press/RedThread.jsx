import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The red thread — one continuous string drawn down the whole page as you
 * scroll, the visible spine that makes the seven sections read as a single
 * artifact (not stacked cards). Measures the full document, lays a meandering
 * path, and reveals it via stroke-dashoffset on scrub. Projects branches off
 * this later via registered anchor points. Stroke stays crisp via
 * non-scaling-stroke; rebuilds on resize.
 */
function buildPath(w, h) {
  const segs = Math.max(6, Math.round(h / 520));
  const amp = w * 0.16;
  const mid = w * 0.5;
  const x = (i) => mid + amp * Math.sin(i * 0.85) * (i % 2 ? 1 : 0.7);
  let d = `M ${x(0).toFixed(1)} 0`;
  for (let i = 1; i <= segs; i++) {
    const py = (h * i) / segs;
    const ppy = (h * (i - 1)) / segs;
    const c1y = ppy + (py - ppy) * 0.5;
    const c2y = py - (py - ppy) * 0.5;
    d += ` C ${x(i - 1).toFixed(1)} ${c1y.toFixed(1)}, ${x(i).toFixed(1)} ${c2y.toFixed(1)}, ${x(i).toFixed(1)} ${py.toFixed(1)}`;
  }
  return d;
}

export default function RedThread() {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const pathRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let st;

    const layout = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      path.setAttribute('d', buildPath(w, h));
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;

      st?.kill();
      if (reduced) {
        path.style.strokeDashoffset = 0;
        return;
      }
      path.style.strokeDashoffset = len;
      st = gsap.to(path, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: document.documentElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
        },
      }).scrollTrigger;
    };

    // wait for layout/fonts before first measure
    requestAnimationFrame(layout);
    if (document.fonts?.ready) document.fonts.ready.then(layout);

    const ro = new ResizeObserver(() => {
      layout();
      ScrollTrigger.refresh();
    });
    ro.observe(wrap);

    return () => {
      st?.kill();
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="red-thread" aria-hidden="true">
      <svg ref={svgRef} preserveAspectRatio="none" width="100%" height="100%">
        <path
          ref={pathRef}
          fill="none"
          stroke="var(--red)"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
