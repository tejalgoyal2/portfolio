import { useScrollProgress } from './hooks/useScrollProgress';
import { useLenis } from './hooks/useLenis';
import SvgFilters from './fx/SvgFilters';
import PaperOverlay from './fx/PaperOverlay';

/**
 * Phase 1 — Foundation app shell.
 * Currently mounts the always-on layers and a long placeholder content area
 * so paper grain, halftone, fonts, and scroll harness can be verified.
 * Sections + cursor + protagonist arrive in later phases.
 */
export default function App() {
  useLenis();
  const progress = useScrollProgress();

  return (
    <>
      <SvgFilters />
      <PaperOverlay />

      {/* scroll-progress indicator (tiny, top-right; will be replaced) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 16,
          right: 20,
          zIndex: 9999,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: 2,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
        }}
      >
        {(progress * 100).toFixed(0).padStart(3, '0')}%
      </div>

      {/* placeholder content to scroll through */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <section style={demoSectionStyle('hero')}>
          <h1 className="font-display" style={titleStyle}>
            <span
              className="chroma"
              data-text="TEJAL GOYAL"
            >
              <span className="chroma-base">TEJAL GOYAL</span>
            </span>
          </h1>
          <p className="font-serif" style={{ fontSize: 28, fontStyle: 'italic', marginTop: 12, color: 'var(--text-dim)' }}>
            Breaking things to build better ones.
          </p>
          <p className="hand-letter" style={{ fontSize: 18, marginTop: 28, color: 'var(--yellow)' }}>
            ↓ scroll to verify the page feels printed ↓
          </p>
        </section>

        <section style={demoSectionStyle('about')}>
          <h2 className="font-serif" style={{ fontSize: 80, color: 'var(--paper)' }}>About</h2>
          <p style={{ maxWidth: 600, textAlign: 'center', color: 'var(--text-dim)' }}>
            This is just a placeholder. Sections, magnetic cursor, and the
            morphing 3D protagonist arrive in phases 2–8.
          </p>
        </section>

        <section style={demoSectionStyle('skills')}>
          <h2 className="font-onom" style={{ fontSize: 92, color: 'var(--yellow-hot)', textShadow: '4px 4px 0 var(--outline)' }}>SKILLS!</h2>
        </section>

        <section style={demoSectionStyle('projects')}>
          <h2 className="font-display" style={{ fontSize: 120, letterSpacing: 4, color: 'var(--paper)' }}>PROJECTS</h2>
        </section>

        <section style={demoSectionStyle('fin')}>
          <span className="speech-bubble">tay-jull!</span>
          <p className="hand-letter" style={{ marginTop: 60, color: 'var(--text-dim)' }}>fin.</p>
        </section>
      </main>
    </>
  );
}

const titleStyle = {
  fontSize: 'clamp(64px, 12vw, 180px)',
  letterSpacing: 4,
  margin: 0,
  color: 'var(--paper)',
  lineHeight: 1,
};

function demoSectionStyle(kind) {
  return {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4rem 2rem',
    gap: 20,
    borderTop: kind === 'hero' ? 'none' : '1px dashed color-mix(in oklch, var(--text-dim), transparent 70%)',
  };
}
