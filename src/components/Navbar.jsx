import { useState, useEffect } from 'react';
import { getLenis } from '../hooks/useSmoothScroll';

const NAV_ITEMS = ['projects', 'experience', 'skills', 'blog', 'about', 'contact'];

export default function Navbar({ onTerminalToggle, terminalOpen, theme, onThemeToggle }) {
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);

      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);

      const sections = NAV_ITEMS.map(id => document.getElementById(`s-${id}`)).filter(Boolean);
      let current = '';
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= 120) {
          current = section.id.replace('s-', '');
        }
      }
      // Force contact active when near page bottom (contact section is short)
      const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100;
      if (nearBottom) current = 'contact';
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (e, id) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.getElementById(`s-${id}`);
    if (el) {
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(el, { offset: -60 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[9990] transition-all duration-500"
        style={{
          backdropFilter: scrolled ? 'blur(20px) saturate(1.3)' : 'blur(12px)',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.3)' : 'blur(12px)',
          background: scrolled
            ? 'color-mix(in srgb, var(--color-bg) 85%, transparent)'
            : 'color-mix(in srgb, var(--color-bg) 40%, transparent)',
          borderBottom: scrolled
            ? '1px solid var(--color-border-subtle)'
            : '1px solid transparent',
        }}
      >
        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 h-[2px] transition-[width] duration-100"
          style={{
            width: `${progress}%`,
            background: 'var(--color-interactive)',
            opacity: progress > 0 ? 0.7 : 0,
          }}
        />

        <div className="max-w-[1100px] mx-auto px-6 flex justify-between items-center h-[56px]">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const lenis = getLenis();
              if (lenis) lenis.scrollTo(0);
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-[16px] font-bold tracking-[-0.02em] no-underline transition-colors duration-300 nav-logo inline-flex items-baseline gap-[3px]"
            style={{ color: 'var(--color-text)' }}
          >
            TG
            <span
              className="inline-block w-[4px] h-[4px] rounded-full mb-[2px]"
              style={{ background: 'var(--color-interactive)', opacity: 0.8 }}
            />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex gap-0.5 items-center">
            {NAV_ITEMS.map(n => (
              <a
                key={n}
                href={`#s-${n}`}
                onClick={(e) => scrollTo(e, n)}
                className="nav-link no-underline text-[11px] py-2 px-3 uppercase tracking-[1.5px] transition-all duration-300 relative"
                style={{
                  color: active === n ? 'var(--color-interactive)' : 'var(--color-text-dim)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {n}
                <span
                  className="absolute bottom-[2px] left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300"
                  style={{
                    width: active === n ? '14px' : '0px',
                    background: 'var(--color-interactive)',
                    opacity: active === n ? 1 : 0,
                  }}
                />
              </a>
            ))}

            <div className="w-[1px] h-4 mx-2.5" style={{ background: 'var(--color-border)' }} />

            <a
              href="/resume.pdf"
              className="nav-link-resume no-underline text-[10px] py-1.5 px-3.5 rounded-full tracking-[1.5px] transition-all duration-300 uppercase"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Resume
            </a>

            {/* Theme toggle */}
            <button
              onClick={onThemeToggle}
              className="ml-2 w-8 h-8 rounded-full cursor-pointer transition-all duration-300 bg-transparent border-none flex items-center justify-center nav-icon"
              style={{ color: 'var(--color-text-dim)' }}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {theme === 'dark' ? (
                  <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>
                ) : (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                )}
              </svg>
            </button>

            {/* Terminal toggle */}
            <button
              onClick={onTerminalToggle}
              className="ml-1 w-8 h-8 rounded-full text-[11px] cursor-pointer transition-all duration-300 flex items-center justify-center nav-icon"
              style={{
                background: terminalOpen ? 'rgba(139,142,255,0.1)' : 'transparent',
                border: `1px solid ${terminalOpen ? 'var(--color-interactive)' : 'var(--color-border)'}`,
                color: terminalOpen ? 'var(--color-interactive)' : 'var(--color-text-dim)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              &gt;_
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden cursor-pointer bg-transparent border-none text-[14px]"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
          >
            {mobileOpen ? '✕' : '≡'}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden mx-4 mb-3 p-4 rounded-lg flex flex-col gap-3"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            {NAV_ITEMS.map(n => (
              <a
                key={n}
                href={`#s-${n}`}
                onClick={(e) => scrollTo(e, n)}
                className="no-underline text-xs uppercase tracking-[1.5px] py-1.5"
                style={{
                  color: active === n ? 'var(--color-interactive)' : 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {n}
              </a>
            ))}
          </div>
        )}
      </nav>

      <style>{`
        .nav-link:hover {
          color: var(--color-text) !important;
        }
        .nav-link-resume:hover {
          border-color: var(--color-interactive) !important;
          color: var(--color-interactive) !important;
        }
        .nav-icon:hover {
          color: var(--color-interactive) !important;
        }
        .nav-logo:hover {
          opacity: 0.8;
        }
      `}</style>
    </>
  );
}
