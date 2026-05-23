import { useRef, useEffect, useState } from 'react';
import { EXPERIENCE } from '../data/experience';
import SectionHeader from './SectionHeader';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';

const HOVER_DELAY = 400;

function shortOrg(org) {
  if (org.includes('British Columbia') || org.includes('BCI')) return 'BCI';
  if (org.includes('Victoria')) return 'UVic';
  if (org.includes('Indian Institute') || org.includes('Ropar')) return 'IIT Ropar';
  return org;
}

function TimelineEntry({ entry, index, total, isActive }) {
  const entryRef = useRef(null);
  const detailsRef = useRef(null);
  const timerRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setExpanded(true), HOVER_DELAY);
  };

  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setExpanded(false);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  // Animate expand/collapse - kill competing tweens first to prevent jitter
  useEffect(() => {
    if (!detailsRef.current) return;
    gsap.killTweensOf(detailsRef.current);
    if (expanded) {
      gsap.fromTo(detailsRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' }
      );
    } else {
      gsap.to(detailsRef.current, {
        height: 0, opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: 'auto',
      });
    }
  }, [expanded]);

  return (
    <div
      ref={entryRef}
      className="exp-entry relative flex gap-0"
      style={{ paddingBottom: index < total - 1 ? '3rem' : '0' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Dot */}
      <div className="flex flex-col items-center shrink-0" style={{ width: '40px' }}>
        <div
          className="exp-dot w-3 h-3 rounded-full relative z-[2] transition-all duration-400 mt-1.5"
          style={{
            background: 'var(--color-bg)',
            border: '2px solid var(--color-border)',
          }}
        >
          {/* Pulse ring for current role */}
          {entry.active && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: '1.5px solid var(--color-interactive)',
                animation: 'exp-pulse 2s ease-out infinite',
              }}
            />
          )}
        </div>
      </div>

      {/* Content card */}
      <div
        className="flex-1 ml-4 rounded-lg transition-all duration-300"
        style={{
          background: expanded ? 'var(--color-surface)' : 'transparent',
          border: expanded ? '1px solid var(--color-border-subtle)' : '1px solid transparent',
          padding: expanded ? '1.25rem' : '0 1.25rem',
        }}
      >
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h4
            className="text-[16px] font-display font-bold m-0 transition-colors duration-300"
            style={{ color: expanded ? 'var(--color-interactive)' : 'var(--color-text)' }}
          >
            {entry.role}
          </h4>
          {entry.active && (
            <span className="text-[8px] font-mono inline-flex items-center gap-1 uppercase tracking-wider" style={{ color: 'var(--color-interactive)' }}>
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--color-interactive)', boxShadow: '0 0 4px color-mix(in srgb, var(--color-interactive) 60%, transparent)' }} />
              current
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[12px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            {shortOrg(entry.org)}
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-dim)' }}>
            {entry.period}
          </span>
        </div>

        {/* Expandable content */}
        <div
          ref={detailsRef}
          className="overflow-hidden"
          style={{ height: 0, opacity: 0 }}
        >
          <p className="text-[13px] leading-[1.8] mt-3 mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {entry.desc}
          </p>
          <div className="flex flex-col gap-2">
            {entry.details.map((d, j) => (
              <div key={j} className="flex gap-3 text-[12px] leading-[1.7]">
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
  );
}

export default function Experience() {
  const sectionRef = useRef(null);
  const timelineRef = useRef(null);
  const lineRef = useRef(null);
  const fillRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current || !timelineRef.current || !fillRef.current) return;

    const ctx = gsap.context(() => {
      // Scroll-driven line fill
      ScrollTrigger.create({
        trigger: timelineRef.current,
        start: 'top 65%',
        end: 'bottom 35%',
        scrub: 0.5,
        onUpdate: (self) => {
          gsap.set(fillRef.current, { scaleY: self.progress });

          // Activate dots as line passes them
          const dots = timelineRef.current.querySelectorAll('.exp-dot');
          dots.forEach((dot, i) => {
            const threshold = dots.length === 1 ? 0 : i / (dots.length - 1);
            if (self.progress >= threshold * 0.85) {
              dot.style.background = 'var(--color-interactive)';
              dot.style.borderColor = 'var(--color-interactive)';
              dot.style.boxShadow = '0 0 12px color-mix(in srgb, var(--color-interactive) 40%, transparent)';
            } else {
              dot.style.background = 'var(--color-bg)';
              dot.style.borderColor = 'var(--color-border)';
              dot.style.boxShadow = 'none';
            }
          });
        },
      });

      // Stagger entrance for entries
      gsap.fromTo('.exp-entry', {
        opacity: 0,
        x: -20,
      }, {
        opacity: 1,
        x: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: timelineRef.current,
          start: 'top 80%',
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="pb-28">
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="experience" title="Experience" sub="where I've applied the skills" />

        {/* Timeline container */}
        <div ref={timelineRef} className="relative max-w-[700px]">
          {/* Static background line */}
          <div
            ref={lineRef}
            className="absolute top-0 bottom-0 w-[2px]"
            style={{
              left: '19px',
              background: 'var(--color-border-subtle)',
            }}
          />

          {/* Animated fill line */}
          <div
            ref={fillRef}
            className="absolute top-0 bottom-0 w-[2px]"
            style={{
              left: '19px',
              background: 'linear-gradient(to bottom, var(--color-interactive), var(--color-interactive) 85%, transparent)',
              transformOrigin: 'top',
              transform: 'scaleY(0)',
            }}
          />

          {/* Entries */}
          {EXPERIENCE.map((entry, i) => (
            <TimelineEntry
              key={i}
              entry={entry}
              index={i}
              total={EXPERIENCE.length}
              isActive={entry.active}
            />
          ))}
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
