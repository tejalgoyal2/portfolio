import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * A torn deckle seam between two colour spreads — the page is a stack of printed
 * sheets, and where one stock ends it's torn to show the one beneath. The static
 * edge lives in CSS (.seam / .seam-tear); this only adds the motion: as the seam
 * scrolls into frame the torn sheet drops the last stretch onto the press bed and
 * settles, the way the rest of the site sets type into the stick. One-shot, off
 * the shared ScrollTrigger. The tear's resting state is the CSS default, so under
 * reduced motion (or with no JS at all) it's simply a crisp torn boundary.
 *
 *   variant: 'cream-ink' (cream → dark-red) | 'ink-red' (dark-red → red)
 */
export default function Seam({ variant = 'cream-ink' }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    const tear = root?.querySelector('.seam-tear');
    if (!tear) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const mirror = variant === 'ink-red';
    const base = mirror ? { scaleX: -1 } : {};

    const ctx = gsap.context(() => {
      gsap.fromTo(
        tear,
        { ...base, yPercent: -60, opacity: 0 },
        {
          ...base,
          yPercent: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: root, start: 'top 92%', once: true },
        }
      );
    }, root);

    return () => ctx.revert();
  }, [variant]);

  return (
    <div ref={ref} className={`seam seam--${variant}`} aria-hidden="true">
      <span className="seam-tear" />
    </div>
  );
}
