import { useRef, useEffect, useState } from 'react';
import { SKILL_NODES } from '../data/skills';
import SectionHeader from './SectionHeader';
import { gsap } from '../hooks/useGSAP';

const CATEGORY_META = {
  sec: { color: '#8b8eff', label: 'Security', span: 2 },
  lang: { color: '#6ee7b7', label: 'Languages', span: 1 },
  frontend: { color: '#fbbf24', label: 'Frontend', span: 1 },
  backend: { color: '#f97316', label: 'Backend & APIs', span: 2 },
  ml: { color: '#67e8f9', label: 'ML & Data', span: 2 },
  embedded: { color: '#f87171', label: 'CV & Embedded', span: 1 },
  tools: { color: '#a78bfa', label: 'DevOps & Tools', span: 3 },
};

function SkillCell({ node, hovered, onHover }) {
  const meta = CATEGORY_META[node.id] || { color: '#8b8eff', label: node.label, span: 1 };
  const isHovered = hovered === node.id;

  return (
    <div
      className="skill-cell rounded-xl p-6 relative overflow-hidden transition-all duration-400 cursor-default"
      style={{
        gridColumn: `span ${meta.span}`,
        background: isHovered
          ? `radial-gradient(ellipse at 30% 0%, ${meta.color}10 0%, var(--color-surface) 70%)`
          : 'var(--color-surface)',
        border: `1px solid ${isHovered ? `${meta.color}30` : 'var(--color-border-subtle)'}`,
        opacity: 1,
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: isHovered ? `0 12px 30px rgba(0,0,0,0.2), 0 0 30px ${meta.color}05` : 'none',
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-2 h-2 rounded-full transition-all duration-300"
          style={{
            background: meta.color,
            boxShadow: isHovered ? `0 0 10px ${meta.color}60` : 'none',
            transform: isHovered ? 'scale(1.3)' : 'scale(1)',
          }}
        />
        <span
          className="text-[10px] font-mono tracking-[2px] uppercase transition-colors duration-300"
          style={{ color: isHovered ? meta.color : 'var(--color-text-dim)' }}
        >
          {meta.label}
        </span>
        <span className="text-[9px] font-mono ml-auto" style={{ color: 'var(--color-text-ghost)' }}>
          {node.items.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {node.items.map(item => (
          <span
            key={item}
            className="text-[11px] py-1.5 px-3 rounded-full font-mono transition-all duration-300"
            style={{
              color: isHovered ? meta.color : 'var(--color-text-secondary)',
              border: `1px solid ${isHovered ? `${meta.color}25` : 'var(--color-border-subtle)'}`,
              background: isHovered ? `${meta.color}06` : 'transparent',
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Skills() {
  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    if (!sectionRef.current || !gridRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(gridRef.current.querySelectorAll('.skill-cell'), {
        opacity: 0,
        y: 30,
        scale: 0.96,
      }, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.07,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top 85%',
          once: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="pb-28">
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="skills" title="Skills" sub="what I work with" />

        <div
          ref={gridRef}
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          {SKILL_NODES.map((node, i) => (
            <SkillCell
              key={node.id}
              node={node}
              index={i}
              hovered={hovered}
              onHover={setHovered}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
