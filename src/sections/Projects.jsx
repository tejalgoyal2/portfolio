import { useRef, useState } from 'react';
import { PROJECTS } from '../data/projects';
import { CONNECTIONS, METRICS } from '../data/connections';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';

/**
 * Work — a board of project cards. Tier-1 files render their full dossier
 * always (deck + metrics + notes + links); the rest are a denser, always-
 * complete index. Nothing expands on hover, so siblings never reflow.
 *
 * Hover is tactile: each card tilts in real CSS 3D toward the cursor and a warm
 * desk-lamp highlight tracks the pointer (custom props set on a rAF-throttled
 * pointermove). Relatedness is shown without a drawn line — hovering a file
 * outlines its related cases in red. Reduced motion drops the tilt and lamp;
 * the cards read as a static index.
 */
const STAMP_TONE = { LIVE: 'red', REPO: 'ink', PROTOTYPE: 'ink' };
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };
const TILT_MAX = 7; // degrees of rotate at the card's edge

// A few files are filed under short phrases ("deny-first") rather than numerals
// — detect the non-numeric ones so CSS sizes them as descriptors, not giants.
const isNumericMetric = (v) => /^[\d.,]+[%+]?$/.test(String(v).trim());

function CaseFile({ project, index, variant, tilt, onEnter, onLeave, linked }) {
  const { name, status, desc, long, tech, links } = project;
  const metrics = METRICS[name] || [];
  const linkEntries = Object.entries(links || {});
  const feature = variant === 'feature';

  const elRef = useRef(null);
  const frame = useRef(0);
  const data = useRef(null);

  const onPointerMove = (e) => {
    if (!tilt) return;
    const el = elRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    data.current = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const d = data.current;
      if (!d || !elRef.current) return;
      const px = d.x / d.w - 0.5;
      const py = d.y / d.h - 0.5;
      const s = elRef.current.style;
      s.setProperty('--ry', `${(px * TILT_MAX).toFixed(2)}deg`);
      s.setProperty('--rx', `${(-py * TILT_MAX).toFixed(2)}deg`);
      s.setProperty('--mx', `${((d.x / d.w) * 100).toFixed(1)}%`);
      s.setProperty('--my', `${((d.y / d.h) * 100).toFixed(1)}%`);
    });
  };

  const handleEnter = () => {
    if (tilt) elRef.current?.classList.add('is-tilt');
    onEnter(name);
  };
  const handleLeave = () => {
    const el = elRef.current;
    if (el) {
      el.classList.remove('is-tilt');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    }
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    onLeave();
  };

  return (
    <article
      ref={elRef}
      className={`case-file case-file--${variant}${linked ? ' is-linked' : ''}`}
      data-name={name}
      onPointerEnter={handleEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={handleLeave}
    >
      <span className="cf-glow" aria-hidden="true" />

      <div className="cf-top">
        <span className="cf-no">{String(index).padStart(2, '0')}</span>
        <h3 className="cf-name">{name}</h3>
        <Stamp
          label={status}
          tone={STAMP_TONE[status] || 'ink'}
          rotate={-5}
          pressIn
          interactive={status === 'LIVE' || status === 'REPO'}
        />
      </div>

      <p className="cf-deck">{desc}</p>

      {feature && (
        <>
          {metrics.length > 0 && (
            <div className="cf-metrics">
              {metrics.map((m) => (
                <div className="cf-metric" key={m.label}>
                  <span
                    className={`cf-metric-n${isNumericMetric(m.n) ? '' : ' cf-metric-n--phrase'}`}
                  >
                    {m.n}
                  </span>
                  <span className="cf-metric-l">{m.label}</span>
                </div>
              ))}
            </div>
          )}
          <p className="cf-notes">{long}</p>
        </>
      )}

      <div className="cf-foot">
        <div className="cf-filed">
          <span className="cf-filed-label">Built with</span>
          {tech.map((t) => (
            <span className="cf-tag" key={t}>
              {t}
            </span>
          ))}
        </div>
        {linkEntries.length > 0 && (
          <div className="cf-links">
            {linkEntries.map(([kind, href]) => (
              <a
                key={kind}
                className="cf-link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {LINK_LABEL[kind] || kind} <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function Projects() {
  const [active, setActive] = useState(null);
  const tilt = !(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const tier1 = PROJECTS.filter((p) => p.tier === 1);
  const rest = PROJECTS.filter((p) => p.tier !== 1);

  const onEnter = (name) => setActive(name);
  const onLeave = () => setActive(null);

  const linkedSet = active ? new Set(CONNECTIONS[active] || []) : null;
  let counter = 0;

  return (
    <section className="projects" id="work" aria-label="Work — projects">
      <div className="press-container cf-stage">
        <header className="cf-head">
          <span className="kicker">Work</span>
          <KineticHeadline as="h2" font="impact" className="cf-headline">
            Ten things built. Some broke.
          </KineticHeadline>
          <p className="cf-sub">
            Hover a file — the cases it&rsquo;s related to light up alongside it.
          </p>
        </header>

        <div className="cf-features">
          {tier1.map((p) => {
            counter += 1;
            return (
              <CaseFile
                key={p.name}
                project={p}
                index={counter}
                variant="feature"
                tilt={tilt}
                onEnter={onEnter}
                onLeave={onLeave}
                linked={linkedSet?.has(p.name) || false}
              />
            );
          })}
        </div>

        <div className="cf-index">
          {rest.map((p) => {
            counter += 1;
            return (
              <CaseFile
                key={p.name}
                project={p}
                index={counter}
                variant="index"
                tilt={tilt}
                onEnter={onEnter}
                onLeave={onLeave}
                linked={linkedSet?.has(p.name) || false}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
