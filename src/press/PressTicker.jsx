import { Fragment, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * The wire — a newsroom crawl under the nameplate. Mostly monospace dispatch
 * type with the occasional handwritten red aside slipped in, the way an editor
 * scribbles in a margin.
 *
 * The crawl is driven off the shared gsap.ticker (the one Lenis already pumps),
 * not a CSS keyframe: each frame we advance translate3d by a base speed *plus* a
 * term proportional to the current Lenis scroll velocity. So it idles at a slow
 * dispatch pace and quickens as you scroll — the band reacts to the page moving,
 * then settles. Transform-only, so it's compositor-cheap with zero reflow. Two
 * identical runs let the position wrap at one run-width for a seamless loop.
 * Pauses on hover (read it); holds dead still under reduced motion.
 */
const WIRE = [
  { t: 'NOW — PLATFORM ENGINEERING AT BCI' },
  { t: 'PREVIOUSLY — SECURITY DESK · ML RESEARCH' },
  { t: 'still reading the docs, probably', pen: true },
  { t: 'BASED IN VICTORIA, BC' },
  { t: 'OPEN TO INTERESTING PROBLEMS' },
  { t: 'BREAKING THINGS TO BUILD BETTER ONES' },
  { t: 'will bake you a loaf', pen: true },
  { t: 'F1 ON WEEKENDS' },
];

function Run() {
  return (
    <div className="wire-run">
      {WIRE.map((item, i) => (
        <Fragment key={i}>
          <span className={`wire-item${item.pen ? ' wire-item--pen' : ''}`}>{item.t}</span>
          <span className="wire-sep" aria-hidden="true">◆</span>
        </Fragment>
      ))}
    </div>
  );
}

export default function PressTicker() {
  const wireRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const wire = wireRef.current;
    const track = trackRef.current;
    if (!wire || !track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // One run-width — the wrap point. Recompute on resize / late font swap.
    let half = track.scrollWidth / 2;
    const recompute = () => { half = track.scrollWidth / 2; };
    window.addEventListener('resize', recompute);
    document.fonts?.ready.then(recompute);

    let paused = false;
    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    wire.addEventListener('pointerenter', onEnter);
    wire.addEventListener('pointerleave', onLeave);

    const BASE = 26;       // px/s — the idle dispatch crawl
    const BOOST = 4;       // scroll velocity → extra px/s (gentle scroll nudges,
                           // firmer scroll quickens — kept proportional, not on/off)
    const MAX_BOOST = 300; // cap so a hard flick quickens, never smears
    let x = 0;

    const tick = (time, dt) => {
      if (paused || half <= 0) return;
      const lenis = window.__lenis;
      const vel = lenis ? Math.abs(lenis.velocity) : 0;
      const speed = BASE + Math.min(vel * BOOST, MAX_BOOST);
      x -= (speed * dt) / 1000;
      if (x <= -half) x += half;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', recompute);
      wire.removeEventListener('pointerenter', onEnter);
      wire.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="wire" role="presentation" aria-hidden="true" ref={wireRef}>
      <div className="wire-track" ref={trackRef}>
        <Run />
        <Run />
      </div>
    </div>
  );
}
