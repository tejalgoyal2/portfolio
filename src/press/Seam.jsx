import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * A torn deckle seam between two colour spreads — the page is a stack of printed
 * sheets, and where one stock ends it's torn to show the one beneath. The static
 * edge lives in CSS (.seam / .seam-tear); this adds the motion: the tear rips
 * across as you scroll through it. The lower sheet is cut into vertical strips
 * (each a full-width copy of the torn shape, clipped to its slice) that rise
 * into place left to right, scrubbed to the scroll — transforms only. The
 * strips' resting state is the CSS default, so under reduced motion (or with
 * no JS at all) it's simply a crisp torn boundary.
 *
 *   variant: 'cream-ink' (cream → dark-red) | 'ink-red' (dark-red → red)
 */
const STRIPS = 32;

export default function Seam({ variant = 'cream-ink' }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const strips = gsap.utils.toArray('.seam-strip', root);
      // the rip runs left → right on the first seam, right → left on the mirrored one
      const order = variant === 'ink-red' ? strips.slice().reverse() : strips;
      gsap.fromTo(
        order,
        { yPercent: 100 },
        {
          yPercent: 0,
          ease: 'none',
          duration: 1,
          // each strip rises over a window that overlaps its neighbours', so
          // the front is a soft slope running across, not a staircase
          stagger: { amount: 1.6 },
          scrollTrigger: { trigger: root, start: 'top 98%', end: 'top 52%', scrub: true },
        }
      );
    }, root);

    return () => ctx.revert();
  }, [variant]);

  return (
    <div ref={ref} className={`seam seam--${variant}`} aria-hidden="true">
      {Array.from({ length: STRIPS }, (_, i) => (
        <span className="seam-strip" key={i} style={{ '--i': i, '--n': STRIPS }}>
          <span className="seam-tear" />
        </span>
      ))}
    </div>
  );
}
