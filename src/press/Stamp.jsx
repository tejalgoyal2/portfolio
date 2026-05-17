import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * A rubber stamp — LIVE, REPO, PROTOTYPE, APPROVED, "— 30 —". Letter-spaced
 * mono inside a 2px box, rotated a few degrees, faintly distressed. Optional
 * press-in slam when it scrolls into view.
 */
export default function Stamp({
  label,
  tone = 'red',
  rotate = -4,
  pressIn = false,
  className = '',
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!pressIn) return;
    const el = ref.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const st = gsap.fromTo(
      el,
      { scale: 1.6, opacity: 0, rotate: rotate - 8 },
      {
        scale: 1,
        opacity: 1,
        rotate,
        duration: 0.4,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
    return () => st.scrollTrigger?.kill();
  }, [pressIn, rotate]);

  return (
    <span
      ref={ref}
      className={`press-stamp press-stamp--${tone} ${className}`}
      style={{ '--stamp-rot': `${rotate}deg` }}
      data-magnetic
    >
      {label}
    </span>
  );
}
