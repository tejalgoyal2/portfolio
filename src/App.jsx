import { useState, useEffect, useCallback } from 'react';
import { useSmoothScroll } from './hooks/useSmoothScroll';
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

      <Projects />

      <Experience />
      <Skills />
      <Blog />
      <About />
      <Contact />

      {/* Terminal — side quest, backtick to toggle */}
      <Terminal
        show={termOpen}
        onClose={() => setTermOpen(false)}
        onSudoku={() => setSudokuOpen(true)}
      />

      {/* Sudoku — accessible via terminal command only */}
      {sudokuOpen && <Sudoku onClose={() => setSudokuOpen(false)} />}

      <footer className="text-center py-6 px-5" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <span className="text-[11px] tracking-[1.5px] uppercase" style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
          Tejal Goyal // tgoyal.me // 2026
        </span>
      </footer>
    </div>
  );
}
