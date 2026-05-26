/**
 * Inline SVG filter defs used across the site. Mount once at App root.
 *  - #paper-noise — feTurbulence noise for the paper grain overlay
 *  - #ink-wobble  — slight feDisplacementMap to give "drawn by hand" edges
 *  - #halftone-dots — pattern used by certain backgrounds
 */
export default function SvgFilters() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="paper-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="3"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0"
          />
        </filter>

        <filter id="ink-wobble">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="2"
            seed="7"
            result="wobble"
          />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale="2.5" />
        </filter>

        <pattern
          id="halftone-dots"
          x="0"
          y="0"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="4" cy="4" r="0.8" fill="currentColor" />
        </pattern>

        <pattern
          id="halftone-dots-dense"
          x="0"
          y="0"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2.5" cy="2.5" r="0.6" fill="currentColor" />
        </pattern>
      </defs>
    </svg>
  );
}
