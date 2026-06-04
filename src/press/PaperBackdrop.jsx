import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * The paper running through the press. One fixed layer; cream is the base and
 * an ink layer ramps its opacity as the first ink-ground spread enters — so the
 * cream→ink change is a single continuous bleed across the section seam instead
 * of a hard cut. Only opacity animates (GPU-cheap). Anchored to the first
 * element marked data-ground="ink"; if none is mounted yet, it stays cream.
 *
 * The ramp finishes early — by the time the ink section's top reaches 70% of
 * the viewport (still near the bottom, before its header is read) the ground is
 * already solid ink. That makes the dark ground the legibility guarantor, not a
 * mid-transition near-cream the cream text would wash out against.
 */
export default function PaperBackdrop() {
  const inkRef = useRef(null);

  useEffect(() => {
    const ink = document.querySelector('[data-ground="ink"]');
    if (!ink) return;
    const layer = inkRef.current;

    const tween = gsap.fromTo(
      layer,
      { opacity: 0 },
      {
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: ink, start: 'top bottom', end: 'top 70%', scrub: true },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div className="paper-backdrop" aria-hidden="true">
      <div ref={inkRef} className="paper-backdrop-ink" />
      <div className="paper-grain" />
    </div>
  );
}
