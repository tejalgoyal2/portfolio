import { PROJECTS, LEADS } from '../data/projects';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';
import Bug from '../press/Bug';
import Story from '../press/Story';

/**
 * Projects — a front page. The four lead projects are case files on tiles
 * (src/press/Story.jsx) that turn over to the full file: the lead across the
 * top, three more in columns under it. The rest are
 * "In brief", the way a paper runs its short items: a still index in
 * columns, each one its name, what it is in a line, and where to find it.
 */
// LIVE is in red; anything else is a plain word for what it is, in ink
const STAMP_TONE = { LIVE: 'red' };
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };

// the lead stories, in their order, and the rest in brief
const STORIES = LEADS.map((n) => PROJECTS.find((p) => p.name === n)).filter(Boolean);
const REST = PROJECTS.filter((p) => !LEADS.includes(p.name));

function Brief({ project, index }) {
  const { name, status, eli5, desc, links } = project;
  return (
    <article className="brief" data-name={name}>
      <p className="brief-kicker">
        <span className="brief-no">{String(index).padStart(2, '0')}</span>
        <Stamp label={status} tone={STAMP_TONE[status] || 'ink'} rotate={-4} interactive={false} />
      </p>
      <h4 className="brief-name">{name}</h4>
      <p className="brief-eli5" data-ink>
        {eli5 || desc}
      </p>
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

        <p className="cf-also">In brief</p>
        <div className="briefs" data-arrive-items="paste">
          {REST.map((p, i) => (
            <Brief key={p.name} project={p} index={STORIES.length + i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
