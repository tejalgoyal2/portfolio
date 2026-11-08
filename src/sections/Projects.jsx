import { PROJECTS, LEADS } from '../data/projects';
import KineticHeadline from '../press/KineticHeadline';
import Bug from '../press/Bug';
import Story from '../press/Story';
import { primaryLink } from '../../lib/agent-content';

/**
 * Projects — a front page. The four lead projects are case files on tiles
 * (src/press/Story.jsx) that turn over to the full file: the lead across the
 * top, three more in columns under it, each on its own tile. Everything else
 * is "Also in this edition": a contents list, the way a paper points you to
 * its inside pages. One line each, a dotted leader out to where it lives, and
 * nothing that shouts, so the front page stays the front page.
 */
const STORIES = LEADS.map((n) => PROJECTS.find((p) => p.name === n)).filter(Boolean);
const REST = PROJECTS.filter((p) => !LEADS.includes(p.name));
const WHERE = (p) => (p.links?.live ? 'live' : p.links?.github ? 'code' : p.links?.youtube ? 'demo' : null);

function Entry({ project }) {
  const { name, eli5 } = project;
  const href = primaryLink(project);
  const where = WHERE(project);
  const head = (
    <>
      <span className="ed-name">{name}</span>
      <span className="ed-leader" aria-hidden="true" />
      {where ? (
        <span className="ed-where">
          {where} <span aria-hidden="true">↗</span>
        </span>
      ) : (
        <span className="ed-where ed-where--none">in the archive</span>
      )}
    </>
  );
  return (
    <li className="ed-entry" data-name={name}>
      {href ? (
        <a className="ed-row" href={href} target="_blank" rel="noopener noreferrer">
          {head}
        </a>
      ) : (
        <span className="ed-row">{head}</span>
      )}
      <p className="ed-line">{eli5}</p>
    </li>
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

        <div className="cf-also">
          <p className="cf-also-title">Also in this edition</p>
          <p className="cf-eli5">smaller things, older things</p>
        </div>
        <ul className="edition" data-arrive-items="paste">
          {REST.map((p) => (
            <Entry key={p.name} project={p} />
          ))}
        </ul>
      </div>
    </section>
  );
}
