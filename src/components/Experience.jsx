import { useRef, useEffect, useState } from 'react';
import { EXPERIENCE } from '../data/experience';
import SectionHeader from './SectionHeader';
import { gsap } from '../hooks/useGSAP';

function shortOrg(org) {
  if (org.includes('British Columbia') || org.includes('BCI')) return 'BCI';
  if (org.includes('Victoria')) return 'UVic';
  if (org.includes('Indian Institute') || org.includes('Ropar')) return 'IIT Ropar';
  return org;
}

function shortPeriod(period) {
  const match = period.match(/(\d{4})/);
  return match ? match[1] : period;
}

export default function Experience() {
  const sectionRef = useRef(null);
  const timelineRef = useRef(null);
  const contentRef = useRef(null);
  const detailsRef = useRef(null);

  // Oldest first (left) → newest last (right)
  const timeline = [...EXPERIENCE].reverse();
  const [active, setActive] = useState(timeline.length - 1);
  const exp = timeline[active];

  useEffect(() => {
    if (!contentRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(contentRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
    );
    if (detailsRef.current?.children.length) {
      tl.fromTo(detailsRef.current.children,
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.25, stagger: 0.05, ease: 'power2.out' },
        '-=0.12'
      );
    }
  }, [active]);

  useEffect(() => {
    if (!sectionRef.current || !timelineRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.exp-line',
        { scaleX: 0 },
        {
          scaleX: 1, duration: 1.2, ease: 'power2.inOut',
          scrollTrigger: { trigger: timelineRef.current, start: 'top 80%', once: true },
        }
      );

      gsap.fromTo('.exp-dot-btn',
        { scale: 0, opacity: 0 },
        {
          scale: 1, opacity: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(2)',
          scrollTrigger: { trigger: timelineRef.current, start: 'top 80%', once: true },
          delay: 0.5,
        }
      );

      gsap.fromTo('.exp-dot-label',
        { opacity: 0, y: 8 },
        {
          opacity: 1, y: 0, duration: 0.3, stagger: 0.1, ease: 'power2.out',
          scrollTrigger: { trigger: timelineRef.current, start: 'top 80%', once: true },
          delay: 0.8,
        }
      );

      gsap.fromTo('.exp-content',
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: timelineRef.current, start: 'top 75%', once: true },
          delay: 1.1,
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef}>
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="experience" title="Experience" sub="where I've applied the skills" />

        {/* Horizontal timeline */}
        <div ref={timelineRef} className="relative mb-10">
          {/* Line */}
          <div
            className="exp-line absolute left-[6%] right-[6%] top-[8px] h-[1.5px] origin-left"
            style={{
              background: 'linear-gradient(to right, var(--color-border-subtle), var(--color-interactive) 40%, var(--color-interactive) 60%, var(--color-border-subtle))',
              transform: 'scaleX(0)',
            }}
          />

          {/* Dots */}
          <div className="flex justify-between px-[6%]">
            {timeline.map((e, i) => (
              <button
                key={i}
                className="exp-dot-btn relative flex flex-col items-center bg-transparent border-none cursor-pointer z-[1]"
                style={{ opacity: 0, gap: '14px' }}
                onClick={() => setActive(i)}
              >
                {/* Dot */}
                <div
                  className="w-[16px] h-[16px] rounded-full transition-all duration-400 relative"
                  style={{
                    background: active === i ? 'var(--color-interactive)' : 'var(--color-bg)',
                    border: `2px solid ${active === i ? 'var(--color-interactive)' : 'var(--color-border)'}`,
                    boxShadow: active === i ? '0 0 16px rgba(139,142,255,0.4)' : 'none',
                    transform: active === i ? 'scale(1.25)' : 'scale(1)',
                  }}
                />

                {/* Pulse ring on active current role */}
                {e.active && active === i && (
                  <div
                    className="absolute top-0 w-[16px] h-[16px] rounded-full pointer-events-none"
                    style={{
                      left: '50%',
                      marginLeft: '-8px',
                      border: '1.5px solid var(--color-interactive)',
                      animation: 'exp-pulse 2s ease-out infinite',
                    }}
                  />
                )}

                {/* Label */}
                <div className="exp-dot-label flex flex-col items-center gap-0.5" style={{ opacity: 0 }}>
                  <span
                    className="text-[11px] font-mono font-medium transition-colors duration-300 whitespace-nowrap"
                    style={{ color: active === i ? 'var(--color-text)' : 'var(--color-text-dim)' }}
                  >
                    {shortOrg(e.org)}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: 'var(--color-text-ghost)' }}>
                    {shortPeriod(e.period)}
                  </span>
                  {e.active && (
                    <span className="text-[8px] font-mono mt-0.5 inline-flex items-center gap-1" style={{ color: '#6ee7b7' }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: '#6ee7b7', boxShadow: '0 0 4px #6ee7b7' }} />
                      now
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content card */}
        <div
          className="exp-content rounded-xl relative overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
            opacity: 0,
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(to right, var(--color-interactive), transparent 60%)' }}
          />

          <div ref={contentRef} className="p-8">
            <h3 className="text-[20px] font-display font-bold leading-tight mb-1.5" style={{ color: 'var(--color-text)' }}>
              {exp.role}
            </h3>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <span className="text-[12px] font-mono" style={{ color: 'var(--color-interactive)', opacity: 0.7 }}>
                {exp.org}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-dim)' }}>
                {exp.period}
              </span>
            </div>
            <p className="text-[14px] leading-[1.8] mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              {exp.desc}
            </p>
            <div ref={detailsRef}>
              {exp.details.map((d, j) => (
                <div key={j} className="flex gap-3 mb-3 text-[13px] leading-[1.7]">
                  <span className="shrink-0 mt-0.5" style={{ color: 'var(--color-interactive)', opacity: 0.4 }}>
                    &#9656;
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes exp-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
