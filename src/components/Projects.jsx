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
          color: '#6ee7b7',
          background: 'rgba(110,231,183,0.08)',
          border: '1px solid rgba(110,231,183,0.2)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#6ee7b7', boxShadow: '0 0 6px #6ee7b7' }} />
        LIVE
      </span>
    );
  }
  return (
    <span
      className="text-[9px] font-bold tracking-[1.5px] py-1 px-2.5 rounded-full font-mono uppercase shrink-0"
      style={{
        color: 'var(--color-text-dim)',
        background: 'rgba(255,255,255,0.03)',
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

  return (
    <div
      ref={cardRef}
      className="featured-card rounded-2xl relative"
      style={{
        background: hov
          ? `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, rgba(139,142,255,0.06) 0%, var(--color-surface) 55%)`
          : 'var(--color-surface)',
        border: `1px solid ${hov ? 'var(--color-interactive)' : 'var(--color-border-subtle)'}`,
        boxShadow: hov
          ? '0 24px 48px rgba(0,0,0,0.25), 0 0 20px rgba(139,142,255,0.06)'
          : '0 4px 16px rgba(0,0,0,0.1)',
        transform: hov
          ? `perspective(800px) translateY(-4px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : 'perspective(800px) translateY(0) rotateX(0) rotateY(0)',
        transformStyle: 'preserve-3d',
        transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s, transform 0.15s ease-out',
      }}
      onMouseEnter={() => { setHov(true); setExpanded(true); tiltTimer.current = setTimeout(() => setTiltReady(true), 200); }}
      onMouseLeave={() => { setHov(false); setExpanded(false); setTiltReady(false); clearTimeout(tiltTimer.current); setMouse({ x: 50, y: 50 }); }}
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

function CylinderCard({ project }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      className="cylinder-card project-card rounded-xl"
      style={{
        width: '280px',
        background: hov ? 'var(--color-surface-elevated)' : 'var(--color-surface)',
        border: `1px solid ${hov ? 'var(--color-interactive)' : 'var(--color-border-subtle)'}`,
        boxShadow: hov
          ? '0 16px 40px rgba(0,0,0,0.3), 0 0 20px rgba(139,142,255,0.1)'
          : '0 4px 16px rgba(0,0,0,0.12)',
        transition: 'background 0.3s, border-color 0.3s, box-shadow 0.4s, transform 0.25s',
        transform: hov ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h4
            className="text-[14px] font-display font-bold m-0 transition-colors duration-300"
            style={{ color: hov ? 'var(--color-interactive)' : 'var(--color-text)' }}
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

function CylinderCarousel({ items }) {
  const sceneRef = useRef(null);
  const ringRef = useRef(null);
  const angleRef = useRef(0);
  const mouseXRef = useRef(0.5);
  const pausedRef = useRef(false);

  const count = items.length;
  const angleStep = 360 / count;
  const radius = 340;

  // Auto-rotate + mouse influence
  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;

    let raf;
    const tick = () => {
      if (!pausedRef.current) {
        angleRef.current -= 0.12;
      }
      const mouseOffset = (mouseXRef.current - 0.5) * 25;
      ring.style.transform = `rotateX(-6deg) rotateY(${angleRef.current + mouseOffset}deg)`;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Entrance animation
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const ctx = gsap.context(() => {
      const cards = scene.querySelectorAll('.cylinder-card');
      gsap.fromTo(cards,
        { opacity: 0, scale: 0.6 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: scene,
            start: 'top 82%',
            once: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  const handleSceneMove = (e) => {
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    mouseXRef.current = (e.clientX - rect.left) / rect.width;
  };

  return (
    <div
      ref={sceneRef}
      className="relative"
      style={{ perspective: '1200px', height: '380px' }}
      onMouseMove={handleSceneMove}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; mouseXRef.current = 0.5; }}
    >
      <div
        ref={ringRef}
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transformStyle: 'preserve-3d',
          transform: 'rotateX(-6deg) rotateY(0deg)',
          width: 0,
          height: 0,
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.name}
            className="absolute"
            style={{
              transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
              width: '280px',
              marginLeft: '-140px',
              marginTop: '-165px',
              backfaceVisibility: 'hidden',
            }}
          >
            <CylinderCard project={item} />
          </div>
        ))}
      </div>

      {/* Edge fades for depth */}
      <div
        className="absolute inset-y-0 left-0 w-28 pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(to right, var(--color-bg), transparent)' }}
      />
      <div
        className="absolute inset-y-0 right-0 w-28 pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(to left, var(--color-bg), transparent)' }}
      />
    </div>
  );
}

export default function Projects() {
  const sectionRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Featured cards entrance
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

        {/* More projects - 3D cylinder carousel */}
        <h3 className="font-display text-[13px] tracking-[1px] mb-2 uppercase" style={{ color: 'var(--color-text-dim)' }}>
          More Projects
        </h3>
        <p className="text-[11px] font-mono mb-8" style={{ color: 'var(--color-text-ghost)' }}>
          hover to pause, move mouse to explore
        </p>
      </div>

      {/* Carousel breaks out of container for full-width visual */}
      <CylinderCarousel items={OTHERS} />
    </section>
  );
}
