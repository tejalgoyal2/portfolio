import { useEffect, useRef, useState } from 'react';
import { PROJECTS } from '../data/projects';
import { CONNECTIONS, METRICS } from '../data/connections';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';

/**
 * The Case Files — an evidence board. Tier-1 work runs as big "above the fold"
 * dossiers; the rest is a denser classifieds index. Every file inverts on hover
 * (cream↔ink, like flipping the page) and opens to show its case notes and the
 * numbers it's filed under. The red string is literal: hover a file and it
 * draws to its related cases, tracking them while the file opens (a short rAF
 * that lives only for the hover, then dies). Reduced motion → no string, no
 * type-set, files read as a static index.
 */
const STAMP_TONE = { LIVE: 'red', REPO: 'ink', PROTOTYPE: 'ink' };
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };

// Most metrics are headline numerals, rendered huge. A few files (Claubi) are
// filed under short phrases instead ("deny-first", "append-only") — detect the
// non-numeric ones so CSS can set them at a readable descriptor size rather than
// the giant-numeral style, which wrapped and overlapped the case notes.
const isNumericMetric = (v) => /^[\d.,]+[%+]?$/.test(String(v).trim());

function CaseFile({ project, index, register, onEnter, onLeave, linked }) {
  const { name, status, desc, long, tech, links } = project;
  const metrics = METRICS[name] || [];
  const linkEntries = Object.entries(links || {});

  return (
    <article
      ref={(el) => register(name, el)}
      className={`case-file${linked ? ' is-linked' : ''}`}
      data-name={name}
      onPointerEnter={() => onEnter(name)}
      onPointerLeave={onLeave}
    >
      <div className="cf-top">
        <span className="cf-no">{String(index).padStart(2, '0')}</span>
        <h3 className="cf-name">{name}</h3>
        <Stamp label={status} tone={STAMP_TONE[status] || 'ink'} rotate={-5} pressIn interactive={status === 'LIVE' || status === 'REPO'} />
      </div>

      <p className="cf-deck">{desc}</p>

      <div className="cf-expand">
        <div className="cf-inner">
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

          <div className="cf-foot">
            <div className="cf-filed">
              <span className="cf-filed-label">Filed under</span>
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
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const wrapRef = useRef(null);
  const cardRefs = useRef({});
  const lineRefs = useRef([]);
  const rafRef = useRef(0);
  const [active, setActive] = useState(null);

  const tier1 = PROJECTS.filter((p) => p.tier === 1);
  const rest = PROJECTS.filter((p) => p.tier !== 1);

  const register = (name, el) => {
    if (el) cardRefs.current[name] = el;
  };

  // hover-bounded string: track endpoints each frame while a file is open, so
  // the string follows the connected cards as the hovered file expands.
  const drawWires = (name) => {
    const wrap = wrapRef.current;
    const a = cardRefs.current[name];
    if (!wrap || !a) return;
    const wr = wrap.getBoundingClientRect();
    const links = (CONNECTIONS[name] || []).slice(0, lineRefs.current.length);
    const ar = a.getBoundingClientRect();
    const ax = ar.left + ar.width / 2 - wr.left;
    const ay = ar.top + ar.height / 2 - wr.top;

    lineRefs.current.forEach((ln, i) => {
      if (!ln) return;
      const target = links[i] && cardRefs.current[links[i]];
      if (!target) {
        ln.style.opacity = '0';
        return;
      }
      const br = target.getBoundingClientRect();
      ln.setAttribute('x1', ax);
      ln.setAttribute('y1', ay);
      ln.setAttribute('x2', br.left + br.width / 2 - wr.left);
      ln.setAttribute('y2', br.top + br.height / 2 - wr.top);
      ln.style.opacity = '1';
    });
  };

  const onEnter = (name) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setActive(name);
    if (reduced || !(CONNECTIONS[name]?.length)) return;
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      drawWires(name);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const onLeave = () => {
    cancelAnimationFrame(rafRef.current);
    setActive(null);
    lineRefs.current.forEach((ln) => ln && (ln.style.opacity = '0'));
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const linkedSet = active ? new Set(CONNECTIONS[active] || []) : null;
  let counter = 0;

  return (
    <section className="projects" id="work" aria-label="The case files — projects">
      <div ref={wrapRef} className="press-container cf-stage">
        <header className="cf-head">
          <span className="kicker">The Case Files</span>
          <KineticHeadline as="h2" font="impact" className="cf-headline">
            Ten things I shipped (or broke)
          </KineticHeadline>
          <p className="cf-sub">
            Open a file. Related cases light up and the string runs between them.
          </p>
        </header>

        <svg className="cf-wires" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <line key={i} ref={(el) => (lineRefs.current[i] = el)} className="cf-wire" />
          ))}
        </svg>

        <div className="cf-features">
          {tier1.map((p) => {
            counter += 1;
            return (
              <CaseFile
                key={p.name}
                project={p}
                index={counter}
                register={register}
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
                register={register}
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
