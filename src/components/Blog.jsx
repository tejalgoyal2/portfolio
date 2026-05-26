import { useRef, useEffect, useState } from 'react';
import { BLOG_POSTS } from '../data/blog';
import SectionHeader from './SectionHeader';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';

const DWELL_MS = 2500;

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BlogCard({ post }) {
  const [hov, setHov] = useState(false);
  const [dwell, setDwell] = useState(false);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [tiltReady, setTiltReady] = useState(false);
  const timerRef = useRef(null);
  const tiltTimer = useRef(null);

  const handleEnter = () => {
    setHov(true);
    timerRef.current = setTimeout(() => setDwell(true), DWELL_MS);
    tiltTimer.current = setTimeout(() => setTiltReady(true), 500);
  };

  const handleLeave = () => {
    setHov(false);
    setDwell(false);
    setTiltReady(false);
    setMouse({ x: 50, y: 50 });
    clearTimeout(timerRef.current);
    clearTimeout(tiltTimer.current);
  };

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  useEffect(() => {
    return () => { clearTimeout(timerRef.current); clearTimeout(tiltTimer.current); };
  }, []);

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 w-[340px] rounded-xl no-underline relative overflow-hidden halftone-hover"
      style={{
        background: hov
          ? `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, color-mix(in srgb, var(--color-interactive) 6%, transparent) 0%, var(--color-surface-elevated) 55%)`
          : 'var(--color-surface)',
        border: `1px solid ${hov ? 'var(--color-interactive)' : 'var(--color-border-subtle)'}`,
        transform: dwell
          ? `perspective(600px) translateY(-10px) scale(1.02) rotateX(${tiltReady ? (50 - mouse.y) * 0.12 : 0}deg) rotateY(${tiltReady ? (mouse.x - 50) * 0.12 : 0}deg)`
          : hov
            ? `perspective(600px) translateY(-4px) rotateX(${tiltReady ? (50 - mouse.y) * 0.18 : 0}deg) rotateY(${tiltReady ? (mouse.x - 50) * 0.18 : 0}deg)`
            : 'perspective(600px) translateY(0)',
        boxShadow: dwell
          ? `0 24px 48px color-mix(in srgb, var(--color-interactive) 15%, transparent), 0 0 30px color-mix(in srgb, var(--color-interactive) 12%, transparent)`
          : hov
            ? `0 12px 28px color-mix(in srgb, var(--color-text) 15%, transparent), 0 0 20px color-mix(in srgb, var(--color-interactive) 8%, transparent)`
            : 'none',
        transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s, transform 0.2s ease-out',
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
    >
      {/* Accent line - visible on hover, stronger on dwell */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500"
        style={{
          background: 'linear-gradient(to right, var(--color-interactive), transparent)',
          opacity: dwell ? 1 : hov ? 0.5 : 0,
        }}
      />

      <div className="px-7 py-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-dim)' }}>
            {formatDate(post.date)}
          </span>
          {post.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="text-[9px] font-mono py-0.5 px-2 rounded-full"
              style={{ color: 'var(--color-text-dim)', border: '1px solid var(--color-border-subtle)' }}
            >
              {tag}
            </span>
          ))}
        </div>

        <h3
          className="text-[16px] font-display font-bold leading-[1.4] mb-3 transition-colors duration-300"
          style={{ color: hov ? 'var(--color-interactive)' : 'var(--color-text)' }}
        >
          {post.title}
        </h3>

        <p className="text-[12px] leading-[1.8] mb-4 m-0" style={{ color: 'var(--color-text-secondary)' }}>
          {post.preview}
        </p>

        <span
          className="text-[11px] font-mono transition-all duration-500 inline-block"
          style={{
            color: hov ? 'var(--color-interactive)' : 'var(--color-text-ghost)',
            transform: dwell ? 'translateX(6px)' : hov ? 'translateX(3px)' : 'translateX(0)',
          }}
        >
          {dwell ? 'Read this one →' : 'Read →'}
        </span>
      </div>
    </a>
  );
}

export default function Blog() {
  const sectionRef = useRef(null);
  const scrollRef = useRef(null);
  const trackRef = useRef(null);

  // Duplicate posts for seamless infinite marquee
  const displayPosts = [...BLOG_POSTS, ...BLOG_POSTS];

  // Auto-scroll with seamless loop — only starts when section is visible
  useEffect(() => {
    const container = scrollRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    // Start from first card
    container.scrollLeft = 0;

    let paused = false;
    let visible = false;
    let raf;
    const getHalfWidth = () => track.scrollWidth / 2;

    const tick = () => {
      if (!paused && visible) {
        container.scrollLeft += 0.5;
        const half = getHalfWidth();
        if (container.scrollLeft >= half) {
          container.scrollLeft -= half;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };

    // Only auto-scroll when section is in viewport
    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top 90%',
      end: 'bottom 10%',
      onEnter: () => { visible = true; },
      onLeave: () => { visible = false; },
      onEnterBack: () => { visible = true; },
      onLeaveBack: () => { visible = false; },
    });

    container.addEventListener('mouseenter', pause);
    container.addEventListener('mouseleave', resume);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      trigger.kill();
      container.removeEventListener('mouseenter', pause);
      container.removeEventListener('mouseleave', resume);
    };
  }, []);

  // Entrance animation — animate all cards together
  useEffect(() => {
    if (!trackRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(trackRef.current, {
        opacity: 0,
        y: 20,
      }, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: scrollRef.current,
          start: 'top 85%',
          once: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="pb-28">
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="blog" title="Blog" sub="things I've written about" />
      </div>

      {/* Auto-scrolling strip */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="overflow-x-auto blog-scroll-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            ref={trackRef}
            className="flex gap-5"
            style={{
              width: 'max-content',
              paddingLeft: 'max(2rem, calc((100vw - 1100px) / 2 + 1.5rem))',
              paddingRight: '2rem',
              paddingTop: '3.5rem',
              paddingBottom: '3.5rem',
            }}
          >
            {displayPosts.map((post, i) => (
              <BlogCard key={`${post.title}-${i}`} post={post} />
            ))}
          </div>
        </div>

        {/* Right fade + scroll indicator */}
        <div
          className="absolute top-0 right-0 bottom-0 w-[80px] pointer-events-none flex items-center justify-end pr-4"
          style={{
            background: 'linear-gradient(to right, transparent, var(--color-bg) 70%)',
          }}
        >
          <span
            className="font-mono text-[11px]"
            style={{
              color: 'var(--color-text-dim)',
              opacity: 0.7,
            }}
          >
            &rarr;
          </span>
        </div>
      </div>
    </section>
  );
}
