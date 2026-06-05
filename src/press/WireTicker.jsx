import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * Press wire ticker — one slim band of scrolling caps, set below the masthead
 * edition line. Reuses the shared gsap.ticker marquee pattern from the Blog
 * filmstrip: offset accumulates each frame, wraps at half the strip width for
 * a seamless infinite loop. Pauses on hover; IO-gated (no rAF while off-screen).
 * Reduced-motion → single static line.
 */
const ITEMS = [
  'MODERNIZING A 13-SCREEN OPS APP',
  'ML RESEARCH → SECURITY DESK → PLATFORM ENGINEERING',
  'PARTLY CLOUDY, COMPILING',
  'VICTORIA, BC · EST. 2002',
  'TEJAL GOYAL · SOFTWARE · SECURITY · ML',
  'BREAK THINGS TO BUILD BETTER ONES',
  'THE PRESS IS RUNNING',
];

const SEP = '  ·  ';
const FULL = ITEMS.join(SEP) + SEP;

export default function WireTicker() {
  const wrapRef = useRef(null);
  const stripRef = useRef(null);
  const offsetRef = useRef(0);
  const hoverRef = useRef(false);
  const visibleRef = useRef(false);

  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const strip = stripRef.current;
    if (!wrap || !strip) return;

    const tick = () => {
      if (hoverRef.current || !visibleRef.current) return;
      const half = strip.scrollWidth / 2;
      if (half <= 0) return;
      offsetRef.current = (offsetRef.current + 0.5) % half;
      strip.style.transform = `translateX(${-offsetRef.current}px)`;
    };

    const io = new IntersectionObserver(
      ([e]) => (visibleRef.current = e.isIntersecting),
      { threshold: 0 }
    );
    io.observe(wrap);

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
    };
  }, [reduced]);

  return (
    <div
      ref={wrapRef}
      className="wire-ticker"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
      aria-hidden="true"
    >
      {reduced ? (
        <span className="wire-ticker-static">{ITEMS[0]}</span>
      ) : (
        <div ref={stripRef} className="wire-ticker-strip">
          <span className="wire-ticker-set">{FULL}</span>
          <span className="wire-ticker-set">{FULL}</span>
        </div>
      )}
    </div>
  );
}
