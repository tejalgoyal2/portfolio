import { useState } from 'react';
import { PROJECTS } from '../data/projects';
import SectionHeader from './SectionHeader';
import { useScrollReveal } from '../hooks/useScrollReveal';

function Badge({ status }) {
  const colors = { LIVE: 'var(--color-green)', REPO: 'var(--color-cyan)', PROTOTYPE: 'var(--color-amber)', 'COMING SOON': 'var(--color-dim)' };
  const color = colors[status] || 'var(--color-dim)';
  return (
    <span
      className="text-[9px] font-bold tracking-[1px] py-0.5 px-2 rounded-sm font-mono inline-flex items-center gap-1"
      style={{ color, background: `${color}12`, border: `1px solid ${color}28` }}
    >
      {status === 'LIVE' && (
        <span className="w-[5px] h-[5px] rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
      )}
      {status}
    </span>
  );
}

function ProjectCard({ project, expanded, onToggle }) {
  const [hov, setHov] = useState(false);
  const ref = useScrollReveal();

  return (
    <div
      ref={ref}
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="reveal panel cursor-pointer transition-all duration-250 flex flex-col gap-2.5"
      style={{
        padding: '18px 20px',
        borderColor: hov ? `${project.color}40` : undefined,
      }}
    >
      <div className="flex justify-between items-center">
        <span className="text-base font-bold font-display" style={{ color: project.color }}>
          {project.name}
        </span>
        <Badge status={project.status} />
      </div>
      <p className="text-text text-[12.5px] leading-[1.7] m-0 flex-1">
        {expanded ? project.long : project.desc}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {project.tech.map(t => (
          <span key={t} className="text-[9.5px] py-0.5 px-2 rounded-sm font-mono text-muted"
            style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid var(--color-border)' }}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex gap-3 items-center">
        {project.links.live && (
          <a href={project.links.live} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()} className="text-green text-[11px] font-mono no-underline hover:underline">[LIVE]</a>
        )}
        {project.links.github && (
          <a href={project.links.github} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()} className="text-cyan text-[11px] font-mono no-underline hover:underline">[GITHUB]</a>
        )}
        {project.links.youtube && (
          <a href={project.links.youtube} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()} className="text-red text-[11px] font-mono no-underline hover:underline">[YOUTUBE]</a>
        )}
        <span className="ml-auto text-dim text-[9px] font-mono">{expanded ? '[-]' : '[+]'}</span>
      </div>
    </div>
  );
}

export default function Projects() {
  const [expanded, setExpanded] = useState(null);
  const toggle = (name) => setExpanded(expanded === name ? null : name);

  return (
    <section>
      <SectionHeader id="projects" title="Projects" sub="// things I've built and broken" />

      {/* Tier 1 */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {PROJECTS.filter(p => p.tier === 1).map(p => (
          <ProjectCard key={p.name} project={p} expanded={expanded === p.name} onToggle={() => toggle(p.name)} />
        ))}
      </div>

      {/* Tier 2+ */}
      <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {PROJECTS.filter(p => p.tier >= 2).map(p => (
          <ProjectCard key={p.name} project={p} expanded={expanded === p.name} onToggle={() => toggle(p.name)} />
        ))}
      </div>
    </section>
  );
}
