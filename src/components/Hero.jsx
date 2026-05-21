import { useRef, useState, useEffect } from 'react';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';
import HeroContent from './HeroContent';
import HeroParticles from './HeroParticles';

function ParticleSlider({ count, onChange }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      className="absolute bottom-24 right-6 z-[3] flex items-center gap-3 rounded-full px-4 py-2 transition-all duration-400"
      style={{
        opacity: hov ? 1 : 0.5,
        background: hov ? 'color-mix(in srgb, var(--color-surface) 85%, transparent)' : 'color-mix(in srgb, var(--color-surface) 50%, transparent)',
        border: `1px solid ${hov ? 'var(--color-border)' : 'var(--color-border-subtle)'}`,
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: hov ? 'var(--color-text-secondary)' : 'var(--color-text-dim)' }}>
        particles
      </span>
      <input
        type="range"
        min={300}
        max={5000}
        step={100}
        value={count}
        onChange={(e) => onChange(Number(e.target.value))}
        className="particle-slider"
        style={{ width: '90px', height: '2px', cursor: 'none' }}
      />
      <span className="text-[10px] font-mono tabular-nums" style={{ color: hov ? 'var(--color-interactive)' : 'var(--color-text-dim)', minWidth: '34px', textAlign: 'right' }}>
        {count}
      </span>
    </div>
  );
}

export default function Hero() {
  const sectionRef = useRef(null);
  const scrollProgress = useRef(0);
  const [particleCount, setParticleCount] = useState(2500);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        scrollProgress.current = self.progress;
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="hero-dark-override relative min-h-screen w-full overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      <HeroParticles scrollProgress={scrollProgress} count={particleCount} />
      <HeroContent />
      <ParticleSlider count={particleCount} onChange={setParticleCount} />
      {/* Smooth fade into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-[2]"
        style={{
          height: '35vh',
          background: 'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--color-bg) 30%, transparent) 30%, color-mix(in srgb, var(--color-bg) 70%, transparent) 60%, var(--color-bg) 100%)',
        }}
      />
    </section>
  );
}
