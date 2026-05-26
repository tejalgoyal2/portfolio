import { useRef, useEffect, useState } from 'react';
import { PROJECTS } from '../data/projects';
import SectionHeader from './SectionHeader';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';

const FEATURED = PROJECTS.filter(p => p.tier === 1);
const OTHERS = PROJECTS.filter(p => p.tier >= 2);

function Badge({ status }) {
  if (status === 'LIVE') {
    return (
      <span
        className="text-[9px] font-bold tracking-[1.5px] py-1 px-2.5 rounded-full font-mono inline-flex items-center gap-1.5 uppercase shrink-0"
        style={{
          color: 'var(--color-green)',
          background: 'color-mix(in srgb, var(--color-green) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-green) 20%, transparent)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-green)', boxShadow: '0 0 6px var(--color-green)' }} />
        LIVE
      </span>
    );
  }
  return (
    <span
      className="text-[9px] font-bold tracking-[1.5px] py-1 px-2.5 rounded-full font-mono uppercase shrink-0"
      style={{
        color: 'var(--color-text-dim)',
        background: 'color-mix(in srgb, var(--color-text) 3%, transparent)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      {status}
    </span>
  );
}

function FeaturedProject({ project, index }) {
  const cardRef = useRef(null);
  const detailRef = useRef(null);
  const [hov, setHov] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [tiltReady, setTiltReady] = useState(false);
  const tiltTimer = useRef(null);
  const expandTimer = useRef(null);
  const scrolling = useRef(false);
  const scrollTimer = useRef(null);

  // Detect active scrolling to prevent accidental hover-expand
  useEffect(() => {
    const onScroll = () => {
      scrolling.current = true;
      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => { scrolling.current = false; }, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(scrollTimer.current);
      clearTimeout(expandTimer.current);
    };
  }, []);

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  // Animate long description expand/collapse
  useEffect(() => {
    if (!detailRef.current) return;
    if (expanded) {
      gsap.fromTo(detailRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.45, ease: 'power2.out' }
      );
    } else {
      gsap.to(detailRef.current, {
        height: 0, opacity: 0, duration: 0.3, ease: 'power2.in',
      });
    }
  }, [expanded]);

  useEffect(() => () => clearTimeout(tiltTimer.current), []);

  // Edge dampening: reduce tilt near card edges to prevent jitter
  const edgeX = Math.min(mouse.x, 100 - mouse.x) / 15;
  const edgeY = Math.min(mouse.y, 100 - mouse.y) / 15;
  const edge = Math.min(1, Math.min(edgeX, edgeY));
  const tiltX = tiltReady ? (50 - mouse.y) * 0.22 * edge : 0;
  const tiltY = tiltReady ? (mouse.x - 50) * 0.22 * edge : 0;

  const handleEnter = () => {
    setHov(true);
    tiltTimer.current = setTimeout(() => setTiltReady(true), 200);
    // Delay expand so scrolling past doesn't trigger it
    clearTimeout(expandTimer.current);
    expandTimer.current = setTimeout(() => {
      if (!scrolling.current) setExpanded(true);
    }, 300);
  };

  const handleLeave = () => {
    setHov(false);
    setExpanded(false);
    setTiltReady(false);
    clearTimeout(tiltTimer.current);
    clearTimeout(expandTimer.current);
    setMouse({ x: 50, y: 50 });
  };

  return (
    <div
      ref={cardRef}
      className="featured-card rounded-2xl relative"
      style={{
        background: hov
          ? `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, color-mix(in srgb, var(--color-interactive) 6%, transparent) 0%, var(--color-surface) 55%)`
          : 'var(--color-surface)',
        border: `1px solid ${hov ? 'var(--color-interactive)' : 'var(--color-border-subtle)'}`,
        boxShadow: hov
          ? `0 24px 48px color-mix(in srgb, var(--color-text) 18%, transparent), 0 0 20px color-mix(in srgb, var(--color-interactive) 6%, transparent)`
          : `0 2px 12px color-mix(in srgb, var(--color-text) 6%, transparent)`,
        transform: hov
          ? `perspective(800px) translateY(-4px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : 'perspective(800px) translateY(0) rotateX(0) rotateY(0)',
        transformStyle: 'preserve-3d',
        transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s, transform 0.15s ease-out',
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
    >
      <div className="p-10 md:p-12">
        <div className="flex items-center gap-3 mb-6">
          <Badge status={project.status} />
        </div>

        <h3
          className="font-display font-bold tracking-[-0.03em] m-0 mb-4 leading-[1.1] transition-colors duration-400"
          style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            color: hov ? 'var(--color-interactive)' : 'var(--color-text)',
          }}
        >
          {project.name}
        </h3>

        <p
          className="text-[15px] leading-[1.8] mb-6 max-w-[600px]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {project.desc}
        </p>

        {/* Expandable long description */}
        <div
          ref={detailRef}
          className="overflow-hidden"
          style={{ height: 0, opacity: 0 }}
        >
          <p
            className="text-[13px] leading-[1.8] mb-6 max-w-[600px]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {project.long}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {project.tech.map(t => (
            <span
              key={t}
              className="tech-pill text-[10px] py-1.5 px-3 rounded-full font-mono"
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
              className="btn-live text-[11px] font-mono font-medium no-underline py-2.5 px-6 rounded-full transition-all duration-300"
              style={{
                color: '#08090d',
                background: 'var(--color-interactive)',
              }}
            >
              View Live &#8599;
            </a>
          )}
          {project.links.github && (
            <a
              href={project.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="link-source text-[11px] font-mono no-underline py-2.5 px-6 rounded-full transition-all duration-300"
              style={{
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              Source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function GridCard({ project, baseRotateY, baseTranslateZ }) {
  const [hov, setHov] = useState(false);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [tiltReady, setTiltReady] = useState(false);
  const tiltTimer = useRef(null);

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  useEffect(() => () => clearTimeout(tiltTimer.current), []);

  const tiltX = tiltReady ? (50 - mouse.y) * 0.18 : 0;
  const tiltY = tiltReady ? (mouse.x - 50) * 0.18 : 0;

  return (
    <div
      className="concave-card project-card rounded-xl"
      style={{
        flex: '1 1 0',
        maxWidth: '260px',
        minWidth: '200px',
        background: hov
          ? `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, color-mix(in srgb, var(--color-interactive) 5%, transparent) 0%, var(--color-surface-elevated) 60%)`
          : 'var(--color-surface)',
        border: `1px solid ${hov ? 'var(--color-interactive)' : 'var(--color-border-subtle)'}`,
        boxShadow: hov
          ? '0 20px 50px color-mix(in srgb, var(--color-text) 15%, transparent), 0 0 30px color-mix(in srgb, var(--color-interactive) 10%, transparent)'
          : '0 2px 8px color-mix(in srgb, var(--color-text) 4%, transparent)',
        transform: hov
          ? `perspective(700px) rotateY(${baseRotateY + tiltY * 0.6}deg) rotateX(${tiltX}deg) translateZ(${baseTranslateZ + 14}px) scale(1.06)`
          : `perspective(700px) rotateY(${baseRotateY}deg) translateZ(${baseTranslateZ}px)`,
        transition: 'background 0.3s, border-color 0.3s, box-shadow 0.4s, transform 0.25s ease-out',
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => {
        setHov(true);
        tiltTimer.current = setTimeout(() => setTiltReady(true), 150);
      }}
      onMouseLeave={() => {
        setHov(false);
        setTiltReady(false);
        clearTimeout(tiltTimer.current);
        setMouse({ x: 50, y: 50 });
      }}
      onMouseMove={handleMove}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h4
            className="text-[14px] font-display font-bold m-0 transition-colors duration-300 truncate"
            style={{ color: hov ? 'var(--color-interactive)' : 'var(--color-text)' }}
          >
            {project.name}
          </h4>
          <Badge status={project.status} />
        </div>

        <p className="text-[12px] leading-[1.7] mb-3 m-0" style={{ color: 'var(--color-text-secondary)' }}>
          {project.desc}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.tech.slice(0, 4).map(t => (
            <span
              key={t}
              className="tech-pill text-[9px] py-0.5 px-2 rounded-full font-mono"
              style={{ color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="flex gap-3">
          {project.links.live && (
            <a href={project.links.live} target="_blank" rel="noopener noreferrer"
               className="text-[10px] font-mono no-underline transition-colors duration-300"
               style={{ color: 'var(--color-interactive)' }}>
              Live &#8599;
            </a>
          )}
          {project.links.github && (
            <a href={project.links.github} target="_blank" rel="noopener noreferrer"
               className="text-[10px] font-mono no-underline transition-colors duration-300"
               style={{ color: 'var(--color-text-dim)' }}>
              Source &#8599;
            </a>
          )}
          {project.links.youtube && (
            <a href={project.links.youtube} target="_blank" rel="noopener noreferrer"
               className="text-[10px] font-mono no-underline transition-colors duration-300"
               style={{ color: 'var(--color-text-dim)' }}>
              Demo &#8599;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const GRID_COLS = 4;

function ConcaveGrid({ items }) {
  const gridRef = useRef(null);

  // Split into rows of GRID_COLS
  const rows = [];
  for (let i = 0; i < items.length; i += GRID_COLS) {
    rows.push(items.slice(i, i + GRID_COLS));
  }

  // Entrance animation
  useEffect(() => {
    if (!gridRef.current) return;
    const ctx = gsap.context(() => {
      const cards = gridRef.current.querySelectorAll('.concave-card');
      gsap.fromTo(cards,
        { opacity: 0, y: 30, rotateX: -8 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.6,
          stagger: { each: 0.06, from: 'center' },
          ease: 'power3.out',
          scrollTrigger: {
            trigger: gridRef.current,
            start: 'top 85%',
            once: true,
          },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={gridRef}
      className="max-w-[1100px] mx-auto px-6"
      style={{ perspective: '800px', perspectiveOrigin: '50% 50%' }}
    >
      {rows.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-4 mb-4">
          {row.map((item, ci) => {
            const center = (row.length - 1) / 2;
            const dist = ci - center;
            const rotateY = dist * -2.8;
            const translateZ = -(Math.abs(dist) * Math.abs(dist)) * 3;
            return (
              <GridCard
                key={item.name}
                project={item}
                baseRotateY={rotateY}
                baseTranslateZ={translateZ}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Projects() {
  const sectionRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray('.featured-card').forEach((card) => {
        gsap.fromTo(card,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 82%',
              once: true,
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="pb-28">
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="projects" title="Projects" sub="things I've built and broken" />

        {/* Featured projects - stacked */}
        <div className="flex flex-col gap-8 mb-20">
          {FEATURED.map((p, i) => (
            <FeaturedProject key={p.name} project={p} index={i} />
          ))}
        </div>

        <h3 className="font-display text-[13px] tracking-[1px] mb-8 uppercase" style={{ color: 'var(--color-text-dim)' }}>
          More Projects
        </h3>
      </div>

      {/* Concave grid - curved monitor wall */}
      <ConcaveGrid items={OTHERS} />
    </section>
  );
}
