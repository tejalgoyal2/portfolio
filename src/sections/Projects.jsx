import { useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS, LEADS } from '../data/projects';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';
import Bug from '../press/Bug';
import Story from '../press/Story';

/**
 * Projects — a front page. The four lead projects are case files on tiles
 * (src/press/Story.jsx) that turn over to the full file: the lead across the
 * top, three more in columns under it, each on its own tile. The rest are
 * the classifieds on the back pages, the way a paper runs its small ads: still
 * columns, each one its name, what it is in a line, and where to find it.
 * The first few are in view; "turn the page" unfolds the older and smaller
 * ones. Every one is explained like I'm 5.
 */
// LIVE is in red; anything else is a plain word for what it is, in ink
const STAMP_TONE = { LIVE: 'red' };
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };

// the lead stories, in their order, and the rest in brief
const STORIES = LEADS.map((n) => PROJECTS.find((p) => p.name === n)).filter(Boolean);
const REST = PROJECTS.filter((p) => !LEADS.includes(p.name));
const FRONT_OF_BACK = 6; // two full rows of three show before the page is turned
const NOW_SHOWING = REST.slice(0, FRONT_OF_BACK);
const OVER_THE_PAGE = REST.slice(FRONT_OF_BACK);

function Brief({ project, index, late = false, lateAt = 0 }) {
  const { name, status, eli5, desc, links } = project;
  return (
    <article className={`brief${late ? ' brief--late' : ''}`} data-name={name} style={late ? { '--late-i': lateAt } : undefined} tabIndex={late ? -1 : undefined}>
      <p className="brief-kicker">
        <span className="brief-no">{String(index).padStart(2, '0')}</span>
        <Stamp label={status} tone={STAMP_TONE[status] || 'ink'} rotate={-4} interactive={false} />
      </p>
      <h4 className="brief-name">{name}</h4>
      <p className="brief-eli5">{eli5 || desc}</p>
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

export default function Projects() {
  const [turned, setTurned] = useState(false);

  const turnPage = () => {
    setTurned(true);
    // the page just got longer: tell everything that measures it, and put focus on the first new ad
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      document.querySelector('.brief--late')?.focus({ preventScroll: true });
    });
  };

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
          <p className="cf-also-title">Classifieds · the back pages</p>
          <p className="cf-eli5">Smaller things and older things, explained like I&rsquo;m 5</p>
        </div>
        <div className="briefs" id="back-pages" data-arrive-items="paste">
          {NOW_SHOWING.map((p, i) => (
            <Brief key={p.name} project={p} index={STORIES.length + i + 1} />
          ))}
          {turned &&
            OVER_THE_PAGE.map((p, i) => (
              <Brief key={p.name} project={p} index={STORIES.length + FRONT_OF_BACK + i + 1} late lateAt={i} />
            ))}
        </div>
        {!turned && OVER_THE_PAGE.length > 0 && (
          <div className="cf-turn">
            <button type="button" className="cf-turn-btn" aria-expanded="false" aria-controls="back-pages" onClick={turnPage}>
              <span className="cf-turn-label">Turn the page</span>
              <span className="cf-turn-count">{OVER_THE_PAGE.length} more on page B4</span>
              <span className="cf-turn-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
