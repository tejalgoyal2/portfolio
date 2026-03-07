import { useState, useEffect } from 'react';

const NAV_ITEMS = ['projects', 'experience', 'skills', 'about', 'contact'];

export default function Navbar({ onTerminalToggle, terminalOpen }) {
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  // Track active section + scroll progress
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);

      // Progress bar
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);

      // Active section detection
      const sections = NAV_ITEMS.map(id => document.getElementById(`s-${id}`)).filter(Boolean);
      let current = '';
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= 120) {
          current = section.id.replace('s-', '');
        }
      }
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[9990] backdrop-blur-[12px] transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(10,10,10,0.95)' : 'rgba(10,10,10,0.88)',
        borderBottom: `1px solid var(--color-border)`,
      }}
    >
      {/* Scroll progress bar */}
      <div
        className="absolute top-0 left-0 h-[1px] transition-all duration-150"
        style={{
          width: `${progress}%`,
          background: 'var(--color-green)',
          opacity: progress > 0 ? 0.5 : 0,
        }}
      />

      <div className="max-w-[1060px] mx-auto px-5 flex justify-between items-center h-[46px]">
        <a href="#" className="font-display text-sm font-bold tracking-[2px] text-green no-underline glow-green">
          TG://
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-0.5 items-center">
          {NAV_ITEMS.map(n => (
            <a
              key={n}
              href={`#s-${n}`}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              className="no-underline text-[10.5px] py-1 px-2.5 font-mono uppercase tracking-[1px] transition-colors duration-200 relative"
              style={{ color: active === n || hovered === n ? 'var(--color-green)' : 'var(--color-dim)' }}
            >
              {n}
              {active === n && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: 'var(--color-green)' }}
                />
              )}
            </a>
          ))}
          <a
            href="/resume.pdf"
            className="no-underline text-[9.5px] py-0.5 px-2.5 rounded-sm font-mono ml-1 tracking-[0.5px]"
            style={{ border: '1px solid rgba(255,176,0,0.19)', color: 'var(--color-amber)' }}
          >
            RESUME
          </a>
          <button
            onClick={onTerminalToggle}
            className="ml-1 py-0.5 px-2 rounded-sm text-[10.5px] font-mono cursor-pointer transition-all duration-200"
            style={{
              background: terminalOpen ? 'rgba(0,255,65,0.05)' : 'transparent',
              border: '1px solid rgba(0,255,65,0.15)',
              color: 'var(--color-green)',
            }}
          >
            {'>_'}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-green font-mono text-sm cursor-pointer bg-transparent border-none"
        >
          {mobileOpen ? '[X]' : '[=]'}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden panel mx-4 mb-3 p-4 flex flex-col gap-3">
          {NAV_ITEMS.map(n => (
            <a
              key={n}
              href={`#s-${n}`}
              onClick={() => setMobileOpen(false)}
              className="text-text no-underline text-xs font-mono uppercase tracking-[1px] py-1"
            >
              {'> '}{n}
            </a>
          ))}
          <a href="/resume.pdf" className="text-amber no-underline text-xs font-mono py-1">
            {'> '}RESUME
          </a>
        </div>
      )}
    </nav>
  );
}
