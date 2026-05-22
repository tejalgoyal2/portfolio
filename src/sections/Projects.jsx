import { PROJECTS } from '../data/projects';

/**
 * Projects — editorial stacked list (dark canvas).
 *
 * Each project is a horizontal row that bleeds across the full width.
 * On hover, the row inverts: paper background, ink text — like flipping
 * a magazine page. Numbered, dense, restrained. The information IS the
 * design.
 */
export default function Projects() {
  return (
    <section className="projects" id="work">
      <header className="projects-header">
        <p className="projects-meta">// 03 — Selected work</p>
        <h2 className="projects-title">PROJECTS</h2>
      </header>

      <ol className="projects-list">
        {PROJECTS.map((p, i) => {
          const href = p.links.live || p.links.github || p.links.youtube;
          return (
            <a
              key={p.name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="project-row"
              aria-label={`${p.name} — ${p.desc}`}
            >
              <span className="project-index">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="project-name">{p.name}</h3>
                <p className="project-desc">{p.desc}</p>
              </div>
              <div className="project-tech">
                {p.tech.slice(0, 4).map((t) => (
                  <span key={t} className="project-tech-pill">{t}</span>
                ))}
              </div>
              <div
                className={`project-status ${
                  p.status === 'LIVE' ? 'project-status--live' : ''
                }`}
              >
                {p.status === 'LIVE' && <span className="project-status-dot" />}
                <span className="project-status-label">{p.status}</span>
              </div>
            </a>
          );
        })}
      </ol>
    </section>
  );
}
