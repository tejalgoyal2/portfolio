import { useId, useState } from 'react';
import KineticHeadline from './KineticHeadline';
import Stamp from './Stamp';
import Hand from './Hand';
import Tryout from './Tryouts';

/**
 * A project as a front-page story: its name as a headline, what it is in one
 * or two plain lines (the way you'd explain it to a ten-year-old), and beside
 * it a small working piece to try (src/press/Tryouts.jsx) — so you get it by
 * touching it. Then what it's built with, the links, and "Read the full
 * file" to unfold the technical story for whoever wants it.
 */
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };
const STAMP_TONE = { LIVE: 'red', REPO: 'ink', PROTOTYPE: 'ink' };

export default function Story({ project, lead = false, index }) {
  const { name, status, eli5, desc, long, note, tech, links } = project;
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <article className={`story${lead ? ' story--lead' : ''}`} data-arrive="rise" data-depart="file" data-name={name}>
      <div className="story-text">
        <p className="story-kicker">
          <span className="story-no">{String(index).padStart(2, '0')}</span>
          <Stamp label={status} tone={STAMP_TONE[status] || 'ink'} rotate={-5} pressIn interactive={false} />
          {note && <Hand className="story-pen">{note}</Hand>}
        </p>
        <KineticHeadline as="h3" font="name" className="story-name" spread={false} inview>
          {name}
        </KineticHeadline>
        <p className="story-eli5" data-ink>
          {eli5}
        </p>
      </div>

      <Tryout name={name} />

      <div className="story-meta">
        <p className="story-tech">
          <span className="story-tech-label">Built with</span>
          {tech.map((t) => (
            <span className="cf-tag" key={t}>
              {t}
            </span>
          ))}
        </p>

        <div className="story-foot">
          {Object.entries(links || {}).map(([kind, href]) => (
            <a key={kind} className="story-link" href={href} target="_blank" rel="noopener noreferrer">
              {LINK_LABEL[kind] || kind} <span aria-hidden="true">↗</span>
            </a>
          ))}
          <button type="button" className="story-more" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            {open ? 'Fold it back' : 'Read the full file'}
            <span aria-hidden="true">{open ? '−' : '+'}</span>
          </button>
        </div>

        <div className={`story-file${open ? ' is-open' : ''}`} id={id} inert={!open}>
          <div className="story-file-inner">
            <p className="story-desc">{desc}</p>
            <p className="story-long">{long}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
