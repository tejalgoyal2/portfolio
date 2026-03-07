import { useState, useEffect, useCallback } from 'react';
import BootSequence from './components/BootSequence';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Projects from './components/Projects';
import Experience from './components/Experience';
import Skills from './components/Skills';
import About from './components/About';
import Contact from './components/Contact';
import Terminal from './components/Terminal';
import Sudoku from './components/Sudoku';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [sudokuOpen, setSudokuOpen] = useState(false);
  const [puzzleHov, setPuzzleHov] = useState(false);

  const onBoot = useCallback(() => setBooted(true), []);

  // Keyboard: skip boot on any key, toggle terminal with backtick
  useEffect(() => {
    const handler = (e) => {
      if (!booted) { setBooted(true); return; }
      if (e.key === '`') { e.preventDefault(); setTermOpen(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [booted]);

  return (
    <>
      {/* Scanline overlay */}
      <div className="scanlines" />

      {/* Boot sequence */}
      {!booted && <BootSequence onDone={onBoot} />}

      {/* Sudoku modal */}
      {sudokuOpen && <Sudoku onClose={() => setSudokuOpen(false)} />}

      {/* Main site */}
      {booted && (
        <div className="min-h-screen font-mono text-text">
          <Navbar
            onTerminalToggle={() => setTermOpen(p => !p)}
            terminalOpen={termOpen}
          />

          {/* Hero is full-width so matrix rain extends to edges */}
          <Hero />

          <main
            className="max-w-[1060px] mx-auto px-5 transition-[padding-bottom] duration-300"
            style={{ paddingBottom: termOpen ? 270 : 80 }}
          >
            <Projects />
            <Experience />
            <Skills />
            <About />
            <Contact />
          </main>

          {/* Sudoku trigger button */}
          <div
            className="fixed right-4 z-[9990] transition-[bottom] duration-300"
            style={{ bottom: termOpen ? 240 : 14 }}
          >
            <button
              onClick={() => setSudokuOpen(true)}
              onMouseEnter={() => setPuzzleHov(true)}
              onMouseLeave={() => setPuzzleHov(false)}
              className="panel py-1.5 px-3 cursor-pointer text-[10px] font-mono transition-all duration-250"
              style={{
                color: puzzleHov ? 'var(--color-amber)' : 'var(--color-dim)',
                borderColor: puzzleHov ? 'rgba(255,176,0,0.25)' : undefined,
              }}
            >
              {puzzleHov ? '[ 4x4 Sudoku ]' : '[ Quick Puzzle ]'}
            </button>
          </div>

          {/* Terminal overlay */}
          <Terminal
            show={termOpen}
            onClose={() => setTermOpen(false)}
            onSudoku={() => setSudokuOpen(true)}
          />

          {/* Footer */}
          <footer
            className="text-center py-3 px-5"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <span className="text-dim text-[9.5px] font-mono tracking-[1px]">
              DESIGNED BY TEJAL GOYAL // BUILT WITH CLAUDE // TGOYAL.ME // 2026
            </span>
          </footer>
        </div>
      )}
    </>
  );
}
