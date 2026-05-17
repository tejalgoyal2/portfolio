import { useRef, useEffect, useState } from 'react';
import { PROJECTS } from '../data/projects';
import SectionHeader from './SectionHeader';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';

const FEATURED = PROJECTS.filter(p => p.tier === 1);
const OTHERS = PROJECTS.filter(p => p.tier >= 2);

function Badge({ status }) {
  const styles = {
    LIVE: { color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)', border: 'rgba(110,231,183,0.2)' },
    REPO: { color: '#67e8f9', bg: 'rgba(103,232,249,0.08)', border: 'rgba(103,232,249,0.2)' },
    PROTOTYPE: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  };
  const s = styles[status] || styles.REPO;
  return (
    <span
      className="text-[9px] font-bold tracking-[1.5px] py-1 px-2.5 rounded-full font-mono inline-flex items-center gap-1.5 uppercase shrink-0"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {status === 'LIVE' && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
      )}
      {status}
    </span>
  );
}

function FeaturedProject({ project }) {
  const [hov, setHov] = useState(false);
  const [mouse, setMouse] = useState({ x: 80, y: 20 });

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="featured-slide shrink-0 w-[80vw] max-w-[900px] h-full flex items-center px-8">
      <div
        className="w-full rounded-2xl relative overflow-hidden transition-all duration-500"
        style={{
          background: hov
            ? `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, ${project.color}18 0%, var(--color-surface) 55%)`
            : `radial-gradient(ellipse at 80% -20%, ${project.color}12 0%, var(--color-surface) 65%)`,
          border: `1px solid ${hov ? `${project.color}30` : 'var(--color-border-subtle)'}`,
          boxShadow: hov
            ? `0 30px 60px rgba(0,0,0,0.4), 0 0 60px ${project.color}06`
            : '0 8px 24px rgba(0,0,0,0.2)',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onMouseMove={handleMove}
      >
        <div className="p-10 md:p-14">
          <div className="flex items-center justify-end mb-10">
            <Badge status={project.status} />
          </div>

          <h3
            className="font-display font-bold tracking-[-0.04em] m-0 mb-5 leading-[1.05] transition-colors duration-400"
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              color: hov ? project.color : 'var(--color-text)',
            }}
          >
            {project.name}
          </h3>

          <p className="text-[15px] leading-[1.8] mb-10 max-w-[480px]" style={{ color: 'var(--color-text-secondary)' }}>
            {project.desc}
          </p>

          <div className="flex flex-wrap gap-2 mb-10">
            {project.tech.map(t => (
              <span
                key={t}
                className="text-[10px] py-1.5 px-3 rounded-full font-mono"
                style={{ color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="flex gap-4">
            {project.links.live && (
              <a
                href={project.links.live}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono font-medium no-underline py-2.5 px-6 rounded-full transition-all duration-300"
                style={{ color: '#08090d', background: project.color }}
              >
                View Live ↗
              </a>
            )}
            {project.links.github && (
              <a
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono no-underline py-2.5 px-6 rounded-full transition-all duration-300"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }) {
  const [hov, setHov] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: ny * -8, y: nx * 8 });
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleLeave = () => {
    setHov(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      className="project-card rounded-xl relative overflow-hidden transition-all duration-400"
      style={{
        background: hov
          ? `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, ${project.color}10 0%, var(--color-surface) 60%)`
          : 'var(--color-surface)',
        border: `1px solid ${hov ? `${project.color}25` : 'var(--color-border-subtle)'}`,
        boxShadow: hov ? `0 20px 40px rgba(0,0,0,0.25), 0 0 30px ${project.color}05` : 'none',
        transform: hov
          ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px)`
          : 'perspective(800px) rotateX(0) rotateY(0) translateY(0)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
    >
      {/* Gradient accent strip */}
      <div
        className="h-1.5 relative overflow-hidden"
        style={{
          background: hov
            ? `linear-gradient(90deg, ${project.color}40, ${project.color}15, transparent)`
            : `linear-gradient(90deg, ${project.color}20, transparent 70%)`,
          transition: 'all 0.4s ease',
        }}
      />

      <div className="p-5 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4
            className="text-[14px] font-display font-bold m-0 transition-colors duration-300"
            style={{ color: hov ? project.color : 'var(--color-text)' }}
          >
            {project.name}
          </h4>
          <Badge status={project.status} />
        </div>

        <p className="text-[12px] leading-[1.7] mb-4 m-0" style={{ color: 'var(--color-text-secondary)' }}>
          {project.desc}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.tech.slice(0, 4).map(t => (
            <span
              key={t}
              className="text-[9px] py-0.5 px-2 rounded-full font-mono"
              style={{ color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="flex gap-3">
          {project.links.live && (
            <a href={project.links.live} target="_blank" rel="noopener noreferrer"
               className="text-[10px] font-mono no-underline" style={{ color: 'var(--color-interactive)' }}>
              Live ↗
            </a>
          )}
          {project.links.github && (
            <a href={project.links.github} target="_blank" rel="noopener noreferrer"
               className="text-[10px] font-mono no-underline" style={{ color: 'var(--color-text-dim)' }}>
              Source ↗
            </a>
          )}
          {project.links.youtube && (
            <a href={project.links.youtube} target="_blank" rel="noopener noreferrer"
               className="text-[10px] font-mono no-underline" style={{ color: 'var(--color-text-dim)' }}>
              Demo ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const sectionRef = useRef(null);
  const galleryRef = useRef(null);
  const trackRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!galleryRef.current || !trackRef.current || FEATURED.length === 0) return;

    const ctx = gsap.context(() => {
      const totalScroll = trackRef.current.scrollWidth - galleryRef.current.offsetWidth;

      const scrollTween = gsap.to(trackRef.current, {
        x: -totalScroll,
        ease: 'none',
        scrollTrigger: {
          trigger: galleryRef.current,
          start: 'top top',
          end: () => `+=${totalScroll}`,
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
        },
      });

      trackRef.current.querySelectorAll('.featured-slide').forEach((slide) => {
        gsap.fromTo(slide.children[0], {
          opacity: 0.4,
          scale: 0.92,
        }, {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          scrollTrigger: {
            trigger: slide,
            containerAnimation: scrollTween,
            start: 'left 70%',
            end: 'left 30%',
            scrub: true,
          },
        });
      });

      if (gridRef.current) {
        gsap.fromTo(gridRef.current.querySelectorAll('.project-card'), {
          opacity: 0,
          y: 40,
        }, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: gridRef.current,
            start: 'top 85%',
            once: true,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef}>
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="projects" title="Projects" sub="things I've built and broken" />
      </div>

      {FEATURED.length > 0 && (
        <div
          ref={galleryRef}
          className="w-full overflow-hidden relative"
          style={{ minHeight: '70vh' }}
        >
          <div ref={trackRef} className="flex items-center h-full" style={{ minHeight: '70vh' }}>
            <div className="shrink-0 w-[10vw]" />
            {FEATURED.map((p, i) => (
              <FeaturedProject key={p.name} project={p} index={i} />
            ))}
            <div className="shrink-0 w-[15vw]" />
          </div>
        </div>
      )}

      {/* More projects grid */}
      <div className="max-w-[1100px] mx-auto px-6 mt-20">
        <h3 className="font-display text-[13px] tracking-[1px] mb-6 uppercase" style={{ color: 'var(--color-text-dim)' }}>
          More Projects
        </h3>
        <div
          ref={gridRef}
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
        >
          {OTHERS.map((p, i) => (
            <ProjectCard key={p.name} project={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
