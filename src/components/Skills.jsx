import { useState, useRef, useEffect } from 'react';
import { SKILL_NODES, SKILL_EDGES } from '../data/skills';
import SectionHeader from './SectionHeader';
import { useScrollReveal } from '../hooks/useScrollReveal';

export default function Skills() {
  const [active, setActive] = useState(null);
  const containerRef = useRef(null);
  const [dim, setDim] = useState({ w: 700, h: 320 });
  const sectionRef = useScrollReveal();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setDim({ w, h: Math.max(240, Math.min(360, w * 0.45)) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const nodes = SKILL_NODES.map(n => ({ ...n, px: n.x * dim.w, py: n.y * dim.h }));

  return (
    <section>
      <SectionHeader id="skills" title="Skills" sub="// hover a node to highlight" />
      <div ref={(el) => { containerRef.current = el; if (sectionRef.current === null) sectionRef.current = el; }}
        className="reveal panel overflow-hidden" style={{ padding: 0 }}>

        {/* Constellation SVG */}
        <svg width={dim.w} height={dim.h} style={{ display: 'block' }}>
          <defs>
            <pattern id="skillGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0,255,65,0.03)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#skillGrid)" />

          {/* Edges */}
          {SKILL_EDGES.map(([a, b], i) => {
            const na = nodes.find(n => n.id === a);
            const nb = nodes.find(n => n.id === b);
            const hi = active === a || active === b;
            return (
              <line key={i} x1={na.px} y1={na.py} x2={nb.px} y2={nb.py}
                stroke={hi ? 'rgba(0,255,65,0.32)' : 'rgba(0,255,65,0.06)'}
                strokeWidth={hi ? 1.5 : 0.6}
                style={{ transition: 'all 0.3s' }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const hi = active === n.id;
            return (
              <g key={n.id}
                onMouseEnter={() => setActive(n.id)}
                onMouseLeave={() => setActive(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={n.px} cy={n.py} r={hi ? n.r + 5 : n.r}
                  fill={`${n.color}${hi ? '0d' : '04'}`}
                  style={{ transition: 'all 0.3s' }}
                />
                <circle cx={n.px} cy={n.py} r={hi ? n.r * 0.55 : n.r * 0.4}
                  fill={`${n.color}0c`} stroke={n.color}
                  strokeWidth={hi ? 1.5 : 0.7}
                  style={{ transition: 'all 0.3s' }}
                />
                <circle cx={n.px} cy={n.py} r={2.5}
                  fill={n.color} opacity={hi ? 0.9 : 0.4}
                />
                <text x={n.px} y={n.py - n.r * 0.4 - 10}
                  textAnchor="middle"
                  fill={hi ? n.color : 'var(--color-muted)'}
                  fontSize={hi ? 12 : 10.5}
                  fontFamily="'Share Tech Mono', monospace"
                  fontWeight={hi ? 700 : 400}
                  style={{ transition: 'all 0.3s' }}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* All skills always visible — hover highlights */}
        <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          {SKILL_NODES.map(node => {
            const isActive = active === node.id;
            const noSelection = active === null;
            return (
              <div
                key={node.id}
                className="mb-2.5 transition-opacity duration-300"
                style={{ opacity: noSelection ? 1 : isActive ? 1 : 0.25 }}
                onMouseEnter={() => setActive(node.id)}
                onMouseLeave={() => setActive(null)}
              >
                <div
                  className="text-[10px] font-display mb-1.5 tracking-[1px] transition-colors duration-300"
                  style={{ color: isActive ? node.color : 'var(--color-dim)' }}
                >
                  {node.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {node.items.map(item => (
                    <span
                      key={item}
                      className="text-[10.5px] py-0.5 px-2.5 rounded-sm font-mono transition-all duration-300"
                      style={{
                        color: isActive ? node.color : 'var(--color-muted)',
                        background: isActive ? `${node.color}10` : 'rgba(0,212,255,0.02)',
                        border: `1px solid ${isActive ? `${node.color}25` : 'var(--color-border)'}`,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
