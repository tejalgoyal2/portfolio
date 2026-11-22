import { hand } from '../life/hand';

/**
 * A pen note in a natural hand (src/life/hand.js): its own gentle slope, and
 * every word sitting a little differently. Plain text children only.
 */
export default function Hand({ as: Tag = 'span', children, className, style, slope, ...rest }) {
  const text = Array.isArray(children) ? children.join('') : String(children ?? '');
  const h = hand(text, slope ? { slope } : undefined);
  return (
    <Tag className={className} style={{ '--tilt': `${h.tilt}deg`, ...style }} {...rest}>
      {h.words.map((p, i) =>
        p.space ? (
          ' '
        ) : (
          <span key={i} className="hw-w" style={{ '--r': `${p.r}deg`, '--y': `${p.y}px`, '--s': p.s }}>
            {p.w}
          </span>
        )
      )}
    </Tag>
  );
}
