import { useState } from 'react';
import { EXPERIENCE } from '../data/experience';
import SectionHeader from './SectionHeader';
import { useScrollReveal } from '../hooks/useScrollReveal';

function TimelineItem({ exp, index, open, onToggle, isLast }) {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className="reveal flex gap-3.5 cursor-pointer" style={{ paddingBottom: 20 }} onClick={onToggle}>
      <div className="flex flex-col items-center" style={{ minWidth: 16 }}>
        <div
          className="w-[9px] h-[9px] rounded-full shrink-0"
          style={{
            background: exp.color,
            boxShadow: exp.active ? `0 0 6px ${exp.color}55` : 'none',
          }}
        />
        {!isLast && (
          <div className="w-px flex-1 mt-1" style={{ background: `${exp.color}22` }} />
        )}
      </div>
      <div
        className="panel flex-1 transition-[border-color] duration-250"
        style={{ padding: '14px 16px', borderColor: open ? `${exp.color}30` : undefined }}
      >
        <div className="flex justify-between items-baseline flex-wrap gap-1.5">
          <span className="text-sm font-bold font-display" style={{ color: exp.color }}>
            {exp.role}
          </span>
          <span className="text-dim text-[10px] font-mono">{exp.period}</span>
        </div>
        <div className="text-amber text-[11px] mt-0.5 font-mono opacity-70">{exp.org}</div>
        <p className="text-text text-[12.5px] leading-[1.6] mt-1.5">{exp.desc}</p>
        {open && (
          <div className="mt-2.5 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            {exp.details.map((d, j) => (
              <div key={j} className="flex gap-2 mb-1.5 text-xs leading-[1.5]">
                <span className="shrink-0 opacity-60" style={{ color: exp.color }}>&#8250;</span>
                <span className="text-text">{d}</span>
              </div>
            ))}
          </div>
        )}
        <div className="text-dim text-[9px] font-mono mt-1.5">{open ? '[-]' : '[+]'}</div>
      </div>
    </div>
  );
}

export default function Experience() {
  const [open, setOpen] = useState(null);

  return (
    <section>
      <SectionHeader id="experience" title="Experience" sub="// where I've applied the skills" />
      <div className="flex flex-col">
        {EXPERIENCE.map((exp, i) => (
          <TimelineItem
            key={i}
            exp={exp}
            index={i}
            open={open === i}
            onToggle={() => setOpen(open === i ? null : i)}
            isLast={i === EXPERIENCE.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
