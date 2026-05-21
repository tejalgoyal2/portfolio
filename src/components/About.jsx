import { useRef, useEffect } from 'react';
import SectionHeader from './SectionHeader';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';

function Panel({ title, children, index }) {
  return (
    <div
      className="about-panel rounded-lg p-5 transition-all duration-300"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <h3
        className="text-[10px] font-mono mb-3 tracking-[1.5px] uppercase"
        style={{ color: 'var(--color-interactive)', opacity: 0.6 }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function About() {
  const sectionRef = useRef(null);
  const narrativeRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Narrative fade in
      if (narrativeRef.current) {
        gsap.fromTo(narrativeRef.current, {
          opacity: 0,
          y: 30,
        }, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: narrativeRef.current,
            start: 'top 85%',
            once: true,
          },
        });
      }

      // Grid panels stagger
      if (gridRef.current) {
        gsap.fromTo(gridRef.current.querySelectorAll('.about-panel'), {
          opacity: 0,
          y: 30,
        }, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
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
    <section ref={sectionRef} className="pb-28">
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="about" title="About" sub="the person behind the code" />

        {/* Narrative */}
        <div
          ref={narrativeRef}
          className="rounded-xl p-8 mb-6"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          <p className="text-[14.5px] leading-[2] m-0" style={{ color: 'var(--color-text-secondary)' }}>
            Grad student at UVic. Currently building the apps a $250B+ investor depends on
            daily at BCI. Previous life: four months hunting shadow AI and actual malware
            across 1,200 endpoints on their security team. I&rsquo;ve shipped an expense
            tracker that roasts your spending in Hinglish, a coding agent in Rust because
            I apparently hate easy mode, and a Sudoku app that exists purely because a
            mobile ad interrupted my winning streak. I learn by shipping v1.0 and writing
            about what went wrong.
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          <Panel title="Education">
            <div className="mb-4">
              <div className="text-[13px] font-display font-bold" style={{ color: 'var(--color-text)' }}>
                MEng, Applied Data Science
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                University of Victoria &middot; 2025 &ndash; 2026 &middot; GPA 8.82/9.0
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Algorithms, Systems for Massive Datasets, Data Mining, Optimization for ML, Secure Communication
              </div>
            </div>
            <div>
              <div className="text-[13px] font-display font-bold" style={{ color: 'var(--color-text)' }}>
                BEng, Electronics &amp; Computer Engineering
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                Thapar Institute &middot; 2020 &ndash; 2024 &middot; GPA 8.9/10.0
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Cyber Security, AI/NLP/CV, Deep Learning, Cloud Computing, DSA, Quantum Computing
              </div>
            </div>
          </Panel>

          <Panel title="Achievements">
            <div className="flex flex-col gap-2 text-[12px] leading-[1.7]" style={{ color: 'var(--color-text-secondary)' }}>
              <div>$4,200 CAD Academic Excellence Scholarship &middot; Top 5% all years</div>
              <div>Guest Speaker, UVic MEng Co-op Orientation (Mar 2026)</div>
              <div>TC10K Road Race Finisher (Apr 2026, Victoria)</div>
              <div>Thaparlympics Badminton Winner &middot; State-level in 10th grade</div>
            </div>
          </Panel>

          <Panel title="Community">
            <div className="flex flex-col gap-2 text-[12px] leading-[1.7]" style={{ color: 'var(--color-text-secondary)' }}>
              <div>Co-Founded Bubbles NGO: 1,000+ trees, COVID bridge courses, community meals</div>
              <div>Better Life Foundation: Circle Head for 4 years, 100+ school enrollments</div>
              <div>Volunteered at Victoria Native Friendship Centre &amp; Threshold Housing Society</div>
            </div>
          </Panel>

          <Panel title="Beyond the Code">
            <p className="text-[12px] leading-[1.9] m-0" style={{ color: 'var(--color-text-secondary)' }}>
              Trilingual: English, Hindi, Punjabi. Recently survived the TC10K.
              Competitive badminton player, readathon merit holder, serial stress-baker.
              Watches F1 for the strategy, The Boys for the chaos.
            </p>
          </Panel>
        </div>
      </div>
    </section>
  );
}
