import { useState, useEffect, useCallback, useRef } from 'react';
import { useSmoothScroll, getLenis } from './hooks/useSmoothScroll';
import { attachNavSounds } from './hooks/useSound';
import { gsap, ScrollTrigger } from './hooks/useGSAP';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Projects from './components/Projects';
import Experience from './components/Experience';
import Skills from './components/Skills';
import About from './components/About';
import Contact from './components/Contact';
import Blog from './components/Blog';
import Terminal from './components/Terminal';
import Sudoku from './components/Sudoku';
import CursorLight from './components/CursorLight';

function ScrollEffects() {
  const overlayRef = useRef(null);

  useEffect(() => {
    let velocity = 0;
    let raf;
    let scrollHandler;

    const init = () => {
      const lenis = getLenis();
      if (!lenis) return requestAnimationFrame(init);

      const sections = document.querySelectorAll('section:not(.hero-dark-override)');

      scrollHandler = (e) => { velocity = e.velocity; };
      lenis.on('scroll', scrollHandler);

      // Scroll-velocity skew: content tilts in scroll direction
      const tick = () => {
        const skew = Math.max(-2, Math.min(2, velocity * 0.01));
        velocity *= 0.93;
        sections.forEach(el => { el.style.transform = `skewY(${skew}deg)`; });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    init();

    // Background color morph per section (universal via color-mix)
    const sectionIds = ['projects', 'experience', 'skills', 'blog', 'about', 'contact'];

    const triggers = sectionIds.map(id =>
      ScrollTrigger.create({
        trigger: `#s-${id}`,
        start: 'top 60%',
        onEnter: () => {
          if (overlayRef.current) {
            overlayRef.current.style.background =
              'radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--color-interactive) 7%, transparent) 0%, transparent 70%)';
          }
        },
        onEnterBack: () => {
          if (overlayRef.current) {
            overlayRef.current.style.background =
              'radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--color-interactive) 7%, transparent) 0%, transparent 70%)';
          }
        },
      })
    );

    return () => {
      cancelAnimationFrame(raf);
      triggers.forEach(t => t.kill());
      const lenis = getLenis();
      if (lenis && scrollHandler) lenis.off('scroll', scrollHandler);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, transition: 'background 1.5s ease' }}
    />
  );
}

export default function App() {
  const [termOpen, setTermOpen] = useState(false);
  const [sudokuOpen, setSudokuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tgoyal_theme') || 'dark';
    }
    return 'dark';
  });

  useSmoothScroll();

  useEffect(() => { attachNavSounds(); }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tgoyal_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '`') {
        e.preventDefault();
        setTermOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-body)' }}>
      <CursorLight />
      <Navbar
        onTerminalToggle={() => setTermOpen(p => !p)}
        terminalOpen={termOpen}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <Hero />

      {/* Content slides over sticky hero with rounded top edge */}
      <main
        className="relative rounded-t-[20px]"
        style={{
          zIndex: 2,
          background: 'var(--color-bg)',
          boxShadow: '0 -30px 80px color-mix(in srgb, var(--color-text) 12%, transparent), 0 -2px 20px color-mix(in srgb, var(--color-interactive) 6%, transparent)',
          borderTop: '1px solid color-mix(in srgb, var(--color-interactive) 15%, transparent)',
        }}
      >
        <ScrollEffects />
        <Projects />

        <Experience />
        <Skills />
        <Blog />
        <About />
        <Contact />

        <footer className="text-center py-6 px-5" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <span className="text-[11px] tracking-[1.5px] uppercase" style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
            Tejal Goyal // tgoyal.me // 2026
          </span>
        </footer>
      </main>

      {/* Terminal - side quest, backtick to toggle */}
      <Terminal
        show={termOpen}
        onClose={() => setTermOpen(false)}
        onSudoku={() => setSudokuOpen(true)}
      />

      {/* Sudoku - accessible via terminal command only */}
      {sudokuOpen && <Sudoku onClose={() => setSudokuOpen(false)} />}
    </div>
  );
}
