import { useId, useRef, useState } from 'react';
import Stamp from './Stamp';
import Hand from './Hand';

/**
 * A lead project as a case file on the desk: a tile that leans toward your
 * cursor in real CSS 3D, with a warm desk-lamp glow following the pointer.
 * The front says what it is and why I made it, as a story, not a pitch — and
 * where to find it. "Turn it over" flips the tile (a real 3D turn, quick off
 * the mark and a long settle) to its back: the technical file. Reduced
 * motion: no lean, and the tile swaps sides without turning.
 */
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };
const STAMP_TONE = { LIVE: 'red', REPO: 'ink', PROTOTYPE: 'ink' };
const TILT = 6; // degrees at the tile's edge

export default function Story({ project, lead = false, index }) {
  const { name, status, why, eli5, desc, long, note, tech, links } = project;
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  const ref = useRef(null);
  const frame = useRef(0);
  const turn = (to) => {
    setFlipped(to);
    // keep the keyboard where the reader is: on the other side's button
    requestAnimationFrame(() => ref.current?.querySelector(`${to ? '.tile-back' : '.tile-front'} .tile-flip`)?.focus({ preventScroll: true }));
  };

  const lean = (e) => {
    if (e.pointerType === 'touch' || frame.current) return;
    const el = ref.current;
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width;
      const py = (clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${((px - 0.5) * TILT).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py) * TILT).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    });
  };
  const rest = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  return (
    <article
      ref={ref}
      className={`tile${lead ? ' tile--lead' : ''}${flipped ? ' is-flipped' : ''}`}
      data-arrive="rise"
      data-name={name}
      onPointerMove={lean}
      onPointerLeave={rest}
    >
      <div className="tile-lean">
      <div className="tile-turn">
        <div className="tile-face tile-front" inert={flipped}>
          <span className="tile-glow" aria-hidden="true" />
          <p className="tile-kicker">
            <span className="tile-no">{String(index).padStart(2, '0')}</span>
            <Stamp label={status} tone={STAMP_TONE[status] || 'ink'} rotate={-5} interactive={false} />
            {note && <Hand className="story-pen">{note}</Hand>}
          </p>
          <h3 className="tile-name">{name}</h3>
          <p className="tile-why">{why || eli5}</p>
          <div className="tile-foot">
            {Object.entries(links || {}).map(([kind, href]) => (
              <a key={kind} className="story-link" href={href} target="_blank" rel="noopener noreferrer">
                {LINK_LABEL[kind] || kind} <span aria-hidden="true">↗</span>
              </a>
            ))}
            <button type="button" className="tile-flip" aria-controls={id} aria-expanded={flipped} onClick={() => turn(true)}>
              Turn it over <span aria-hidden="true">↻</span>
            </button>
          </div>
        </div>

        <div className="tile-face tile-back" id={id} inert={!flipped}>
          <span className="tile-glow" aria-hidden="true" />
          <p className="tile-kicker">
            <span className="tile-no">{String(index).padStart(2, '0')}</span>
            <span className="tile-file">The full file · {name}</span>
          </p>
          <p className="tile-desc">{desc}</p>
          <p className="tile-long">{long}</p>
          <p className="story-tech">
            <span className="story-tech-label">Built with</span>
            {tech.map((t) => (
              <span className="cf-tag" key={t}>
                {t}
              </span>
            ))}
          </p>
          <div className="tile-foot">
            <button type="button" className="tile-flip" onClick={() => turn(false)}>
              Turn it back <span aria-hidden="true">↺</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </article>
  );
}
