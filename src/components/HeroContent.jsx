import { useRef, useEffect, useCallback, useState } from 'react';
import { useTypingText } from '../hooks/useTypingText';
import { gsap } from '../hooks/useGSAP';
import { useMagneticEffect } from '../hooks/useMagneticEffect';

const ROLES = [
  'Software Engineer',
  'Cybersecurity Analyst',
  'ML Engineer',
  'Builder of Things',
];

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/tejalgoyal2', icon: '↗' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tejalgoyal', icon: '↗' },
  { label: 'Blog', href: 'https://tejalgoyal2.github.io', icon: '↗' },
  { label: 'Email', href: 'mailto:itejalgoyal@gmail.com', icon: '→' },
];

function MagneticLink({ href, children, delay = 0 }) {
  const ref = useMagneticEffect({ strength: 0.25 });
  return (
    <a
      ref={ref}
      href={href}
      target={href.startsWith('mailto') ? undefined : '_blank'}
      rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all duration-300 no-underline hero-link"
      style={{
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {children}
    </a>
  );
}

export default function HeroContent() {
  const containerRef = useRef(null);
  const nameRef = useRef(null);
  const taglineRef = useRef(null);
  const pronounceRef = useRef(null);
  const roleRef = useRef(null);
  const linksRef = useRef(null);
  const scrollRef = useRef(null);
  const typed = useTypingText(ROLES, 70, 2200);

  // Chromatic aberration glitch after name reveal
  const [showGlitch, setShowGlitch] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const nameEl = nameRef.current;
      if (!nameEl) return;

      const text = nameEl.textContent;
      nameEl.textContent = '';
      nameEl.setAttribute('aria-label', text);
      nameEl.setAttribute('data-text', text);

      const chars = [];
      for (const char of text) {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? ' ' : char;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        if (char === ' ') span.style.minWidth = '0.3em';
        span.setAttribute('aria-hidden', 'true');
        nameEl.appendChild(span);
        chars.push(span);
      }

      const tl = gsap.timeline({ delay: 0.3 });

      tl.to(chars, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.7,
        stagger: 0.04,
        ease: 'back.out(1.7)',
        startAt: { y: 50, rotateX: -90, opacity: 0 },
      });

      // Fire chromatic aberration glitch after name lands
      tl.call(() => setShowGlitch(true));
      tl.call(() => setShowGlitch(false), null, '+=0.45');

      tl.from(pronounceRef.current, {
        opacity: 0,
        y: 10,
        duration: 0.5,
        ease: 'power2.out',
      }, '-=0.3');

      tl.from(taglineRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power3.out',
      }, '-=0.3');

      tl.from(roleRef.current, {
        opacity: 0,
        y: 15,
        duration: 0.5,
        ease: 'power2.out',
      }, '-=0.2');

      tl.fromTo(linksRef.current.querySelectorAll('.hero-link'), {
        opacity: 0,
        y: 15,
      }, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.5,
        ease: 'power2.out',
      }, '-=0.2');

      tl.from(scrollRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      }, '-=0.1');

      // Subtle attention pulse on pronunciation
      tl.to('.pronunciation-hint', {
        color: 'rgba(139,142,255,0.7)',
        duration: 0.6,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut',
      }, '-=0.3');

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // ── Role text micro-glitch every 8-12s ──
  useEffect(() => {
    const el = roleRef.current;
    if (!el) return;
    const fire = () => {
      el.classList.add('role-glitching');
      setTimeout(() => el.classList.remove('role-glitching'), 200);
    };
    const id = setInterval(fire, 8000 + Math.random() * 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative z-[1] w-full max-w-[1100px] mx-auto px-6 flex flex-col justify-center min-h-screen"
    >
      <div className="max-w-[680px]">
        {/* Name with chromatic aberration layers */}
        <div className="relative">
          <h1
            ref={nameRef}
            className="font-display font-bold tracking-[-0.02em] m-0 leading-[1.05] relative z-[1]"
            style={{
              fontSize: 'clamp(40px, 7vw, 80px)',
              color: 'var(--color-text)',
              perspective: '600px',
            }}
          >
            TEJAL GOYAL
          </h1>

          {/* Chromatic aberration layers — red and cyan ghost text */}
          {showGlitch && (
            <>
              <span
                className="chromatic-red font-display font-bold tracking-[-0.02em] leading-[1.05] absolute top-0 left-0 pointer-events-none select-none"
                style={{
                  fontSize: 'clamp(40px, 7vw, 80px)',
                  color: 'rgba(236, 34, 37, 0.35)',
                  zIndex: 0,
                  animation: 'chromatic-shift-red 400ms steps(6) forwards',
                }}
                aria-hidden="true"
              >
                TEJAL GOYAL
              </span>
              <span
                className="chromatic-cyan font-display font-bold tracking-[-0.02em] leading-[1.05] absolute top-0 left-0 pointer-events-none select-none"
                style={{
                  fontSize: 'clamp(40px, 7vw, 80px)',
                  color: 'rgba(0, 255, 255, 0.3)',
                  zIndex: 0,
                  animation: 'chromatic-shift-cyan 400ms steps(6) forwards',
                }}
                aria-hidden="true"
              >
                TEJAL GOYAL
              </span>
            </>
          )}
        </div>

        {/* Pronunciation — click to hear (comic speech bubble) */}
        <div ref={pronounceRef} className="mt-2">
          <button
            className="pronunciation-hint font-mono text-[12px] tracking-[0.5px] relative inline-flex items-center gap-1.5 bg-transparent border-none p-0"
            style={{ color: 'var(--color-text-secondary)' }}
            onClick={() => {
              const audio = new Audio('/audio/tejal.mp3');
              audio.play().catch(() => {});
              const el = pronounceRef.current?.querySelector('.pronunciation-hint');
              if (el) gsap.fromTo(el, { scale: 1.1 }, { scale: 1, duration: 0.3, ease: 'power2.out' });
            }}
            aria-label="Hear pronunciation of Tejal"
          >
            /&thinsp;tay-jull&thinsp;/
          </button>
        </div>

        {/* Tagline */}
        <p
          ref={taglineRef}
          className="mt-5 font-display font-medium tracking-[-0.01em] leading-[1.4]"
          style={{
            fontSize: 'clamp(18px, 2.5vw, 26px)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Breaking things to build better ones.
        </p>

        {/* Typed role */}
        <div
          ref={roleRef}
          className="mt-4 font-mono text-[13px] tracking-[0.5px]"
          style={{ color: 'var(--color-interactive)' }}
        >
          {typed}
          <span style={{ animation: 'blink 1s step-end infinite', color: 'var(--color-interactive)' }}>|</span>
        </div>

        {/* Links */}
        <div ref={linksRef} className="flex flex-wrap gap-3 mt-8">
          {LINKS.map((link, i) => (
            <MagneticLink key={link.label} href={link.href} delay={i * 80}>
              {link.label}
              <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>{link.icon}</span>
            </MagneticLink>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span
          className="text-[11px] font-mono uppercase tracking-[3px]"
          style={{ color: 'var(--color-interactive)' }}
        >
          Scroll
        </span>
        <div
          className="w-[2px] h-10 rounded-full"
          style={{
            background: 'linear-gradient(to bottom, var(--color-interactive), transparent)',
            animation: 'pulse-line 2s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes pulse-line {
            0%, 100% { opacity: 0.5; transform: scaleY(1); }
            50% { opacity: 1; transform: scaleY(1.5); }
          }
          .hero-link:hover {
            border-color: var(--color-interactive) !important;
            color: var(--color-text) !important;
            background: color-mix(in srgb, var(--color-interactive) 5%, transparent);
          }

          /* ── Pronunciation speech bubble ── */
          .pronunciation-hint::after {
            content: "that's how you say my name — click to hear it";
            position: absolute;
            left: 0;
            top: calc(100% + 14px);
            font-size: 10px;
            color: var(--color-text-secondary);
            white-space: nowrap;
            background: var(--color-surface-elevated);
            border: 1px solid var(--color-border);
            padding: 7px 14px;
            border-radius: 10px 12px 12px 4px;
            transform: rotate(-1deg) translateY(-4px);
            opacity: 0;
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
            pointer-events: none;
          }
          .pronunciation-hint::before {
            content: '';
            position: absolute;
            left: 14px;
            top: calc(100% + 8px);
            width: 10px;
            height: 10px;
            background: var(--color-surface-elevated);
            border-left: 1px solid var(--color-border);
            border-top: 1px solid var(--color-border);
            transform: rotate(45deg);
            opacity: 0;
            transition: opacity 0.3s ease-out;
            pointer-events: none;
            z-index: 1;
          }
          .pronunciation-hint:hover::after {
            opacity: 1;
            transform: rotate(-1deg) translateY(0);
          }
          .pronunciation-hint:hover::before {
            opacity: 1;
          }
          .pronunciation-hint:hover {
            color: var(--color-interactive) !important;
          }
          .pronunciation-hint:active {
            transform: scale(0.97);
          }

          /* ── Chromatic aberration on name reveal ── */
          @keyframes chromatic-shift-red {
            0%   { opacity: 0; transform: translate(0, 0); }
            10%  { opacity: 0.6; transform: translate(4px, -1px); }
            25%  { opacity: 0.4; transform: translate(-3px, 2px); }
            40%  { opacity: 0.5; transform: translate(3px, 0); }
            60%  { opacity: 0.35; transform: translate(-2px, -1px); }
            80%  { opacity: 0.15; transform: translate(1px, 1px); }
            100% { opacity: 0; transform: translate(0, 0); }
          }
          @keyframes chromatic-shift-cyan {
            0%   { opacity: 0; transform: translate(0, 0); }
            10%  { opacity: 0.5; transform: translate(-3px, 1px); }
            25%  { opacity: 0.35; transform: translate(2px, -2px); }
            40%  { opacity: 0.45; transform: translate(-2px, 0); }
            60%  { opacity: 0.3; transform: translate(3px, 1px); }
            80%  { opacity: 0.1; transform: translate(-1px, -1px); }
            100% { opacity: 0; transform: translate(0, 0); }
          }

          /* ── Role text micro-glitch ── */
          @keyframes role-glitch {
            0%, 100% { text-shadow: none; transform: translateX(0); }
            20%  { text-shadow: -2px 0 rgba(255,0,64,0.5), 2px 0 rgba(0,255,255,0.5); transform: translateX(-1px); }
            40%  { text-shadow: 2px 0 rgba(255,0,64,0.4), -2px 0 rgba(0,255,255,0.4); transform: translateX(1px); }
            60%  { text-shadow: -1px 0 rgba(255,0,64,0.5), 1px 0 rgba(0,255,255,0.5); transform: translateX(0); }
            80%  { text-shadow: 1px 0 rgba(255,0,64,0.3), -1px 0 rgba(0,255,255,0.3); transform: translateX(-1px); }
          }
          .role-glitching {
            animation: role-glitch 200ms steps(4) 1 !important;
          }
        `}</style>
      </div>
    </div>
  );
}
