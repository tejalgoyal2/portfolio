import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { prefs } from '../life/prefs';
import { PROJECTS, LEADS } from '../data/projects';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';
import Bug from '../press/Bug';
import Story from '../press/Story';

/**
 * Projects — a front page. The four lead projects are case files on tiles
 * (src/press/Story.jsx) that turn over to the full file: the lead across the
 * top, three more in columns under it, each landing from its own side. The
 * rest are "In brief", the way a paper runs its short items: an index in
 * columns, each one its name, what it is in a line, and where to find it.
 * Over them, a switch: explain like I'm 5 (the eli5) or like I'm an engineer
 * (what it does and what it's built with). Both editions are set in every
 * item, one over the other, so the columns never change height when you flip
 * it; the lines of the one you leave roll up out of their slots and the other's
 * roll up into them, item after item along the columns. Reduced motion: it
 * simply changes.
 */

gsap.registerPlugin(SplitText);
// LIVE is in red; anything else is a plain word for what it is, in ink
const STAMP_TONE = { LIVE: 'red' };
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };

// the lead stories, in their order, and the rest in brief
const STORIES = LEADS.map((n) => PROJECTS.find((p) => p.name === n)).filter(Boolean);
const REST = PROJECTS.filter((p) => !LEADS.includes(p.name));

function Brief({ project, index, edition }) {
  const { name, status, eli5, desc, tech, links } = project;
  const grown = edition === 'engineer';
  return (
    <article className="brief" data-name={name}>
      <p className="brief-kicker">
        <span className="brief-no">{String(index).padStart(2, '0')}</span>
        <Stamp label={status} tone={STAMP_TONE[status] || 'ink'} rotate={-4} interactive={false} />
      </p>
      <h4 className="brief-name">{name}</h4>
      <div className="brief-copy">
        <div className={`brief-ed${edition === 'five' ? ' is-on' : ''}`} data-ed="five" aria-hidden={edition !== 'five'}>
          <p className="brief-eli5">{eli5 || desc}</p>
        </div>
        <div className={`brief-ed${grown ? ' is-on' : ''}`} data-ed="engineer" aria-hidden={!grown}>
          <p className="brief-eli5">{desc}</p>
          {tech?.length > 0 && <p className="brief-tech">{tech.join(' · ')}</p>}
        </div>
      </div>
      {Object.keys(links || {}).length > 0 && (
        <p className="brief-links">
          {Object.entries(links).map(([kind, href]) => (
            <a key={kind} className="story-link" href={href} target="_blank" rel="noopener noreferrer">
              {LINK_LABEL[kind] || kind} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </p>
      )}
    </article>
  );
}

const EDITIONS = [
  ['five', '5'],
  ['engineer', 'an engineer'],
];

// the lines of every item's two editions, split once (and again on a resize)
// so a flip can roll them through their slots
function useEditionRoll(edition) {
  const ref = useRef(null);
  const splits = useRef([]);
  const last = useRef(edition);

  useLayoutEffect(() => {
    if (prefs.reduced) return;
    const box = ref.current;
    splits.current = [...box.querySelectorAll('.brief-ed p')].map((p) =>
      SplitText.create(p, { type: 'lines', mask: 'lines', linesClass: 'brief-line', autoSplit: true, aria: 'none' })
    );
    return () => splits.current.forEach((sp) => sp.revert());
  }, []);

  useLayoutEffect(() => {
    if (last.current === edition) return;
    last.current = edition;
    if (prefs.reduced) return;
    const briefs = [...ref.current.querySelectorAll('.brief')];
    const tl = gsap.timeline();
    briefs.forEach((b, i) => {
      const out = b.querySelector('.brief-ed:not(.is-on)');
      const inn = b.querySelector('.brief-ed.is-on');
      const at = i * 0.05;
      // the edition you left stays on the page until its lines are out (set now,
      // before this frame paints, not on the timeline's first tick)
      gsap.set(out, { visibility: 'visible' });
      gsap.set(inn.querySelectorAll('.brief-line'), { yPercent: 110 });
      tl.fromTo(out.querySelectorAll('.brief-line'), { yPercent: 0 }, { yPercent: -110, duration: 0.32, ease: 'power2.in', stagger: 0.03 }, at)
        .set(out, { clearProps: 'visibility' }, at + 0.5)
        .fromTo(inn.querySelectorAll('.brief-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', stagger: 0.045 }, at + 0.16);
    });
    return () => tl.progress(1).kill();
  }, [edition]);

  return ref;
}

export default function Projects() {
  const [edition, setEdition] = useState('five');
  const briefsRef = useEditionRoll(edition);
  return (
    <section className="projects" id="projects" aria-label="Projects" data-ground="paper" data-section="projects">
      <div className="press-container cf-stage">
        {/* the bug keeps to the paper beside the headline, never over the stories */}
        <div className="cf-headrow">
          <Bug />
          <header className="cf-head" data-depart="lift">
            <span className="kicker">Projects</span>
            <KineticHeadline as="h2" font="impact" className="cf-headline">
              Things I&rsquo;ve built. Some broke.
            </KineticHeadline>
          </header>
        </div>

        <div className="cf-front">
          {STORIES.map((p, i) => (
            <Story key={p.name} project={p} index={i + 1} lead={i === 0} />
          ))}
        </div>

        <div className="cf-also">
          <p className="cf-also-title">In brief</p>
          <div className="cf-edition" role="radiogroup" aria-label="Explain like I'm">
            <span className="cf-edition-label" aria-hidden="true">Explain like I&rsquo;m</span>
            {EDITIONS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={edition === id}
                className={`cf-edition-opt${edition === id ? ' is-on' : ''}`}
                onClick={() => setEdition(id)}
                data-pen="pencil"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div ref={briefsRef} className="briefs" data-arrive-items="paste">
          {REST.map((p, i) => (
            <Brief key={p.name} project={p} index={STORIES.length + i + 1} edition={edition} />
          ))}
        </div>
      </div>
    </section>
  );
}
