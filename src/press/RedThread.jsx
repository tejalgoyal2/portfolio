import { useEffect, useRef } from 'react';

/**
 * The red thread — one continuous string drawn down the whole page as you
 * scroll, the visible spine that makes the seven sections read as a single
 * artifact (not stacked cards). Measures the full document, lays a meandering
 * path, and reveals it by mapping live scroll progress directly to
 * stroke-dashoffset — deliberately NOT a ScrollTrigger scrub. That keeps it
 * reflow-proof: when a case-file or ledger entry expands and the document
 * grows, we rebuild the path and re-apply progress in the same frame, so the
 * thread is never left blank (the old "break") and we never call a global
 * ScrollTrigger.refresh() that re-snapped every other scrubbed trigger (the old
 * "jerk"). Stroke stays crisp via non-scaling-stroke; rebuilds on resize.
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

    let len = 0;
    let scrollQueued = false;

    // Map live scroll position → how much of the thread is drawn. Reading
    // scrollY/scrollHeight every frame means a reflow can't desync us: the
    // worst case is one frame of staleness, corrected on the next tick.
    const apply = () => {
      scrollQueued = false;
      if (!len) return;
      if (reduced) {
        path.style.strokeDashoffset = 0;
        return;
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      path.style.strokeDashoffset = len * (1 - progress);
    };
    const onScroll = () => {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(apply);
    };

    const layout = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      path.setAttribute('d', buildPath(w, h));
      len = path.getTotalLength();
      path.style.strokeDasharray = len;
      // Re-apply progress in the same frame as the rebuild → the thread is
      // never momentarily reset to fully-hidden during an expand/collapse.
      apply();
    };

    // wait for layout/fonts before first measure
    requestAnimationFrame(layout);
    if (document.fonts?.ready) document.fonts.ready.then(layout);

    // Debounce reflow rebuilds: an expanding case-file / ledger entry fires the
    // ResizeObserver many times in quick succession — coalesce to one per frame.
    let layoutQueued = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(layoutQueued);
      layoutQueued = requestAnimationFrame(layout);
    });
    ro.observe(wrap);

    // Passive window scroll fires on Lenis's native document scroll, so we don't
    // depend on window.__lenis being mounted by the time this effect runs.
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', layout);

    return () => {
      cancelAnimationFrame(layoutQueued);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', layout);
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
