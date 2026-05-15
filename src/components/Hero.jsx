import { useRef, useEffect, Suspense, lazy } from 'react';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';
import HeroContent from './HeroContent';

const HeroParticles = lazy(() => import('./HeroParticles'));

export default function Hero() {
  const sectionRef = useRef(null);
  const scrollProgress = useRef(0);

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
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      <Suspense fallback={null}>
        <HeroParticles scrollProgress={scrollProgress} />
      </Suspense>
      <HeroContent />
      {/* Smooth fade into next section — tall gradient for seamless blend */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-[2]"
        style={{
          height: '35vh',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(8,9,13,0.3) 30%, rgba(8,9,13,0.7) 60%, var(--color-bg) 100%)',
        }}
      />
    </section>
  );
}
