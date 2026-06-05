/**
 * Halftone monogram — "TG" rendered as a dot-matrix mask: a regular grid of
 * ink-colored circles, visible only through the outline of the glyphs. Pure
 * SVG; no canvas, no JS. Dark dots on cream. The font is Fraunces (loaded via
 * CSS) — the mask text inherits it. If the web font isn't loaded yet, Georgia
 * makes a fine stand-in.
 */
export default function Monogram({ size = 64, className = '' }) {
  return (
    <svg
      className={`press-monogram${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="monogram-dots"
          x="0"
          y="0"
          width="4.5"
          height="4.5"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2.25" cy="2.25" r="1.05" fill="currentColor" />
        </pattern>
        <mask id="monogram-mask">
          <rect width="64" height="64" fill="black" />
          <text
            x="32"
            y="46"
            style={{
              fontFamily: 'var(--font-name, "Fraunces", Georgia, serif)',
              fontWeight: 900,
              fontSize: 46,
              letterSpacing: '-1px',
            }}
            textAnchor="middle"
            fill="white"
          >
            TG
          </text>
        </mask>
      </defs>
      <rect
        width="64"
        height="64"
        fill="url(#monogram-dots)"
        mask="url(#monogram-mask)"
      />
    </svg>
  );
}
