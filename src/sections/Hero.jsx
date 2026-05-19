import { useEffect, useRef } from 'react';
import HeroCanvas from '../scene/HeroCanvas';

/**
 * Buttermax-for-Tejal hero.
 *
 * Composition:
 *  - Yellow full-bleed background
 *  - Top-left monogram TG, top-right pill nav (WORK · ABOUT · CONTACT)
 *  - Massive Anton wordmark "TEJAL GOYAL" filling ~95% of width.
 *    The 'L' at the end intentionally crops past the right edge.
 *  - Brass padlock in the foreground sitting between the words, overlapping
 *    a few letters for depth.
 *  - Mono caption beneath the wordmark
 *  - "SCROLL ↓" cue centered at the bottom
 *
 * Everything except the canvas is plain HTML — no chromatic offsets,
 * no halftone, no glitch. Restraint is the point.
 */
export default function Hero() {
  const wordmarkRef = useRef(null);

  // Tiny entrance: slide the wordmark up + fade caption in.
  useEffect(() => {
    const el = wordmarkRef.current;
    if (!el) return;
    el.style.transform = 'translateY(20px)';
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = 'transform 900ms cubic-bezier(0.23, 1, 0.32, 1), opacity 900ms ease-out';
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    });
  }, []);

  return (
    <section className="hero">
      {/* Top nav */}
      <header className="hero-nav">
        <a href="#top" className="hero-monogram" aria-label="Tejal Goyal — home">TG</a>
        <nav className="hero-nav-links">
          <a href="#work" className="hero-pill">Work</a>
          <a href="#about" className="hero-pill">About</a>
          <a href="#contact" className="hero-pill">Contact</a>
        </nav>
      </header>

      {/* Massive wordmark */}
      <h1 ref={wordmarkRef} className="hero-wordmark" aria-label="Tejal Goyal">
        <span className="hero-word">TEJAL</span>
        <span className="hero-word hero-word--offset">GOYAL</span>
      </h1>

      {/* 3D padlock — positioned to overlap the wordmark */}
      <HeroCanvas
        className="hero-canvas"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -52%)',
          width: 'min(640px, 52vw)',
          height: 'min(640px, 70vh)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Caption */}
      <p className="hero-caption">
        SOFTWARE ENGINEER <span className="hero-caption-dot">·</span> CYBERSECURITY
        <span className="hero-caption-dot">·</span> BUILDER OF THINGS
      </p>

      {/* Scroll cue */}
      <div className="hero-scroll-cue" aria-hidden="true">
        <span>SCROLL</span>
        <span className="hero-scroll-arrow">↓</span>
      </div>
    </section>
  );
}
