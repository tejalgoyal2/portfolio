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
  const innerRef = useRef(null);
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
        // Parallax scale-down: hero recedes as content slides over
        if (innerRef.current) {
          const scale = 1 - self.progress * 0.06;
          const opacity = 1 - self.progress * 0.6;
          innerRef.current.style.transform = `scale(${scale})`;
          innerRef.current.style.opacity = opacity;
        }
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="hero-section relative w-full overflow-hidden"
      style={{
        background: 'var(--color-bg)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      <div ref={innerRef} className="w-full h-full" style={{ willChange: 'transform, opacity' }}>
        <HeroParticles scrollProgress={scrollProgress} count={particleCount} />
        <HeroContent />
        <ParticleSlider count={particleCount} onChange={setParticleCount} />
      </div>
    </section>
  );
}
