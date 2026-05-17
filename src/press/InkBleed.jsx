import { useId } from 'react';

/**
 * A torn ink-bleed seam between spreads. The ragged edge is a feTurbulence
 * displacement applied ONCE to a static path (baked, not animated per frame —
 * the v2 perf rule) so the boundary looks like ink bled into the next page
 * rather than a hard rule. PaperBackdrop owns the running ground colour; this
 * is the textural seam on top of it.
 *
 *   tone: 'ink' | 'paper' | 'red'    flip: bleed upward instead of down
 */
export default function InkBleed({ tone = 'ink', flip = false, height = 96, seed }) {
  const rawId = useId().replace(/:/g, '');
  const filterId = `bleed-${rawId}`;
  const fill =
    tone === 'paper' ? 'var(--paper)' : tone === 'red' ? 'var(--red)' : 'var(--ink)';
  const s = seed ?? Math.floor(Math.random() * 100);

  return (
    <div
      className="ink-bleed"
      aria-hidden="true"
      style={{ height, transform: flip ? 'scaleY(-1)' : undefined }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          <filter id={filterId} x="-5%" y="-20%" width="110%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.045"
              numOctaves="2"
              seed={s}
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" />
          </filter>
        </defs>
        <path
          d="M0,38 L1200,38 L1200,120 L0,120 Z"
          fill={fill}
          filter={`url(#${filterId})`}
        />
      </svg>
    </div>
  );
}
